const CORES_CATEGORIA: Record<string, string> = {
  'Contas fixas': 'bg-sky-500/15 text-sky-300',
  Mercado: 'bg-emerald-500/15 text-emerald-300',
  'Compra Conjunta': 'bg-teal-500/15 text-teal-300',
  'Compra Pessoal': 'bg-violet-500/15 text-violet-300',
  Transporte: 'bg-amber-500/15 text-amber-300',
  Alimentação: 'bg-orange-500/15 text-orange-300',
  Saúde: 'bg-rose-500/15 text-rose-300',
  Lazer: 'bg-fuchsia-500/15 text-fuchsia-300',
  Assinaturas: 'bg-indigo-500/15 text-indigo-300',
  'Pix/Saldo': 'bg-cyan-500/15 text-cyan-300',
  Outros: 'bg-slate-600/40 text-slate-300',
  Veículos: 'bg-lime-500/15 text-lime-300',
  Doação: 'bg-pink-500/15 text-pink-300',
  Cuidados: 'bg-purple-500/15 text-purple-300',
  Estudos: 'bg-blue-500/15 text-blue-300',
  Vícios: 'bg-red-500/15 text-red-300',
  Viagem: 'bg-yellow-500/15 text-yellow-300',
};

/** Badge colorida por categoria (fallback neutro para valores fora da lista). */
export function BadgeCategoria({ categoria }: { categoria: string }) {
  const cor = CORES_CATEGORIA[categoria] ?? 'bg-slate-600/40 text-slate-300';
  return (
    <span
      className={`inline-block max-w-full truncate rounded-md px-2 py-0.5 text-xs font-medium ${cor}`}
      title={categoria}
    >
      {categoria}
    </span>
  );
}
