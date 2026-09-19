import { KNOWLEDGE_CONFIG, type KnowledgeConfig } from './config';
import type { DocumentChunk, ExtractedDocument } from './types';

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function chunkDocument(document: ExtractedDocument, overrides: Partial<KnowledgeConfig> = {}): Promise<DocumentChunk[]> {
  const config = { ...KNOWLEDGE_CONFIG, ...overrides };
  if (!document.text.trim()) return [];
  const chunks: DocumentChunk[] = [];
  let start = 0;
  let index = 0;
  while (start < document.text.length && index < config.maxChunks) {
    const targetEnd = Math.min(document.text.length, start + config.chunkSize);
    let end = targetEnd;
    if (targetEnd < document.text.length) {
      const boundary = Math.max(start + Math.floor(config.chunkSize * 0.55), document.text.lastIndexOf('\n\n', targetEnd));
      if (boundary > start) end = boundary;
    }
    const text = document.text.slice(start, end).trim();
    if (text) {
      const page = document.pages.find(candidate => {
        const pageStart = document.text.indexOf(candidate.text);
        return pageStart >= 0 && pageStart < end && pageStart + candidate.text.length > start;
      });
      const section = document.sections.find(candidate => {
        const sectionStart = document.text.indexOf(candidate.text);
        return sectionStart >= 0 && sectionStart < end && sectionStart + candidate.text.length > start;
      });
      chunks.push({ chunkIndex: index, text, contentHash: await sha256(text), pageNumber: page?.pageNumber, section: section?.heading, startOffset: start, endOffset: end });
      index += 1;
    }
    if (end >= document.text.length) break;
    start = Math.max(start + 1, end - config.chunkOverlap);
  }
  return chunks;
}
