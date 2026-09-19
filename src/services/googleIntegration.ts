import { googleToolsRegistry } from '../google/googleToolsRegistry';

export interface GoogleIntegrationSummary {
  connected: boolean;
  googleConnectionText: string;
  account: { connected: boolean; name?: string; email?: string };
  services: {
    gemini: { status: 'connected' | 'not-connected' };
  };
}

export function resolveGoogleConnectionStatus(env: Record<string, string | undefined>): GoogleIntegrationSummary {
  const connected = Boolean(env.VITE_GOOGLE_CLIENT_ID && env.VITE_GOOGLE_API_KEY);
  const accountConnected = Boolean(env.VITE_GOOGLE_ACCOUNT_NAME || env.VITE_GOOGLE_ACCOUNT_EMAIL);
  return {
    connected,
    googleConnectionText: `GOOGLE CONNECTION\n● ${connected ? 'CONNECTED' : 'NOT CONNECTED'}`,
    account: {
      connected: accountConnected,
      name: env.VITE_GOOGLE_ACCOUNT_NAME,
      email: env.VITE_GOOGLE_ACCOUNT_EMAIL
    },
    services: {
      gemini: { status: connected ? 'connected' : 'not-connected' }
    }
  };
}

export function routeGoogleIntent(input: string): 'google.drive' | 'google.calendar' | 'google.gemini' | 'unknown' {
  const lower = input.toLowerCase();
  if (/(drive|files|file)/i.test(lower)) return 'google.drive';
  if (/(calendar|meeting|schedule|meeting add)/i.test(lower)) return 'google.calendar';
  if (/(gemini|analyze)/i.test(lower)) return 'google.gemini';
  return 'unknown';
}

export const GOOGLE_TOOLS = [
  { name: 'google.auth' },
  { name: 'google.gemini' },
  { name: 'google.drive' },
  { name: 'google.calendar' },
  { name: 'google.gmail' },
  { name: 'google.contacts' },
  { name: 'google.youtube' },
  { name: 'google.docs' },
  { name: 'google.sheets' }
].map(({ name }) => ({
  name,
  tool: googleToolsRegistry.getTool(name.replace('google.', 'google.'))
}));