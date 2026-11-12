# Controle Pessoal — Deck (Nextcloud)

> Material de apoio ao KANBAN em **https://eli.it.tabdigital.cloud/apps/deck/board/134**
>
> Como usar: crie as colunas abaixo no board 134 e crie um card por título.
> O texto de cada card aceita **Markdown** — pode colar o conteúdo direto na
> descrição. Não há segredos aqui de propósito (os cards ficam num board
> compartilhado/privado do Nextcloud).

**Sugestão de colunas:**

1. 🔗 Links & Atalhos
2. 🛠️ Supabase (tarefas de rotina)
3. ☁️ Google & GitHub
4. 🩺 Problemas & Soluções
5. 🧹 Manutenção & Vencimentos
6. 🗄️ Backup & Backups

---

## 🔗 Links & Atalhos

### Card 1 — Links rápidos do projeto
Links que você vai precisar sempre:

- **Site:** https://myttoz.github.io/controle-pessoal-saas/
- **Repo:** https://github.com/Myttoz/controle-pessoal-saas
- **Actions (deploy):** https://github.com/Myttoz/controle-pessoal-saas/actions
- **Pages (settings):** https://github.com/Myttoz/controle-pessoal-saas/settings/pages
- **Supabase:** https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq
- **Guia completo:** `COLINHA.md` no repo (e nesta máquina)
- **Deck:** https://eli.it.tabdigital.cloud/apps/deck/board/134

---

### Card 2 — Estrutura do projeto (uma linha cada)
- Site público: GitHub Pages (estático) → fala direto com Supabase
- Banco: Postgres no Supabase (São Paulo), plano free — **pausa após ~7 dias sem uso**
- Frontend: React + Vite + TypeScript (código em `ganhos-gastos/`)
- Deploy: automático a cada push em `master` (workflow `deploy-web.yml`)
- Dados 2026: migrados da planilha (583 lançamentos + salário/extras/médias)
- Conta: `matheus.ssilva@gmail.com` (Google + senha); esposa = conta separada
- Repositório **público**: só porque o Pages free exige. Nenhum dado seu está no Git.

---

## 🛠️ Supabase (tarefas de rotina)

### Card 3 — Acesso geral (onde fica tudo)
URL base do projeto: `https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq`

- **Usuários:** `…/auth/users` → Add/Delete user, resetar senha
- **Provedores:** `…/auth/providers` → Google ligado (necessita Client ID + Secret)
- **Redirect URLs:** `…/auth/url-configuration` → Site URL + Redirect URLs
- **SQL Editor:** `…/sql/new` → consultas, exports CSV
- **API keys:** `…/settings/api` → URL, anon key, service_role (nunca usa)
- **Restore (projeto pausado):** https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq → Restore project

---
### Card 4 — Trocar a minha senha (SQL)
O app não tem "esqueci a senha". Via SQL Editor:

```sql
update auth.users
set encrypted_password = crypt('SUA_NOVA_SENHA', gen_salt('bf'))
where email = 'matheus.ssilva@gmail.com';
```
(se der erro de função: `create extension if not exists pgcrypto;` antes)

---
### Card 5 — Criar usuária para a esposa
Authentication → Users → **Add user** → Create new user → e-mail + senha → marque **Auto Confirm User** → Create.

⚠️ Conta separada = **dados separados**. Ela não verá o 2026 (RLS). Para ela ter o 2026, copie: coluna `user_id` das tabelas trocado pelo UUID dela — me peça o SQL.

---
### Card 6 — Ver/baixar dados (CSV)
SQL Editor → rode a consulta → **Export → CSV**:

```sql
select * from lancamentos  order by ano, mes, data;
select * from salarios     order by ano, mes;
select * from extras       order by ano, mes;
select * from horas_extras order by data;
select * from ferias       order by inicio;
select * from manutencao   order by data;
```
⚠️ Plano free: **sem backup automático**. Faça isso 1×/mês.

---
### Card 7 — SQL úteis de manutenção
```sql
-- apagar ano vazio (ex.: 2027)
delete from salarios where ano = 2027;
delete from anos     where ano = 2027;

-- quantos lançamentos por ano?
select ano, count(*) from lancamentos group by ano order by ano;

-- conferir estado do projeto
select count(*) from lancamentos;
```

---

## ☁️ Google & GitHub

### Card 8 — Google OAuth (resetar se quebrar)
1. https://console.cloud.google.com/apis/credentials → projeto → **Cliente Web** (tipo: Aplicativo da Web)
   - Origens JS: `https://srojhhwpwfjbotuphoxq.supabase.co` e `http://localhost:5173`
   - Redirecionamento: `https://srojhhwpwfjbotuphoxq.supabase.co/auth/v1/callback`
2. Tela de permissão OAuth → status **"Em produção"** (não publicar = token expira em 7 dias)

---
### Card 9 — GitHub: token e deploy
- Branch de produção: **master** (não `main`)
- Deploy: **automático** a cada push (workflow "Publicar versão web")
- Editar arquivos em `.github/workflows/` exige token com escopo **workflow**
- Pages Settings → Source: **GitHub Actions**
- Token não aparece no histórico do Git (fica no seu Telegram)

---
### Card 10 — Commit e push (fluxo padrão)
```bash
cd "/home/infra/Documentos/Pessoal/APP Financas"
git add -A && git commit -m "descrição" && git push
# ~2 min depois: Actions verde → site atualizado
```

---

## 🩺 Problemas & Soluções

### Card 11 — Site abre mas dados "sumiram"
1. É o Supabase pausado? → clique **Restore project** (Card 3)
2. É cache velho? → abra em **aba anônima**
3. É o ano selecionado? → **seletor de ano no topo** → 2026
4. É mesmo erro do deploy? → Actions verde? (Card 9)

---
### Card 12 — Login Google não funciona
- "provider is not enabled" → Supabase → Providers → Google → Enable (Card 8)
- Volta do Google para o site e nada → Redirect URLs (Card 8 + Card 3)
- "redirect_uri_mismatch" → a URL em Origens/Redirecionamento do Google Cloud está com placeholder `xxxxx` — troque por `srojhhwpwfjbotuphoxq`

---
### Card 13 — "Ação desconhecida" / "Sem conexão"
Sintoma de build antigo em produção. Só o deploy (Actions) corrige — confira run recente; se não houver run novo após um push, veja se o workflow está com `branches: master` e se o push realmente ocorreu.

---
### Card 14 — 404 no site publicado
Pages: **Settings → Pages → Source = GitHub Actions**. Sem isso o Pages serve pastas erradas e o site nunca aparece (404). O workflow já está com `branches: master`.

---

## 🧹 Manutenção & Vencimentos

### Card 15 — O que vence e quando
- **Projeto Supabase free:** pausa após ~7 dias sem acesso → abrir o site ou Restore
- **OAuth em "modo de teste":** token de refresh expira em 7 dias → publicar em Produção
- **Token GitHub classic:** não expira (se falhar → gerar novo, guardar no Telegram)
- **Chave anon:** não expira — pública por design
- **Backup do banco:** não existe → exportar CSV manualmente (Card 6)

---
### Card 16 — Lembrete semanal (Google Agenda)
Lembrete recorrente **semanal** para abrir o site e evitar pausa do Supabase.

Clique e salve (selecione agenda **matheus soares**):
https://calendar.google.com/calendar/render?action=TEMPLATE&text=Controle%20Pessoal%20%E2%80%94%20abrir%20o%20site%20(manuten%C3%A7%C3%A3o)&details=Abra%20https%3A%2F%2Fmyttoz.github.io%2Fcontrole-pessoal-saas%20.%20Se%20der%20erro%2C%20Restore%20o%20projeto%20no%20Supabase.%20Detalhes%3A%20COLINHA.md.&dates=20261112T090000/20261112T091000&recur=RRULE%3AFREQ%3DWEEKLY

---
### Card 17 — Verificação mensal (2 min)
1. Site abre? (anônima, se desconfiar de cache)
2. Login OK (e-mail e Google)?
3. Actions verde?
4. Export CSV feito?
5. OAuth ainda "Em produção"?

---

## 🗄️ Backup & Cópias

### Card 18 — Onde fica cada backup
- `scripts/Ganhos-Gastos 2026.xlsx` — planilha original (na máquina local, fora do Git)
- `scripts/migracao-2026.sql` — SQL gerado (local only)
- `ganhos-gastos-backup-*.tar.gz` — backup binário do app desktop
- `../APP/` — projeto desktop antigo completo (pendrive), funcional
- `sql/schema.sql` — schema do banco (no Git)
- Supabase → **sem backup automático** → Card 6

---

### Card 19 — Regras de ouro
1. Nada de senhas/chaves em arquivos do repositório ou no Deck (Telegram é a fonte).
2. Este repo é público só porque o Pages é grátis — nada pessoal nele.
3. `master` = produção. Toda mudança = commit + push + deploy automático.
4. Em dúvida entre mexer ou não: **abre uma IA e descreve a tela** — o agente entende contexto e executa.
5. O 2027 vazio existe de propósito (teste de `criarAno`)? Se não: Card 7 apaga.

---

> Total: **19 cards**. Tempo estimado para montar: ~20 min.
> Qualquer edição neste arquivo muda os cards — manter os dois sincronizados se quiser reutilizar.
