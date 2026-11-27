# Cola do Controle Pessoal

> **COLINHA** — tudo que você precisa para colocar a mão no site quando algo
> quebrar (ou quando quiser mexer). Leia de cima: a metade de cima resolve
> 90% dos casos; a metade de baixo é o passo a passo de criação do zero e o
> histórico completo.
>
> **Não há senhas nem chaves neste arquivo.** Segredos ficam no seu Telegram;
> credenciais públicas (chave anon) já são públicas por natureza. Onde os
> segredos estão → seção **Senhas e chaves**.

---

## 1. Links que você sempre vai precisar

| O quê | Link |
|---|---|
| **Site (versão publicada)** | https://myttoz.github.io/controle-pessoal-saas/ |
| Repositório (código + docs) | https://github.com/Myttoz/controle-pessoal-saas |
| Actions (deploys e erros de build) | https://github.com/Myttoz/controle-pessoal-saas/actions |
| Configuração do Pages | https://github.com/Myttoz/controle-pessoal-saas/settings/pages |
| **Supabase — painel do projeto** | https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq |
| — Usuários/auth | https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq/auth/users |
| — Provedores (Google ligado) | https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq/auth/providers |
| — URLs de redirecionamento | https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq/auth/url-configuration |
| — SQL Editor | https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq/sql/new |
| — API keys/URL | https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq/settings/api |
| Google Cloud — credenciais OAuth | https://console.cloud.google.com/apis/credentials |
| Google Cloud — tela de permissão OAuth | https://console.cloud.google.com/apis/credentials/consent |
| Nextcloud — Deck (este acompanhamento) | https://eli.it.tabdigital.cloud/apps/deck/board/134 |
| start.me (página "Controle Pessoal") | crie a página seguindo o arquivo `START-ME.md` |

> Projeto Supabase: **`srojhhwpwfjbotuphoxq`** (região South America — São
> Paulo). URL da API: `https://srojhhwpwfjbotuphoxq.supabase.co`
> Conta principal: `matheus.ssilva@gmail.com` (UUID:
> `8f4f4a1a-ee13-4945-ab28-ee1978fb7ee5`)

---

## 2. Senhas e chaves — onde achar (sem expor)

Tudo que é secreto você guarda no **Telegram** (nas suas mensagens salvas
/seu grupo de anotações). Este arquivo só aponta o caminho:

| Chave/senha | Onde está | Quem usa |
|---|---|---|
| Senha do login do app (matheus.ssilva@gmail.com) | Telegram | Site e desenvolvimento local |
| Senha/segredo do Postgres (Supabase) | Telegram | Só para restaurar o projeto pausado |
| Chave anon / publishable (`sb_publishable_…`) | Pública por design — já está no `deploy-web.yml` e no `.env` | Nada secreto; o site usa ela no navegador |
| `.env` local (URL + anon key) | máquina local: `ganhos-gastos/.env` (nunca vai pro Git) | Desenvolvimento local |
| Token do GitHub (`ghp_…`, escopos `repo` + `workflow`) | Telegram | Push pelo terminal |
| Client ID + Client Secret do Google OAuth | Google Cloud Console (credenciais) — cópia no Telegram | Login com Google |

> ⚠️ A **service_role key** (chave mestra do Supabase) **nunca** foi usada no
> app e não deve ir para lugar nenhum além do painel do Supabase.

---

## 3. Como o site funciona (resumo de 30 segundos)

```
navedador ──► https://myttoz.github.io/controle-pessoal-saas/
                  │  (HTML/JS estático no GitHub Pages)
                  ▼
              Supabase (Postgres + Auth + RLS)
              srojhhwpwfjbotuphoxq · dados de 2026 migrados aqui
```

- **Nenhum servidor seu** — o GitHub Pages entrega os arquivos; o navegador
  fala direto com o Supabase.
- **Login obrigatório.** Cada conta só vê os próprios dados (Row Level
  Security). A conta `matheus.ssilva@gmail.com` tem os 583 lançamentos de
  2026 migrados; a conta da sua esposa começa vazia.
- **Não existe backup automático** no plano free. Faça exports manuais
  (ver seção **Backup**).
- **Sem migrações manuais**: toda alteração de schema passa por
  `sql/schema.sql` + commit + push (o deploy é automático).

---

## 4. Fluxo de mudanças (sempre que algo muda)

Editar algo no site = editar código no seu PC → commit → push → o site é
reconstruído sozinho (em ~2 min). **Regra de ouro:** antes de qualquer
alteração, substitua o backup da pasta:

```bash
cd "/home/infra/Documentos/Pessoal"
rm -f APP-Financas-backup.tar.gz
tar --exclude='APP Financas/ganhos-gastos/node_modules' \
    --exclude='APP Financas/ganhos-gastos/out' \
    --exclude='APP Financas/ganhos-gastos/dist-web' \
    -czf APP-Financas-backup.tar.gz "APP Financas"
```

Depois de editar:

```bash
cd "/home/infra/Documentos/Pessoal/APP Financas"
git add -A
git commit -m "título da mudança"
git push -u origin master
```

## 4.1 Release bonitinha (a cada marco)

Use só quando quiser a página `releases` no GitHub — não é necessária a cada
push. Antes de tagear, **atualize o `RELEASE_NOTES.md`** com as notas da nova
versão (o workflow lê esse arquivo na hora de criar a release):

```bash
# (1) push normal — publica o site
git push -u origin master

# (2) criar release bonitinha — quando quiser marcar
#     (edite RELEASE_NOTES.md ANTES)
git tag vX.Y.Z          # escolha a próxima versão (sempre `v` + semver)
git push origin vX.Y.Z  # dispara o workflow "Release" → cria a página + notas
```

O workflow `.github/workflows/release.yml` cria a release usando o corpo do
`RELEASE_NOTES.md` (não mais commits brutos). Uma tag = uma release; commits
isolados **não** criam releases.

> Se o push reclamar de `workflow scope` num arquivo em
> `.github/workflows/`, seu token não tem permissão para workflows — gere
> um novo token com escopo `workflow` (ver **Senhas e chaves**).
>
> O branch de produção é **`master`** (não `main`).

---

## 5. Guia rápido por tarefa (click path)

### 5.1 Trocar a MINHA senha do app

App não tem tela de "esqueci/trocar". Solução via SQL Editor:

1. Supabase → SQL Editor → **New query**
2. Cole, trocando a senha:

   ```sql
   update auth.users
   set encrypted_password = crypt('SUA_NOVA_SENHA', gen_salt('bf'))
   where email = 'matheus.ssilva@gmail.com';
   ```

3. **Run** — se reclamar de `crypt`, rode antes
   `create extension if not exists pgcrypto;` e repita.

### 5.2 Criar usuário separado (esposa)

⚠️ **Antes de criar:** conta separada = **dados separados**. A conta nova
**não** vê o 2026. Se a intenção é ela administrar os mesmos gastos, use a
mesma conta (não crie segunda). Se é vida financeira dela — crie:

1. Supabase → **Authentication → Users** → botão verde **Add user → Create new user**
2. Preencha e-mail + senha, marque **Auto Confirm User**, **Create user**
3. Ela entra em https://myttoz.github.io/controle-pessoal-saas/ com e-mail/senha dela
4. (Opcional) Copiar o 2026 para a conta dela: me peça o SQL de cópia

### 5.3 Ver/baixar os dados (CSV)

SQL Editor → cole a consulta → **Run** → **Export** (botão acima do resultado) → CSV:

```sql
select * from lancamentos  order by ano, mes, data;  -- 583+ linhas de 2026
select * from salarios     order by ano, mes;
select * from extras       order by ano, mes;
select * from horas_extras order by data;
select * from ferias       order by inicio;
select * from manutencao   order by data;
```

### 5.4 Restaurar o projeto se pausar (urgente!)

Sintoma: site abre mas login/todos os dados somem, ou erro
"Fetch failed". Motivo: projeto free pausou por **~7 dias sem acesso**.

1. https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq
2. Clique em **Restore project** (no topo / Settings → General).
3. Espere ~1 minuto e recarregue o site.

> Prevenção: abra o site de tempos em tempos OU crie o lembrete semanal do
> Google Agenda (link na seção **Manutenção e vencimentos**).

### 5.5 Ver o que quebrou num deploy

https://github.com/Myttoz/controle-pessoal-saas/actions → workflow
**Publicar versão web (GitHub Pages)** → run vermelho → ver o log.
Causas comuns: token inválido, `npm ci` falhou, build quebrou.

### 5.6 Criar/remover um ano (ex.: apagar o 2027 vazio)

No app: **Gestão de Anos** cria ano (registro + 12 linhas de salário,
vazio). Para apagar 2027 vazio:

```sql
delete from salarios where ano = 2027;
delete from anos     where ano = 2027;
```

### 5.7 Erro "provider is not enabled" (Google)

Supabase → Authentication → Providers → **Google** → Enable → cole
**Client ID** e **Client Secret** → Save.
Sem isso o login Google do site nunca vai funcionar.

### 5.8 Site abre mas dados somem / "Ação desconhecida"

Sintoma de deploy antigo ou URL errada. Confira:

1. https://myttoz.github.io/controle-pessoal-saas/ — tem de ser **esse** endereço (com `/controle-pessoal-saas/` no fim)
2. settings → Pages → Source = **GitHub Actions** (não "deploy from branch")
3. Actions → deploys recentes — todos verdes?
4. Aba anônima (cache velho às vezes mostra tela antiga)

---

## 6. Manutenção e vencimentos

| Item | Quando expira/pausa | O que fazer |
|---|---|---|
| **Projeto Supabase free** | ~7 dias **sem acesso** | Abra o site; ou **Restore** (ver 5.4). Lembrete no Google Agenda ↓ |
| **OAuth do Google (modo teste)** | refresh token expira em **7 dias** | Confira em Google Cloud → Tela de permissão OAuth → **Em produção** (não "Em teste") |
| **Tokens do GitHub** | Não expiram (classic) | Se um dia o push falhar com 401, gere outro no Telegram |
| **Chave anon** | Não expira | Nada a fazer — ela é pública |
| **Backup de artefatos** | — | Faça exports CSV (ver 5.3) 1×/mês |

📌 **Lembrete semanal no Google Agenda** (abra e clique em Salvar):
https://calendar.google.com/calendar/render?action=TEMPLATE&text=Controle%20Pessoal%20%E2%80%94%20abrir%20o%20site%20%28manuten%C3%A7%C3%A3o%20mensal%2Fsemanal%29&details=Abra%20https%3A%2F%2Fmyttoz.github.io%2Fcontrole-pessoal-saas%20no%20navegador.%20Se%20der%20erro%20ao%20entrar%20ou%20os%20dados%20sumirem%2C%20o%20projeto%20Supabase%20pausou%20por%20inatividade%3A%20entre%20em%20https%3A%2F%2Fsupabase.com%2Fdashboard%2Fproject%2Fsrojhhwpwfjbotuphoxq%20e%20clique%20em%20%22Restore%20project%22.%20Se%20o%20login%20com%20Google%20quebrar%2C%20confira%20a%20tela%20de%20permiss%C3%A3o%20OAuth%20em%20%22Em%20produ%C3%A7%C3%A3o%22.%20Detalhes%20completos%3A%20COLINHA.md%20%28manuten%C3%A7%C3%A3o%20e%20vencimentos%29.&dates=20261112T090000/20261112T091000&recur=RRULE%3AFREQ%3DWEEKLY

↳ No momento de salvar, selecione a agenda **matheus soares** no canto superior,
  se ela não vier marcada.

---

## 7. Troubleshooting (sintoma → solução)

| Sintoma | Causa / solução |
|---|---|
| 404 no site | Pages não aponta para Actions, ou deploy nunca rodou → settings/pages + Actions (ver 5.2 do deck / seção 5) |
| Login Google: `provider is not enabled` | Google desligado no Supabase → 5.7 |
| Login Google: volta para o site e nada acontece | URL do site fora do **Redirect URLs** → URL Configuration → adicione `https://myttoz.github.io/controle-pessoal-saas/**` |
| "Sem conexão" no topo + abas vazias | Backend não respondeu: (a) projeto pausado → 5.4; (b) cache velho → aba anônima |
| Ano pedido mostra 2027 vazio | Sem cache o app pré-selecionava o último ano → **selecione 2026 no topo** (corrigido no commit `8773873`) |
| "Ação desconhecida" | Build antigo em produção → confira deploy ; se persistir, reporte a tela |
| Migração mostra ano errado em localStorage | Aba anônima para descartar cache |
| `npm ci` falha no Actions | Rodar fora do `/workspaces`: aqui é `working-directory: ganhos-gastos`; commit anterior inválido → revert |
| Wife/sua conta não vê dados | Cada usuário só vê os próprios (RLS) — é o esperado |

---

## 8. Backup e cópias de segurança

Contém seus dados; não vai para o GitHub (`.gitignore` bloqueia).

**Regra vigente:** antes de qualquer alteração, **substitua o backup** em
`/home/infra/Documentos/Pessoal/APP-Financas-backup.tar.gz` (comando na seção 4).
Não gera múltiplas versões — sobrescreve; guardar só a mais recente.

| Arquivo/local | Conteúdo |
|---|---|
| `/home/infra/Documentos/Pessoal/backups-saas-financas.tar.gz` | **Backup consolidado da pasta inteira** (23 snapshots: `.git`, `.env`, planilhas, migrations; sem node_modules) |
| Repo privado `controle-pessoal-backup` (GitHub) | **Backup automático semanal** do Postgres **e dos anexos** (workflow `backups/backup-semanal.yml`, copia pro repo privado) — ver `backups/PASSO-A-PASSO.md` |
| `scripts/Ganhos-Gastos 2026.xlsx` | Planilha original 2026 (usada na migração) |
| `scripts/migracao-2026.sql` | SQL gerado a partir da planilha (ENTREGA ÚNICA; não está no Git) |
| `../APP/` | Projeto desktop antigo **completo** — congelado; só servirá como backup/estrado antes de excluir; nada mais será trabalhado nela |
| `sql/schema.sql` | Schema do banco (tabelas + RLS) — versão controlada |
| Supabase | dados de produção (São Paulo) — **backup nativo é pago**; alternativa gratuita = repo privado (acima) |
| Export CSV (seção 5.3) | Backup manual complementar |

Para restaurar a pasta a partir do tar, apague `APP Financas`, copie
`APP-Financas-backup.tar.gz` em `Documentos/Pessoal/` e extraia com
`tar -xzf` (os arquivos sensíveis voltam junto: `.env`, `scripts/migracao-2026.sql`
e as planilhas).

---

## 9. Estrutura do projeto

```
APP Financas/                     (raiz do repositório; clone direto do GitHub)
├── .github/workflows/deploy-web.yml   # deploy automático do Pages (branch master)
├── sql/schema.sql                     # schema do banco (tabelas, índices, RLS)
├── scripts/                           # migração da planilha → SQL (Python)
├── ganhos-gastos/                     # o app (Electron + React + Vite + TS)
│   ├── src/renderer/services/apiSupabase.ts   # ponte renderer → Supabase
│   ├── src/renderer/services/ponte.ts         # escolhe Electron vs Supabase
│   └── vite.web.config.ts                     # build web (base './')
└── COLINHA.md (este arquivo) + documentação auxiliar
```

> `.env` (git-ignored) = API_URL + anon key. Nunca commitar.
> `master` é o branch de produção — não `main`.

## 8. Checklist de manutenção e segurança do SaaS

### Todo dia (5 s)
- Abrir o app, ver o indicador **"Sincronizado"** no canto superior direito.
- Se aparecer algo como "Erro na última sincronização", clicar em **Atualizar**.

### Toda semana (30 s)
- **GitHub → Actions → `backup-semanal`**: último run verde? Se vermelho, abrir e ler o erro.
- **GitHub → Actions → `deploy-web`**: último deploy verde? Se vermelho, o site fica na versão anterior.
- Conferir que o dump semanal está aparecendo em `Myttoz/controle-pessoal-backup` (Actions cria lá) e que a pasta `anexos/AAAA-MM-DD/` foi criada quando há comprovantes.

### Todo mês (5 min)
- Baixar um dump ou CSV manual do mês (backup extra no Drive).
- **Supabase → Database → Database Size**: cresceu normal? (deve estar na casa de MB.)
- **Supabase → Authentication → Audit Logs** (se disponível no plano): acessos estranhos?

### Trimestral (~10 min) — a cargo do usuário
1. **Rotacionar o token do banco do backup (pg_dump)**:
   a. Supabase → **Project Settings → Database → Reset database password**;
   b. Copie a nova senha/URL (ou só a senha, conforme o secret atual);
   c. GitHub → repositório → **Settings → Secrets and variables → Actions**;
   d. Edite o secret que o workflow de backup usa (ex.: `SUPABASE_DB_URL` ou `PGPASSWORD`) e cole o novo valor;
   e. Actions → **backup-semanal → Run workflow** para confirmar que continua verde.
   → Se gerar um lembrete, um por trimestre resolve.
2. Rotacionar a senha do usuário do app (Supabase Auth → Users → o seu → Reset password) se houver suspeita.
3. Verificar que as migrations 002–006 estão no banco (ver apêndice).

### Semestral
- **Teste de restauração**: clone do `controle-pessoal-backup`, restaure o dump mais recente
  num PostgreSQL local/Docker (`createdb teste && pg_restore -d teste arquivo.dump`)
  e confira `select count(*) from lancamentos;`.
- Conferir que nada em `.env` foi committado (git ls-files | grep .env → deve sair vazio).

### Migrations pendentes (rodar no SQL Editor do Supabase)
`002-servicos-extras.sql` · `003-rls.sql` · `004-backup-rls.sql` · `005-ferias-vendidos.sql` · `006-horas-fim-plantao.sql`.

### Backup JSON × dump
Exportar backup em **JSON** (Sincronização e Backup) salva **somente** dados locais
(Horas Extras, Férias, Manutenção, salário/config). **Não** salva lançamentos/extras/salário.
O dump `pg_dump` semanal é o ÚNICO backup completo do banco.
