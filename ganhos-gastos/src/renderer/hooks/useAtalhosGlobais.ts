import { useEffect } from 'react';
import { useStoreUI } from '@/store/storeUI';

function irParaLancamentosEPedirFoco(): void {
  const ui = useStoreUI.getState();
  ui.irPara('lancamentos');
  ui.solicitarFocoBusca();
}

/**
 * Atalhos globais:
 *  Ctrl/Cmd + O  → novo registro no setor atual
 *  Ctrl/Cmd + F  → busca de lançamentos
 *  /             → busca (quando não está digitando)
 *  Esc           → fecha modal
 */
export function useAtalhosGlobais(): void {
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent): void {
      const alvo = evento.target as HTMLElement | null;
      const digitando =
        !!alvo &&
        (alvo.tagName === 'INPUT' ||
          alvo.tagName === 'TEXTAREA' ||
          alvo.tagName === 'SELECT' ||
          alvo.isContentEditable);

      const ctrl = evento.ctrlKey || evento.metaKey;
      const tecla = evento.key.toLowerCase();

      if (ctrl && tecla === 'o') {
        evento.preventDefault();
        useStoreUI.getState().pedirNovo();
      } else if (ctrl && tecla === 'f') {
        evento.preventDefault();
        irParaLancamentosEPedirFoco();
      } else if (evento.key === '/' && !digitando) {
        evento.preventDefault();
        irParaLancamentosEPedirFoco();
      } else if (evento.key === 'Escape') {
        useStoreUI.getState().fecharModalLancamento();
      }
    }

    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);
}
