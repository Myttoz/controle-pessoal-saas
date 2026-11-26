import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2 } from 'lucide-react';
import { formatarData, formatarMoeda } from '@/lib/formatar';
import { hojeISO } from '@/lib/calculos';
import { NOMES_MESES, SIGLAS } from '@/lib/meses';
import { useStoreAno } from '@/store/storeAno';
import { useStoreLocal } from '@/store/storeLocal';
import { useStoreUI } from '@/store/storeUI';
import type { SiglaMes } from '@/types/api-types';

interface Item {
  chave: string;
  mes: SiglaMes;
  data: string;
  descricao: string;
  valor: number;
  categoria: string;
  dias: number;
  pago: boolean;
}

export function AlertasBoletos() {
  const ano = useStoreAno((s) => s.anoSelecionado);
  const snapshot = useStoreAno((s) => (ano != null ? s.snapshots[ano] : undefined));
  const mesSel = useStoreUI((s) => s.mes);
  const config = useStoreLocal((s) => s.dados.config);
  const setConfig = useStoreLocal((s) => s.setConfig);
  const [escopoAno, setEscopoAno] = useState(false);

  const pagamentos = config.pagamentosBoleto ?? {};

  const todos = useMemo(() => {
    if (!snapshot || ano == null) return [] as Item[];
    const hoje = hojeISO();
    const hojeMs = new Date(hoje + 'T00:00:00').getTime();
    const itens: Item[] = [];
    for (const sigla of SIGLAS) {
      const mes = snapshot.meses[sigla];
      if (!mes) continue;
      for (const r of mes.registros) {
        const d = r.dados;
        if (String(d['FORMA DE PGTO'] ?? '').toLowerCase() !== 'boleto') continue;
        if (!d.DATA) continue;
        const ms = new Date(d.DATA + 'T00:00:00').getTime();
        if (Number.isNaN(ms)) continue;
        const chave = `${ano}:${r.linha}`;
        const pago = !!pagamentos[chave];
        if (pago) continue;
        const dias = Math.round((ms - hojeMs) / 86400000);
        // só mostra vencidos e vencendo em até 7 dias
        if (dias > 7) continue;
        itens.push({ chave, mes: sigla, data: d.DATA, descricao: d.DESCRIÇÃO || '', valor: Number(d.VALOR) || 0, categoria: d.CATEGORIA || '', dias, pago });
      }
    }
    return itens.sort((a, b) => a.data.localeCompare(b.data));
  }, [snapshot, ano, pagamentos]);

  const visiveis = useMemo(() => (escopoAno ? todos : todos.filter((i) => i.mes === mesSel)), [todos, escopoAno, mesSel]);

  const vencidos = visiveis.filter((i) => i.dias < 0);
  const proximos = visiveis.filter((i) => i.dias >= 0);
  const pagosNoMes = useMemo(() => {
    if (!snapshot || ano == null) return 0;
    let n = 0;
    for (const sigla of escopoAno ? SIGLAS : [mesSel]) {
      const mes = snapshot.meses[sigla];
      if (!mes) continue;
      for (const r of mes.registros) {
        if (String(r.dados['FORMA DE PGTO'] ?? '').toLowerCase() !== 'boleto') continue;
        if (pagamentos[`${ano}:${r.linha}`]) n++;
      }
    }
    return n;
  }, [snapshot, ano, pagamentos, escopoAno, mesSel]);

  const marcarPago = (chave: string, pago: boolean) => {
    const prox = { ...(useStoreLocal.getState().dados.config.pagamentosBoleto ?? {}) };
    if (pago) prox[chave] = true; else delete prox[chave];
    setConfig({ pagamentosBoleto: prox });
  };

  if (!snapshot || (visiveis.length === 0 && pagosNoMes === 0)) return null;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-amber-300" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Alertas de vencimento (Boletos)</h3>
          <span className="text-xs text-slate-500">{escopoAno ? 'ano inteiro' : NOMES_MESES[mesSel]}</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={escopoAno} onChange={(e) => setEscopoAno(e.target.checked)} />
          Ver ano inteiro
        </label>
      </div>
      <p className="mt-1 text-xs text-slate-400 hidden" title="Apenas Forma de Pgto = Boleto, com data. Marque como pago para ocultar.">Forma de Pgto = Boleto</p>

      {vencidos.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-rose-300 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Vencidos ({vencidos.length})</p>
          <div className="space-y-1.5">
            {vencidos.map((i) => (
              <div key={i.chave} className="flex items-center justify-between gap-2 rounded-lg border border-rose-800/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                <span className="min-w-0 truncate">{formatarData(i.data)} · {i.descricao} <span className="text-rose-300/80">({i.categoria})</span></span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold">{formatarMoeda(i.valor)} · {Math.abs(i.dias)}d</span>
                  <button type="button" onClick={() => marcarPago(i.chave, true)} title="Marcar como pago" className="rounded border border-emerald-700/60 px-1.5 py-0.5 text-[10px] text-emerald-300 hover:bg-emerald-500/10">Pago</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {proximos.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-amber-300">Vencendo em até 7 dias ({proximos.length})</p>
          <div className="space-y-1.5">
            {proximos.map((i) => (
              <div key={i.chave} className="flex items-center justify-between gap-2 rounded-lg border border-amber-700/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <span className="min-w-0 truncate">{formatarData(i.data)} · {i.descricao} <span className="text-amber-300/80">({i.categoria})</span></span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold">{formatarMoeda(i.valor)} · {i.dias === 0 ? 'hoje' : `${i.dias}d`}</span>
                  <button type="button" onClick={() => marcarPago(i.chave, true)} title="Marcar como pago" className="rounded border border-emerald-700/60 px-1.5 py-0.5 text-[10px] text-emerald-300 hover:bg-emerald-500/10">Pago</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pagosNoMes > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-emerald-300 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Pagos ({pagosNoMes}) — clique para desmarcar</p>
          <div className="flex flex-wrap gap-1.5">
            {visiveis.length === 0 && (todos.filter((i) => pagamentos[i.chave]).map((i) => (
              <button key={i.chave} type="button" onClick={() => marcarPago(i.chave, false)} title="Desmarcar pago" className="rounded border border-emerald-800/60 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20">
                {formatarData(i.data)} · {i.descricao} · {formatarMoeda(i.valor)}
              </button>
            )))}
          </div>
        </div>
      )}
    </section>
  );
}
