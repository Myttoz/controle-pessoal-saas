# Controle Pessoal — v3.1.2

Hotfix sobre a v3.1.1. **Sem alteração destrutiva de banco.**

## Correção: tela azul ao abrir "Novo lançamento"

- Corrigido `ReferenceError: can't access lexical declaration before initialization` (TDZ) no `FormLancamento`.
- O inicializador do `useState` do formulário usava os conversores de rótulo (`rotuloCategoria`, `rotuloForma`, `rotuloTipo`, `rotuloQuem`) antes de eles serem declarados. Como o inicializador roda imediatamente no primeiro render, a referência caía na *temporal dead zone* e o React desmontava a árvore, deixando a tela azul.
- Os hooks de opções/rótulos foram movidos para antes do `useState`; nenhuma mudança de comportamento ou visual.
- Afetava apenas a aba **Lançamentos** (novo lançamento e edição), pois é o único formulário que converte rótulos no estado inicial.

## Como atualizar

`master` é produção. Após o push, o deploy do Pages acontece automaticamente — faça hard refresh (Ctrl+Shift+R) no app.
