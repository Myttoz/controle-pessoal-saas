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
import type { ConfigLocal, ResumoMesConfig } from '@/types/dados-locais';
import { arredondar2 } from '@/lib/formatar';

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
  /** Despesas digitadas pelo usuário. */
  despesas: number;
  /** Recebido da Lívia digitado pelo usuário. */
  recebidoLivia: number;
  /** Salário − Despesas + Recebido da Lívia. */
  restante: number;
  /** Saldo em caixa ao final do mês (acúmulo anual a partir do saldo inicial). */
  saldoFinal: number;
  temDados: boolean;
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
 */
export function calcularResumo(
  snapshot: SnapshotAno,
  config: ConfigLocal,
  ano: number,
  rotulos: Record<SiglaMes, string>,
): ResultadoResumo {
  const mapaSalario = salarioPorMes(snapshot);
  const saldoInicial = Number(config.saldoInicial?.[String(ano)] ?? 0) || 0;
  const resumoMes = config.resumoMes ?? {};

  const linhas: LinhaResumo[] = [];
  let saldoAcumulado = saldoInicial;

  for (let i = 0; i < 12; i++) {
    const mes = MESES_RESUMO[i];
    const mesIndex = i + 1;
    const chave = chaveResumo(ano, mesIndex);
    const entrada: ResumoMesConfig = resumoMes[chave] ?? { despesas: null, recebidoLivia: null };

    const salario = arredondar2(mapaSalario.get(mes) ?? 0);
    const despesas = Number(entrada.despesas ?? 0) || 0;
    const recebidoLivia = Number(entrada.recebidoLivia ?? 0) || 0;
    const restante = arredondar2(salario - despesas + recebidoLivia);

    saldoAcumulado = arredondar2(saldoAcumulado + restante);

    // "temDados" = há lançamentos no mês (ou há salário/manuais preenchidos)
    const mesSnap = snapshot.meses[mes];
    const temDados =
      (mesSnap?.registros.length ?? 0) > 0 ||
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
