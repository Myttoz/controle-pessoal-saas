-- Limpa os dados de 2026 para refazer a migração.
-- Rode ANTES de migrar, se precisar repetir.
-- Substitua SEU_USER_UUID pelo seu UUID (ou leave em branco para apagar de todos).

delete from lancamentos where ano = 2026 and user_id = 'SEU_USER_UUID'::uuid;
delete from salarios where ano = 2026 and user_id = 'SEU_USER_UUID'::uuid;
delete from extras where ano = 2026 and user_id = 'SEU_USER_UUID'::uuid;
delete from horas_extras where data >= '2026-01-01' and data < '2027-01-01' and user_id = 'SEU_USER_UUID'::uuid;
delete from ferias where inicio >= '2026-01-01' and inicio < '2027-01-01' and user_id = 'SEU_USER_UUID'::uuid;
delete from manutencao where data >= '2026-01-01' and data < '2027-01-01' and user_id = 'SEU_USER_UUID'::uuid;
