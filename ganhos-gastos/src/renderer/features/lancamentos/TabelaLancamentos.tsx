import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import type { LancamentoMensal, Registro } from '@/types/api-types';
import { BadgeCategoria } from '@/components/BadgeCategoria';
import { ThOrdenavel, type DirecaoOrdem } from '@/components/ThOrdenavel';
import { EntradaSugestoes } from '@/components/Campos';
import { TooltipTexto } from '@/components/TooltipTexto';
import { formatarData, formatarMoeda, nomeFormaPgto, valorFormaPgto } from '@/lib/formatar';
import { createPortal } from 'react-dom';
import { ehUltimaParcela } from '@/lib/parcelas';
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
 * Largura das colunas: mínimos fixos (cabe em qualquer tela) + distribuição
 * proporcional do espaço livre em unidades `fr`, com peso no maior texto de
 * cada coluna. Assim a tabela usa 100% da largura disponível e as sobras
 * vão para as colunas que têm mais conteúdo (ex.: Descrição e Observação).
 * Também devolve a largura mínima somada (para overflow-x em telas estreitas).
 */
function calcularColunas(registros: Registro<LancamentoMensal>[]): {
  colunas: string;
  larguraMinima: number;
} {
  const maiorLen = (pegar: (d: LancamentoMensal) => string, min: number, cap: number) => {
    let maior = min;
    for (const { dados } of registros) {
      const tamanho = (pegar(dados) ?? '').trim().length;
      if (tamanho > maior) maior = Math.min(cap, tamanho);
    }
    return Math.min(cap, Math.max(min, maior));
  };

  const GAP = 16; // gap-4 entre colunas
  const PADDING = 24; // px-3 nas laterais
  const DATA = 96;
  const VALOR = 112;
  const ACOES = 72;

  const categoria = maiorLen((d) => d.CATEGORIA, 10, 40);
  const descricao = maiorLen((d) => d.DESCRIÇÃO, 10, 60);
  const forma = maiorLen((d) => d['FORMA DE PGTO'], 10, 30);
  const tipo = maiorLen((d) => d.TIPO, 13, 30);
  const quem = maiorLen((d) => d['QUEM PAGA'], 8, 24);
  const obs = maiorLen((d) => d.OBSERVAÇÃO, 10, 60);

  const piso = (chars: number, extra = 32) => Math.ceil(chars * 7.5 + extra);
  const col = (chars: number, extra = 32) => `minmax(${piso(chars, extra)}px, ${chars}fr)`;

  const colunas = [
    `${DATA}px`,
    col(categoria, 40),
    col(descricao, 28),
    col(forma, 32),
    col(tipo, 32),
    col(quem, 32),
    col(obs, 28),
    `${VALOR}px`,
    `${ACOES}px`,
  ].join(' ');

  const larguraMinima =
    DATA +
    piso(categoria, 40) +
    piso(descricao, 28) +
    piso(forma, 32) +
    piso(tipo, 32) +
    piso(quem, 32) +
    piso(obs, 28) +
    VALOR +
    ACOES +
    GAP * 8 +
    PADDING;

  return { colunas, larguraMinima };
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
  /** Abre o menu de contexto (botão direito) — duplicar etc. */
  aoAbrirMenu: (e: React.MouseEvent, registro: Registro<LancamentoMensal>) => void;
  /** Esta linha está selecionada (checkbox da primeira coluna)? */
  selecionado: boolean;
  aoAlternarSelecao: (id: number | string) => void;
}

const Linha = memo(function Linha({ registro, colunas, linha, sugestoesObservacao, aoEditar, aoExcluir, aoEditarObservacao, aoAbrirMenu, selecionado, aoAlternarSelecao }: LinhaProps) {
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
      onContextMenu={(e) => {
        e.preventDefault();
        aoAbrirMenu(e, registro);
      }}
    >
      <span className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={selecionado}
          onChange={() => aoAlternarSelecao(registro.linha)}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
          aria-label="Selecionar lançamento"
          className="h-4 w-4 accent-sky-500 cursor-pointer"
        />
      </span>
      <span className="tabular-nums text-slate-400">{formatarData(d.DATA)}</span>
      <span className="min-w-0">
        <BadgeCategoria categoria={d.CATEGORIA} />
      </span>
      <span className="min-w-0 truncate text-slate-200" title={d.DESCRIÇÃO}>
        {d.DESCRIÇÃO || '—'}
      </span>
      <span className="min-w-0 truncate text-slate-400">{nomeFormaPgto(d['FORMA DE PGTO'])}</span>
      <span className="min-w-0 truncate text-sm text-slate-400" title={d.TIPO}>
        {d.TIPO}
      </span>
      <span className="min-w-0 truncate text-sm text-slate-400" title={d['QUEM PAGA']}>
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
  aoAbrirMenu: (e: React.MouseEvent, registro: Registro<LancamentoMensal>) => void;
  selecionados: (number | string)[];
  aoAlternarSelecao: (id: number | string) => void;
}

/** Checkbox do cabeçalho: marca/desmarca todos os registros VISÍVEIS. */
function SelecaoTodos({
  registros,
  selecionados,
  aoDefinirSelecao,
}: {
  registros: Registro<LancamentoMensal>[];
  selecionados: (number | string)[];
  aoDefinirSelecao: (ids: (number | string)[]) => void;
}) {
  const visiveis = registros.map((r) => r.linha);
  const qtdSel = visiveis.filter((id) => selecionados.includes(id)).length;
  const todos = visiveis.length > 0 && qtdSel === visiveis.length;
  const alguns = qtdSel > 0 && !todos;

  return (
    <input
      type="checkbox"
      checked={todos}
      ref={(el) => {
        if (el) el.indeterminate = alguns;
      }}
      onChange={() => {
        if (todos) {
          // todos marcados → desmarca os visíveis; mantém os de fora do filtro
          aoDefinirSelecao(selecionados.filter((id) => !visiveis.includes(id)));
        } else {
          aoDefinirSelecao([...new Set([...selecionados, ...visiveis])]);
        }
      }}
      aria-label="Selecionar todos os registros visíveis"
      title="Selecionar todos os registros visíveis"
      className="h-4 w-4 accent-sky-500 cursor-pointer"
    />
  );
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
        aoAbrirMenu={data.aoAbrirMenu}
        selecionado={data.selecionados.includes(registro.linha)}
        aoAlternarSelecao={data.aoAlternarSelecao}
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
  /** Duplicar a linha para o mês seguinte (menu de botão direito). */
  aoDuplicar?: (registro: Registro<LancamentoMensal>) => void;
  /** ids selecionados (checkboxes) — controlado pela página. */
  selecionados: (number | string)[];
  aoAlternarSelecao: (id: number | string) => void;
  aoDefinirSelecao: (ids: (number | string)[]) => void;
}

export function TabelaLancamentos({ registros, opcoes, sugestoesObservacao, aoEditar, aoExcluir, aoEditarObservacao, aoDuplicar, selecionados, aoAlternarSelecao, aoDefinirSelecao }: Props) {
  const ordem = useStoreUI((s) => s.ordemLancamentos);
  const filtrosColunas = useStoreUI((s) => s.filtrosColunas);
  const alternarOrdem = useStoreUI((s) => s.alternarOrdemLancamentos);
  const alternarFiltro = useStoreUI((s) => s.alternarFiltroColuna);
  const limparFiltro = useStoreUI((s) => s.limparFiltroColuna);

  const [menu, setMenu] = useState<{ x: number; y: number; registro: Registro<LancamentoMensal> } | null>(null);

  // Fecha o menu de contexto clicando fora, Esc, scroll ou redimensionando a tela
  useEffect(() => {
    if (!menu) return;
    const fechar = () => setMenu(null);
    const aoClicarFora = (e: MouseEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest('[data-menu-contexto]')) return;
      fechar();
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
    };
    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
    };
  }, [menu]);

  // Botão direito numa linha: abre o menu onde o usuário clicou
  // (na última parcela ("12/12") não oferece — o usuário optou por ocultar)
  const aoAbrirMenu = useCallback((e: React.MouseEvent, registro: Registro<LancamentoMensal>) => {
    if (ehUltimaParcela(registro.dados.OBSERVAÇÃO)) return;
    setMenu({
      x: Math.min(e.clientX, window.innerWidth - 296),
      y: Math.min(e.clientY, window.innerHeight - 178),
      registro,
    });
  }, []);

  const { colunas: colunasBase, larguraMinima: larguraBase } = useMemo(() => calcularColunas(registros), [registros]);
  const colunas = useMemo(() => `36px ${colunasBase}`, [colunasBase]);
  const larguraMinima = larguraBase + 36 + 16;

  const dadosVirtuais = useMemo(
    () => ({
      registros,
      colunas,
      linhaInicial: 0,
      aoEditar,
      aoExcluir,
      aoEditarObservacao,
      sugestoesObservacao,
      aoAbrirMenu,
      selecionados,
      aoAlternarSelecao,
    }),
    [registros, colunas, sugestoesObservacao, aoEditar, aoExcluir, aoEditarObservacao, aoAbrirMenu, selecionados, aoAlternarSelecao],
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
        <div className="w-full" style={{ minWidth: larguraMinima }}>
          {/* cabeçalho */}
          <div
            style={{ gridTemplateColumns: colunas }}
            className="grid items-center gap-4 border-b border-slate-800 bg-slate-950/60 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
          >
            <SelecaoTodos registros={registros} selecionados={selecionados} aoDefinirSelecao={aoDefinirSelecao} />
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
            <div className="w-full">
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
                  aoAbrirMenu={aoAbrirMenu}
                  selecionado={selecionados.includes(registro.linha)}
                  aoAlternarSelecao={aoAlternarSelecao}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ------- menu de contexto (botão direito): duplicar p/ mês seguinte ------- */}
      {menu && typeof document !== 'undefined' &&
        createPortal(
          <div
            data-menu-contexto
            role="menu"
            style={{ left: menu.x, top: menu.y }}
            className="fixed z-50 min-w-[260px] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-2xl shadow-black/60"
          >
            <button
              type="button"
              onClick={() => {
                const registro = menu.registro;
                setMenu(null);
                aoDuplicar?.(registro);
              }}
              className="flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-sky-600/15 hover:text-sky-200"
              role="menuitem"
            >
              <Copy className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
              <span className="min-w-0">
                <span className="block font-medium">Duplicar para o mês seguinte</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                  Mesmo lançamento, DATA +1 mês; parcela “N/12” vira “N+1/12”.
                </span>
              </span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
