# OpenCode no notebook de casa — passo a passo completo

> **Objetivo:** continuar usando o OpenCode (a mesma IA que construiu a
> solução aqui) no notebook de casa, **via web igual a este chat**, ou via app
> desktop, ou via terminal. No fim você saberá qual escolher e o que fazer em
> cada caso. Este tutorial assume **Windows** (o seu caso) e o projeto já publicado
> e funcional.

---

## 1. O que é o OpenCode

OpenCode é um **agente de IA para programar** — o mesmo que te ajudou a
migrar a planilha de 2026 para o Supabase e a publicar o site. Ele roda na
sua máquina, lê e edita os arquivos do projeto, roda comandos (build, git),
e responde em linguagem natural.

Está disponível de **três formas** (as três são o mesmo agente, com o mesmo
poder — veja a seção 6):

| Modo | Onde roda | Interface |
|---|---|---|
| **Terminal (TUI)** | comando `opencode` | Só teclado, estilo chat |
| **Web (igual aqui)** | `opencode pair` → link abre no navegador | Chat no navegador |
| **Desktop** | app `.exe` instalável | Janela própria |

---

## 2. Verifique a instalação

Você disse que já instalou seguindo a documentação oficial. Confira:

```powershell
opencode --version
opencode --help
```

Se `opencode` **não for encontrado**, instale de novo (escolha uma opção):

```powershell
# npm (recomendado — já tem Node.js instalado)
npm install -g @opencode/cli

# ou o instalador oficial
curl -fsSL https://opencode.ai/v2/install | bash
```

> Node.js: tenha a versão **LTS** (20+). Verifique com `node --version`.
> Se não tiver Node: https://nodejs.org (botão LTS).

Para **atualizar** depois: `npm update -g @opencode/cli`.

---

## 3. Trazer o projeto para o notebook de casa

Você **não** vai copiar a pasta do PC do trabalho — o repositório está no
GitHub; clone direto dele (ele é público):

```powershell
cd $HOME\Documents   # ou onde você guarda seus projetos
git clone https://github.com/Myttoz/controle-pessoal-saas.git
cd controle-pessoal-saas
```

Estrutura importante:

```
controle-pessoal-saas/
├── COLINHA.md                 # guia de manutenção (leia se algo quebrar)
├── ganhos-gastos/             # o app (React + Vite)
├── sql/schema.sql             # schema do banco
└── .github/workflows/         # deploy automático do Pages
```

> As pastas `APP Financas` (cópia/backup) e `APP` (projeto desktop antigo)
> continuam onde estão — são o seu porto seguro local. A partir de agora o
> trabalho do site acontece **neste clone** (código no GitHub).

### 3.1 O `.env` (não vem no clone — de propósito)

O `.env` nunca vai pro GitHub. Se você quiser rodar **localmente**:

1. Abra o **Telegram** (suas anotações de senha/chaves)
2. Crie o arquivo `ganhos-gastos\.env` com:

   ```
   VITE_SUPABASE_URL=https://srojhhwpwfjbotuphoxq.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_kcVOc7NhsDkX2Z09f-QR8A_nVrG4Yty
   ```

   (a chave **anon é pública** — vai embutida no site; fica só para o dev)

3. `npm install` → `npx vite --config vite.web.config.ts` → abre em `http://localhost:5173`

> Se for só para **manter o site** (e não desenvolver local), nem precisa
> disso — o deploy é automático a cada push.

---

## 4. Conectando seu modelo de IA

O OpenCode não tem "modelo embutido": ele conecta num provedor (igual a este
chat). Na primeira vez:

1. Rode `opencode` (terminal, web ou desktop)
2. Digite `/connect`
3. Escolha o provedor que você já usa (ex.: OpenCode Console, ou
   Anthropic/OpenAI/etc. do seu costume) e autentique
4. Pronto — o agente já funciona

> Qual provedor este chat usa? Você já sabe qual login/chave usou aqui —
> **use o mesmo** no notebook (é a sua assinatura, não a minha).
> Documentação oficial de provedores: https://opencode.ai/docs#providers

---

## 5. Usar via web — igual a este chat

Esta é a forma **idêntica** à do chat atual (mensagens + o agente edita
arquivos e roda comandos). Passo a passo:

1. No terminal, dentro da pasta do projeto:

   ```powershell
   cd controle-pessoal-saas
   opencode pair
   ```

2. O comando mostra um link único (ex.: `http://127.0.0.1:49374/auth/connect/...`)
3. Abra **esse link** no navegador (Edge/Chrome)
4. Você verá o chat do OpenCode — escreva em português natural:

   > "O site está fora do ar com erro 404. Confira o Pages e o deploy."

> ⚠️ O link é de uso único e vale por alguns minutos — abra logo após
> rodar `opencode pair`; se expirou, rode de novo. Para o caso comum,
> fica tudo na mesma máquina (localhost).

---

## 6. Web vs Desktop — qual tem "mais poder"?

**Resposta direta: nenhum — as três são o mesmo agente.** Terminal, web e
desktop rodam o mesmo núcleo, com as mesmas permissões para ler/editar
arquivos, rodar comandos, chamar plugins e MCP. O que muda é a interface:

| | Terminal (TUI) | Web (igual aqui) | Desktop |
|---|---|---|---|
| Poder/ferramentas | ✓ idêntico | ✓ idêntico | ✓ idêntico |
| Instalação | `npm i -g @opencode/cli` | idem + `opencode pair` | `.exe` da página oficial |
| Interface | Só teclado, muito rápido | Chat no navegador, igual a este | Janela nativa |
| Acessível de outro dispositivo | Só esta máquina (localhost) | Só esta máquina (localhost) | Só na máquina |
| Ideal para | quem vive no teclado | uso casual, celular incluso* | quem prefere app |

\* A web abre no navegador da mesma máquina (é `localhost`). Para acessar de outro aparelho, a via é uma VPN/túnel (ex.: Tailscale) — no uso comum, é tudo na mesma máquina.

**Recomendação para você:**
- Dia a dia "leve" (perguntas, ajustes pequenos): **Desktop** — clique duplo e pronto
- Tarefas maiores (mexer no código): **Web** (igual aqui) ou o **TUI** — contexto completo na tela
- Manutenção pesada (migrações SQL, reescrever arquivos): **Web ou TUI** — os dois mostram o que o agente está fazendo

**Desktop não "sabe mais"**: ele só roda o mesmo agente numa janela — tudo
que ele faz, o web e o TUI também fazem. A escolha é de gosto.

---

## 7. Um exemplo de sessão no notebook de casa

1. Você: "O site caiu de novo e aparece erro ao entrar. O que está
   acontecendo?" (web)
2. O agente lê `COLINHA.md`, vê que o deploy está OK e o Supabase pausou
3. O agente te explica: projeto pausado → clique em "Restore project"
   no dashboard (ou ele te descreve passo a passo)
4. Tudo volta em 1 minuto

Ou, para algo técnico:

1. Você: "Adiciona um botão de exportar CSV no Dashboard"
2. O agente edita o código, roda o build (`npm run build:web`)
3. Você pede: "cria o commit" → ele cria
4. Você: `git push` (no seu terminal) → Actions reconstrói → site atualizado

> **O push é seu.** O agente consegue criar commits locais, mas o
> `git push` exige seu token do GitHub (Telegram) — decisão consciente de
> segurança. Ou, se você der o token (uma vez), ele faz o push direto.

---

## 8. Dados e senhas no notebook de casa

| Item | Onde encontrar |
|---|---|
| Senha da sua conta (e-mail) | seu Telegram |
| Credenciais do Google (OAuth) | Telegram (ou criar de novo no Google Cloud) |
| Token do GitHub (`ghp_…`) | Telegram |
| Chave anon/publishable | pública — está no `.env` local e no `deploy-web.yml` |
| Senha do Postgres (restaurar projeto) | Telegram |

> **Nunca** cole a `service_role key` em lugar nenhum a não ser no painel do
> Supabase. O agente não pede e não recebe essa chave.

---

## 9. Manutenção contínua do site

Qualquer mudança real no site = mesmo fluxo:

```
você descreve → agente edita → build local (opcional) →
commit → push → Actions → site novo (~2 min)
```

Acompanhe os deploys:
https://github.com/Myttoz/controle-pessoal-saas/actions
("Publicar versão web (GitHub Pages)" — verde = publicado)

---

## 10. Lembrete semanal (recomendado)

Projeto Supabase free pausa ~7 dias sem acesso. Para não depender de
sorte, **lembrete semanal no Google Agenda** (abra e clique em Salvar;
na hora de salvar, selecione a agenda **matheus soares**):

https://calendar.google.com/calendar/render?action=TEMPLATE&text=Controle%20Pessoal%20%E2%80%94%20abrir%20o%20site%20%28manuten%C3%A7%C3%A3o%20mensal%2Fsemanal%29&details=Abra%20https%3A%2F%2Fmyttoz.github.io%2Fcontrole-pessoal-saas%20no%20navegador.%20Se%20der%20erro%20ao%20entrar%20ou%20os%20dados%20sumirem%2C%20o%20projeto%20Supabase%20pausou%20por%20inatividade%3A%20entre%20em%20https%3A%2F%2Fsupabase.com%2Fdashboard%2Fproject%2Fsrojhhwpwfjbotuphoxq%20e%20clique%20em%20%22Restore%20project%22.%20Se%20o%20login%20com%20Google%20quebrar%2C%20confira%20a%20tela%20de%20permiss%C3%A3o%20OAuth%20em%20%22Em%20produ%C3%A7%C3%A3o%22.%20Detalhes%20completos%3A%20COLINHA.md%20%28manuten%C3%A7%C3%A3o%20e%20vencimentos%29.&dates=20261112T090000/20261112T091000&recur=RRULE%3AFREQ%3DWEEKLY

---

## 11. Problemas comuns (notebook de casa)

**"opencode não é reconhecido"** → `npm install -g @opencode/cli` de novo; abra **novo** terminal; veja se Node está no PATH.

**PowerShell bloqueia o comando** → abra o terminal como administrador e rode `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.

**`git clone` pede senha** → use o token `ghp_…` (Telegram) como senha.

**No Windows o `npx vite` abre no navegador errado** → use `npx vite --config vite.web.config.ts` e abra `http://localhost:5173/` manualmente.

**Site abre mas tudo vazio** → projeto pausou → seção 9/COLINHA.md, "Restore project". Se **local**: seletor de ano → **2026**.

**Agente pede credencial** → dê só o que estiver no Telegram (token GitHub); nunca a `service_role`.

---

## 12. Resumo final

1. Clone o repo → `controle-pessoal-saas`
2. `npm i -g @opencode/cli` → `opencode --version`
3. No projeto: `opencode` (terminal) **ou** `opencode pair` (web) **ou** app desktop
4. `/connect` → seu provedor → pronto
5. Para mexer no site: peça em português → revise → `git push`
6. Siga o lembrete semanal para o Supabase não pausar
