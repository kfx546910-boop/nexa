export interface TokenInfo {
  id: number;
  text: string;
  isSpecial?: boolean;
}

export interface TrainingPair {
  id: string;
  prompt: string;
  response: string;
  category: 'core' | 'coding' | 'reasoning' | 'chat' | 'productivity' | 'custom';
  intent: string;
  weight?: number;
  tags?: string[];
  createdAt: number;
}

export interface GenerationConfig {
  temperature: number; // 0.1 - 2.0
  topK: number;        // 1 - 50
  topP: number;        // 0.1 - 1.0
  repetitionPenalty: number; // 1.0 - 2.0
  maxTokens: number;   // 10 - 500
  systemPrompt: string;
  showThoughts: boolean;
  streamSpeedMs: number; // 10ms - 80ms
}

export interface ThoughtStep {
  stage: 'intent' | 'retrieval' | 'reasoning' | 'sampling' | 'complete';
  title: string;
  detail: string;
  confidence?: number;
  data?: Record<string, any>;
}

export interface TokenProbability {
  token: string;
  tokenId: number;
  probability: number;
  logit: number;
}

export interface GenerationMetrics {
  totalTokens: number;
  latencyMs: number;
  tokensPerSec: number;
  matchedIntent?: string;
  matchedMemory?: string[];
  confidence: number;
  attentionHighlights?: { token: string; weight: number }[];
  topCandidateSnapshots?: TokenProbability[];
}

export interface FileAttachment {
  name: string;
  size: number;
  type: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thoughts?: string;
  timestamp: number;
  metrics?: GenerationMetrics;
  thoughtSteps?: ThoughtStep[];
  attachments?: FileAttachment[];
  variants?: string[]; // Multiple alternative generated responses for branching (< 1/2 >)
  activeVariantIndex?: number;
  feedback?: 'like' | 'dislike' | null;
}

export type ModelMode = 'nexus-4o' | 'nexus-coder' | 'nexus-reasoning' | 'nexus-creative';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  modelMode: ModelMode;
  isPinned?: boolean;
}

export interface ModelWeights {
  vocabSize: number;
  embeddingDim: number;
  hiddenDim: number;
  embeddings: number[][]; // [vocabSize, embeddingDim]
  intentWeights: number[][]; // [intentCount, embeddingDim]
  attentionWq: number[][]; // [embeddingDim, embeddingDim]
  attentionWk: number[][]; // [embeddingDim, embeddingDim]
  attentionWv: number[][]; // [embeddingDim, embeddingDim]
  denseW1: number[][]; // [embeddingDim, hiddenDim]
  denseW2: number[][]; // [hiddenDim, embeddingDim]
  ngramWeights: Record<string, Record<string, number>>; // Markov / N-gram conditional transitions
  intentCorpus: Record<string, string[]>;
  patternRules: { pattern: string; responseTemplate: string; tags: string[] }[];
}

export interface ModelCheckpoint {
  id: string;
  name: string;
  version: string;
  description: string;
  trainedEpochs: number;
  finalLoss: number;
  perplexity: number;
  datasetCount: number;
  parametersCount: number;
  updatedAt: number;
  weights: ModelWeights;
}

export interface TrainingLogEntry {
  epoch: number;
  step: number;
  loss: number;
  learningRate: number;
  perplexity: number;
  batchSize: number;
  tokensPerSec?: number;
  tokensProcessed?: number;
  timestamp: number;
}

export interface TrainingProgress {
  isTraining: boolean;
  currentEpoch: number;
  totalEpochs: number;
  currentStep: number;
  totalSteps: number;
  currentLoss: number;
  bestLoss: number;
  perplexity: number;
  tokensPerSec?: number;
  tokensProcessed?: number;
  logs: TrainingLogEntry[];
  etaSeconds: number;
}

export interface KnowledgeMemoryItem {
  id: string;
  title: string;
  content: string;
  category: string;
  vector: number[];
  tags: string[];
  createdAt: number;
}

export interface BenchmarkResult {
  id: string;
  date: number;
  deviceName: string;
  inferenceLatencyMs: number;
  tokensPerSec: number;
  trainingSpeedStepPerSec: number;
  memoryEstimateMB: number;
  accuracyScore: number;
}
