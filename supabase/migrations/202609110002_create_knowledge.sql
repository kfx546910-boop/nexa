-- NEXA Phase 4 knowledge indexing. Uses pgvector and preserves Phase 3 files.
create extension if not exists vector;

alter table public.project_files add column if not exists processing_status text not null default 'pending' check (processing_status in ('pending', 'processing', 'ready', 'failed'));
alter table public.project_files add column if not exists processing_error text;
alter table public.project_files add column if not exists processed_at timestamptz;
alter table public.project_files add column if not exists processing_version text;
alter table public.project_files add column if not exists text_length integer;
alter table public.project_files add column if not exists chunk_count integer not null default 0;
alter table public.project_files add column if not exists embedding_status text not null default 'pending' check (embedding_status in ('pending', 'processing', 'ready', 'failed'));

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  file_id uuid not null references public.project_files(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null,
  content_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(64) not null,
  processing_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(file_id, processing_version, chunk_index)
);

create index if not exists document_chunks_file_idx on public.document_chunks(file_id, chunk_index);
create index if not exists document_chunks_embedding_idx on public.document_chunks using hnsw (embedding vector_cosine_ops);
alter table public.document_chunks enable row level security;

drop policy if exists "users can read own document chunks" on public.document_chunks;
create policy "users can read own document chunks" on public.document_chunks for select using (
  user_id = auth.uid() and exists (select 1 from public.project_files f where f.id = file_id and f.user_id = auth.uid() and f.status <> 'deleted' and f.processing_status = 'ready')
);
drop policy if exists "users can insert own document chunks" on public.document_chunks;
create policy "users can insert own document chunks" on public.document_chunks for insert with check (
  user_id = auth.uid() and exists (select 1 from public.project_files f join public.projects p on p.id = f.project_id where f.id = file_id and f.user_id = auth.uid() and p.user_id = auth.uid())
);
drop policy if exists "users can update own document chunks" on public.document_chunks;
create policy "users can update own document chunks" on public.document_chunks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users can delete own document chunks" on public.document_chunks;
create policy "users can delete own document chunks" on public.document_chunks for delete using (user_id = auth.uid());

create or replace function public.match_project_documents(query_embedding vector(64), requested_project_id uuid, match_count integer, similarity_threshold real default 0.22)
returns table (id uuid, file_id uuid, project_id uuid, user_id uuid, file_name text, content text, content_hash text, score real, chunk_index integer, metadata jsonb)
language sql stable security invoker set search_path = public
as $$
  select c.id, c.file_id, c.project_id, c.user_id, f.original_name, c.content, c.content_hash,
    (1 - (c.embedding <=> query_embedding))::real as score, c.chunk_index, c.metadata
  from public.document_chunks c
  join public.project_files f on f.id = c.file_id
  join public.projects p on p.id = c.project_id
  where c.user_id = auth.uid() and p.user_id = auth.uid() and p.id = requested_project_id
    and f.user_id = auth.uid() and f.status <> 'deleted' and f.processing_status = 'ready'
    and (1 - (c.embedding <=> query_embedding)) >= similarity_threshold
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;
