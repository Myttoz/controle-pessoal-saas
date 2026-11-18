import { useState } from 'react';
import type { LinhaExtra, Registro, SiglaMes } from '@/types/api-types';
import { SIGLAS } from '@/lib/meses';
import { Botao } from '@/components/Botoes';
import { Campo, Entrada, EntradaMoeda } from '@/components/Campos';
import { Modal } from '@/components/Modal';
import { arredondar2, formatarMoeda } from '@/lib/formatar';
import { useOpcoes } from '@/hooks/useOpcoes';
import { useStoreAno } from '@/store/storeAno';

interface EstadoForm {
  data: string;
  cliente: string;
  servico: string;
  categoria: string;
  despesasCliente: string;
  ganhosPecas: string;
  ganhosServicos: string;
  minhasDespesas: string;
}

/** Linha de serviço legada: só tinha VALOR — o valor vira "Ganhos serviços". */
const ehLegado = (d: LinhaExtra): boolean =>
  d.GANHOS_PECAS === undefined &&
  d.GANHOS_SERVICOS === undefined &&
  d.MINHAS_DESPESAS === undefined &&
  d.DESPESAS_CLIENTE === undefined &&
  d.CLIENTE === undefined;

function paraEstado(dados?: LinhaExtra): EstadoForm {
  const legado = dados ? ehLegado(dados) : false;
  return {
    data: dados?.DATA ?? '',
    cliente: dados?.CLIENTE ?? '',
    servico: dados?.DESCRIÇÃO ?? '',
    categoria: dados?.CATEGORIA ?? '',
    despesasCliente:
      dados && !legado && dados.DESPESAS_CLIENTE != null
        ? String(Math.round(dados.DESPESAS_CLIENTE * 100))
        : '',
    ganhosPecas:
      dados && !legado && dados.GANHOS_PECAS != null
        ? String(Math.round(dados.GANHOS_PECAS * 100))
        : '',
    ganhosServicos: legado
      ? dados
        ? String(Math.round((dados.VALOR ?? 0) * 100))
        : ''
      : dados && dados.GANHOS_SERVICOS != null
        ? String(Math.round(dados.GANHOS_SERVICOS * 100))
        : '',
    minhasDespesas:
      dados && !legado && dados.MINHAS_DESPESAS != null
        ? String(Math.round(dados.MINHAS_DESPESAS * 100))
        : '',
  };
}

const centavos = (v: string): number => Number(String(v ?? '').replace(/\D/g, '') || '0');
/** Células monetárias: string em centavos → número em reais. */
const reais = (centavosStr: string): number => arredondar2(centavos(centavosStr) / 100);

/**
 * Formulário de SERVIÇO (aba Recebidos → Extras → Serviços).
 *
 * Valor total = Ganhos peças + Ganhos serviços − Minhas despesas.
 * "Despesas cliente" é informativo (compra a pedido do cliente, paga por ele):
 * aparece na lista, mas NÃO entra no total nem no cálculo do FREELANCE.
 * O MÊS é derivado da DATA — o FREELANCE da aba Salário soma estes totais
 * por mês (sempre tipo "ganho").
 */
export function FormServico({
  registro,
  aoFechar,
}: {
  registro?: Registro<LinhaExtra> | null;
  aoFechar: () => void;
}) {
  const [estado, setEstado] = useState<EstadoForm>(() => paraEstado(registro?.dados));
  const [erros, setErros] = useState<Partial<Record<keyof EstadoForm, string>>>({});
  const [enviando, setEnviando] = useState(false);

  const adicionarExtra = useStoreAno((s) => s.adicionarExtra);
  const editarExtra = useStoreAno((s) => s.editarExtra);
  const ano = useStoreAno((s) => s.anoSelecionado);

  const opcoesCategoria = useOpcoes('CATEGORIA');

  const alterar = (campo: keyof EstadoForm, valor: string) => {
    setEstado((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  const total = arredondar2(
    reais(estado.ganhosPecas) + reais(estado.ganhosServicos) - reais(estado.minhasDespesas),
  );

  const enviar = async () => {
    const novosErros: Partial<Record<keyof EstadoForm, string>> = {};
    if (!estado.data) novosErros.data = 'Informe a data.';
    if (!estado.servico.trim()) novosErros.servico = 'Informe o serviço realizado.';
    if (reais(estado.ganhosPecas) + reais(estado.ganhosServicos) <= 0) {
      novosErros.ganhosServicos = 'Informe ao menos um ganho (peças ou serviços).';
    }

    setErros(novosErros);
    if (Object.keys(novosErros).length > 0 || ano == null) return;

    const mesNum = Number(estado.data.slice(5, 7));
    const siglame = Number.isFinite(mesNum) ? SIGLAS[mesNum - 1] : undefined;

    const dados: LinhaExtra = {
      'MÊS': (siglame ?? 'JAN') as SiglaMes,
      CATEGORIA: estado.categoria.trim(),
      DESCRIÇÃO: estado.servico.trim(),
      VALOR: total,
      DATA: estado.data,
      CLIENTE: estado.cliente.trim(),
      DESPESAS_CLIENTE: reais(estado.despesasCliente),
      GANHOS_PECAS: reais(estado.ganhosPecas),
      GANHOS_SERVICOS: reais(estado.ganhosServicos),
      MINHAS_DESPESAS: reais(estado.minhasDespesas),
    };

    setEnviando(true);
    const ok =
      registro != null
        ? await editarExtra(ano, 'ganhos', registro.linha, dados)
        : await adicionarExtra(ano, 'ganhos', dados);
    setEnviando(false);
    if (ok) aoFechar();
  };

  return (
    <Modal
      aberto
      titulo={registro ? 'Editar serviço' : 'Novo serviço extra'}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao onClick={aoFechar} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao variante="primario" carregando={enviando} onClick={() => void enviar()}>
            {registro ? 'Salvar' : 'Lançar serviço'}
          </Botao>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Data *">
          <Entrada
            type="date"
            value={estado.data}
            onChange={(e) => alterar('data', e.target.value)}
          />
          {erros.data && <span className="mt-1 block text-xs text-rose-400">{erros.data}</span>}
        </Campo>

        <Campo rotulo="Cliente">
          <Entrada
            value={estado.cliente}
            onChange={(e) => alterar('cliente', e.target.value)}
            placeholder="Ex.: João (DeliveryTech)"
          />
        </Campo>

        <Campo rotulo="Serviço realizado *" className="sm:col-span-2">
          <Entrada
            value={estado.servico}
            onChange={(e) => alterar('servico', e.target.value)}
            placeholder="Ex.: Troca de tela do notebook + limpeza"
            autoFocus
          />
          {erros.servico && <span className="mt-1 block text-xs text-rose-400">{erros.servico}</span>}
        </Campo>

        <Campo rotulo="Categoria">
          <Entrada
            value={estado.categoria}
            onChange={(e) => alterar('categoria', e.target.value)}
            list="servico-categorias"
            placeholder="Opcional"
          />
          <datalist id="servico-categorias">
            {opcoesCategoria.map((op) => (
              <option key={op} value={op} />
            ))}
          </datalist>
        </Campo>

        <Campo
          rotulo="Despesas do cliente (R$)"
          dica="Informativo — compra a pedido do cliente (ele paga). NÃO entra no total."
        >
          <EntradaMoeda
            value={estado.despesasCliente}
            onChange={(digitos) => alterar('despesasCliente', digitos)}
          />
        </Campo>

        <Campo rotulo="Ganhos peças (R$)" dica="Venda de peças/produtos para o cliente.">
          <EntradaMoeda
            value={estado.ganhosPecas}
            onChange={(digitos) => alterar('ganhosPecas', digitos)}
          />
        </Campo>

        <Campo rotulo="Ganhos serviços (R$)" dica="O que você ganha pelo serviço.">
          <EntradaMoeda
            value={estado.ganhosServicos}
            onChange={(digitos) => alterar('ganhosServicos', digitos)}
          />
          {erros.ganhosServicos && (
            <span className="mt-1 block text-xs text-rose-400">{erros.ganhosServicos}</span>
          )}
        </Campo>

        <Campo rotulo="Minhas despesas (R$)" dica="Gastos seus para realizar o serviço.">
          <EntradaMoeda
            value={estado.minhasDespesas}
            onChange={(digitos) => alterar('minhasDespesas', digitos)}
          />
        </Campo>

        <div className="flex flex-col justify-end rounded-xl border border-emerald-900/60 bg-emerald-950/20 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
            Valor total (entra no FREELANCE)
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-300">
            {formatarMoeda(total)}
          </p>
          <p className="text-[10px] text-slate-600">
            peças + serviços − minhas despesas
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        O mês do lançamento é derivado da <strong>data</strong> — o FREELANCE da aba{' '}
        <strong>Recebidos → Salário</strong> soma estes totais por mês automaticamente.
        A coluna "Despesas do cliente" é só registro e nunca entra nos cálculos.
      </p>
    </Modal>
  );
}
