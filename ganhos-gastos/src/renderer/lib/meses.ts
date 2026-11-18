import type { SiglaMes } from '@/types/api-types';

export const SIGLAS: SiglaMes[] = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
];

export const NOMES_MESES: Record<SiglaMes, string> = {
  JAN: 'Janeiro',
  FEV: 'Fevereiro',
  MAR: 'Março',
  ABR: 'Abril',
  MAI: 'Maio',
  JUN: 'Junho',
  JUL: 'Julho',
  AGO: 'Agosto',
  SET: 'Setembro',
  OUT: 'Outubro',
  NOV: 'Novembro',
  DEZ: 'Dezembro',
};

/** Sigla do mês corrente do relógio. */
export function mesAtual(): SiglaMes {
  return SIGLAS[new Date().getMonth()];
}

/** Nome da aba mensal no padrão da planilha ("NOV 27"). */
export function nomeAbaMensal(mes: number, ano: number): string {
  const indice = Math.min(Math.max(Math.round(mes), 1), 12) - 1;
  return `${SIGLAS[indice]} ${String(ano).slice(-2)}`;
}

/** Extrai a sigla do mês do nome da aba ("JAN 27" → "JAN"). */
export function siglaDeAba(aba: string): SiglaMes {
  return aba.slice(0, 3).toUpperCase() as SiglaMes;
}
