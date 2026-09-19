import type { ExtractedDocument, ExtractedPage, ExtractedSection } from './types';

export interface DocumentExtractor {
  supports(mimeType: string, filename: string): boolean;
  extract(input: { bytes: Uint8Array; filename: string; mimeType: string }): Promise<ExtractedDocument>;
}

function normalizeText(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map(line => line.trimEnd()).join('\n')
    .trim();
}

function makeDocument(text: string, sourceType: string, pages: ExtractedPage[] = [], sections: ExtractedSection[] = []): ExtractedDocument {
  const normalized = normalizeText(text);
  return { text: normalized, pages, sections, metadata: { sourceType } };
}

function flattenJson(value: unknown, path = ''): string[] {
  if (value === null || typeof value !== 'object') return [`${path || 'value'}: ${String(value)}`];
  if (Array.isArray(value)) return value.flatMap((item, index) => flattenJson(item, `${path}[${index}]`));
  return Object.entries(value).flatMap(([key, child]) => flattenJson(child, path ? `${path}.${key}` : key));
}

function parseCsv(text: string): string {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { row.push(cell); cell = ''; continue; }
    if (char === '\n' && !quoted) { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return '';
  const headers = rows[0].map((header, index) => header.trim() || `Column ${index + 1}`);
  return rows.slice(1).map((values, rowIndex) => `Row ${rowIndex + 1}:\n${headers.map((header, index) => `${header} = ${(values[index] || '').trim()}`).join('\n')}`).join('\n\n');
}

const textExtractor: DocumentExtractor = {
  supports: (mime, filename) => /^(text\/plain|text\/markdown)$/.test(mime) || /\.(txt|md)$/i.test(filename),
  async extract({ bytes }) { return makeDocument(new TextDecoder().decode(bytes), 'text'); }
};

const jsonExtractor: DocumentExtractor = {
  supports: (mime, filename) => mime === 'application/json' || /\.json$/i.test(filename),
  async extract({ bytes }) {
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return makeDocument(flattenJson(parsed).join('\n'), 'json');
  }
};

const csvExtractor: DocumentExtractor = {
  supports: (mime, filename) => mime === 'text/csv' || /\.csv$/i.test(filename),
  async extract({ bytes }) { return makeDocument(parseCsv(new TextDecoder().decode(bytes)), 'csv'); }
};

const pdfExtractor: DocumentExtractor = {
  supports: (mime, filename) => mime === 'application/pdf' || /\.pdf$/i.test(filename),
  async extract({ bytes }) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const document = await pdfjs.getDocument({ data: bytes }).promise;
    const pages: ExtractedPage[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map(item => 'str' in item ? item.str : '').join(' ');
      pages.push({ pageNumber, text: normalizeText(text) });
    }
    return makeDocument(pages.map(page => `Page ${page.pageNumber}\n${page.text}`).join('\n\n'), 'pdf', pages);
  }
};

const docxExtractor: DocumentExtractor = {
  supports: (mime, filename) => mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || /\.docx$/i.test(filename),
  async extract({ bytes }) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
    return makeDocument(result.value, 'docx');
  }
};

const EXTRACTORS = [textExtractor, jsonExtractor, csvExtractor, pdfExtractor, docxExtractor];

export async function extractDocument(input: { bytes: Uint8Array; filename: string; mimeType: string }): Promise<ExtractedDocument> {
  const extractor = EXTRACTORS.find(candidate => candidate.supports(input.mimeType, input.filename));
  if (!extractor) throw new Error('Unsupported document format.');
  return extractor.extract(input);
}

export { normalizeText };
