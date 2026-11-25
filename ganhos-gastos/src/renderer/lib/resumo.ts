/**
 * Resumo de Pagamentos — lógica compartilhada entre a página
 * "Resumo de Pagamentos" e a faixa de aviso na aba Lançamentos Mensais.
 *
 * Fórmulas (conforme definido com o usuário):
 *   Restante = Salário − Despesas (digitado) + Recebido da Lívia (digitado)
 *   Saldo    = Saldo inicial do ano (digitado uma vez) + Σ Restante dos meses anteriores + Restante do mês
 *
 * Salário vem do snapshot (aba Ganhos), igual às outras áreas.
 */
import type { LinhaSalario, Registro, SiglaMes, SnapshotAno } from '@/types/api-types';
import type { ConfigLocal } from '@/types/dados-locais';
import { arredondar2 } from '@/lib/formatar';
import { resumirDivisao } from '@/lib/divisao';

export const MESES_RESUMO: SiglaMes[] = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
];

/** Total de "Total ganhos" do salário do mês (sem TICKET, igual às outras áreas). */
export function totalGanhosSalario(d: LinhaSalario): number {
  const base = Number(d['SALÁRIO BASE']) || 0;
  const decimo = Number(d['13º']) || 0;
  const ferias = Number(d['FÉRIAS']) || 0;
  const freelance = Number(d.FREELANCE) || 0;
  const outros = Number(d.OUTROS) || 0;
  return arredondar2(base + decimo + ferias + freelance + outros);
}

/** Chave "AAAA-MM" usada para persistir o resumo no config. */
export function chaveResumo(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

/** Valor numérico do "Total ganhos" por mês (soma se houver mais de uma linha). */
export function salarioPorMes(
  snapshot: SnapshotAno,
): Map<SiglaMes, number> {
  const mapa = new Map<SiglaMes, number>();
  const salario = snapshot.salario;
  if (!salario) return mapa;
  for (const r of salario.registros) {
    const m = r.dados['MÊS'];
    mapa.set(m, arredondar2((mapa.get(m) ?? 0) + totalGanhosSalario(r.dados)));
  }
  return mapa;
}

export interface LinhaResumo {
  mes: SiglaMes;
  mesIndex: number;
  rotulo: string;
  ano: number;
  /** Salário do mês (aba Ganhos). null = sem aba salário. */
  salario: number;
  /** Despesas do mês. */
  despesas: number;
  /** Recebido da Lívia no mês. */
  recebidoLivia: number;
  /** Salário − Despesas + Recebido da Lívia. */
  restante: number;
  /** Saldo em caixa ao final do mês (acúmulo anual a partir do saldo inicial). */
  saldoFinal: number;
  temDados: boolean;
  /** `false` = cálculo automático a partir dos Lançamentos Mensais. */
  ehManualAno: boolean;
}

export interface ResultadoResumo {
  linhas: LinhaResumo[];
  /** Total anual: salário, despesas, via Recebido Lívia e Restante + saldo inicial. */
  totais: {
    salario: number;
    despesas: number;
    recebidoLivia: number;
    restante: number;
  };
}

/**
 * Calcula o resumo inteiro do ano (12 linhas) acumulando o saldo
 * mês a mês a partir do saldo inicial informado (default 0).
 *
 * Despesas e Recebido Lívia são SEMPRE automáticos, a partir dos
 * Lançamentos Mensais do mês:
 *   Despesas       = Total Gasto (todos os lançamentos)
 *   Recebido Lívia = (Dividido 50/50 ÷ 2) + tudo com QUEM PAGA = Lívia
 * Salário vem do snapshot (aba Recebidos → Total Ganhos do mês).
 */
export function calcularResumo(
  snapshot: SnapshotAno,
  config: ConfigLocal,
  ano: number,
  rotulos: Record<SiglaMes, string>,
): ResultadoResumo {
  const mapaSalario = salarioPorMes(snapshot);
  const saldoInicial = Number(config.saldoInicial?.[String(ano)] ?? 0) || 0;
  const ehManualAno = false; // Despesas e Recebido Lívia sempre automáticos

  const linhas: LinhaResumo[] = [];
  let saldoAcumulado = saldoInicial;

  for (let i = 0; i < 12; i++) {
    const mes = MESES_RESUMO[i];
    const mesIndex = i + 1;

    const salario = arredondar2(mapaSalario.get(mes) ?? 0);

    const registrosMes = snapshot.meses?.[mes]?.registros ?? [];
    const divisao = resumirDivisao(registrosMes);

    const despesas = divisao.totalGasto;
    const recebidoLivia = divisao.receboLivia;
    const restante = arredondar2(salario - despesas + recebidoLivia);

    saldoAcumulado = arredondar2(saldoAcumulado + restante);

    // "temDados" = há lançamentos no mês (ou há salário/manuais preenchidos)
    const temDados =
      (registrosMes.length > 0) ||
      (salario ?? 0) > 0 ||
      despesas > 0 ||
      recebidoLivia > 0;

    linhas.push({
      mes,
      mesIndex,
      rotulo: rotulos[mes] ?? mes,
      ano,
      salario,
      despesas,
      recebidoLivia,
      restante,
      saldoFinal: saldoAcumulado,
      temDados,
      ehManualAno,
    });
  }

  const totais = linhas.reduce(
    (acc, l) => ({
      salario: arredondar2(acc.salario + l.salario),
      despesas: arredondar2(acc.despesas + l.despesas),
      recebidoLivia: arredondar2(acc.recebidoLivia + l.recebidoLivia),
      restante: arredondar2(acc.restante + l.restante),
    }),
    { salario: 0, despesas: 0, recebidoLivia: 0, restante: 0 },
  );

  return { linhas, totais };
}

/**
 * Restante a pagar no mês M (ex.: dezembro):
 *   Total Ganho(M)
 *   − Gastos próximo mês de M−1 (somente TIPO = 'Fatura futura')
 *   + Recebo Lívia de M−1 (já calculado por resumirDivisao)
 *   − PIX de M (TIPO = 'PIX')
 *
 * M−1 = mês anterior; se M = JAN, usa DEZ do ano anterior.
 */
export interface RestantePagamento {
  totalGanho: number;
  faturaMesAnterior: number;
  receboLiviaAnterior: number;
  pixMes: number;
  restante: number;
  mesAnterior: SiglaMes;
  anoAnterior: number;
}

export function calcularRestantePagamento(
  snapshots: Record<number, SnapshotAno | undefined>,
  ano: number,
  mes: SiglaMes,
): RestantePagamento {
  const snapAtual = snapshots[ano];
  const mapaSalario = snapAtual ? salarioPorMes(snapAtual) : new Map<SiglaMes, number>();
  const totalGanho = arredondar2(mapaSalario.get(mes) ?? 0);

  const idx = MESES_RESUMO.indexOf(mes);
  const mesAnterior = idx > 0 ? MESES_RESUMO[idx - 1] : 'DEZ';
  const anoAnterior = idx > 0 ? ano : ano - 1;
  const snapAnterior = snapshots[anoAnterior];
  const registrosAnteriores = snapAnterior?.meses?.[mesAnterior]?.registros ?? [];

  const faturaMesAnterior = arredondar2(gastosProximoMes(registrosAnteriores));
  const receboLiviaAnterior = arredondar2(resumirDivisao(registrosAnteriores).receboLivia);

  // PIX real = total PIX − parte da Lívia dentro da própria seleção PIX
  const registrosPix = (snapAtual?.meses?.[mes]?.registros ?? []).filter((r) => r.dados.TIPO === 'PIX');
  const divisaoPix = resumirDivisao(registrosPix);
  const pixMes = arredondar2(divisaoPix.totalReal);

  const restante = arredondar2(totalGanho - faturaMesAnterior + receboLiviaAnterior - pixMes);
  return { totalGanho, faturaMesAnterior, receboLiviaAnterior, pixMes, restante, mesAnterior, anoAnterior };
}

/** Soma dos valores lançados como 'Fatura futura' no mês (= "Gastos próximo mês"). */
export function gastosProximoMes(registros: Registro<import('@/types/api-types').LancamentoMensal>[]): number {
  return arredondar2(
    registros.reduce(
      (soma, r) =>
        soma + (r.dados.TIPO === 'Fatura futura' ? Number(r.dados.VALOR) || 0 : 0),
      0,
    ),
  );
}
