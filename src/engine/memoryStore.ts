import { KnowledgeMemoryItem } from '../types/nexus';
import { defaultTokenizer } from './tokenizer';

export class NexusMemoryStore {
  private items: KnowledgeMemoryItem[] = [];
  private readonly STORAGE_KEY = 'nexus_memory_store_v1';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.items = JSON.parse(saved);
      } else {
        // Seed default foundational memory items
        this.items = [
          {
            id: 'mem-core-spec',
            title: 'Nexus Autonomous Neural Architecture',
            content: 'Nexus AI operates as a self-contained on-device inference and training engine. It uses local tokenization, semantic vector routing, and transformer-inspired attention projections without external API requests.',
            category: 'System',
            vector: this.computeVector('Nexus AI operates as a self-contained on-device inference and training engine.'),
            tags: ['architecture', 'offline', 'privacy'],
            createdAt: Date.now() - 86400000
          },
          {
            id: 'mem-user-pref',
            title: 'Privacy Manifesto & Protocol',
            content: 'Zero network telemetry policy: all user prompts, custom weights, fine-tuning loss curves, and memory vectors stay inside local browser storage.',
            category: 'Privacy',
            vector: this.computeVector('Zero network telemetry policy: all user prompts, custom weights, fine-tuning loss curves stay inside local storage.'),
            tags: ['privacy', 'security', 'zero_telemetry'],
            createdAt: Date.now() - 43200000
          }
        ];
        this.saveToStorage();
      }
    } catch (e) {
      console.warn('MemoryStore load failed:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.warn('MemoryStore save failed:', e);
    }
  }

  public computeVector(text: string, dim: number = 32): number[] {
    const tokens = defaultTokenizer.tokenize(text.toLowerCase());
    const vec = new Array(dim).fill(0);
    if (tokens.length === 0) return vec;

    // Hash tokens into vector space with term frequency
    for (const t of tokens) {
      const hash = Math.abs(this.hashCode(t.text)) % dim;
      vec[hash] += 1.0;
    }

    // Normalize (L2 norm)
    let sumSq = 0;
    for (let i = 0; i < dim; i++) {
      sumSq += vec[i] * vec[i];
    }
    const norm = Math.sqrt(sumSq);
    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vec[i] /= norm;
      }
    }

    return vec;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash;
  }

  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  public search(query: string, topK: number = 3, threshold: number = 0.25): { item: KnowledgeMemoryItem; score: number }[] {
    const queryVec = this.computeVector(query);
    const results: { item: KnowledgeMemoryItem; score: number }[] = [];

    for (const item of this.items) {
      const score = this.cosineSimilarity(queryVec, item.vector);
      if (score >= threshold) {
        results.push({ item, score });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  public addItem(title: string, content: string, category: string = 'General', tags: string[] = []): KnowledgeMemoryItem {
    const newItem: KnowledgeMemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title,
      content,
      category,
      vector: this.computeVector(content),
      tags,
      createdAt: Date.now()
    };

    this.items.unshift(newItem);
    this.saveToStorage();
    return newItem;
  }

  public deleteItem(id: string): boolean {
    const prevLen = this.items.length;
    this.items = this.items.filter(i => i.id !== id);
    if (this.items.length !== prevLen) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public getAll(): KnowledgeMemoryItem[] {
    return [...this.items];
  }

  public clear(): void {
    this.items = [];
    this.saveToStorage();
  }
}

export const defaultMemoryStore = new NexusMemoryStore();
