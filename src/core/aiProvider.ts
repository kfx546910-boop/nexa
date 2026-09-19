export type AIProviderKind = 'openai' | 'gemini' | 'claude' | 'openrouter' | 'local';

export interface AIProviderRequest {
  input: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  signal?: AbortSignal;
}

export interface AIProvider {
  kind: AIProviderKind;
  enabled: boolean;
  isAvailable(): boolean;
  generate(request: AIProviderRequest): Promise<string>;
  stream?(request: AIProviderRequest, onChunk: (chunk: string) => void): Promise<void>;
}
