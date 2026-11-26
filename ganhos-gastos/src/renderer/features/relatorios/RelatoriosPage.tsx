/** Relatório para IR / contador: ganhos diversos e freelances. O PIX sai no extrato anual do banco. */
import { useMemo, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { ThOrdenavel, type DirecaoOrdem } from '@/components/ThOrdenavel';
import { Botao } from '@/components/Botoes';
import { EstadoVazio } from '@/components/Estados';
import { formatarData, formatarMoeda } from '@/lib/formatar';
import { SIGLAS, NOMES_MESES } from '@/lib/meses';
import { useStoreAno } from '@/store/storeAno';
import { useStoreUI } from '@/store/storeUI';
import type { LinhaExtra, LinhaSalario, Registro, SiglaMes } from '@/types/api-types';

const nomeMes = (m: SiglaMes) => NOMES_MESES[m];

interface LinhaOutroSalario { mes: SiglaMes; valor: number; observacao: string; }
interface LinhaFreelance { mes: SiglaMes; data: string; descricao: string; cliente: string; valor: number; }

function escapeCsv(valor: string | number): string {
  const s = String(valor ?? '');
  if (/[;"\n,]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function baixarCsv(nome: string, linhas: string[][]): void {
  const csv = '\uFEFF' + linhas.map((l) => l.map(escapeCsv).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome; a.click();
  URL.revokeObjectURL(url);
}

export function RelatoriosPage() {
  const ano = useStoreAno((s) => s.anoSelecionado);
  const snapshot = useStoreAno((s) => (ano != null ? s.snapshots[ano] : undefined));
  const toast = useStoreUI((s) => s.toast);
  const [filtroMes, setFiltroMes] = useState<SiglaMes | ''>('');

  const outrosSalario = useMemo<LinhaOutroSalario[]>(() => {
    if (!snapshot?.salario) return [];
    return snapshot.salario.registros
      .map((r: Registro<LinhaSalario>) => ({ mes: r.dados['MÊS'], valor: Number(r.dados.OUTROS) || 0, observacao: r.dados.OBSERVAÇÃO || '' }))
      .filter((r) => (filtroMes ? r.mes === filtroMes : true))
      .filter((r) => r.valor !== 0 || r.observacao.trim() !== '')
      .sort((a, b) => SIGLAS.indexOf(a.mes) - SIGLAS.indexOf(b.mes));
  }, [snapshot, filtroMes]);

  const freelances = useMemo<LinhaFreelance[]>(() => {
    if (!snapshot?.extras) return [];
    return snapshot.extras.ganhos
      .map((r: Registro<LinhaExtra>) => {
        const d = r.dados;
        const valor = (Number(d.GANHOS_SERVICOS) || 0) + (Number(d.GANHOS_PECAS) || 0) || Number(d.VALOR) || 0;
        return { mes: d['MÊS'], data: d.DATA || '', descricao: d.DESCRIÇÃO || '', cliente: d.CLIENTE || '', valor };
      })
      .filter((r) => (filtroMes ? r.mes === filtroMes : true))
      .filter((r) => r.valor !== 0 || r.descricao || r.cliente)
      .sort((a, b) => SIGLAS.indexOf(a.mes) - SIGLAS.indexOf(b.mes) || a.data.localeCompare(b.data));
  }, [snapshot, filtroMes]);

  const totalOutros = outrosSalario.reduce((s, r) => s + r.valor, 0);
  const totalFreelances = freelances.reduce((s, r) => s + r.valor, 0);

  const exportar = () => {
    if (!snapshot) return;
    const linhas: string[][] = [];
    linhas.push([`Relatório IR / Contador - ${ano ?? ''}${filtroMes ? ` - ${nomeMes(filtroMes)}` : ''}`]);
    linhas.push([]);
    linhas.push(['GANHOS DIVERSOS (SALÁRIO - OUTROS)']);
    linhas.push(['Mês', 'Valor', 'Observação/Descrição']);
    for (const r of outrosSalario) linhas.push([nomeMes(r.mes), r.valor.toFixed(2).replace('.', ','), r.observacao]);
    linhas.push(['TOTAL GANHOS DIVERSOS', totalOutros.toFixed(2).replace('.', ','), '']);
    linhas.push([]);
    linhas.push(['FREELANCES E SERVIÇOS']);
    linhas.push(['Mês', 'Data', 'Descrição', 'Cliente', 'Valor']);
    for (const r of freelances) linhas.push([nomeMes(r.mes), r.data ? formatarData(r.data) : '', r.descricao, r.cliente, r.valor.toFixed(2).replace('.', ',')]);
    linhas.push(['', '', '', 'TOTAL FREELANCES', totalFreelances.toFixed(2).replace('.', ',')]);
    baixarCsv(`relatorio-ir-contador-${ano ?? 'ano'}${filtroMes ? `-${filtroMes}` : ''}.csv`, linhas);
    toast('sucesso', 'Relatório CSV exportado.');
  };

  if (!snapshot) return <EstadoVazio icone={FileText} titulo="Sem dados do ano" descricao="Selecione um ano com dados carregados para gerar o relatório." />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 print:border-slate-300 print:bg-white">
        <h2 className="text-lg font-semibold text-slate-100 print:text-slate-900" title="Ganhos diversos (Salário > OUTROS) e freelances/extras. O PIX não entra: já está no extrato anual do banco.">Relatório IR / Contador</h2>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value as SiglaMes | '')} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
            <option value="">Ano inteiro</option>
            {SIGLAS.map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
          </select>
          <Botao icone={Printer} onClick={() => window.print()}>Imprimir</Botao>
          <Botao variante="primario" icone={Download} onClick={exportar}>Exportar CSV</Botao>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Kpi titulo="Ganhos diversos" valor={formatarMoeda(totalOutros)} detalhe={`${outrosSalario.length} mês(es)`} />
        <Kpi titulo="Freelances e serviços" valor={formatarMoeda(totalFreelances)} detalhe={`${freelances.length} registro(s)`} />
      </div>

      <Secao titulo="Ganhos diversos" descricao="Valores manuais em Salário > OUTROS. Observação detalha cada item.">
        <TabelaSimples colunas={['Mês', 'Valor', 'Observação/Descrição']} vazia="Nenhum valor manual no período."
          linhas={outrosSalario.map((r) => [nomeMes(r.mes), formatarMoeda(r.valor), r.observacao || '—'])}
          rodape={['Total', formatarMoeda(totalOutros), '']} />
      </Secao>

      <Secao titulo="FREELANCES E SERVIÇOS" descricao="Registros da aba Extras (ganhos).">
        <TabelaSimples colunas={['Mês', 'Data', 'Descrição', 'Cliente', 'Valor']} vazia="Nenhum freelance/extra no período."
          linhas={freelances.map((r) => [nomeMes(r.mes), r.data ? formatarData(r.data) : '—', r.descricao, r.cliente || '—', formatarMoeda(r.valor)])}
          rodape={['', '', '', 'Total', formatarMoeda(totalFreelances)]} />
      </Secao>
    </div>
  );
}

function Kpi({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2" title={detalhe}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">{titulo}</p>
      <p className="text-xl font-semibold text-slate-100">{valor}</p>
    </div>
  );
}
function Secao({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 print:border-slate-300 print:bg-white">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 print:text-slate-900" title={descricao}>{titulo}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}
function TabelaSimples({ colunas, linhas, vazia, rodape }: { colunas: string[]; linhas: string[][]; vazia: string; rodape: string[] }) {
  const [ordem, setOrdem] = useState<{ indice: number; direcao: DirecaoOrdem } | null>(null);
  const [filtros, setFiltros] = useState<Record<number, string[]>>({});

  const opcoes = (i: number) => [...new Set(linhas.map((l) => l[i]))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  const alternar = (i: number, v: string) => setFiltros((p) => {
    const atual = p[i] ?? [];
    return { ...p, [i]: atual.includes(v) ? atual.filter((x) => x !== v) : [...atual, v] };
  });

  let visiveis = linhas.filter((l) => Object.entries(filtros).every(([i, sel]) => !sel?.length || sel.includes(l[Number(i)])));
  if (ordem) visiveis = [...visiveis].sort((a, b) => {
    const c = a[ordem.indice].localeCompare(b[ordem.indice], 'pt-BR', { sensitivity: 'base' });
    return c * (ordem.direcao === 'asc' ? 1 : -1);
  });

  if (linhas.length === 0) return <p className="text-sm text-slate-500 print:text-slate-600">{vazia}</p>;
  return (
    <div className="overflow-auto rounded-lg border border-slate-800 print:overflow-visible print:border-slate-300">
      <table className="w-full min-w-[700px] text-sm print:min-w-0">
        <thead><tr className="border-b border-slate-800 bg-slate-950/80 text-left text-[11px] uppercase tracking-wider text-slate-500 print:border-slate-300 print:bg-slate-100 print:text-slate-700 [&>th]:p-0">
          {colunas.map((c, i) => (
            <th key={c}>
              <ThOrdenavel
                rotulo={c}
                direcao={ordem?.indice === i ? ordem.direcao : null}
                aoOrdenar={() => setOrdem((o) => !o || o.indice !== i ? { indice: i, direcao: 'asc' } : o.direcao === 'asc' ? { indice: i, direcao: 'desc' } : null)}
                filtro={{ opcoes: opcoes(i), selecionados: filtros[i] ?? [], aoAlternar: (v) => alternar(i, v), aoLimpar: () => setFiltros((p) => ({ ...p, [i]: [] })) }}
                className="px-3 py-2"
              />
            </th>
          ))}
        </tr></thead>
        <tbody>{visiveis.map((l, i) => <tr key={i} className="border-b border-slate-800/60 text-slate-300 print:border-slate-200 print:text-slate-800">{l.map((c, j) => <td key={j} className="px-3 py-2 align-top">{c}</td>)}</tr>)}</tbody>
        <tfoot><tr className="bg-slate-950/60 font-semibold text-slate-100 print:bg-slate-100 print:text-slate-900">{rodape.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}</tr></tfoot>
      </table>
    </div>
  );
}
