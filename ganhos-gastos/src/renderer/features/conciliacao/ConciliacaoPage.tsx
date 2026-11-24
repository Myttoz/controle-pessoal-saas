import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Eraser, ListChecks } from 'lucide-react';
import { Botao } from '@/components/Botoes';
import { EstadoVazio } from '@/components/Estados';
import { MesTabs } from '@/components/MesTabs';
import { ThOrdenavel, type DirecaoOrdem } from '@/components/ThOrdenavel';
import { formatarData, formatarMoeda } from '@/lib/formatar';
import { NOMES_MESES, SIGLAS } from '@/lib/meses';
import { useStoreAno } from '@/store/storeAno';
import { useStoreLocal } from '@/store/storeLocal';
import { useStoreUI } from '@/store/storeUI';
import type { LancamentoMensal, Registro, SiglaMes } from '@/types/api-types';

type FiltroStatus = 'todos' | 'pendentes' | 'conferidos';
type CampoOrd = 'mes' | 'data' | 'descricao' | 'categoria' | 'tipo' | 'quem' | 'valor' | 'observacao' | 'conferido';

interface Linha {
  aba: string;
  mes: SiglaMes;
  r: Registro<LancamentoMensal>;
  d: LancamentoMensal;
  k: string;
  conferido: boolean;
}

function chave(ano: number, aba: string, linha: number | string) {
  return `${ano}:${aba}:${linha}`;
}

function cmpTxt(a: string, b: string) { return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }); }

export function ConciliacaoPage() {
  const ano = useStoreAno((s) => s.anoSelecionado);
  const snapshot = useStoreAno((s) => (ano != null ? s.snapshots[ano] : undefined));
  const mes = useStoreUI((s) => s.mes);
  const setMes = useStoreUI((s) => s.setMes);
  const config = useStoreLocal((s) => s.dados.config);
  const setConfig = useStoreLocal((s) => s.setConfig);

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [busca, setBusca] = useState('');
  const [escopoAno, setEscopoAno] = useState(false);
  const [ordem, setOrdem] = useState<{ campo: CampoOrd; direcao: DirecaoOrdem } | null>(null);
  const [filtrosColunas, setFiltrosColunas] = useState<Record<string, string[]>>({});

  const registros = useMemo(() => {
    if (!snapshot || ano == null) return [] as Array<{ aba: string; mes: SiglaMes; r: Registro<LancamentoMensal> }>;
    const meses: SiglaMes[] = escopoAno ? SIGLAS : [mes];
    const out: Array<{ aba: string; mes: SiglaMes; r: Registro<LancamentoMensal> }> = [];
    for (const m of meses) {
      const ms = snapshot.meses[m];
      if (!ms) continue;
      for (const r of ms.registros) out.push({ aba: ms.aba, mes: m, r });
    }
    return out;
  }, [snapshot, ano, mes, escopoAno]);

  const conciliacao = config.conciliacao ?? {};

  const base: Linha[] = useMemo(() => registros.map(({ aba, mes: m, r }) => {
    const d = r.dados;
    const k = ano != null ? chave(ano, aba, r.linha) : '';
    return { aba, mes: m, r, d, k, conferido: !!conciliacao[k] };
  }), [registros, conciliacao, ano]);

  const valorColuna = (l: Linha, campo: string): string => {
    switch (campo) {
      case 'mes': return NOMES_MESES[l.mes];
      case 'data': return l.d.DATA ? formatarData(l.d.DATA) : '';
      case 'descricao': return l.d.DESCRIÇÃO || '';
      case 'categoria': return l.d.CATEGORIA || '';
      case 'tipo': return l.d.TIPO || '';
      case 'quem': return l.d['QUEM PAGA'] || '';
      case 'observacao': return l.d.OBSERVAÇÃO || '';
      case 'conferido': return l.conferido ? 'Conferido' : 'Pendente';
      default: return '';
    }
  };

  const opcoesColuna = (campo: string) =>
    [...new Set(base.map((l) => valorColuna(l, campo)).filter((v) => v !== ''))].sort((a, b) => cmpTxt(a, b));

  const alternarFiltro = (campo: string, valor: string) => {
    setFiltrosColunas((prev) => {
      const atual = prev[campo] ?? [];
      const prox = atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor];
      return { ...prev, [campo]: prox };
    });
  };
  const limparFiltro = (campo: string) => setFiltrosColunas((prev) => ({ ...prev, [campo]: [] }));

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    let out = base.filter((l) => {
      if (filtroStatus === 'pendentes' && l.conferido) return false;
      if (filtroStatus === 'conferidos' && !l.conferido) return false;
      for (const [campo, selecionados] of Object.entries(filtrosColunas)) {
        if (!selecionados || selecionados.length === 0) continue;
        if (!selecionados.includes(valorColuna(l, campo))) return false;
      }
      if (!termo) return true;
      const alvo = [l.d.DESCRIÇÃO, l.d.CATEGORIA, l.d['QUEM PAGA'], l.d.TIPO, l.d['FORMA DE PGTO'], l.d.OBSERVAÇÃO, l.d.DATA, String(l.d.VALOR)].join(' ').toLowerCase();
      return alvo.includes(termo);
    });
    if (ordem) {
      const dir = ordem.direcao === 'asc' ? 1 : -1;
      out = [...out].sort((a, b) => {
        let c = 0;
        switch (ordem.campo) {
          case 'mes': c = SIGLAS.indexOf(a.mes) - SIGLAS.indexOf(b.mes); break;
          case 'data': c = (a.d.DATA || '').localeCompare(b.d.DATA || ''); break;
          case 'valor': c = (Number(a.d.VALOR) || 0) - (Number(b.d.VALOR) || 0); break;
          case 'conferido': c = Number(a.conferido) - Number(b.conferido); break;
          default: c = cmpTxt(valorColuna(a, ordem.campo), valorColuna(b, ordem.campo));
        }
        return c * dir;
      });
    }
    return out;
  }, [base, filtroStatus, busca, filtrosColunas, ordem]);

  const totais = useMemo(() => {
    let total = 0, conf = 0, pend = 0, vConf = 0, vPend = 0;
    for (const l of linhas) {
      const v = Number(l.d.VALOR) || 0;
      total += v;
      if (l.conferido) { conf++; vConf += v; } else { pend++; vPend += v; }
    }
    return { qtd: linhas.length, conf, pend, total, vConf, vPend };
  }, [linhas]);

  const setConferido = (k: string, valor: boolean) => {
    const prox = { ...(config.conciliacao ?? {}) };
    if (valor) prox[k] = true; else delete prox[k];
    setConfig({ conciliacao: prox });
  };
  const marcarVisiveis = (valor: boolean) => {
    const prox = { ...(config.conciliacao ?? {}) };
    for (const l of linhas) { if (l.k) { if (valor) prox[l.k] = true; else delete prox[l.k]; } }
    setConfig({ conciliacao: prox });
  };
  const limparEscopo = () => {
    if (!ano) return;
    const prox = { ...(config.conciliacao ?? {}) };
    for (const l of registros) delete prox[chave(ano, l.aba, l.r.linha)];
    setConfig({ conciliacao: prox });
  };

  const alternarOrdem = (campo: CampoOrd) => {
    setOrdem((atual) => {
      if (!atual || atual.campo !== campo) return { campo, direcao: 'asc' };
      if (atual.direcao === 'asc') return { campo, direcao: 'desc' };
      return null;
    });
  };
  const dirDe = (campo: CampoOrd) => (ordem?.campo === campo ? ordem.direcao : null);
  const filtroDe = (campo: string) => ({ opcoes: opcoesColuna(campo), selecionados: filtrosColunas[campo] ?? [], aoAlternar: (v: string) => alternarFiltro(campo, v), aoLimpar: () => limparFiltro(campo) });

  if (!snapshot || ano == null) {
    return <EstadoVazio icone={ListChecks} titulo="Sem dados carregados" descricao="Selecione um ano com dados para conciliar." />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Conciliação completa</h2>
            <p className="mt-1 text-sm text-slate-400">Marque lançamentos como conferidos. Status salvo localmente/sincronizado e reversível.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={escopoAno} onChange={(e) => setEscopoAno(e.target.checked)} />Ano inteiro</label>
            <Botao onClick={() => marcarVisiveis(true)}>Conferir visíveis</Botao>
            <Botao onClick={() => marcarVisiveis(false)}>Desmarcar visíveis</Botao>
            <Botao icone={Eraser} onClick={limparEscopo}>Limpar escopo</Botao>
          </div>
        </div>
        {!escopoAno && <div className="mt-3"><MesTabs meses={snapshot.meses} selecionado={mes} aoSelecionar={setMes} /></div>}
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar descrição, categoria, obs..." className="w-72 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" />
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
            <option value="todos">Todos</option>
            <option value="pendentes">Pendentes</option>
            <option value="conferidos">Conferidos</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi titulo="Itens" valor={String(totais.qtd)} />
        <Kpi titulo="Conferidos" valor={`${totais.conf} · ${formatarMoeda(totais.vConf)}`} tom="ok" />
        <Kpi titulo="Pendentes" valor={`${totais.pend} · ${formatarMoeda(totais.vPend)}`} tom="warn" />
        <Kpi titulo="Total" valor={formatarMoeda(totais.total)} />
      </div>

      <div className="overflow-auto rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-left text-[11px] uppercase tracking-wider text-slate-500 [&>th]:px-3 [&>th]:py-2">
              <th className="px-3 py-2">Ok</th>
              <th className="p-0"><ThOrdenavel rotulo="Mês" direcao={dirDe('mes')} aoOrdenar={() => alternarOrdem('mes')} filtro={filtroDe('mes')} className="px-3 py-2" /></th>
              <th className="p-0"><ThOrdenavel rotulo="Data" direcao={dirDe('data')} aoOrdenar={() => alternarOrdem('data')} filtro={filtroDe('data')} className="px-3 py-2" /></th>
              <th className="p-0"><ThOrdenavel rotulo="Descrição" direcao={dirDe('descricao')} aoOrdenar={() => alternarOrdem('descricao')} filtro={filtroDe('descricao')} className="px-3 py-2" /></th>
              <th className="p-0"><ThOrdenavel rotulo="Categoria" direcao={dirDe('categoria')} aoOrdenar={() => alternarOrdem('categoria')} filtro={filtroDe('categoria')} className="px-3 py-2" /></th>
              <th className="p-0"><ThOrdenavel rotulo="Tipo" direcao={dirDe('tipo')} aoOrdenar={() => alternarOrdem('tipo')} filtro={filtroDe('tipo')} className="px-3 py-2" /></th>
              <th className="p-0"><ThOrdenavel rotulo="Quem" direcao={dirDe('quem')} aoOrdenar={() => alternarOrdem('quem')} filtro={filtroDe('quem')} className="px-3 py-2" /></th>
              <th className="p-0"><ThOrdenavel rotulo="Valor" direcao={dirDe('valor')} aoOrdenar={() => alternarOrdem('valor')} alinhamento="right" className="px-3 py-2" /></th>
              <th className="p-0"><ThOrdenavel rotulo="Conferido" direcao={dirDe('conferido')} aoOrdenar={() => alternarOrdem('conferido')} filtro={filtroDe('conferido')} className="px-3 py-2" /></th>
              <th className="p-0"><ThOrdenavel rotulo="Obs." direcao={dirDe('observacao')} aoOrdenar={() => alternarOrdem('observacao')} filtro={filtroDe('observacao')} className="px-3 py-2" /></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.k} className={`border-b border-slate-800/60 ${l.conferido ? 'text-slate-500' : 'text-slate-300'}`}>
                <td className="px-3 py-2">
                  <button type="button" className="rounded p-1 hover:bg-slate-800" onClick={() => setConferido(l.k, !l.conferido)} title={l.conferido ? 'Marcar como pendente' : 'Marcar como conferido'}>
                    {l.conferido ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Circle className="h-4 w-4 text-slate-500" />}
                  </button>
                </td>
                <td className="px-3 py-2">{NOMES_MESES[l.mes]}</td>
                <td className="px-3 py-2 tabular-nums">{l.d.DATA ? formatarData(l.d.DATA) : '—'}</td>
                <td className="px-3 py-2">{l.d.DESCRIÇÃO}</td>
                <td className="px-3 py-2">{l.d.CATEGORIA}</td>
                <td className="px-3 py-2">{l.d.TIPO}</td>
                <td className="px-3 py-2">{l.d['QUEM PAGA']}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(Number(l.d.VALOR) || 0)}</td>
                <td className="px-3 py-2">{l.conferido ? 'Conferido' : 'Pendente'}</td>
                <td className="px-3 py-2 max-w-[240px] truncate" title={l.d.OBSERVAÇÃO || ''}>{l.d.OBSERVAÇÃO || '—'}</td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">Nenhum lançamento no filtro atual.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ titulo, valor, tom }: { titulo: string; valor: string; tom?: 'ok' | 'warn' }) {
  const cor = tom === 'ok' ? 'text-emerald-300' : tom === 'warn' ? 'text-amber-300' : 'text-slate-100';
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{titulo}</p>
      <p className={`mt-1 text-lg font-semibold ${cor}`}>{valor}</p>
    </div>
  );
}
