import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { LancamentoMensal, Registro } from '@/types/api-types';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  Printer,
  RefreshCw,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react';
import { AreaErro, Carregando, EstadoVazio } from '@/components/Estados';
import { Botao } from '@/components/Botoes';
import { arredondar2, formatarMoeda } from '@/lib/formatar';
import { NOMES_MESES } from '@/lib/meses';
import { resumirDivisao } from '@/lib/divisao';
import { calcularResumo } from '@/lib/resumo';
import { useSnapshot } from '@/hooks/useRegistrosFiltrados';
import { useStoreAno } from '@/store/storeAno';
import { useStoreLocal } from '@/store/storeLocal';
import { useStoreUI } from '@/store/storeUI';
import { GraficoCategorias, GraficoMeses } from './Graficos';
import { ProjecaoSaldo } from './ProjecaoSaldo';
import { SaudeFinanceira } from './SaudeFinanceira';
import { AlertasBoletos } from './AlertasBoletos';
import { Comparativo } from './Comparativo';
import { MesTabs } from '@/components/MesTabs';

type Tom = 'sky' | 'rose' | 'emerald' | 'amber' | 'violet' | 'indigo' | 'teal';

const TONS: Record<Tom, string> = {
  sky: 'bg-sky-500/10 text-sky-300 ring-sky-500/30',
  rose: 'bg-rose-500/10 text-rose-300 ring-rose-500/30',
  emerald: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  amber: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  violet: 'bg-violet-500/10 text-violet-300 ring-violet-500/30',
  indigo: 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/30',
  teal: 'bg-teal-500/10 text-teal-300 ring-teal-500/30',
};

function Indicador({
  titulo,
  valor,
  detalhe,
  icone: Icone,
  tom = 'sky',
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  icone: LucideIcon;
  tom?: Tom;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3" title={detalhe}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${TONS[tom]}`}>
          <Icone className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">{valor}</p>
    </div>
  );
}

export function DashboardPage() {
  const snapshot = useSnapshot();
  const carregando = useStoreAno((s) => s.carregando);
  const erro = useStoreAno((s) => s.erro);
  const revalidar = useStoreAno((s) => s.revalidar);
  const ano = useStoreAno((s) => s.anoSelecionado);
  const mes = useStoreUI((s) => s.mes);
  const setMes = useStoreUI((s) => s.setMes);

  const dadosLocais = useStoreLocal((s) => s.dados);

  // Restante do ano pelo Resumo Pagamentos (mesma fonte de verdade):
  //   Total gasto = Despesas − Recebido Lívia (auto, a partir dos lançamentos)
  //   Total ganho = Salário do ano (aba Recebidos)
  //   Saldo       = Total ganho − Total gasto
  const saldo = useMemo(() => {
    if (!snapshot) return null;
    const resumoPg = calcularResumo(
      snapshot,
      dadosLocais.config,
      snapshot.ano,
      NOMES_MESES,
    );
    const gastos = arredondar2(
      resumoPg.totais.despesas - resumoPg.totais.recebidoLivia,
    );
    const ganhos = arredondar2(resumoPg.totais.salario);
    return { ganhos, gastos, valor: arredondar2(ganhos - gastos) };
  }, [snapshot, dadosLocais.config]);

  if (carregando && !snapshot) {
    return <Carregando texto={`Carregando dados de ${ano ?? ''}…`} />;
  }

  if (!snapshot) {
    if (erro) {
      return <AreaErro mensagem={erro} aoTentar={() => void revalidar()} />;
    }
    return (
      <EstadoVazio
        icone={Wallet}
        titulo="Nenhum dado carregado"
        descricao="Selecione um ano válido ou atualize a conexão com a API."
        acao={
          <Botao icone={RefreshCw} onClick={() => void revalidar()}>
            Atualizar
          </Botao>
        }
      />
    );
  }

  const resumo = snapshot.resumo;
  // Total gasto no ano pelo mesmo cálculo do Resumo Pagamentos:
  //   Despesas − Recebido Lívia (automático), como referência única.
  const totalAno = saldo ? saldo.gastos : Number(resumo?.totalGeral ?? 0);
  const totalMes = Number(resumo?.meses.find((m) => m.mes === mes)?.total ?? 0);
  const maiorCategoria = resumo?.categorias[0];
  const mediaMensal = arredondar2(totalAno / 12);

  // ------- lançamentos do mês selecionado (para exportação e rankings) -------
  const mesSnapshot = snapshot.meses[mes];
  const registrosMes: Registro<LancamentoMensal>[] = mesSnapshot?.registros ?? [];
  const divisaoMes = resumirDivisao(registrosMes);

  const ui = () => useStoreUI.getState();

  // ------- exportação CSV -------
  const exportarCsv = () => {
    if (registrosMes.length === 0) {
      ui().toast('info', 'Não há lançamentos para exportar neste mês.');
      return;
    }
    const cabecalho =
      'Data,Categoria,Descricao,Forma PGTO,Tipo,Quem Paga,Observacao,Valor\n';
    const linhas = registrosMes
      .map((r) => {
        const d = r.dados;
        return [
          d.DATA ?? '',
          `"${(d.CATEGORIA ?? '').replace(/"/g, '""')}"`,
          `"${(d.DESCRIÇÃO ?? '').replace(/"/g, '""')}"`,
          d['FORMA DE PGTO'] ?? '',
          d.TIPO ?? '',
          d['QUEM PAGA'] ?? '',
          `"${(d.OBSERVAÇÃO ?? '').replace(/"/g, '""')}"`,
          Number(d.VALOR || 0).toFixed(2),
        ].join(',');
      })
      .join('\n');
    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lancamentos-${NOMES_MESES[mes]}-${snapshot.ano}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    ui().toast('sucesso', 'CSV exportado.');
  };

  // ------- impressão PDF (janela de impressão do sistema) -------
  const imprimirPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-3">
      {/* ------- indicadores ------- */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Indicador
          titulo="Total gasto no ano"
          valor={formatarMoeda(totalAno)}
          detalhe={`Despesas − Recebido Lívia · ${snapshot.ano}`}
          icone={TrendingUp}
          tom="sky"
        />
        <Indicador
          titulo="Total ganho no ano"
          valor={saldo ? formatarMoeda(saldo.ganhos) : '—'}
          detalhe={`Soma do Total Ganhos · aba Recebidos`}
          icone={ArrowUpRight}
          tom="emerald"
        />
        <Indicador
          titulo={`Total de ${NOMES_MESES[mes]}`}
          valor={formatarMoeda(totalMes)}
          detalhe={`${snapshot.meses[mes]?.registros.length ?? 0} lançamentos no mês`}
          icone={CalendarDays}
          tom="violet"
        />
        <Indicador
          titulo="Maior categoria"
          valor={maiorCategoria ? formatarMoeda(Number(maiorCategoria.total)) : '—'}
          detalhe={maiorCategoria ? maiorCategoria.categoria : 'Sem gastos registrados'}
          icone={Trophy}
          tom="amber"
        />
        <Indicador
          titulo="Média mensal"
          valor={formatarMoeda(mediaMensal)}
          detalhe="Total do ano ÷ 12"
          icone={Wallet}
          tom="indigo"
        />
        <Indicador
          titulo="Saldo (ganhos − gastos)"
          valor={saldo ? formatarMoeda(saldo.valor) : '—'}
          detalhe={
            saldo
              ? `Ganhos ${formatarMoeda(saldo.ganhos)} · Gastos ${formatarMoeda(saldo.gastos)}`
              : 'Sem dados de ganhos'
          }
          icone={saldo && saldo.valor >= 0 ? ArrowUpRight : ArrowDownRight}
          tom={saldo && saldo.valor >= 0 ? 'teal' : 'rose'}
        />
      </section>

      {/* ------- seletor de mês ------- */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mês</span>
          <MesTabs meses={snapshot.meses} selecionado={mes} aoSelecionar={setMes} />
        </div>
        <p className="text-xs text-slate-500 hidden" title="Selecione o mês para ver os totais, rankings e exportar os lançamentos desse período.">Mês</p>
      </section>

      <AlertasBoletos />

      {/* ------- exportação ------- */}
      <section className="flex flex-wrap items-center gap-3">
        <Botao icone={Download} onClick={exportarCsv}>
          Exportar CSV ({NOMES_MESES[mes]})
        </Botao>
        <Botao icone={Printer} onClick={imprimirPdf} variante="fantasma">
          Imprimir PDF
        </Botao>
        <p className="text-xs text-slate-500 hidden" title={`CSV: lançamentos de ${NOMES_MESES[mes]}/${snapshot.ano}. PDF: janela de impressão do sistema.`}>Exportar</p>
      </section>

      {/* ------- gráficos ------- */}
      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-200">Gastos por categoria</h2>
            <span className="text-xs text-slate-500">{snapshot.ano}</span>
          </div>
          <GraficoCategorias resumo={resumo} />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-200">Gastos por mês</h2>
            <span className="text-xs text-slate-500">{snapshot.ano}</span>
          </div>
          <GraficoMeses resumo={resumo} />
        </div>
      </section>

      <Comparativo />

      {/* ------- projeção de saldo ------- */}
      {resumo && (
        <ProjecaoSaldo
          snapshot={snapshot}
          config={dadosLocais.config}
          mesSelecionado={mes}
        />
      )}

      {/* ------- saúde financeira / alertas (Bloco 8, reversível) ------- */}
      <SaudeFinanceira />

      {/* ------- top categorias (lista) ------- */}
      {(resumo?.categorias.length ?? 0) > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <h2 className="mb-2 text-sm font-semibold text-slate-200">Ranking de categorias</h2>
          <ul className="space-y-2">
            {resumo.categorias.map((c) => {
              const proporcao = totalAno > 0 ? Math.min(100, (Number(c.total) / totalAno) * 100) : 0;
              return (
                <li key={c.categoria} className="grid grid-cols-[minmax(120px,1fr)_2fr_auto] items-center gap-3 text-sm">
                  <span className="truncate text-slate-300">{c.categoria}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <span className="block h-full rounded-full bg-sky-500/80" style={{ width: `${proporcao}%` }} />
                  </span>
                  <span className="w-28 text-right tabular-nums text-slate-400">
                    {formatarMoeda(Number(c.total))}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ------- ranking por tipo (ano) ------- */}
      {(() => {
        const registrosAno = Object.values(snapshot.meses).flatMap(
          (m) => m?.registros ?? [],
        );
        if (registrosAno.length === 0) return null;
        const mapa = new Map<string, number>();
        for (const r of registrosAno) {
          mapa.set(
            r.dados.TIPO,
            arredondar2((mapa.get(r.dados.TIPO) ?? 0) + Number(r.dados.VALOR || 0)),
          );
        }
        const ranking = [...mapa.entries()].sort((a, b) => b[1] - a[1]);
        const totalAnoRank = arredondar2(ranking.reduce((s, [, v]) => s + v, 0));
        const maxTipo = Math.max(...ranking.map(([, v]) => v), 0);
        return (
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-200">Ranking por tipo de pagamento</h2>
              <span className="text-xs text-slate-500">{snapshot.ano} · ano inteiro</span>
            </div>
            <ul className="space-y-2">
              {ranking.map(([tipo, total]) => {
                const proporcao = maxTipo > 0 ? Math.min(100, (total / maxTipo) * 100) : 0;
                return (
                  <li key={tipo} className="grid grid-cols-[minmax(140px,1fr)_2fr_auto] items-center gap-3 text-sm">
                    <span className="truncate text-slate-300">{tipo}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <span className="block h-full rounded-full bg-sky-500/80" style={{ width: `${proporcao}%` }} />
                    </span>
                    <span className="w-28 text-right tabular-nums text-slate-400">
                      {formatarMoeda(total)}
                    </span>
                  </li>
                );
              })}
              <li className="border-t border-slate-800 pt-2">
                <span className="text-slate-300 font-semibold">Total do ano</span>
                <span className="col-span-2" />
                <span className="w-28 text-right font-semibold tabular-nums text-slate-100">
                  {formatarMoeda(totalAnoRank)}
                </span>
              </li>
            </ul>
          </section>
        );
      })()}

      {/* ------- divisão Lívia + Dividido 50/50 (mês selecionado) ------- */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-200">
            Divisão com Lívia — {NOMES_MESES[mes]} {snapshot.ano}
          </h2>
          <span className="text-xs text-slate-500">
            {registrosMes.length} lançamento(s)
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Gasto
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">
              {formatarMoeda(divisaoMes.totalGasto)}
            </p>
            <p className="text-[11px] text-slate-600">Soma de todos os lançamentos</p>
          </div>
          <div
            className="rounded-xl border border-amber-900/60 bg-amber-950/20 px-4 py-3"
            title="(Dividido 50/50 ÷ 2) + Lívia — o que ela te repassa"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">
              Recebo Livia
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-amber-300">
              {formatarMoeda(divisaoMes.receboLivia)}
            </p>
            <p className="text-[11px] text-slate-600">
              (Dividido 50/50 ÷ 2) + Lívia
            </p>
          </div>
          <div
            className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 px-4 py-3"
            title="Total Gasto − Recebo Livia — o que sai do seu bolso"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">
              Total Real
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-300">
              {formatarMoeda(divisaoMes.totalReal)}
            </p>
            <p className="text-[11px] text-slate-600">Total − Recebo Livia</p>
          </div>
        </div>
      </section>

      {/* ------- ranking "Eu" (apenas quem paga = Eu) ------- */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-200">Ranking — Meus gastos ("Eu")</h2>
          <span className="text-xs text-slate-500">
            Apenas lançamentos com QUEM PAGA = Eu
          </span>
        </div>
        {(() => {
          const mapa = new Map<string, number>();
          for (const r of registrosMes) {
            if (r.dados['QUEM PAGA'] !== 'Eu') continue;
            const cat = r.dados.CATEGORIA;
            mapa.set(cat, arredondar2((mapa.get(cat) ?? 0) + Number(r.dados.VALOR || 0)));
          }
          const ranking = [...mapa.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
          if (ranking.length === 0) {
            return (
              <p className="py-16 text-center text-sm text-slate-500">
                Sem lançamentos pagos por você neste mês.
              </p>
            );
          }
          const totalEu = arredondar2(
            [...mapa.values()].reduce((s, v) => s + v, 0),
          );
          return (
            <ul className="space-y-2">
              {ranking.map(([categoria, total]) => {
                const proporcao = totalEu > 0 ? Math.min(100, (total / totalEu) * 100) : 0;
                return (
                  <li key={categoria} className="grid grid-cols-[minmax(120px,1fr)_2fr_auto] items-center gap-3 text-sm">
                    <span className="truncate text-slate-300">{categoria}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <span
                        className="block h-full rounded-full bg-sky-500/80"
                        style={{ width: `${proporcao}%` }}
                      />
                    </span>
                    <span className="w-28 text-right tabular-nums text-slate-400">
                      {formatarMoeda(total)}
                    </span>
                  </li>
                );
              })}
              <li className="border-t border-slate-800 pt-2">
                <span className="text-slate-300">Total "Eu"</span>
                <span className="w-28 text-right tabular-nums text-emerald-300 font-semibold">
                  {formatarMoeda(totalEu)}
                </span>
              </li>
            </ul>
          );
        })()}
      </section>

      {/* ------- ranking por tipo (fatura / pix / boleto-débito) ------- */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-200">Ranking por tipo de pagamento</h2>
          <span className="text-xs text-slate-500">{NOMES_MESES[mes]} · mês selecionado</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5 font-semibold">Tipo</th>
                <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                <th className="px-4 py-2.5 text-right font-semibold">Registros</th>
                <th className="px-4 py-2.5 text-right font-semibold">de "Eu"</th>
              </tr>
            </thead>
            <tbody>
              {(['Fatura futura', 'PIX', 'Boleto'] as const).map((tipo) => {
                const registrosTipo = registrosMes.filter((r) => r.dados.TIPO === tipo);
                const total = arredondar2(
                  registrosTipo.reduce((s, r) => s + Number(r.dados.VALOR || 0), 0),
                );
                const quemEu = registrosTipo.filter((r) => r.dados['QUEM PAGA'] === 'Eu');
                const totalEu = arredondar2(
                  quemEu.reduce((s, r) => s + Number(r.dados.VALOR || 0), 0),
                );
                return (
                  <tr
                    key={tipo}
                    className="border-b border-slate-800/50 align-middle last:border-none hover:bg-slate-800/20"
                  >
                    <td className="px-4 py-3 text-slate-300">{tipo}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-100">
                      {formatarMoeda(total)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                      {registrosTipo.length}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-400">
                      {total > 0 ? formatarMoeda(totalEu) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-950/40 font-semibold">
              <tr>
                <td className="px-4 py-3 text-slate-200">Total por tipo</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-100">
                  {formatarMoeda(
                    arredondar2(registrosMes.reduce((s, r) => s + Number(r.dados.VALOR || 0), 0)),
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                  {registrosMes.length}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-300">
                  {formatarMoeda(
                    arredondar2(
                      registrosMes
                        .filter((r) => r.dados['QUEM PAGA'] === 'Eu')
                        .reduce((s, r) => s + Number(r.dados.VALOR || 0), 0),
                    ),
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500 hidden" title="Última coluna = quanto de cada tipo foi pago por você ('Eu'); o restante é da Lívia ou dividido.">Última coluna = quanto de cada tipo foi pago por você ("Eu"); o restante é da Lívia ou dividido.</p>
      </section>


      {erro && (
        <p className="flex items-center gap-2 rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
          <TrendingUp className="h-3.5 w-3.5" />
          Última atualização em segundo plano falhou: {erro}
        </p>
      )}
    </div>
  );
}
