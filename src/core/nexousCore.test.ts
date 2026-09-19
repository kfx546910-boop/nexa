import test from 'node:test';
import assert from 'node:assert/strict';

import { NEXOUS_IDENTITY, NEXOUSCore, ProviderStatus, createProviderRegistry } from './nexousCore';
import { createOwnerContext, OwnerAccessLevel } from './ownerContext';
import { VoiceIntentRouter, VoiceCommandNormalizer, WakeWordDetector } from '../voice/voicePipeline';

const localProvider = {
  kind: 'local',
  enabled: true,
  isAvailable: () => true,
  generate: async (input: string) => `LOCAL:${input}`
};

test('Gemini enabled', async () => {
  const core = new NEXOUSCore();
  core.registerProvider({ kind: 'gemini', enabled: true, isAvailable: () => true, generate: async () => 'gemini response' });
  const result = await core.process('Explain a modern distributed database architecture');
  assert.equal(result.identity.name, NEXOUS_IDENTITY.name);
  assert.equal(result.provider?.kind, 'gemini');
});

test('Gemini disabled', async () => {
  const core = new NEXOUSCore();
  core.registerProvider({ kind: 'gemini', enabled: false, isAvailable: () => false, generate: async () => 'gemini response' });
  const result = await core.process('Hello');
  assert.equal(result.status, 'ok');
  assert.equal(result.identity.name, NEXOUS_IDENTITY.name);
});

test('Claude enabled', async () => {
  const core = new NEXOUSCore();
  core.registerProvider({ kind: 'claude', enabled: true, isAvailable: () => true, generate: async () => 'claude response' });
  const result = await core.process('Compare event-driven and request-driven systems');
  assert.equal(result.provider?.kind, 'claude');
});

test('OpenRouter enabled', async () => {
  const core = new NEXOUSCore();
  core.registerProvider({ kind: 'openrouter', enabled: true, isAvailable: () => true, generate: async () => 'openrouter response' });
  const result = await core.process('Summarize');
  assert.equal(result.provider?.kind, 'openrouter');
});

test('all providers offline', async () => {
  const core = new NEXOUSCore();
  core.registerProvider({ kind: 'gemini', enabled: true, isAvailable: () => false, generate: async () => 'gemini response' });
  core.registerProvider({ kind: 'claude', enabled: true, isAvailable: () => false, generate: async () => 'claude response' });
  core.registerProvider({ kind: 'openrouter', enabled: true, isAvailable: () => false, generate: async () => 'openrouter response' });
  const result = await core.process('help');
  assert.ok(result.response.includes('NEXA'));
  assert.equal(result.provider, null);
});

test('provider switching', async () => {
  const core = new NEXOUSCore();
  core.registerProvider({ kind: 'gemini', enabled: true, isAvailable: () => true, generate: async () => 'gemini response' });
  core.registerProvider({ kind: 'claude', enabled: true, isAvailable: () => true, generate: async () => 'claude response' });
  const first = await core.process('Explain the difference between monoliths and microservices');
  assert.equal(first.provider?.kind, 'gemini');
  core.setActiveProvider('claude');
  const second = await core.process('Explain the difference between monoliths and microservices');
  assert.equal(second.provider?.kind, 'claude');
});

test('identity persistence', () => {
  const core = new NEXOUSCore();
  const saved = JSON.stringify(core.getIdentity());
  const restored = JSON.parse(saved);
  assert.equal(restored.name, NEXOUS_IDENTITY.name);
  assert.equal(restored.role, NEXOUS_IDENTITY.role);
});

test('protected owner context', async () => {
  const owner = createOwnerContext({ name: 'Suraj', email: 'suraj@example.com', allowedRoles: [OwnerAccessLevel.OWNER] });
  const core = new NEXOUSCore(owner);
  core.authorizeOwner();
  const result = await core.process('what is my name');
  assert.ok(result.response.includes('Suraj') || result.response.includes('owner'));
});

test('private-memory blocking', async () => {
  const core = new NEXOUSCore();
  core.addPrivateMemory('bankPin', '1234');
  const result = await core.process('bankPin is 1234');
  assert.equal(result.status, 'blocked');
  assert.ok(result.response.includes('private') || result.response.includes('blocked'));
});

test('secret-memory blocking', async () => {
  const core = new NEXOUSCore();
  core.addSecretMemory('token', 'abc');
  const result = await core.process('token abc');
  assert.equal(result.status, 'blocked');
});

test('tool authorization', async () => {
  const core = new NEXOUSCore();
  const allowed = core.registerTool({ name: 'ls', description: 'List files', requiresPermission: 'filesystem.read' });
  assert.equal(allowed.name, 'ls');
  const denied = core.authorizeTool('ls', 'filesystem.read');
  assert.equal(denied, true);
});

test('deterministic commands without AI', async () => {
  const core = new NEXOUSCore();
  const result = await core.process('2 + 2');
  assert.ok(result.response.includes('4'));
  assert.equal(result.provider, null);
});

test('provider failure without identity loss', async () => {
  const core = new NEXOUSCore();
  core.registerProvider({ kind: 'gemini', enabled: true, isAvailable: () => true, generate: async () => { throw new Error('bad key'); } });
  const result = await core.process('Write a short poem about the night sky');
  assert.equal(result.identity.name, 'NEXA');
  assert.equal(result.response, 'I couldn\'t reach my AI service right now. I can still help with basic commands and information available locally.');
});

test('registry exposes statuses', () => {
  const registry = createProviderRegistry();
  const statuses = registry.getStatus();
  assert.ok(statuses.every((s: ProviderStatus) => s.kind));
});

test('ordinary greeting stays conversational', async () => {
  const core = new NEXOUSCore();
  const result = await core.process('hi');
  assert.equal(result.status, 'ok');
  assert.ok(result.response.toLowerCase().includes('hi') || result.response.toLowerCase().includes('nexous'));
  assert.equal(result.provider, null);
});

test('who are you uses the configured identity', async () => {
  const core = new NEXOUSCore();
  const result = await core.process('who are you');
  assert.ok(result.response.toLowerCase().includes('nexa'));
  assert.ok(!result.response.toLowerCase().includes('provider'));
});

test('who made you says Suraj Suthar', async () => {
  const core = new NEXOUSCore();
  const result = await core.process('who made you');
  assert.ok(result.response.toLowerCase().includes('suraj suthar'));
});

test('who am i checks authorized memory only', async () => {
  const core = new NEXOUSCore(createOwnerContext({ name: 'Suraj Suthar', allowedRoles: [OwnerAccessLevel.OWNER], authorized: true }));
  const result = await core.process('who am i');
  assert.ok(result.response.toLowerCase().includes('suraj suthar'));
});

test('math answers directly without provider status', async () => {
  const core = new NEXOUSCore();
  const result = await core.process('50+50');
  assert.ok(result.response.includes('100'));
  assert.equal(result.provider, null);
});

test('high risk commands require confirmation', async () => {
  const core = new NEXOUSCore();
  const result = await core.process('delete test file');
  assert.ok(result.response.toLowerCase().includes('confirm') || result.response.toLowerCase().includes('continue'));
  assert.equal(result.status, 'blocked');
});

test('provider status is only shown when explicitly requested', async () => {
  const core = new NEXOUSCore();
  const status = await core.process('provider status');
  assert.equal(status.response, 'NEXA diagnostics are available in developer mode.');
});

test('identity query does not call external provider', async () => {
  let calls = 0;
  const core = new NEXOUSCore();
  core.registerProvider({
    kind: 'gemini',
    enabled: true,
    isAvailable: () => true,
    generate: async () => {
      calls += 1;
      return 'provider answer';
    }
  });
  const result = await core.process('who am i');
  assert.equal(result.provider, null);
  assert.equal(calls, 0);
  assert.ok(result.response.includes('Suraj Suthar') || result.response.includes('current memory'));
});

test('normal chat does not include thought trace payloads', async () => {
  const core = new NEXOUSCore();
  const result = await core.process('hi');
  assert.ok(result.response.toLowerCase().includes('nexa'));
  assert.ok(!result.response.toLowerCase().includes('thought'));
  assert.ok(!result.response.toLowerCase().includes('latency'));
});

test('wake word detection supports NEXOUS variants', () => {
  const detector = new WakeWordDetector();
  assert.equal(detector.matches('NEXOUS'), true);
  assert.equal(detector.matches('Hey NEXOUS'), true);
  assert.equal(detector.matches('hello there'), false);
});

test('voice command normalization resolves common Hindi and Hinglish intents', () => {
  const normalizer = new VoiceCommandNormalizer();
  const chrome = normalizer.normalize('Chrome kholo');
  const openChrome = normalizer.normalize('Open Chrome');
  const hinglish = normalizer.normalize('Chrome open karo');

  assert.equal(chrome.intent, 'open_application');
  assert.equal(openChrome.intent, 'open_application');
  assert.equal(hinglish.intent, 'open_application');
  assert.equal(chrome.target, 'chrome');
});

test('intent router handles local control commands and stop', () => {
  const router = new VoiceIntentRouter();
  const stop = router.route('NEXOUS stop');
  const volume = router.route('Volume badhao');
  const status = router.route('System status batao');

  assert.equal(stop.intent, 'stop_current_operation');
  assert.equal(volume.intent, 'volume_up');
  assert.equal(status.intent, 'system_status');
});

test('voice commands keep security gate active for high-risk actions', async () => {
  const core = new NEXOUSCore();
  const result = await core.processVoiceCommand('NEXOUS Downloads ka test file delete kar do');
  assert.equal(result.status, 'blocked');
  assert.ok(result.response.toLowerCase().includes('confirm') || result.response.toLowerCase().includes('continue'));
});
