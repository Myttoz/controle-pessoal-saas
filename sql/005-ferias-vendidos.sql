-- Migração 005 — Férias: dias vendidos (abono)
--
-- A aba Férias calcula o abono (máx. 10 dias vendidos), mas o valor nunca
-- foi gravado — a tabela não tinha a coluna, então ao sincronizar o app
-- "esquecia" os dias vendidos e eles voltavam a 0.
--
-- Execute UMA vez no SQL Editor do Supabase (usuário com permissão DDL).
alter table ferias add column if not exists dias_vendidos int;
