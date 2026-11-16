import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

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
