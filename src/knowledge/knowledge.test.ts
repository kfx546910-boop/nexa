import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkDocument } from './chunker';
import { extractDocument } from './extractors';
import { LocalEmbeddingProvider, assertEmbeddingDimension } from './embeddings';
import { buildKnowledgeContext, citationsFor } from './context';

const bytes = (text: string) => new TextEncoder().encode(text);

test('extracts text, markdown, JSON, and CSV into normalized evidence', async () => {
  assert.equal((await extractDocument({ bytes: bytes('\ufeffhello\r\n\r\nworld'), filename: 'a.txt', mimeType: 'text/plain' })).text, 'hello\n\nworld');
  assert.match((await extractDocument({ bytes: bytes('{"project":{"name":"NEXA"}}'), filename: 'a.json', mimeType: 'application/json' })).text, /project\.name: NEXA/);
  assert.match((await extractDocument({ bytes: bytes('name,score\nNEXA,10'), filename: 'a.csv', mimeType: 'text/csv' })).text, /name = NEXA/);
});

test('rejects invalid structured documents safely', async () => {
  await assert.rejects(() => extractDocument({ bytes: bytes('{invalid'), filename: 'a.json', mimeType: 'application/json' }));
  await assert.rejects(() => extractDocument({ bytes: bytes('x'), filename: 'a.exe', mimeType: 'application/octet-stream' }));
});

test('chunking is deterministic and preserves overlap bounds', async () => {
  const document = { text: 'A'.repeat(3000), pages: [], sections: [], metadata: { sourceType: 'text' } };
  const first = await chunkDocument(document, { chunkSize: 1000, chunkOverlap: 100, maxChunks: 10 });
  const second = await chunkDocument(document, { chunkSize: 1000, chunkOverlap: 100, maxChunks: 10 });
  assert.deepEqual(first, second);
  assert.ok(first.length > 1);
  assert.ok(first[1].startOffset < first[0].endOffset);
});

test('embedding dimension is validated and citations are application-owned', async () => {
  const provider = new LocalEmbeddingProvider();
  const vector = await provider.embedText('database architecture');
  assert.equal(vector.length, 64);
  assertEmbeddingDimension(vector);
  const results = [{ id: 'chunk-a', fileId: 'file-a', fileName: 'notes.md', projectId: 'project-a', userId: 'user-a', chunkIndex: 0, text: 'evidence', contentHash: 'hash', startOffset: 0, endOffset: 8, pageNumber: 2, metadata: {} }];
  assert.deepEqual(citationsFor(results)[0], { sourceId: 'source-1', fileId: 'file-a', fileName: 'notes.md', chunkId: 'chunk-a', pageNumber: 2, section: undefined });
  assert.match(buildKnowledgeContext(results).context, /untrusted project data/);
});
