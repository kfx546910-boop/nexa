import { evaluateSimpleArithmetic } from './safeMath';

export type ToolSensitivity = 'PUBLIC' | 'INTERNAL' | 'PRIVATE' | 'SECRET';
export type ToolResultStatus = 'SUCCESS' | 'FAILED' | 'DENIED' | 'TIMEOUT' | 'CANCELLED' | 'INVALID_INPUT' | 'NOT_FOUND' | 'UNAVAILABLE' | 'REQUIRES_CONFIRMATION' | 'TOOL_LIMIT_EXCEEDED';
export type ConfirmationState = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'CANCELLED';
export type ToolLifecycleState = 'PENDING' | 'RUNNING' | 'CANCELLING' | 'CANCELLED' | 'COMPLETED';
export type ToolErrorCategory = 'AUTHORIZATION_ERROR' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED' | 'DEPENDENCY_ERROR' | 'EXECUTION_ERROR' | 'INTERNAL_ERROR';

export interface ToolInputSchema {
  type: 'object';
  required?: string[];
  properties?: Record<string, { type: 'string' | 'number' | 'boolean' | 'object' | 'array'; minLength?: number; maximum?: number }>;
  additionalProperties?: boolean;
}

export interface ExecutionContext {
  userId: string;
  ownerUnlocked?: boolean;
  chainId?: string;
  requestId?: string;
  sessionId?: string;
  conversationId?: string;
  projectId?: string;
}

export interface ToolExecutionRequest {
  requestId: string;
  toolId: string;
  input: unknown;
  userId: string;
  projectId?: string;
  conversationId?: string;
  chainId?: string;
  createdAt: string;
  idempotencyKey?: string;
}

export interface ToolVerification {
  status: 'VERIFIED' | 'FAILED' | 'NOT_AVAILABLE';
  detail?: string;
}

export interface ToolError {
  category: ToolErrorCategory;
  message: string;
  diagnostic?: string;
}

export interface ToolResult<T = unknown> {
  requestId: string;
  toolId: string;
  status: ToolResultStatus;
  durationMs: number;
  output?: T;
  error?: ToolError;
  verification?: ToolVerification;
  confirmation?: ConfirmationRequest;
}

export interface ConfirmationRequest {
  requestId: string;
  toolId: string;
  summary: string;
  risk: ToolSensitivity;
  expiresAt: string;
  state: ConfirmationState;
}

export interface SecurityDecision {
  allowed: boolean;
  reason: string;
  requiresConfirmation: boolean;
  sensitivity: ToolSensitivity;
  policyId?: string;
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  id?: string;
  name: string;
  description: string;
  version?: string;
  inputSchema?: ToolInputSchema;
  outputSchema?: ToolInputSchema;
  category?: string;
  sensitivity?: ToolSensitivity;
  requiresConfirmation?: boolean;
  permissions?: string[];
  enabled?: boolean;
  availability?: () => boolean;
  execute?: (context: ExecutionContext, input: TInput, signal: AbortSignal) => Promise<TOutput>;
  verify?: (output: TOutput, context: ExecutionContext, input: TInput) => Promise<ToolVerification>;

  // Kept for compatibility with the Phase 1 registration API.
  requiresPermission?: string;
}

export interface ToolCapability {
  toolId: string;
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  sensitivity: ToolSensitivity;
  requiresConfirmation: boolean;
  enabled: boolean;
  available: boolean;
}

export interface ToolPolicy {
  toolId: string;
  allowedSensitivity: ToolSensitivity[];
  allowedContexts?: Array<'authenticated' | 'project'>;
  requiresConfirmation?: boolean;
  enabled: boolean;
}

export interface ToolAuditEvent {
  event: string;
  requestId: string;
  toolId: string;
  userId: string;
  projectId?: string;
  status?: ToolResultStatus;
  durationMs?: number;
  errorCategory?: ToolErrorCategory;
  at: string;
}

const DEFAULT_SCHEMA: ToolInputSchema = { type: 'object', additionalProperties: false };
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 60_000;
const CONFIRMATION_TTL_MS = 60_000;
const MAX_TOOL_OUTPUT_CHARS = 20_000;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Tool execution failed.';
}

function normalizeError(error: unknown): ToolError {
  const message = safeMessage(error);
  const lowered = message.toLowerCase();
  const category: ToolErrorCategory = lowered.includes('timeout') ? 'TIMEOUT'
    : lowered.includes('rate') ? 'RATE_LIMITED'
      : lowered.includes('not found') ? 'NOT_FOUND'
        : lowered.includes('auth') || lowered.includes('permission') ? 'AUTHORIZATION_ERROR'
          : 'EXECUTION_ERROR';
  return { category, message: category === 'EXECUTION_ERROR' ? 'The tool could not complete the request.' : message, diagnostic: message };
}

function validateSchema(input: unknown, schema: ToolInputSchema): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Tool input must be an object.';
  const record = input as Record<string, unknown>;
  for (const required of schema.required || []) if (!(required in record)) return `Missing required input: ${required}.`;
  for (const [key, value] of Object.entries(record)) {
    const property = schema.properties?.[key];
    if (!property) {
      if (schema.additionalProperties === false) return `Unknown input: ${key}.`;
      continue;
    }
    if (typeof value !== property.type && !(property.type === 'array' && Array.isArray(value))) return `Invalid input type for ${key}.`;
    if (property.type === 'string' && property.minLength !== undefined && String(value).length < property.minLength) return `Input is too short: ${key}.`;
    if (property.type === 'number' && property.maximum !== undefined && Number(value) > property.maximum) return `Input is too large: ${key}.`;
  }
  return null;
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/(sk-[A-Za-z0-9_-]{12,})/g, '[REDACTED_SECRET]')
      .replace(/(bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED_TOKEN]')
      .replace(/([A-Za-z0-9_]*(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)[A-Za-z0-9_]*\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED_SECRET]')
      .slice(0, MAX_TOOL_OUTPUT_CHARS);
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sanitizeValue(child)]));
  return value;
}

function boundOutput<T>(value: T): T {
  const serialized = JSON.stringify(value);
  if (!serialized || serialized.length <= MAX_TOOL_OUTPUT_CHARS) return value;
  return { truncated: true, content: serialized.slice(0, MAX_TOOL_OUTPUT_CHARS) } as T;
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  registerTool(tool: ToolDefinition): ToolDefinition {
    const toolId = tool.id || tool.name;
    if (!/^[a-z][a-z0-9]*(?:\.[a-z0-9-]+)+$/.test(toolId) && !tool.requiresPermission) throw new Error('Tool IDs must use stable dot-separated names.');
    if (this.tools.has(toolId)) throw new Error(`Tool already registered: ${toolId}.`);
    this.tools.set(toolId, { ...tool, id: toolId, enabled: tool.enabled !== false, sensitivity: tool.sensitivity || (tool.requiresPermission ? 'INTERNAL' : 'PUBLIC'), inputSchema: tool.inputSchema || DEFAULT_SCHEMA });
    return this.tools.get(toolId)!;
  }

  register(tool: ToolDefinition): ToolDefinition { return this.registerTool(tool); }
  getTool(toolId: string): ToolDefinition | undefined { return this.tools.get(toolId); }
  get(toolId: string): ToolDefinition | undefined { return this.getTool(toolId); }
  hasTool(toolId: string): boolean { return this.tools.has(toolId); }
  has(toolId: string): boolean { return this.hasTool(toolId); }
  isEnabled(toolId: string): boolean { return this.tools.get(toolId)?.enabled === true; }
  listTools(): ToolCapability[] {
    return Array.from(this.tools.values()).map(tool => ({
      toolId: tool.id!, name: tool.name, description: tool.description, inputSchema: tool.inputSchema || DEFAULT_SCHEMA,
      sensitivity: tool.sensitivity || 'INTERNAL', requiresConfirmation: tool.requiresConfirmation === true,
      enabled: tool.enabled === true, available: tool.enabled === true && (tool.availability ? tool.availability() : true)
    }));
  }
  validateTool(toolId: string, input: unknown): string | null {
    const tool = this.getTool(toolId);
    return tool ? validateSchema(input, tool.inputSchema || DEFAULT_SCHEMA) : 'Tool was not found.';
  }
  authorizeLegacy(toolId: string, permission: string): boolean {
    const tool = this.getTool(toolId);
    return Boolean(tool && (!tool.requiresPermission || tool.requiresPermission === 'public' || tool.requiresPermission === permission));
  }
}

export class ConfirmationManager {
  private readonly pending = new Map<string, ConfirmationRequest>();

  create(requestId: string, toolId: string, summary: string, risk: ToolSensitivity): ConfirmationRequest {
    const request = { requestId, toolId, summary, risk, expiresAt: new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString(), state: 'PENDING' as ConfirmationState };
    this.pending.set(requestId, request);
    return request;
  }
  resolve(requestId: string, approved: boolean): ConfirmationRequest | null {
    const request = this.pending.get(requestId);
    if (!request) return null;
    if (Date.parse(request.expiresAt) <= Date.now()) request.state = 'EXPIRED';
    else request.state = approved ? 'APPROVED' : 'DENIED';
    this.pending.delete(requestId);
    return request;
  }
  cancel(requestId: string): ConfirmationRequest | null { return this.resolve(requestId, false); }
}

export class SecurityGate {
  constructor(private readonly policies = new Map<string, ToolPolicy>()) {}

  evaluate(tool: ToolDefinition, context: ExecutionContext, input: unknown): SecurityDecision {
    if (!context.userId.trim()) return { allowed: false, reason: 'Authentication is required.', requiresConfirmation: false, sensitivity: tool.sensitivity || 'INTERNAL' };
    const sensitivity = tool.sensitivity || 'INTERNAL';
    if (context.ownerUnlocked === false) return { allowed: false, reason: 'NEXA is locked. Owner verification is required.', requiresConfirmation: false, sensitivity };
    const policy = this.policies.get(tool.id || tool.name);
    if (tool.enabled === false || policy?.enabled === false) return { allowed: false, reason: 'Tool is disabled.', requiresConfirmation: false, sensitivity, policyId: policy?.toolId };
    if (tool.availability && !tool.availability()) return { allowed: false, reason: 'Tool is unavailable.', requiresConfirmation: false, sensitivity, policyId: policy?.toolId };
    if (policy && !policy.allowedSensitivity.includes(sensitivity)) return { allowed: false, reason: 'Tool sensitivity is not allowed by policy.', requiresConfirmation: false, sensitivity, policyId: policy.toolId };
    if (policy?.allowedContexts?.includes('project') && !context.projectId) return { allowed: false, reason: 'A project context is required.', requiresConfirmation: false, sensitivity, policyId: policy.toolId };
    if (sensitivity === 'PRIVATE' && /^(knowledge|project)\./.test(tool.id || tool.name) && !context.projectId) return { allowed: false, reason: 'A project context is required.', requiresConfirmation: false, sensitivity, policyId: policy?.toolId };
    return { allowed: true, reason: 'Allowed.', requiresConfirmation: tool.requiresConfirmation === true || policy?.requiresConfirmation === true, sensitivity, policyId: policy?.toolId };
  }
}

export class ToolExecutor {
  private readonly confirmation = new ConfirmationManager();
  private readonly active = new Map<string, AbortController>();
  private readonly completed = new Set<string>();
  private readonly calls = new Map<string, number>();

  constructor(
    private readonly registry: ToolRegistry,
    private readonly gate = new SecurityGate(),
    private readonly audit: (event: ToolAuditEvent) => void = () => undefined,
    private readonly maxCalls = 8,
    private readonly defaultTimeoutMs = DEFAULT_TIMEOUT_MS
  ) {}

  createRequest(toolId: string, input: unknown, context: ExecutionContext, idempotencyKey?: string): ToolExecutionRequest {
    return { requestId: makeId('tool'), toolId, input, userId: context.userId, projectId: context.projectId, conversationId: context.conversationId, chainId: context.chainId, createdAt: new Date().toISOString(), idempotencyKey };
  }

  async execute<T = unknown>(request: ToolExecutionRequest, context: ExecutionContext, timeoutMs = this.defaultTimeoutMs): Promise<ToolResult<T>> {
    const started = Date.now();
    const finish = (result: ToolResult<T>): ToolResult<T> => { result.durationMs = Date.now() - started; return result; };
    this.auditEvent('TOOL_REQUESTED', request);
    if (request.userId !== context.userId) return finish(this.denied(request, 'Execution context does not match the authenticated user.'));
    if (this.completed.has(request.idempotencyKey || request.requestId)) return finish(this.denied(request, 'Duplicate execution request.', 'VALIDATION_ERROR'));
    const chainId = request.chainId || request.requestId;
    const calls = (this.calls.get(chainId) || 0) + 1;
    this.calls.set(chainId, calls);
    if (calls > this.maxCalls) return finish({ ...this.denied(request, 'Tool call limit exceeded.', 'VALIDATION_ERROR'), status: 'TOOL_LIMIT_EXCEEDED' });
    const tool = this.registry.getTool(request.toolId);
    if (!tool) return finish({ ...this.denied(request, 'Tool is not registered.', 'NOT_FOUND'), status: 'NOT_FOUND' });
    const validation = this.registry.validateTool(request.toolId, request.input);
    if (validation) {
      this.auditEvent('TOOL_VALIDATION_FAILED', request, 'INVALID_INPUT', undefined, 'VALIDATION_ERROR');
      return finish({ ...this.denied(request, validation, 'VALIDATION_ERROR'), status: 'INVALID_INPUT' });
    }
    const decision = this.gate.evaluate(tool, context, request.input);
    if (!decision.allowed) return finish(this.denied(request, decision.reason));
    if (decision.requiresConfirmation) {
      const confirmation = this.confirmation.create(request.requestId, request.toolId, `Authorize ${tool.name}.`, decision.sensitivity);
      this.auditEvent('TOOL_CONFIRMATION_REQUIRED', request, 'REQUIRES_CONFIRMATION');
      return finish({ requestId: request.requestId, toolId: request.toolId, status: 'REQUIRES_CONFIRMATION', durationMs: 0, confirmation });
    }
    return this.run<T>(request, context, tool, timeoutMs, started);
  }

  async confirmAndExecute<T = unknown>(request: ToolExecutionRequest, context: ExecutionContext, approved: boolean, timeoutMs = this.defaultTimeoutMs): Promise<ToolResult<T>> {
    const confirmation = this.confirmation.resolve(request.requestId, approved);
    if (request.userId !== context.userId || !confirmation || confirmation.toolId !== request.toolId || confirmation.state !== 'APPROVED') {
      if (confirmation?.state === 'EXPIRED') this.auditEvent('TOOL_CONFIRMATION_EXPIRED', request, 'DENIED');
      else this.auditEvent(approved ? 'TOOL_CONFIRMATION_DENIED' : 'TOOL_CONFIRMATION_DENIED', request, 'DENIED', undefined, 'AUTHORIZATION_ERROR');
      return { requestId: request.requestId, toolId: request.toolId, status: 'DENIED', durationMs: 0, error: { category: 'AUTHORIZATION_ERROR', message: 'Confirmation was not valid for this request.' } };
    }
    this.auditEvent('TOOL_CONFIRMATION_APPROVED', request);
    const tool = this.registry.getTool(request.toolId);
    if (!tool) return { requestId: request.requestId, toolId: request.toolId, status: 'NOT_FOUND', durationMs: 0 };
    const validation = this.registry.validateTool(request.toolId, request.input);
    if (validation) return { requestId: request.requestId, toolId: request.toolId, status: 'INVALID_INPUT', durationMs: 0, error: { category: 'VALIDATION_ERROR', message: validation } };
    const decision = this.gate.evaluate(tool, context, request.input);
    if (!decision.allowed) return this.denied(request, decision.reason);
    return this.run<T>(request, context, tool, timeoutMs, Date.now());
  }

  cancel(requestId: string): boolean {
    const controller = this.active.get(requestId);
    if (!controller) return false;
    controller.abort();
    this.audit({ event: 'TOOL_EXECUTION_CANCELLED', requestId, toolId: 'unknown', userId: 'masked', status: 'CANCELLED', at: new Date().toISOString() });
    return true;
  }

  private async run<T>(request: ToolExecutionRequest, context: ExecutionContext, tool: ToolDefinition, timeoutMs: number, started: number): Promise<ToolResult<T>> {
    if (!tool.execute) return { requestId: request.requestId, toolId: request.toolId, status: 'UNAVAILABLE', durationMs: Date.now() - started, error: { category: 'DEPENDENCY_ERROR', message: 'Tool execution is unavailable.' } };
    const controller = new AbortController();
    this.active.set(request.requestId, controller);
    const boundedTimeout = Math.min(Math.max(timeoutMs, 1), MAX_TIMEOUT_MS);
    this.auditEvent('TOOL_EXECUTION_STARTED', request);
    try {
      const execution = tool.execute(context, request.input, controller.signal);
      const output = await Promise.race([execution, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Tool execution timeout.')), boundedTimeout))]);
      if (controller.signal.aborted) return { requestId: request.requestId, toolId: request.toolId, status: 'CANCELLED', durationMs: Date.now() - started };
      const sanitized = boundOutput(sanitizeValue(output)) as T;
      const verification = tool.verify ? await tool.verify(sanitized, context, request.input) : { status: 'NOT_AVAILABLE' as const };
      const result: ToolResult<T> = { requestId: request.requestId, toolId: request.toolId, status: verification.status === 'FAILED' ? 'FAILED' : 'SUCCESS', durationMs: Date.now() - started, output: sanitized, verification };
      this.completed.add(request.idempotencyKey || request.requestId);
      this.auditEvent(verification.status === 'FAILED' ? 'TOOL_VERIFICATION_FAILED' : 'TOOL_EXECUTION_COMPLETED', request, result.status, result.durationMs);
      return result;
    } catch (error) {
      const normalized = normalizeError(error);
      if (normalized.category === 'TIMEOUT') controller.abort();
      const status: ToolResultStatus = normalized.category === 'TIMEOUT' ? 'TIMEOUT' : controller.signal.aborted ? 'CANCELLED' : 'FAILED';
      this.auditEvent(status === 'TIMEOUT' ? 'TOOL_EXECUTION_TIMEOUT' : 'TOOL_EXECUTION_FAILED', request, status, Date.now() - started, normalized.category);
      return { requestId: request.requestId, toolId: request.toolId, status, durationMs: Date.now() - started, error: normalized };
    } finally {
      this.active.delete(request.requestId);
    }
  }

  private denied<T = unknown>(request: ToolExecutionRequest, message: string, category: ToolErrorCategory = 'AUTHORIZATION_ERROR'): ToolResult<T> {
    this.auditEvent('TOOL_ACCESS_DENIED', request, 'DENIED', undefined, category);
    return { requestId: request.requestId, toolId: request.toolId, status: 'DENIED', durationMs: 0, error: { category, message } };
  }

  private auditEvent(event: string, request: ToolExecutionRequest, status?: ToolResultStatus, durationMs?: number, errorCategory?: ToolErrorCategory): void {
    this.audit({ event, requestId: request.requestId, toolId: request.toolId, userId: request.userId, projectId: request.projectId, status, durationMs, errorCategory, at: new Date().toISOString() });
  }
}

export function createCalculatorTool(): ToolDefinition<{ expression: string }, { value: number }> {
  return {
    id: 'calculator.evaluate', name: 'Calculator', description: 'Evaluate a safe arithmetic expression.', category: 'deterministic', sensitivity: 'PUBLIC', inputSchema: { type: 'object', required: ['expression'], properties: { expression: { type: 'string', minLength: 1 } }, additionalProperties: false },
    execute: async (_context, input) => { const value = evaluateSimpleArithmetic(input.expression); if (value === null) throw new Error('Invalid arithmetic expression.'); return { value }; }
  };
}

export function createSystemStatusTool(): ToolDefinition<Record<string, never>, { status: string }> {
  return { id: 'system.status', name: 'System status', description: 'Return safe application availability status.', category: 'diagnostics', sensitivity: 'INTERNAL', inputSchema: { type: 'object', additionalProperties: false }, execute: async () => ({ status: 'available' }) };
}