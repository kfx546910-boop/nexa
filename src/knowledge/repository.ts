import type { SupabaseClient, User } from '@supabase/supabase-js';
import { KNOWLEDGE_CONFIG } from './config';
import type { ProjectFile } from '../workspace/types';
import type { RetrievalResult } from './types';
import type { EmbeddingProvider } from './embeddings';

export class KnowledgeRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async user(): Promise<User> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw new Error('Authentication is required.');
    return data.user;
  }

  async getAuthorizedFile(fileId: string): Promise<ProjectFile> {
    const user = await this.user();
    const { data, error } = await this.client.from('project_files').select('*').eq('id', fileId).eq('user_id', user.id).neq('status', 'deleted').single();
    if (error || !data) throw new Error('File was not found.');
    return data as ProjectFile;
  }

  async downloadAuthorizedFile(fileId: string): Promise<{ file: ProjectFile; bytes: Uint8Array }> {
    const file = await this.getAuthorizedFile(fileId);
    const { data, error } = await this.client.storage.from('nexa-user-files').download(file.storage_path);
    if (error || !data) throw new Error('Unable to read the private file.');
    return { file, bytes: new Uint8Array(await data.arrayBuffer()) };
  }

  async markProcessing(fileId: string, status: 'processing' | 'ready' | 'failed', patch: Record<string, unknown> = {}): Promise<void> {
    const user = await this.user();
    const { error } = await this.client.from('project_files').update({ processing_status: status, ...patch }).eq('id', fileId).eq('user_id', user.id);
    if (error) throw new Error('Unable to update document processing state.');
  }

  async replaceChunks(file: ProjectFile, chunks: Array<{ chunkIndex: number; text: string; contentHash: string; embedding: number[]; pageNumber?: number; section?: string; startOffset: number; endOffset: number }>): Promise<void> {
    const user = await this.user();
    const { error: deleteError } = await this.client.from('document_chunks').delete().eq('file_id', file.id).eq('user_id', user.id);
    if (deleteError) throw new Error('Unable to replace document chunks.');
    if (!chunks.length) return;
    const { error } = await this.client.from('document_chunks').insert(chunks.map(chunk => ({
      user_id: user.id,
      project_id: file.project_id,
      file_id: file.id,
      chunk_index: chunk.chunkIndex,
      content: chunk.text,
      content_hash: chunk.contentHash,
      embedding: chunk.embedding,
      metadata: { pageNumber: chunk.pageNumber, section: chunk.section, startOffset: chunk.startOffset, endOffset: chunk.endOffset },
      processing_version: 'phase4-v1'
    })));
    if (error) throw new Error('Unable to store document chunks.');
  }

  async searchProject(projectId: string, query: string, provider: EmbeddingProvider, topK = KNOWLEDGE_CONFIG.topK, threshold = KNOWLEDGE_CONFIG.similarityThreshold): Promise<RetrievalResult[]> {
    const user = await this.user();
    const { data: project, error: projectError } = await this.client.from('projects').select('id').eq('id', projectId).eq('user_id', user.id).neq('status', 'deleted').single();
    if (projectError || !project) throw new Error('Project was not found.');
    const embedding = await provider.embedText(query);
    const { data, error } = await this.client.rpc('match_project_documents', { query_embedding: embedding, requested_project_id: projectId, match_count: Math.min(Math.max(topK, 1), 20), similarity_threshold: threshold });
    if (error) throw new Error('Unable to retrieve project knowledge.');
    return (data || []).map(row => {
      const metadata = (row.metadata || {}) as Record<string, unknown>;
      return {
        id: row.id,
        userId: row.user_id,
        projectId: row.project_id,
        fileId: row.file_id,
        fileName: row.file_name,
        chunkIndex: row.chunk_index,
        text: row.content,
        contentHash: row.content_hash,
        startOffset: Number(metadata.startOffset || 0),
        endOffset: Number(metadata.endOffset || 0),
        pageNumber: typeof metadata.pageNumber === 'number' ? metadata.pageNumber : undefined,
        section: typeof metadata.section === 'string' ? metadata.section : undefined,
        score: row.score,
        metadata
      } satisfies RetrievalResult;
    });
  }
}
