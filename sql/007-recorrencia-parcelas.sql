-- 007-recorrencia-parcelas.sql
-- Adiciona suporte a recorrência e parcelamento nos lançamentos.
-- Campos aditivos e opcionais; não altera dados existentes.

alter table public.lancamentos
  add column if not exists grupo_id uuid,
  add column if not exists grupo_tipo text,      -- 'recorrente' | 'parcela'
  add column if not exists grupo_indice int,     -- 1..N
  add column if not exists grupo_total int;      -- N

create index if not exists lancamentos_grupo_id_idx
  on public.lancamentos (grupo_id)
  where grupo_id is not null;
