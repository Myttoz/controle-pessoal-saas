# Controle Pessoal — v3.0.0

Release de funcionalidades novas e revisão do painel de conferência. **Sem alteração destrutiva de banco**: todos os novos campos locais são aditivos e reversíveis.

## Importação CSV (nova aba em Conferência)

- Leitura de extratos CSV (detecção de delimitador, BOM UTF-8 e valores em pt-BR).
- **Matching inteligente**: cruza data, valor, estabelecimento e observações já anotadas para sugerir vínculo com lançamentos existentes — útil para nomes genéricos (ex.: “Mercado Pago”).
- **Comparação lado a lado**: lançamentos mensais × extrato importado, com scroll sincronizado, filtros/ordenação por cabeçalho e destaque em âmbar nas divergências.
- **Seleção cruzada**: clicar numa linha destaca a correspondente na outra tabela.
- **Gravação segura**: só linhas marcadas como *Novo* viram lançamentos, com defaults configuráveis (categoria, forma de pagamento, tipo, quem paga) e confirmação explícita. Linhas já importadas são ignoradas ao reimportar (anti-duplicado).
- Filtro por mês, ações em lote e botão “Limpar tudo”. O estado da aba persiste ao trocar de página.

## Conferência e conferência financeira

- **Conciliação completa**: marcação de conferido por lançamento, filtros/ordenação por coluna e limpeza por escopo.
- **Relatório IR / Contador** com filtros de cabeçalho na tabela de PIX, impressão corrigida e exportação CSV.
- **Alertas de vencimento** para `Forma de Pgto = Boleto`, com opção **Pago** para ocultar itens quitados.
- **Comparativo mês a mês / ano a ano** no Dashboard.
- **Orçamento e alertas inteligentes** (reversíveis, desligáveis em Sincronização e Backup).
- **Anexos** em lançamentos e manutenção, inclusive no cadastro novo (opcional).
- **Recorrência e parcelas** com quantidade escolhida pelo usuário; **projeção de saldo**; filtro rápido 50/50 + Lívia; data atual preenchida automaticamente no novo lançamento.

## Correção do “Restante”

O restante exibido em Lançamentos segue agora a regra definida pelo usuário:

`Total Ganho(mês) − Fatura(mês anterior) + Recebo Lívia(mês anterior) − PIX real(mês)`

O PIX considera o **total real** (PIX − parte da Lívia dentro da seleção PIX). Os detalhes do cálculo ficam em tooltip.

## Interface

- Explicações de cálculo e textos auxiliares movidos para tooltips, deixando as telas mais enxutas.
- Campos “Despesas próximo mês” passam a salvar ao sair do campo, evitando sobrescrever a digitação durante a sincronização.
- Ajustes de alinhamento, altura de painéis e tabelas.

## Como atualizar

`master` é produção. Após o push, o deploy do Pages acontece automaticamente — faça hard refresh (Ctrl+Shift+R) no app.
