import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Botao } from '@/components/Botoes';
import { formatarMoeda } from '@/lib/formatar';
import { NOMES_MESES, SIGLAS } from '@/lib/meses';
import { useStoreAno } from '@/store/storeAno';
import type { SiglaMes } from '@/types/api-types';

function Delta({ atual, anterior }: { atual: number; anterior: number }) {
  const diff = atual - anterior;
  const pct = anterior !== 0 ? (diff / Math.abs(anterior)) * 100 : null;
  if (Math.abs(diff) < 0.01) return <span className="inline-flex items-center gap-1 text-slate-400"><Minus className="h-3.5 w-3.5" /> 0%</span>;
  const up = diff > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const cor = up ? 'text-rose-300' : 'text-emerald-300';
  return (
    <span className={`inline-flex items-center gap-1 ${cor}`}>
      <Icon className="h-3.5 w-3.5" />
      {formatarMoeda(Math.abs(diff))}{pct != null ? ` (${Math.abs(pct).toFixed(1)}%)` : ''}
    </span>
  );
}

export function Comparativo() {
  const ano = useStoreAno((s) => s.anoSelecionado);
  const anos = useStoreAno((s) => s.anos);
  const snapshot = useStoreAno((s) => (ano != null ? s.snapshots[ano] : undefined));
  const snapshots = useStoreAno((s) => s.snapshots);
  const revalidar = useStoreAno((s) => s.revalidar);
  const [anoCmp, setAnoCmp] = useState<number | ''>('');

  const mesesAtual = useMemo(() => {
    const mapa = new Map<SiglaMes, number>();
    for (const m of snapshot?.resumo?.meses ?? []) mapa.set(m.mes, Number(m.total) || 0);
    return SIGLAS.map((sigla) => ({ sigla, total: mapa.get(sigla) ?? 0 }));
  }, [snapshot]);

  const totalAno = mesesAtual.reduce((s, m) => s + m.total, 0);

  const snapCmp = typeof anoCmp === 'number' ? snapshots[anoCmp] : undefined;
  const mesesCmp = useMemo(() => {
    const mapa = new Map<SiglaMes, number>();
    for (const m of snapCmp?.resumo?.meses ?? []) mapa.set(m.mes, Number(m.total) || 0);
    return SIGLAS.map((sigla) => ({ sigla, total: mapa.get(sigla) ?? 0 }));
  }, [snapCmp]);
  const totalAnoCmp = mesesCmp.reduce((s, m) => s + m.total, 0);

  if (!snapshot || ano == null) return null;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Comparativo</h3>
          <p className="mt-1 text-xs text-slate-400">Mês a mês (vs mês anterior) e ano a ano (vs outro ano carregado).</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={anoCmp}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : '';
              setAnoCmp(v);
              if (typeof v === 'number' && !snapshots[v]) void revalidar(v);
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Comparar com ano...</option>
            {anos.filter((a) => a !== ano).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {typeof anoCmp === 'number' && !snapCmp && <Botao onClick={() => void revalidar(anoCmp)}>Carregar {anoCmp}</Botao>}
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2">Mês</th>
              <th className="px-3 py-2 text-right">{ano}</th>
              <th className="px-3 py-2 text-right">Vs mês anterior</th>
              {typeof anoCmp === 'number' && <th className="px-3 py-2 text-right">{anoCmp}</th>}
              {typeof anoCmp === 'number' && <th className="px-3 py-2 text-right">Vs {anoCmp}</th>}
            </tr>
          </thead>
          <tbody>
            {mesesAtual.map((m, i) => {
              const anterior = i > 0 ? mesesAtual[i - 1].total : null;
              const cmp = typeof anoCmp === 'number' ? mesesCmp[i]?.total ?? 0 : null;
              return (
                <tr key={m.sigla} className="border-b border-slate-800/60 text-slate-300">
                  <td className="px-3 py-2">{NOMES_MESES[m.sigla]}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(m.total)}</td>
                  <td className="px-3 py-2 text-right">{anterior == null ? <span className="text-slate-500">—</span> : <Delta atual={m.total} anterior={anterior} />}</td>
                  {cmp != null && <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(cmp)}</td>}
                  {cmp != null && <td className="px-3 py-2 text-right"><Delta atual={m.total} anterior={cmp} /></td>}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-950/60 font-semibold text-slate-100">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(totalAno)}</td>
              <td className="px-3 py-2 text-right text-slate-500">—</td>
              {typeof anoCmp === 'number' && <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(totalAnoCmp)}</td>}
              {typeof anoCmp === 'number' && <td className="px-3 py-2 text-right"><Delta atual={totalAno} anterior={totalAnoCmp} /></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
