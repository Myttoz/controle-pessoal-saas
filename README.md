# Controle Pessoal

Aplicativo pessoal de controle financeiro — **web** (GitHub Pages + Supabase).

- **Site:** https://myttoz.github.io/controle-pessoal-saas/
- **Login obrigatório.** Seus dados (2026, salário, extras, horas extras,
  férias, manutenção) ficam no **Supabase**, isolados por usuário.
- **Código-fonte único** (Electron opcional para desktop) — a versão web é a
  produção a partir de agora.

> 📌 Documentação de atalhos, manutenção, senhas e emergências: **[COLINHA.md](COLINHA.md)**
> - Passo a passo do site: **[COLINHA.md](COLINHA.md#4-fluxo-normal-para-mudar-qualquer-coisa)**
> - Kanban de acompanhamento (Nextcloud): **[DECK-Controle-Pessoal.md](DECK-Controle-Pessoal.md)**
> - Página privada com links (start.me): **[START-ME.md](START-ME.md)**
> - Resumo para família: **[RESUMO-PARA-CASA.md](RESUMO-PARA-CASA.md)**
> - OpenCode no notebook de casa: **[OPENCODE-NOTEBOOK-CASA.md](OPENCODE-NOTEBOOK-CASA.md)**

## Estrutura

```
├── COLINHA.md …            # guia de tudo (leitura recomendada)
├── ganhos-gastos/          # o app (Electron + React + Vite + TypeScript)
├── sql/schema.sql          # schema do banco (tabelas, índices, RLS)
├── scripts/                # importação da planilha → SQL (histórico)
└── .github/workflows/      # deploy automático do Pages (branch master)
```

## Desenvolvimento local

```bash
cd ganhos-gastos
npm install
npx vite --config vite.web.config.ts   # web em http://localhost:5173
```

(`.env` local com `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` — ver
`ganhos-gastos/.env.example`. Nunca commitar o `.env` real.)

> **Nota:** a planilha do Google e o Apps Script (`codigo/`) são a arquitetura
> antiga — ficam apenas no histórico do Git; a versão web usa o Supabase.
> O projeto desktop antigo (Electron + Google Sheets) continua intacto na pasta
> `../APP` do computador, funcional por pendrive.

## Privacidade

Repositório público **apenas** para hospedagem gratuita do Pages. Nenhum
dado pessoal vive no Git — dados e segredos ficam no Supabase e no Telegram do
dono; o `.env` real e os backups (planilhas, `BACKUP-CONVERSA.txt`, tar.gz)
são ignorados pelo `.gitignore`.
