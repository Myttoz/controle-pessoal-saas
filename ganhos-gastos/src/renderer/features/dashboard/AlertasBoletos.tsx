import { useMemo } from 'react';
import { AlertTriangle, CalendarClock } from 'lucide-react';
import { formatarData, formatarMoeda } from '@/lib/formatar';
import { hojeISO } from '@/lib/calculos';
import { NOMES_MESES, SIGLAS } from '@/lib/meses';
import { useStoreAno } from '@/store/storeAno';

interface Item {
  mes: string;
  data: string;
  descricao: string;
  valor: number;
  categoria: string;
  dias: number;
}

export function AlertasBoletos() {
  const ano = useStoreAno((s) => s.anoSelecionado);
  const snapshot = useStoreAno((s) => (ano != null ? s.snapshots[ano] : undefined));

  const { vencidos, proximos } = useMemo(() => {
    if (!snapshot) return { vencidos: [] as Item[], proximos: [] as Item[] };
    const hoje = hojeISO();
    const hojeMs = new Date(hoje + 'T00:00:00').getTime();
    const vencidos: Item[] = [];
    const proximos: Item[] = [];
    for (const sigla of SIGLAS) {
      const mes = snapshot.meses[sigla];
      if (!mes) continue;
      for (const r of mes.registros) {
        const d = r.dados;
        if (String(d['FORMA DE PGTO'] ?? '').toLowerCase() !== 'boleto') continue;
        if (!d.DATA) continue;
        const ms = new Date(d.DATA + 'T00:00:00').getTime();
        if (Number.isNaN(ms)) continue;
        const dias = Math.round((ms - hojeMs) / 86400000);
        const item: Item = { mes: NOMES_MESES[sigla], data: d.DATA, descricao: d.DESCRIÇÃO || '', valor: Number(d.VALOR) || 0, categoria: d.CATEGORIA || '', dias };
        if (dias < 0) vencidos.push(item);
        else if (dias <= 7) proximos.push(item);
      }
    }
    vencidos.sort((a, b) => a.data.localeCompare(b.data));
    proximos.sort((a, b) => a.data.localeCompare(b.data));
    return { vencidos, proximos };
  }, [snapshot]);

  if (!snapshot || (vencidos.length === 0 && proximos.length === 0)) return null;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-amber-300" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Alertas de vencimento (Boletos)</h3>
      </div>
      <p className="mt-1 text-xs text-slate-400">Apenas lançamentos com Forma de Pgto = Boleto e data informada.</p>

      {vencidos.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-rose-300 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Vencidos ({vencidos.length})</p>
          <div className="space-y-1.5">
            {vencidos.map((i, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-800/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                <span>{formatarData(i.data)} · {i.descricao} <span className="text-rose-300/80">({i.categoria}, {i.mes})</span></span>
                <span className="font-semibold">{formatarMoeda(i.valor)} · {Math.abs(i.dias)} dia(s) atrás</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {proximos.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-amber-300">Vencendo em até 7 dias ({proximos.length})</p>
          <div className="space-y-1.5">
            {proximos.map((i, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-700/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <span>{formatarData(i.data)} · {i.descricao} <span className="text-amber-300/80">({i.categoria}, {i.mes})</span></span>
                <span className="font-semibold">{formatarMoeda(i.valor)} · {i.dias === 0 ? 'hoje' : `em ${i.dias} dia(s)`}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
