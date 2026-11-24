-- ============================================================================
--  CONTROLE PESSOAL SAAS — schema do banco (Postgres via Supabase)
--  Rode este arquivo no SQL Editor do Supabase (Fase 2).
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Perfis (1:1 com auth.users)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  created_at timestamptz default now()
);

-- Cria o perfil automaticamente quando o usuário faz signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, new.raw_user_meta_data->>'nome', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Anos
-- ---------------------------------------------------------------------------
create table if not exists anos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ano int not null,
  created_at timestamptz default now(),
  unique(user_id, ano)
);

-- ---------------------------------------------------------------------------
-- Lançamentos mensais (ganhos/gastos)
-- ---------------------------------------------------------------------------
create table if not exists lancamentos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ano int not null,
  mes int not null, -- 1..12
  categoria text,
  valor numeric(12,2),
  descricao text,
  forma_pgt text,
  tipo text,
  quem_paga text,
  data date,
  observacao text,
  grupo_id uuid,
  grupo_tipo text,      -- 'recorrente' | 'parcela'
  grupo_indice int,     -- 1..N
  grupo_total int,      -- N
  created_at timestamptz default now()
);

create index if not exists lancamentos_grupo_id_idx
  on public.lancamentos (grupo_id)
  where grupo_id is not null;

-- ---------------------------------------------------------------------------
-- Salários (1 por mês)
-- ---------------------------------------------------------------------------
create table if not exists salarios (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ano int not null,
  mes int not null,
  base numeric(12,2),
  decimo_terco numeric(12,2),
  ferias numeric(12,2),
  ajuda_custo numeric(12,2),
  hora_extra numeric(12,2),
  outros numeric(12,2),
  ticket numeric(12,2),
  freelance numeric(12,2),
  observacao text,
  created_at timestamptz default now(),
  unique(user_id, ano, mes)
);

-- ---------------------------------------------------------------------------
-- Extras (ganhos/gastos freelance — inclui os Serviços)
-- Serviços: cliente/despesas_cliente (informativo)/ganhos_pecas/
-- ganhos_servicos/minhas_despesas; `valor` guarda o total do serviço
-- (ganhos_pecas + ganhos_servicos − minhas_despesas).
-- ---------------------------------------------------------------------------
create table if not exists extras (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ano int not null,
  mes int not null,
  tipo text, -- 'ganho' | 'gasto'
  categoria text,
  descricao text,
  valor numeric(12,2),
  data date,
  cliente text,
  despesas_cliente numeric(12,2),
  ganhos_pecas numeric(12,2),
  ganhos_servicos numeric(12,2),
  minhas_despesas numeric(12,2),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Horas extras
-- ---------------------------------------------------------------------------
create table if not exists horas_extras (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  entrada time,
  almoco_inicio time,
  almoco_fim time,
  saida time,
  fim_plantao time,
  hora_100 numeric(8,2),
  hora_50 numeric(8,2),
  valor_presencial numeric(12,2),
  valor_home numeric(12,2),
  total numeric(12,2),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Férias
-- ---------------------------------------------------------------------------
create table if not exists ferias (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  periodo text,
  inicio date,
  fim date,
  dias int,
  dias_restantes int,
  dias_vendidos int,
  valor_recebido numeric(12,2),
  status text,
  observacao text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Manutenção do veículo
-- ---------------------------------------------------------------------------
create table if not exists manutencao (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  veiculo text,
  item text,
  data date,
  km int,
  valor numeric(12,2),
  mecanico text,
  observacao text,
  prox_data date,
  prox_km int,
  status text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Lembretes
-- ---------------------------------------------------------------------------
create table if not exists lembretes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text,
  descricao text,
  data date,
  hora time,
  ativo boolean default true,
  email text,
  whatsapp text,
  mensagem text,
  status text default 'PENDENTE',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index if not exists idx_lancamentos_user_ano_mes on lancamentos(user_id, ano, mes);
create index if not exists idx_salarios_user_ano_mes on salarios(user_id, ano, mes);
create index if not exists idx_extras_user_ano_mes on extras(user_id, ano, mes);
create index if not exists idx_horas_extras_user_data on horas_extras(user_id, data);
create index if not exists idx_manutencao_user_veiculo on manutencao(user_id, veiculo);

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS) — cada usuário só vê os próprios dados
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table anos enable row level security;
alter table lancamentos enable row level security;
alter table salarios enable row level security;
alter table extras enable row level security;
alter table horas_extras enable row level security;
alter table ferias enable row level security;
alter table manutencao enable row level security;
alter table lembretes enable row level security;

-- profiles
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- anos
create policy "anos_select_own" on anos for select using (auth.uid() = user_id);
create policy "anos_insert_own" on anos for insert with check (auth.uid() = user_id);
create policy "anos_update_own" on anos for update using (auth.uid() = user_id);
create policy "anos_delete_own" on anos for delete using (auth.uid() = user_id);

-- lancamentos
create policy "lancamentos_select_own" on lancamentos for select using (auth.uid() = user_id);
create policy "lancamentos_insert_own" on lancamentos for insert with check (auth.uid() = user_id);
create policy "lancamentos_update_own" on lancamentos for update using (auth.uid() = user_id);
create policy "lancamentos_delete_own" on lancamentos for delete using (auth.uid() = user_id);

-- salarios
create policy "salarios_select_own" on salarios for select using (auth.uid() = user_id);
create policy "salarios_insert_own" on salarios for insert with check (auth.uid() = user_id);
create policy "salarios_update_own" on salarios for update using (auth.uid() = user_id);
create policy "salarios_delete_own" on salarios for delete using (auth.uid() = user_id);

-- extras
create policy "extras_select_own" on extras for select using (auth.uid() = user_id);
create policy "extras_insert_own" on extras for insert with check (auth.uid() = user_id);
create policy "extras_update_own" on extras for update using (auth.uid() = user_id);
create policy "extras_delete_own" on extras for delete using (auth.uid() = user_id);

-- horas_extras
create policy "horas_extras_select_own" on horas_extras for select using (auth.uid() = user_id);
create policy "horas_extras_insert_own" on horas_extras for insert with check (auth.uid() = user_id);
create policy "horas_extras_update_own" on horas_extras for update using (auth.uid() = user_id);
create policy "horas_extras_delete_own" on horas_extras for delete using (auth.uid() = user_id);

-- ferias
create policy "ferias_select_own" on ferias for select using (auth.uid() = user_id);
create policy "ferias_insert_own" on ferias for insert with check (auth.uid() = user_id);
create policy "ferias_update_own" on ferias for update using (auth.uid() = user_id);
create policy "ferias_delete_own" on ferias for delete using (auth.uid() = user_id);

-- manutencao
create policy "manutencao_select_own" on manutencao for select using (auth.uid() = user_id);
create policy "manutencao_insert_own" on manutencao for insert with check (auth.uid() = user_id);
create policy "manutencao_update_own" on manutencao for update using (auth.uid() = user_id);
create policy "manutencao_delete_own" on manutencao for delete using (auth.uid() = user_id);

-- lembretes
create policy "lembretes_select_own" on lembretes for select using (auth.uid() = user_id);
create policy "lembretes_insert_own" on lembretes for insert with check (auth.uid() = user_id);
create policy "lembretes_update_own" on lembretes for update using (auth.uid() = user_id);
create policy "lembretes_delete_own" on lembretes for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Anexos (metadados; arquivos ficam no Supabase Storage bucket "anexos")
-- ---------------------------------------------------------------------------
create table if not exists anexos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entidade_tipo text not null check (entidade_tipo in ('lancamento', 'manutencao')),
  entidade_id uuid not null,
  nome text not null,
  caminho text not null,
  mime text,
  tamanho bigint,
  created_at timestamptz default now()
);
create index if not exists anexos_entidade_idx on public.anexos (user_id, entidade_tipo, entidade_id);
alter table public.anexos enable row level security;
create policy "anexos_select_own" on anexos for select using (auth.uid() = user_id);
create policy "anexos_insert_own" on anexos for insert with check (auth.uid() = user_id);
create policy "anexos_delete_own" on anexos for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Fim
-- ---------------------------------------------------------------------------
