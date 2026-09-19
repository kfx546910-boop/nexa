import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SecurityGate,
  ToolExecutor,
  ToolRegistry,
  createCalculatorTool
} from './toolCore';

const context = { userId: 'user-a', projectId: 'project-a' };

function executor(registry = new ToolRegistry(), maxCalls = 8) {
  return new ToolExecutor(registry, new SecurityGate(), undefined, maxCalls, 20);
}

test('unknown provider tool requests are denied without execution', async () => {
  const registry = new ToolRegistry();
  const result = await executor(registry).execute({ requestId: 'unknown-1', toolId: 'secret.tool', input: {}, userId: 'user-a', createdAt: new Date().toISOString() }, context);
  assert.equal(result.status, 'NOT_FOUND');
});

test('invalid tool input is rejected before execution', async () => {
  const registry = new ToolRegistry();
  registry.registerTool(createCalculatorTool());
  const request = executor(registry).createRequest('calculator.evaluate', { expression: 2 }, context);
  const result = await executor(registry).execute(request, context);
  assert.equal(result.status, 'INVALID_INPUT');
});

test('missing authenticated user is denied', async () => {
  const registry = new ToolRegistry();
  registry.registerTool(createCalculatorTool());
  const toolExecutor = executor(registry);
  const request = toolExecutor.createRequest('calculator.evaluate', { expression: '2 + 2' }, { userId: '' });
  const result = await toolExecutor.execute(request, { userId: '' });
  assert.equal(result.status, 'DENIED');
});

test('confirmation is request-specific and required before execution', async () => {
  let executions = 0;
  const registry = new ToolRegistry();
  registry.registerTool({
    id: 'project.files.read', name: 'Read file', description: 'Read an authorized file.', sensitivity: 'PRIVATE', requiresConfirmation: true,
    inputSchema: { type: 'object', required: ['fileId'], properties: { fileId: { type: 'string', minLength: 1 } }, additionalProperties: false },
    execute: async () => { executions += 1; return { content: 'authorized' }; }
  });
  const toolExecutor = executor(registry);
  const request = toolExecutor.createRequest('project.files.read', { fileId: 'file-a' }, context);
  const pending = await toolExecutor.execute(request, context);
  assert.equal(pending.status, 'REQUIRES_CONFIRMATION');
  assert.equal(executions, 0);
  const completed = await toolExecutor.confirmAndExecute(request, context, true);
  assert.equal(completed.status, 'SUCCESS');
  assert.equal(executions, 1);
});

test('timeout produces a structured timeout result', async () => {
  const registry = new ToolRegistry();
  registry.registerTool({ id: 'system.status.slow', name: 'Slow status', description: 'Slow status.', execute: async () => new Promise(resolve => setTimeout(() => resolve('late'), 50)) });
  const toolExecutor = executor(registry);
  const request = toolExecutor.createRequest('system.status.slow', {}, context);
  const result = await toolExecutor.execute(request, context, 5);
  assert.equal(result.status, 'TIMEOUT');
});

test('cancellation reports cancellation and does not claim success', async () => {
  const registry = new ToolRegistry();
  registry.registerTool({ id: 'system.status.cancellable', name: 'Cancellable status', description: 'Cancellable status.', execute: async (_context, _input, signal) => new Promise(resolve => { signal.addEventListener('abort', () => resolve('cancelled')); }) });
  const toolExecutor = executor(registry);
  const request = toolExecutor.createRequest('system.status.cancellable', {}, context);
  const running = toolExecutor.execute(request, context, 100);
  await new Promise(resolve => setTimeout(resolve, 1));
  assert.equal(toolExecutor.cancel(request.requestId), true);
  assert.equal((await running).status, 'CANCELLED');
});

test('tool output is sanitized before it can reach a provider', async () => {
  const registry = new ToolRegistry();
  registry.registerTool({ id: 'system.status.credentials', name: 'Credential status', description: 'Fixture.', execute: async () => ({ token: 'sk-123456789012345', status: 'ok' }) });
  const toolExecutor = executor(registry);
  const request = toolExecutor.createRequest('system.status.credentials', {}, context);
  const result = await toolExecutor.execute<{ token: string }>(request, context);
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.output?.token, '[REDACTED_SECRET]');
});

test('idempotency and tool call limits prevent repeated execution', async () => {
  let executions = 0;
  const registry = new ToolRegistry();
  registry.registerTool({ id: 'system.status.once', name: 'Once', description: 'Fixture.', execute: async () => { executions += 1; return { ok: true }; } });
  const toolExecutor = executor(registry, 1);
  const request = toolExecutor.createRequest('system.status.once', {}, context, 'same-operation');
  assert.equal((await toolExecutor.execute(request, context)).status, 'SUCCESS');
  assert.equal((await toolExecutor.execute(request, context)).status, 'DENIED');
  assert.equal(executions, 1);
});

test('private project tools require project context at the security gate', async () => {
  const registry = new ToolRegistry();
  registry.registerTool({ id: 'project.files.list', name: 'List files', description: 'Fixture.', sensitivity: 'PRIVATE', execute: async () => [] });
  const toolExecutor = executor(registry);
  const request = toolExecutor.createRequest('project.files.list', {}, { userId: 'user-a' });
  const result = await toolExecutor.execute(request, { userId: 'user-a' });
  assert.equal(result.status, 'DENIED');
});

test('locked owner context denies tool execution', async () => {
  const registry = new ToolRegistry();
  registry.registerTool(createCalculatorTool());
  const toolExecutor = executor(registry);
  const request = toolExecutor.createRequest('calculator.evaluate', { expression: '2 + 2' }, { userId: 'user-a', ownerUnlocked: false });
  const result = await toolExecutor.execute(request, { userId: 'user-a', ownerUnlocked: false });
  assert.equal(result.status, 'DENIED');
  assert.match(result.error?.message || '', /locked/i);
});