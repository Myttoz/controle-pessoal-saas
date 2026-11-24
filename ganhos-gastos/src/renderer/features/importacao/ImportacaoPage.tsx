import { useMemo, useState } from 'react';
import { FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { Campo, Selecao } from '@/components/Campos';
import { EstadoVazio } from '@/components/Estados';
import { formatarMoeda } from '@/lib/formatar';

type Mapeamento = { data: string; descricao: string; valor: string; hora: string; observacao: string };

function detectarDelimitador(texto: string): string {
  const primeira = texto.split(/\r?\n/).find((l) => l.trim()) ?? '';
  const candidatos = [';', ',', '\t'];
  let melhor = ';'; let max = -1;
  for (const c of candidatos) {
    const n = primeira.split(c).length;
    if (n > max) { max = n; melhor = c; }
  }
  return melhor;
}

function parseCsv(texto: string, delim: string): string[][] {
  const linhas: string[][] = [];
  let atual: string[] = []; let campo = ''; let aspas = false;
  const pushCampo = () => { atual.push(campo); campo = ''; };
  const pushLinha = () => { if (atual.length > 1 || (atual.length === 1 && atual[0].trim() !== '')) linhas.push(atual); atual = []; };
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i]; const prox = texto[i + 1];
    if (aspas) {
      if (ch === '"' && prox === '"') { campo += '"'; i++; }
      else if (ch === '"') aspas = false;
      else campo += ch;
    } else {
      if (ch === '"') aspas = true;
      else if (ch === delim) pushCampo();
      else if (ch === '\n') { pushCampo(); pushLinha(); }
      else if (ch === '\r') { /* ignore */ }
      else campo += ch;
    }
  }
  pushCampo(); pushLinha();
  return linhas;
}

function parseValorBr(v: string): number | null {
  const s = v.trim().replace(/\s/g, '').replace(/^R\$\s?/, '');
  if (!s) return null;
  // pt-BR: 1.234,56 ou 1234,56; também aceita 1234.56
  const temVirgula = s.includes(',');
  const temPonto = s.includes('.');
  let norm = s;
  if (temVirgula && temPonto) norm = s.replace(/\./g, '').replace(',', '.');
  else if (temVirgula) norm = s.replace(',', '.');
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

export function ImportacaoPage() {
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [linhas, setLinhas] = useState<string[][]>([]);
  const [delim, setDelim] = useState(';');
  const [temCabecalho, setTemCabecalho] = useState(true);
  const [map, setMap] = useState<Mapeamento>({ data: '', descricao: '', valor: '', hora: '', observacao: '' });

  const cabecalhos = useMemo(() => (temCabecalho ? linhas[0] ?? [] : (linhas[0] ?? []).map((_, i) => `Coluna ${i + 1}`)), [linhas, temCabecalho]);
  const dados = useMemo(() => (temCabecalho ? linhas.slice(1) : linhas), [linhas, temCabecalho]);

  const preview = useMemo(() => {
    const idx = (nome: string) => cabecalhos.findIndex((c) => c === nome);
    const iData = idx(map.data), iDesc = idx(map.descricao), iVal = idx(map.valor), iHora = idx(map.hora), iObs = idx(map.observacao);
    return dados.slice(0, 100).map((row, i) => {
      const valorRaw = iVal >= 0 ? row[iVal] ?? '' : '';
      const valor = parseValorBr(valorRaw);
      return {
        i, data: iData >= 0 ? row[iData] ?? '' : '', descricao: iDesc >= 0 ? row[iDesc] ?? '' : '',
        valorRaw, valor, hora: iHora >= 0 ? row[iHora] ?? '' : '', observacao: iObs >= 0 ? row[iObs] ?? '' : '',
      };
    });
  }, [dados, cabecalhos, map]);

  const aoArquivo = async (file: File | null) => {
    if (!file) return;
    const texto = await file.text();
    const d = detectarDelimitador(texto);
    const parsed = parseCsv(texto, d);
    setNomeArquivo(file.name);
    setDelim(d);
    setLinhas(parsed);
    setMap({ data: '', descricao: '', valor: '', hora: '', observacao: '' });
  };

  const colunas = cabecalhos;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-700/50 bg-amber-500/10 p-4 text-sm text-amber-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Importação CSV — Bloco 1 (seguro, sem gravar)</p>
            <p className="mt-1 text-xs text-amber-200/90">Este bloco apenas lê o arquivo e mostra prévia com mapeamento de colunas. Nenhum lançamento é criado. Faça backup antes de blocos futuros que gravem dados.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Arquivo CSV</span>
            <input type="file" accept=".csv,text/csv,text/plain" onChange={(e) => void aoArquivo(e.target.files?.[0] ?? null)} className="block text-sm text-slate-300" />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300 pb-2">
            <input type="checkbox" checked={temCabecalho} onChange={(e) => setTemCabecalho(e.target.checked)} />
            Primeira linha é cabeçalho
          </label>
          <Campo rotulo="Delimitador">
            <Selecao value={delim} onChange={(e) => { setDelim(e.target.value); if (nomeArquivo) { /* reparse manual: usuário pode reabrir */ } }}>
              <option value=";">; (ponto e vírgula)</option>
              <option value=",">, (vírgula)</option>
              <option value={'\t'}>Tab</option>
            </Selecao>
          </Campo>
          {nomeArquivo && <span className="pb-2 text-xs text-slate-500">{nomeArquivo} · {dados.length} linha(s)</span>}
        </div>

        {colunas.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(['data','descricao','valor','hora','observacao'] as const).map((k) => (
              <Campo key={k} rotulo={`Coluna: ${k}`}>
                <Selecao value={map[k]} onChange={(e) => setMap((m) => ({ ...m, [k]: e.target.value }))}>
                  <option value="">(não mapear)</option>
                  {colunas.map((c) => <option key={c} value={c}>{c}</option>)}
                </Selecao>
              </Campo>
            ))}
          </div>
        )}
      </div>

      {linhas.length === 0 ? (
        <EstadoVazio icone={FileSpreadsheet} titulo="Importação CSV" descricao="Selecione um CSV para pré-visualizar e mapear colunas. Nenhum dado será gravado neste bloco." />
      ) : (
        <div className="overflow-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Descrição</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2">Hora</th>
                <th className="px-3 py-2">Obs. mapeada</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r) => (
                <tr key={r.i} className="border-b border-slate-800/60 text-slate-300">
                  <td className="px-3 py-2 text-slate-500">{r.i + 1}</td>
                  <td className="px-3 py-2">{r.data || '—'}</td>
                  <td className="px-3 py-2">{r.descricao || '—'}</td>
                  <td className="px-3 py-2 text-right">{r.valor != null ? formatarMoeda(r.valor) : <span className="text-amber-300">{r.valorRaw || '—'}</span>}</td>
                  <td className="px-3 py-2">{r.hora || '—'}</td>
                  <td className="px-3 py-2">{r.observacao || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {dados.length > 100 && <p className="px-3 py-2 text-xs text-slate-500">Mostrando 100 de {dados.length} linhas.</p>}
        </div>
      )}
    </div>
  );
}
