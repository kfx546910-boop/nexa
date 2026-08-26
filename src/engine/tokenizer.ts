import { TokenInfo } from '../types/nexus';

export class NexusTokenizer {
  private vocab: Map<string, number> = new Map();
  private invVocab: Map<number, string> = new Map();
  private specialTokens = ['<PAD>', '<UNK>', '<BOS>', '<EOS>', '<THINK_START>', '<THINK_END>', '<CODE_START>', '<CODE_END>'];

  constructor() {
    this.initDefaultVocab();
  }

  private initDefaultVocab() {
    this.vocab.clear();
    this.invVocab.clear();

    // 1. Add Special Tokens
    this.specialTokens.forEach((token, index) => {
      this.vocab.set(token, index);
      this.invVocab.set(index, token);
    });

    // 2. Base ASCII & Punctuation
    const basePunctuation = [
      ' ', '.', ',', '!', '?', ':', ';', '-', '_', '/', '\\', '(', ')', '[', ']', '{', '}',
      '<', '>', '=', '+', '*', '&', '|', '^', '%', '$', '#', '@', '~', '`', '"', "'", '\n', '\t'
    ];
    basePunctuation.forEach(p => {
      if (!this.vocab.has(p)) {
        const id = this.vocab.size;
        this.vocab.set(p, id);
        this.invVocab.set(id, p);
      }
    });

    // 3. Core Common Words & Technical / Conversational Vocab
    const commonVocabulary = [
      // Core Pronouns & Connectors
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there',
      'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no',
      'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
      'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
      'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'nexus', 'ai', 'model', 'local',
      'neural', 'train', 'token', 'private', 'code', 'function', 'const', 'let', 'var', 'return', 'import', 'export', 'class', 'type',
      'interface', 'async', 'await', 'promise', 'react', 'state', 'hook', 'component', 'props', 'div', 'button', 'input', 'string',
      'number', 'boolean', 'array', 'object', 'null', 'undefined', 'true', 'false', 'python', 'def', 'self', 'print', 'javascript',
      'typescript', 'database', 'vector', 'embedding', 'loss', 'epoch', 'learning', 'rate', 'weights', 'gradient', 'layer', 'attention',
      'transformer', 'reasoning', 'intent', 'privacy', 'device', 'offline', 'speed', 'memory', 'context', 'answer', 'question', 'hello',
      'hi', 'hey', 'help', 'explain', 'create', 'write', 'build', 'debug', 'solve', 'calculate', 'summary', 'guide', 'steps', 'example'
    ];

    commonVocabulary.forEach(word => {
      const lower = word.toLowerCase();
      if (!this.vocab.has(lower)) {
        const id = this.vocab.size;
        this.vocab.set(lower, id);
        this.invVocab.set(id, lower);
      }
    });
  }

  public registerWord(word: string): number {
    const clean = word.toLowerCase();
    if (this.vocab.has(clean)) {
      return this.vocab.get(clean)!;
    }
    const newId = this.vocab.size;
    this.vocab.set(clean, newId);
    this.invVocab.set(newId, clean);
    return newId;
  }

  public tokenize(text: string): TokenInfo[] {
    if (!text) return [];
    
    // Pattern to match words, numbers, punctuation, spaces, or newlines
    const regex = /<[^>]+>|[\w']+|[^\w\s]|\s+/g;
    const matches = text.match(regex) || [];
    const tokens: TokenInfo[] = [];

    for (const match of matches) {
      const lower = match.toLowerCase();
      let id: number;

      if (this.vocab.has(match)) {
        id = this.vocab.get(match)!;
      } else if (this.vocab.has(lower)) {
        id = this.vocab.get(lower)!;
      } else {
        // Dynamic subword / character-level fallback or register on the fly
        id = this.registerWord(lower);
      }

      tokens.push({
        id,
        text: match,
        isSpecial: match.startsWith('<') && match.endsWith('>')
      });
    }

    return tokens;
  }

  public encode(text: string): number[] {
    return this.tokenize(text).map(t => t.id);
  }

  public decode(tokenIds: number[]): string {
    return tokenIds
      .map(id => this.invVocab.get(id) || '<UNK>')
      .join('');
  }

  public getVocabSize(): number {
    return this.vocab.size;
  }

  public getVocabularyList(): { id: number; token: string }[] {
    const list: { id: number; token: string }[] = [];
    this.invVocab.forEach((token, id) => {
      list.push({ id, token });
    });
    return list.sort((a, b) => a.id - b.id);
  }

  public getTokenText(id: number): string {
    return this.invVocab.get(id) || '<UNK>';
  }
}

export const defaultTokenizer = new NexusTokenizer();
