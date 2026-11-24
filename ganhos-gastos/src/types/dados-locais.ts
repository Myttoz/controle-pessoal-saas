/**
 * ============================================================================
 *  DADOS LOCAIS — Hora Extra · Férias · Manutenção de Veículo
 * ============================================================================
 *  Estas áreas NÃO existem na API do Google Apps Script (o contrato em
 *  `api-types.ts` só cobre lançamentos mensais, salário e extras). Por isso
 *  os registros são mantidos APENAS no app e persistidos em disco pelo
 *  processo principal (`userData/dados-locais.json`), no mesmo formato
 *  `{ sucesso }` para manter o padrão das demais operações.
 *
 *  As fórmulas de cálculo reproduzem o que a planilha faz (ver
 *  `src/renderer/lib/calculos.ts`).
 */

// ---------------------------------------------------------------------------
//  CONFIGURAÇÃO (compartilhada entre as três áreas + Resumo de Pagamentos)
// ---------------------------------------------------------------------------

/** Um mês do Resumo de Pagamentos, com entrada manual do usuário. */
export interface ResumoMesConfig {
  /** Despesas informadas à mão (ex.: R$ 2.000,00). */
  despesas: number | null;
  /** Recebido da Lívia no mês (ex.: R$ 500,00). */
  recebidoLivia: number | null;
}

/** Planejamento manual de despesas do mês seguinte ("chego em dez pagando o cartão de nov"). */
export interface DespesasProximoMesConfig {
  /** Fatura do cartão a pagar no próximo mês (informado à mão). */
  faturaCartao: number | null;
  /** Despesas em Pix (contas fixas etc.) a pagar no próximo mês. */
  despesasPix: number | null;
}

/**
 * Um lembrete FIXO/recorrente (ex.: "backup da pasta a cada 15 dias") —
 * aparece na aba Lembretes permanentemente, e o app dispara um aviso
 * chamativo enquanto estiver vencido (9h, 16h e 20h do dia).
 */
export interface LembreteFixo {
  id: string;
  titulo: string;
  /** Intervalo em dias entre disparos (15 = a cada 15 dias). */
  intervaloDias: number;
  /** ISO de quando foi concluído da última vez (null = nunca). */
  ultimaConclusao: string | null;
}

export interface ConfigLocal {
  /** Salário bruto mensal (R$). Base de todos os cálculos de hora extra e férias. */
  salarioBruto: number;
  /** Quilometragem atual do veículo (usada no status da manutenção). */
  kmAtual: number;
  /** Saldo do caixa no início de cada ano (ex.: "2026": 10000). */
  saldoInicial?: Record<string, number>;
  /** Resumo manual por mês, com chave "AAAA-MM" (ex.: "2026-01"). */
  resumoMes?: Record<string, ResumoMesConfig>;
  /**
   * Total de horas extras (a 50%) informado manualmente pelo ponto
   * eletrônico, com chave "AAAA-MM" (ex.: "2026-11": 12.5).
   * Entra no gráfico de ganhos por mês para o mês correspondente.
   */
  pontoEletronico?: Record<string, number>;
  /** Lembretes fixos/recorrentes (ex.: backup a cada 15 dias). */
  lembretesFixos?: LembreteFixo[];
  /** Planejamento manual por mês ("AAAA-MM" = mês em que você paga): fatura do cartão + despesas Pix. */
  despesasProximoMes?: Record<string, DespesasProximoMesConfig>;
  /** Bloco 8 (reversível): ativa painel de saúde financeira/alertas. */
  alertasInteligentesAtivo?: boolean;
  /** Orçamento mensal por categoria (R$). Usado quando alertasInteligentesAtivo=true. */
  orcamentosCategoria?: Record<string, number>;
  /** Percentual para avisar consumo de orçamento (padrão 80). */
  alertaOrcamentoPercentual?: number;
  /** Conciliação: chave `${ano}:${aba}:${linha}` => conferido. Reversível. */
  conciliacao?: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
//  HORA EXTRA (espelha a aba "Hora Extra" da planilha)
// ---------------------------------------------------------------------------
export interface RegistroHoraExtra {
  id: string;
  /** yyyy-MM-dd */
  data: string;
  /** HH:MM */
  chegada: string;
  /** HH:MM — início do almoço */
  almocoInicio: string;
  /** HH:MM — fim do almoço */
  almocoFim: string;
  /** HH:MM — saída da empresa (fim do período a 100%) */
  saidaEmpresa: string;
  /** HH:MM — fim do plantão (fim do período a 50%). Vazio = sem período 50%. */
  fimPlantao: string;
  observacao?: string;
}

// ---------------------------------------------------------------------------
//  FÉRIAS (espelha a aba "Férias" da planilha)
// ---------------------------------------------------------------------------
export interface RegistroFerias {
  id: string;
  /** Período aquisitivo fixo Abril/AAAA - Abril/AAAA (derivado do início). */
  periodo: string;
  /** yyyy-MM-dd */
  inicio: string;
  /** yyyy-MM-dd */
  fim: string;
  /** Dias efetivamente retirados (fim − início), como na planilha. */
  diasRetirados: number;
  /** Dias vendidos (abono pecuniário, máx. 10 por lei). */
  diasVendidos: number;
  observacao?: string;
}

// ---------------------------------------------------------------------------
//  MANUTENÇÃO DE VEÍCULO (espelha a aba "Manutenção C4" da planilha)
// ---------------------------------------------------------------------------
export interface RegistroManutencao {
  id: string;
  /** Descrição do serviço (coluna "Manutenção"). */
  descricao: string;
  /** yyyy-MM-dd */
  data: string;
  /** KM no momento do serviço (pode ser vazio para itens sem KM). */
  km?: number;
  valor: number;
  /** Mecânica / loja onde o serviço foi feito (coluna "Mecânico"). */
  mecanico: string;
  /** Loja de peças compradas (coluna "Observação" da planilha). */
  lojaPecas?: string;
  observacao?: string;
  /** Intervalo em MESES até a próxima revisão por data. */
  intervaloDataMeses: number;
  /** Intervalo em KM até a próxima revisão por quilometragem (opcional). */
  intervaloKm?: number;
}

// ---------------------------------------------------------------------------
//  PACOTE COMPLETO
// ---------------------------------------------------------------------------
export interface DadosLocais {
  versao: 1;
  /** Timestamp da última gravação. */
  salvoEm: number;
  config: ConfigLocal;
  horasExtras: RegistroHoraExtra[];
  ferias: RegistroFerias[];
  manutencoes: RegistroManutencao[];
}

export const CONFIG_PADRAO: ConfigLocal = {
  salarioBruto: 0,
  kmAtual: 0,
  saldoInicial: {},
  resumoMes: {},
  pontoEletronico: {},
  alertasInteligentesAtivo: false,
  orcamentosCategoria: {},
  alertaOrcamentoPercentual: 80,
  conciliacao: {},
};

export function dadosLocaisVazios(): DadosLocais {
  return {
    versao: 1,
    salvoEm: Date.now(),
    config: { ...CONFIG_PADRAO },
    horasExtras: [],
    ferias: [],
    manutencoes: [],
  };
}
