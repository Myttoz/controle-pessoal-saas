import { useState } from 'react';
import type { DadosSalario, LinhaSalario, Registro } from '@/types/api-types';
import { Botao } from '@/components/Botoes';
import { Campo, Entrada, EntradaMoeda } from '@/components/Campos';
import { Modal } from '@/components/Modal';
import { formatarMoeda } from '@/lib/formatar';
import { SIGLAS } from '@/lib/meses';
import { horaExtraPorMes } from '@/lib/calculos';
import { useStoreAno } from '@/store/storeAno';
import { useStoreLocal } from '@/store/storeLocal';

type CamposNumericos =
  | 'SALÁRIO BASE'
  | '13º'
  | 'FÉRIAS'
  | 'AJUDA CUSTO (info)'
  | 'OUTROS'
  | 'TICKET';

const CAMPOS: { campo: CamposNumericos; rotulo: string; informativo?: boolean; dica?: string }[] = [
  { campo: 'SALÁRIO BASE', rotulo: 'Salário base' },
  { campo: '13º', rotulo: '13º' },
  { campo: 'FÉRIAS', rotulo: 'Férias' },
  {
    campo: 'AJUDA CUSTO (info)',
    rotulo: 'Ajuda custo (info)',
    informativo: true,
    dica: 'Coluna informativa — não entra no cálculo do salário',
  },
  { campo: 'OUTROS', rotulo: 'Outros' },
  {
    campo: 'TICKET',
    rotulo: 'Ticket (info)',
    informativo: true,
    dica: 'Coluna informativa — não entra no cálculo do salário',
  },
];

function paraDigitos(valor: number | undefined | null): string {
  if (valor === undefined || valor === null || !Number.isFinite(Number(valor))) return '';
  return String(Math.round(Number(valor) * 100));
}

/**
 * Edição da linha do mês na aba Salário.
 * Envia SOMENTE colunas editáveis — FREELANCE e TOTAL GANHOS
 * são calculados automaticamente e nunca saem daqui.
 */
export function FormSalario({
  registro,
  aoFechar,
}: {
  registro: Registro<LinhaSalario>;
  aoFechar: () => void;
}) {
  const [valores, setValores] = useState<Record<CamposNumericos, string>>(() => {
    const inicial = {} as Record<CamposNumericos, string>;
    for (const { campo } of CAMPOS) inicial[campo] = paraDigitos(registro.dados[campo]);
    return inicial;
  });
  const [observacao, setObservacao] = useState(registro.dados.OBSERVAÇÃO ?? '');
  const [erros, setErros] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const editarSalario = useStoreAno((s) => s.editarSalario);
  const ano = useStoreAno((s) => s.anoSelecionado);

  // HORA EXTRA (info): calculada ao vivo — soma dos plantões + ponto
  // eletrônico do mês. Só leitura, nada é gravado em salarios.hora_extra.
  const horasExtras = useStoreLocal((s) => s.dados.horasExtras);
  const pontoEletronico = useStoreLocal((s) => s.dados.config.pontoEletronico);
  const salarioBruto = useStoreLocal((s) => s.dados.config.salarioBruto);
  const horaExtra = (() => {
    if (ano == null) return 0;
    const idx = SIGLAS.indexOf(registro.dados['MÊS']);
    return idx >= 0 ? horaExtraPorMes(ano, horasExtras, pontoEletronico, salarioBruto).get(idx + 1) ?? 0 : 0;
  })();

  const enviar = async () => {
    const dados: DadosSalario = {};
    for (const { campo } of CAMPOS) {
      const bruto = valores[campo].trim();
      const numero = bruto === '' ? 0 : Math.round((Number(bruto) / 100) * 100) / 100;
      if (!Number.isFinite(numero)) {
        setErros(`"${campo}" precisa ser numérico.`);
        return;
      }
      if (numero < 0) {
        setErros(`"${campo}" não pode ser negativo.`);
        return;
      }
      dados[campo] = numero;
    }
    dados.OBSERVAÇÃO = observacao.trim();
    setErros(null);

    setEnviando(true);
    const ok = ano != null ? await editarSalario(ano, registro.linha, dados) : false;
    setEnviando(false);
    if (ok) aoFechar();
  };

  return (
    <Modal
      aberto
      titulo={`Salário · ${registro.dados['MÊS']}`}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao onClick={aoFechar} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao variante="primario" carregando={enviando} onClick={() => void enviar()}>
            Salvar
          </Botao>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS.map(({ campo, rotulo, informativo, dica }) => (
          <Campo
            key={campo}
            rotulo={`${rotulo}${informativo ? '' : ' (R$)'}`}
            dica={dica}
          >
            <EntradaMoeda
              value={valores[campo]}
              onChange={(digitos) =>
                setValores((atual) => ({ ...atual, [campo]: digitos }))
              }
              placeholder="0,00"
            />
          </Campo>
        ))}

        <Campo
          rotulo="Hora extra (info)"
          dica="Calculada automaticamente: plantões do mês + ponto eletrônico (sempre a 50%). Não entra no cálculo do salário."
        >
          <input
            type="text"
            readOnly
            disabled
            value={formatarMoeda(horaExtra)}
            className="block w-full cursor-not-allowed rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-right text-sm tabular-nums text-slate-500 outline-none"
          />
        </Campo>

        <Campo rotulo="Observação" className="sm:col-span-2">
          <Entrada
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Opcional"
          />
        </Campo>
      </div>

      {erros && <p className="mt-3 text-sm text-rose-400">{erros}</p>}

      <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-500">
        O <strong>TICKET</strong> e a <strong>HORA EXTRA (info)</strong> são informativos: a hora
        extra é calculada automaticamente (plantões + ponto eletrônico do mês, sempre a 50%) e não
        entra no TOTAL GANHOS. A coluna <strong>FREELANCE</strong> vem dos
        Serviços lançados na aba <strong>Extras</strong> (mesmo mês) e também não é editada.
      </p>
    </Modal>
  );
}
