import { useEffect } from 'react';
import { useStoreLocal } from '@/store/storeLocal';
import { useStoreUI } from '@/store/storeUI';
import { addDias } from '@/lib/calculos';
import { hojeISO } from '@/lib/formatar';

/**
 * Alerta de lembretes fixos vencidos.
 *
 * No dia em que o lembrete fixo vence (e nos dias seguintes, enquanto não
 * concluído), dispara um aviso chamativo 3x ao dia — 09h, 16h e 20h —
 * usando o sistema de toasts do app (borda âmbar, fechável no X, some em 5s).
 * Cada disparo (lembrete + dia + faixa) fica registrado em localStorage
 * para não repetir no mesmo dia e mesma faixa.
 */
const FAIXAS: Record<number, string> = { 9: 'manha', 16: 'tarde', 20: 'noite' };

export function useLembretesFixosAlerta(): void {
  const lembretesFixos = useStoreLocal((s) => s.dados.config.lembretesFixos);
  const toast = useStoreUI((s) => s.toast);

  useEffect(() => {
    const verificar = () => {
      const hora = new Date().getHours();
      const faixa = FAIXAS[hora];
      if (!faixa) return;
      if (!lembretesFixos?.length) return;

      const hoje = hojeISO();
      for (const l of lembretesFixos) {
        const base = l.ultimaConclusao ?? '2000-01-01'; // nunca concluído = vencido
        if (hoje < addDias(base, l.intervaloDias)) continue;

        const chave = `lf_${l.id}_${hoje}_${faixa}`;
        try {
          if (localStorage.getItem(chave)) continue;
          localStorage.setItem(chave, '1');
        } catch {
          // storage cheio/bloqueado — mesmo assim mostra o aviso
        }
        toast(
          'aviso',
          `Lembrete fixo vencido: ${l.titulo}. Faça agora e conclua na aba Lembretes.`,
        );
      }
    };

    verificar();
    const id = window.setInterval(verificar, 60_000);
    return () => window.clearInterval(id);
  }, [lembretesFixos, toast]);
}
