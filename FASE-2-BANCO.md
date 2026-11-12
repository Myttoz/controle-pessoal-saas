# FASE 2 — Banco de dados (passo a passo)

> Depois de criar o projeto no Supabase (Fase 1), rode o schema do banco.

---

## 1. Rodar o schema (tabelas + RLS)

1. No Supabase, abra **SQL Editor** (menu lateral > SQL Editor).
2. Clique em **New query**.
3. Copie o conteúdo do arquivo `sql/schema.sql` (neste repositório) e cole no editor.
4. Clique em **Run** (ou Ctrl+Enter).
5. Se aparecer algum erro, me envie a mensagem.

O schema cria:
- Tabelas: `profiles`, `anos`, `lancamentos`, `salarios`, `extras`, `horas_extras`, `ferias`, `manutencao`, `lembretes`.
- Índices para performance.
- **RLS** (Row Level Security): cada usuário só vê os próprios dados.
- Um **trigger** que cria o perfil automaticamente no signup.

---

## 2. Criar o usuário da sua esposa (opcional, pelo painel)

1. Em **Authentication > Users**, clique em **Add user > Create new user**.
2. Preencha e-mail e senha dela (ou ative "Auto Confirm User").
3. Ela poderá logar com e-mail/senha, ou com Google se cadastrar o mesmo e-mail.

---

## 3. Descobrir o seu User UUID

1. Em **Authentication > Users**, clique no seu usuário.
2. Copie o campo **User ID** (um UUID, ex.: `123e4567-e89b-12d3-a456-426614174000`).
3. Guarde — vamos usar na migração.

---

## 4. Rodar a migração da 2026 (Fase 6, antecipada)

> Pré-requisito: schema criado (passo 1) e usuário criado (passo 3).

1. No computador, na pasta `scripts`, rode:
   ```bash
   python3 migrar-2026.py \
     --xlsx "Ganhos-Gastos 2026.xlsx" \
     --user-uuid "SEU_USER_UUID" \
     --out "migracao-2026.sql"
   ```
   (substitua `SEU_USER_UUID` pelo UUID do passo 3)
2. No Supabase, abra **SQL Editor**, cole o conteúdo de `migracao-2026.sql` e rode.
3. Se der erro, verifique se o schema foi criado e se o UUID está correto.

**Para refazer:** rode `scripts/limpar-2026.sql` antes (apaga os dados de 2026).

---

## 5. Validar

1. No SQL Editor, rode:
   ```sql
   select ano, mes, count(*) from lancamentos where ano = 2026 group by ano, mes order by mes;
   select count(*) from horas_extras where data >= '2026-01-01' and data < '2027-01-01';
   select * from ferias;
   ```
2. Confira se os totais batem com a aba `GASTO_REAL`/`2026` da planilha.

---

## 6. Me avisar

Me envie:
- Confirmação de que o schema rodou sem erros.
- O seu **User UUID**.
- Resultado da validação (ou print dos totais).
