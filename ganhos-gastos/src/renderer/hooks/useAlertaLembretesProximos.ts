/**
 * Aviso (popup/toast) de lembretes próximos do vencimento (até 3 dias).
 *
 * Só avisa uma vez por dia por lembrete (registro em localStorage).
 * Não envia nada: apenas lembra de conferir a aba Lembretes.
 */
import { useEffect } from 'react';
import { useStoreLembretes } from '@/store/storeLembretes';
import { useStoreUI } from '@/store/storeUI';
import { hojeISO } from '@/lib/calculos';

const DIAS_AVISO = 3;

export function useAlertaLembretesProximos(): void {
  const carregar = useStoreLembretes((s) => s.carregar);
  const lembretes = useStoreLembretes((s) => s.lembretes);
  const toast = useStoreUI((s) => s.toast);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!lembretes.length) return;
    const hoje = hojeISO();
    const hojeMs = new Date(hoje + 'T00:00:00').getTime();
    for (const l of lembretes) {
      if (l.status === 'ENVIADO' || l.status === 'CANCELADO' || !l.dataLembrete) continue;
      const dataMs = new Date(l.dataLembrete + 'T00:00:00').getTime();
      if (Number.isNaN(dataMs)) continue;
      const dias = Math.round((dataMs - hojeMs) / 86_400_000);
      if (dias < 0 || dias > DIAS_AVISO) continue;
      const chave = `lp_${l.id}_${hoje}`;
      try {
        if (localStorage.getItem(chave)) continue;
        localStorage.setItem(chave, '1');
      } catch {
        // sem localStorage: avisa mesmo assim
      }
      toast(
        'aviso',
        dias === 0
          ? `Lembrete hoje: ${l.titulo}. Confira a aba Lembretes.`
          : `Lembrete em ${dias} dia(s): ${l.titulo}. Confira a aba Lembretes.`,
      );
    }
  }, [lembretes, toast]);
}
