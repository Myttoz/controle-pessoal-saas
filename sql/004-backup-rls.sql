-- Migração 004 — Sela as tabelas backup_* (cópias de pré-migração criadas
-- pelo próprio projeto; o app nunca as lê).
--
-- Medida NÃO destrutiva: nenhum dado é apagado.
--   1. Ativa RLS nas 9 tabelas backup_*.
--   2. Se existir coluna user_id → cria política "dono" (igual às tabelas principais).
--      Se existir só coluna id (ex.: backup_profiles, espelho de profiles) → usa id.
--      Senão a tabela fica trancada para todos (só o painel/service_role acessa).
--
-- Execute no SQL Editor do Supabase (usuário com permissão DDL).

do $$
declare
  t text;
  tem_user_id boolean;
  tem_id boolean;
begin
  foreach t in array array[
    'backup_anos',
    'backup_extras',
    'backup_ferias',
    'backup_horas_extras',
    'backup_lancamentos',
    'backup_lembretes',
    'backup_manutencao',
    'backup_profiles',
    'backup_salarios'
  ]
  loop
    -- 1) tranca a porta pública
    execute format('alter table public.%I enable row level security', t);

    select exists(
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'user_id'
    ) into tem_user_id;

    select exists(
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'id'
    ) into tem_id;

    if tem_user_id then
      execute format('drop policy if exists "backup_own" on public.%I', t);
      execute format(
        'create policy "backup_own" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
        t
      );
    elsif tem_id then
      execute format('drop policy if exists "backup_own" on public.%I', t);
      execute format(
        'create policy "backup_own" on public.%I for all using (auth.uid() = id) with check (auth.uid() = id)',
        t
      );
    end if;
    -- sem colunas de dono: RLS ativo e NENHUMA política → trancado para todos
  end loop;
end $$;

-- Verificação: RLS em todas e quantas políticas cada uma tem
select c.relname as tabela,
       c.relrowsecurity as rls_ativado,
       count(p.polname) as politicas
from pg_class c
left join pg_policy p on p.polrelid = c.oid
where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relrowsecurity, c.relname;
