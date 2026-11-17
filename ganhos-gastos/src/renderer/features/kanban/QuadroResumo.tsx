/**
 * QUADRO DE RESUMO MENSAL — genérico, usado nas duas abas de conferência:
 *
 *  - "Resumo Mensal Tipo"      → colunas por TIPO de pagamento (PIX, Boleto…)
 *  - "Resumo Mensal Categoria" → colunas por CATEGORIA (Mercado, Saúde…)
 *
 * Regras (pedido do usuário):
 *  - Só aparecem colunas com pelo menos 1 lançamento no mês (ex.: "Folha de
 *    pagamento" some quando não há nada lançado nela).
 *  - O rodapé mostra o total de CADA coluna visível; o "Total geral" soma
 *    todas as colunas (sem contar a coluna espelho "Despesas Livia", que
 *    apenas repete lançamentos que também estão nas colunas de tipo).
 *  - Arrastar um cartão entre colunas altera o TIPO/CATEGORIA do lançamento.
 */
import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { GripVertical, SquareKanban, type LucideIcon } from 'lucide-react';
import {
  LISTAS,
  type DadosMensais,
  type LancamentoMensal,
  type Registro,
} from '@/types/api-types';
import { BadgeCategoria } from '@/components/BadgeCategoria';
import { AreaErro, Carregando, EstadoVazio } from '@/components/Estados';
import { MesTabs } from '@/components/MesTabs';
import { arredondar2, formatarMoeda } from '@/lib/formatar';
import { useRegistrosFiltrados } from '@/hooks/useRegistrosFiltrados';
import { useStoreAno } from '@/store/storeAno';
import { useStoreUI } from '@/store/storeUI';

export type DimensaoQuadro = 'TIPO' | 'CATEGORIA';

const UNIVERSO: Record<DimensaoQuadro, readonly string[]> = {
  TIPO: LISTAS.TIPO,
  CATEGORIA: LISTAS.CATEGORIA,
};

// ---------------------------------------------------------------------------
//  Quem paga — ajuda a filtrar registros da coluna espelho "Despesas Livia"
// ---------------------------------------------------------------------------
function éDespesaLivia(d: LancamentoMensal): boolean {
  return d['QUEM PAGA'] === 'Dividido 50/50' || d['QUEM PAGA'] === 'Livia';
}

function totalDe(registros: Registro<LancamentoMensal>[]): number {
  return arredondar2(
    registros.reduce((soma, r) => soma + (Number(r.dados.VALOR) || 0), 0),
  );
}

// ---------------------------------------------------------------------------
//  Cartão (arrastável)
// ---------------------------------------------------------------------------
function Cartao({ registro }: { registro: Registro<LancamentoMensal> }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `reg-${registro.linha}`,
    data: { registro },
  });

  const d = registro.dados;
  const estilo = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ ...estilo, touchAction: 'none' }}
      {...listeners}
      {...attributes}
      className={`group cursor-grab select-none rounded-lg border border-slate-700/80 bg-slate-800/80 p-2.5 transition hover:border-slate-600 hover:bg-slate-800 active:cursor-grabbing ${
        isDragging ? 'z-10 opacity-40 ring-2 ring-sky-500' : ''
      }`}
      title="Arraste para outra coluna"
    >
      <div className="flex items-start justify-between gap-2">
        <BadgeCategoria categoria={d.CATEGORIA} />
        <span className="flex items-center gap-1">
          <span className="text-sm font-semibold tabular-nums text-slate-100">
            {formatarMoeda(d.VALOR)}
          </span>
          <GripVertical className="h-3.5 w-3.5 text-slate-600 transition group-hover:text-slate-400" />
        </span>
      </div>
      <p className="mt-1.5 truncate text-sm text-slate-300" title={d.DESCRIÇÃO}>
        {d.DESCRIÇÃO || '—'}
      </p>
      <p className="mt-1 truncate text-[11px] text-slate-500">
        {d['FORMA DE PGTO']} · {d['QUEM PAGA']}
        {d.DATA ? ` · ${d.DATA.split('-').reverse().join('/')}` : ''}
      </p>
      {d.OBSERVAÇÃO && (
        <p className="mt-1 truncate text-[11px] italic text-slate-500" title={d.OBSERVAÇÃO}>
          Obs.: {d.OBSERVAÇÃO}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Coluna (soltável)
// ---------------------------------------------------------------------------
function Coluna({
  id,
  rotulo,
  registros,
  destacada,
  total,
}: {
  id: string;
  rotulo: string;
  registros: Registro<LancamentoMensal>[];
  destacada: boolean;
  total: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      className={`flex min-h-[280px] flex-col rounded-xl border bg-slate-900/50 transition-colors ${
        isOver ? 'border-sky-500/70 bg-sky-950/20' : destacada ? 'border-slate-700' : 'border-slate-800'
      }`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-200" title={rotulo}>
            {rotulo}
          </h3>
          <p className="text-[11px] text-slate-500">
            {registros.length} registro(s) · {formatarMoeda(total)}
          </p>
        </div>
        <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-xs font-semibold text-slate-400">
          {registros.length}
        </span>
      </header>

      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
        {registros.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-800 px-3 py-6 text-center text-xs text-slate-600">
            Arraste um lançamento para cá
          </p>
        )}
        {registros.map((registro) => (
          <Cartao key={registro.linha} registro={registro} />
        ))}
      </div>

      <footer className="border-t border-slate-800 bg-slate-950/40 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Total
        </p>
        <p className="text-sm font-semibold tabular-nums text-sky-300">
          {formatarMoeda(total)}
        </p>
      </footer>
    </section>
  );
}

// ---------------------------------------------------------------------------
//  Coluna espelho "Despesas Livia" — somente leitura (só na visão por TIPO)
// ---------------------------------------------------------------------------
function ColunaDespesasLivia({
  registros,
  destacada,
  total,
}: {
  registros: Registro<LancamentoMensal>[];
  destacada: boolean;
  total: number;
}) {
  return (
    <section
      className={`flex min-h-[280px] flex-col rounded-xl border bg-slate-900/50 transition-colors ${
        destacada ? 'border-amber-500/70 bg-amber-950/20' : 'border-slate-800'
      }`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-amber-300">Despesas Livia</h3>
          <p className="text-[11px] text-slate-500">
            {registros.length} registro(s) · {formatarMoeda(total)}
          </p>
        </div>
        <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-xs font-semibold text-amber-400">
          {registros.length}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
        {registros.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-800 px-3 py-6 text-center text-xs text-slate-600">
            Sem despesas da Livia neste mês
          </p>
        )}
        {registros.map((registro) => (
          <Cartao key={registro.linha} registro={registro} />
        ))}
      </div>

      <footer className="border-t border-slate-800 bg-amber-950/10 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500/80">
          Total (espelho)
        </p>
        <p className="text-sm font-semibold tabular-nums text-amber-300">
          {formatarMoeda(total)}
        </p>
        <p className="text-[10px] text-slate-600">
          Espelho — aparece também nas outras colunas e não entra no Total geral
        </p>
      </footer>
    </section>
  );
}

// ---------------------------------------------------------------------------
//  Rodapé com o total de CADA coluna visível + Total geral
// ---------------------------------------------------------------------------
function RodapeColunas({
  colunas,
  totals,
  espelho,
  totalGeral,
}: {
  colunas: { id: string; rotulo: string; registros: Registro<LancamentoMensal>[] }[];
  totals: Map<string, number>;
  espelho: { registros: Registro<LancamentoMensal>[]; total: number } | null;
  totalGeral: number;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-3 pb-0.5">
        {espelho && (
          <div
            className="w-44 shrink-0 rounded-xl border border-amber-900/60 bg-amber-950/20 px-4 py-3"
            title="Espelho dos lançamentos 'Dividido 50/50' e 'Livia' — não entra no Total geral"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">
              Despesas Livia
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-amber-300">
              {formatarMoeda(espelho.total)}
            </p>
            <p className="text-[10px] text-slate-600">
              {espelho.registros.length} registro(s) · espelho
            </p>
          </div>
        )}

        {colunas.map((coluna) => (
          <div
            key={coluna.id}
            className="w-44 shrink-0 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3"
            title={coluna.rotulo}
          >
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {coluna.rotulo}
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-slate-100">
              {formatarMoeda(totals.get(coluna.id) ?? 0)}
            </p>
            <p className="text-[10px] text-slate-600">
              {coluna.registros.length} registro(s)
            </p>
          </div>
        ))}

        <div className="w-44 shrink-0 rounded-xl border border-emerald-900/60 bg-emerald-950/20 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
            Total geral
          </p>
          <p className="mt-1 text-base font-semibold tabular-nums text-emerald-300">
            {formatarMoeda(totalGeral)}
          </p>
          <p className="text-[10px] text-slate-600">soma de todas as colunas</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Página completa do quadro
// ---------------------------------------------------------------------------
export function QuadroResumo({
  dimensao,
  comEspelhoLivia = false,
  icone: Icone = SquareKanban,
  dica,
  descricaoVazia,
}: {
  dimensao: DimensaoQuadro;
  /** Coluna espelho "Despesas Livia" (somente leitura) — usada na visão por TIPO. */
  comEspelhoLivia?: boolean;
  icone?: LucideIcon;
  /** Texto de ajuda ao lado do seletor de mês. */
  dica: string;
  descricaoVazia: string;
}) {
  const { ano, mes, mesSnapshot, aba } = useRegistrosFiltrados();
  const snapshot = useStoreAno((s) =>
    s.anoSelecionado != null ? s.snapshots[s.anoSelecionado] : undefined,
  );
  const carregando = useStoreAno((s) => s.carregando);
  const erro = useStoreAno((s) => s.erro);
  const revalidar = useStoreAno((s) => s.revalidar);
  const editarLancamento = useStoreAno((s) => s.editarLancamento);
  const setMes = useStoreUI((s) => s.setMes);

  const [arrastando, setArrastando] = useState(false);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const registros = mesSnapshot?.registros ?? [];

  // Agrupa pelos valores da dimensão que EXISTEM no mês, na ordem das listas
  // oficiais; valores fora da lista aparecem ao final, em ordem alfabética.
  const colunas = useMemo(() => {
    const mapa = new Map<string, Registro<LancamentoMensal>[]>();
    for (const registro of registros) {
      const bruto = String(registro.dados[dimensao] ?? '').trim();
      const chave = bruto || '(vazio)';
      const lista = mapa.get(chave);
      if (lista) lista.push(registro);
      else mapa.set(chave, [registro]);
    }

    const universo = UNIVERSO[dimensao];
    const resultado: { id: string; rotulo: string; registros: Registro<LancamentoMensal>[] }[] = [];

    for (const valor of universo) {
      const lista = mapa.get(valor);
      if (lista?.length) resultado.push({ id: valor, rotulo: valor, registros: lista });
    }
    for (const [valor, lista] of [...mapa.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], 'pt-BR'),
    )) {
      if (!universo.includes(valor)) resultado.push({ id: valor, rotulo: valor, registros: lista });
    }
    return resultado;
  }, [registros, dimensao]);

  const totals = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const coluna of colunas) mapa.set(coluna.id, totalDe(coluna.registros));
    return mapa;
  }, [colunas]);

  const totalGeral = useMemo(
    () => arredondar2([...totals.values()].reduce((s, v) => s + v, 0)),
    [totals],
  );

  // espelhos "Dividido 50/50" + "Livia" (somente na visão por TIPO)
  const espelho = useMemo(() => {
    if (!comEspelhoLivia) return null;
    const lista = registros.filter((r) => éDespesaLivia(r.dados));
    return { registros: lista, total: totalDe(lista) };
  }, [registros, comEspelhoLivia]);

  const aoIniciar = (evento: DragStartEvent) => {
    setArrastando(!!evento.active);
  };

  const aoTerminar = (evento: DragEndEvent) => {
    setArrastando(false);
    const { active, over } = evento;
    if (!over || ano == null || !aba) return;

    const registro = active.data.current?.registro as Registro<LancamentoMensal> | undefined;
    if (!registro) return;

    const novoValor = String(over.id);
    if (!colunas.some((c) => c.id === novoValor)) return;
    if (novoValor === registro.dados[dimensao]) return;

    // atualização otimista: muda no cliente na hora e grava em segundo plano
    void editarLancamento(ano, aba, registro.linha, {
      [dimensao]: novoValor,
    } as DadosMensais);
  };

  if (!snapshot) {
    if (carregando) return <Carregando />;
    if (erro) return <AreaErro mensagem={erro} aoTentar={() => void revalidar()} />;
    return <EstadoVazio titulo="Sem dados carregados" descricao="Não foi possível carregar o ano." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MesTabs meses={snapshot.meses} selecionado={mes} aoSelecionar={setMes} />
        <p className="text-xs text-slate-500">
          {dica}
        </p>
      </div>

      {!aba ? (
        <EstadoVazio
          icone={Icone}
          titulo={`A aba do mês ${mes} não existe em ${snapshot.ano}`}
          descricao="Escolha outro mês para montar o quadro."
        />
      ) : registros.length === 0 ? (
        <EstadoVazio
          icone={Icone}
          titulo={`Sem lançamentos em ${mes}/${snapshot.ano}`}
          descricao={descricaoVazia}
        />
      ) : (
        <>
          <DndContext
            sensors={sensores}
            collisionDetection={closestCorners}
            onDragStart={aoIniciar}
            onDragEnd={aoTerminar}
            onDragCancel={() => setArrastando(false)}
          >
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
            >
              {espelho && (
                <ColunaDespesasLivia
                  registros={espelho.registros}
                  destacada={arrastando}
                  total={espelho.total}
                />
              )}
              {colunas.map((coluna) => (
                <Coluna
                  key={coluna.id}
                  id={coluna.id}
                  rotulo={coluna.rotulo}
                  registros={coluna.registros}
                  destacada={arrastando}
                  total={totals.get(coluna.id) ?? 0}
                />
              ))}
            </div>
          </DndContext>

          {/* ------- rodapé: total de cada coluna visível + total geral ------- */}
          <RodapeColunas
            colunas={colunas}
            totals={totals}
            espelho={espelho}
            totalGeral={totalGeral}
          />
        </>
      )}

      {erro && (
        <p className="text-xs text-amber-400">Última sincronização falhou: {erro}</p>
      )}
    </div>
  );
}
