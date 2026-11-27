# Backup semanal do Supabase — passo a passo

> **O que é isto:** backup automático (todo domingo, 07:00 de Brasília) de **duas coisas**:
>
> 1. **Banco de dados** (schema + dados) → `backups/backup-AAAA-MM-DD.dump`
> 2. **Anexos/comprovantes** (arquivos do Storage) → `anexos/AAAA-MM-DD/...`
>
> Tudo vai para o repositório **privado** `Myttoz/controle-pessoal-backup` no GitHub.
> Grátis, sem máquina ligada e sem intervenção manual depois de configurado.
>
> **Pré-requisitos:** senha do banco e a chave `service_role` do projeto.

---

## Situação atual

| Item | Status |
|---|---|
| Repositório privado `controle-pessoal-backup` | ✅ criado |
| Secret `SUPABASE_DB_URL` | ✅ configurado |
| Workflow do banco (`pg_dump`) | ✅ rodando (dumps de 13, 15, 22 e 27/11) |
| Secret `SUPABASE_SERVICE_ROLE_KEY` | ⬜ **falta** (Passo 5) |
| Script `scripts/backup-anexos.mjs` | ⬜ **falta** (Passo 6) |
| Workflow atualizado com o passo de anexos | ⬜ **falta** (Passo 4) |

Os passos 1 a 3 já estão feitos. Faça os passos 4, 5 e 6.

---

## Passo 1 — Criar o repositório de backups (privado) ✅ já feito

1. Abra https://github.com/new
2. **Repository name:** `controle-pessoal-backup`
3. **Private** ← obrigatório (os dumps contêm seus dados financeiros)
4. **Create repository**

---

## Passo 2 — Pegar a connection string do Supabase ✅ já feito

1. No projeto Supabase, clique em **Connect**
2. Aba **Direct** → **Session pooler**
3. Copie a connection string inteira e troque `[YOUR-PASSWORD]` pela senha do banco

Formato:

```
postgresql://postgres.srojhhwpwfjbotuphoxq:[SENHA]@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

> ⚠️ **Não cole essa senha no chat nem em arquivo nenhum.** Ela vai apenas para
> **Settings → Secrets and variables → Actions** no GitHub.

---

## Passo 3 — Secret `SUPABASE_DB_URL` ✅ já feito

No repositório `controle-pessoal-backup`:

1. **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
2. Name: `SUPABASE_DB_URL`
3. Value: a connection string do Passo 2

---

## Passo 4 — Atualizar o workflow (banco + anexos)

No repositório `controle-pessoal-backup`:

1. Abra `.github/workflows/backup.yml`
2. Clique no lápis (**Edit**)
3. **Apague todo o conteúdo** e cole o conteúdo de `backups/backup-semanal.yml`
   (deste projeto) — ele já tem o `pg_dump` **e** o passo dos anexos
4. **Commit changes**

> O que mudou: `actions/checkout@v4` → `@v5` (some o aviso de Node 20) e o passo
> “Baixar anexos do Storage”.

---

## Passo 5 — Secret `SUPABASE_SERVICE_ROLE_KEY` (novo)

1. No Supabase: **Project Settings** (engrenagem) → **API**
2. Em **Project API keys**, clique em **Reveal** na chave **`service_role`** e copie
3. No GitHub (`controle-pessoal-backup`): **Settings** → **Secrets and variables**
   → **Actions** → **New repository secret**
4. Name: `SUPABASE_SERVICE_ROLE_KEY`
5. Value: a chave copiada

> ⚠️ A `service_role` **ignora todas as regras de segurança (RLS)** e dá acesso total
> ao banco e ao Storage. Ela só pode ficar em repositório **privado** e nunca no
> código do site. Se vazar, rotacione em **Settings → API → Rotate**.

---

## Passo 6 — Adicionar o script de download dos anexos (novo)

No repositório `controle-pessoal-backup`:

1. **Add file** → **Create new file**
2. Nome: `scripts/backup-anexos.mjs` (o GitHub cria a pasta `scripts/`)
3. Cole o conteúdo de `backups/backup-anexos.mjs` (deste projeto)
4. **Commit changes**

O script usa só o Node que já vem no GitHub Actions — não precisa instalar nada.

---

## Passo 7 — Testar

1. Aba **Actions** → workflow **Backup Supabase — semanal**
2. **Run workflow** → **Run workflow**
3. Após ~1 minuto o run deve ficar verde. Confira:
   - `backups/backup-AAAA-MM-DD.dump` (banco)
   - `anexos/AAAA-MM-DD/...` (arquivos; só aparece se houver anexos)
4. Clique no `.dump` para conferir o tamanho (não pode ser 0 KB)

> Se aparecer o aviso “Secret SUPABASE_SERVICE_ROLE_KEY ausente”, o Passo 5 não
> foi concluído — o banco é salvo, mas os anexos não.

---

## Como restaurar

### Banco de dados

1. Baixe o `.dump` mais recente do repo de backups
2. Crie um banco limpo (ou use o Supabase com as tabelas vazias —
   `sql/schema.sql` do SaaS recria o schema)
3. No seu computador, com cliente Postgres instalado:

   ```bash
   pg_restore --clean --if-exists --no-owner --no-acl \
     -d "SEU_SUPABASE_DB_URL" backup-AAAA-MM-DD.dump
   ```

### Anexos

1. Baixe a pasta `anexos/AAAA-MM-DD/` do repo de backups
2. No Supabase: **Storage** → bucket `anexos` → **Upload folder**
3. Envie a pasta mantendo a estrutura `{user_id}/{entidade_tipo}/{entidade_id}/arquivo`
   (é o caminho que a tabela `public.anexos` espera)

---

## Observações

- **Retenção:** os arquivos ficam no histórico do Git para sempre. Se o repo crescer
  muito, apague dumps antigos pelo GitHub (o histórico mantém uma cópia) ou recrie o
  repositório de tempos em tempos.
- **Anexos duplicados:** cada execução cria uma pasta `anexos/AAAA-MM-DD/`; os
  arquivos são baixados de novo toda semana. É proposital (snapshot), mas se preferir
  economizar espaço, mantenha apenas a pasta mais recente.
- **Segurança:** repositório privado + secrets. Nunca mova este workflow para o repo
  público do SaaS.
