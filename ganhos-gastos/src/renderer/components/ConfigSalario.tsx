import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Campo, EntradaMoeda } from './Campos';
import { formatarMoeda } from '@/lib/formatar';
import { HORAS_MES } from '@/lib/calculos';
import { useStoreLocal } from '@/store/storeLocal';

/**
 * Painel de configuração do SALÁRIO BRUTO — base de todos os cálculos de
 * hora extra e férias. Editável inline; salva automaticamente (nuvem via Supabase).
 * Mostra o valor de hora derivado (bruto ÷ 220) para conferência.
 */
export function ConfigSalario() {
  const salarioBruto = useStoreLocal((s) => s.dados.config.salarioBruto);
  const setConfig = useStoreLocal((s) => s.setConfig);

  const [texto, setTexto] = useState(
    salarioBruto > 0 ? String(Math.round(salarioBruto * 100)) : '',
  );
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setTexto(salarioBruto > 0 ? String(Math.round(salarioBruto * 100)) : '');
  }, [salarioBruto]);

  const aplicar = (digitos: string) => {
    if (digitos.trim() === '') {
      setConfig({ salarioBruto: 0 });
      setErro(null);
      return;
    }
    const centavos = Number(digitos);
    if (!Number.isFinite(centavos) || centavos < 0) {
      setErro('Informe um valor numérico.');
      return;
    }
    setErro(null);
    setConfig({ salarioBruto: Math.round((centavos / 100) * 100) / 100 });
  };

  const brutoBase =
    texto.trim() === '' ? 0 : Math.round((Number(texto) / 100) * 100) / 100;
  const valorHora = brutoBase > 0 ? brutoBase / HORAS_MES : 0;
  const valorHora50 = valorHora * 1.5;
  const valorHora100 = valorHora * 2;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
      <div className="flex flex-wrap items-end gap-4">
        <Campo rotulo="Salário bruto mensal (R$)" className="w-52">
          <EntradaMoeda
            value={texto}
            onChange={(digitos) => setTexto(digitos)}
            onBlur={() => aplicar(texto)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            placeholder="Ex.: 2830"
          />
        </Campo>

        <div className="flex flex-wrap gap-2 pb-0.5">
          <IndicadorHora
            rotulo="Valor da hora"
            valor={valorHora}
            detalhe={`${HORAS_MES} h/mês`}
            tom="slate"
          />
          <IndicadorHora
            rotulo="Hora 50%"
            valor={valorHora50}
            detalhe="plantão · × 1,5"
            tom="violet"
          />
          <IndicadorHora
            rotulo="Hora 100%"
            valor={valorHora100}
            detalhe="presencial · × 2"
            tom="sky"
          />
        </div>

        {erro && <p className="pb-1 text-sm text-rose-400">{erro}</p>}
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Cálculo: salário bruto ÷ {HORAS_MES} h/mês (44 h/semana, padrão CLT). Hora extra a{' '}
          <strong className="text-slate-300">100%</strong> = hora × 2 · Hora a{' '}
          <strong className="text-slate-300">50%</strong> (plantão) = hora × 1,5 · Férias = valor
          proporcional + 1/3 constitucional.
        </span>
      </p>
    </div>
  );
}

function IndicadorHora({
  rotulo,
  valor,
  detalhe,
  tom,
}: {
  rotulo: string;
  valor: number;
  detalhe: string;
  tom: 'slate' | 'violet' | 'sky';
}) {
  const cor =
    tom === 'violet' ? 'text-violet-300' : tom === 'sky' ? 'text-sky-300' : 'text-slate-100';

  return (
    <div className="min-w-[7.5rem] rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{rotulo}</p>
      <p className={`text-sm font-semibold tabular-nums ${cor}`}>{formatarMoeda(valor)}</p>
      <p className="text-[10px] text-slate-600">{detalhe}</p>
    </div>
  );
}
