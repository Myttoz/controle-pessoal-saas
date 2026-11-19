# Controle Pessoal — v2.2.0

Release de funcionalidades (minor) sobre a v2.1.0. Sem mudança de banco.

## Novidades

- **Cabeçalho e rodapé fixos nas tabelas** (Lançamentos): a tabela rola na própria área interna com **cabeçalho sticky** (topo) e **rodapé sticky** (fundo) — os totais do mês ficam sempre visíveis.
- **Rodapé da tabela de Lançamentos**: agora faixa fixa no fundo do card — registros/selecionados · Total Gasto · Recebo Lívia · Total Real · Gastos próximo mês.

## Horas Extras

- **Seleção em lote**: caixas de seleção nas linhas de plantões e no ponto eletrônico (com "selecionar todos os visíveis" no cabeçalho); o rodapé soma **somente os selecionados**.

## Manutenção

- **Rodapé de 1 linha**: mostra a **manutenção mais próxima** (data, km, oficina, peças, próxima revisão e status) + **total geral** (soma de todas) em cor levemente diferente.

## Resumo Mensal

- **Cabeçalho e rodapé fixos** (abas de mês + totais) durante a rolagem.

## Como atualizar

`master` é produção. Após o push no master, o deploy do Pages acontece automaticamente — hard refresh (Ctrl+Shift+R) no app.
