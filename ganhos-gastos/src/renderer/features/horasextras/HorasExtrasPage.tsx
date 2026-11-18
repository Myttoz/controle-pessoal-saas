import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Pencil, Plus, Timer, Trash2, ClipboardSignature } from 'lucide-react';
import type { RegistroHoraExtra } from '@/types/dados-locais';
import { Botao } from '@/components/Botoes';
import { ConfigSalario } from '@/components/ConfigSalario';
import { EstadoVazio } from '@/components/Estados';
import { Modal } from '@/components/Modal';
import { formatarData, formatarMoeda, hojeISO } from '@/lib/formatar';
import { HORAS_MES, agruparPorMes, arred, calcularHoraExtra, type TotalMes } from '@/lib/calculos';
import { EntradaHoras } from '@/components/Campos';
import { usePedidoNovo } from '@/hooks/usePedidoNovo';
import { useStoreAno } from '@/store/storeAno';
import { useStoreLocal } from '@/store/storeLocal';
import { FormHoraExtra } from './FormHoraExtra';

const ESTILOTooltip = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '10px',
  color: '#f1f5f9',
  fontSize: 13,
} as const;

const fmt = (v: unknown) => formatarMoeda(Number(v));

interface LinhaTabela {
  registro: RegistroHoraExtra;
  h100: number;
  h50: number;
  v100: number;
  v50: number;
  total: number;
}

const MESES_CURTO = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Valor em R$ das horas extras (a 50%) do ponto eletrônico. */
function valorPonto(horas: number, salarioBruto: number): number {
  if (salarioBruto <= 0) return 0;
  return arred(horas * (salarioBruto / HORAS_MES) * 1.5);
}

/** "2026-11" → "Novembro 2026" */
function rotuloMes(chave: string): string {
  const [ano, m] = chave.split('-');
  const idx = Number(m) - 1;
  return `${MESES_CURTO[idx] ?? m} ${ano}`;
}

/**
 * LINHA "PONTO ELETRÔNICO" — primeira linha, logo acima da tabela.
 * O usuário informa o mês e o total de horas extras do ponto (a 50%),
 * digitado manualmente; o valor em R$ é calculado na hora e entra no
 * gráfico de ganhos por mês.
 */
/**
 * Tabela "Lançamentos do ponto eletrônico" — listagem mês a mês do que foi
 * lançado manualmente (sempre a 50%). Fica logo abaixo da linha de lançamento.
 */
function TabelaPontoEletronico({
  ano,
  verTodos,
  salarioBruto,
}: {
  ano: number | null;
  verTodos: boolean;
  salarioBruto: number;
}) {
  const ponto = useStoreLocal((s) => s.dados.config.pontoEletronico ?? {});
  const setPonto = useStoreLocal((s) => s.setPontoEletronico);

  const entradas = useMemo(
    () =>
      Object.entries(ponto)
        .filter(([chave]) => verTodos || ano == null || chave.startsWith(String(ano)))
        .sort((a, b) => b[0].localeCompare(a[0])),
    [ponto, ano, verTodos],
  );

  if (entradas.length === 0) return null;

  const totalHoras = entradas.reduce((s, [, h]) => s + (Number(h) || 0), 0);
  const totalValor = entradas.reduce((s, [, h]) => s + valorPonto(Number(h) || 0, salarioBruto), 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/60 px-4 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Lançamentos do ponto eletrônico
        </p>
        <p className="text-[11px] tabular-nums text-sky-300">
          {totalHoras.toFixed(2).replace('.', ',')} h · {formatarMoeda(totalValor)}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2.5 font-semibold">Mês</th>
              <th className="px-4 py-2.5 text-right font-semibold">Horas</th>
              <th className="px-4 py-2.5 text-right font-semibold">Valor (50%)</th>
              <th className="px-4 py-2.5 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {entradas.map(([chave, horas]) => (
              <tr
                key={chave}
                className="border-b border-slate-800/70 transition hover:bg-slate-800/25"
              >
                <td className="px-4 py-2.5 font-medium text-slate-300">{rotuloMes(chave)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">
                  {Number(horas).toFixed(2).replace('.', ',')} h
                </td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-sky-300">
                  {formatarMoeda(valorPonto(Number(horas) || 0, salarioBruto))}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      title="Remover este lançamento"
                      aria-label="Remover lançamento do ponto eletrônico"
                      onClick={() => setPonto(chave, null)}
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-900/50 hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LinhaPontoEletronico() {
  const ponto = useStoreLocal((s) => s.dados.config.pontoEletronico ?? {});
  const setPonto = useStoreLocal((s) => s.setPontoEletronico);
  const salarioBruto = useStoreLocal((s) => s.dados.config.salarioBruto);

  const hojeMes = hojeISO().slice(0, 7);
  const [mes, setMes] = useState(hojeMes);
  const [horasDigitos, setHorasDigitos] = useState(() =>
    ponto[hojeMes] != null ? String(Math.round(ponto[hojeMes] * 100)) : '',
  );
  const [lancado, setLancado] = useState(false);

  // troca de mês: recarrega o valor salvo daquele mês
  const aoTrocarMes = (novoMes: string) => {
    setMes(novoMes);
    setHorasDigitos(ponto[novoMes] != null ? String(Math.round(ponto[novoMes] * 100)) : '');
    setLancado(false);
  };

  const hora50 = salarioBruto > 0 ? (salarioBruto / HORAS_MES) * 1.5 : 0;
  const horasNum = horasDigitos === '' ? 0 : Number(horasDigitos) / 100;
  const valor = arred(horasNum * hora50);
  const salvo = ponto[mes] != null;

  const lancar = () => {
    setPonto(mes, horasDigitos === '' || horasNum <= 0 ? null : horasNum);
    setLancado(true);
    window.setTimeout(() => setLancado(false), 1500);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-sky-800/40 bg-sky-950/20 px-4 py-2.5">
      <span className="flex items-center gap-2">
        <ClipboardSignature className="h-5 w-5 shrink-0 text-sky-400" />
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-wide text-sky-200">
            Ponto eletrônico
          </span>
          <span className="block text-[10px] text-slate-500">
            total de HE do mês · sempre a 50%
          </span>
        </span>
      </span>

      <label className="flex items-center gap-1.5 text-xs text-slate-400">
        Mês
        <input
          type="month"
          value={mes}
          onChange={(e) => aoTrocarMes(e.target.value)}
          className="appearance-none rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 focus:border-sky-500 focus:outline-none [color-scheme:dark]"
        />
      </label>

      <label className="flex items-center gap-1.5 text-xs text-slate-400">
        Horas extras
        <EntradaHoras
          value={horasDigitos}
          onChange={setHorasDigitos}
          onBlur={lancar}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="w-20 px-2 py-1.5 text-sm !rounded-lg"
        />
        <span className="text-slate-500">h</span>
      </label>

      <span className="flex items-center gap-2">
        <span className="text-slate-600">→</span>
        <span className="tabular-nums text-base font-semibold text-sky-300">
          {formatarMoeda(valor)}
        </span>
        <span className="hidden text-[10px] leading-tight text-slate-500 sm:block">
          {horasNum > 0 ? `${horasNum.toFixed(2).replace('.', ',')} h × ${formatarMoeda(hora50)}` : ''}
        </span>
      </span>

      <button
        type="button"
        onClick={lancar}
        title={lancado ? 'Lançado!' : 'Salvar o valor deste mês'}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
          lancado
            ? 'bg-emerald-600/80 text-white'
            : 'bg-sky-600 text-white hover:bg-sky-500'
        }`}
      >
        {lancado ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        {lancado ? 'Lançado' : 'Lançar'}
      </button>

      {salvo && (
        <button
          type="button"
          onClick={() => {
            setPonto(mes, null);
            setHorasDigitos('');
            setLancado(false);
          }}
          title="Remover o valor salvo deste mês"
          aria-label="Remover o ponto eletrônico deste mês"
          className="rounded-md p-1.5 text-slate-500 transition hover:bg-rose-900/40 hover:text-rose-300"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {salarioBruto <= 0 && (
        <span className="text-[11px] text-amber-400">
          Informe o salário bruto no painel acima para calcular o valor.
        </span>
      )}
    </div>
  );
}

export function HorasExtrasPage() {
  const dados = useStoreLocal((s) => s.dados);
  const salarioBruto = dados.config.salarioBruto;
  const remover = useStoreLocal((s) => s.removerHoraExtra);
  const anoSelecionado = useStoreAno((s) => s.anoSelecionado);
  const [verTodos, setVerTodos] = useState(false);

  // Ctrl+O → novo plantão
  usePedidoNovo(() => setModal({ modo: 'novo' }));

  // Os plantões só aparecem para o ANO selecionado no topo do app —
  // assim um ano novo nasce "zerado" nesta aba. Nada é apagado:
  // use o botão "ver todos" para enxergar plantões de outros anos.
  const doAno = useMemo(
    () =>
      anoSelecionado && !verTodos
        ? dados.horasExtras.filter((r) => r.data.startsWith(String(anoSelecionado)))
        : dados.horasExtras,
    [dados.horasExtras, anoSelecionado, verTodos],
  );

  const [modal, setModal] = useState<{ modo: 'novo' } | { modo: 'editar'; registro: RegistroHoraExtra } | null>(null);
  const [paraExcluir, setParaExcluir] = useState<RegistroHoraExtra | null>(null);
  const [mesFiltro, setMesFiltro] = useState<string>('');
  /** Ordenação da coluna DATA: 'desc' = mais recente primeiro (padrão), 'asc' = mais antiga primeiro. */
  const [ordemData, setOrdemData] = useState<'asc' | 'desc'>('desc');

  // cálculo memoizado por registro
  const linhas = useMemo<LinhaTabela[]>(() => {
    return doAno
      .map((registro) => {
        const c = calcularHoraExtra(registro, salarioBruto);
        return { registro, h100: c.horas100, h50: c.horas50, v100: arred(c.valor100), v50: arred(c.valor50), total: arred(c.total) };
      })
      .sort((a, b) =>
        ordemData === 'desc'
          ? b.registro.data.localeCompare(a.registro.data)
          : a.registro.data.localeCompare(b.registro.data),
      );
  }, [doAno, salarioBruto, ordemData]);

  const pontoEletronico = useMemo(
    () => dados.config.pontoEletronico ?? {},
    [dados.config.pontoEletronico],
  );

  const porMesBase = useMemo<TotalMes[]>(
    () => agruparPorMes(doAno, (r) => r.data, (r) => calcularHoraExtra(r, salarioBruto)),
    [doAno, salarioBruto],
  );

  // Gráfico inclui também as horas do ponto eletrônico (sempre a 50%), mês a mês
  const porMes = useMemo<TotalMes[]>(() => {
    const mapa = new Map<string, TotalMes>();
    for (const m of porMesBase) mapa.set(m.chave, { ...m });
    const hora50 = salarioBruto > 0 ? (salarioBruto / HORAS_MES) * 1.5 : 0;
    if (hora50 > 0) {
      for (const [chave, horas] of Object.entries(pontoEletronico)) {
        if (!Number.isFinite(horas) || horas <= 0) continue;
        if (anoSelecionado && !chave.startsWith(String(anoSelecionado))) continue;
        const v = arred(horas * hora50);
        const atual = mapa.get(chave);
        if (atual) {
          mapa.set(chave, {
            ...atual,
            valor50: arred(atual.valor50 + v),
            total: arred(atual.total + v),
            horas50: arred(atual.horas50 + horas),
          });
        } else {
          const [anoChave, mesNum] = chave.split('-');
          const nome = MESES_CURTO[Number(mesNum) - 1] ?? mesNum;
          mapa.set(chave, {
            chave,
            rotulo: `${nome.slice(0, 3)}/${anoChave}`,
            total: v,
            valor100: 0,
            valor50: v,
            horas100: 0,
            horas50: horas,
            quantidade: 0,
          });
        }
      }
    }
    return [...mapa.values()].sort((a, b) => a.chave.localeCompare(b.chave));
  }, [porMesBase, pontoEletronico, salarioBruto, anoSelecionado]);

  const visiveis = useMemo(
    () => (mesFiltro ? linhas.filter((l) => l.registro.data.startsWith(mesFiltro)) : linhas),
    [linhas, mesFiltro],
  );

  const totais = useMemo(() => {
    const soma = (f: (l: LinhaTabela) => number, lista: LinhaTabela[]) => arred(lista.reduce((s, l) => s + f(l), 0));
    const mesSel = mesFiltro ? visiveis : linhas;
    return {
      v100: soma((l) => l.v100, mesSel),
      v50: soma((l) => l.v50, mesSel),
      total: soma((l) => l.total, mesSel),
      h100: Math.round(mesSel.reduce((s, l) => s + l.h100, 0) * 100) / 100,
      h50: Math.round(mesSel.reduce((s, l) => s + l.h50, 0) * 100) / 100,
      quantidade: mesSel.length,
    };
  }, [visiveis, linhas, mesFiltro]);

  const dadosPizza = [
    { nome: '100% (presencial)', valor: totais.v100 },
    { nome: '50% (plantão)', valor: totais.v50 },
  ].filter((d) => d.valor > 0);

  return (
    <div className="space-y-4">
      <ConfigSalario />

      {/* ------- KPIs ------- */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo={mesFiltro ? 'Total do mês' : 'Total geral'} valor={formatarMoeda(totais.total)} tom="emerald" detalhe={`${totais.quantidade} plantão(ões)`} />
        <Kpi titulo="Ganho a 100%" valor={formatarMoeda(totais.v100)} detalhe={`${totais.h100.toFixed(2)} h`} />
        <Kpi titulo="Ganho a 50%" valor={formatarMoeda(totais.v50)} detalhe={`${totais.h50.toFixed(2)} h`} />
        <Kpi titulo="Média por plantão" valor={formatarMoeda(totais.quantidade ? totais.total / totais.quantidade : 0)} detalhe="Total ÷ plantões" />
      </section>

      {/* ------- gráficos ------- */}
      {porMes.length > 0 && (
        <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">Ganhos por mês</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={porMes} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="rotulo" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
                <Tooltip cursor={{ fill: 'rgba(56,189,248,0.08)' }} formatter={fmt} contentStyle={ESTILOTooltip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="valor100" name="100%" stackId="a" fill="#38bdf8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="valor50" name="50%" stackId="a" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">Composição 100% × 50%</h2>
            {dadosPizza.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={dadosPizza} dataKey="valor" nameKey="nome" innerRadius={52} outerRadius={90} paddingAngle={2} stroke="#0f172a">
                    <Cell fill="#38bdf8" />
                    <Cell fill="#a78bfa" />
                  </Pie>
                  <Tooltip formatter={fmt} contentStyle={ESTILOTooltip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-16 text-center text-sm text-slate-500">Sem valores calculados.</p>
            )}
          </div>
        </section>
      )}

      {/* ------- controles ------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-400">Mês:</label>
          {anoSelecionado && (
            <button
              type="button"
              onClick={() => setVerTodos((v) => !v)}
              title={
                verTodos
                  ? `Voltar a mostrar apenas o ano ${anoSelecionado}`
                  : 'Mostrar plantões e lançamentos de todos os anos'
              }
              className="flex items-center gap-1.5 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
            >
              {verTodos ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {verTodos ? 'Todos os anos' : `Ano ${anoSelecionado}`}
            </button>
          )}
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="appearance-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          >
            <option value="">Todos</option>
            {porMes.map((m) => (
              <option key={m.chave} value={m.chave}>
                {m.rotulo}
              </option>
            ))}
          </select>
        </div>
        <Botao variante="primario" icone={Plus} onClick={() => setModal({ modo: 'novo' })}>
          Novo plantão
        </Botao>
      </div>

      {/* ------- ponto eletrônico: primeira linha, acima da tabela ------- */}
      <LinhaPontoEletronico />
      <TabelaPontoEletronico ano={anoSelecionado} verTodos={verTodos} salarioBruto={salarioBruto} />

      {/* ------- lista ------- */}
      {visiveis.length === 0 ? (
        <EstadoVazio
          icone={Timer}
          titulo={
            mesFiltro
              ? 'Sem plantões neste mês'
              : anoSelecionado
                ? `Nenhum plantão em ${anoSelecionado}`
                : 'Nenhum plantão registrado'
          }
          descricao="Registre os horários de cada dia de plantão para calcular automaticamente o valor a 100% e a 50%."
          acao={
            <Botao variante="primario" icone={Plus} onClick={() => setModal({ modo: 'novo' })}>
              Novo plantão
            </Botao>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5 font-semibold">
                    <button
                      type="button"
                      onClick={() => setOrdemData((o) => (o === 'desc' ? 'asc' : 'desc'))}
                      title={ordemData === 'desc' ? 'Mais recentes primeiro — clique para inverter' : 'Mais antigas primeiro — clique para inverter'}
                      className="flex items-center gap-1.5 uppercase tracking-wider transition hover:text-sky-300"
                    >
                      Data
                      {ordemData === 'desc' ? (
                        <ArrowDown className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Período</th>
                  <th className="px-3 py-2.5 text-right font-semibold">H 100%</th>
                  <th className="px-3 py-2.5 text-right font-semibold">H 50%</th>
                  <th className="px-3 py-2.5 text-right font-semibold">R$ 100%</th>
                  <th className="px-3 py-2.5 text-right font-semibold">R$ 50%</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((l) => (
                  <tr key={l.registro.id} className="border-b border-slate-800/70 transition hover:bg-slate-800/25">
                    <td className="px-4 py-2.5 tabular-nums text-slate-300">{formatarData(l.registro.data)}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-400">
                      {l.registro.chegada} → {l.registro.saidaEmpresa}
                      {l.registro.fimPlantao ? ` (+${l.registro.fimPlantao})` : ''}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{l.h100.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{l.h50.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-sky-300">{formatarMoeda(l.v100)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-violet-300">{formatarMoeda(l.v50)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-300">{formatarMoeda(l.total)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" title="Editar" aria-label="Editar plantão" onClick={() => setModal({ modo: 'editar', registro: l.registro })} className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-700/60 hover:text-sky-300">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" title="Excluir" aria-label="Excluir plantão" onClick={() => setParaExcluir(l.registro)} className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-900/50 hover:text-rose-300">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && <FormHoraExtra registro={modal.modo === 'editar' ? modal.registro : null} aoFechar={() => setModal(null)} />}

      <Modal aberto={paraExcluir !== null} titulo="Excluir plantão" aoFechar={() => setParaExcluir(null)} largura="max-w-md" rodape={
        <>
          <Botao onClick={() => setParaExcluir(null)}>Cancelar</Botao>
          <Botao variante="perigo" icone={Trash2} onClick={() => { if (paraExcluir) remover(paraExcluir.id); setParaExcluir(null); }}>
            Excluir
          </Botao>
        </>
      }>
        {paraExcluir && <p className="text-sm text-slate-300">Remover o plantão de {formatarData(paraExcluir.data)}?</p>}
      </Modal>
    </div>
  );
}

function Kpi({ titulo, valor, detalhe, tom = 'sky' }: { titulo: string; valor: string; detalhe?: string; tom?: 'sky' | 'emerald' }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${tom === 'emerald' ? 'text-emerald-300' : 'text-slate-100'}`}>{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-slate-500">{detalhe}</p>}
    </div>
  );
}
