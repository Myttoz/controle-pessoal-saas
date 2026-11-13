# Backup semanal do Supabase — passo a passo

> **O que é isto:** um backup automático (toda semana) do banco de produção do site
> para um repositório privado no GitHub. Grátis, sem máquina ligada, sem intervenção
> manual após configurar **uma vez**.
>
> **Tempo estimado:** 5 minutos.
>
> **Pré-requisito:** senha do banco (a que você criou na hora de criar o projeto
> Supabase — está no seu Telegram). Se não souber, você pode redefinir em:
> Supabase → Project Settings → Database → **Reset database password**.

---

## Passo 1 — Criar o repositório de backups (privado)

1. Abra https://github.com/new
2. **Repository name:** `controle-pessoal-backups`
3. **Private** ← obrigatório (os dumps contêm seus dados financeiros)
4. **Create repository**

---

## Passo 2 — Pegar a connection string do Supabase

1. https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq
2. Menu lateral: **Project Settings** → **Database**
3. Sessão **Connection string** → escolha **URI**
4. O valor virá parecido com:

   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.srojhhwpwfjbotuphoxq.supabase.co:5432/postgres
   ```

   Substitua `[YOUR-PASSWORD]` pela senha real do banco (aquela do Telegram ou a que
   você acabou de redefinir). Guarde o resultado completo — é o seu `SUPABASE_DB_URL`.

> ⚠️ **Não cole essa senha no chat, nem em arquivo nenhum.** Ela vai apenas para o
> campo de **Secrets** no GitHub, que você cola diretamente lá.
>
> Se o Supabase mostrar endereços IPv6 e o `pg_dump` falhar, troque pelo
> **connection pooler** na mesma página (endereço parecido com
> `aws-0-sa-east-1.pooler.supabase.com:6543`, usuário `postgres.srojhhwpwfjbotuphoxq`).

---

## Passo 3 — Colar os secrets no GitHub

No repositório **controle-pessoal-backups**:

1. **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
2. Crie o primeiro:

   - Name: `SUPABASE_DB_URL`
   - Value: a connection string completa obtida no passo 2
3. Crie o segundo (token para o workflow poder commitar):

   - Name: `BACKUPS_REPO_TOKEN`
   - Value: um **Fine-grained personal access token** com:
     - Repositories: só `controle-pessoal-backups`
     - Permissions: **Contents → Read and write** (todo o resto pode ficar "No access")
   - Gere em: https://github.com/settings/personal-access-tokens/new

> Opcional mais simples: o token `ghp_…` do seu Telegram também funciona, mas o
> fine-grained acima é mais seguro (acesso só ao repo de backups).

---

## Passo 4 — Adicionar o workflow ao repo de backups

1. No repositório `controle-pessoal-backups`, clique em **Add file → Create new file**
2. Nome: `.github/workflows/backup.yml`
3. Cole o conteúdo de **`backups/backup-semanal.yml`** (deste diretório)
4. **Commit new file**

---

## Passo 5 — Testar

1. Aba **Actions** do repositório de backups → workflow **Backup Supabase — semanal**
2. **Run workflow** → faça aparecer `Actions` ativado para o repo (se pedir confirmação)
3. Espere ~1 minuto: o run deve ficar **verde** e o repo ganha um arquivo
   `backups/backup-AAAA-MM-DD.dump`

Pronto — backup automático semanal configurado. O arquivo `backup.dump` fica
salvo no repo privado para sempre (ou até rodar uma limpeza ocasional).

---

## Como restaurar (se um dia precisar)

1. Baixe o `.dump` mais recente do repo de backups
2. Crie um banco limpo (ou use o mesmo Supabase com as tabelas vazias —
   `sql/schema.sql` do SaaS recria o schema)
3. No seu computador (com cliente Postgres instalado):

   ```bash
   pg_restore --clean-if-exists --no-owner --no-acl -d "SEU_SUPABASE_DB_URL" backup-AAAA-MM-DD.dump
   ```

Os dados voltam exatamente como estavam na hora do backup.
