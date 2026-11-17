/**
 * RESUMO MENSAL CATEGORIA — quadro por categoria (Mercado, Saúde, Transporte…).
 *
 * Colunas aparecem apenas com lançamentos no mês; o rodapé mostra o total
 * de cada coluna e a soma de todas.
 */
import { LayoutGrid } from 'lucide-react';
import { QuadroResumo } from './QuadroResumo';

export function KanbanCategoriaPage() {
  return (
    <QuadroResumo
      dimensao="CATEGORIA"
      icone={LayoutGrid}
      dica="Arraste os cartões entre colunas para alterar a CATEGORIA do lançamento."
      descricaoVazia="Os lançamentos cadastrados no mês aparecem aqui, agrupados por categoria."
    />
  );
}
