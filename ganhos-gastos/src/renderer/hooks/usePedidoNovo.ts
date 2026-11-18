import { useEffect, useRef } from 'react';
import { useStoreUI } from '@/store/storeUI';

/**
 * Ctrl+O "novo registro" por setor.
 *
 * O atalho global apenas incrementa um contador na store de UI
 * (`pedirNovo`). Cada setor registra um handler aqui; o handler só é
 * chamado quando o atalho é pressionado (não no mount da página).
 */
export function usePedidoNovo(handler: () => void): void {
  const pedidoNovo = useStoreUI((s) => s.pedidoNovo);
  const noMount = useRef(pedidoNovo);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (pedidoNovo !== noMount.current) handlerRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoNovo]);
}
