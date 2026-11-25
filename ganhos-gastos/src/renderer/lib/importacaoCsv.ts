/**
 * Importação CSV — funções puras (sem efeito colateral).
 * Responsabilidade: normalizar texto, parsear data/valor pt-BR e sugerir
 * correspondências entre linhas do extrato e lançamentos existentes.
 *
 * Nenhuma função aqui grava dados. Bloco 2 = apenas sugestões.
 */
import type { LancamentoMensal, Registro, SiglaMes, SnapshotAno } from '@/types/api-types';

export interface LinhaCsv {
  indice: number;
  data: string;      // yyyy-MM-dd (vazio se inválida)
  dataRaw: string;
  descricao: string; // estabelecimento
  valor: number | null;
  valorRaw: string;
  hora: string;
  observacao: string; // coluna "observação" do CSV, se houver
  portador: string;
  parcela: string;
}

export interface LancamentoIndexado {
  ano: number;
  mes: SiglaMes;
  aba: string;
  linha: number | string;
  dados: LancamentoMensal;
  chave: string;
}

export interface SugestaoMatch {
  lancamento: LancamentoIndexado | null;
  pontos: number;
  confianca: 'alta' | 'media' | 'baixa' | 'nova';
  motivos: string[];
  descricaoSugerida: string;
  categoriaSugerida: string;
  observacaoSugerida: string;
}

export type AcaoImportacao = 'vincular' | 'novo' | 'ignorar';

export interface ResultadoImportacao {
  linha: LinhaCsv;
  sugestao: SugestaoMatch;
  acao: AcaoImportacao;
}

/** Remove acentos, pontuação e caixa — base para comparação tolerante. */
export function normalizar(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalizar(s).split(' ').filter((t) => t.length >= 3));
}

/** 1 = idêntico; 0,8 = um contém o outro; senão razão de tokens em comum. */
export function similaridade(a: string, b: string): number {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  // extratos colam palavras: "POSTOSAORAFAEL" vs "Posto Rafael"
  const ca = na.replace(/ /g, ''); const cb = nb.replace(/ /g, '');
  if (ca.includes(cb) || cb.includes(ca)) return 0.7;
  const ta = tokens(a); const tb = tokens(b);
  let comuns = 0;
  for (const t of ta) if (tb.has(t)) comuns++;
  const uniao = new Set([...ta, ...tb]).size;
  return uniao > 0 ? comuns / uniao : 0;
}

/** dd/mm/aaaa (ou aaaa-mm-dd) → yyyy-MM-dd. */
export function parseDataBr(v: string): string {
  const s = v.trim();
  if (!s) return '';
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return '';
}

/** Aceita "R$ 1,89", "R$ -2.406,10", "1.234,56", "1234.56". */
export function parseValorBr(v: string): number | null {
  const s = v.trim().replace(/\s/g, '').replace(/^R\$\s?/, '');
  if (!s) return null;
  const temVirgula = s.includes(',');
  const temPonto = s.includes('.');
  let norm = s;
  if (temVirgula && temPonto) norm = s.replace(/\./g, '').replace(',', '.');
  else if (temVirgula) norm = s.replace(',', '.');
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

/** Achata todos os meses do snapshot em uma lista indexada. */
export function indexarLancamentos(snapshots: Record<number, SnapshotAno | undefined>): LancamentoIndexado[] {
  const out: LancamentoIndexado[] = [];
  for (const [anoStr, snap] of Object.entries(snapshots)) {
    if (!snap) continue;
    const ano = Number(anoStr);
    for (const [sigla, mes] of Object.entries(snap.meses)) {
      if (!mes) continue;
      for (const r of mes.registros as Registro<LancamentoMensal>[]) {
        out.push({
          ano,
          mes: sigla as SiglaMes,
          aba: mes.aba,
          linha: r.linha,
          dados: r.dados,
          chave: `${ano}:${mes.aba}:${r.linha}`,
        });
      }
    }
  }
  return out;
}

/**
 * Sugere a melhor correspondência para uma linha do CSV.
 * Pontuação: data igual (40), valor igual (40), descrição parecida (até 30),
 * observação parecida (até 20), portadorNaObservacao (10).
 */
export function sugerirMatch(
  linha: LinhaCsv,
  lancamentos: LancamentoIndexado[],
  anoAlvo: number | null,
): SugestaoMatch {
  const vazio: SugestaoMatch = {
    lancamento: null, pontos: 0, confianca: 'nova', motivos: [],
    descricaoSugerida: linha.descricao, categoriaSugerida: '', observacaoSugerida: linha.observacao,
  };
  if (linha.valor == null || !linha.data) return vazio;

  let melhor: SugestaoMatch = vazio;
  let melhorPontos = -1;

  for (const l of lancamentos) {
    if (anoAlvo != null && l.ano !== anoAlvo) continue;
    const motivos: string[] = [];
    let pontos = 0;

    const valorL = Number(l.dados.VALOR) || 0;
    if (Math.abs(valorL - linha.valor) < 0.01) { pontos += 40; motivos.push('valor igual'); }

    const dataL = l.dados.DATA || '';
    if (dataL && dataL === linha.data) { pontos += 40; motivos.push('data igual'); }

    const simDesc = similaridade(linha.descricao, l.dados.DESCRIÇÃO || '');
    if (simDesc >= 0.5) {
      const bonus = Math.round(simDesc * 30);
      pontos += bonus;
      motivos.push(`descrição ${Math.round(simDesc * 100)}%`);
    }

    const obs = l.dados.OBSERVAÇÃO || '';
    const simObs = similaridade(linha.descricao, obs);
    if (simObs >= 0.5) {
      const bonus = Math.round(simObs * 20);
      pontos += bonus;
      motivos.push(`observação ${Math.round(simObs * 100)}%`);
    }

    // Nomes genéricos (ex.: "MERCADO PAGO") — procurar o estabelecimento real
    // dentro das observações já anotadas pelo usuário.
    if (linha.portador && obs && normalizar(linha.portador).split(' ').some((t) => t.length >= 4 && normalizar(obs).includes(t))) {
      pontos += 10; motivos.push('portador na observação');
    }

    if (pontos > melhorPontos) {
      melhorPontos = pontos;
      const confianca: SugestaoMatch['confianca'] = pontos >= 80 ? 'alta' : pontos >= 55 ? 'media' : pontos >= 35 ? 'baixa' : 'nova';
      melhor = {
        lancamento: pontos >= 35 ? l : null,
        pontos, confianca, motivos,
        // prioriza a OBSERVAÇÃO do lançamento mensal (é onde o gasto é detalhado)
        descricaoSugerida: obs || l.dados.DESCRIÇÃO || linha.descricao,
        categoriaSugerida: l.dados.CATEGORIA || '',
        observacaoSugerida: obs || linha.observacao,
      };
    }
  }

  return melhor.pontos >= 35 ? melhor : vazio;
}

/** Ação inicial sugerida a partir da confiança. */
export function acaoSugerida(s: SugestaoMatch): AcaoImportacao {
  if (s.confianca === 'alta') return 'vincular';
  if (s.confianca === 'nova') return 'novo';
  return 'novo';
}
