-- Migração 002 — Serviços Extras (aba RECEBIDOS → EXTRAS)
--
-- Adiciona as colunas dos lançamentos de Serviços na tabela `extras`.
-- Execute UMA vez no SQL Editor do Supabase, com usuário com permissão DDL.
-- Também está refletido em sql/schema.sql (referência completa do banco).
alter table extras add column if not exists cliente text;
alter table extras add column if not exists despesas_cliente numeric(12,2);
alter table extras add column if not exists ganhos_pecas numeric(12,2);
alter table extras add column if not exists ganhos_servicos numeric(12,2);
alter table extras add column if not exists minhas_despesas numeric(12,2);
