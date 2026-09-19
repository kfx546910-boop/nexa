export const WORKSPACE_LIMITS = {
  maxFileSizeBytes: 25 * 1024 * 1024,
  maxFilesPerProject: 500,
  maxFilenameLength: 180
} as const;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'video/mp4'
]);

const EXECUTABLE_EXTENSIONS = new Set(['.exe', '.bat', '.cmd', '.com', '.msi', '.ps1', '.sh', '.bin']);

export function sanitizeFilename(filename: string): string {
  const normalized = filename.normalize('NFKC').replace(/\\/g, '/').split('/').pop() || '';
  const safe = normalized.replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/\s+/g, ' ').trim();
  if (!safe || safe === '.' || safe === '..') throw new Error('A valid filename is required.');
  if (safe.length > WORKSPACE_LIMITS.maxFilenameLength) throw new Error('Filename is too long.');
  if (safe.includes('..')) throw new Error('Filename contains an invalid path sequence.');
  return safe;
}

export function validateProjectFile(file: Pick<File, 'name' | 'type' | 'size'>): string {
  const filename = sanitizeFilename(file.name);
  const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  if (EXECUTABLE_EXTENSIONS.has(extension)) throw new Error('Executable files are not allowed.');
  if (file.size <= 0 || file.size > WORKSPACE_LIMITS.maxFileSizeBytes) {
    throw new Error('File exceeds the allowed 25 MB size limit.');
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) throw new Error('This file type is not supported.');
  return filename;
}

export function workspaceCacheKey(userId: string, scope: 'projects' | 'files', projectId?: string): string {
  if (!userId) throw new Error('Authenticated user is required.');
  return projectId
    ? `user:${userId}:project:${projectId}:${scope}`
    : `user:${userId}:${scope}`;
}
