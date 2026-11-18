import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Banknote, Pencil, Wallet } from 'lucide-react';
import type { LinhaSalario, Registro } from '@/types/api-types';
import { AreaErro, Carregando, EstadoVazio } from '@/components/Estados';
import { arredondar2, formatarMoeda } from '@/lib/formatar';
import { NOMES_MESES, SIGLAS } from '@/lib/meses';
import { horaExtraPorMes } from '@/lib/calculos';
import { useSnapshot } from '@/hooks/useRegistrosFiltrados';
import { useStoreAno } from '@/store/storeAno';
import { useStoreLocal } from '@/store/storeLocal';
import { useStoreUI } from '@/store/storeUI';
import { usePedidoNovo } from '@/hooks/usePedidoNovo';
import { ExtrasArea } from './ExtrasArea';
import { FormSalario } from './FormSalario';

type AbaInterna = 'salario' | 'extras';

const ABAS: { id: AbaInterna; rotulo: string; icone: LucideIcon }[] = [
  { id: 'salario', rotulo: 'Salário', icone: Banknote },
  { id: 'extras', rotulo: 'Extras', icone: Wallet },
];

function Num({
  valor,
  dica,
}: {
  valor: number | undefined;
  /** Presente → coluna exibida em cinza com tooltip (informativa/não editável). */
  dica?: string;
}) {
  return (
    <span className={dica ? 'text-slate-500' : 'text-slate-200'} title={dica}>
      {formatarMoeda(valor)}
    </span>
  );
}

const DICA_CALCULADA = 'Calculado automaticamente pelos Serviços (aba Extras) — não editável';
const DICA_HORA_AUTO = 'Calculado pelos plantões + ponto eletrônico do mês (sempre a 50%)';
const DICA_INFORMATIVA = 'Coluna informativa — não entra no cálculo do salário';
const DICA_TOTAL_APP = 'Recalculado pelo app — o TICKET (informativo) não entra';

function numero(valor: number | undefined | null): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Totais recalculados PELO APP (informativo não entra na conta:
 * TICKET, HORA EXTRA e AJUDA DE CUSTO):
 *   TOTAL GANHOS = base + 13º + férias + outros + freelance
 *   HORA EXTRA   = plantões do mês + ponto eletrônico do mês (soma à parte)
 */
function totalGanhosDe(d: LinhaSalario): number {
  return arredondar2(
    numero(d['SALÁRIO BASE']) +
      numero(d['13º']) +
      numero(d['FÉRIAS']) +
      numero(d.OUTROS) +
      numero(d.FREELANCE),
  );
}

export function GanhosPage() {
  const snapshot = useSnapshot();
  const carregando = useStoreAno((s) => s.carregando);
  const erro = useStoreAno((s) => s.erro);
  const revalidar = useStoreAno((s) => s.revalidar);

  // dados locais para a HORA EXTRA (info) ao vivo:
  // soma dos plantões do mês + ponto eletrônico do mês
  const horasExtras = useStoreLocal((s) => s.dados.horasExtras);
  const pontoEletronico = useStoreLocal((s) => s.dados.config.pontoEletronico);
  const salarioBruto = useStoreLocal((s) => s.dados.config.salarioBruto);

  const [abaInterna, setAbaInterna] = useState<AbaInterna>('salario');

  // Ctrl+O → na aba Salário não há "novo" (as 12 linhas do ano já existem)
  usePedidoNovo(() => {
    if (abaInterna !== 'extras') {
      useStoreUI.getState().toast('info', 'A aba Salário não tem novo registro — os 12 meses do ano já existem.');
    }
  });
  const [paraEditar, setParaEditar] = useState<Registro<LinhaSalario> | null>(null);

  const salario = snapshot?.salario ?? null;
  const registros = salario?.registros ?? [];

  const horaExtraMes = useMemo(
    () =>
      snapshot
        ? horaExtraPorMes(snapshot.ano, horasExtras, pontoEletronico, salarioBruto)
        : new Map<number, number>(),
    [snapshot, horasExtras, pontoEletronico, salarioBruto],
  );

  const horaExtraDe = (mes: string): number => {
    const idx = SIGLAS.indexOf(mes as (typeof SIGLAS)[number]);
    return idx >= 0 ? horaExtraMes.get(idx + 1) ?? 0 : 0;
  };

  const totais = useMemo(() => {
    const soma = (campo: keyof (typeof registros)[number]['dados']) =>
      arredondar2(
        registros.reduce((acc, r) => {
          const v = Number(r.dados[campo]);
          return acc + (Number.isFinite(v) ? v : 0);
        }, 0),
      );
    if (registros.length === 0) return null;
    return {
      base: soma('SALÁRIO BASE'),
      decimo: soma('13º'),
      ferias: soma('FÉRIAS'),
      ajuda: soma('AJUDA CUSTO (info)'),
      hora: arredondar2([...horaExtraMes.values()].reduce((acc, v) => acc + v, 0)),
      outros: soma('OUTROS'),
      ticket: soma('TICKET'),
      freelance: soma('FREELANCE'),
      // recalculado pelo app (TICKET fica de fora — informativo)
      totalGanhos: arredondar2(registros.reduce((acc, r) => acc + totalGanhosDe(r.dados), 0)),
    };
  }, [registros, horaExtraMes]);

  if (!snapshot) {
    if (carregando) return <Carregando />;
    if (erro) return <AreaErro mensagem={erro} aoTentar={() => void revalidar()} />;
    return <EstadoVazio titulo="Sem dados carregados" descricao="Não foi possível carregar o ano." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {ABAS.map(({ id, rotulo, icone: Icone }) => (
            <button
              key={id}
              type="button"
              onClick={() => setAbaInterna(id)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                abaInterna === id
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Icone className="h-4 w-4" />
              {rotulo}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Ano {snapshot.ano} · {salario ? `aba ${salario.aba}` : 'sem aba de salário'}
        </p>
      </div>

      {abaInterna === 'extras' ? (
        <ExtrasArea />
      ) : !salario ? (
        <EstadoVazio
          icone={Banknote}
          titulo={`A aba de salário do ano ${snapshot.ano} não existe`}
          descricao="Crie o ano na Gestão Anual para gerar a aba 'Salário'."
        />
      ) : registros.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma linha de salário"
          descricao={`A aba ${salario.aba} não tem linhas de mês.`}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5 font-semibold">Mês</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Salário base</th>
                  <th className="px-3 py-2.5 text-right font-semibold">13º</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Férias</th>
                  <th className="px-3 py-2.5 text-right font-semibold" title={DICA_INFORMATIVA}>
                    Ajuda custo
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold" title={DICA_INFORMATIVA}>
                    Hora extra
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">Outros</th>
                  <th className="px-3 py-2.5 text-right font-semibold" title={DICA_INFORMATIVA}>
                    Ticket
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">
                    Freelance
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">
                    Total ganhos
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => {
                  const d = registro.dados;
                  return (
                    <tr
                      key={registro.linha}
                      className="border-b border-slate-800/70 transition hover:bg-slate-800/25"
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-slate-200">
                          {NOMES_MESES[d['MÊS']] ?? d['MÊS']}
                        </span>
                        <span className="ml-1.5 text-xs text-slate-600">{d['MÊS']}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums"><Num valor={d['SALÁRIO BASE']} /></td>
                      <td className="px-3 py-2.5 text-right tabular-nums"><Num valor={d['13º']} /></td>
                      <td className="px-3 py-2.5 text-right tabular-nums"><Num valor={d['FÉRIAS']} /></td>
                      <td className="px-3 py-2.5 text-right tabular-nums"><Num valor={d['AJUDA CUSTO (info)']} dica={DICA_INFORMATIVA} /></td>
                      <td className="px-3 py-2.5 text-right tabular-nums"><Num valor={horaExtraDe(d['MÊS'])} dica={DICA_HORA_AUTO} /></td>
                      <td className="px-3 py-2.5 text-right tabular-nums"><Num valor={d['OUTROS']} /></td>
                      <td className="px-3 py-2.5 text-right tabular-nums"><Num valor={d['TICKET']} dica={DICA_INFORMATIVA} /></td>
                      <td className="px-3 py-2.5 text-right tabular-nums"><Num valor={d['FREELANCE']} dica={DICA_CALCULADA} /></td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums"><Num valor={totalGanhosDe(d)} dica={DICA_TOTAL_APP} /></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setParaEditar(registro)}
                            title={`Editar salário de ${d['MÊS']}`}
                            aria-label="Editar salário"
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-700/60 hover:text-sky-300"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totais && (
                <tfoot>
                  <tr className="bg-slate-950/50 text-sm font-semibold">
                    <td className="px-4 py-2.5 text-slate-500">Total</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{formatarMoeda(totais.base)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{formatarMoeda(totais.decimo)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{formatarMoeda(totais.ferias)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{formatarMoeda(totais.ajuda)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{formatarMoeda(totais.hora)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{formatarMoeda(totais.outros)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{formatarMoeda(totais.ticket)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{formatarMoeda(totais.freelance)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-300">{formatarMoeda(totais.totalGanhos)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <p className="border-t border-slate-800 px-4 py-2.5 text-xs text-slate-600">
            * <strong>TOTAL GANHOS</strong> é recalculado pelo
            app a partir da base + 13º + férias + outros + freelance — TICKET, AJUDA DE CUSTO e
            HORA EXTRA são informativos e não entram na conta. <strong>FREELANCE</strong> vem dos
            Serviços lançados na aba <strong>Extras</strong> (mesmo mês); <strong>HORA EXTRA</strong>{' '}
            vem da soma dos plantões e do ponto eletrônico do mês.
          </p>
        </div>
      )}

      {paraEditar && (
        <FormSalario registro={paraEditar} aoFechar={() => setParaEditar(null)} />
      )}
    </div>
  );
}
