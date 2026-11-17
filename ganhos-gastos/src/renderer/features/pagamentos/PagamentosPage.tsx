import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Trash2, Wallet } from 'lucide-react';
import { AreaErro, Carregando, EstadoVazio } from '@/components/Estados';
import { Botao } from '@/components/Botoes';
import { MesTabs } from '@/components/MesTabs';
import { Campo, EntradaMoeda } from '@/components/Campos';
import { formatarMoeda } from '@/lib/formatar';
import { NOMES_MESES } from '@/lib/meses';
import { useSnapshot } from '@/hooks/useRegistrosFiltrados';
import {
  calcularResumo,
  chaveResumo,
  MESES_RESUMO,
} from '@/lib/resumo';
import { useStoreAno } from '@/store/storeAno';
import { useStoreLocal } from '@/store/storeLocal';
import { useStoreUI } from '@/store/storeUI';

/**
 * Campo digitado pelo usuário, com persistência local controlada.
 */
function CampoEditavel({
  rotulo,
  valor,
  placeholder,
  dica,
  onSalvar,
}: {
  rotulo: string;
  valor: number | null | undefined;
  placeholder?: string;
  dica?: string;
  onSalvar: (valor: number | null) => void;
}) {
  const [texto, setTexto] = useState(valor == null ? '' : String(Math.round(valor * 100)));
  const [emEdicao, setEmEdicao] = useState(false);

  // Reseta o texto quando o valor remoto muda (ex.: após sync) e a campo não está em edição.
  useEffect(() => {
    if (!emEdicao) setTexto(valor == null ? '' : String(Math.round(valor * 100)));
  }, [valor, emEdicao]);

  return (
    <Campo rotulo={rotulo}>
      <EntradaMoeda
        value={texto}
        onChange={(digitos) => {
          setTexto(digitos);
          if (digitos.trim() === '') onSalvar(null);
          else onSalvar(Math.round((Number(digitos) / 100) * 100) / 100);
        }}
        onFocus={() => setEmEdicao(true)}
        onBlur={() => {
          setEmEdicao(false);
          onSalvar(
            texto.trim() === '' ? null : Math.round((Number(texto) / 100) * 100) / 100,
          );
        }}
        placeholder={placeholder ?? '0,00'}
      />
      {dica ? <p className="mt-1 text-[10px] text-slate-500">{dica}</p> : null}
    </Campo>
  );
}

function EntradaMoedaInline({
  valor,
  onChange,
}: {
  valor: number;
  onChange: (valor: number) => void;
}) {
  const [texto, setTexto] = useState(valor !== 0 ? String(Math.round(valor * 100)) : '');
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (editando) return;
    setTexto(valor !== 0 ? String(Math.round(valor * 100)) : '');
  }, [valor, editando]);

  const handleChange = (digitos: string) => {
    setTexto(digitos);
    const centavos = Number(digitos);
    if (!Number.isFinite(centavos)) return;
    onChange(Math.round((centavos / 100) * 100) / 100);
  };

  return (
    <EntradaMoeda
      value={texto}
      onChange={handleChange}
      onFocus={() => setEditando(true)}
      onBlur={() => setEditando(false)}
      placeholder="—"
      className="!rounded-md !border !border-slate-700 !bg-slate-950 !px-2 !py-1.5 !text-right !text-sm !tabular-nums !text-slate-200 focus:border-sky-500"
    />
  );
}

export function PagamentosPage() {
  const snapshot = useSnapshot();
  const carregando = useStoreAno((s) => s.carregando);
  const erro = useStoreAno((s) => s.erro);
  const revalidar = useStoreAno((s) => s.revalidar);
  const ano = useStoreAno((s) => s.anoSelecionado);
  const mes = useStoreUI((s) => s.mes);
  const setMes = useStoreUI((s) => s.setMes);
  const dados = useStoreLocal((s) => s.dados);
  const setSaldoInicial = useStoreLocal((s) => s.setSaldoInicial);
  const setResumoMes = useStoreLocal((s) => s.setResumoMes);

  const { linhas, totais } = useMemo(
    () => calcularResumo(snapshot ?? { sucesso: true, ano: ano ?? 0, meses: {}, mesesFaltando: [], salario: null, extras: null, resumo: { sucesso: true, ano: ano ?? 0, chaveAgrupamento: 'CATEGORIA', totalGeral: 0, categorias: [], meses: [], abasConsideradas: [] } }, dados.config, ano ?? 0, NOMES_MESES),
    [snapshot, dados.config, ano],
  );

  if (carregando && !snapshot) {
    return <Carregando texto="Carregando dados de pagamentos…" />;
  }

  if (!snapshot) {
    if (erro) {
      return <AreaErro mensagem={erro} aoTentar={() => void revalidar()} />;
    }
    return (
      <EstadoVazio
        icone={Wallet}
        titulo="Sem dados carregados"
        descricao="Selecione um ano válido ou atualize a conexão com a API."
      />
    );
  }

  const linhaMesSelecionado = linhas.find((l) => l.mes === mes);
  const ehManual = linhas.length > 0 ? linhas[0].ehManualAno : (ano ?? 2026) <= 2026;

  const salvarSaldoInicial = (valor: number | null) => {
    if (ano == null) return;
    setSaldoInicial(ano, valor ?? 0);
  };

  const salvarDespesa = (indiceMes: number, valor: number | null) => {
    if (ano == null) return;
    const chave = chaveResumo(ano, indiceMes);
    const atual = dados.config.resumoMes?.[chave] ?? { despesas: null, recebidoLivia: null };
    setResumoMes(chave, {
      despesas: valor,
      recebidoLivia: atual.recebidoLivia ?? null,
    });
  };

  const salvarRecebidoLivia = (indiceMes: number, valor: number | null) => {
    if (ano == null) return;
    const chave = chaveResumo(ano, indiceMes);
    const atual = dados.config.resumoMes?.[chave] ?? { despesas: null, recebidoLivia: null };
    setResumoMes(chave, {
      despesas: atual.despesas ?? null,
      recebidoLivia: valor,
    });
  };

  const limparResumoMes = (indiceMes: number) => {
    if (ano == null) return;
    setResumoMes(chaveResumo(ano, indiceMes), null);
  };

  return (
    <div className="space-y-5">
      {/* ---------- cabeçalho ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MesTabs meses={snapshot.meses} selecionado={mes} aoSelecionar={setMes} />
        <p className="text-xs text-slate-500">
          Salário do mês − <strong>Despesas</strong> + <strong>Recebido da Lívia</strong> = Restante · Saldo = Saldo inicial do ano + Σ Restante
        </p>
      </div>

      {ano == null ? (
        <EstadoVazio
          icone={Wallet}
          titulo="Nenhum ano selecionado"
          descricao="Vá em Gestão Anual e selecione um ano."
        />
      ) : (
        <>
          {/* ---------- saldo inicial do ano ---------- */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoEditavel
                rotulo="Saldo inicial em 1º de janeiro"
                valor={dados.config.saldoInicial?.[String(ano)] ?? null}
                placeholder="Ex.: 10.000,00"
                dica={`Valor a partir do qual o saldo do ${ano} é calculado. Fica salvo na nuvem, veja Sincronização.`}
                onSalvar={salvarSaldoInicial}
              />
              <div className="flex flex-col justify-end gap-1.5 text-xs text-slate-400">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Como funciona {ehManual ? '(entrada manual)' : '(automático)'}
                </p>
                <ul className="list-disc pl-4 leading-relaxed">
                  <li>Você define o saldo uma vez por ano.</li>
                  <li>
                    <strong>Salário vem automático</strong> da aba Recebidos (Total Ganhos).
                  </li>
                  {ehManual ? (
                    <li>
                      <strong>Despesas</strong> e <strong>Recebido da Lívia</strong> você digita à mão
                      todo mês.
                    </li>
                  ) : (
                    <li>
                      <strong>Despesas</strong> = soma automática dos lançamentos do mês
                      (Total Gasto do Lançamentos).
                    </li>
                  )}
                  {!ehManual && (
                    <li>
                      <strong>Recebido da Lívia</strong> = metade do que está em
                      &quot;Dividido 50/50&quot; + tudo que está como &quot;Livia&quot; nos Lançamentos.
                    </li>
                  )}
                  <li>O Saldo do mês acumula de janeiro até o mês selecionado.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ---------- tabela de todos os meses ---------- */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-left text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 font-semibold">Mês</th>
                    <th className="px-3 py-3 text-right font-semibold">Salário mês</th>
                    <th className="px-3 py-3 text-right font-semibold">Despesas</th>
                    <th className="px-3 py-3 text-right font-semibold">Recebido Lívia</th>
                    <th className="px-3 py-3 text-right font-semibold">Restante</th>
                    <th className="px-3 py-3 text-right font-semibold" title="Acumulado do ano">Saldo do mês</th>
                    <th className="px-3 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha) => {
                    const indice = MESES_RESUMO.indexOf(linha.mes) + 1;
                    const selecionado = linha.mes === mes;
                    const destaque =
                      linha.restante > 0 ? 'text-emerald-300' : linha.restante < 0 ? 'text-rose-300' : 'text-slate-300';
                    return (
                      <tr
                        key={linha.mes}
                        className={`border-b border-slate-800/70 transition ${
                          selecionado ? 'bg-slate-800/30' : 'hover:bg-slate-800/20'
                        }`}
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`font-semibold ${selecionado ? 'text-sky-300' : 'text-slate-200'}`}>
                            {linha.rotulo}
                          </span>
                          {!linha.temDados && <span className="ml-1.5 text-xs text-slate-600">sem dados</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-200">
                          {linha.salario > 0 ? formatarMoeda(linha.salario) : '—'}
                        </td>
                        <td className="px-2 py-1.5">
                          {ehManual ? (
                            <EntradaMoedaInline
                              valor={linha.despesas}
                              onChange={(v) => salvarDespesa(indice, v === 0 ? null : v)}
                            />
                          ) : (
                            <span className="block w-full px-2 py-1.5 text-right text-sm tabular-nums text-slate-200">
                              {linha.despesas !== 0 ? formatarMoeda(linha.despesas) : '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {ehManual ? (
                            <EntradaMoedaInline
                              valor={linha.recebidoLivia}
                              onChange={(v) => salvarRecebidoLivia(indice, v === 0 ? null : v)}
                            />
                          ) : (
                            <span className="block w-full px-2 py-1.5 text-right text-sm tabular-nums text-slate-200">
                              {linha.recebidoLivia !== 0 ? formatarMoeda(linha.recebidoLivia) : '—'}
                            </span>
                          )}
                        </td>
                        <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${destaque}`}>
                          {formatarMoeda(linha.restante)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-100">
                          {formatarMoeda(linha.saldoFinal)}
                        </td>
                        <td className="px-3 py-2.5">
                          {ehManual && (linha.despesas !== 0 || linha.recebidoLivia !== 0) ? (
                            <button
                              type="button"
                              onClick={() => limparResumoMes(indice)}
                              className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-800 hover:text-rose-400"
                              title="Apagar despesas e recebido Lívia do mês"
                              aria-label={`Apagar resumo de ${linha.rotulo}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {totais ? (
                  <tfoot className="bg-slate-950/50 text-sm font-semibold">
                    <tr>
                      <td className="px-4 py-2.5 text-slate-500">Total ano</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">
                        {formatarMoeda(totais.salario)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">
                        {formatarMoeda(totais.despesas)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">
                        {formatarMoeda(totais.recebidoLivia)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-emerald-300">
                        {formatarMoeda(totais.restante)}
                      </td>
                      <td colSpan={2} className="px-3 py-2.5 text-right tabular-nums text-emerald-300">
                        {formatarMoeda(linhas[linhas.length - 1].saldoFinal)}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
            {ehManual && (!linhaMesSelecionado || (linhaMesSelecionado.despesas === 0 && linhaMesSelecionado.recebidoLivia === 0)) && (
              <p className="border-t border-slate-800 px-4 py-2.5 text-xs text-slate-500">
                <Wallet className="mr-1 inline h-3.5 w-3.5" />
                {linhaMesSelecionado?.rotulo ?? 'Mês'}: digite <strong>Despesas</strong> e/ou <strong>Recebido da Lívia</strong> para calcular o restante automaticamente.
              </p>
            )}
            {!ehManual && (
              <p className="border-t border-slate-800 px-4 py-2.5 text-xs text-slate-500">
                <Wallet className="mr-1 inline h-3.5 w-3.5" />
                Automático — Despesas e Recebido Lívia são calculados pela soma dos Lançamentos do mês.
              </p>
            )}
          </section>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Botao icone={RefreshCw} onClick={() => void revalidar()} tamanho="sm">
              Atualizar
            </Botao>
            <span className="text-xs text-slate-600">
              {ehManual
                ? 'Despesas e Recebido Lívia ficam salvos na nuvem (Supabase) · Salário vem de Recebidos'
                : 'Despesas e Recebido Lívia calculados a partir dos Lançamentos Mensais · Salário vem de Recebidos'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
