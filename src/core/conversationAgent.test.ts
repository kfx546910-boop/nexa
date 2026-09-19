import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeConversation, buildAgentContext } from './conversationAgent';

test('normalizes common Hinglish coding requests', () => {
  const analysis = analyzeConversation('bhai ye code thik kr');
  assert.equal(analysis.normalizedInput, 'bhai ye code fix');
  assert.ok(analysis.intents.includes('coding'));
  assert.ok(analysis.intents.includes('debugging'));
  assert.equal(analysis.mode, 'developer');
});

test('resolves short follow-up references from recent history', () => {
  const history = [{ role: 'user' as const, content: 'Create a dark login page.' }];
  const analysis = analyzeConversation('haan wahi wala', history);
  assert.match(analysis.resolvedInput, /Create a dark login page/);
  assert.ok(analysis.intents.includes('clarification'));
});

test('builds bounded context for provider requests', () => {
  const history = [
    { role: 'user' as const, content: 'Build a dashboard.' },
    { role: 'assistant' as const, content: 'I can do that.' }
  ];
  const analysis = analyzeConversation('make it responsive', history);
  const context = buildAgentContext(analysis, history);
  assert.match(context, /Recent conversation/);
  assert.match(context, /dashboard/);
});