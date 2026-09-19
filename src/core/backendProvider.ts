import type { ProviderDefinition } from './nexousCore';

export interface WebSource {
  title: string;
  url: string;
  domain: string;
  description?: string;
  publishedAt?: string;
}

export interface BackendProvider extends ProviderDefinition {
  getLastSources(): WebSource[];
}

export function createBackendProvider(): BackendProvider {
  let lastSources: WebSource[] = [];
  return {
    kind: 'gemini',
    enabled: typeof window !== 'undefined',
    isAvailable: () => typeof window !== 'undefined',
    getLastSources: () => lastSources,
    generate: async request => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: request.input, history: request.history }),
        signal: request.signal
      });
      const data = await response.json() as { answer?: string; sources?: WebSource[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Nexa API request failed');
      lastSources = data.sources || [];
      return data.answer || 'I could not generate a response.';
    }
  };
}