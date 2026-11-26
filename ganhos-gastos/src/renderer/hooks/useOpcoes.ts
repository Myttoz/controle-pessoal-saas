import { useCallback, useMemo } from 'react';
import { LISTAS } from '@/types/api-types';
import { SIGLAS } from '@/lib/meses';
import { aplicarOpcoes, rotuloDeValor, valorDeRotulo } from '@/lib/opcoes';
import { useStoreAno } from '@/store/storeAno';
import { useStoreLocal } from '@/store/storeLocal';

export type CampoLista = keyof typeof LISTAS;

/** Opções base da API (ou constantes), sem personalização. */
export function usarOpcoesBase(campo: CampoLista): string[] {
  const listas = useStoreAno((s) => s.listas);
  return useMemo(() => {
    const ordenar = (lista: string[]) =>
      [...lista].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    const vindas = listas?.[campo];
    if (vindas && vindas.length > 0) return ordenar(vindas);
    return ordenar([...LISTAS[campo]]);
  }, [listas, campo]);
}

/**
 * Opções de <select>: base da API + personalizações da UI
 * (renome = rótulo, ocultas removidas, novas incluídas).
 */
export function useOpcoes(campo: CampoLista): string[] {
  const base = usarOpcoesBase(campo);
  const personalizadas = useStoreLocal((s) => s.dados.config.opcoesPersonalizadas?.[campo]);
  return useMemo(() => aplicarOpcoes(base, personalizadas), [base, personalizadas]);
}

/** Converte valor gravado → rótulo exibido. */
export function useRotuloOpcao(campo: CampoLista): (valor: string) => string {
  const personalizadas = useStoreLocal((s) => s.dados.config.opcoesPersonalizadas?.[campo]);
  return useCallback((valor: string) => rotuloDeValor(valor, personalizadas), [personalizadas]);
}

/** Converte rótulo exibido → valor gravado. */
export function useValorOpcao(campo: CampoLista): (rotulo: string) => string {
  const personalizadas = useStoreLocal((s) => s.dados.config.opcoesPersonalizadas?.[campo]);
  return useCallback((rotulo: string) => valorDeRotulo(rotulo, personalizadas), [personalizadas]);
}

/** Meses para a coluna MÊS dos Extras (MES_EXTRAS da API ou siglas padrão). */
export function useOpcoesMes(): string[] {
  const listas = useStoreAno((s) => s.listas);
  return useMemo(() => {
    const vindas = listas?.['MES_EXTRAS'];
    if (vindas && vindas.length > 0) return vindas;
    return [...SIGLAS];
  }, [listas]);
}
