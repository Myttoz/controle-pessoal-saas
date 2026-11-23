import { useState } from 'react';
import { KeyRound, AlertCircle } from 'lucide-react';
import { Botao } from '@/components/Botoes';
import { useStoreAuth } from '@/store/storeAuth';
import { useStoreUI } from '@/store/storeUI';
import { supabase } from '@/lib/supabase';

export function RecuperarSenhaPage() {
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const setRecuperacao = useStoreAuth((s) => s.setRecuperacaoSenhaPendente);
  const toast = useStoreUI((s) => s.toast);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      setErro('As senhas não conferem.');
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) {
      setErro(error.message || 'Não foi possível atualizar a senha.');
      return;
    }
    setRecuperacao(false);
    toast('sucesso', 'Senha atualizada com sucesso.');
    // remove hash/tokens da URL
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  };

  return (
    <div className="flex h-full items-center justify-center bg-slate-950">
      <div className="w-full max-w-md p-6 space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-600 text-white">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
            Definir nova senha
          </h1>
        </div>

        <p className="text-sm text-slate-400 text-center">
          Você entrou por um link de recuperação. Defina uma nova senha para continuar.
        </p>

        {erro && (
          <div className="rounded-lg border border-rose-800 bg-rose-900/30 px-3 py-2">
            <div className="flex items-start gap-2 text-xs text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          </div>
        )}

        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 focus:ring-1 focus:ring-sky-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Confirmar nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 focus:ring-1 focus:ring-sky-500 outline-none"
            />
          </div>
          <Botao type="submit" variante="primario" carregando={carregando} className="w-full">
            Salvar nova senha
          </Botao>
        </form>
      </div>
    </div>
  );
}
