import type { SupabaseClient, User } from '@supabase/supabase-js';
import { sanitizeFilename, validateProjectFile, WORKSPACE_LIMITS } from './validation';
import type { Project, ProjectFile, ProjectStatus } from './types';

const BUCKET = 'nexa-user-files';

type WorkspaceClient = SupabaseClient;

export class WorkspaceRepository {
  constructor(private readonly client: WorkspaceClient) {}

  private async authenticatedUser(): Promise<User> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw new Error('Authentication is required.');
    return data.user;
  }

  private async requireProjectOwner(projectId: string, userId: string): Promise<Project> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .single();
    if (error || !data) throw new Error('Project was not found.');
    return data as Project;
  }

  async createProject(name: string, description = ''): Promise<Project> {
    const user = await this.authenticatedUser();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 120) throw new Error('Project name is invalid.');

    const { data, error } = await this.client
      .from('projects')
      .insert({ user_id: user.id, name: trimmedName, description: description.trim() })
      .select('*')
      .single();
    if (error || !data) throw new Error('Unable to create project.');
    return data as Project;
  }

  async listProjects(): Promise<Project[]> {
    const user = await this.authenticatedUser();
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'deleted')
      .order('updated_at', { ascending: false });
    if (error) throw new Error('Unable to load projects.');
    return (data || []) as Project[];
  }

  async getProject(projectId: string): Promise<Project> {
    const user = await this.authenticatedUser();
    return this.requireProjectOwner(projectId, user.id);
  }

  async updateProject(projectId: string, patch: { name?: string; description?: string }): Promise<Project> {
    const user = await this.authenticatedUser();
    await this.requireProjectOwner(projectId, user.id);
    const update: Record<string, string> = {};
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name || name.length > 120) throw new Error('Project name is invalid.');
      update.name = name;
    }
    if (patch.description !== undefined) update.description = patch.description.trim();
    const { data, error } = await this.client.from('projects').update(update).eq('id', projectId).eq('user_id', user.id).select('*').single();
    if (error || !data) throw new Error('Unable to update project.');
    return data as Project;
  }

  async archiveProject(projectId: string): Promise<Project> {
    const user = await this.authenticatedUser();
    await this.requireProjectOwner(projectId, user.id);
    const { data, error } = await this.client.from('projects').update({ status: 'archived' as ProjectStatus }).eq('id', projectId).eq('user_id', user.id).select('*').single();
    if (error || !data) throw new Error('Unable to archive project.');
    return data as Project;
  }

  async listProjectFiles(projectId: string): Promise<ProjectFile[]> {
    const user = await this.authenticatedUser();
    await this.requireProjectOwner(projectId, user.id);
    const { data, error } = await this.client.from('project_files').select('*').eq('project_id', projectId).eq('user_id', user.id).neq('status', 'deleted').order('created_at', { ascending: false });
    if (error) throw new Error('Unable to load project files.');
    return (data || []) as ProjectFile[];
  }

  async uploadProjectFile(projectId: string, file: File): Promise<ProjectFile> {
    const user = await this.authenticatedUser();
    await this.requireProjectOwner(projectId, user.id);
    const filename = validateProjectFile(file);
    const existing = await this.listProjectFiles(projectId);
    if (existing.length >= WORKSPACE_LIMITS.maxFilesPerProject) throw new Error('This project has reached its file limit.');

    const fileId = crypto.randomUUID();
    const storagePath = `${user.id}/${projectId}/${fileId}/${filename}`;
    const upload = await this.client.storage.from(BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
    if (upload.error) throw new Error('Unable to upload file.');

    const { data, error } = await this.client.from('project_files').insert({
      id: fileId,
      user_id: user.id,
      project_id: projectId,
      storage_path: storagePath,
      original_name: filename,
      mime_type: file.type,
      size_bytes: file.size,
      status: 'ready'
    }).select('*').single();
    if (error || !data) {
      await this.client.storage.from(BUCKET).remove([storagePath]);
      throw new Error('Unable to save file metadata.');
    }
    return data as ProjectFile;
  }

  async createSignedDownloadUrl(fileId: string, expiresInSeconds = 300): Promise<string> {
    const user = await this.authenticatedUser();
    const { data: file, error: fileError } = await this.client.from('project_files').select('*').eq('id', fileId).eq('user_id', user.id).neq('status', 'deleted').single();
    if (fileError || !file) throw new Error('File was not found.');
    const { data, error } = await this.client.storage.from(BUCKET).createSignedUrl(file.storage_path, expiresInSeconds);
    if (error || !data?.signedUrl) throw new Error('Unable to create a download link.');
    return data.signedUrl;
  }

  async deleteProjectFile(fileId: string): Promise<void> {
    const user = await this.authenticatedUser();
    const { data: file, error: fileError } = await this.client.from('project_files').select('*').eq('id', fileId).eq('user_id', user.id).neq('status', 'deleted').single();
    if (fileError || !file) throw new Error('File was not found.');
    const removal = await this.client.storage.from(BUCKET).remove([file.storage_path]);
    if (removal.error) throw new Error('Unable to remove file from storage.');
    const { error } = await this.client.from('project_files').update({ status: 'deleted', deleted_at: new Date().toISOString() }).eq('id', fileId).eq('user_id', user.id);
    if (error) throw new Error('Storage was cleared, but file metadata needs reconciliation.');
  }
}

export { BUCKET as NEXA_PRIVATE_FILES_BUCKET };
