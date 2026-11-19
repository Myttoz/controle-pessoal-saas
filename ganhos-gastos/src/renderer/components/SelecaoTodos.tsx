/**
 * Checkbox de "selecionar todos os visíveis" para cabeçalhos de tabelas
 * (Lançamentos e Horas Extras). Marca/desmarca tudo que está visível;
 * preserva seleção de itens fora do filtro atual.
 */
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
    <input
      type="checkbox"
      checked={todos}
      ref={(el) => {
        if (el) el.indeterminate = alguns;
      }}
      onChange={() => {
        if (todos) {
          aoDefinirSelecao(selecionados.filter((id) => !visiveis.includes(id)));
        } else {
          aoDefinirSelecao([...new Set([...selecionados, ...visiveis])]);
        }
      }}
      aria-label="Selecionar todos os registros visíveis"
      title="Selecionar todos os registros visíveis"
      className="h-4 w-4 cursor-pointer accent-sky-500"
    />
  );
}
