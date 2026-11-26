import { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, AlertTriangle, Link2, Plus, Ban, GitCompareArrows } from 'lucide-react';
import { Botao } from '@/components/Botoes';
import { Campo, Selecao } from '@/components/Campos';
import { EstadoVazio } from '@/components/Estados';
import { ThOrdenavel, type DirecaoOrdem } from '@/components/ThOrdenavel';
import { formatarMoeda } from '@/lib/formatar';
import { useStoreAno } from '@/store/storeAno';
import { useStoreLocal } from '@/store/storeLocal';
import { useStoreUI } from '@/store/storeUI';
import { useStoreImportacao, MAP_VAZIO } from '@/store/storeImportacao';
import {
  acaoSugerida, indexarLancamentos, parseDataBr, parseValorBr, sugerirMatch,
  normalizar, type AcaoImportacao, type LinhaCsv, type ResultadoImportacao,
} from '@/lib/importacaoCsv';
import { LISTAS, type LancamentoMensal, type SiglaMes } from '@/types/api-types';
import { SIGLAS, NOMES_MESES, siglaDeAba } from '@/lib/meses';

type CampoOrdem = 'data' | 'descricao' | 'valor' | 'sugestao' | 'motivos' | 'acao';
type CampoApp = 'appData' | 'appDesc' | 'appValor';

const COLUNAS: { chave: keyof typeof MAP_VAZIO; rotulo: string }[] = [
  { chave: 'data', rotulo: 'Data' },
  { chave: 'descricao', rotulo: 'Descrição' },
  { chave: 'valor', rotulo: 'Valor' },
  { chave: 'hora', rotulo: 'Hora' },
  { chave: 'observacao', rotulo: 'Observação' },
  { chave: 'portador', rotulo: 'Portador' },
  { chave: 'parcela', rotulo: 'Parcela' },
];
function detectarDelimitador(texto: string): string {
  const primeira = (texto.replace(/^\uFEFF/, '').split(/\r?\n/).find((l) => l.trim()) ?? '');
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

function cmpTxt(a: string, b: string) { return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }); }

export function ImportacaoPage() {
  const imp = useStoreImportacao();
  const [ordem, setOrdem] = useState<{ campo: CampoOrdem; direcao: DirecaoOrdem } | null>(null);
  const [filtrosColunas, setFiltrosColunas] = useState<Record<string, string[]>>({});
  const [ordemApp, setOrdemApp] = useState<{ campo: CampoApp; direcao: DirecaoOrdem } | null>(null);
  const [filtrosApp, setFiltrosApp] = useState<Record<string, string[]>>({});
  const [gravando, setGravando] = useState(false);
  const scrollAppRef = useRef<HTMLDivElement>(null);
  const scrollCsvRef = useRef<HTMLDivElement>(null);
  const sincronizandoScroll = useRef(false);
  const [linhaSel, setLinhaSel] = useState<{ origem: 'app' | 'csv'; chave: string } | null>(null);

  const aoRolar = (origem: 'app' | 'csv') => (e: React.UIEvent<HTMLDivElement>) => {
    if (sincronizandoScroll.current) return;
    const destino = origem === 'app' ? scrollCsvRef.current : scrollAppRef.current;
    if (!destino) return;
    sincronizandoScroll.current = true;
    destino.scrollTop = e.currentTarget.scrollTop;
    requestAnimationFrame(() => { sincronizandoScroll.current = false; });
  };

  const ano = useStoreAno((s) => s.anoSelecionado);
  const snapshots = useStoreAno((s) => s.snapshots);
  const adicionarLancamento = useStoreAno((s) => s.adicionarLancamento);
  const configLocal = useStoreLocal((s) => s.dados.config);
  const setConfigLocal = useStoreLocal((s) => s.setConfig);
  const toast = useStoreUI((s) => s.toast);

  const linhas = useMemo(() => parseCsv(imp.textoBruto, imp.delim), [imp.textoBruto, imp.delim]);
  const cabecalhos = useMemo(
    () => (imp.temCabecalho ? linhas[0] ?? [] : (linhas[0] ?? []).map((_, i) => `Coluna ${i + 1}`)),
    [linhas, imp.temCabecalho],
  );
  const dados = useMemo(() => (imp.temCabecalho ? linhas.slice(1) : linhas), [linhas, imp.temCabecalho]);

  const idx = (chave: keyof typeof MAP_VAZIO) => cabecalhos.findIndex((c) => c === imp.map[chave]);
  const iData = idx('data'), iDesc = idx('descricao'), iVal = idx('valor');
  const iHora = idx('hora'), iObs = idx('observacao'), iPort = idx('portador'), iParc = idx('parcela');
  const mapPronto = iData >= 0 && iDesc >= 0 && iVal >= 0;

  // mostra Hora/Observação só se o cabeçalho tiver colunas com esses nomes
  const colunasDisponiveis = useMemo(() => COLUNAS.filter(({ chave }) => {
    if (chave === 'hora' || chave === 'observacao') return cabecalhos.some((c) => normalizar(c).includes(chave === 'hora' ? 'HORA' : 'OBSERVACAO'));
    return true;
  }), [cabecalhos]);

  const linhasCsv = useMemo<LinhaCsv[]>(() => dados.map((row, indice) => {
    const valorRaw = iVal >= 0 ? row[iVal] ?? '' : '';
    return {
      indice,
      data: iData >= 0 ? parseDataBr(row[iData] ?? '') : '',
      dataRaw: iData >= 0 ? row[iData] ?? '' : '',
      descricao: iDesc >= 0 ? row[iDesc] ?? '' : '',
      valor: parseValorBr(valorRaw), valorRaw,
      hora: iHora >= 0 ? row[iHora] ?? '' : '',
      observacao: iObs >= 0 ? row[iObs] ?? '' : '',
      portador: iPort >= 0 ? row[iPort] ?? '' : '',
      parcela: iParc >= 0 ? row[iParc] ?? '' : '',
    };
  }), [dados, iData, iDesc, iVal, iHora, iObs, iPort, iParc]);

  const lancamentos = useMemo(() => indexarLancamentos(snapshots), [snapshots]);

  // chave estável da linha (evita duplicar na reimportação do mesmo extrato)
  const chaveImportacao = (l: LinhaCsv) =>
    `${l.data}|${normalizar(l.descricao)}|${(l.valor ?? 0).toFixed(2)}|${normalizar(l.portador)}`;
  const jaImportadas = configLocal.importacoesCsv ?? {};

  const sugestoes = useMemo<ResultadoImportacao[]>(() => {
    if (!mapPronto) return [];
    return linhasCsv.map((linha) => {
      const sugestao = sugerirMatch(linha, lancamentos, ano);
      const chave = chaveImportacao(linha);
      if (jaImportadas[chave]) {
        return { linha, sugestao, acao: 'ignorar' as AcaoImportacao };
      }
      const acao = imp.acoes[linha.indice] ?? acaoSugerida(sugestao);
      return { linha, sugestao, acao };
    });
  }, [linhasCsv, lancamentos, ano, mapPronto, imp.acoes, jaImportadas]);

  // ---- filtros de coluna (dinâmicos) + ordenação ----
  const valorColuna = (r: ResultadoImportacao, campo: CampoOrdem): string => {
    switch (campo) {
      case 'data': return r.linha.data ? r.linha.data.split('-').reverse().join('/') : r.linha.dataRaw;
      case 'descricao': return r.linha.descricao;
      case 'valor': return r.linha.valorRaw;
      case 'sugestao': return r.sugestao.descricaoSugerida;
      case 'motivos': return r.sugestao.motivos.join(', ');
      case 'acao': return r.acao;
    }
  };
  const opcoesColuna = (campo: CampoOrdem) => [...new Set(sugestoes.map((r) => valorColuna(r, campo)).filter(Boolean))].sort(cmpTxt).slice(0, 200);
  const alternarFiltro = (campo: CampoOrdem, valor: string) => setFiltrosColunas((p) => {
    const atual = p[campo] ?? [];
    const prox = atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor];
    return { ...p, [campo]: prox };
  });
  const limparFiltro = (campo: CampoOrdem) => setFiltrosColunas((p) => ({ ...p, [campo]: [] }));
  const alternarOrdem = (campo: CampoOrdem) => setOrdem((a) => !a || a.campo !== campo ? { campo, direcao: 'asc' } : a.direcao === 'asc' ? { campo, direcao: 'desc' } : null);
  const dirDe = (campo: CampoOrdem) => ordem?.campo === campo ? ordem.direcao : null;
  const filtroDe = (campo: CampoOrdem) => ({ opcoes: opcoesColuna(campo), selecionados: filtrosColunas[campo] ?? [], aoAlternar: (v: string) => alternarFiltro(campo, v), aoLimpar: () => limparFiltro(campo) });

  const visiveis = useMemo(() => {
    let out = sugestoes.filter((r) => {
      if (imp.filtroMes) {
        const idxMes = SIGLAS.indexOf(imp.filtroMes) + 1;
        if (!r.linha.data.startsWith(`${ano}-${String(idxMes).padStart(2, '0')}`)) return false;
      }
      if (imp.soPendentes && r.acao !== 'novo') return false;
      for (const [campo, sel] of Object.entries(filtrosColunas)) {
        if (!sel || sel.length === 0) continue;
        if (!sel.includes(valorColuna(r, campo as CampoOrdem))) return false;
      }
      return true;
    });
    if (ordem) {
      const dir = ordem.direcao === 'asc' ? 1 : -1;
      out = [...out].sort((a, b) => {
        const va = valorColuna(a, ordem.campo); const vb = valorColuna(b, ordem.campo);
        let c = 0;
        if (ordem.campo === 'valor') c = (a.linha.valor ?? 0) - (b.linha.valor ?? 0);
        else if (ordem.campo === 'data') c = a.linha.data.localeCompare(b.linha.data);
        else c = cmpTxt(va, vb);
        return c * dir;
      });
    }
    return out;
  }, [sugestoes, imp.filtroMes, imp.soPendentes, ano, filtrosColunas, ordem]);

  const contagem = useMemo(() => ({
    vincular: sugestoes.filter((s) => s.acao === 'vincular').length,
    novo: sugestoes.filter((s) => s.acao === 'novo').length,
    ignorar: sugestoes.filter((s) => s.acao === 'ignorar').length,
    invalidas: linhasCsv.filter((l) => l.valor == null || !l.data).length,
  }), [sugestoes, linhasCsv]);

  // Linhas do CSV que ficaram sem vínculo (possíveis divergências a destacar).
  const divergentesCsv = useMemo(() => new Set(
    sugestoes
      .filter((s) => s.acao === 'novo' && s.linha.valor != null && s.linha.valor > 0)
      .map((s) => s.linha.indice),
  ), [sugestoes]);

  // ---- Bloco 2b: comparação por período ----
  const comparacao = useMemo(() => {
    const tipoAlvo = imp.modo === 'cartao' ? 'Fatura futura' : 'PIX';
    const lancamentosMes = lancamentos.filter((l) => l.ano === ano && l.mes === imp.mesCmp && l.dados.TIPO === tipoAlvo);
    const totalApp = lancamentosMes.reduce((s, l) => s + (Number(l.dados.VALOR) || 0), 0);
    const positivas = sugestoes.filter(({ linha, acao }) => acao !== 'ignorar' && linha.valor != null && linha.valor > 0);
    const negativas = sugestoes.filter(({ linha, acao }) => acao !== 'ignorar' && linha.valor != null && linha.valor < 0);
    const totalImportado = positivas.reduce((s, { linha }) => s + (linha.valor ?? 0), 0);
    return {
      tipoAlvo, totalApp, totalImportado,
      qtdApp: lancamentosMes.length, qtdImportado: positivas.length,
      diferenca: Math.round((totalImportado - totalApp) * 100) / 100,
      negativas: negativas.reduce((s, { linha }) => s + (linha.valor ?? 0), 0),
      lancamentosMes,
    };
  }, [imp.modo, lancamentos, ano, imp.mesCmp, sugestoes]);

  // ---- cabeçalho com filtro/ordenação na tabela do app ----
  const valorColApp = (l: typeof comparacao.lancamentosMes[number], campo: CampoApp): string => {
    switch (campo) {
      case 'appData': return l.dados.DATA || '';
      case 'appDesc': return l.dados.OBSERVAÇÃO || l.dados.DESCRIÇÃO || '';
      case 'appValor': return String(Number(l.dados.VALOR) || 0);
    }
  };
  const opcoesColApp = (campo: CampoApp) => [...new Set(comparacao.lancamentosMes.map((l) => valorColApp(l, campo)).filter(Boolean))].sort(cmpTxt).slice(0, 200);
  const alternarFiltroApp = (campo: CampoApp, valor: string) => setFiltrosApp((p) => {
    const atual = p[campo] ?? [];
    const prox = atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor];
    return { ...p, [campo]: prox };
  });
  const limparFiltroApp = (campo: CampoApp) => setFiltrosApp((p) => ({ ...p, [campo]: [] }));
  const alternarOrdemApp = (campo: CampoApp) => setOrdemApp((a) => !a || a.campo !== campo ? { campo, direcao: 'asc' } : a.direcao === 'asc' ? { campo, direcao: 'desc' } : null);
  const dirApp = (campo: CampoApp) => ordemApp?.campo === campo ? ordemApp.direcao : null;
  const filtroApp = (campo: CampoApp) => ({ opcoes: opcoesColApp(campo), selecionados: filtrosApp[campo] ?? [], aoAlternar: (v: string) => alternarFiltroApp(campo, v), aoLimpar: () => limparFiltroApp(campo) });

  const lancamentosAppVisiveis = useMemo(() => {
    let out = comparacao.lancamentosMes.filter((l) => {
      for (const [campo, sel] of Object.entries(filtrosApp)) {
        if (!sel || sel.length === 0) continue;
        if (!sel.includes(valorColApp(l, campo as CampoApp))) return false;
      }
      return true;
    });
    if (ordemApp) {
      const dir = ordemApp.direcao === 'asc' ? 1 : -1;
      out = [...out].sort((a, b) => {
        if (ordemApp.campo === 'appValor') return ((Number(a.dados.VALOR) || 0) - (Number(b.dados.VALOR) || 0)) * dir;
        return cmpTxt(valorColApp(a, ordemApp.campo), valorColApp(b, ordemApp.campo)) * dir;
      });
    }
    return out;
  }, [comparacao.lancamentosMes, filtrosApp, ordemApp]);

  // Linhas do app que não foram vinculadas por nenhuma sugestão (divergência).
  const vinculadasApp = useMemo(() => new Set(
    sugestoes.filter((s) => s.acao === 'vincular' && s.sugestao.lancamento).map((s) => s.sugestao.lancamento!.chave),
  ), [sugestoes]);

  // Mapa app ↔ CSV para seleção cruzada ao clicar numa linha.
  const appParaCsv = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of sugestoes) if (s.sugestao.lancamento) m[s.sugestao.lancamento.chave] = s.linha.indice;
    return m;
  }, [sugestoes]);
  const csvParaApp = useMemo(() => {
    const m: Record<number, string> = {};
    for (const s of sugestoes) if (s.sugestao.lancamento) m[s.linha.indice] = s.sugestao.lancamento.chave;
    return m;
  }, [sugestoes]);

  const aoClicarApp = (chave: string) => {
    const indice = appParaCsv[chave];
    setLinhaSel(indice != null ? { origem: 'csv', chave: String(indice) } : { origem: 'app', chave });
  };
  const aoClicarCsv = (indice: number) => {
    const chave = csvParaApp[indice];
    setLinhaSel(chave ? { origem: 'app', chave } : { origem: 'csv', chave: String(indice) });
  };

  const setAcao = (indice: number, acao: AcaoImportacao) => imp.setAcao(indice, acao);
  const aplicarTodas = (acao: AcaoImportacao) => {
    const novas = { ...imp.acoes };
    for (const s of sugestoes) novas[s.linha.indice] = acao;
    imp.setAcoes(novas);
    toast('info', `${sugestoes.length} linha(s) marcadas como ${acao}.`);
  };

  const defaults = configLocal.importacaoDefaults ?? {};
  const setDefault = (campo: keyof NonNullable<typeof configLocal.importacaoDefaults>, valor: string) => {
    setConfigLocal({ importacaoDefaults: { ...defaults, [campo]: valor } });
  };

  const novosParaGravar = useMemo(() => sugestoes.filter(
    (s) => s.acao === 'novo' && s.linha.valor != null && s.linha.valor > 0 && !!s.linha.data,
  ), [sugestoes]);

  const gravarNovos = async () => {
    if (!ano || novosParaGravar.length === 0) return;
    if (!defaults.categoria || !defaults.formaPgto || !defaults.tipo || !defaults.quemPaga) {
      toast('erro', 'Preencha Categoria, Forma de Pgto, Tipo e Quem paga antes de gravar.');
      return;
    }
    if (gravando) return;
    setGravando(true);
    const total = novosParaGravar.reduce((s, r) => s + (r.linha.valor ?? 0), 0);
    if (!confirm(`Gravar ${novosParaGravar.length} novo(s) lançamento(s), totalizando ${formatarMoeda(total)}?\n\nAs linhas já vinculadas/ignoradas não serão alteradas.`)) {
      setGravando(false);
      return;
    }

    const criados: Record<string, number | string> = { ...(configLocal.importacoesCsv ?? {}) };
    let ok = 0; let falhas = 0;
    try {
      for (const { linha } of novosParaGravar) {
        const sigla = siglaDeAba(linha.data);
        const aba = snapshots[ano]?.meses[sigla]?.aba;
        if (!aba) { falhas++; continue; }
        const obsPartes = [linha.observacao, linha.portador && `Portador: ${linha.portador}`, linha.parcela && `Parcela: ${linha.parcela}`].filter(Boolean);
        const dados: LancamentoMensal = {
          CATEGORIA: defaults.categoria as LancamentoMensal['CATEGORIA'],
          VALOR: linha.valor!,
          DESCRIÇÃO: linha.descricao || 'Importado',
          'FORMA DE PGTO': defaults.formaPgto as LancamentoMensal['FORMA DE PGTO'],
          TIPO: defaults.tipo as LancamentoMensal['TIPO'],
          'QUEM PAGA': defaults.quemPaga as LancamentoMensal['QUEM PAGA'],
          DATA: linha.data,
          OBSERVAÇÃO: obsPartes.join(' · '),
        };
        const linhaCriada = await adicionarLancamento(ano, aba, dados);
        if (linhaCriada && linhaCriada !== 'lote') {
          criados[chaveImportacao(linha)] = linhaCriada;
          ok++;
        } else {
          falhas++;
        }
      }
      setConfigLocal({ importacoesCsv: criados });
      toast('sucesso', `${ok} lançamento(s) gravado(s).${falhas ? ` ${falhas} falha(s).` : ''}`);
    } finally {
      setGravando(false);
    }
  };

  const aoArquivo = async (file: File | null) => {
    if (!file) return;
    const texto = (await file.text()).replace(/^\uFEFF/, '');
    imp.definirArquivo(file.name, texto, detectarDelimitador(texto));
    ;
    ;
    ;
    ;
    setFiltrosColunas({});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-700/50 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="font-semibold" title="O app cruza data, valor e descrição com lançamentos existentes e com observações já anotadas (útil para nomes genéricos como “Mercado Pago”).">Importação CSV</p>
        </div>
        <button
          type="button"
          onClick={() => { if (confirm('Limpar o arquivo, mapeamento e ações da importação? Lançamentos já gravados não serão removidos.')) imp.limparTudo(); }}
          className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
        >
          Limpar tudo
        </button>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 space-y-2">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <span className="mb-1 block text-[11px] font-medium text-slate-400">Tipo</span>
            <div className="flex h-9 items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1">
              <button type="button" onClick={() => imp.setModo('cartao')} className={`h-full rounded-md px-3 text-xs font-medium ${imp.modo === 'cartao' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Cartão (vs Fatura futura)</button>
              <button type="button" onClick={() => imp.setModo('pix')} className={`h-full rounded-md px-3 text-xs font-medium ${imp.modo === 'pix' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>PIX (vs TIPO = PIX)</button>
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-medium text-slate-400">Arquivo</span>
            <label className="flex h-9 cursor-pointer items-center rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-300">
              <input type="file" accept=".csv,text/csv,text/plain" onChange={(e) => void aoArquivo(e.target.files?.[0] ?? null)} className="hidden" />
              Escolher arquivo{imp.nomeArquivo ? ` · ${imp.nomeArquivo}` : ''}
            </label>
          </div>
          <Campo rotulo="Delimitador">
            <Selecao value={imp.delim} onChange={(e) => imp.setDelim(e.target.value)}>
              <option value=";">; (ponto e vírgula)</option>
              <option value=",">, (vírgula)</option>
              <option value={'\t'}>Tab</option>
            </Selecao>
          </Campo>
          <div>
            <span className="mb-1 block text-[11px] font-medium text-slate-400">Primeira linha é cabeçalho</span>
            <button
              type="button"
              onClick={() => imp.setTemCabecalho(!imp.temCabecalho)}
              title={imp.temCabecalho ? 'Primeira linha é cabeçalho' : 'Primeira linha é dado'}
              className={`flex h-9 w-12 items-center rounded-lg border border-slate-700 bg-slate-900 px-1 ${imp.temCabecalho ? 'justify-end' : 'justify-start'}`}
            >
              <span className={`h-6 w-5 rounded ${imp.temCabecalho ? 'bg-sky-600' : 'bg-slate-600'}`} />
            </button>
          </div>
          {imp.nomeArquivo && <span className="pb-2 text-xs text-slate-500">{imp.nomeArquivo} · {dados.length} linha(s)</span>}
        </div>

        {cabecalhos.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {colunasDisponiveis.map(({ chave, rotulo }) => (
              <Campo key={chave} rotulo={`Coluna: ${rotulo}`}>
                <Selecao value={imp.map[chave]} onChange={(e) => imp.setMapCampo(chave, e.target.value)}>
                  <option value="">(não mapear)</option>
                  {cabecalhos.map((c) => <option key={c} value={c}>{c}</option>)}
                </Selecao>
              </Campo>
            ))}
          </div>
        )}
      </div>

      {linhas.length === 0 ? (
        <EstadoVazio icone={FileSpreadsheet} titulo="Importação CSV" descricao="Selecione um CSV para pré-visualizar e mapear colunas. Nenhum dado será gravado neste bloco." />
      ) : (
        <>
          {/* ------- comparação por período ------- */}
          {mapPronto && (
            <section className="rounded-xl border border-violet-800/50 bg-violet-950/15 p-3">
              <div className="flex items-center gap-2">
                <GitCompareArrows className="h-4 w-4 text-violet-300" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-violet-200">Comparação por período</h3>
                <span className="text-xs text-slate-500" title="Mês selecionado no painel de gravação">{NOMES_MESES[imp.mesCmp]}/{ano}</span>
              </div>
              <p className="hidden" title="Comparando o CSV com os lançamentos de {NOMES_MESES[imp.mesCmp]}/{ano}. Valores negativos do CSV (pagamento de fatura/estorno) ficam fora da soma de gastos.">Comparação por período</p>

              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <Kpi titulo="CSV (positivos)" valor={formatarMoeda(comparacao.totalImportado)} detalhe={`${comparacao.qtdImportado} linha(s)`} />
                <Kpi titulo={`App (${comparacao.tipoAlvo})`} valor={formatarMoeda(comparacao.totalApp)} detalhe={`${comparacao.qtdApp} lançamento(s)`} />
                <Kpi titulo="Diferença" valor={formatarMoeda(Math.abs(comparacao.diferenca))} detalhe={comparacao.diferenca > 0 ? 'CSV maior' : comparacao.diferenca < 0 ? 'App maior' : 'igual'} tom={Math.abs(comparacao.diferenca) < 0.01 ? 'ok' : 'warn'} />
                <Kpi titulo="Negativos no CSV" valor={formatarMoeda(comparacao.negativas)} detalhe="pagamentos/estornos" />
              </div>
            </section>
          )}

          {!mapPronto ? (
            <p className="rounded-xl border border-amber-700/50 bg-amber-500/10 p-4 text-sm text-amber-200">Mapeie ao menos Data, Descrição e Valor para ver as sugestões.</p>
          ) : (
            <div className="grid items-start gap-3 xl:grid-cols-2">
              <div className="min-w-0 xl:col-start-1 xl:row-start-1">
{mapPronto && (
                <section className="rounded-xl border border-emerald-800/50 bg-emerald-950/15 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-200" title="Somente linhas marcadas como Novo serão criadas. Linhas já importadas são ignoradas ao reimportar.">Gravar novos lançamentos</h3>
                    <div className="flex items-center gap-2">
                      <select value={imp.mesCmp} onChange={(e) => imp.setMesCmp(e.target.value as SiglaMes)} title="Mês dos lançamentos e da comparação" className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100">
                        {SIGLAS.map((m) => <option key={m} value={m}>{NOMES_MESES[m]} {ano}</option>)}
                      </select>
                      <BotaoGravar
                        gravando={gravando}
                        quantidade={novosParaGravar.length}
                        onClick={() => void gravarNovos()}
                      />
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Campo rotulo="Categoria padrão">
                      <Selecao value={defaults.categoria ?? ''} onChange={(e) => setDefault('categoria', e.target.value)}>
                        <option value="">Selecione…</option>
                        {LISTAS.CATEGORIA.map((c) => <option key={c} value={c}>{c}</option>)}
                      </Selecao>
                    </Campo>
                    <Campo rotulo="Forma de Pgto padrão">
                      <Selecao value={defaults.formaPgto ?? ''} onChange={(e) => setDefault('formaPgto', e.target.value)}>
                        <option value="">Selecione…</option>
                        {LISTAS['FORMA DE PGTO'].map((c) => <option key={c} value={c}>{c}</option>)}
                      </Selecao>
                    </Campo>
                    <Campo rotulo="Tipo padrão">
                      <Selecao value={defaults.tipo ?? ''} onChange={(e) => setDefault('tipo', e.target.value)}>
                        <option value="">Selecione…</option>
                        {LISTAS.TIPO.map((c) => <option key={c} value={c}>{c}</option>)}
                      </Selecao>
                    </Campo>
                    <Campo rotulo="Quem paga padrão">
                      <Selecao value={defaults.quemPaga ?? ''} onChange={(e) => setDefault('quemPaga', e.target.value)}>
                        <option value="">Selecione…</option>
                        {LISTAS['QUEM PAGA'].map((c) => <option key={c} value={c}>{c}</option>)}
                      </Selecao>
                    </Campo>
                  </div>
                </section>
              )}
              </div>
              <div className="min-w-0 xl:col-start-2 xl:row-start-1">
{/* ------- barra de ações (coluna direita, linha 1) ------- */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-200">Revisão do extrato</h3>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-1 text-emerald-300"><Link2 className="h-3.5 w-3.5" /> Vincular: {contagem.vincular}</span>
                  <span className="flex items-center gap-1 text-sky-300"><Plus className="h-3.5 w-3.5" /> Novos: {contagem.novo}</span>
                  <span className="flex items-center gap-1 text-slate-400"><Ban className="h-3.5 w-3.5" /> Ignorar: {contagem.ignorar}</span>
                  {contagem.invalidas > 0 && <span className="flex items-center gap-1 text-amber-300"><AlertTriangle className="h-3.5 w-3.5" /> Dados inválidos: {contagem.invalidas}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={imp.filtroMes} onChange={(e) => imp.setFiltroMes(e.target.value as SiglaMes | '')} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200">
                    <option value="">Todos os meses</option>
                    {SIGLAS.map((m) => <option key={m} value={m}>{NOMES_MESES[m]}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-slate-300"><input type="checkbox" checked={imp.soPendentes} onChange={(e) => imp.setSoPendentes(e.target.checked)} /> Só novos</label>
                  <button type="button" onClick={() => aplicarTodas('vincular')} className="rounded border border-emerald-700/60 px-2 py-1 text-emerald-300 hover:bg-emerald-500/10">Vincular todas</button>
                  <button type="button" onClick={() => aplicarTodas('novo')} className="rounded border border-sky-700/60 px-2 py-1 text-sky-300 hover:bg-sky-500/10">Marcar todas como novas</button>
                </div>
              </div>
              </div>
              <div className="min-w-0 xl:col-start-1 xl:row-start-2">
<section className="min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
                <header className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/60 px-3 py-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Lançamentos mensais · {NOMES_MESES[imp.mesCmp]}</h3>
                  <span className="text-[10px] text-slate-500">{lancamentosAppVisiveis.length} linha(s)</span>
                </header>
                {lancamentosAppVisiveis.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-slate-500">Nenhum lançamento {comparacao.tipoAlvo} neste mês.</p>
                ) : (
                  <div ref={scrollAppRef} onScroll={aoRolar('app')} className="max-h-[52vh] overflow-auto">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="h-[34px] border-b border-slate-800 bg-slate-950 text-left text-[11px] uppercase tracking-wider text-slate-500 [&>th]:p-0">
                          <th><ThOrdenavel rotulo="Data" direcao={dirApp('appData')} aoOrdenar={() => alternarOrdemApp('appData')} filtro={filtroApp('appData')} className="h-[34px] px-3 leading-[34px]" /></th>
                          <th><ThOrdenavel rotulo="Observação" direcao={dirApp('appDesc')} aoOrdenar={() => alternarOrdemApp('appDesc')} filtro={filtroApp('appDesc')} className="h-[34px] px-3 leading-[34px]" /></th>
                          <th><ThOrdenavel rotulo="Valor" direcao={dirApp('appValor')} aoOrdenar={() => alternarOrdemApp('appValor')} alinhamento="right" filtro={filtroApp('appValor')} className="h-[34px] px-3 leading-[34px]" /></th>
                        </tr>
                      </thead>
                      <tbody>{lancamentosAppVisiveis.map((l) => (
                        <tr
                          key={l.chave}
                          title={`Lançamento mensal · ${l.dados.DESCRIÇÃO || ''}`}
                          onClick={() => aoClicarApp(l.chave)}
                          className={`h-[34px] cursor-pointer border-b border-slate-800/60 text-slate-300 ${!vinculadasApp.has(l.chave) ? 'border-l-2 border-l-amber-400 bg-amber-400/20 text-amber-100' : ''} ${linhaSel?.chave === l.chave ? '!bg-sky-500/25 ring-1 ring-inset ring-sky-400/60' : ''}`}
                        >
                          <td className="whitespace-nowrap h-[34px] px-3 leading-[34px] tabular-nums">{l.dados.DATA || '—'}</td>
                          <td className="max-w-[220px] truncate h-[34px] px-3 leading-[34px]" title={l.dados.OBSERVAÇÃO || l.dados.DESCRIÇÃO || ''}>{l.dados.OBSERVAÇÃO || l.dados.DESCRIÇÃO || '—'}</td>
                          <td className="whitespace-nowrap h-[34px] px-3 leading-[34px] text-right tabular-nums">{formatarMoeda(Number(l.dados.VALOR) || 0)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </section>
              </div>
              <div className="min-w-0 xl:col-start-2 xl:row-start-2">
{/* ------- tabela do extrato (coluna direita, linha 2) ------- */}
              <section className="min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
                <header className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/60 px-3 py-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Extrato importado</h3>
                  <span className="text-[10px] text-slate-500">{visiveis.length} linha(s)</span>
                </header>
                {visiveis.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-slate-500">Nenhuma linha com este filtro.</p>
                ) : (
                  <div ref={scrollCsvRef} onScroll={aoRolar('csv')} className="max-h-[52vh] overflow-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="h-[34px] border-b border-slate-800 bg-slate-950 text-left text-[11px] uppercase tracking-wider text-slate-500 [&>th]:p-0">
                          <th className="h-[34px] px-3 leading-[34px]">#</th>
                          <th><ThOrdenavel rotulo="Data" direcao={dirDe('data')} aoOrdenar={() => alternarOrdem('data')} filtro={filtroDe('data')} className="h-[34px] px-3 leading-[34px]" /></th>
                          <th><ThOrdenavel rotulo="Estabelecimento" direcao={dirDe('descricao')} aoOrdenar={() => alternarOrdem('descricao')} filtro={filtroDe('descricao')} className="h-[34px] px-3 leading-[34px]" /></th>
                          <th><ThOrdenavel rotulo="Valor" direcao={dirDe('valor')} aoOrdenar={() => alternarOrdem('valor')} alinhamento="right" filtro={filtroDe('valor')} className="h-[34px] px-3 leading-[34px]" /></th>
                          <th><ThOrdenavel rotulo="Ação" direcao={dirDe('acao')} aoOrdenar={() => alternarOrdem('acao')} filtro={filtroDe('acao')} className="h-[34px] px-3 leading-[34px]" /></th>
                        </tr>
                      </thead>
                      <tbody>
                        {visiveis.map(({ linha, sugestao, acao }) => (
                          <tr
                            key={linha.indice}
                            title={sugestao.lancamento ? `Sugestão: ${sugestao.descricaoSugerida} (${sugestao.pontos} pts) · ${sugestao.motivos.join(', ')}` : 'Sem sugestão de vínculo'}
                            onClick={() => aoClicarCsv(linha.indice)}
                            className={`h-[34px] cursor-pointer border-b border-slate-800/60 text-slate-300 ${divergentesCsv.has(linha.indice) ? 'border-l-2 border-l-amber-400 bg-amber-400/20 text-amber-100' : ''} ${linhaSel?.chave === String(linha.indice) ? '!bg-sky-500/25 ring-1 ring-inset ring-sky-400/60' : ''}`}
                          >
                            <td className="whitespace-nowrap h-[34px] px-3 leading-[34px] text-slate-500">{linha.indice + 1}</td>
                            <td className="whitespace-nowrap h-[34px] px-3 leading-[34px] tabular-nums">{linha.data ? linha.data.split('-').reverse().join('/') : linha.dataRaw || '—'}</td>
                            <td className="max-w-[220px] truncate h-[34px] px-3 leading-[34px]" title={linha.descricao}>
                              {linha.descricao || '—'}
                              {linha.parcela && <span className="ml-1 text-slate-500">[{linha.parcela}]</span>}
                            </td>
                            <td className="whitespace-nowrap h-[34px] px-3 leading-[34px] text-right tabular-nums">{linha.valor != null ? formatarMoeda(linha.valor) : <span className="text-amber-300">{linha.valorRaw}</span>}</td>
                            <td className="h-[34px] px-3 leading-[34px]">
                              <select value={acao} onChange={(e) => setAcao(linha.indice, e.target.value as AcaoImportacao)} className="h-6 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
                                <option value="vincular">Vincular</option>
                                <option value="novo">Novo</option>
                                <option value="ignorar">Ignorar</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="border-t border-slate-800 px-3 py-1.5 text-[10px] text-amber-300/80">Linhas em âmbar = sem vínculo (possível divergência). Passe o mouse na linha para ver sugestão e motivos.</p>
                  </div>
                )}
              </section>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BotaoGravar({ gravando, quantidade, onClick }: { gravando: boolean; quantidade: number; onClick: () => void }) {
  return (
    <Botao variante="primario" carregando={gravando} disabled={quantidade === 0} onClick={onClick}>
      Gravar {quantidade} novo(s)
    </Botao>
  );
}

function Kpi({ titulo, valor, detalhe, tom }: { titulo: string; valor: string; detalhe: string; tom?: 'ok' | 'warn' }) {
  const cor = tom === 'ok' ? 'text-emerald-300' : tom === 'warn' ? 'text-amber-300' : 'text-slate-100';
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2" title={detalhe}>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{titulo}</p>
      <p className={`text-base font-semibold leading-tight ${cor}`}>{valor}</p>
    </div>
  );
}
