import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Wallet } from 'lucide-react';
import { AreaErro, Carregando, EstadoVazio } from '@/components/Estados';
import { Botao } from '@/components/Botoes';
import { Campo, EntradaMoeda } from '@/components/Campos';
import { formatarMoeda } from '@/lib/formatar';
import { NOMES_MESES } from '@/lib/meses';
import { useSnapshot } from '@/hooks/useRegistrosFiltrados';
import { calcularResumo } from '@/lib/resumo';
import { useStoreAno } from '@/store/storeAno';
import { useStoreLocal } from '@/store/storeLocal';

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

export function PagamentosPage() {
  const snapshot = useSnapshot();
  const carregando = useStoreAno((s) => s.carregando);
  const erro = useStoreAno((s) => s.erro);
  const revalidar = useStoreAno((s) => s.revalidar);
  const ano = useStoreAno((s) => s.anoSelecionado);
  const dados = useStoreLocal((s) => s.dados);
  const setSaldoInicial = useStoreLocal((s) => s.setSaldoInicial);

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

  const salvarSaldoInicial = (valor: number | null) => {
    if (ano == null) return;
    setSaldoInicial(ano, valor ?? 0);
  };

  return (
    <div className="space-y-3">
      {/* ---------- cabeçalho ---------- */}
      <p className="text-xs text-slate-500 hidden" title="Salário − Despesas + Recebido Lívia = Restante. Saldo = Saldo inicial + Σ Restante.">Resumo de pagamentos</p>

      {ano == null ? (
        <EstadoVazio
          icone={Wallet}
          titulo="Nenhum ano selecionado"
          descricao="Vá em Gestão Anual e selecione um ano."
        />
      ) : (
        <>
          {/* ---------- saldo inicial do ano ---------- */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5" title="Salário vem automático da aba Recebidos (Total Ganhos). Despesas = Total Gasto dos Lançamentos do mês. Recebido da Lívia = metade do 'Dividido 50/50' + tudo como 'Livia'. O saldo acumula de janeiro a dezembro a partir do saldo inicial informado.">
            <CampoEditavel
              rotulo="Saldo inicial em 1º de janeiro"
              valor={dados.config.saldoInicial?.[String(ano)] ?? null}
              placeholder="Ex.: 10.000,00"
              onSalvar={salvarSaldoInicial}
            />
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
                    const destaque =
                      linha.restante > 0 ? 'text-emerald-300' : linha.restante < 0 ? 'text-rose-300' : 'text-slate-300';
                    return (
                      <tr
                        key={linha.mes}
                        className="border-b border-slate-800/70 transition hover:bg-slate-800/20"
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="font-semibold text-slate-200">
                            {linha.rotulo}
                          </span>
                          {!linha.temDados && <span className="ml-1.5 text-xs text-slate-600">sem dados</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-200">
                          {linha.salario > 0 ? formatarMoeda(linha.salario) : '—'}
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="block w-full px-2 py-1.5 text-right text-sm tabular-nums text-slate-200">
                            {linha.despesas !== 0 ? formatarMoeda(linha.despesas) : '—'}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="block w-full px-2 py-1.5 text-right text-sm tabular-nums text-slate-200">
                            {linha.recebidoLivia !== 0 ? formatarMoeda(linha.recebidoLivia) : '—'}
                          </span>
                        </td>
                        <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${destaque}`}>
                          {formatarMoeda(linha.restante)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-100">
                          {formatarMoeda(linha.saldoFinal)}
                        </td>
                        <td className="px-3 py-2.5" />
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

          </section>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Botao icone={RefreshCw} onClick={() => void revalidar()} tamanho="sm">
              Atualizar
            </Botao>
            <span className="hidden text-xs text-slate-600" title="Despesas e Recebido Lívia calculados a partir dos Lançamentos Mensais · Salário vem de Recebidos">Como funciona</span>
          </div>
        </>
      )}
    </div>
  );
}
