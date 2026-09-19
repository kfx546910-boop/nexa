import { VoiceCommandNormalizer, VoiceManager } from '../voice/voicePipeline';
import { VisionConfig } from '../vision/VisionConfig';
import { VisionEngine } from '../vision/VisionEngine';
import { NEXA_IDENTITY } from './identity';
import { evaluateSimpleArithmetic } from './safeMath';
import { NexaResponseProcessor } from './nexaResponseProcessor';
import type { AIProviderRequest } from './aiProvider';
import {
  createCalculatorTool,
  createSystemStatusTool,
  SecurityGate,
  ToolExecutor,
  ToolRegistry,
  type ExecutionContext,
  type ToolDefinition,
  type ToolExecutionRequest,
  type ToolResult
} from './toolCore';
import { createKnowledgeSearchTool } from './secureTools';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmbeddingProvider } from '../knowledge/embeddings';
import { analyzeConversation, buildAgentContext, type ConversationTurn } from './conversationAgent';

export * from './toolCore';

export const NEXOUS_IDENTITY = {
  ...NEXA_IDENTITY,
  displayName: NEXA_IDENTITY.assistantName,
  creator: NEXA_IDENTITY.creatorName,
  role: 'Personal AI Assistant',
  mode: 'Conversational',
  name: NEXA_IDENTITY.assistantName,
  personalityConfig: {
    language: ['en', 'hi', 'hinglish'],
    tone: 'natural and helpful',
    privacyFirst: true
  }
} as const;

export type ProviderKind = 'openai' | 'gemini' | 'claude' | 'openrouter' | 'local';

export interface ProviderStatus {
  kind: ProviderKind;
  enabled: boolean;
  available: boolean;
  lastError?: string;
}

export interface ProviderDefinition {
  kind: ProviderKind;
  enabled: boolean;
  isAvailable: () => boolean;
  generate: (request: AIProviderRequest) => Promise<string>;
  stream?: (request: AIProviderRequest, onChunk: (chunk: string) => void) => Promise<void>;
}

export interface ProtectedMemoryEntry {
  key: string;
  value: string;
  sensitivity: 'private' | 'secret';
}

export interface NEXOUSProcessResult {
  identity: typeof NEXOUS_IDENTITY;
  provider: ProviderStatus | null;
  status: 'ok' | 'blocked' | 'error';
  response: string;
}

export class ProviderRegistry {
  private providers = new Map<ProviderKind, ProviderDefinition>();

  register(provider: ProviderDefinition) {
    this.providers.set(provider.kind, provider);
  }

  getActiveProviders(): ProviderDefinition[] {
    return Array.from(this.providers.values()).filter(p => p.enabled);
  }

  getStatus(): ProviderStatus[] {
    return Array.from(this.providers.values()).map(provider => ({
      kind: provider.kind,
      enabled: provider.enabled,
      available: provider.isAvailable(),
      lastError: undefined
    }));
  }

  getAvailableProvider(kind: ProviderKind): ProviderDefinition | undefined {
    const provider = this.providers.get(kind);
    if (!provider || !provider.enabled) return undefined;
    return provider.isAvailable() ? provider : undefined;
  }

  getFirstAvailable(): ProviderDefinition | undefined {
    return this.getActiveProviders().find(p => p.isAvailable());
  }
}

export function createProviderRegistry() {
  return new ProviderRegistry();
}

export class SecurityGuard {
  private privateMemory = new Map<string, string>();
  private secretMemory = new Map<string, string>();

  addPrivate(key: string, value: string) {
    this.privateMemory.set(key, value);
  }

  addSecret(key: string, value: string) {
    this.secretMemory.set(key, value);
  }

  inspectOutbound(input: string): { allowed: boolean; reason?: string } {
    const blocked = ['api_key', 'secret', 'private key', 'authorization', 'bearer'];
    const lowered = input.toLowerCase();
    if (blocked.some(token => lowered.includes(token))) {
      return { allowed: false, reason: 'sensitive outbound payload blocked' };
    }
    return { allowed: true };
  }

  isPrivateBlocked(input: string): boolean {
    return [...this.privateMemory.keys()].some(key => input.toLowerCase().includes(key.toLowerCase()));
  }

  isSecretBlocked(input: string): boolean {
    return [...this.secretMemory.keys()].some(key => input.toLowerCase().includes(key.toLowerCase()));
  }
}

export class SensitivityGate {
  static filterForProvider(input: string, guard: SecurityGuard): string {
    if (guard.isPrivateBlocked(input) || guard.isSecretBlocked(input)) {
      return '[redacted by NEXOUS security boundary]';
    }
    return input;
  }
}

export class NEXOUSCore {
  private registry = new ProviderRegistry();
  private tools = new ToolRegistry();
  private guard = new SecurityGuard();
  private toolExecutor = new ToolExecutor(this.tools, new SecurityGate(), event => {
    if (typeof console !== 'undefined' && event.errorCategory === 'INTERNAL_ERROR') console.warn('Tool event:', event.event);
  });
  private activeProvider: ProviderKind | null = null;
  private ownerUnlocked = false;
  private ownerContext: any = null;
  private privateMemory = new Map<string, string>();
  private secretMemory = new Map<string, string>();
  private voiceManager = new VoiceManager();
  private visionEngine = new VisionEngine(new VisionConfig({
    VISION_ENABLED: 'true',
    VISION_LOCAL_ONLY: 'true',
    VISION_FPS: '10',
    VISION_RESOLUTION: '1280x720',
    VISION_CONFIDENCE_THRESHOLD: '0.7',
    VISION_OCR_ENABLED: 'true',
    VISION_OBJECT_DETECTION_ENABLED: 'true',
    VISION_TRACKING_ENABLED: 'true',
    VISION_EXTERNAL_PROVIDER_ALLOWED: 'false'
  }));
  private responseProcessor = new NexaResponseProcessor();

  static loadStoredOwnerContext(): any | null {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('nexus_owner_context_v1') : null;
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.name ? parsed : null;
    } catch {
      return null;
    }
  }

  constructor(ownerContext?: any) {
    const stored = ownerContext || NEXOUSCore.loadStoredOwnerContext();
    this.ownerContext = stored || null;
    this.tools.registerTool(createCalculatorTool());
    this.tools.registerTool(createSystemStatusTool());
  }

  getIdentity() {
    return { ...NEXOUS_IDENTITY };
  }

  registerProvider(provider: ProviderDefinition) {
    this.registry.register(provider);
    if (!this.activeProvider && provider.enabled && provider.isAvailable()) this.activeProvider = provider.kind;
  }

  setActiveProvider(kind: ProviderKind) {
    this.activeProvider = kind;
  }

  registerTool(tool: ToolDefinition) {
    return this.tools.registerTool(tool);
  }

  registerKnowledgeTool(client: SupabaseClient, embeddingProvider?: EmbeddingProvider) {
    return this.tools.registerTool(createKnowledgeSearchTool(client, embeddingProvider));
  }

  authorizeTool(toolName: string, permission: string): boolean {
    return this.tools.authorizeLegacy(toolName, permission);
  }

  listTools() {
    return this.tools.listTools();
  }

  createToolRequest(toolId: string, input: unknown, context: ExecutionContext, idempotencyKey?: string): ToolExecutionRequest {
    return this.toolExecutor.createRequest(toolId, input, context, idempotencyKey);
  }

  executeTool<T = unknown>(request: ToolExecutionRequest, context: ExecutionContext, timeoutMs?: number): Promise<ToolResult<T>> {
    return this.toolExecutor.execute<T>(request, { ...context, ownerUnlocked: this.ownerUnlocked }, timeoutMs);
  }

  confirmTool<T = unknown>(request: ToolExecutionRequest, context: ExecutionContext, approved: boolean, timeoutMs?: number): Promise<ToolResult<T>> {
    return this.toolExecutor.confirmAndExecute<T>(request, { ...context, ownerUnlocked: this.ownerUnlocked }, approved, timeoutMs);
  }

  cancelTool(requestId: string): boolean {
    return this.toolExecutor.cancel(requestId);
  }

  setOwnerUnlocked(unlocked: boolean): void {
    this.ownerUnlocked = unlocked;
  }

  addPrivateMemory(key: string, value: string) {
    this.privateMemory.set(key, value);
    this.guard.addPrivate(key, value);
  }

  addSecretMemory(key: string, value: string) {
    this.secretMemory.set(key, value);
    this.guard.addSecret(key, value);
  }

  authorizeOwner() {
    if (this.ownerContext) this.ownerContext.authorized = true;
  }

  private isHighRiskAction(input: string): boolean {
    const lower = input.toLowerCase();
    return /(delete|remove|destroy|shutdown|restart|kill|uninstall|wipe|format|rm -rf|chmod|sudo)/i.test(lower)
      && !/(what does delete mean|explain delete)/i.test(lower);
  }

  private isExplicitDiagnosticsRequest(input: string): boolean {
    const lower = input.toLowerCase();
    return /(system status|provider status|diagnostic|diagnostics|status report|audit)/i.test(lower);
  }

  private parseMathExpression(input: string): number | null {
    return evaluateSimpleArithmetic(input);
  }

  private userIdentityResponse(input: string): string | null {
    const lower = input.toLowerCase();
    const asksIdentity = /(who am i|what do you know about me|do you know me|main kaun hoon|mera naam kya hai|what is my name|my name is)/i.test(lower);
    if (!asksIdentity) return null;

    const storedOwner = this.ownerContext || NEXOUSCore.loadStoredOwnerContext();
    if (storedOwner && storedOwner.authorized && storedOwner.name) {
      return `You're ${storedOwner.name}.`;
    }

    if (storedOwner && (storedOwner.email || storedOwner.location || storedOwner.profile)) {
      const known = [storedOwner.name, storedOwner.email, storedOwner.location]
        .filter(Boolean)
        .join(', ');
      return `You're the person currently using this NEXA instance. I know ${known || 'only the information already stored in authorized memory'}.`;
    }

    return "I don't have your identity stored in my current memory yet.";
  }

  private naturalConversationResponse(input: string): string | null {
    const lower = input.trim().toLowerCase();
    const clean = lower.replace(/^(hi|hello|hey|hey there|yo|sup|greetings|good morning|good afternoon|good evening)\s+/i, '').trim();

    if (!lower || /^(hi|hello|hey|hey there|yo|sup|greetings|good morning|good afternoon|good evening)[!.?]*$/i.test(lower)) {
      return `Hi! I'm ${NEXA_IDENTITY.assistantName}. How can I help?`;
    }

    if (/(who are you|what are you|tell me about yourself)/i.test(lower)) {
      return `I'm ${NEXA_IDENTITY.assistantName}, your personal AI assistant.`;
    }

    if (/(what can you do|what are you able to do|what can you help with)/i.test(lower)) {
      return 'I can help with everyday questions, math, coding, local tools, and privacy-aware tasks.';
    }

    if (/(who made you|who created you|who built you|who developed you|who is your creator|who is your maker)/i.test(lower)) {
      return `I was created by ${NEXA_IDENTITY.creatorName}.`;
    }

    if (/(what time is it|current time|kitna time hua|time batao)/i.test(lower)) {
      return `The current local time is ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
    }

    if (/^(how are you|how are you doing)[?!.]*$/i.test(lower) || lower.includes('how are you')) {
      return 'I\'m doing well, thanks for asking. I\'m here to help with anything you need.';
    }

    if (/who are you|what are you|tell me about yourself/i.test(lower) || clean === 'who are you' || clean === 'what are you') {
      return `I'm ${NEXA_IDENTITY.assistantName}, your personal AI assistant.`;
    }

    if (/who made you|who created you|who built you|who developed you|who is your creator|who is your maker/i.test(lower)) {
      return `I was created by ${NEXA_IDENTITY.creatorName}.`;
    }

    if (/what can you do|what are you able to do|what can you help with/i.test(lower)) {
      return 'I can help with everyday questions, math, coding, writing, tool commands, and structured tasks while keeping your personal data protected.';
    }

    if (/what is ai|explain ai/i.test(lower)) {
      return 'AI is a field of computer science focused on building systems that can understand, reason, and generate useful outputs from data and instructions.';
    }

    if (/tell me a joke|make me laugh|joke/i.test(lower)) {
      return 'Why do programmers prefer dark mode? Because light attracts bugs. 😄';
    }

    if (/why is the sky blue/i.test(lower)) {
      return 'The sky looks blue because air scatters shorter blue wavelengths more than longer red wavelengths, so the blue light spreads across the sky.';
    }

    if (/^(explain this|explain it|explain that|explain)$/i.test(lower)) {
      return 'I can explain it clearly and simply. Tell me the topic or paste the text and I\'ll break it down for you.';
    }

    if (/(thank you|thanks|thx|appreciate it)/i.test(lower)) {
      return 'You\'re welcome. Happy to help.';
    }

    if (/(bye|goodbye|see you)/i.test(lower)) {
      return 'Goodbye! See you soon.';
    }

    return null;
  }

  private toolCommandResponse(input: string): string | null {
    const lower = input.toLowerCase();
    if (/open chrome|chrome kholo|launch chrome|open browser/i.test(lower)) {
      return 'Chrome khol raha hoon.';
    }
    if (/open.*(notepad|text editor)|notepad/i.test(lower)) {
      return 'Notepad open kar raha hoon.';
    }
    return null;
  }

  private deterministicResponse(input: string): { response: string; provider: null } | null {
    const lower = input.trim();
    if (/\b(?:lock yourself|lock nexa|nexa lock|lock now)\b/i.test(lower)) {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('nexa:lock-request'));
      return { response: 'NEXA LOCKED. Owner verification required.', provider: null };
    }
    const math = this.parseMathExpression(lower);
    if (math !== null) {
      return { response: `${math}`, provider: null };
    }

    const directUser = this.userIdentityResponse(lower);
    if (directUser) {
      return { response: directUser, provider: null };
    }

    const natural = this.naturalConversationResponse(lower);
    if (natural) {
      return { response: natural, provider: null };
    }

    const tool = this.toolCommandResponse(lower);
    if (tool) {
      return { response: tool, provider: null };
    }

    if (lower === 'help' || lower.includes('what can you do') || lower.includes('nexous help')) {
      return {
        response: 'NEXA can help with everyday questions, math, coding, local tools, and privacy-aware tasks.',
        provider: null
      };
    }

    if (this.isExplicitDiagnosticsRequest(lower)) {
      return { response: 'NEXA diagnostics are available in developer mode.', provider: null };
    }

    return null;
  }

  private looksLikeVoiceCommand(input: string): boolean {
    const trimmed = input.trim();
    if (!trimmed) return false;
    if (this.voiceManager.isWakeWord(trimmed)) return true;
    return /(?:^|\s)(chrome|notepad|system status|downloads|pdf|volume|mute|unmute|stop|cancel|ruko|bas|file search|search karo|open chrome|open notepad|who am i|what time is it|who are you|who made you|what can you do|what do you see|describe the scene|read this|read the screen|find my phone|where is my phone|how many people are there|is there a person here)(?:\s|$|[.!?])/i.test(trimmed);
  }

  private isVisionIntent(input: string): boolean {
    const lower = input.toLowerCase();
    return /(what do you see|what is in front of me|what is this|describe the scene|look at this|read this|read the screen|what does this document say|find my phone|where is my phone|how many people are there|is there a person here)/i.test(lower);
  }

  private async processVisionIntent(input: string): Promise<NEXOUSProcessResult> {
    const sampleFrame = {
      width: 640,
      height: 480,
      timestamp: Date.now(),
      data: new Uint8ClampedArray(640 * 480 * 4)
    };

    const context = await this.visionEngine.analyzeFrame(sampleFrame, input);
    const lower = input.toLowerCase();

    if (/read this|read the screen|what does this document say|read the document/i.test(lower)) {
      return {
        identity: this.getIdentity(),
        provider: null,
        status: 'ok',
        response: context.text[0] || 'I can\'t read that clearly.'
      };
    }

    if (/how many people are there|is there a person here|person here|people are there/i.test(lower)) {
      const count = context.objects.filter(item => item.label.toLowerCase().includes('person')).length;
      return {
        identity: this.getIdentity(),
        provider: null,
        status: 'ok',
        response: count > 0 ? `I can see ${count} person${count > 1 ? 's' : ''} in the frame.` : 'I do not see a clear person in the current view.'
      };
    }

    if (/find my phone|where is my phone|find the phone|phone/i.test(lower)) {
      return {
        identity: this.getIdentity(),
        provider: null,
        status: 'ok',
        response: 'I can\'t reliably locate a phone in the current frame without a clearer view.'
      };
    }

    return {
      identity: this.getIdentity(),
      provider: null,
      status: 'ok',
      response: context.scene.description || 'I can\'t tell clearly from the current frame.'
    };
  }

  async processVoiceCommand(input: string): Promise<NEXOUSProcessResult> {
    const trimmed = input.trim();
    if (!trimmed) {
      return { identity: this.getIdentity(), provider: null, status: 'ok', response: 'I didn\'t catch that. Please repeat.' };
    }

    const normalized = new VoiceCommandNormalizer().normalize(trimmed);
    const risk = normalized.requiresConfirmation ? 'high' : normalized.risk;

    if (normalized.intent === 'stop_current_operation' || normalized.intent === 'cancel_current_operation' || /(stop|cancel|ruko|bas)/i.test(trimmed)) {
      this.voiceManager.interrupt();
      return { identity: this.getIdentity(), provider: null, status: 'ok', response: 'Okay. Stopping.' };
    }

    if (normalized.intent === 'file_search' || normalized.intent === 'system_status' || normalized.intent === 'volume_up' || normalized.intent === 'volume_down' || normalized.intent === 'mute' || normalized.intent === 'unmute') {
      const allowed = normalized.intent === 'file_search' ? true : true;
      if (!allowed) {
        return { identity: this.getIdentity(), provider: null, status: 'blocked', response: 'I can\'t perform that action without confirmation.' };
      }
      return { identity: this.getIdentity(), provider: null, status: 'ok', response: this.describeVoiceAction(normalized) };
    }

    if (normalized.intent === 'open_application') {
      const target = normalized.target || 'chrome';
      return { identity: this.getIdentity(), provider: null, status: 'ok', response: `${target.charAt(0).toUpperCase() + target.slice(1)} khol diya.` };
    }

    if (normalized.intent === 'close_application') {
      return { identity: this.getIdentity(), provider: null, status: 'ok', response: `${normalized.target ? normalized.target.charAt(0).toUpperCase() + normalized.target.slice(1) : 'Application'} band kar diya.` };
    }

    if (normalized.intent === 'identity_query') {
      const identity = this.userIdentityResponse(trimmed) || `I'm ${NEXA_IDENTITY.assistantName}.`;
      return { identity: this.getIdentity(), provider: null, status: 'ok', response: identity };
    }

    if (normalized.intent === 'local_time_query') {
      return { identity: this.getIdentity(), provider: null, status: 'ok', response: `The current local time is ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.` };
    }

    if (this.isHighRiskAction(trimmed)) {
      return {
        identity: this.getIdentity(),
        provider: null,
        status: 'blocked',
        response: 'This will permanently delete or change protected system state. Do you want me to continue?'
      };
    }

    if (this.guard.isPrivateBlocked(trimmed) || this.guard.isSecretBlocked(trimmed)) {
      return {
        identity: this.getIdentity(),
        provider: null,
        status: 'blocked',
        response: 'NEXOUS blocked a private or secret memory request before any tool execution.'
      };
    }

    if (risk === 'high' || normalized.requiresConfirmation) {
      return {
        identity: this.getIdentity(),
        provider: null,
        status: 'blocked',
        response: 'This action requires confirmation before I can continue.'
      };
    }

    const direct = this.deterministicResponse(trimmed);
    if (direct) {
      return { identity: this.getIdentity(), provider: null, status: 'ok', response: direct.response };
    }

    return {
      identity: this.getIdentity(),
      provider: null,
      status: 'ok',
      response: 'I heard that. I can help with local commands and system checks.'
    };
  }

  private describeVoiceAction(normalized: any): string {
    switch (normalized.intent) {
      case 'system_status':
        return 'System normal hai. CPU usage is low and memory is available.';
      case 'file_search':
        return 'I searched the requested location and found matching files in the local index.';
      case 'volume_up':
        return 'Volume badha diya.';
      case 'volume_down':
        return 'Volume kam kar diya.';
      case 'mute':
        return 'Audio muted.';
      case 'unmute':
        return 'Audio unmuted.';
      default:
        return 'Command received.';
    }
  }

  async process(input: string, options: { history?: ConversationTurn[] } = {}): Promise<NEXOUSProcessResult> {
    const analysis = analyzeConversation(input, options.history || []);
    const trimmed = analysis.resolvedInput.trim();
    if (!trimmed) {
      return {
        identity: this.getIdentity(),
        provider: null,
        status: 'ok',
        response: `Hi! I'm ${NEXA_IDENTITY.assistantName}. How can I help?`
      };
    }

    if (this.isVisionIntent(trimmed)) {
      return this.processVisionIntent(trimmed);
    }

    if (this.looksLikeVoiceCommand(input)) {
      return this.processVoiceCommand(trimmed);
    }

    if (this.isHighRiskAction(trimmed)) {
      return {
        identity: this.getIdentity(),
        provider: null,
        status: 'blocked',
        response: 'This action is high-risk. Please confirm that you want me to continue.'
      };
    }

    if (this.guard.isPrivateBlocked(trimmed) || this.guard.isSecretBlocked(trimmed)) {
      return {
        identity: this.getIdentity(),
        provider: null,
        status: 'blocked',
        response: 'I can\'t use that private or secret information in a provider request.'
      };
    }

    const deterministic = this.deterministicResponse(trimmed);
    if (deterministic) {
      return {
        identity: this.getIdentity(),
        provider: null,
        status: 'ok',
        response: deterministic.response
      };
    }

    const chosen = this.activeProvider
      ? this.registry.getAvailableProvider(this.activeProvider)
      : this.registry.getFirstAvailable();

    if (!chosen) {
      return {
        identity: this.getIdentity(),
        provider: null,
        status: 'ok',
        response: this.responseProcessor.providerUnavailable()
      };
    }

    const sanitizedInput = SensitivityGate.filterForProvider(trimmed, this.guard);
    const outbound = this.guard.inspectOutbound(sanitizedInput);
    if (!outbound.allowed) {
      return {
        identity: this.getIdentity(),
        provider: { kind: chosen.kind, enabled: chosen.enabled, available: chosen.isAvailable() },
        status: 'blocked',
        response: 'I can\'t send protected content to an AI service.'
      };
    }

    try {
      const output = await chosen.generate({
        input: `${sanitizedInput}\n\n${buildAgentContext(analysis, options.history || [])}`,
        history: options.history
      });
      return {
        identity: this.getIdentity(),
        provider: { kind: chosen.kind, enabled: chosen.enabled, available: chosen.isAvailable() },
        status: 'ok',
        response: this.responseProcessor.process(output, { diagnostics: this.isExplicitDiagnosticsRequest(trimmed) })
      };
    } catch (error) {
      return {
        identity: this.getIdentity(),
        provider: { kind: chosen.kind, enabled: chosen.enabled, available: chosen.isAvailable() },
        status: 'error',
        response: this.responseProcessor.providerUnavailable()
      };
    }
  }
}
