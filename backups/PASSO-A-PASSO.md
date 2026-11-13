# Backup semanal do Supabase — passo a passo

> **O que é isto:** um backup automático (toda semana) do banco de produção do site
> para um repositório privado no GitHub. Grátis, sem máquina ligada, sem intervenção
> manual após configurar **uma vez**.
>
> **Tempo estimado:** 5 minutos.
>
> **Pré-requisito:** senha do banco (você criou com o projeto; se não souber,
> resetei na tela Connect do Supabase — botão **Reset database password**).

---

## Passo 1 — Criar o repositório de backups (privado)

1. Abra https://github.com/new
2. **Repository name:** `controle-pessoal-backups`
3. **Private** ← obrigatório (os dumps contêm seus dados financeiros)
4. **Create repository**

---

## Passo 2 — Pegar a connection string do Supabase

1. Abra o botão verde **Connect** na barra superior do seu projeto
2. Clique na aba **Direct** (a terceira, "Connection string")
3. Selecione **Session pooler** (terceira opção da lista — o GitHub Actions não
   tem IPv6, então é o Session pooler que funciona)
4. No final da tela, em **Connection string**, copie o texto inteiro

A string tem formato parecido com:

```
postgresql://postgres.srojhhwpwfjbotuphoxq:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

Troque `[YOUR-PASSWORD]` pela senha do banco. Se não souber, clique em
**Reset database password** (mesmo modal, ao lado da caixa) e use a nova senha.

> ⚠️ **Não cole essa senha no chat, nem em arquivo nenhum.** Ela vai apenas para o
> campo de **Secrets** no GitHub.

---

## Passo 3 — Colar o secret no GitHub

No repositório **controle-pessoal-backups**:

1. **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
2. Crie o secret:

   - Name: `SUPABASE_DB_URL`
   - Value: a connection string completa obtida no passo 2

> O workflow usa o `GITHUB_TOKEN` padrão do próprio repositório para commitar o
> `.dump` — **não é preciso criar nenhum token adicional**.

---

## Passo 4 — Adicionar o workflow ao repo de backups

1. No repositório `controle-pessoal-backups`, clique em **Add file → Create new file**
2. Nome: `.github/workflows/backup.yml`
3. Cole o conteúdo de **`backups/backup-semanal.yml`** (deste diretório)
4. **Commit new file**

---

## Passo 5 — Testar

1. Aba **Actions** do repositório de backups → workflow **Backup Supabase — semanal**
2. **Run workflow**
3. Após ~1 minuto o run deve ficar **verde** e aparecer `backups/backup-AAAA-MM-DD.dump`

Pronto — backup automático semanal configurado. O `.dump` fica guardado para
sempre no repo privado (pode limpar de tempos em tempos se acumular).

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
