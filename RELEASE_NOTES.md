# Controle Pessoal — v3.1.0

Release de acabamento e organização sobre a v3.0.0. **Nenhuma mudança destrutiva de banco**: todos os campos novos são aditivos e reversíveis.

## Categorias e opções editáveis (nova aba)

- Nova tela **Categorias e opções** para personalizar Categorias, Formas de pagamento, Tipos e Quem paga.
- **Renomear** troca apenas o rótulo exibido; o valor gravado nos lançamentos permanece o original — nenhum dado histórico é alterado.
- **Desmarcar Ativo** oculta a opção dos formulários sem apagar registros antigos; opções criadas podem ser removidas; **Restaurar** volta ao padrão.

## Importação CSV — acabamento

- Controles do topo alinhados (Tipo, Arquivo, Delimitador e “Primeira linha é cabeçalho” com o mesmo padrão de altura).
- Tabelas lado a lado com scroll sincronizado, seleção cruzada, filtros de cabeçalho e destaque de divergências.
- Gravação segura de novos lançamentos e proteção contra duplicados ao reimportar.

## Conferência e conferência financeira

- Painel **Conferência {mês}** com campo manual **Recebido Lívia**; total = Fatura cartão + Despesas Pix − Recebido Lívia.
- **Conciliação**: busca à direita, meses à esquerda e bolinha para conferir todos no cabeçalho.
- **Relatório IR / Contador**: PIX removido (já vem no extrato anual do banco); restam **Ganhos diversos** e **FREELANCES E SERVIÇOS**, ambos com filtro/ordenação por cabeçalho.
- **Resumo Pagamentos**: “Como funciona” e o texto do rodapé escondidos em tooltip; painel reduzido.
- **Resumo Mensal Tipo/Categoria**: mais linhas visíveis, rodapé fixo e totais duplicados no fim das colunas removidos.
- **Recebidos**: título simplificado para `Salário {ano}` (vale para anos novos).
- **Gestão Anual**: movida para a subcategoria Lançamentos, em ordem alfabética, com input e botão alinhados.

## Lembretes

- Novo aviso (popup/toast) para lembretes com vencimento em até **3 dias**, uma vez por dia, convidando a conferir a aba Lembretes.
- Texto duplicado removido; “Como funciona” ficou em uma linha, com o tutorial completo no tooltip.

## Visual mais enxuto

- Explicações de cálculo, regras e textos auxiliares escondidas em tooltips por todo o app (Dashboard, Férias, Horas Extras, Ganhos, Anos, Importação, Sincronização etc.), sem alterar cores, bordas ou formatos.
- Bolinhas de seleção padronizadas em Lançamentos, Horas Extras e Conciliação, inclusive no cabeçalho.
- Tabelas de Horas Extras alinhadas coluna a coluna (Mês/Data, Horas/H100%, Valor/Total e Ações), com horas no formato `5,32 h`.
- Menos espaçamento vertical em dezenas de painéis; mais conteúdo cabendo na tela.

## Feed RSS

- Feeds `releases.rss` e `releases.xml` publicados no GitHub Pages:
  **https://myttoz.github.io/controle-pessoal-saas/releases.rss**
- Workflow de release atualiza o feed e força o deploy; o workflow de deploy copia os arquivos para o site.
- O widget do StartMe pode apontar para essa URL.

## Como atualizar

`master` é produção. Após o push, o deploy do Pages acontece automaticamente — faça hard refresh (Ctrl+Shift+R) no app.
