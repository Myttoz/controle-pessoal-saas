import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import type { InputHTMLAttributes, KeyboardEvent, ReactNode, SelectHTMLAttributes } from 'react';

export const CLASSES_INPUT =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50';

export const CLASSES_SELECT = `${CLASSES_INPUT} appearance-none pr-8`;

interface CampoProps {
  rotulo: string;
  children: ReactNode;
  dica?: string;
  className?: string;
}

export function Campo({ rotulo, children, dica, className = '' }: CampoProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {rotulo}
      </span>
      {children}
      {dica && <span className="mt-1 block text-xs text-slate-500">{dica}</span>}
    </label>
  );
}

export const Entrada = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Entrada(props, ref) {
    return <input ref={ref} {...props} className={`${CLASSES_INPUT} ${props.className ?? ''}`} />;
  },
);

/** Formata dígitos crus como moeda brasileira (ex.: "154950" → "1.549,50"). */
function formatarDigitosOculto(digitos: string): string {
  if (!digitos) return '';
  const n = parseInt(digitos, 10);
  if (!Number.isFinite(n)) return '';
  const reais = Math.floor(n / 100);
  const centavos = n % 100;
  return `${reais.toLocaleString('pt-BR')},${String(centavos).padStart(2, '0')}`;
}

/**
 * Campo de entrada de moeda. O usuário digita só dígitos; o campo
 * mantém sempre 2 casas decimais e aplica separador de milhar.
 * O valor chega no formulário como string de dígitos (centavos) — ex.: "154950" = R$ 1.549,50.
 */
export const EntradaMoeda = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> & {
    value: string;
    onChange: (valorDigitos: string) => void;
  }
>(function EntradaMoeda({ value, onChange, placeholder, className, ...props }, ref) {
  const digitos = String(value ?? '').replace(/\D/g, '').slice(0, 12);
  const formatado = formatarDigitosOculto(digitos);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder ?? '0,00'}
      value={formatado}
      onChange={(e) => {
        const apenas = e.target.value.replace(/\D/g, '');
        onChange(apenas);
      }}
      {...props}
      className={`${CLASSES_INPUT} text-right tabular-nums ${className ?? ''}`}
    />
  );
});

/**
 * Campo de entrada com autocomplete (estilo Excel/Google Sheets):
 * - Enquanto o usuário digita, aparece uma lista de valores já usados.
 * - Pressionar <Tab> ou clicar na opção completa o valor.
 * - Primeira letra toda maiúscula automaticamente (se `primeiraMaiuscula`).
 */
export const EntradaSugestoes = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
    value: string;
    onChange: (texto: string) => void;
    sugestoes?: string[];
    primeiraMaiuscula?: boolean;
  }
>(function EntradaSugestoes(
  { value, onChange, sugestoes = [], primeiraMaiuscula = true, className, ...props },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [foco, setFoco] = useState(false);

  const normalizar = (t: string) =>
    primeiraMaiuscula && t.length > 0
      ? t.charAt(0).toLocaleUpperCase('pt-BR') + t.slice(1)
      : t;

  const valorAtual = normalizar(value ?? '');
  const termo = valorAtual.trim().toLowerCase();

  const filtradas = useMemo(() => {
    if (!foco) return [] as string[];
    if (!termo) return sugestoes.slice(0, 8);
    return sugestoes
      .filter((s) => s.toLowerCase().includes(termo))
      .sort((a, b) => {
        const aComeca = a.toLowerCase().startsWith(termo) ? 0 : 1;
        const bComeca = b.toLowerCase().startsWith(termo) ? 0 : 1;
        if (aComeca !== bComeca) return aComeca - bComeca;
        return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
      })
      .slice(0, 8);
  }, [foco, termo, sugestoes]);

  // Clicar fora fecha o menu de sugestões; clicar na opção seleciona.
  useEffect(() => {
    if (!foco) return;
    const aoClicarFora = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFoco(false);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [foco]);

  const selecionar = (texto: string) => {
    onChange(texto);
    setFoco(false);
  };

  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && !e.shiftKey && filtradas.length > 0) {
      e.preventDefault();
      selecionar(filtradas[0]);
    } else if (e.key === 'Escape') {
      setFoco(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={ref}
        autoComplete="off"
        value={valorAtual}
        onChange={(e) => {
          onChange(normalizar(e.target.value));
          setFoco(true);
        }}
        onFocus={() => setFoco(true)}
        onKeyDown={aoTeclar}
        {...props}
        className={`${CLASSES_INPUT} ${className ?? ''}`}
      />
      {foco && filtradas.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-[220px] w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">
          {filtradas.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selecionar(s);
              }}
              className="block w-full truncate px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export function Selecao(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`${CLASSES_SELECT} ${props.className ?? ''}`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-slate-500">
        ▾
      </span>
    </div>
  );
}
