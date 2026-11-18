-- Migração 003 — Row Level Security (RLS) em TODAS as tabelas
--
-- O Supabase enviou um alerta de que alguma tabela está pública
-- (URL + chave anon leem/gravam tudo). O schema de referência do projeto
-- já habilita RLS em tudo, mas o banco ao vivo pode ter ficado para trás
-- (ou uma tabela criada fora do fluxo).
--
-- Este script é IDEMPOTENTE: pode rodar quantas vezes quiser.
-- Execute no SQL Editor do Supabase (usuário com permissão DDL).

-- 1) Diagnóstico: quais tabelas em "public" NÃO têm RLS (rode antes de corrigir)
select relname        as tabela,
       relrowsecurity as rls_ativado
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r'
order by rls_ativado, relname;

-- 2) Habilita RLS em todas as tabelas do app
alter table profiles    enable row level security;
alter table anos        enable row level security;
alter table lancamentos enable row level security;
alter table salarios    enable row level security;
alter table extras      enable row level security;
alter table horas_extras enable row level security;
alter table ferias      enable row level security;
alter table manutencao  enable row level security;
alter table lembretes   enable row level security;

-- 3) Recria as políticas de dono (2x cada operação para todas as tabelas).
--    Cada usuário só enxerga/altera a PRÓPRIA linha; o resto é bloqueado.

-- profiles (dono = coluna id)
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_insert_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- anos
drop policy if exists "anos_select_own" on anos;
drop policy if exists "anos_insert_own" on anos;
drop policy if exists "anos_update_own" on anos;
drop policy if exists "anos_delete_own" on anos;
create policy "anos_select_own" on anos for select using (auth.uid() = user_id);
create policy "anos_insert_own" on anos for insert with check (auth.uid() = user_id);
create policy "anos_update_own" on anos for update using (auth.uid() = user_id);
create policy "anos_delete_own" on anos for delete using (auth.uid() = user_id);

-- lancamentos
drop policy if exists "lancamentos_select_own" on lancamentos;
drop policy if exists "lancamentos_insert_own" on lancamentos;
drop policy if exists "lancamentos_update_own" on lancamentos;
drop policy if exists "lancamentos_delete_own" on lancamentos;
create policy "lancamentos_select_own" on lancamentos for select using (auth.uid() = user_id);
create policy "lancamentos_insert_own" on lancamentos for insert with check (auth.uid() = user_id);
create policy "lancamentos_update_own" on lancamentos for update using (auth.uid() = user_id);
create policy "lancamentos_delete_own" on lancamentos for delete using (auth.uid() = user_id);

-- salarios
drop policy if exists "salarios_select_own" on salarios;
drop policy if exists "salarios_insert_own" on salarios;
drop policy if exists "salarios_update_own" on salarios;
drop policy if exists "salarios_delete_own" on salarios;
create policy "salarios_select_own" on salarios for select using (auth.uid() = user_id);
create policy "salarios_insert_own" on salarios for insert with check (auth.uid() = user_id);
create policy "salarios_update_own" on salarios for update using (auth.uid() = user_id);
create policy "salarios_delete_own" on salarios for delete using (auth.uid() = user_id);

-- extras
drop policy if exists "extras_select_own" on extras;
drop policy if exists "extras_insert_own" on extras;
drop policy if exists "extras_update_own" on extras;
drop policy if exists "extras_delete_own" on extras;
create policy "extras_select_own" on extras for select using (auth.uid() = user_id);
create policy "extras_insert_own" on extras for insert with check (auth.uid() = user_id);
create policy "extras_update_own" on extras for update using (auth.uid() = user_id);
create policy "extras_delete_own" on extras for delete using (auth.uid() = user_id);

-- horas_extras
drop policy if exists "horas_extras_select_own" on horas_extras;
drop policy if exists "horas_extras_insert_own" on horas_extras;
drop policy if exists "horas_extras_update_own" on horas_extras;
drop policy if exists "horas_extras_delete_own" on horas_extras;
create policy "horas_extras_select_own" on horas_extras for select using (auth.uid() = user_id);
create policy "horas_extras_insert_own" on horas_extras for insert with check (auth.uid() = user_id);
create policy "horas_extras_update_own" on horas_extras for update using (auth.uid() = user_id);
create policy "horas_extras_delete_own" on horas_extras for delete using (auth.uid() = user_id);

-- ferias
drop policy if exists "ferias_select_own" on ferias;
drop policy if exists "ferias_insert_own" on ferias;
drop policy if exists "ferias_update_own" on ferias;
drop policy if exists "ferias_delete_own" on ferias;
create policy "ferias_select_own" on ferias for select using (auth.uid() = user_id);
create policy "ferias_insert_own" on ferias for insert with check (auth.uid() = user_id);
create policy "ferias_update_own" on ferias for update using (auth.uid() = user_id);
create policy "ferias_delete_own" on ferias for delete using (auth.uid() = user_id);

-- manutencao
drop policy if exists "manutencao_select_own" on manutencao;
drop policy if exists "manutencao_insert_own" on manutencao;
drop policy if exists "manutencao_update_own" on manutencao;
drop policy if exists "manutencao_delete_own" on manutencao;
create policy "manutencao_select_own" on manutencao for select using (auth.uid() = user_id);
create policy "manutencao_insert_own" on manutencao for insert with check (auth.uid() = user_id);
create policy "manutencao_update_own" on manutencao for update using (auth.uid() = user_id);
create policy "manutencao_delete_own" on manutencao for delete using (auth.uid() = user_id);

-- lembretes
drop policy if exists "lembretes_select_own" on lembretes;
drop policy if exists "lembretes_insert_own" on lembretes;
drop policy if exists "lembretes_update_own" on lembretes;
drop policy if exists "lembretes_delete_own" on lembretes;
create policy "lembretes_select_own" on lembretes for select using (auth.uid() = user_id);
create policy "lembretes_insert_own" on lembretes for insert with check (auth.uid() = user_id);
create policy "lembretes_update_own" on lembretes for update using (auth.uid() = user_id);
create policy "lembretes_delete_own" on lembretes for delete using (auth.uid() = user_id);

-- 4) Verificação: tabela, RLS e quantidade de políticas por tabela
select c.relname as tabela,
       c.relrowsecurity as rls_ativado,
       count(p.polname) as politicas
from pg_class c
left join pg_policy p on p.polrelid = c.oid
where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relrowsecurity, c.relname;
