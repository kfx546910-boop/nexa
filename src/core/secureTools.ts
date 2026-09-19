import type { SupabaseClient } from '@supabase/supabase-js';
import { retrieveProjectKnowledge } from '../knowledge/retrieval';
import type { EmbeddingProvider } from '../knowledge/embeddings';
import type { ToolDefinition } from './toolCore';

export function createKnowledgeSearchTool(client: SupabaseClient, embeddingProvider?: EmbeddingProvider): ToolDefinition<{ query: string }, Awaited<ReturnType<typeof retrieveProjectKnowledge>>> {
  return {
    id: 'knowledge.search',
    name: 'Project knowledge search',
    description: 'Search authorized project documents and return evidence with application-owned citations.',
    category: 'knowledge',
    sensitivity: 'PRIVATE',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: { query: { type: 'string', minLength: 1 } },
      additionalProperties: false
    },
    availability: () => Boolean(client),
    execute: async (context, input) => {
      if (!context.projectId) throw new Error('Project context is required.');
      const { data, error } = await client.auth.getUser();
      if (error || !data.user || data.user.id !== context.userId) throw new Error('Authenticated user context could not be verified.');
      return retrieveProjectKnowledge(client, { projectId: context.projectId, query: input.query }, embeddingProvider);
    }
  };
}