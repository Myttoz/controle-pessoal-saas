import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FilterX, Plus, Search, Trash2 } from 'lucide-react';
import type { LancamentoMensal, Registro } from '@/types/api-types';
import { Botao } from '@/components/Botoes';
import { Campo, Entrada, Selecao } from '@/components/Campos';
import { AreaErro, Carregando, EstadoVazio } from '@/components/Estados';
import { MesTabs } from '@/components/MesTabs';
import { Modal } from '@/components/Modal';
import { formatarMoeda, nomeFormaPgto, arredondar2 } from '@/lib/formatar';
import { NOMES_MESES } from '@/lib/meses';
import { sugestoesDescricoes, sugestoesObservacoes } from '@/lib/sugestoes';
import { calcularResumo, gastosProximoMes } from '@/lib/resumo';
import { DespesasProximoMes } from './DespesasProximoMes';
import { resumirDivisao } from '@/lib/divisao';
import { useRegistrosFiltrados } from '@/hooks/useRegistrosFiltrados';
import { usePedidoNovo } from '@/hooks/usePedidoNovo';
import { useOpcoes } from '@/hooks/useOpcoes';
import { useStoreAno } from '@/store/storeAno';
import { useStoreLocal } from '@/store/storeLocal';
import { useStoreUI, type Filtros } from '@/store/storeUI';
import { FormLancamento } from './FormLancamento';
import { TabelaLancamentos, type OpcoesColunas } from './TabelaLancamentos';

const FILTROS_DE_SELECT: { campo: keyof Filtros; rotulo: string; opcoes: 'CATEGORIA' | 'TIPO' | 'FORMA DE PGTO' | 'QUEM PAGA' }[] = [
  { campo: 'categoria', rotulo: 'Categoria', opcoes: 'CATEGORIA' },
  { campo: 'tipo', rotulo: 'Tipo', opcoes: 'TIPO' },
  { campo: 'forma', rotulo: 'Forma pgto', opcoes: 'FORMA DE PGTO' },
  { campo: 'quem', rotulo: 'Quem paga', opcoes: 'QUEM PAGA' },
];

function SelectFiltro({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  opcoes: string[];
  aoMudar: (valor: string) => void;
}) {
  return (
    <Campo rotulo={rotulo}>
      <Selecao value={valor} onChange={(e) => aoMudar(e.target.value)}>
        <option value="">Todos</option>
        {opcoes.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </Selecao>
    </Campo>
  );
}

export function LancamentosPage() {
  const {
    ano,
    mes,
    aba,
    mesSnapshot,
    registros,
    quantidade,
    quantidadeTotal,
    totalDoMes,
  } = useRegistrosFiltrados();

  const snapshot = useStoreAno((s) => (s.anoSelecionado != null ? s.snapshots[s.anoSelecionado] : undefined));
  const carregando = useStoreAno((s) => s.carregando);
  const erro = useStoreAno((s) => s.erro);
  const revalidar = useStoreAno((s) => s.revalidar);
  const removerLancamento = useStoreAno((s) => s.removerLancamento);
  const editarLancamento = useStoreAno((s) => s.editarLancamento);
  const duplicarLancamento = useStoreAno((s) => s.duplicarLancamento);

  const setMes = useStoreUI((s) => s.setMes);
  const busca = useStoreUI((s) => s.busca);
  const setBusca = useStoreUI((s) => s.setBusca);
  const filtros = useStoreUI((s) => s.filtros);
  const setFiltro = useStoreUI((s) => s.setFiltro);
  const limparFiltros = useStoreUI((s) => s.limparFiltros);
  const modal = useStoreUI((s) => s.modalLancamento);
  const fecharModal = useStoreUI((s) => s.fecharModalLancamento);
  const abrirNovo = useStoreUI((s) => s.abrirNovoLancamento);
  const focoBusca = useStoreUI((s) => s.focoBusca);
  const selecionados = useStoreUI((s) => s.selecionadosLanc);
  const alternarSelecao = useStoreUI((s) => s.alternarSelecaoLanc);
  const definirSelecao = useStoreUI((s) => s.definirSelecaoLanc);
  const selCount = useMemo(
    () => registros.filter((r) => selecionados.includes(r.linha)).length,
    [registros, selecionados],
  );
  const selTotal = useMemo(
    () =>
      arredondar2(
        registros
          .filter((r) => selecionados.includes(r.linha))
          .reduce((s, r) => s + (Number(r.dados.VALOR) || 0), 0),
      ),
    [registros, selecionados],
  );

  // Ctrl+O → novo lançamento (global por setor)
  usePedidoNovo(() => {
    if (!aba) {
      useStoreUI.getState().toast('info', `Não existe a aba do mês ${mes} no ano selecionado.`);
      return;
    }
    abrirNovo();
  });

  const buscaRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focoBusca > 0) buscaRef.current?.focus();
  }, [focoBusca]);

  const [paraExcluir, setParaExcluir] = useState<Registro<LancamentoMensal> | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const opcoesCategoria = useOpcoes('CATEGORIA');
  const opcoesTipo = useOpcoes('TIPO');
  const opcoesForma = useOpcoes('FORMA DE PGTO');
  const opcoesQuem = useOpcoes('QUEM PAGA');
  const mapaOpcoes: Record<string, string[]> = {
    CATEGORIA: opcoesCategoria,
    TIPO: opcoesTipo,
    'FORMA DE PGTO': opcoesForma.map(nomeFormaPgto),
    'QUEM PAGA': opcoesQuem,
  };

  // ---- Restante do mês (mesmos números do Resumo Pagamentos) ----
  const dadosLocais = useStoreLocal((s) => s.dados);
  const resumoMesConfig = useMemo(
    () =>
      ano != null && snapshot ? calcularResumo(snapshot, dadosLocais.config, ano, NOMES_MESES) : null,
    [ano, snapshot, dadosLocais.config],
  );
  const linhaRestanteMes = resumoMesConfig?.linhas.find((l) => l.mes === mes) ?? null;
  const gastosProximoMesValor = gastosProximoMes(mesSnapshot?.registros ?? []);

  // valores EXISTENTES no mês (sem filtro algum) — base dos menus multi-seleção
  const opcoesColunas = useMemo<OpcoesColunas>(() => {
    const bruto = mesSnapshot?.registros ?? [];
    const unicos = (pegar: (d: LancamentoMensal) => string | undefined) =>
      [...new Set(bruto.map((r) => pegar(r.dados) ?? '').filter((v) => v !== ''))];
    // Categoria sempre mostra TODAS as opções (não só as usadas no mês)
    const existentes = unicos((d) => d.CATEGORIA).filter((v) => !opcoesCategoria.includes(v));
    return {
      categoria: [...opcoesCategoria, ...existentes].sort((a, b) =>
        a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
      ),
      tipo: unicos((d) => d.TIPO).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })),
      forma: unicos((d) => d['FORMA DE PGTO']).map(nomeFormaPgto).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })),
      quem: unicos((d) => d['QUEM PAGA']).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })),
      descricao: unicos((d) => d.DESCRIÇÃO).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })),
    };
  }, [mesSnapshot, opcoesCategoria]);

  // ---- sugestões a partir do ano inteiro (para autocomplete do form) ----
  const opcoesDescricao = useMemo(() => sugestoesDescricoes(snapshot), [snapshot]);
  const opcoesObservacao = useMemo(() => sugestoesObservacoes(snapshot), [snapshot]);

  const filtrosColunas = useStoreUI((s) => s.filtrosColunas);
  const temFiltroColunas = useMemo(
    () => Object.values(filtrosColunas).some((lista) => lista.length > 0),
    [filtrosColunas],
  );

  const aoEditar = useCallback(
    (registro: Registro<LancamentoMensal>) => {
      if (!aba) return;
      useStoreUI.getState().abrirEditarLancamento(aba, registro);
    },
    [aba],
  );

  const aoExcluir = useCallback((registro: Registro<LancamentoMensal>) => {
    setParaExcluir(registro);
  }, []);

  const aoEditarObservacao = useCallback(
    async (linha: number | string, novoValor: string) => {
      if (!ano || !aba) return;
      await editarLancamento(ano, aba, linha, { OBSERVAÇÃO: novoValor });
    },
    [ano, aba, editarLancamento],
  );

  const confirmarExclusao = async () => {
    if (!paraExcluir || ano == null || !aba) return;
    setExcluindo(true);
    await removerLancamento(ano, aba, paraExcluir.linha);
    setExcluindo(false);
    setParaExcluir(null);
  };

  const temFiltroAtivo =
    busca.trim().length > 0 ||
    temFiltroColunas ||
    Object.values(filtros).some((v) => v !== '');

  // divisão de contas com a Lívia sobre o que está VISÍVEL (com filtros)
  const divisao = useMemo(() => resumirDivisao(registros), [registros]);

  // ---------- estados de carregamento/erro (sem cache nenhum) ----------
  if (!snapshot) {
    if (carregando) return <Carregando />;
    if (erro) return <AreaErro mensagem={erro} aoTentar={() => void revalidar()} />;
    return (
      <EstadoVazio
        titulo="Sem dados carregados"
        descricao="Não foi possível carregar o ano selecionado."
        acao={
          <Botao onClick={() => void revalidar()}>Atualizar</Botao>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ------- mês + novo ------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MesTabs meses={snapshot.meses} selecionado={mes} aoSelecionar={setMes} />
        <Botao variante="primario" icone={Plus} onClick={abrirNovo} disabled={!aba}>
          Novo lançamento
          <kbd className="ml-1 hidden rounded border border-sky-400/40 px-1 text-[10px] text-sky-200/80 sm:inline">
            Ctrl+O
          </kbd>
        </Botao>
      </div>

      {/* ------- busca + filtros (100% local, debounce 200ms) ------- */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(140px,1fr))_repeat(2,minmax(140px,0.8fr))_auto] lg:items-end">
          <Campo rotulo="Buscar">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Entrada
                ref={buscaRef}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Descrição, categoria, observação…"
                className="!pl-8"
              />
            </div>
          </Campo>

          {FILTROS_DE_SELECT.map(({ campo, rotulo, opcoes }) => (
            <SelectFiltro
              key={campo}
              rotulo={rotulo}
              valor={filtros[campo]}
              opcoes={mapaOpcoes[opcoes]}
              aoMudar={(valor) => setFiltro(campo, valor)}
            />
          ))}

          <Campo rotulo="Data de">
            <Entrada
              type="date"
              value={filtros.de}
              onChange={(e) => setFiltro('de', e.target.value)}
            />
          </Campo>
          <Campo rotulo="Data até">
            <Entrada
              type="date"
              value={filtros.ate}
              onChange={(e) => setFiltro('ate', e.target.value)}
            />
          </Campo>

          <div className="flex items-end pb-0.5">
            <Botao
              icone={FilterX}
              onClick={limparFiltros}
              disabled={!temFiltroAtivo}
              title="Limpar busca e filtros"
            >
              Limpar
            </Botao>
          </div>
        </div>
      </div>

      {/* ------- restante do mês (mesmos números de Resumo Pagamentos) ------- */}
      {linhaRestanteMes && ano != null && (
        <DespesasProximoMes ano={ano} mes={mes} restante={linhaRestanteMes.restante} />
      )}

      {/* ------- tabela ------- */}
      {!aba ? (
        <EstadoVazio
          titulo={`A aba do mês ${mes} não existe em ${snapshot.ano}`}
          descricao="Esta aba ainda não foi criada para o ano selecionado. Escolha outro mês ou crie o ano na Gestão Anual."
        />
      ) : carregando ? (
        <Carregando texto="Atualizando o ano…" />
      ) : registros.length === 0 ? (
        <EstadoVazio
          titulo={
            temFiltroAtivo
              ? 'Nenhum registro corresponde aos filtros'
              : `Sem lançamentos em ${mes}/${snapshot.ano}`
          }
          descricao={
            temFiltroAtivo
              ? `Existem ${quantidadeTotal} lançamento(s) neste mês — ajuste a busca ou limpe os filtros.`
              : 'Cadastre o primeiro lançamento deste mês.'
          }
          acao={
            temFiltroAtivo ? (
              <Botao icone={FilterX} onClick={limparFiltros}>
                Limpar filtros
              </Botao>
            ) : (
              <Botao variante="primario" icone={Plus} onClick={abrirNovo}>
                Novo lançamento
              </Botao>
            )
          }
        />
      ) : (
        <TabelaLancamentos
          registros={registros}
          opcoes={opcoesColunas}
          sugestoesObservacao={opcoesObservacao}
          aoEditar={aoEditar}
          aoExcluir={aoExcluir}
          aoEditarObservacao={aoEditarObservacao}
          aoDuplicar={(registro) => void duplicarLancamento(ano ?? 0, aba ?? '', registro.linha)}
          selecionados={selecionados}
          aoAlternarSelecao={alternarSelecao}
          aoDefinirSelecao={definirSelecao}
        />
      )}

      {/* ------- totais (memoizados no hook) ------- */}
      {registros.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm">
          <span className="text-slate-400">
            {selecionados.length > 0 ? (
              <>
                {selCount} de {quantidadeTotal} registro(s) selecionado(s) ·{' '}
                <span className="font-semibold text-violet-300">R$ {formatarMoeda(selTotal)}</span>
              </>
            ) : (
              <>
                {quantidade} de {quantidadeTotal} registro(s) · mês{' '}
                <span className="text-slate-200">{formatarMoeda(totalDoMes)}</span>
              </>
            )}
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
            <span className="text-slate-400">
              Total Gasto:{' '}
              <span className="font-semibold text-slate-100">
                {formatarMoeda(divisao.totalGasto)}
              </span>
            </span>
            <span
              className="text-slate-400"
              title="Soma de (Dividido 50/50 ÷ 2) com tudo que é da Lívia — o que ela me repassa"
            >
              Recebo Livia:{' '}
              <span className="font-semibold text-amber-300">
                {formatarMoeda(divisao.receboLivia)}
              </span>
            </span>
            <span
              className="text-slate-400"
              title="Total Gasto − Recebo Livia — o que realmente sai do meu bolso"
            >
              Total Real:{' '}
              <span className="font-semibold text-emerald-300">
                {formatarMoeda(divisao.totalReal)}
              </span>
            </span>
            <span
              className="text-slate-400"
              title="Soma dos lançamentos marcados como 'Fatura futura' — quanto desta despesa só aparecerá no mês seguinte"
            >
              Gastos próximo mês:{' '}
              <span className="font-semibold text-violet-300">
                {formatarMoeda(gastosProximoMesValor)}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* ------- modal de cadastro/edição ------- */}
      {modal && aba && (
        <FormLancamento
          aba={modal.modo === 'editar' ? modal.aba : aba}
          registro={modal.modo === 'editar' ? modal.registro : null}
          sugestoesDescricao={opcoesDescricao}
          sugestoesObservacao={opcoesObservacao}
          aoFechar={fecharModal}
        />
      )}

      {/* ------- confirmação de exclusão ------- */}
      <Modal
        aberto={paraExcluir !== null}
        titulo="Excluir lançamento"
        aoFechar={() => setParaExcluir(null)}
        largura="max-w-md"
        rodape={
          <>
            <Botao onClick={() => setParaExcluir(null)} disabled={excluindo}>
              Cancelar
            </Botao>
            <Botao variante="perigo" icone={Trash2} carregando={excluindo} onClick={() => void confirmarExclusao()}>
              Excluir
            </Botao>
          </>
        }
      >
        {paraExcluir && (
          <div className="space-y-2 text-sm text-slate-300">
            <p>
              Remover <strong className="text-slate-100">{paraExcluir.dados.DESCRIÇÃO}</strong> (
              {formatarMoeda(paraExcluir.dados.VALOR)}) da aba {aba}?
            </p>
            <p className="text-xs text-slate-500">
              A linha {paraExcluir.linha} será apagada da planilha. Esta ação não pode ser desfeita.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
