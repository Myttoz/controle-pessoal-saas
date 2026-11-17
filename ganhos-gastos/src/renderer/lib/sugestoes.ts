import type { SnapshotAno } from '@/types/api-types';

/** Lista única de descrições usadas no ano inteiro — usada para autocomplete. */
export function sugestoesDescricoes(snapshot: SnapshotAno | undefined): string[] {
  const conjunto = new Set<string>();
  if (!snapshot) return [];
  for (const snap of Object.values(snapshot.meses ?? {})) {
    if (!snap) continue;
    for (const r of snap.registros ?? []) {
      const d = r.dados.DESCRIÇÃO?.trim();
      if (d) conjunto.add(d);
    }
  }
  return [...conjunto].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}

/** Lista única de observações usadas no ano inteiro — usada para autocomplete. */
export function sugestoesObservacoes(snapshot: SnapshotAno | undefined): string[] {
  const conjunto = new Set<string>();
  if (!snapshot) return [];
  for (const snap of Object.values(snapshot.meses ?? {})) {
    if (!snap) continue;
    for (const r of snap.registros ?? []) {
      const o = r.dados.OBSERVAÇÃO?.trim();
      if (o) conjunto.add(o);
    }
  }
  return [...conjunto].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}
