/**
 * DESPESAS PRÓXIMO MÊS — planejamento manual do que virá no mês seguinte
 * ("chego em dezembro pagando a fatura do cartão que usei em novembro").
 *
 * Valores digitados à mão pelo usuário:
 *   - Fatura cartão, Despesas Pix e Recebido Lívia (abatido do total)
 *
 * O rodapé mostra o RESTANTE A PAGAR no mês vigente:
 *   Total Ganho(mês) − Fatura futura(mês anterior) + Recebo Lívia(mês anterior) − PIX(mês)
 *
 * Persistido por mês em config.despesasProximoMes (sincroniza Supabase).
 */
import { useEffect, useState } from 'react';
import type { SiglaMes } from '@/types/api-types';
import { EntradaMoeda } from '@/components/Campos';
import { formatarMoeda } from '@/lib/formatar';
import { NOMES_MESES, SIGLAS } from '@/lib/meses';
import type { RestantePagamento } from '@/lib/resumo';
import { useStoreLocal } from '@/store/storeLocal';

export function DespesasProximoMes({
  ano,
  mes,
  restante,
  detalhes,
}: {
  ano: number;
  mes: SiglaMes;
  restante: number;
  detalhes: RestantePagamento | null;
}) {
  const dados = useStoreLocal((s) => s.dados);
  const salvar = useStoreLocal((s) => s.setDespesasProximoMes);

  const idx = SIGLAS.indexOf(mes);
  const chave = `${ano}-${String(idx + 1).padStart(2, '0')}`;
  const cfg = dados.config.despesasProximoMes?.[chave] ?? {
    faturaCartao: null,
    despesasPix: null,
    recebidoLivia: null,
  };

  const [faturaDigitos, setFaturaDigitos] = useState(
    cfg.faturaCartao != null ? String(Math.round(cfg.faturaCartao * 100)) : '',
  );
  const [pixDigitos, setPixDigitos] = useState(
    cfg.despesasPix != null ? String(Math.round(cfg.despesasPix * 100)) : '',
  );
  const [liviaDigitos, setLiviaDigitos] = useState(
    cfg.recebidoLivia != null ? String(Math.round(cfg.recebidoLivia * 100)) : '',
  );

  // recarrega o quadro ao trocar de mês (sem sobrescrever o que está sendo digitado)
  useEffect(() => {
    const atual = dados.config.despesasProximoMes?.[chave] ?? {
      faturaCartao: null,
      despesasPix: null,
      recebidoLivia: null,
    };
    setFaturaDigitos(atual.faturaCartao != null ? String(Math.round(atual.faturaCartao * 100)) : '');
    setPixDigitos(atual.despesasPix != null ? String(Math.round(atual.despesasPix * 100)) : '');
    setLiviaDigitos(atual.recebidoLivia != null ? String(Math.round(atual.recebidoLivia * 100)) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  // salva somente ao sair do campo — evita que a sincronização sobrescreva a digitação
  const salvarCampo = (campo: 'faturaCartao' | 'despesasPix' | 'recebidoLivia', digitos: string) => {
    const n = digitos === '' ? null : Math.round((Number(digitos) / 100) * 100) / 100;
    salvar(chave, { [campo]: n });
  };

  const totalDespesas =
    Math.round((
      (faturaDigitos === '' ? 0 : Number(faturaDigitos) / 100) +
      (pixDigitos === '' ? 0 : Number(pixDigitos) / 100) -
      (liviaDigitos === '' ? 0 : Number(liviaDigitos) / 100)
    ) * 100) / 100;

  return (
    <section className="overflow-hidden rounded-xl border border-sky-800/50 bg-sky-950/15 text-sm">
      {/* ------- cabeçalho ------- */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-800/40 px-4 py-2.5">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-sky-200">
          Conferência {NOMES_MESES[mes]}
        </h3>
        <p className="max-w-[28rem] text-right text-[10px] leading-tight text-sky-400/60 hidden" title="Planejamento manual — não entra em nenhum cálculo automático. Total = Fatura cartão + Despesas Pix − Recebido Lívia.">Total = Fatura + Pix − Lívia</p>
      </header>

      {/* ------- campos (compactos) ------- */}
      <div className="flex flex-wrap items-end gap-x-5 gap-y-2 px-4 py-2.5">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Fatura cartão (R$)
          </span>
          <EntradaMoeda
            value={faturaDigitos}
            onChange={setFaturaDigitos}
            onBlur={() => salvarCampo('faturaCartao', faturaDigitos)}
            placeholder="0,00"
            className="w-32 !px-2 !py-1.5 !text-sm"
          />
        </label>

        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Despesas Pix (R$)
          </span>
          <EntradaMoeda
            value={pixDigitos}
            onChange={setPixDigitos}
            onBlur={() => salvarCampo('despesasPix', pixDigitos)}
            placeholder="0,00"
            className="w-32 !px-2 !py-1.5 !text-sm"
          />
        </label>

        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Recebido Lívia (R$)
          </span>
          <EntradaMoeda
            value={liviaDigitos}
            onChange={setLiviaDigitos}
            onBlur={() => salvarCampo('recebidoLivia', liviaDigitos)}
            placeholder="0,00"
            className="w-32 !px-2 !py-1.5 !text-sm"
          />
        </label>

        <span className="ml-auto flex flex-col items-end gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Total
          </span>
          <span className="text-base font-semibold tabular-nums leading-7 text-violet-300">
            {formatarMoeda(totalDespesas)}
          </span>
        </span>
      </div>

      {/* ------- rodapé: Restante a pagar no mês ------- */}
      <footer
        className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-800/40 bg-sky-950/30 px-4 py-2.5"
        title={detalhes ? `Total Ganho ${formatarMoeda(detalhes.totalGanho)} − Fatura ${NOMES_MESES[detalhes.mesAnterior]} ${formatarMoeda(detalhes.faturaMesAnterior)} + Recebo Lívia ${formatarMoeda(detalhes.receboLiviaAnterior)} − PIX ${NOMES_MESES[mes]} ${formatarMoeda(detalhes.pixMes)}` : undefined}
      >
        <span className="text-sky-200/80">
          Restante em <strong>{NOMES_MESES[mes]}</strong>
        </span>
        <span className="font-semibold tabular-nums text-sky-300">
          {formatarMoeda(restante)}
        </span>
      </footer>
    </section>
  );
}
