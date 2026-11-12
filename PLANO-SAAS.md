# PLANO — Versão SaaS (web) do Controle Pessoal

> Documento de planejamento da versão "SaaS" do app, separada do projeto antigo.
> O projeto antigo (`APP`) permanece intacto e funcional. Este novo projeto
> (`APP Financas`) nasce do zero, reaproveitando os componentes React.

---

## 1. Objetivo e escopo

- **Foco:** somente a **versão web**. Os instaladores (Linux/Windows) ficam congelados.
- **Público inicial:** você e sua esposa (2 usuários), cada um com seus próprios dados.
- **Futuro:** arquitetura pronta para vários clientes (multi-inquilino), caso um dia vá revender.
- **Login:** Google **e** e-mail/senha.
- **Custo alvo:** **R$ 0** no início (free tiers).
- **Desktop:** não entra nesta fase.

---

## 2. Arquitetura proposta

```
┌─────────────────────────────┐
│  GitHub Pages (frontend)    │  ← grátis, repositório público
│  React + Vite + TS          │
└──────────────┬──────────────┘
               │ HTTPS (chave anon)
               ▼
┌─────────────────────────────┐
│  Supabase (backend-as-a-service) │  ← free tier
│  - Postgres (banco)         │
│  - Auth (login)             │
│  - Storage (arquivos)       │
│  - Row Level Security (RLS) │
└─────────────────────────────┘
```

**Ponto-chave:** não vamos subir um servidor backend próprio. O Supabase já entrega
banco + autenticação + segurança por linha (RLS). O frontend fala direto com o Supabase.

**Mudança de modelo de segurança:**
- No app antigo, a `API_KEY` era secreta e o Apps Script injetava no backend.
- No Supabase, a **anon key** é pública por design (fica no frontend). A segurança
  vem das **políticas de RLS**: cada usuário só enxerga as próprias linhas.
- A **service role key** (admin) nunca vai para o frontend — só em scripts server-side.

---

## 3. Modelo de dados (Postgres)

Tabelas principais (nomes em inglês, por convenção):

| Tabela | O que guarda | Colunas-chave |
|---|---|---|
| `tenants` | Clientes/inquilinos (para o futuro) | `id`, `nome`, `plano` |
| `profiles` | Perfil do usuário | `id` (= auth user), `tenant_id`, `nome`, `email` |
| `anos` | Anos de cada usuário | `id`, `user_id`, `ano` |
| `lancamentos` | Lançamentos mensais (ganhos/gastos) | `id`, `user_id`, `ano`, `mes`, `categoria`, `valor`, `descricao`, `forma_pgt`, `tipo`, `quem_paga`, `data`, `observacao` |
| `salarios` | Salário por mês | `id`, `user_id`, `ano`, `mes`, `base`, `decimo_terco`, `ferias`, `ajuda_custo`, `hora_extra`, `outros`, `ticket`, `freelance`, `observacao` |
| `extras` | Ganhos/gastos extras (freelance) | `id`, `user_id`, `ano`, `mes`, `tipo` (ganho/gasto), `categoria`, `descricao`, `valor`, `data` |
| `horas_extras` | Plantões | `id`, `user_id`, `data`, `entrada`, `almoco_inicio`, `almoco_fim`, `saida`, `hora_100`, `hora_50`, `valor_presencial`, `valor_home`, `total` |
| `ferias` | Períodos e retiradas | `id`, `user_id`, `periodo`, `inicio`, `fim`, `dias`, `dias_restantes`, `valor_recebido`, `status`, `observacao` |
| `manutencao` | Manutenção do veículo | `id`, `user_id`, `veiculo`, `data`, `km`, `valor`, `mecanico`, `observacao`, `prox_data`, `prox_km`, `status` |
| `lembretes` | Lembretes | `id`, `user_id`, `titulo`, `descricao`, `data`, `hora`, `ativo` |

**Regras:**
- Todas as tabelas de dados têm `user_id` (e `tenant_id` no futuro).
- Cálculos (13º, 1/3 de férias, totais) ficam no frontend (`calculos.ts`) ou em views SQL.
- A aba `Anual` passa a ser uma **view**/consulta, não uma aba planilhada.

---

## 4. Multi-tenancy e RLS

**Modelo inicial (2 usuários):** isolamento por `user_id`.
**Modelo final (vários clientes):** isolamento por `tenant_id` + `user_id`.

Políticas de RLS (exemplo):

```sql
-- Cada usuário só vê os próprios lançamentos
create policy "lancamentos_select_own"
on lancamentos for select
using (user_id = auth.uid());

create policy "lancamentos_insert_own"
on lancamentos for insert
with check (user_id = auth.uid());
-- ... update/delete idem
```

**Atenção:** RLS mal configurado = vazamento de dados. Vamos testar com 2 usuários
antes de qualquer divulgação.

---

## 5. Fases do projeto

| Fase | O que acontece | Quem faz |
|---|---|---|
| **1. Fundações** | Criar projeto no Supabase (free); projeto no Google Cloud; credenciais OAuth | Você cria as contas; eu escrevo o guia |
| **2. Banco** | Criar tabelas, views e políticas de RLS; popular dados de teste | Eu escrevo o SQL; você roda no painel |
| **3. Auth** | Login com Google + e-mail/senha; rotas protegidas; recuperação de senha | Eu implemento; você testa |
| **4. Adaptador** | Criar `apiSupabase.ts` no lugar do `apiWeb.ts` | Eu implemento |
| **5. Telas** | Reaproveitar as telas React; ajustar formulários para o banco | Eu implemento |
| **6. Migração** | Importar os dados da planilha 2026 (e 2027) para o Postgres | Eu escrevo o script; você roda |
| **7. Deploy** | Publicar no GitHub Pages; configurar variáveis de ambiente | Eu preparo; você aprova |
| **8. Extras** | Exportação/backup, painel admin, hooks de cobrança (futuro) | Conforme a necessidade |

---

## 6. Migração da planilha 2026 (e 2027)

A planilha 2026 tem **estrutura diferente** da planilha 2027 (a que o app usa hoje).
Resumo do que encontramos:

- **Abas mensais** (`Jan 26`…`DEZ 26`) com formatos que evoluíram durante o ano:
  - Jan: 4 colunas (COMPRAS, VALORES, DESCRIÇÃO, DATA)
  - Fev–Jul: 5 colunas (GASTOS, VALORES, DESCRIÇÃO, Forma de PGT, DATA)
  - Ago–Out: 6 colunas (GASTOS, VALORES, ITEM/SERVIÇO, Forma de PGT, DESCRIÇÃO, DATA)
  - Nov–Dez: 8 colunas (igual ao app atual)
- **`Salário 26`:** registro de transações por mês (não é o mesmo layout do `Salário 2027`).
- **`Imp Ganho 26`:** ganhos por mês (freelance, presentes, vendas).
- **`Hora Extra`:** plantões detalhados (já no formato do app).
- **`Férias`:** controle de período (21 dias, 9 restantes, R$ 3.975,44).
- **`Manutenção C4`:** manutenções do carro.
- **`GASTO_REAL` e `2026`:** resumos mensais/anuais.
- Abas ocultas: `Jan 26`…`Set 26`, `Imp Ganho 26`, `Consórcio`, `Modelo Mensal *`, `LISTA MERCADO`, `Manutenção ZR`.

**Plano de importação (a executar depois do SaaS no ar):**
1. Criar as tabelas do SaaS.
2. Script lê o XLSX da 2026 (ou exporta CSV) e gera inserts no Postgres.
3. Mapear colunas por mês (formatos diferentes).
4. Agregar `Salário 26` por mês/categoria.
5. Importar `Hora Extra`, `Férias`, `Manutenção C4`.
6. Validar totais (confrontar com `GASTO_REAL`/`2026`).

---

## 7. Custos (free tier)

| Item | Custo | Observação |
|---|---|---|
| GitHub (repo + Pages) | **R$ 0** | Repositório público; Actions com minutos grátis |
| Supabase (DB + Auth + Storage) | **R$ 0** | Free tier; ~500 MB, 50 mil usuários/mês; **pode pausar após ~1 semana sem uso** |
| Google OAuth | **R$ 0** | Modo de teste para 2 usuários; "produção" sem verificação para escopos simples |
| E-mails (verificação/senha) | **R$ 0** | Limite do free tier; suficiente para 2 pessoas |
| Domínio próprio | Opcional (~R$ 40/ano) | `github.io` é grátis |
| Stripe/Paddle | Não usado agora | Só quando for cobrar |
| SSL | **R$ 0** | Pages e Supabase já têm |

**Riscos do "grátis":**
- O projeto Supabase pode **pausar** se ficar inativo (resolver com uso frequente ou plano pago).
- OAuth em modo de teste pode exigir re-login periódico (resolver publicando o app).
- Free tiers podem mudar de política (acompanhar documentação).

---

## 8. Divisão de tarefas

| Parte | Eu (agente) | Você |
|---|---|---|
| Arquitetura e decisões | Projeto completo | Valida |
| Código do frontend | Escrevo/reviso | Testa no navegador |
| SQL, RLS, migrations | Escrevo os scripts | Cria projeto e roda no painel |
| Auth (Supabase + Google) | Configuro o código | Cria contas e credenciais |
| Migração dos dados | Escrevo o script | Roda e confere |
| Deploy (Pages/Actions) | Atualizo workflow e guias | Aprova e verifica |
| Testes | Escrevo testes, typecheck, build | Testa fluxos reais |
| Contas e cliques em consoles | — | Você |

---

## 9. Decisões já tomadas

- Repositório **novo** (separado do antigo).
- Foco **web**; desktop congelado.
- Login **Google + e-mail/senha**.
- Backend **Supabase** (free), sem servidor próprio.
- Isolamento por **usuário** (multi-inquilino pronto para o futuro).
- Projeto antigo **intacto** em `APP`.

---

## 10. Próximos passos

1. Você cria: conta no Supabase, projeto no Supabase, projeto no Google Cloud.
2. Eu escrevo o guia de criação (Fase 1) e o SQL das tabelas (Fase 2).
3. Você roda os passos; a gente segue fase por fase.
4. Depois que o SaaS estiver no ar, fazemos a **migração da 2026**.

---

## 11. Glossário (para aprender)

- **SaaS:** software como serviço — o app roda na nuvem e o usuário acessa por navegador.
- **BaaS (Backend as a Service):** backend pronto (Supabase), você não gerencia servidor.
- **Postgres:** banco de dados relacional, o mais usado do mundo.
- **RLS (Row Level Security):** regras no banco que limitam o que cada usuário vê.
- **Tenant:** "inquilino" — um cliente/organização no sistema.
- **Multi-tenancy:** um sistema só atendendo vários clientes, com dados isolados.
- **Anon key:** chave pública do Supabase (segura por causa do RLS).
- **Service role key:** chave secreta de administrador (nunca no frontend).
- **OAuth:** login delegado (Google), sem você guardar senha.
- **JWT:** token que o Supabase emite após o login, usado nas requisições.
