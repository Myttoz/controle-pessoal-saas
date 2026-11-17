import { memo, useMemo, useState } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import { Pencil, Trash2 } from 'lucide-react';
import type { LancamentoMensal, Registro } from '@/types/api-types';
import { BadgeCategoria } from '@/components/BadgeCategoria';
import { ThOrdenavel, type DirecaoOrdem } from '@/components/ThOrdenavel';
import { EntradaSugestoes } from '@/components/Campos';
import { TooltipTexto } from '@/components/TooltipTexto';
import { formatarData, formatarMoeda, nomeFormaPgto, valorFormaPgto } from '@/lib/formatar';
import { useStoreUI } from '@/store/storeUI';

/** Campos com ordenação/filtro nas colunas da tabela. */
type CampoOrdenavel = 'data' | 'categoria' | 'descricao' | 'forma' | 'tipo' | 'quem' | 'valor';

export interface OpcoesColunas {
  categoria: string[];
  tipo: string[];
  forma: string[];
  quem: string[];
  descricao: string[];
}

/**
 * Largura DINÂMICA das colunas: o maior texto x aproximadamente 0.52rem/char
 * define `fit-content(Nrem)` para cada coluna — a tabela fica do tamanho do
 * conteúdo (com um pouco de respiro) e cedeon overflow-x quando necessário.
 */
function calcularColunas(registros: Registro<LancamentoMensal>[]): string {
  const maiorLen = (pegar: (d: LancamentoMensal) => string, min: number, cap: number) => {
    let maior = min;
    for (const { dados } of registros) {
      const tamanho = (pegar(dados) ?? '').trim().length;
      if (tamanho > maior) maior = Math.min(cap, tamanho);
    }
    return Math.min(cap, Math.max(min, maior));
  };

  const categoria = maiorLen((d) => d.CATEGORIA, 10, 50);
  const descricao = maiorLen((d) => d.DESCRIÇÃO, 10, 60);
  const forma = maiorLen((d) => d['FORMA DE PGTO'], 8, 30);
  const tipo = maiorLen((d) => d.TIPO, 11, 30);
  const quem = maiorLen((d) => d['QUEM PAGA'], 8, 24);
  const obs = maiorLen((d) => d.OBSERVAÇÃO, 10, 60);

  const rem = (chars: number) => Math.ceil(chars * 0.42 + 1.5); // ~0.42rem/char + padding
  return [
    '5.5rem',
    `minmax(5rem, fit-content(${rem(categoria)}rem))`,
    `minmax(7rem, fit-content(${rem(descricao)}rem))`,
    `minmax(4.5rem, fit-content(${rem(forma)}rem))`,
    `minmax(5rem, fit-content(${rem(tipo)}rem))`,
    `minmax(4.5rem, fit-content(${rem(quem)}rem))`,
    `minmax(5rem, fit-content(${rem(obs)}rem))`,
    '7rem',
    '4.5rem',
  ].join(' ');
}

interface AcoesProps {
  aoEditar: () => void;
  aoExcluir: () => void;
}

const Acoes = memo(function Acoes({ aoEditar, aoExcluir }: AcoesProps) {
  return (
    <span className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={aoEditar}
        title="Editar lançamento"
        aria-label="Editar lançamento"
        className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-700/60 hover:text-sky-300"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={aoExcluir}
        title="Excluir lançamento"
        aria-label="Excluir lançamento"
        className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-900/50 hover:text-rose-300"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </span>
  );
});

interface LinhaProps {
  registro: Registro<LancamentoMensal>;
  /** grid-template-columns dinâmico (mesmo do cabeçalho). */
  colunas: string;
  /** Número da linha na planilha (usado para editar). */
  linha: number | string;
  sugestoesObservacao: string[];
  aoEditar: (registro: Registro<LancamentoMensal>) => void;
  aoExcluir: (registro: Registro<LancamentoMensal>) => void;
  aoEditarObservacao: (linha: number | string, novoValor: string) => Promise<void>;
}

const Linha = memo(function Linha({ registro, colunas, linha, sugestoesObservacao, aoEditar, aoExcluir, aoEditarObservacao }: LinhaProps) {
  const d = registro.dados;
  const [editandoObs, setEditandoObs] = useState(false);
  const [textoObs, setTextoObs] = useState(d.OBSERVAÇÃO ?? '');

  const salvarObs = async () => {
    const valor = textoObs.trim();
    if (valor === d.OBSERVAÇÃO) {
      setEditandoObs(false);
      return;
    }
    setEditandoObs(false);
    await aoEditarObservacao(linha, valor);
  };

  return (
    <div
      style={{ gridTemplateColumns: colunas }}
      className="grid h-full items-center gap-4 border-b border-slate-800/70 px-3 text-[15px] hover:bg-slate-800/25"
    >
      <span className="tabular-nums text-slate-400">{formatarData(d.DATA)}</span>
      <span className="min-w-0">
        <BadgeCategoria categoria={d.CATEGORIA} />
      </span>
      <span className="truncate text-slate-200" title={d.DESCRIÇÃO}>
        {d.DESCRIÇÃO || '—'}
      </span>
      <span className="truncate text-slate-400">{nomeFormaPgto(d['FORMA DE PGTO'])}</span>
      <span className="truncate text-sm text-slate-400" title={d.TIPO}>
        {d.TIPO}
      </span>
      <span className="truncate text-sm text-slate-400" title={d['QUEM PAGA']}>
        {d['QUEM PAGA']}
      </span>
      {editandoObs ? (
        <EntradaSugestoes
          autoFocus
          value={textoObs}
          onChange={setTextoObs}
          sugestoes={sugestoesObservacao}
          onBlur={salvarObs}
          onKeyDown={(e) => {
            if (e.key === 'Enter') salvarObs();
            if (e.key === 'Escape') {
              setTextoObs(d.OBSERVAÇÃO ?? '');
              setEditandoObs(false);
            }
          }}
          className="block min-w-0 bg-slate-950 px-1 py-0.5 text-sm italic text-sky-300 outline-none border border-sky-500/30 rounded focus:ring-1 focus:ring-sky-500"
        />
      ) : (
        d.OBSERVAÇÃO ? (
          <TooltipTexto
            texto={d.OBSERVAÇÃO}
            className="block truncate text-sm italic text-slate-500 cursor-pointer hover:underline"
            onClick={() => setEditandoObs(true)}
          >
            {d.OBSERVAÇÃO}
          </TooltipTexto>
        ) : (
          <span
            className="truncate text-sm italic text-slate-600 cursor-pointer hover:underline"
            onClick={() => setEditandoObs(true)}
            title="Clique para adicionar uma observação"
          >
            —
          </span>
        )
      )}
      <span className="text-right font-semibold tabular-nums text-slate-100">
        {formatarMoeda(d.VALOR)}
      </span>
      <Acoes aoEditar={() => aoEditar(registro)} aoExcluir={() => aoExcluir(registro)} />
    </div>
  );
});

interface DadosVirtuais {
  registros: Registro<LancamentoMensal>[];
  colunas: string;
  linhaInicial: number;
  sugestoesObservacao: string[];
  aoEditar: (registro: Registro<LancamentoMensal>) => void;
  aoExcluir: (registro: Registro<LancamentoMensal>) => void;
  aoEditarObservacao: (linha: number | string, novoValor: string) => Promise<void>;
}

function LinhaVirtual({ index, style, data }: ListChildComponentProps<DadosVirtuais>) {
  const registro = data.registros[index];
  if (!registro) return null;
  return (
    <div style={style}>
      <Linha
        registro={registro}
        colunas={data.colunas}
        linha={data.linhaInicial + index}
        sugestoesObservacao={data.sugestoesObservacao}
        aoEditar={data.aoEditar}
        aoExcluir={data.aoExcluir}
        aoEditarObservacao={data.aoEditarObservacao}
      />
    </div>
  );
}

const ALTURA_LINHA = 54;
/** Acima disso a lista passa a ser virtualizada (5.9). */
const LIMITE_VIRTUALIZACAO = 200;
const ALTURA_MAXIMA = 700;

interface Props {
  registros: Registro<LancamentoMensal>[];
  /** Valores existentes no mês, por coluna (para os filtros multi-seleção). */
  opcoes: OpcoesColunas;
  /** Sugestões de autocomplete para o campo Observação (ano inteiro). */
  sugestoesObservacao: string[];
  aoEditar: (registro: Registro<LancamentoMensal>) => void;
  aoExcluir: (registro: Registro<LancamentoMensal>) => void;
  aoEditarObservacao: (linha: number | string, novoValor: string) => Promise<void>;
}

export function TabelaLancamentos({ registros, opcoes, sugestoesObservacao, aoEditar, aoExcluir, aoEditarObservacao }: Props) {
  const ordem = useStoreUI((s) => s.ordemLancamentos);
  const filtrosColunas = useStoreUI((s) => s.filtrosColunas);
  const alternarOrdem = useStoreUI((s) => s.alternarOrdemLancamentos);
  const alternarFiltro = useStoreUI((s) => s.alternarFiltroColuna);
  const limparFiltro = useStoreUI((s) => s.limparFiltroColuna);

  const colunas = useMemo(() => calcularColunas(registros), [registros]);

  const dadosVirtuais = useMemo(
    () => ({
      registros,
      colunas,
      linhaInicial: 0,
      aoEditar,
      aoExcluir,
      aoEditarObservacao,
      sugestoesObservacao,
    }),
    [registros, colunas, sugestoesObservacao, aoEditar, aoExcluir, aoEditarObservacao],
  );

  const virtualizar = registros.length > LIMITE_VIRTUALIZACAO;

  const direcaoDe = (campo: CampoOrdenavel): DirecaoOrdem | null =>
    ordem?.campo === campo ? ordem.direcao : null;

  const filtroDe = (campo: keyof OpcoesColunas) => {
    const aoAlternarComMapeamento = (valor: string) => {
      const valorOriginal = campo === 'forma' ? valorFormaPgto(valor) : valor;
      alternarFiltro(campo, valorOriginal);
    };
    const selecionadosExibidos =
      campo === 'forma'
        ? (filtrosColunas[campo] ?? []).map((v) => nomeFormaPgto(v))
        : (filtrosColunas[campo] ?? []);
    return {
      opcoes: opcoes[campo],
      selecionados: selecionadosExibidos,
      aoAlternar: aoAlternarComMapeamento,
      aoLimpar: () => limparFiltro(campo),
    };
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="overflow-x-auto">
        <div className="w-max">
          {/* cabeçalho */}
          <div
            style={{ gridTemplateColumns: colunas }}
            className="grid items-center gap-4 border-b border-slate-800 bg-slate-950/60 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
          >
            <ThOrdenavel
              rotulo="DATA"
              direcao={direcaoDe('data')}
              primeiraDirecao="desc"
              aoOrdenar={() => alternarOrdem('data', 'desc')}
            />
            <ThOrdenavel
              rotulo="CATEGORIA"
              direcao={direcaoDe('categoria')}
              aoOrdenar={() => alternarOrdem('categoria')}
              filtro={filtroDe('categoria')}
            />
            <ThOrdenavel
              rotulo="DESCRIÇÃO"
              direcao={direcaoDe('descricao')}
              aoOrdenar={() => alternarOrdem('descricao')}
              filtro={filtroDe('descricao')}
            />
            <ThOrdenavel
              rotulo="FORMA DE PGTO"
              direcao={direcaoDe('forma')}
              aoOrdenar={() => alternarOrdem('forma')}
              filtro={filtroDe('forma')}
            />
            <ThOrdenavel
              rotulo="TIPO"
              direcao={direcaoDe('tipo')}
              aoOrdenar={() => alternarOrdem('tipo')}
              filtro={filtroDe('tipo')}
            />
            <ThOrdenavel
              rotulo="QUEM PAGA"
              direcao={direcaoDe('quem')}
              aoOrdenar={() => alternarOrdem('quem')}
              filtro={filtroDe('quem')}
            />
            <span className="truncate" title="Observação (passe o mouse para ver o conteúdo completo)">
              OBSERVAÇÃO
            </span>
            <ThOrdenavel
              rotulo="VALOR"
              alinhamento="right"
              direcao={direcaoDe('valor')}
              primeiraDirecao="asc"
              aoOrdenar={() => alternarOrdem('valor')}
            />
            <span className="text-right">AÇÕES</span>
          </div>

          {/* corpo */}
          {virtualizar ? (
            <FixedSizeList
              height={Math.min(ALTURA_MAXIMA, registros.length * ALTURA_LINHA)}
              width="100%"
              itemCount={registros.length}
              itemSize={ALTURA_LINHA}
              itemData={dadosVirtuais}
              overscanCount={8}
            >
              {LinhaVirtual}
            </FixedSizeList>
          ) : (
            <div>
              {registros.map((registro) => (
                <Linha
                  key={registro.linha}
                  registro={registro}
                  colunas={colunas}
                  linha={registro.linha}
                  sugestoesObservacao={sugestoesObservacao}
                  aoEditar={aoEditar}
                  aoExcluir={aoExcluir}
                  aoEditarObservacao={aoEditarObservacao}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
