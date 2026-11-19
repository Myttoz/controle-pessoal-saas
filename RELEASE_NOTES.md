# Controle Pessoal — v2.1.0

Release de funcionalidades (minor) sobre a v2.0.0. Sem mudança de banco.

## Novidades

- **Despesas próximo mês** (Lançamentos): quadro de planejamento manual com **Fatura cartão** e **Despesas Pix** — o valor que você vai pagar ao receber o salário no mês seguinte (ex.: no novembro, o que será pago em dezembro). Persistido por mês, sincroniza na nuvem.
- **Seleção em lote nos Lançamentos**: caixa de seleção na primeira coluna (com "selecionar todos os visíveis"); o rodapé passa a mostrar a soma somente dos itens selecionados ("N de M registro(s) selecionado(s) · R$ X"), igual ao comportamento da busca.
- **Manutenção com busca livre**: o campo de busca agora cobre TODAS as colunas (descrição, data, km, valor, oficina, loja de peças, intervalos, status).
- **Lembretes fixos (recorrentes)** na aba Lembretes: lembretes que reaparecem sozinhos (ex.: “Backup da pasta do projeto” a cada 15 dias, já semeado); no dia do vencimento, um aviso chamativo dispara às 09h, 16h e 20h (botão X, some em 5s) até você marcar como concluído.
- **Duplicar lançamento** agora mantém você na mesma tela (não navega mais para o mês seguinte).
- **Login**: removida a opção "Criar conta" da tela de entrada — apenas Entrar e Entrar com Google.

## Manutenção

- Fluxo de release simplificado: `RELEASE_NOTES.md` lido no workflow `release.yml` (sem editar nada no site).
- `MIRROR-PAGES.txt` no repositório: passo a passo para um mirror gratuito no Cloudflare Pages.
- Colinha §4.1 (release) e §8 (checklist de manutenção/segurança) atualizadas.

## Como atualizar

`master` é produção. Após o push no master, o deploy do Pages acontece automaticamente — hard refresh (Ctrl+Shift+R) no app.
