export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedSection {
  heading?: string;
  text: string;
  pageNumber?: number;
}

export interface ExtractedDocument {
  text: string;
  pages: ExtractedPage[];
  sections: ExtractedSection[];
  metadata: {
    title?: string;
    author?: string;
    createdAt?: string;
    sourceType: string;
  };
}

export interface DocumentChunk {
  chunkIndex: number;
  text: string;
  contentHash: string;
  pageNumber?: number;
  section?: string;
  startOffset: number;
  endOffset: number;
}

export interface StoredDocumentChunk extends DocumentChunk {
  id: string;
  userId: string;
  projectId: string;
  fileId: string;
  fileName: string;
  score?: number;
}

export interface Citation {
  sourceId: string;
  fileId: string;
  fileName: string;
  chunkId: string;
  pageNumber?: number;
  section?: string;
}

export interface RetrievalResult extends StoredDocumentChunk {
  metadata: Record<string, unknown>;
}

export interface KnowledgeRetrievalRequest {
  projectId: string;
  query: string;
  topK?: number;
  similarityThreshold?: number;
}
