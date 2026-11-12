# start.me — Página "Controle Pessoal"

> Material de apoio ao start.me (https://start.me). Meta: uma página privada
> com tudo que você precisa em um clique — sem precisar abrir o repositório
> ou procurar na barra de favoritos.
>
> Como o start.me não tem importador no formato nosso, monta na mão: **5 a
> 10 minutos**. Nenhum segredo aqui — só links públicos e um checklist.

---

## 1. Criar a página

1. https://start.me → logado → **+ (canto superior direito) → Page** (ou "nova página")
2. Nome: **Controle Pessoal**
3. Ícone: 💰 (ou livre) • Cor/assunto de sua preferência
4. Deixe **privada** (a existente é pública)

---

## 2. Widgets para montar (4 blocos)

### Widget 1 — "Site & GitHub" (Links)
Tipo: **Links** — clique em **+ Adicionar widget → Links**. Fixe os links:

| Ícone | Título | URL |
|---|---|---|
| 🌐 | **Controle Pessoal (site)** | https://myttoz.github.io/controle-pessoal-saas/ |
| 📦 | Repositório | https://github.com/Myttoz/controle-pessoal-saas |
| 🚀 | Actions (deploys) | https://github.com/Myttoz/controle-pessoal-saas/actions |
| ⚙️ | Pages (configuração) | https://github.com/Myttoz/controle-pessoal-saas/settings/pages |

---

### Widget 2 — "Supabase" (Links)
Mesmo tipo (**Links**):

| Ícone | Título | URL |
|---|---|---|
| 🐘 | **Projeto** | https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq |
| 👥 | **Usuários** | https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq/auth/users |
| 🔐 | Provedores (Google) | https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq/auth/providers |
| 🌐 | Redirect URLs | https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq/auth/url-configuration |
| 🧪 | **SQL Editor** | https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq/sql/new |
| 🔑 | API keys/URL | https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq/settings/api |

---

### Widget 3 — "O site quebrou?" (Notes)
Tipo: **Notes** — ative a formatação Markdown. Conteúdo:

```
1. Site fora do ar / dados zeros?
   → Supabase pausou → Restore project:
   https://supabase.com/dashboard/project/srojhhwpwfjbotuphoxq

2. Login Google não funciona?
   → Google desabilitado → Providers → Enable (veja COLINHA.md seção 5)
   → Redirect URLs sem o site → URL Configuration → adicione
   https://myttoz.github.io/controle-pessoal-saas/**

3. Deploy não roda?
   → settings/pages sem "GitHub Actions" → coloca lá
   → Actions: ver erro do workflow

4. É cache velho? → abrir em ABA ANÔNIMA

5. Senhas/chaves → seu Telegram (grupo de anotações)
```

---

### Widget 4 — "Vencimentos" (Notes)
Mesmo tipo **Notes**:

```
• Projeto Supabase free: pausa ~7 dias sem acesso
  → lembrete semanal no Google Agenda (ver COLINHA.md)
• OAuth Google "em produção": não expira; em teste expira em 7 dias
  → https://console.cloud.google.com/apis/credentials/consent
• Backup: NÃO automático → SQL Editor → Export CSV → 1×/mês
• Token GitHub (ghp_…): não expira — se falhar, gere novo (Telegram)
```

---

## 3. (Opcional) Widgets extras

| Widget | Para que | URL/configuração |
|---|---|---|
| 🌦️ Weather | Mostrar clima | cidade da casa |
| 📈 RSS — GitHub Incidents | Saber se o GitHub caiu (histórico) | `https://www.githubstatus.com/history.rss` — se o widget recusar, use o Atom: `https://www.githubstatus.com/history.atom` |
| 📝 RSS — seus commits | Ver todo push no seu repo no histórico | `https://github.com/Myttoz/controle-pessoal-saas/commits/master.atom` |
| 🗓️ Calendar | ver Google Agenda direto | sua conta do Google |
| ✅ To-do | pendências do app em si | ex.: "rodar ALTER TABLE lembretes" |
| 📝 Bookmarks | salvar docs | COLINHA.md do repo, deck, start.me |

> Cuidado: **não** coloque senhas no start.me (é sincronizado na nuvem da
> start.me — embora com criptografia, o ideal é manter segredos só no Telegram).

---

## 4. Onde fica cada coisa (referência rápida)

- **Guia completo / manutenção** → `COLINHA.md` no repositório
  https://github.com/Myttoz/controle-pessoal-saas — clone ou abra direto no navegador (GitHub renderiza)
- **Tarefas / Kanban** → Deck: https://eli.it.tabdigital.cloud/apps/deck/board/134 (ver `DECK-Controle-Pessoal.md`)
- **Segredos** → seu Telegram
- **Backup de arquivos** → pasta `APP Financas` (este repositório)
