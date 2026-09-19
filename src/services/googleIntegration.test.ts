import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveGoogleConnectionStatus,
  routeGoogleIntent,
  GOOGLE_TOOLS
} from './googleIntegration';

test('google status reports not connected when env is absent', () => {
  const status = resolveGoogleConnectionStatus({});
  assert.equal(status.connected, false);
  assert.equal(status.googleConnectionText, 'GOOGLE CONNECTION\n● NOT CONNECTED');
  assert.equal(status.services.gemini.status, 'not-connected');
});

test('google status reports connected when oauth and gemini credentials exist', () => {
  const status = resolveGoogleConnectionStatus({
    VITE_GOOGLE_CLIENT_ID: 'client-id.example',
    VITE_GOOGLE_API_KEY: 'gemini-api-key-example',
    VITE_GOOGLE_ACCOUNT_NAME: 'NEXA User',
    VITE_GOOGLE_ACCOUNT_EMAIL: 'user@example.com'
  });

  assert.equal(status.connected, true);
  assert.equal(status.account.connected, true);
  assert.equal(status.services.gemini.status, 'connected');
  assert.equal(status.account.email, 'user@example.com');
});

test('google intent routing maps drive and calendar requests correctly', () => {
  assert.equal(routeGoogleIntent('Drive me meri files dikhao'), 'google.drive');
  assert.equal(routeGoogleIntent('Kal 5 baje meeting add karo'), 'google.calendar');
  assert.equal(routeGoogleIntent('Gemini se isko analyze karo'), 'google.gemini');
});

test('google tool registry includes the required service entries', () => {
  const names = GOOGLE_TOOLS.map(tool => tool.name);
  assert.ok(names.includes('google.auth'));
  assert.ok(names.includes('google.gemini'));
  assert.ok(names.includes('google.drive'));
  assert.ok(names.includes('google.calendar'));
  assert.ok(names.includes('google.gmail'));
  assert.ok(names.includes('google.contacts'));
  assert.ok(names.includes('google.youtube'));
  assert.ok(names.includes('google.docs'));
  assert.ok(names.includes('google.sheets'));
});
