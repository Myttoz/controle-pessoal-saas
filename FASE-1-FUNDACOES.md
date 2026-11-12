# FASE 1 — Fundações (passo a passo)

> Crie as contas e projetos. Eu (agente) não consigo fazer isso por você,
> mas siga o roteiro abaixo e me avise quando terminar.

---

## 1. Criar o projeto no Supabase

1. Acesse **https://supabase.com** e clique em **"Start your project"**.
2. Entre com sua conta Google (ou e-mail).
3. Crie uma **organização** (pode usar a padrão).
4. Clique em **"New project"** e preencha:
   - **Name:** `controle-pessoal-saas`
   - **Database Password:** crie uma senha forte e **anote** (você vai precisar).
   - **Region:** escolha a mais próxima (ex.: **South America — São Paulo**).
   - Clique em **"Create new project"**.
5. Aguarde ~2 minutos até o projeto ficar pronto.
6. Vá em **Project Settings > API** e copie:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **Anon public key:** `eyJ...` (essa chave é pública, pode ficar no frontend)
   - ⚠️ **NÃO compartilhe a `service_role key`** — ela é secreta e só uso em scripts.

---

## 2. Criar o projeto no Google Cloud (login com Google)

1. Acesse **https://console.cloud.google.com**.
2. No topo, clique no seletor de projeto > **"Novo projeto"**.
3. Nome: `controle-pessoal-saas` > **Criar**.
4. No menu lateral, vá em **"APIs e serviços" > "Tela de permissão OAuth"**.
5. Configure:
   - **User Type:** **Externo**
   - **Nome do app:** `Controle Pessoal`
   - **E-mail de suporte:** seu e-mail
   - **Escopos:** adicione `.../auth/userinfo.email` e `.../auth/userinfo.profile`
   - **Usuários de teste:** adicione seu e-mail e o da sua esposa
   - Clique em **"Publicar app"** (Production) para evitar re-login a cada 7 dias
6. Crie a credencial:
   - **"APIs e serviços" > "Credenciais" > "Criar credenciais" > "ID do cliente OAuth"**
   - **Tipo de aplicativo:** **Aplicativo da Web**
   - **Nome:** `Controle Pessoal Web`
   - **Origens JavaScript autorizadas:**
     - `https://xxxxx.supabase.co` (sua URL do Supabase)
     - `http://localhost:5173` (desenvolvimento local)
   - **URIs de redirecionamento autorizados:**
     - `https://xxxxx.supabase.co/auth/v1/callback`
   - Clique em **"Criar"** e copie o **Client ID** e o **Client Secret**.

---

## 3. Configurar o login com Google no Supabase

1. No Supabase, vá em **Authentication > Providers**.
2. Em **Google**, ative o provedor.
3. Cole o **Client ID** e o **Client Secret**.
4. Clique em **Save**.

---

## 4. Configurar o login com e-mail/senha

1. Em **Authentication > Providers > Email**, ative.
2. Para simplificar o teste, você pode **desativar** "Confirm email" (não recomendado para produção).
3. O envio de e-mails usa o serviço padrão do Supabase (com limite no free tier).

---

## 5. Configurar as URLs de redirecionamento

1. Em **Authentication > URL Configuration**:
   - **Site URL:** `http://localhost:5173` (desenvolvimento) — depois troca para a URL do GitHub Pages.
   - **Redirect URLs:** adicione `http://localhost:5173/**` e a URL do Pages quando publicar.

---

## 6. Criar o repositório no GitHub

1. Acesse **https://github.com/new**.
2. **Repository name:** `controle-pessoal-saas`
3. **Public** (obrigatório para o GitHub Pages grátis).
4. **NÃO** marque "Add a README" (já temos arquivos).
5. Clique em **Create repository**.
6. Me avise o nome/URL para eu adicionar o remote e enviar o código.

---

## 7. Me passar as informações

Depois de criar tudo, me envie:

- **Project URL** do Supabase
- **Anon public key**
- Confirmação de que o login com Google e e-mail funcionam
- **User UUID** do seu usuário (aparece em **Authentication > Users**, ou eu pego via SQL)

Com isso, seguimos para a **Fase 2 (banco de dados)** e depois para a **migração da 2026**.

---

## Dúvidas comuns

- **"O Supabase pode pausar?"** — O projeto free pode pausar após ~1 semana sem uso. Para 2 pessoas usando quase todo dia, não costuma acontecer. Se acontecer, é só acordar no painel.
- **"O Google OAuth expira?"** — Em modo de teste, o refresh token expira em 7 dias. Publicando o app (Production) e usando escopos simples, não expira.
- **"Posso usar a mesma conta Google do app antigo?"** — Sim, mas o projeto é separado. O app antigo continua intacto.
