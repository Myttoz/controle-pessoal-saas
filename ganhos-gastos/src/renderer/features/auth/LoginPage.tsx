import { useRef, useState } from 'react';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Botao } from '@/components/Botoes';
import { useStoreAuth } from '@/store/storeAuth';
import { useStoreUI } from '@/store/storeUI';
import { supabase } from '@/lib/supabase';

/** Ícone do Google no mesmo formato dos ícones Lucide (aceita className). */
function GoogleIconBase({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-4 w-4'} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.97 11.97 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

/** Mesmo formato dos ícones Lucide, para usar no `icone` do Botao. */
const GoogleIcon = GoogleIconBase as unknown as LucideIcon;

export function LoginPage() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const entrandoRef = useRef(false);

  const login = useStoreAuth((s) => s.login);
  const erro = useStoreAuth((s) => s.erro);
  const limparErro = useStoreAuth((s) => s.limparErro);
  const irPara = useStoreUI((s) => s.irPara);
  const toast = useStoreUI((s) => s.toast);

  const aoEntrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entrandoRef.current || !usuario.trim() || !senha.trim()) return;
    entrandoRef.current = true;
    setCarregando(true);

    const sucesso = await login(usuario.trim(), senha);
    setCarregando(false);
    entrandoRef.current = false;

    if (sucesso) {
      limparErro();
      irPara('dashboard');
    }
  };

  const aoEntrarComGoogle = async () => {
    if (entrandoRef.current) return;
    entrandoRef.current = true;
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      toast('erro', error.message);
      entrandoRef.current = false;
    }
    // O Google redireciona de volta para o app; o Supabase restaura a sessão.
  };

  return (
    <div className="flex h-full items-center justify-center bg-slate-950">
      <div className="w-full max-w-md p-6 space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-600 text-white">
            <LogIn className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
            Controle Pessoal
          </h1>
        </div>

        {erro && (
          <div className="rounded-lg border border-rose-800 bg-rose-900/30 px-3 py-2">
            <div className="flex items-start gap-2 text-xs text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          </div>
        )}

        <form onSubmit={aoEntrar} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Mail className="h-3.5 w-3.5" />
              <label className="font-medium">E-mail</label>
            </div>
            <input
              type="email"
              autoComplete="email"
              required
              value={usuario}
              onChange={(e) => {
                setUsuario(e.target.value);
                limparErro();
              }}
              placeholder="seu@email.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 focus:ring-1 focus:ring-sky-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              <label className="font-medium">Senha</label>
            </div>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                limparErro();
              }}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 focus:ring-1 focus:ring-sky-500 outline-none"
            />
          </div>

          <Botao
            type="submit"
            variante="primario"
            carregando={carregando}
            className="w-full"
          >
            Entrar
          </Botao>
        </form>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <div className="h-px flex-1 bg-slate-800" />
          ou
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <Botao
          type="button"
          variante="secundario"
          icone={GoogleIcon}
          onClick={aoEntrarComGoogle}
          className="w-full"
        >
          Entrar com Google
        </Botao>

        <p className="text-[10px] text-slate-500 text-center">
          Seus dados ficam no Supabase, isolados por usuário.
        </p>
      </div>
    </div>
  );
}
