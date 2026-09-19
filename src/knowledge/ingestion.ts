import type { SupabaseClient } from '@supabase/supabase-js';
import { KNOWLEDGE_CONFIG } from './config';
import { chunkDocument } from './chunker';
import { extractDocument } from './extractors';
import { assertEmbeddingDimension, LocalEmbeddingProvider, type EmbeddingProvider } from './embeddings';
import { KnowledgeRepository } from './repository';

export interface IngestionResult {
  fileId: string;
  chunkCount: number;
  textLength: number;
  status: 'ready' | 'failed';
  error?: string;
}

export async function ingestProjectFile(client: SupabaseClient, fileId: string, embeddingProvider: EmbeddingProvider = new LocalEmbeddingProvider()): Promise<IngestionResult> {
  const repository = new KnowledgeRepository(client);
  const file = await repository.getAuthorizedFile(fileId);
  if (file.processing_status === 'processing') {
    return { fileId, chunkCount: file.chunk_count || 0, textLength: file.text_length || 0, status: 'failed', error: 'Document processing is already in progress.' };
  }
  await repository.markProcessing(fileId, 'processing', { processing_error: null, embedding_status: 'processing' });
  try {
    const bytes = await Promise.race([
      repository.downloadAuthorizedFile(fileId).then(result => result.bytes),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Document processing timed out.')), KNOWLEDGE_CONFIG.processingTimeoutMs))
    ]);
    const document = await Promise.race([
      extractDocument({ bytes, filename: file.original_name, mimeType: file.mime_type }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Document processing timed out.')), KNOWLEDGE_CONFIG.processingTimeoutMs))
    ]);
    if (!document.text || document.text.length > KNOWLEDGE_CONFIG.maxTextLength) throw new Error('Document has no usable text or exceeds the processing limit.');
    const chunks = await chunkDocument(document);
    if (!chunks.length) throw new Error('Document has no usable text.');
    const embeddings = await embeddingProvider.embedBatch(chunks.map(chunk => chunk.text));
    if (embeddings.length !== chunks.length) throw new Error('Embedding provider returned an incomplete batch.');
    embeddings.forEach(vector => assertEmbeddingDimension(vector));
    await repository.replaceChunks(file, chunks.map((chunk, index) => ({ ...chunk, embedding: embeddings[index] })));
    await repository.markProcessing(fileId, 'ready', { processed_at: new Date().toISOString(), processing_version: 'phase4-v1', text_length: document.text.length, chunk_count: chunks.length, embedding_status: 'ready', processing_error: null });
    return { fileId, chunkCount: chunks.length, textLength: document.text.length, status: 'ready' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Document processing failed.';
    await repository.markProcessing(fileId, 'failed', { processing_error: message, embedding_status: 'failed' });
    return { fileId, chunkCount: 0, textLength: 0, status: 'failed', error: message };
  }
}
