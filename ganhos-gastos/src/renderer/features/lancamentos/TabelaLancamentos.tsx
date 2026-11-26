import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Circle, Copy, Pencil, Trash2 } from 'lucide-react';
import type { LancamentoMensal, Registro } from '@/types/api-types';
import { BadgeCategoria } from '@/components/BadgeCategoria';
import { ThOrdenavel, type DirecaoOrdem } from '@/components/ThOrdenavel';
import { EntradaSugestoes } from '@/components/Campos';
import { TooltipTexto } from '@/components/TooltipTexto';
import { formatarData, formatarMoeda, nomeFormaPgto, valorFormaPgto } from '@/lib/formatar';
import { createPortal } from 'react-dom';
import { SelecaoTodos } from '@/components/SelecaoTodos';
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

  const salvandoObsRef = useRef(false);
  const salvarObs = async () => {
    if (salvandoObsRef.current) return;
    salvandoObsRef.current = true;
    const valor = textoObs.trim();
    if (valor === d.OBSERVAÇÃO) {
      setEditandoObs(false);
      salvandoObsRef.current = false;
      return;
    }
    setEditandoObs(false);
    await aoEditarObservacao(linha, valor);
    salvandoObsRef.current = false;
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
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); aoAlternarSelecao(registro.linha); }}
          onContextMenu={(e) => e.stopPropagation()}
          aria-label={selecionado ? 'Remover seleção' : 'Selecionar lançamento'}
          title={selecionado ? 'Remover seleção' : 'Selecionar lançamento'}
          className="rounded-full p-0.5"
        >
          {selecionado
            ? <CheckCircle2 className="h-4 w-4 text-sky-400" />
            : <Circle className="h-4 w-4 text-slate-500 hover:text-slate-300" />}
        </button>
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
  /** Conteúdo do rodapé fixo (ex.: totais do mês). */
  rodape?: ReactNode;
}

export function TabelaLancamentos({ registros, opcoes, sugestoesObservacao, aoEditar, aoExcluir, aoEditarObservacao, aoDuplicar, selecionados, aoAlternarSelecao, aoDefinirSelecao, rodape }: Props) {
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
      <div className="flex max-h-[68vh] flex-col overflow-x-auto overflow-y-auto">
        <div className="flex w-full min-w-max flex-col" style={{ minWidth: larguraMinima }}>
          {/* cabeçalho (fixo no topo enquanto a área rola) */}
          <div
            style={{ gridTemplateColumns: colunas }}
            className="sticky top-0 z-10 grid shrink-0 items-center gap-4 border-b border-slate-800 bg-slate-950/95 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur"
          >
            <SelecaoTodos visiveis={registros.map((r) => r.linha)} selecionados={selecionados} aoDefinirSelecao={aoDefinirSelecao} />
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

          {/* corpo (rolagem interna; cabeçalho e rodapé ficam visíveis) */}
          <div className="min-h-0 flex-1 overflow-y-auto">
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
          </div>

          {/* rodapé (fixo no fundo enquanto a área rola) */}
          {rodape && (
            <div className="sticky bottom-0 z-10 shrink-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
              {rodape}
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
