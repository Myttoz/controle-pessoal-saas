/**
 * DESPESAS PRÓXIMO MÊS — planejamento manual do que virá no mês seguinte
 * ("chego em dezembro pagando o cartão que usei em novembro").
 *
 * Dois valores digitados à mão pelo usuário:
 *   - Fatura cartão (a fatura do cartão do mês anterior, paga no recebimento)
 *   - Despesas Pix  (contas fixas etc. pagas em Pix ao receber o salário)
 *
 * NÃO entra em nenhum cálculo automático — é só um quadro de planejamento.
 * O rodapé mostra o "Restante" do mês atual (mesma conta do banner antigo).
 * Persistido por mês em config.despesasProximoMes (sincroniza Supabase).
 */
import { useEffect, useState } from 'react';
import type { SiglaMes } from '@/types/api-types';
import { Campo, EntradaMoeda } from '@/components/Campos';
import { formatarMoeda } from '@/lib/formatar';
import { NOMES_MESES, SIGLAS } from '@/lib/meses';
import { useStoreLocal } from '@/store/storeLocal';

export function DespesasProximoMes({
  ano,
  mes,
  restante,
}: {
  ano: number;
  mes: SiglaMes;
  restante: number;
}) {
  const dados = useStoreLocal((s) => s.dados);
  const salvar = useStoreLocal((s) => s.setDespesasProximoMes);

  const idx = SIGLAS.indexOf(mes);
  const chave = `${ano}-${String(idx + 1).padStart(2, '0')}`;
  const cfg = dados.config.despesasProximoMes?.[chave] ?? {
    faturaCartao: null,
    despesasPix: null,
  };

  const [faturaDigitos, setFaturaDigitos] = useState(
    cfg.faturaCartao != null ? String(Math.round(cfg.faturaCartao * 100)) : '',
  );
  const [pixDigitos, setPixDigitos] = useState(
    cfg.despesasPix != null ? String(Math.round(cfg.despesasPix * 100)) : '',
  );

  // recarrega o quadro ao trocar de mês
  useEffect(() => {
    const atual = dados.config.despesasProximoMes?.[chave] ?? {
      faturaCartao: null,
      despesasPix: null,
    };
    setFaturaDigitos(
      atual.faturaCartao != null ? String(Math.round(atual.faturaCartao * 100)) : '',
    );
    setPixDigitos(atual.despesasPix != null ? String(Math.round(atual.despesasPix * 100)) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  const salvarCampo = (campo: 'faturaCartao' | 'despesasPix', digitos: string) => {
    const n = digitos === '' ? null : Math.round((Number(digitos) / 100) * 100) / 100;
    salvar(chave, { [campo]: n });
  };

  const totalDespesas =
    Math.round((
      (faturaDigitos === '' ? 0 : Number(faturaDigitos) / 100) +
      (pixDigitos === '' ? 0 : Number(pixDigitos) / 100)
    ) * 100) / 100;

  const mesSeguinteSigla = SIGLAS[(idx + 1) % 12];
  const anoSeguinte = idx === 11 ? ano + 1 : ano;

  return (
    <section className="overflow-hidden rounded-xl border border-sky-800/50 bg-sky-950/15 text-sm">
      {/* ------- cabeçalho ------- */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-800/40 px-4 py-2.5">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-sky-200">
          Despesas próximo mês
          <span className="ml-2 font-medium normal-case text-sky-400/80">
            (pagas em {NOMES_MESES[mesSeguinteSigla]}/{anoSeguinte})
          </span>
        </h3>
        <p className="max-w-[28rem] text-right text-[10px] leading-tight text-sky-400/60">
          Planejamento — não entra em nenhum cálculo automático.
        </p>
      </header>

      {/* ------- campos ------- */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 p-4">
        <Campo rotulo="Fatura cartão (R$)" className="w-40">
          <EntradaMoeda
            value={faturaDigitos}
            onChange={(digitos) => {
              setFaturaDigitos(digitos);
              salvarCampo('faturaCartao', digitos);
            }}
            placeholder="0,00"
          />
        </Campo>
        <Campo
          rotulo="Despesas Pix (R$)"
          dica="Contas fixas etc. pagas em Pix ao receber o salário"
          className="w-40"
        >
          <EntradaMoeda
            value={pixDigitos}
            onChange={(digitos) => {
              setPixDigitos(digitos);
              salvarCampo('despesasPix', digitos);
            }}
            placeholder="0,00"
          />
        </Campo>
        <div className="flex flex-col items-end gap-0.5 pb-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Total
          </p>
          <p className="text-lg font-semibold tabular-nums text-violet-300">
            {formatarMoeda(totalDespesas)}
          </p>
        </div>
      </div>

      {/* ------- rodapé: Restante do mês ------- */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-800/40 bg-sky-950/30 px-4 py-2.5">
        <span className="text-sky-200/80">
          Restante em <strong>{NOMES_MESES[mes]}</strong>
          <span className="hidden sm:inline"> — Salário − Despesas + Recebido Lívia (aba Resumo Pagamentos)</span>
        </span>
        <span className="font-semibold tabular-nums text-sky-300">
          {formatarMoeda(restante)}
        </span>
      </footer>
    </section>
  );
}
