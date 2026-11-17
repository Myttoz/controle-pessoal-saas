/**
 * RESUMO MENSAL TIPO — quadro por tipo de pagamento (PIX, Boleto, Fatura
 * futura, Folha de pagamento…).
 *
 * Colunas aparecem apenas quando o mês tem ao menos 1 lançamento nelas;
 * o rodapé mostra o total de cada coluna visível e o total geral.
 * Inclui a coluna espelho "Despesas Livia" (Dividido 50/50 + Lívia).
 */
import { SquareKanban } from 'lucide-react';
import { QuadroResumo } from './QuadroResumo';

export function KanbanPage() {
  return (
    <QuadroResumo
      dimensao="TIPO"
      comEspelhoLivia
      icone={SquareKanban}
      dica="Arraste os cartões entre colunas para alterar o TIPO do lançamento."
      descricaoVazia="Os lançamentos cadastrados no mês aparecem aqui, agrupados por tipo de pagamento."
    />
  );
}
