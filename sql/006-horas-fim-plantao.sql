-- Migração 006 — Horas extras: fim do plantão (período a 50%)
--
-- O campo "fim do plantão" (que define as horas a 50%) nunca foi gravado —
-- a tabela não tinha a coluna, então ele sumia a cada sincronização.
--
-- Execute UMA vez no SQL Editor do Supabase (usuário com permissão DDL).
alter table horas_extras add column if not exists fim_plantao time;
