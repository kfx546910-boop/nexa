import type { SupabaseClient } from '@supabase/supabase-js';
import { buildKnowledgeContext } from './context';
import { LocalEmbeddingProvider, type EmbeddingProvider } from './embeddings';
import { KNOWLEDGE_CONFIG } from './config';
import { KnowledgeRepository } from './repository';
import type { Citation, KnowledgeRetrievalRequest, RetrievalResult } from './types';

export interface ProjectKnowledgeResponse {
  results: RetrievalResult[];
  context: string;
  citations: Citation[];
}

export async function retrieveProjectKnowledge(
  client: SupabaseClient,
  request: KnowledgeRetrievalRequest,
  embeddingProvider: EmbeddingProvider = new LocalEmbeddingProvider()
): Promise<ProjectKnowledgeResponse> {
  const query = request.query.trim();
  if (!query) return { results: [], context: '', citations: [] };
  const repository = new KnowledgeRepository(client);
  const results = await repository.searchProject(
    request.projectId,
    query,
    embeddingProvider,
    request.topK ?? KNOWLEDGE_CONFIG.topK,
    request.similarityThreshold ?? KNOWLEDGE_CONFIG.similarityThreshold
  );
  const built = buildKnowledgeContext(results);
  return { results, ...built };
}