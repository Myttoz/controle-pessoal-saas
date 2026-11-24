-- 008-anexos.sql
-- Anexos/comprovantes para lançamentos e manutenção.
-- 1) Tabela de metadados
-- 2) Bucket de Storage + policies (execute no SQL Editor do Supabase)

-- ---------------------------------------------------------------------------
-- Tabela de metadados
-- ---------------------------------------------------------------------------
create table if not exists public.anexos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entidade_tipo text not null check (entidade_tipo in ('lancamento', 'manutencao')),
  entidade_id uuid not null,
  nome text not null,
  caminho text not null, -- path no Storage: {user_id}/{entidade_tipo}/{entidade_id}/{arquivo}
  mime text,
  tamanho bigint,
  created_at timestamptz default now()
);

create index if not exists anexos_entidade_idx on public.anexos (user_id, entidade_tipo, entidade_id);

alter table public.anexos enable row level security;

drop policy if exists "anexos_select_own" on public.anexos;
drop policy if exists "anexos_insert_own" on public.anexos;
drop policy if exists "anexos_delete_own" on public.anexos;
create policy "anexos_select_own" on public.anexos for select using (auth.uid() = user_id);
create policy "anexos_insert_own" on public.anexos for insert with check (auth.uid() = user_id);
create policy "anexos_delete_own" on public.anexos for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket (execute também no SQL Editor)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', false)
on conflict (id) do nothing;

-- Policies no storage.objects (usuário só acessa sua própria pasta {user_id}/...)
drop policy if exists "anexos_storage_select_own" on storage.objects;
drop policy if exists "anexos_storage_insert_own" on storage.objects;
drop policy if exists "anexos_storage_delete_own" on storage.objects;

create policy "anexos_storage_select_own"
on storage.objects for select
using (bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "anexos_storage_insert_own"
on storage.objects for insert
with check (bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "anexos_storage_delete_own"
on storage.objects for delete
using (bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text);
