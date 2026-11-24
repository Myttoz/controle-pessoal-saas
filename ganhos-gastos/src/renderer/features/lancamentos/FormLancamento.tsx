import { useMemo, useState } from 'react';
import type { LancamentoMensal, Registro } from '@/types/api-types';
import { Botao } from '@/components/Botoes';
import { Campo, EntradaMoeda, Entrada, EntradaSugestoes, Selecao } from '@/components/Campos';
import { Modal } from '@/components/Modal';
import { AnexosCampo } from '@/components/AnexosCampo';
import { useOpcoes } from '@/hooks/useOpcoes';
import { hojeISO } from '@/lib/calculos';
import { useStoreAno } from '@/store/storeAno';

interface EstadoForm {
  categoria: string;
  valor: string;
  descricao: string;
  forma: string;
  tipo: string;
  quem: string;
  data: string;
  observacao: string;
  modoRepeticao: 'nenhum' | 'recorrente' | 'parcela';
  quantidadeRepeticao: string;
}

type Erros = Partial<Record<keyof EstadoForm, string>>;

function paraEstado(dados?: LancamentoMensal): EstadoForm {
  return {
    categoria: dados?.CATEGORIA ?? '',
    valor: dados ? String(Math.round((dados.VALOR ?? 0) * 100)) : '',
    descricao: dados?.DESCRIÇÃO ?? '',
    forma: dados?.['FORMA DE PGTO'] ?? '',
    tipo: dados?.TIPO ?? '',
    quem: dados?.['QUEM PAGA'] ?? '',
    data: dados?.DATA ?? hojeISO(),
    observacao: dados?.OBSERVAÇÃO ?? '',
    modoRepeticao: 'nenhum',
    quantidadeRepeticao: '2',
  };
}

function validar(estado: EstadoForm): Erros {
  const erros: Erros = {};
  if (!estado.categoria) erros.categoria = 'Selecione a categoria.';
  const centavos = Number(String(estado.valor ?? '').replace(/\D/g, '') || '0');
  if (!estado.valor) erros.valor = 'Informe o valor.';
  else if (centavos <= 0) erros.valor = 'O valor deve ser maior que zero.';
  if (!estado.descricao.trim()) erros.descricao = 'Informe a descrição.';
  if (!estado.forma) erros.forma = 'Selecione a forma de pagamento.';
  if (!estado.tipo) erros.tipo = 'Selecione o tipo.';
  if (!estado.quem) erros.quem = 'Selecione quem paga.';
  if (estado.modoRepeticao !== 'nenhum') {
    const qtd = parseInt(estado.quantidadeRepeticao, 10);
    if (!Number.isFinite(qtd) || qtd < 2 || qtd > 60) {
      erros.quantidadeRepeticao = 'Informe um número entre 2 e 60.';
    }
  }
  return erros;
}

interface Props {
  /** Aba mensal exata ("JAN 27"). */
  aba: string;
  /** Presente = modo edição; ausente = modo novo. */
  registro?: Registro<LancamentoMensal> | null;
  /** Sugestões de autocomplete (ano inteiro). */
  sugestoesDescricao: string[];
  sugestoesObservacao: string[];
  aoFechar: () => void;
}

export function FormLancamento({
  aba,
  registro,
  sugestoesDescricao,
  sugestoesObservacao,
  aoFechar,
}: Props) {
  const [estado, setEstado] = useState<EstadoForm>(() => paraEstado(registro?.dados));
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);

  const adicionarLancamento = useStoreAno((s) => s.adicionarLancamento);
  const editarLancamento = useStoreAno((s) => s.editarLancamento);
  const ano = useStoreAno((s) => s.anoSelecionado);
  const snapshot = useStoreAno((s) => (ano != null ? s.snapshots[ano] : undefined));

  const opcoesCategoria = useOpcoes('CATEGORIA');
  const opcoesForma = useOpcoes('FORMA DE PGTO');
  const opcoesTipo = useOpcoes('TIPO');
  const opcoesQuem = useOpcoes('QUEM PAGA');

  const modoEdicao = !!registro;

  const sugestaoRecorrente = useMemo(() => {
    if (modoEdicao || estado.modoRepeticao !== 'nenhum') return null;
    const desc = estado.descricao.trim().toLowerCase();
    const val = Number(String(estado.valor ?? '').replace(/\D/g, '') || '0') / 100;
    if (!desc || val <= 0 || !snapshot) return null;
    let mesesEncontrados = 0;
    for (const mes of Object.values(snapshot.meses)) {
      if (!mes) continue;
      if (
        mes.registros.some(
          (r) =>
            r.dados.DESCRIÇÃO.trim().toLowerCase() === desc &&
            Math.abs((Number(r.dados.VALOR) || 0) - val) < 0.01,
        )
      ) {
        mesesEncontrados++;
      }
    }
    return mesesEncontrados >= 2 ? mesesEncontrados : null;
  }, [modoEdicao, estado.modoRepeticao, estado.descricao, estado.valor, snapshot]);

  const alterar = (campo: keyof EstadoForm, valor: string) => {
    setEstado((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  const enviar = async () => {
    const validacao = validar(estado);
    setErros(validacao);
    if (Object.keys(validacao).length > 0 || ano == null) return;
    if (modoEdicao && registro === null) return;

    const dados: LancamentoMensal = {
      CATEGORIA: estado.categoria as LancamentoMensal['CATEGORIA'],
      VALOR: Number(String(estado.valor ?? '').replace(/\D/g, '') || '0') / 100,
      DESCRIÇÃO: estado.descricao.trim(),
      'FORMA DE PGTO': estado.forma as LancamentoMensal['FORMA DE PGTO'],
      TIPO: estado.tipo as LancamentoMensal['TIPO'],
      'QUEM PAGA': estado.quem as LancamentoMensal['QUEM PAGA'],
      DATA: estado.data,
      OBSERVAÇÃO: estado.observacao.trim(),
    };

    const lote =
      !modoEdicao && estado.modoRepeticao !== 'nenhum'
        ? { tipo: estado.modoRepeticao, total: parseInt(estado.quantidadeRepeticao, 10) }
        : undefined;

    setEnviando(true);
    const ok =
      registro !== null && registro !== undefined
        ? await editarLancamento(ano, aba, registro.linha, dados)
        : await adicionarLancamento(ano, aba, dados, lote);
    setEnviando(false);

    if (ok) aoFechar();
  };

  return (
    <Modal
      aberto
      titulo={modoEdicao ? `Editar lançamento · ${aba}` : `Novo lançamento · ${aba}`}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao onClick={aoFechar} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao variante="primario" carregando={enviando} onClick={() => void enviar()}>
            {modoEdicao ? 'Salvar alterações' : 'Adicionar'}
          </Botao>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Categoria *">
          <Selecao
            value={estado.categoria}
            onChange={(e) => alterar('categoria', e.target.value)}
          >
            <option value="">Selecione…</option>
            {opcoesCategoria.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </Selecao>
          {erros.categoria && <span className="mt-1 block text-xs text-rose-400">{erros.categoria}</span>}
        </Campo>

        <Campo rotulo="Valor * (R$)">
          <EntradaMoeda
            value={estado.valor}
            onChange={(digitos) => alterar('valor', digitos)}
            autoFocus
          />
          {erros.valor && <span className="mt-1 block text-xs text-rose-400">{erros.valor}</span>}
        </Campo>

        <Campo rotulo="Descrição *" className="sm:col-span-2">
          <EntradaSugestoes
            value={estado.descricao}
            onChange={(v) => alterar('descricao', v)}
            sugestoes={sugestoesDescricao}
            placeholder="Ex.: Conta de energia"
          />
          {erros.descricao && (
            <span className="mt-1 block text-xs text-rose-400">{erros.descricao}</span>
          )}
        </Campo>

        <Campo rotulo="Forma de pgto *">
          <Selecao value={estado.forma} onChange={(e) => alterar('forma', e.target.value)}>
            <option value="">Selecione…</option>
            {opcoesForma.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </Selecao>
          {erros.forma && <span className="mt-1 block text-xs text-rose-400">{erros.forma}</span>}
        </Campo>

        <Campo rotulo="Tipo *">
          <Selecao value={estado.tipo} onChange={(e) => alterar('tipo', e.target.value)}>
            <option value="">Selecione…</option>
            {opcoesTipo.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </Selecao>
          {erros.tipo && <span className="mt-1 block text-xs text-rose-400">{erros.tipo}</span>}
        </Campo>

        <Campo rotulo="Quem paga *">
          <Selecao value={estado.quem} onChange={(e) => alterar('quem', e.target.value)}>
            <option value="">Selecione…</option>
            {opcoesQuem.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </Selecao>
          {erros.quem && <span className="mt-1 block text-xs text-rose-400">{erros.quem}</span>}
        </Campo>

        <Campo rotulo="Data" dica="Opcional — formato AAAA-MM-DD">
          <Entrada type="date" value={estado.data} onChange={(e) => alterar('data', e.target.value)} />
        </Campo>

        <Campo rotulo="Observação" className="sm:col-span-2">
          <EntradaSugestoes
            value={estado.observacao}
            onChange={(v) => alterar('observacao', v)}
            sugestoes={sugestoesObservacao}
            placeholder="Opcional"
          />
        </Campo>

        {!modoEdicao && (
          <div className="sm:col-span-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Repetição (opcional)
            </p>
            {sugestaoRecorrente && (
              <div className="mb-3 rounded-md border border-sky-900/60 bg-sky-950/20 px-3 py-2 text-[11px] text-sky-200">
                Possível recorrente detectado ({sugestaoRecorrente} meses com mesma descrição/valor).{' '}
                <button
                  type="button"
                  className="font-semibold underline underline-offset-2 hover:text-sky-100"
                  onClick={() => alterar('modoRepeticao', 'recorrente')}
                >
                  Marcar como recorrente
                </button>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Tipo de repetição">
                <Selecao
                  value={estado.modoRepeticao}
                  onChange={(e) => alterar('modoRepeticao', e.target.value)}
                >
                  <option value="nenhum">Não repetir</option>
                  <option value="recorrente">Recorrente (fixo mensal)</option>
                  <option value="parcela">Parcelado (1/N)</option>
                </Selecao>
              </Campo>
              {estado.modoRepeticao !== 'nenhum' && (
                <Campo
                  rotulo={estado.modoRepeticao === 'parcela' ? 'Quantidade de parcelas' : 'Quantidade de meses'}
                  dica={estado.modoRepeticao === 'parcela' ? 'Ex.: 10 cria 1/10 até 10/10' : 'Ex.: 12 cria os próximos 12 meses'}
                >
                  <Entrada
                    type="number"
                    min={2}
                    max={60}
                    value={estado.quantidadeRepeticao}
                    onChange={(e) => alterar('quantidadeRepeticao', e.target.value)}
                  />
                  {erros.quantidadeRepeticao && (
                    <span className="mt-1 block text-xs text-rose-400">{erros.quantidadeRepeticao}</span>
                  )}
                </Campo>
              )}
            </div>
            {estado.modoRepeticao !== 'nenhum' && (
              <p className="mt-2 text-[11px] text-slate-500">
                Serão criados {parseInt(estado.quantidadeRepeticao, 10) || 0} lançamentos vinculados, um por mês.
                {estado.modoRepeticao === 'parcela' ? ' A observação receberá a numeração 1/N, 2/N...' : ''}
              </p>
            )}
          </div>
        )}

        {modoEdicao && registro?.linha != null && (
          <div className="sm:col-span-2">
            <AnexosCampo entidadeTipo="lancamento" entidadeId={String(registro.linha)} />
          </div>
        )}
      </div>
    </Modal>
  );
}
