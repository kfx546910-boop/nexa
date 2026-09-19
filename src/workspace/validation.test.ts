import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeFilename, validateProjectFile, workspaceCacheKey } from './validation';

test('storage paths never preserve traversal segments', () => {
  assert.equal(sanitizeFilename('../../notes.txt'), 'notes.txt');
  assert.throws(() => sanitizeFilename('..'), /valid filename|invalid path/);
});

test('executable and oversized files are rejected', () => {
  assert.throws(() => validateProjectFile({ name: 'run.sh', type: 'text/plain', size: 20 }), /Executable/);
  assert.throws(() => validateProjectFile({ name: 'large.txt', type: 'text/plain', size: 26 * 1024 * 1024 }), /25 MB/);
});

test('supported project files are accepted', () => {
  assert.equal(validateProjectFile({ name: 'notes.md', type: 'text/markdown', size: 10 }), 'notes.md');
});

test('workspace cache keys are user-scoped', () => {
  assert.equal(workspaceCacheKey('user-a', 'projects'), 'user:user-a:projects');
  assert.equal(workspaceCacheKey('user-a', 'files', 'project-a'), 'user:user-a:project:project-a:files');
  assert.notEqual(workspaceCacheKey('user-a', 'projects'), workspaceCacheKey('user-b', 'projects'));
});
