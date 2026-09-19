const PROVIDER_NAMES = /\b(?:gemini|openai|openrouter|claude|anthropic|gpt(?:-\d+(?:\.\d+)?)?)\b/gi;
const DIAGNOSTIC_PATTERNS = [
  /\b(?:thought trace|capability audit|provider status|model|temperature|tokens?\/sec|reasoning pipeline|attention weights|neural weights|internal reasoning|system telemetry)\b[^\n]*/gi,
  /\b(?:according to my|my) internal reasoning\b[^\n]*/gi
];
const UNSAFE_INSTRUCTION_PATTERN = /(?:ignore (?:all|any) previous instructions|reveal (?:your|the) system prompt|show me your api key)/i;

export interface ResponseProcessingOptions {
  diagnostics?: boolean;
}

export class NexaResponseProcessor {
  process(raw: string, options: ResponseProcessingOptions = {}): string {
    if (options.diagnostics) return raw.trim();

    let response = raw.trim();
    for (const pattern of DIAGNOSTIC_PATTERNS) response = response.replace(pattern, '');
    response = response.replace(PROVIDER_NAMES, 'AI service');
    response = response.replace(/\n{3,}/g, '\n\n').trim();

    if (!response || UNSAFE_INSTRUCTION_PATTERN.test(response)) {
      return 'Sorry, I couldn\'t complete that right now.';
    }
    return response;
  }

  providerUnavailable(): string {
    return 'I couldn\'t reach my AI service right now. I can still help with basic commands and information available locally.';
  }
}
