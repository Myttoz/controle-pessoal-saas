import { useMemo } from 'react';
import { AlertTriangle, HeartPulse, ShieldCheck } from 'lucide-react';
import { formatarMoeda } from '@/lib/formatar';
import { useRegistrosFiltrados } from '@/hooks/useRegistrosFiltrados';
import { useStoreLocal } from '@/store/storeLocal';

interface Alerta {
  tipo: 'erro' | 'aviso' | 'ok';
  texto: string;
}

export function SaudeFinanceira() {
  const config = useStoreLocal((s) => s.dados.config);
  const { registros, mes } = useRegistrosFiltrados();

  const ativo = !!config.alertasInteligentesAtivo;
  const orcamentos = config.orcamentosCategoria ?? {};
  const limitePct = typeof config.alertaOrcamentoPercentual === 'number' ? config.alertaOrcamentoPercentual : 80;

  const analise = useMemo(() => {
    const gastoPorCat: Record<string, number> = {};
    for (const r of registros) {
      const cat = r.dados.CATEGORIA || 'Outros';
      gastoPorCat[cat] = (gastoPorCat[cat] ?? 0) + (Number(r.dados.VALOR) || 0);
    }
    const linhas = Object.entries(orcamentos)
      .filter(([, v]) => Number(v) > 0)
      .map(([cat, orcado]) => {
        const gasto = gastoPorCat[cat] ?? 0;
        const pct = orcado > 0 ? (gasto / orcado) * 100 : 0;
        return { cat, orcado, gasto, pct };
      })
      .sort((a, b) => b.pct - a.pct);

    const alertas: Alerta[] = [];
    for (const l of linhas) {
      if (l.pct >= 100) alertas.push({ tipo: 'erro', texto: `${l.cat}: ${formatarMoeda(l.gasto)} de ${formatarMoeda(l.orcado)} (${l.pct.toFixed(0)}% do orçamento).` });
      else if (l.pct >= limitePct) alertas.push({ tipo: 'aviso', texto: `${l.cat}: ${formatarMoeda(l.gasto)} de ${formatarMoeda(l.orcado)} (${l.pct.toFixed(0)}% — limite de alerta ${limitePct}%).` });
    }
    if (linhas.length === 0) alertas.push({ tipo: 'ok', texto: 'Nenhum orçamento por categoria definido. Configure em Sincronização e Backup > Orçamento e alertas.' });
    else if (alertas.length === 0) alertas.push({ tipo: 'ok', texto: 'Todas as categorias orçadas estão dentro do limite configurado.' });

    const totalOrcado = linhas.reduce((s, l) => s + l.orcado, 0);
    const totalGastoOrcado = linhas.reduce((s, l) => s + l.gasto, 0);
    return { linhas, alertas, totalOrcado, totalGastoOrcado };
  }, [registros, orcamentos, limitePct]);

  if (!ativo) return null;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2">
        <HeartPulse className="h-4 w-4 text-sky-300" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Saúde financeira e alertas</h3>
        <span className="text-xs text-slate-500">({mes})</span>
      </div>
      <p className="mt-1 text-xs text-slate-400 hidden" title="Reversível — desative em Sincronização e Backup. Orçamentos comparados com gastos do mês selecionado.">Saúde financeira</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Total orçado</p>
          <p className="text-lg font-semibold text-slate-100">{formatarMoeda(analise.totalOrcado)}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Gasto nas categorias orçadas</p>
          <p className="text-lg font-semibold text-slate-100">{formatarMoeda(analise.totalGastoOrcado)}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Alertas</p>
          <p className="text-lg font-semibold text-slate-100">{analise.alertas.filter((a) => a.tipo !== 'ok').length}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {analise.alertas.map((a, i) => (
          <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
            a.tipo === 'erro' ? 'border-rose-800/60 bg-rose-500/10 text-rose-200'
            : a.tipo === 'aviso' ? 'border-amber-700/50 bg-amber-500/10 text-amber-200'
            : 'border-emerald-800/50 bg-emerald-500/10 text-emerald-200'
          }`}>
            {a.tipo === 'ok' ? <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
            <span>{a.texto}</span>
          </div>
        ))}
      </div>

      {analise.linhas.length > 0 && (
        <div className="mt-4 overflow-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Categoria</th>
                <th className="px-3 py-2 text-right">Orçado</th>
                <th className="px-3 py-2 text-right">Gasto</th>
                <th className="px-3 py-2 text-right">Uso</th>
              </tr>
            </thead>
            <tbody>
              {analise.linhas.map((l) => (
                <tr key={l.cat} className="border-b border-slate-800/60 text-slate-300">
                  <td className="px-3 py-2">{l.cat}</td>
                  <td className="px-3 py-2 text-right">{formatarMoeda(l.orcado)}</td>
                  <td className="px-3 py-2 text-right">{formatarMoeda(l.gasto)}</td>
                  <td className={`px-3 py-2 text-right font-medium ${l.pct >= 100 ? 'text-rose-300' : l.pct >= limitePct ? 'text-amber-300' : 'text-emerald-300'}`}>{l.pct.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
