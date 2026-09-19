export interface KnowledgeConfig {
  chunkSize: number;
  chunkOverlap: number;
  maxTextLength: number;
  maxChunks: number;
  embeddingDimension: number;
  embeddingModel: string;
  topK: number;
  similarityThreshold: number;
  maxContextChars: number;
  maxEmbeddingBatch: number;
  processingTimeoutMs: number;
}

export const KNOWLEDGE_CONFIG: KnowledgeConfig = {
  chunkSize: 1200,
  chunkOverlap: 160,
  maxTextLength: 5_000_000,
  maxChunks: 10_000,
  embeddingDimension: 64,
  embeddingModel: 'nexa-local-hash-v1',
  topK: 6,
  similarityThreshold: 0.22,
  maxContextChars: 12_000,
  maxEmbeddingBatch: 32,
  processingTimeoutMs: 120_000
} as const;
