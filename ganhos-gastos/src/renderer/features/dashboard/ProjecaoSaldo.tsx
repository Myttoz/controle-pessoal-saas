import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SiglaMes, SnapshotAno } from '@/types/api-types';
import type { ConfigLocal } from '@/types/dados-locais';
import { arredondar2, formatarMoeda } from '@/lib/formatar';
import { NOMES_MESES } from '@/lib/meses';
import { calcularResumo } from '@/lib/resumo';

const MESES: SiglaMes[] = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
];

const ESTILOTooltip = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '10px',
  color: '#f8fafc',
  fontSize: 13,
} as const;
const ESTILOItem = { color: '#f8fafc' } as const;
const ESTILORotulo = { color: '#f8fafc', fontWeight: 600 } as const;

function moeda(v: unknown) {
  return formatarMoeda(Number(v));
}

interface Props {
  snapshot: SnapshotAno;
  config: ConfigLocal;
  mesSelecionado: SiglaMes;
}

export function ProjecaoSaldo({ snapshot, config, mesSelecionado }: Props) {
  const resumoPg = useMemo(
    () => calcularResumo(snapshot, config, snapshot.ano, NOMES_MESES),
    [snapshot, config],
  );

  const { dados, totalProjetadoGastos, totalProjetadoGanhos, saldoFinal } = useMemo(() => {
    const idxSel = MESES.indexOf(mesSelecionado);
    let projGastos = 0;
    let projGanhos = 0;

    const linhas = resumoPg.linhas.map((linha, i) => {
      const ganhos = arredondar2(linha.salario ?? 0);
      const gastos = arredondar2(linha.despesas - linha.recebidoLivia);
      const saldoMes = arredondar2(ganhos - gastos);
      projGastos = arredondar2(projGastos + gastos);
      projGanhos = arredondar2(projGanhos + ganhos);
      const temLancamentos = (snapshot.meses[linha.mes]?.registros.length ?? 0) > 0;
      const projetado = i > idxSel || (!temLancamentos && i !== idxSel && !linha.temDados);
      return {
        mes: linha.mes,
        ganhos,
        gastos,
        saldoMes,
        acumulado: arredondar2(linha.saldoFinal),
        projetado,
      };
    });

    return {
      dados: linhas,
      totalProjetadoGastos: projGastos,
      totalProjetadoGanhos: projGanhos,
      saldoFinal: linhas[linhas.length - 1]?.acumulado ?? 0,
    };
  }, [resumoPg, snapshot.meses, mesSelecionado]);

  const vazio = dados.every((d) => d.ganhos === 0 && d.gastos === 0);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Projeção de saldo</h2>
          <p className="text-[11px] text-slate-500 hidden" title="Acumulado = saldo inicial + ganhos − gastos (Despesas − Recebido Lívia). Meses futuros já incluem lançamentos, parcelas e recorrentes cadastrados.">Acumulado = saldo inicial + ganhos − gastos (Despesas − Recebido Lívia). Meses futuros já incluem lançamentos, parcelas e recorrentes cadastrados.</p>
        </div>
        <span className="text-xs text-slate-500">{snapshot.ano}</span>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Ganhos previstos (ano)</p>
          <p className="text-base font-semibold tabular-nums text-emerald-300">{formatarMoeda(totalProjetadoGanhos)}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Gastos previstos (ano)</p>
          <p className="text-base font-semibold tabular-nums text-rose-300">{formatarMoeda(totalProjetadoGastos)}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Saldo projetado (fim do ano)</p>
          <p className={`text-base font-semibold tabular-nums ${saldoFinal >= 0 ? 'text-teal-300' : 'text-rose-300'}`}>
            {formatarMoeda(saldoFinal)}
          </p>
        </div>
      </div>

      {vazio ? (
        <p className="py-10 text-center text-sm text-slate-500">Sem dados suficientes para projetar.</p>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={dados} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
            <Tooltip
              formatter={moeda}
              contentStyle={ESTILOTooltip}
              itemStyle={ESTILOItem}
              labelStyle={ESTILORotulo}
              labelFormatter={(l) => `Mês: ${l}`}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#cbd5e1' }} />
            <Bar dataKey="ganhos" name="Ganhos" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="gastos" name="Gastos" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Line type="monotone" dataKey="acumulado" name="Saldo acumulado" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
