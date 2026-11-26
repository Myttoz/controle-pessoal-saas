/**
 * CATEGORIAS E OPÇÕES — edição de listas de seleção.
 *
 * Reversível e não destrutivo: renomear troca só o rótulo exibido (o valor
 * gravado nos lançamentos permanece o mesmo); ocultar só remove do select;
 * opções criadas podem ser removidas.
 */
import { useState } from 'react';
import { ListPlus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Botao } from '@/components/Botoes';
import type { OpcaoPersonalizada } from '@/types/dados-locais';
import { listaParaEdicao } from '@/lib/opcoes';
import { usarOpcoesBase } from '@/hooks/useOpcoes';
import { useStoreLocal } from '@/store/storeLocal';
import { useStoreUI } from '@/store/storeUI';

type Campo = 'CATEGORIA' | 'FORMA DE PGTO' | 'TIPO' | 'QUEM PAGA';
const CAMPOS: { campo: Campo; rotulo: string }[] = [
  { campo: 'CATEGORIA', rotulo: 'Categorias' },
  { campo: 'FORMA DE PGTO', rotulo: 'Formas de pagamento' },
  { campo: 'TIPO', rotulo: 'Tipos' },
  { campo: 'QUEM PAGA', rotulo: 'Quem paga' },
];

function BlocoOpcoes({ campo }: { campo: Campo }) {
  const base = usarOpcoesBase(campo);
  const personalizadas = useStoreLocal((s) => s.dados.config.opcoesPersonalizadas?.[campo]);
  const setConfig = useStoreLocal((s) => s.setConfig);
  const toast = useStoreUI((s) => s.toast);
  const [nova, setNova] = useState('');

  const linhas: OpcaoPersonalizada[] = listaParaEdicao(base, personalizadas);

  const salvar = (prox: OpcaoPersonalizada[]) => {
    const todas = useStoreLocal.getState().dados.config.opcoesPersonalizadas ?? {};
    setConfig({ opcoesPersonalizadas: { ...todas, [campo]: prox } });
  };

  const alterar = (valor: string, parcial: Partial<OpcaoPersonalizada>) =>
    salvar(linhas.map((o) => (o.valor === valor ? { ...o, ...parcial } : o)));

  const adicionar = () => {
    const v = nova.trim();
    if (!v) return;
    if (listaParaEdicao(base, useStoreLocal.getState().dados.config.opcoesPersonalizadas?.[campo]).some((o) => o.valor === v)) { toast('erro', 'Essa opção já existe.'); return; }
    salvar([...linhas, { valor: v, ativo: true, criada: true }]);
    setNova('');
  };

  const remover = (valor: string) => {
    if (!confirm(`Remover a opção personalizada "${valor}"? Lançamentos que já usam esse valor não serão alterados.`)) return;
    salvar(linhas.filter((o) => o.valor !== valor || !o.criada));
  };

  const restaurar = () => {
    if (!confirm(`Restaurar as opções padrão de ${campo}?`)) return;
    const todas = useStoreLocal.getState().dados.config.opcoesPersonalizadas ?? {};
    const prox = { ...todas };
    delete prox[campo];
    setConfig({ opcoesPersonalizadas: prox });
    toast('sucesso', 'Opções restauradas ao padrão.');
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-200">{CAMPOS.find((c) => c.campo === campo)!.rotulo}</h3>
        <button type="button" onClick={restaurar} title="Restaurar ao padrão" className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200">
          <RotateCcw className="h-3 w-3" /> Restaurar
        </button>
      </div>
      <p className="hidden text-xs text-slate-500" title="Renomear altera só o texto exibido; o valor salvo nos lançamentos continua o mesmo. Desmarcar Ativo oculta a opção dos formulários, sem apagar dados antigos.">Renomear altera só o rótulo; desmarcar oculta dos formulários.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {linhas.map((o) => (
          <div key={o.valor} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${o.ativo ? 'border-slate-700 bg-slate-950/40 text-slate-300' : 'border-slate-800 bg-slate-950/20 text-slate-600'}`}>
            <input
              type="checkbox"
              checked={o.ativo}
              onChange={(e) => alterar(o.valor, { ativo: e.target.checked })}
              title="Ativo nos formulários"
              className="h-3.5 w-3.5 accent-sky-500"
            />
            <input
              value={o.rotulo ?? o.valor}
              onChange={(e) => alterar(o.valor, { rotulo: e.target.value })}
              placeholder={o.valor}
              title={`Valor gravado: ${o.valor}`}
              className="w-36 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200"
            />
            {o.criada && (
              <button type="button" onClick={() => remover(o.valor)} title="Remover opção criada" className="text-slate-500 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') adicionar(); }}
          placeholder="Nova opção…"
          className="w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        />
        <Botao onClick={adicionar} icone={Plus}>Adicionar</Botao>
      </div>
    </section>
  );
}

export function OpcoesPage() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/15 px-3 py-2 text-sm text-emerald-200">
        <div className="flex items-center gap-2">
          <ListPlus className="h-4 w-4" />
          <h2 className="font-semibold" title="Renomes são apenas rótulos de exibição. Nenhum dado existente é alterado.">Categorias e opções</h2>
        </div>
      </div>
      {CAMPOS.map(({ campo }) => <BlocoOpcoes key={campo} campo={campo} />)}
    </div>
  );
}
