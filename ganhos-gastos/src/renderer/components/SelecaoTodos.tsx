/**
 * Bolinha de "selecionar todos os visíveis" para cabeçalhos de tabelas.
 * Marca/desmarca tudo que está visível; preserva seleção de itens fora do filtro.
 */
import { CheckCircle2, Circle, CircleDashed } from 'lucide-react';

export function SelecaoTodos({
  visiveis,
  selecionados,
  aoDefinirSelecao,
}: {
  /** ids de registros VISÍVEIS no momento */
  visiveis: (number | string)[];
  selecionados: (number | string)[];
  aoDefinirSelecao: (ids: (number | string)[]) => void;
}) {
  const qtdSel = visiveis.filter((id) => selecionados.includes(id)).length;
  const todos = visiveis.length > 0 && qtdSel === visiveis.length;
  const alguns = qtdSel > 0 && !todos;

  return (
    <span className="flex justify-center">
    <button
      type="button"
      onClick={() => {
        if (todos) {
          aoDefinirSelecao(selecionados.filter((id) => !visiveis.includes(id)));
        } else {
          aoDefinirSelecao([...new Set([...selecionados, ...visiveis])]);
        }
      }}
      aria-label={todos ? 'Desmarcar todos os visíveis' : 'Selecionar todos os registros visíveis'}
      title={todos ? 'Desmarcar todos os visíveis' : 'Selecionar todos os registros visíveis'}
      className="rounded-full p-0.5"
    >
      {todos ? (
        <CheckCircle2 className="h-4 w-4 text-sky-400" />
      ) : alguns ? (
        <CircleDashed className="h-4 w-4 text-sky-400" />
      ) : (
        <Circle className="h-4 w-4 text-slate-500 hover:text-slate-300" />
      )}
    </button>
    </span>
  );
}
