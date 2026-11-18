import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import type { LinhaExtra, Registro, SiglaMes } from '@/types/api-types';
import { Botao } from '@/components/Botoes';
import { EstadoVazio } from '@/components/Estados';
import { Modal } from '@/components/Modal';
import { arredondar2, formatarData, formatarMoeda } from '@/lib/formatar';
import { useSnapshot } from '@/hooks/useRegistrosFiltrados';
import { useStoreAno } from '@/store/storeAno';
import { useStoreUI } from '@/store/storeUI';
import { FormExtra } from './FormExtra';
import { FormServico } from './FormServico';

type Tabela = 'ganhos' | 'gastos';

const ABAS: { id: Tabela; rotulo: string }[] = [
  { id: 'ganhos', rotulo: 'Serviços' },
  { id: 'gastos', rotulo: 'Gastos' },
];

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
  const [paraExcluir, setParaExcluir] = useState<Registro<LinhaExtra> | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const extras = snapshot?.extras ?? null;
  const registros = useMemo(() => {
    const lista = extras ? [...extras[abaExtras]] : [];
    // mais recentes primeiro
    return lista.sort((a, b) => (b.dados.DATA || '').localeCompare(a.dados.DATA || ''));
  }, [extras, abaExtras]);

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

      {registros.length === 0 ? (
        <EstadoVazio
          titulo={ehServico ? `Sem serviços em ${snapshot.ano}` : `Sem extras de gastos em ${snapshot.ano}`}
          descricao={
            ehServico
              ? 'Lance aqui os serviços que você fez: data, cliente, valores e o total vai para o FREELANCE do mês.'
              : 'Os registros desta tabela aparecem aqui.'
          }
          acao={
            <Botao variante="primario" icone={Plus} onClick={() => setModal({ modo: 'novo' })}>
              {ehServico ? 'Lançar o primeiro serviço' : 'Adicionar registro'}
            </Botao>
          }
        />
      ) : ehServico ? (
        /* ------------------------ tabela de SERVIÇOS ----------------------- */
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-right text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5 text-left font-semibold">Data</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Mês</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Cliente</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Serviço realizado</th>
                  <th className="px-4 py-2.5 font-semibold" title="Informativo — não entra no total">
                    Desp. Cliente
                  </th>
                  <th className="px-4 py-2.5 font-semibold">Peças</th>
                  <th className="px-4 py-2.5 font-semibold">Serviços</th>
                  <th className="px-4 py-2.5 font-semibold">Minhas Desp.</th>
                  <th className="px-4 py-2.5 font-semibold">Total</th>
                  <th className="px-4 py-2.5 font-semibold">Ações</th>
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
                    {registros.length} serviço(s) · o mês vem da data — alimenta o FREELANCE
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
                <tr className="border-b border-slate-800 bg-slate-950/60 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5 font-semibold">Mês</th>
                  <th className="px-4 py-2.5 font-semibold">Categoria</th>
                  <th className="px-4 py-2.5 font-semibold">Descrição</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Valor</th>
                  <th className="px-4 py-2.5 font-semibold">Data</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => (
                  <tr
                    key={registro.linha}
                    className="border-b border-slate-800/70 transition hover:bg-slate-800/25"
                  >
                    <td className="px-4 py-2.5 font-semibold text-slate-300">{registro.dados['MÊS']}</td>
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
                  <td className="px-4 py-2.5 text-slate-500" colSpan={3}>
                    {registros.length} registro(s) em {extras.aba}
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
