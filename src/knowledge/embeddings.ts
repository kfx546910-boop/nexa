import { KNOWLEDGE_CONFIG } from './config';

export interface EmbeddingProvider {
  readonly model: string;
  readonly dimension: number;
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (const char of token) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly model = KNOWLEDGE_CONFIG.embeddingModel;
  readonly dimension = KNOWLEDGE_CONFIG.embeddingDimension;

  async embedText(text: string): Promise<number[]> {
    const vector = new Array(this.dimension).fill(0);
    for (const token of text.toLowerCase().match(/[a-z0-9]+/g) || []) {
      const hash = hashToken(token);
      vector[hash % this.dimension] += 1;
      vector[(hash >>> 8) % this.dimension] += 0.5;
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return norm ? vector.map(value => value / norm) : vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const output: number[][] = [];
    for (let index = 0; index < texts.length; index += KNOWLEDGE_CONFIG.maxEmbeddingBatch) {
      const batch = texts.slice(index, index + KNOWLEDGE_CONFIG.maxEmbeddingBatch);
      output.push(...await Promise.all(batch.map(text => this.embedText(text))));
    }
    return output;
  }
}

export function assertEmbeddingDimension(vector: number[], expected = KNOWLEDGE_CONFIG.embeddingDimension): void {
  if (vector.length !== expected) throw new Error(`Embedding dimension mismatch: expected ${expected}, received ${vector.length}.`);
  if (vector.some(value => !Number.isFinite(value))) throw new Error('Embedding contains an invalid number.');
}
