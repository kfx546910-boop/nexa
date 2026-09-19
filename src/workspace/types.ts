export type ProjectStatus = 'active' | 'archived' | 'deleted';
export type ProjectFileStatus = 'pending' | 'ready' | 'deleted' | 'failed';
export type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type EmbeddingStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  user_id: string;
  project_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: ProjectFileStatus;
  checksum: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  processing_status?: ProcessingStatus;
  processing_error?: string | null;
  processed_at?: string | null;
  processing_version?: string | null;
  text_length?: number | null;
  chunk_count?: number;
  embedding_status?: EmbeddingStatus;
}

export interface ProjectMemory {
  id: string;
  user_id: string;
  project_id: string | null;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
