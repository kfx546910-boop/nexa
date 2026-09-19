-- NEXA Phase 3 workspace foundation.
-- Requires Supabase Auth and the Phase 2 user-owned tables when present.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'archived', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_updated_idx on public.projects(user_id, updated_at desc);

alter table if exists public.conversations add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table if exists public.memories add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists conversations_project_idx on public.conversations(project_id);
create index if not exists memories_project_idx on public.memories(project_id);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 180),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  status text not null default 'pending' check (status in ('pending', 'ready', 'deleted', 'failed')),
  checksum text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists project_files_owner_idx on public.project_files(user_id, project_id, created_at desc);

create or replace function public.project_owner_matches_user(p_project_id uuid, p_owner_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.user_id = p_owner_id and p.status <> 'deleted'
  );
$$;

alter table public.projects enable row level security;
alter table public.project_files enable row level security;

create policy "project owners can read projects"
  on public.projects for select
  using (user_id = auth.uid());
create policy "users can create their own projects"
  on public.projects for insert
  with check (user_id = auth.uid());
create policy "project owners can update projects"
  on public.projects for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "project owners can delete projects"
  on public.projects for delete
  using (user_id = auth.uid());

create policy "project owners can read files"
  on public.project_files for select
  using (user_id = auth.uid() and public.project_owner_matches_user(project_id, auth.uid()));
create policy "users can create files in their projects"
  on public.project_files for insert
  with check (user_id = auth.uid() and public.project_owner_matches_user(project_id, auth.uid()));
create policy "project owners can update files"
  on public.project_files for update
  using (user_id = auth.uid() and public.project_owner_matches_user(project_id, auth.uid()))
  with check (user_id = auth.uid() and public.project_owner_matches_user(project_id, auth.uid()));
create policy "project owners can delete files"
  on public.project_files for delete
  using (user_id = auth.uid() and public.project_owner_matches_user(project_id, auth.uid()));

-- Existing Phase 2 tables remain standalone when project_id is null.
-- When those tables exist, these policies add the project ownership condition
-- without granting access to another user's project.
do $$
begin
  if to_regclass('public.conversations') is not null then
    execute 'alter table public.conversations enable row level security';
  end if;
  if to_regclass('public.memories') is not null then
    execute 'alter table public.memories enable row level security';
  end if;
end
$$;

insert into storage.buckets (id, name, public)
values ('nexa-user-files', 'nexa-user-files', false)
on conflict (id) do update set public = false;

create policy "users can upload files to their own workspace path"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'nexa-user-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
    and public.project_owner_matches_user(((storage.foldername(name))[2])::uuid, auth.uid())
  );
create policy "users can read their own workspace files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'nexa-user-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
create policy "users can delete their own workspace files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'nexa-user-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
