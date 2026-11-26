/**
 * Opções editáveis pela UI — funções puras.
 *
 * Regra de segurança: renomear uma opção troca SOMENTE o rótulo exibido.
 * O valor salvo nos lançamentos permanece o original, então nada é quebrado.
 * Ocultar (`ativo: false`) só esconde do select; dados antigos continuam legíveis.
 */
import type { OpcaoPersonalizada } from '@/types/dados-locais';

export function aplicarOpcoes(
  base: string[],
  personalizadas: OpcaoPersonalizada[] | undefined,
): string[] {
  const cfg = new Map((personalizadas ?? []).map((o) => [o.valor, o]));
  const visiveis = base
    .filter((valor) => cfg.get(valor)?.ativo !== false)
    .map((valor) => cfg.get(valor)?.rotulo || valor);
  const extras = (personalizadas ?? [])
    .filter((o) => o.criada && o.ativo && !base.includes(o.valor))
    .map((o) => o.rotulo || o.valor);
  return [...new Set([...visiveis, ...extras])].sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
  );
}

/** Rótulo exibido para um valor gravado. */
export function rotuloDeValor(valor: string, personalizadas: OpcaoPersonalizada[] | undefined): string {
  return personalizadas?.find((o) => o.valor === valor)?.rotulo || valor;
}

/** Valor gravado a partir do rótulo escolhido no select. */
export function valorDeRotulo(rotulo: string, personalizadas: OpcaoPersonalizada[] | undefined): string {
  return personalizadas?.find((o) => (o.rotulo || o.valor) === rotulo)?.valor ?? rotulo;
}

/** Lista completa (base + criadas) para a tela de configuração. */
export function listaParaEdicao(
  base: string[],
  personalizadas: OpcaoPersonalizada[] | undefined,
): OpcaoPersonalizada[] {
  const cfg = personalizadas ?? [];
  const todos = [...base];
  for (const o of cfg) if (o.criada && !todos.includes(o.valor)) todos.push(o.valor);
  return todos.map((valor) => {
    const existente = cfg.find((o) => o.valor === valor);
    return existente ?? { valor, ativo: true, criada: false };
  });
}
