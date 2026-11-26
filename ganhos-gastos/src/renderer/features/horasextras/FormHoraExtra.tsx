import { useEffect, useState } from 'react';
import type { RegistroHoraExtra } from '@/types/dados-locais';
import { Botao } from '@/components/Botoes';
import { Campo, Entrada, EntradaMoeda } from '@/components/Campos';
import { Modal } from '@/components/Modal';
import { formatarMoeda, hojeISO } from '@/lib/formatar';
import { calcularHoraExtra } from '@/lib/calculos';
import { useStoreLocal } from '@/store/storeLocal';
import { useStoreAno } from '@/store/storeAno';

interface Estado {
  data: string;
  chegada: string;
  almocoInicio: string;
  almocoFim: string;
  saidaEmpresa: string;
  fimPlantao: string;
  observacao: string;
}

const VAZIO: Estado = {
  data: hojeISO(),
  chegada: '',
  almocoInicio: '',
  almocoFim: '',
  saidaEmpresa: '',
  fimPlantao: '',
  observacao: '',
};

function paraEstado(r?: RegistroHoraExtra | null): Estado {
  if (!r) return { ...VAZIO, data: hojeISO() };
  return {
    data: r.data,
    chegada: r.chegada,
    almocoInicio: r.almocoInicio,
    almocoFim: r.almocoFim,
    saidaEmpresa: r.saidaEmpresa,
    fimPlantao: r.fimPlantao,
    observacao: r.observacao ?? '',
  };
}

interface Props {
  registro?: RegistroHoraExtra | null;
  aoFechar: () => void;
}

export function FormHoraExtra({ registro, aoFechar }: Props) {
  const anoSelecionado = useStoreAno((s) => s.anoSelecionado);

  // data padrão: hoje se for do ano selecionado; senão, 1º de janeiro do ano
  // em foco (evita "plantão salvo mas invisível" por causa do filtro de ano)
  const [estado, setEstado] = useState<Estado>(() => {
    const base = paraEstado(registro);
    if (!registro && anoSelecionado && !base.data.startsWith(String(anoSelecionado))) {
      return { ...base, data: `${anoSelecionado}-01-01` };
    }
    return base;
  });
  const [erros, setErros] = useState<Partial<Record<keyof Estado, string>>>({});
  const [enviando, setEnviando] = useState(false);

  const salarioBrutoGlobal = useStoreLocal((s) => s.dados.config.salarioBruto);
  const setConfig = useStoreLocal((s) => s.setConfig);
  const adicionar = useStoreLocal((s) => s.adicionarHoraExtra);
  const editar = useStoreLocal((s) => s.editarHoraExtra);

  const [salarioTexto, setSalarioTexto] = useState(
    salarioBrutoGlobal > 0 ? String(Math.round(salarioBrutoGlobal * 100)) : '',
  );

  useEffect(() => {
    if (salarioBrutoGlobal > 0 && salarioTexto === '') {
      setSalarioTexto(String(Math.round(salarioBrutoGlobal * 100)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salarioBrutoGlobal]);

  const modoEdicao = !!registro;

  const alterar = (campo: keyof Estado, valor: string) => {
    setEstado((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  const alterarSalario = (digitos: string) => {
    setSalarioTexto(digitos);
    const centavos = Number(digitos || '0');
    const n = Math.round((Number.isFinite(centavos) && centavos >= 0 ? centavos / 100 : 0) * 100) / 100;
    setConfig({ salarioBruto: n });
  };

  // Reconstrói claramente o salário com base no que o usuário digitou agora
  const salarioBruto = salarioTexto.trim() === ''
    ? 0
    : Math.round((Number(salarioTexto || '0') / 100) * 100) / 100;

  // prévia de cálculo ao vivo
  const previa = calcularHoraExtra(estado, salarioBruto);

  const enviar = async () => {
    const novos: Partial<Record<keyof Estado, string>> = {};
    if (salarioBruto <= 0) {
      novos.data = 'Informe o salário bruto no campo acima.';
      setErros(novos);
      return;
    }
    if (!estado.data) novos.data = 'Informe a data.';
    if (!estado.chegada) novos.chegada = 'Informe a chegada.';
    if (!estado.saidaEmpresa) novos.saidaEmpresa = 'Informe a saída da empresa.';
    if (estado.almocoInicio && !estado.almocoFim) novos.almocoFim = 'Complete o fim do almoço.';
    if (!estado.almocoInicio && estado.almocoFim) novos.almocoInicio = 'Complete o início do almoço.';
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    const payload = {
      data: estado.data,
      chegada: estado.chegada,
      almocoInicio: estado.almocoInicio,
      almocoFim: estado.almocoFim,
      saidaEmpresa: estado.saidaEmpresa,
      fimPlantao: estado.fimPlantao,
      observacao: estado.observacao.trim(),
    };

    setEnviando(true);
    if (modoEdicao) editar(registro.id, payload);
    else adicionar(payload);
    setEnviando(false);
    aoFechar();
  };

  return (
    <Modal
      aberto
      titulo={modoEdicao ? 'Editar plantão' : 'Novo plantão (hora extra)'}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao onClick={aoFechar} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao variante="primario" carregando={enviando} onClick={() => void enviar()}>
            {modoEdicao ? 'Salvar' : 'Adicionar'}
          </Botao>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo
          rotulo="Salário bruto mensal (R$) *"
          className="sm:col-span-3"
          dica="Deste salário o app calcula o valor-hora, hora-extra (×2) e hora de plantão (×1,5). Fica salvo na nuvem."
        >
          <EntradaMoeda
            value={salarioTexto}
            onChange={alterarSalario}
            onBlur={() => undefined}
            placeholder="Ex.: 2830"
          />
          {salarioBruto <= 0 && (
            <span className="mt-1 block text-xs text-amber-400">
              Obrigatório para calcular os valores deste lançamento.
            </span>
          )}
        </Campo>

        <Campo rotulo="Data *" className="sm:col-span-3">
          <Entrada type="date" value={estado.data} onChange={(e) => alterar('data', e.target.value)} />
          {erros.data && <span className="mt-1 block text-xs text-rose-400">{erros.data}</span>}
        </Campo>

        <Campo rotulo="Chegada *">
          <Entrada type="time" value={estado.chegada} onChange={(e) => alterar('chegada', e.target.value)} />
          {erros.chegada && <span className="mt-1 block text-xs text-rose-400">{erros.chegada}</span>}
        </Campo>

        <Campo rotulo="Almoço início">
          <Entrada type="time" value={estado.almocoInicio} onChange={(e) => alterar('almocoInicio', e.target.value)} />
        </Campo>

        <Campo rotulo="Almoço fim">
          <Entrada type="time" value={estado.almocoFim} onChange={(e) => alterar('almocoFim', e.target.value)} />
          {erros.almocoFim && <span className="mt-1 block text-xs text-rose-400">{erros.almocoFim}</span>}
          {erros.almocoInicio && <span className="mt-1 block text-xs text-rose-400">{erros.almocoInicio}</span>}
        </Campo>

        <Campo rotulo="Saída da empresa *" dica="Fim do período a 100%">
          <Entrada type="time" value={estado.saidaEmpresa} onChange={(e) => alterar('saidaEmpresa', e.target.value)} />
          {erros.saidaEmpresa && <span className="mt-1 block text-xs text-rose-400">{erros.saidaEmpresa}</span>}
        </Campo>

        <Campo rotulo="Fim do plantão" dica="Opcional — período a 50%">
          <Entrada type="time" value={estado.fimPlantao} onChange={(e) => alterar('fimPlantao', e.target.value)} />
        </Campo>

        <Campo rotulo="Observação">
          <Entrada value={estado.observacao} onChange={(e) => alterar('observacao', e.target.value)} placeholder="Opcional" />
        </Campo>
      </div>

      {/* prévia do cálculo */}
      <div className="mt-3 grid gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Período 100%</p>
          <p className="text-lg font-semibold text-slate-100">{previa.horas100.toFixed(2)} h</p>
          <p className="text-sm text-emerald-300">{formatarMoeda(previa.valor100)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Período 50%</p>
          <p className="text-lg font-semibold text-slate-100">{previa.horas50.toFixed(2)} h</p>
          <p className="text-sm text-emerald-300">{formatarMoeda(previa.valor50)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Total do dia</p>
          <p className="text-lg font-semibold text-emerald-300">{formatarMoeda(previa.total)}</p>
          <p className="text-xs text-slate-500">Hora = {formatarMoeda(previa.valorHora)}</p>
        </div>
      </div>
    </Modal>
  );
}
