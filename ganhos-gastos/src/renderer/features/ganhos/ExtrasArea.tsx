import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, Wallet, X } from 'lucide-react';
import type { LinhaExtra, Registro, SiglaMes } from '@/types/api-types';
import { Botao } from '@/components/Botoes';
import { EstadoVazio } from '@/components/Estados';
import { Modal } from '@/components/Modal';
import { ThOrdenavel, type DirecaoOrdem } from '@/components/ThOrdenavel';
import { arredondar2, formatarData, formatarMoeda } from '@/lib/formatar';
import { SIGLAS } from '@/lib/meses';
import { useSnapshot } from '@/hooks/useRegistrosFiltrados';
import { useStoreAno } from '@/store/storeAno';
import { useStoreUI } from '@/store/storeUI';
import { usePedidoNovo } from '@/hooks/usePedidoNovo';
import { FormExtra } from './FormExtra';
import { FormServico } from './FormServico';

type Tabela = 'ganhos' | 'gastos';
type CampoOrdenavel = 'data' | 'mes';

const ABAS: { id: Tabela; rotulo: string }[] = [
  { id: 'ganhos', rotulo: 'Serviços' },
  { id: 'gastos', rotulo: 'Gastos' },
];

const ORDEN_INICIAL: Record<CampoOrdenavel, DirecaoOrdem> = { data: 'desc', mes: 'asc' };
const ordemDoMes = (m: string) => SIGLAS.indexOf(m as SiglaMes);

/** Aba interna "Extras": Serviços (CRUD completo) + Gastos (modo simples). */
export function ExtrasArea() {
  const snapshot = useSnapshot();
  const ano = useStoreAno((s) => s.anoSelecionado);
  const removerExtra = useStoreAno((s) => s.removerExtra);

  const abaExtras = useStoreUI((s) => s.abaExtras);
  const setAbaExtras = useStoreUI((s) => s.setAbaExtras);
  const mesPadrao = useStoreUI((s) => s.mes);

  const [modal, setModal] = useState<
    { modo: 'novo' } | { modo: 'editar'; registro: Registro<LinhaExtra> }
  | null>(null);

  // Ctrl+O → novo lançamento da aba ativa (Serviços ou Gastos)
  usePedidoNovo(() => setModal({ modo: 'novo' }));

  const [paraExcluir, setParaExcluir] = useState<Registro<LinhaExtra> | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // ---------- busca + filtros de cabeçalho + ordenação ----------
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<{ campo: CampoOrdenavel; direcao: DirecaoOrdem } | null>({
    campo: 'data',
    direcao: 'desc',
  });
  const [filSel, setFilSel] = useState<{
    mes: string[];
    cliente: string[];
    descricao: string[];
    categoria: string[];
  }>({ mes: [], cliente: [], descricao: [], categoria: [] });

  const extras = snapshot?.extras ?? null;
  const registrosBase = useMemo(
    () => (extras ? [...extras[abaExtras]] : []),
    [extras, abaExtras],
  );

  const alternarFiltro = (campo: keyof typeof filSel, valor: string) =>
    setFilSel((atual) => ({
      ...atual,
      [campo]: atual[campo].includes(valor)
        ? atual[campo].filter((v) => v !== valor)
        : [...atual[campo], valor],
    }));

  const limparFiltro = (campo: keyof typeof filSel) =>
    setFilSel((atual) => ({ ...atual, [campo]: [] }));

  const limparTodos = () => {
    setBusca('');
    setFilSel({ mes: [], cliente: [], descricao: [], categoria: [] });
  };

  const temFiltroAtivo =
    busca.trim().length > 0 || Object.values(filSel).some((lista) => lista.length > 0);

  const alternarOrdem = (campo: CampoOrdenavel) => {
    const inicial = ORDEN_INICIAL[campo];
    setOrdem((atual) => {
      if (!atual || atual.campo !== campo) return { campo, direcao: inicial };
      if (atual.direcao === inicial)
        return { campo, direcao: inicial === 'asc' ? 'desc' : 'asc' };
      return null;
    });
  };

  // opções (valores existentes, sem filtro algum)
  const opcoes = useMemo(() => {
    const unicos = (pegar: (d: LinhaExtra) => string) =>
      [...new Set(registrosBase.map((r) => pegar(r.dados).trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
      );
    return {
      mes: [...new Set(registrosBase.map((r) => r.dados['MÊS']))].sort(
        (a, b) => ordemDoMes(a) - ordemDoMes(b),
      ),
      cliente: unicos((d) => d.CLIENTE ?? ''),
      descricao: unicos((d) => d.DESCRIÇÃO),
      categoria: unicos((d) => d.CATEGORIA),
    };
  }, [registrosBase]);

  const registros = useMemo(() => {
    let lista = registrosBase;
    if (filSel.mes.length) lista = lista.filter((r) => filSel.mes.includes(r.dados['MÊS']));
    if (filSel.cliente.length)
      lista = lista.filter((r) => filSel.cliente.includes((r.dados.CLIENTE ?? '').trim()));
    if (filSel.descricao.length)
      lista = lista.filter((r) => filSel.descricao.includes(r.dados.DESCRIÇÃO.trim()));
    if (filSel.categoria.length)
      lista = lista.filter((r) => filSel.categoria.includes(r.dados.CATEGORIA.trim()));

    const termo = busca.trim().toLowerCase();
    if (termo) {
      lista = lista.filter((r) => {
        const d = r.dados;
        const alvo = [
          d['MÊS'],
          d.DATA,
          d.CLIENTE ?? '',
          d.CATEGORIA,
          d.DESCRIÇÃO,
        ]
          .join(' ')
          .toLowerCase();
        return alvo.includes(termo);
      });
    }

    if (ordem) {
      const chave = (r: (typeof lista)[number]) =>
        ordem.campo === 'data' ? (r.dados.DATA ?? '') : String(ordemDoMes(r.dados['MÊS'])).padStart(2, '0');
      lista = [...lista].sort((a, b) =>
        ordem.direcao === 'asc' ? chave(a).localeCompare(chave(b)) : chave(b).localeCompare(chave(a)),
      );
    }
    return lista;
  }, [registrosBase, filSel, busca, ordem]);

  const total = useMemo(
    () => arredondar2(registros.reduce((soma, r) => soma + (Number(r.dados.VALOR) || 0), 0)),
    [registros],
  );

  const confirmarExclusao = async () => {
    if (!paraExcluir || ano == null || !extras) return;
    setExcluindo(true);
    await removerExtra(ano, abaExtras, paraExcluir.linha);
    setExcluindo(false);
    setParaExcluir(null);
  };

  if (!snapshot) return null;

  if (!extras) {
    return (
      <EstadoVazio
        icone={Wallet}
        titulo={`A aba de extras do ano ${snapshot.ano} não existe`}
        descricao="Crie o ano na Gestão Anual para gerar a aba 'Extras'."
      />
    );
  }

  const ehServico = abaExtras === 'ganhos';

  const filtroDe = (
    opcoes: string[],
    selecionados: string[],
    aoAlternar: (v: string) => void,
    aoLimpar: () => void,
  ) => ({ opcoes, selecionados, aoAlternar, aoLimpar });

  return (
    <div className="space-y-4">
      {/* abas internas + novo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {ABAS.map(({ id, rotulo }) => (
            <button
              key={id}
              type="button"
              onClick={() => setAbaExtras(id)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                abaExtras === id
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {rotulo}
              <span className="ml-1.5 text-xs text-slate-400">{extras[id].length}</span>
            </button>
          ))}
        </div>

        <Botao
          variante="primario"
          icone={Plus}
          onClick={() => setModal({ modo: 'novo' })}
        >
          {ehServico ? 'Novo serviço' : 'Novo extra de gastos'}
        </Botao>
      </div>

      {ehServico && (
        <p className="text-[11px] leading-relaxed text-slate-500">
          O total de cada serviço (ganhos peças + ganhos serviços − minhas despesas) entra
          automaticamente como <strong>FREELANCE</strong> na aba Salário do mês correspondente.
          A coluna "Despesas cliente" é informativa e não entra nos cálculos. Novos campos exigem
          a migração <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">sql/002-servicos-extras.sql</code>{' '}
          (uma vez no SQL Editor do Supabase).
        </p>
      )}

      {/* ---------- busca + limpeza ---------- */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            autoComplete="off"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={ehServico ? 'Cliente, serviço, data, mês…' : 'Descrição, categoria, data…'}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
          />
        </div>
        {temFiltroAtivo && (
          <button
            type="button"
            onClick={limparTodos}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </button>
        )}
      </div>

      {registros.length === 0 ? (
        <EstadoVazio
          titulo={
            temFiltroAtivo
              ? 'Nada encontrado com a busca/filtros'
              : ehServico
                ? `Sem serviços em ${snapshot.ano}`
                : `Sem extras de gastos em ${snapshot.ano}`
          }
          descricao={
            temFiltroAtivo
              ? 'Ajuste a busca ou limpe os filtros para ver mais registros.'
              : ehServico
                ? 'Lance aqui os serviços que você fez: data, cliente, valores e o total vai para o FREELANCE do mês.'
                : 'Os registros desta tabela aparecem aqui.'
          }
          acao={
            temFiltroAtivo ? (
              <Botao variante="secundario" onClick={limparTodos}>
                Limpar filtros
              </Botao>
            ) : (
              <Botao variante="primario" icone={Plus} onClick={() => setModal({ modo: 'novo' })}>
                {ehServico ? 'Lançar o primeiro serviço' : 'Adicionar registro'}
              </Botao>
            )
          }
        />
      ) : ehServico ? (
        /* ------------------------ tabela de SERVIÇOS ----------------------- */
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-left">
                    <ThOrdenavel
                      rotulo="DATA"
                      direcao={ordem?.campo === 'data' ? ordem.direcao : null}
                      primeiraDirecao="desc"
                      aoOrdenar={() => alternarOrdem('data')}
                    />
                  </th>
                  <th className="px-3 py-3 text-left">
                    <ThOrdenavel
                      rotulo="MÊS"
                      direcao={ordem?.campo === 'mes' ? ordem.direcao : null}
                      primeiraDirecao="asc"
                      aoOrdenar={() => alternarOrdem('mes')}
                      filtro={filtroDe(opcoes.mes, filSel.mes, (v) => alternarFiltro('mes', v), () => limparFiltro('mes'))}
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <ThOrdenavel
                      rotulo="CLIENTE"
                      direcao={null}
                      aoOrdenar={() => undefined}
                      filtro={filtroDe(opcoes.cliente, filSel.cliente, (v) => alternarFiltro('cliente', v), () => limparFiltro('cliente'))}
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <ThOrdenavel
                      rotulo="SERVIÇO REALIZADO"
                      direcao={null}
                      aoOrdenar={() => undefined}
                      filtro={filtroDe(opcoes.descricao, filSel.descricao, (v) => alternarFiltro('descricao', v), () => limparFiltro('descricao'))}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold" title="Informativo — não entra no total">
                    Desp. Cliente
                  </th>
                  <th className="px-4 py-3 font-semibold">Peças</th>
                  <th className="px-4 py-3 font-semibold">Serviços</th>
                  <th className="px-4 py-3 font-semibold">Minhas Desp.</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => {
                  const d = registro.dados;
                  const ehLegado =
                    d.GANHOS_PECAS == null &&
                    d.GANHOS_SERVICOS == null &&
                    d.MINHAS_DESPESAS == null &&
                    d.CLIENTE == null &&
                    d.DESPESAS_CLIENTE == null;
                  return (
                    <tr
                      key={registro.linha}
                      className="border-b border-slate-800/70 transition hover:bg-slate-800/25"
                    >
                      <td className="px-4 py-2.5 tabular-nums text-slate-400">{formatarData(d.DATA)}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-300">{d['MÊS']}</td>
                      <td className="max-w-[140px] truncate px-4 py-2.5 text-slate-300" title={d.CLIENTE || ''}>
                        {d.CLIENTE || '—'}
                      </td>
                      <td className="max-w-[280px] truncate px-4 py-2.5 text-slate-200" title={d.DESCRIÇÃO}>
                        {d.DESCRIÇÃO}
                        {ehLegado && (
                          <span className="ml-1.5 rounded bg-slate-800 px-1 py-0.5 text-[10px] uppercase text-slate-500" title="Lançamento antigo: sem detalhe de peças/serviços">
                            legado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500" title="Informativo — não entra nos cálculos">
                        {d.DESPESAS_CLIENTE != null && d.DESPESAS_CLIENTE > 0
                          ? formatarMoeda(d.DESPESAS_CLIENTE)
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-200">
                        {d.GANHOS_PECAS != null && d.GANHOS_PECAS > 0 ? formatarMoeda(d.GANHOS_PECAS) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-200">
                        {d.GANHOS_SERVICOS != null && d.GANHOS_SERVICOS > 0 ? formatarMoeda(d.GANHOS_SERVICOS) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-rose-300">
                        {d.MINHAS_DESPESAS != null && d.MINHAS_DESPESAS > 0 ? formatarMoeda(d.MINHAS_DESPESAS) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-emerald-300">
                        {formatarMoeda(d.VALOR)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Editar serviço"
                            aria-label="Editar serviço"
                            onClick={() => setModal({ modo: 'editar', registro })}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-700/60 hover:text-sky-300"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Excluir serviço"
                            aria-label="Excluir serviço"
                            onClick={() => setParaExcluir(registro)}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-900/50 hover:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-950/50 text-sm">
                  <td className="px-4 py-2.5 text-slate-500" colSpan={8}>
                    {registros.length} de {registrosBase.length} serviço(s)
                    {temFiltroAtivo ? ' (filtrados) · ' : ' · '}o mês vem da data — alimenta o FREELANCE
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-300">
                    {formatarMoeda(total)}
                  </td>
                  <td className="px-4 py-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* ------------------------ tabela de GASTOS (simples) ----------------------- */
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-3">
                    <ThOrdenavel
                      rotulo="MÊS"
                      direcao={ordem?.campo === 'mes' ? ordem.direcao : null}
                      primeiraDirecao="asc"
                      aoOrdenar={() => alternarOrdem('mes')}
                      filtro={filtroDe(opcoes.mes, filSel.mes, (v) => alternarFiltro('mes', v), () => limparFiltro('mes'))}
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <ThOrdenavel
                      rotulo="CATEGORIA"
                      direcao={null}
                      aoOrdenar={() => undefined}
                      filtro={filtroDe(opcoes.categoria, filSel.categoria, (v) => alternarFiltro('categoria', v), () => limparFiltro('categoria'))}
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <ThOrdenavel
                      rotulo="DESCRIÇÃO"
                      direcao={null}
                      aoOrdenar={() => undefined}
                      filtro={filtroDe(opcoes.descricao, filSel.descricao, (v) => alternarFiltro('descricao', v), () => limparFiltro('descricao'))}
                    />
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold">Valor</th>
                  <th className="px-4 py-3">
                    <ThOrdenavel
                      rotulo="DATA"
                      direcao={ordem?.campo === 'data' ? ordem.direcao : null}
                      primeiraDirecao="desc"
                      aoOrdenar={() => alternarOrdem('data')}
                    />
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => (
                  <tr
                    key={registro.linha}
                    className="border-b border-slate-800/70 transition hover:bg-slate-800/25"
                  >
                    <td className="px-3 py-2.5 font-semibold text-slate-300">{registro.dados['MÊS']}</td>
                    <td className="px-4 py-2.5 text-slate-300">{registro.dados.CATEGORIA}</td>
                    <td className="max-w-[320px] truncate px-4 py-2.5 text-slate-200" title={registro.dados.DESCRIÇÃO}>
                      {registro.dados.DESCRIÇÃO}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-100">
                      {formatarMoeda(registro.dados.VALOR)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-400">{formatarData(registro.dados.DATA)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Editar registro"
                          aria-label="Editar registro"
                          onClick={() => setModal({ modo: 'editar', registro })}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-700/60 hover:text-sky-300"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Excluir registro"
                          aria-label="Excluir registro"
                          onClick={() => setParaExcluir(registro)}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-900/50 hover:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-950/50 text-sm">
                  <td className="px-3 py-2.5 text-slate-500" colSpan={3}>
                    {registros.length} de {registrosBase.length} registro(s)
                    {temFiltroAtivo ? ' (filtrados)' : ''}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-300">
                    {formatarMoeda(total)}
                  </td>
                  <td className="px-4 py-2.5" colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* modal criar/editar */}
      {modal &&
        (ehServico ? (
          <FormServico
            registro={modal.modo === 'editar' ? modal.registro : null}
            aoFechar={() => setModal(null)}
          />
        ) : (
          <FormExtra
            tabela="gastos"
            registro={modal.modo === 'editar' ? modal.registro : null}
            mesPadrao={mesPadrao as SiglaMes}
            aoFechar={() => setModal(null)}
          />
        ))}

      {/* confirmação de exclusão */}
      <Modal
        aberto={paraExcluir !== null}
        titulo="Excluir registro de extra"
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
          <p className="text-sm text-slate-300">
            Remover{' '}
            <strong className="text-slate-100">
              {paraExcluir.dados.DESCRIÇÃO}
              {paraExcluir.dados.CLIENTE ? ` — ${paraExcluir.dados.CLIENTE}` : ''}
            </strong>{' '}
            ({formatarMoeda(paraExcluir.dados.VALOR)}) da tabela de {abaExtras}?
          </p>
        )}
      </Modal>
    </div>
  );
}
