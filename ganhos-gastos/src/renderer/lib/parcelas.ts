/**
 * Parser de "parcela" na observação dos lançamentos — ex.: "curso kiwifi 7/12"
 * (7ª parcela de 12), "1/3" (1ª de 3). Usado pela função
 * "Duplicar para o mês seguinte" (menu de botão direito).
 *
 * Regras combinadas com o usuário:
 *   - Incrementa a parcela ao duplicar ("7/12" → "8/12").
 *   - Se a observação não contém parcela, permanece igual.
 *   - Se já estamos na última parcela (N ≥ M, ex.: "12/12"), o registro
 *     NÃO deve ser duplicado — a opção nem é oferecida no menu.
 */
export interface Parcela {
  /** Observação com a parcela já incrementada ("8/12"). */
  proxima: string;
  /** Número da parcela atual. */
  atual: number;
  /** Total de parcelas. */
  total: number;
}

const RE_PARCELA = /(\d{1,2})\s*\/\s*(\d{1,2})/;

/** Encontra e normaliza o trecho "N/M" na observação; null = não há parcela. */
export function detectarParcela(texto: string | null | undefined): Parcela | null {
  const t = (texto ?? '').trim();
  if (!t) return null;
  const m = t.match(RE_PARCELA);
  if (!m) return null;
  const atual = Number(m[1]);
  const total = Number(m[2]);
  if (!Number.isFinite(atual) || !Number.isFinite(total)) return null;
  if (atual < 1 || total < 1 || atual > total) return null;
  const proximo = Math.min(atual + 1, total);
  return {
    proxima: t.replace(RE_PARCELA, `${proximo}/${total}`),
    atual,
    total,
  };
}

/** Observação após duplicar: parcela avançada em 1 ("8/12") ou o texto intacto. */
export function observacaoAposDuplicar(texto: string | null | undefined): string {
  const p = detectarParcela(texto);
  return p ? p.proxima : (texto ?? '');
}

/** `true` quando a observação indica a última parcela — não duplicar. */
export function ehUltimaParcela(texto: string | null | undefined): boolean {
  const p = detectarParcela(texto);
  return p !== null && p.atual >= p.total;
}
