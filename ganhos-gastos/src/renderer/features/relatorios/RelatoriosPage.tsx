import { useMemo, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { Botao } from '@/components/Botoes';
import { EstadoVazio } from '@/components/Estados';
import { formatarData, formatarMoeda } from '@/lib/formatar';
import { SIGLAS, NOMES_MESES } from '@/lib/meses';

const nomeMes = (m: SiglaMes) => NOMES_MESES[m];
import { useStoreAno } from '@/store/storeAno';
import { useStoreUI } from '@/store/storeUI';
import type { LancamentoMensal, LinhaExtra, LinhaSalario, Registro, SiglaMes } from '@/types/api-types';

interface LinhaPix {
  mes: SiglaMes;
  aba: string;
  id: string | number;
  data: string;
  descricao: string;
  categoria: string;
  quem: string;
  valor: number;
  observacao: string;
}

interface LinhaOutroSalario {
  mes: SiglaMes;
  valor: number;
  observacao: string;
}

interface LinhaFreelance {
  mes: SiglaMes;
  data: string;
  descricao: string;
  cliente: string;
  valor: number;
}

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
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export function RelatoriosPage() {
  const ano = useStoreAno((s) => s.anoSelecionado);
  const snapshot = useStoreAno((s) => (ano != null ? s.snapshots[ano] : undefined));
  const toast = useStoreUI((s) => s.toast);
  const [filtroMes, setFiltroMes] = useState<SiglaMes | ''>('');

  const pix = useMemo<LinhaPix[]>(() => {
    if (!snapshot) return [];
    const linhas: LinhaPix[] = [];
    for (const sigla of SIGLAS) {
      if (filtroMes && sigla !== filtroMes) continue;
      const mes = snapshot.meses[sigla];
      if (!mes) continue;
      for (const r of mes.registros) {
        const d = r.dados as LancamentoMensal;
        if (d.TIPO !== 'PIX') continue;
        linhas.push({
          mes: sigla,
          aba: mes.aba,
          id: r.linha,
          data: d.DATA || '',
          descricao: d.DESCRIÇÃO || '',
          categoria: d.CATEGORIA || '',
          quem: d['QUEM PAGA'] || '',
          valor: Number(d.VALOR) || 0,
          observacao: d.OBSERVAÇÃO || '',
        });
      }
    }
    return linhas.sort((a, b) => (a.data || '').localeCompare(b.data || '') || a.descricao.localeCompare(b.descricao, 'pt-BR'));
  }, [snapshot, filtroMes]);

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
        const valorServ = Number(d.GANHOS_SERVICOS) || 0;
        const valorPecas = Number(d.GANHOS_PECAS) || 0;
        const valor = valorServ + valorPecas || Number(d.VALOR) || 0;
        return {
          mes: d['MÊS'],
          data: d.DATA || '',
          descricao: d.DESCRIÇÃO || '',
          cliente: d.CLIENTE || '',
          valor,
        };
      })
      .filter((r) => (filtroMes ? r.mes === filtroMes : true))
      .filter((r) => r.valor !== 0 || r.descricao || r.cliente)
      .sort((a, b) => SIGLAS.indexOf(a.mes) - SIGLAS.indexOf(b.mes) || (a.data || '').localeCompare(b.data || ''));
  }, [snapshot, filtroMes]);

  const totalPix = pix.reduce((s, r) => s + r.valor, 0);
  const totalOutros = outrosSalario.reduce((s, r) => s + r.valor, 0);
  const totalFreelances = freelances.reduce((s, r) => s + r.valor, 0);

  const exportar = () => {
    if (!snapshot) return;
    const linhas: string[][] = [];
    linhas.push([`Relatório IR / Contador - ${ano ?? ''}${filtroMes ? ` - ${nomeMes(filtroMes)}` : ''}`]);
    linhas.push([]);
    linhas.push(['LANÇAMENTOS PIX']);
    linhas.push(['Mês', 'Data', 'Descrição', 'Categoria', 'Quem paga', 'Valor', 'Observação']);
    for (const r of pix) linhas.push([nomeMes(r.mes), r.data ? formatarData(r.data) : '', r.descricao, r.categoria, r.quem, r.valor.toFixed(2).replace('.', ','), r.observacao]);
    linhas.push(['', '', '', '', 'TOTAL PIX', totalPix.toFixed(2).replace('.', ','), '']);
    linhas.push([]);
    linhas.push(['SALÁRIO - OUTROS (MANUAL)']);
    linhas.push(['Mês', 'Valor', 'Observação/Descrição']);
    for (const r of outrosSalario) linhas.push([nomeMes(r.mes), r.valor.toFixed(2).replace('.', ','), r.observacao]);
    linhas.push(['TOTAL OUTROS', totalOutros.toFixed(2).replace('.', ','), '']);
    linhas.push([]);
    linhas.push(['FREELANCES / EXTRAS (GANHOS)']);
    linhas.push(['Mês', 'Data', 'Descrição', 'Cliente', 'Valor']);
    for (const r of freelances) linhas.push([nomeMes(r.mes), r.data ? formatarData(r.data) : '', r.descricao, r.cliente, r.valor.toFixed(2).replace('.', ',')]);
    linhas.push(['', '', '', 'TOTAL FREELANCES', totalFreelances.toFixed(2).replace('.', ',')]);
    baixarCsv(`relatorio-ir-contador-${ano ?? 'ano'}${filtroMes ? `-${filtroMes}` : ''}.csv`, linhas);
    toast('sucesso', 'Relatório CSV exportado.');
  };

  if (!snapshot) {
    return <EstadoVazio icone={FileText} titulo="Sem dados do ano" descricao="Selecione um ano com dados carregados para gerar o relatório." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 print:border-slate-300 print:bg-white">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 print:text-slate-900">Relatório IR / Contador</h2>
          <p className="mt-1 text-sm text-slate-400 print:text-slate-600">
            Ano {ano}. Foco em lançamentos PIX, salário OUTROS (manual) e freelances/extras. Use a observação para descrever itens manuais.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value as SiglaMes | '')}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Ano inteiro</option>
            {SIGLAS.map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
          </select>
          <Botao icone={Printer} onClick={() => window.print()}>Imprimir</Botao>
          <Botao variante="primario" icone={Download} onClick={exportar}>Exportar CSV</Botao>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi titulo="Total PIX" valor={formatarMoeda(totalPix)} detalhe={`${pix.length} lançamento(s)`} />
        <Kpi titulo="Salário OUTROS" valor={formatarMoeda(totalOutros)} detalhe={`${outrosSalario.length} mês(es) com valor/obs`} />
        <Kpi titulo="Freelances/Extras" valor={formatarMoeda(totalFreelances)} detalhe={`${freelances.length} registro(s)`} />
      </div>

      <Secao titulo="Lançamentos PIX" descricao="Lançamentos mensais com TIPO = PIX. A coluna Observação vem do lançamento.">
        <Tabela
          colunas={['Mês', 'Data', 'Descrição', 'Categoria', 'Quem paga', 'Valor', 'Observação']}
          vazia="Nenhum lançamento PIX no período."
          linhas={pix.map((r) => [nomeMes(r.mes), r.data ? formatarData(r.data) : '—', r.descricao, r.categoria, r.quem, formatarMoeda(r.valor), r.observacao || '—'])}
          rodape={['', '', '', '', 'Total', formatarMoeda(totalPix), '']}
        />
      </Secao>

      <Secao titulo="Salário — OUTROS (manual)" descricao="Valores manuais em Salário > OUTROS. Use Observação para descrição (ex.: bônus, ajuste, reembolso).">
        <Tabela
          colunas={['Mês', 'Valor', 'Observação/Descrição']}
          vazia="Nenhum OUTROS manual no período."
          linhas={outrosSalario.map((r) => [nomeMes(r.mes), formatarMoeda(r.valor), r.observacao || '—'])}
          rodape={['Total', formatarMoeda(totalOutros), '']}
        />
      </Secao>

      <Secao titulo="Freelances / Serviços (Extras - Ganhos)" descricao="Registros da aba Extras (ganhos). Para fins de conferência, valide com o contador antes de declarar.">
        <Tabela
          colunas={['Mês', 'Data', 'Descrição', 'Cliente', 'Valor']}
          vazia="Nenhum freelance/extra no período."
          linhas={freelances.map((r) => [nomeMes(r.mes), r.data ? formatarData(r.data) : '—', r.descricao, r.cliente || '—', formatarMoeda(r.valor)])}
          rodape={['', '', '', 'Total', formatarMoeda(totalFreelances)]}
        />
      </Secao>
    </div>
  );
}

function Kpi({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 print:border-slate-300 print:bg-white">
      <p className="text-xs uppercase tracking-wider text-slate-500">{titulo}</p>
      <p className="mt-1 text-xl font-semibold text-slate-100 print:text-slate-900">{valor}</p>
      <p className="mt-1 text-xs text-slate-400 print:text-slate-600">{detalhe}</p>
    </div>
  );
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 print:border-slate-300 print:bg-white">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 print:text-slate-900">{titulo}</h3>
      <p className="mt-1 mb-3 text-xs text-slate-400 print:text-slate-600">{descricao}</p>
      {children}
    </section>
  );
}

function Tabela({ colunas, linhas, vazia, rodape }: { colunas: string[]; linhas: string[][]; vazia: string; rodape: string[] }) {
  if (linhas.length === 0) return <p className="text-sm text-slate-500 print:text-slate-600">{vazia}</p>;
  return (
    <div className="overflow-auto rounded-lg border border-slate-800 print:overflow-visible print:border-slate-300">
      <table className="w-full min-w-[700px] text-sm print:min-w-0">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-950/80 text-left text-[11px] uppercase tracking-wider text-slate-500 print:border-slate-300 print:bg-slate-100 print:text-slate-700">
            {colunas.map((c) => <th key={c} className="px-3 py-2 font-semibold">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="border-b border-slate-800/60 text-slate-300 print:border-slate-200 print:text-slate-800">
              {l.map((c, j) => <td key={j} className="px-3 py-2 align-top">{c}</td>)}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-950/60 font-semibold text-slate-100 print:bg-slate-100 print:text-slate-900">
            {rodape.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
