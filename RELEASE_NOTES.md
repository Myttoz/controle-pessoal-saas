# Controle Pessoal — v3.1.1

Patch de segurança e utilitários sobre a v3.1.0. **Sem alteração destrutiva de banco.**

## Segurança (duplo clique)

- Adicionado guard de reentrância nas escritas do `storeAno` (`executarEscrita`, `revalidar`, `adicionarLancamento`, `adicionarExtra`, `criarNovoAno`, `excluirAno`, `gerarDashboard`) — evita duplicação de lançamentos/serviços/anos por cliques rápidos.
- Guards de reentrância com `useRef` em todos os formulários de gravação (`FormLancamento`, `FormHoraExtra`, `FormFerias`, `FormManutencao`, `LoginPage`, `RecuperarSenhaPage`, `AnexosCampo`, `ImportacaoPage`).
- Leitura fresca do store (`getState()`) em `ConciliacaoPage`, `AlertasBoletos` e `OpcoesPage`, evitando closures stale.
- Unificada a entrada de salvamento da observação em `TabelaLancamentos` (Enter ou blur, nunca as duas).
- `CampoEditavel` (Resumo Pagamentos) passa a salvar só no blur.
- Ponto eletrônico: cancelamento do timeout de "Lançado!" e guard de reentrância.
- `RecorrentesLembretes` e `OpcoesPage` com guard de duplicata via `getState()`.

## Utilitários (PDF → CSV)

- Novos scripts em `scripts/`: `pdf2csv.py` (extrato do Mercado Pago → CSV), `converterpdf` e `desprotegerpdf` (atalhos), `gerar_feed.py` (feed RSS).
- `scripts/USO-EM-OUTRO-PC.txt` com tutorial completo para rodar em outro PC (Linux/Windows).

## Feed RSS

- Feeds `releases.rss` e `releases.xml` publicados no GitHub Pages.
- Workflow de release atualiza e publica o feed; workflow de deploy copia para o site.

## Visual (slim)

- Explicações de cálculo e textos auxiliares escondidos em tooltips por todo o app; paddings/gaps reduzidos, sem alterar cores, bordas ou formatos.
- Correções de alinhamento em Horas Extras, Conciliação, Lançamentos, Gestão Anual e Importação CSV.

## Como atualizar

`master` é produção. Após o push, o deploy do Pages acontece automaticamente — faça hard refresh (Ctrl+Shift+R) no app.
