/**
 * LEMBRETES FIXOS (recorrências manuais) — ex.: "Backup da pasta do
 * projeto (Drive)", a cada 15 dias.
 *
 * - Fixado no topo dos Lembretes (borda âmbar chamativa) com o id de cada
 *   disparo agendado: última conclusão e próximo vencimento.
 * - Quando o lembrete fixo vence, o hook `useLembretesFixosAlerta` dispara
 *   um aviso chamativo 3x ao dia (09h, 16h e 20h) até o usuário concluir.
 */
import { useState } from 'react';
import { BellRing, Check, Plus, Trash2 } from 'lucide-react';
import type { LembreteFixo } from '@/types/dados-locais';
import { Botao } from '@/components/Botoes';
import { Campo, Entrada, Selecao } from '@/components/Campos';
import { Modal } from '@/components/Modal';
import { addDias } from '@/lib/calculos';
import { formatarData, hojeISO } from '@/lib/formatar';
import { useStoreLocal } from '@/store/storeLocal';

const INTERVALOS = [
  { valor: 7, rotulo: 'A cada 7 dias' },
  { valor: 15, rotulo: 'A cada 15 dias' },
  { valor: 30, rotulo: 'A cada 30 dias' },
  { valor: 60, rotulo: 'A cada 60 dias' },
  { valor: 90, rotulo: 'A cada 90 dias' },
];

function proximo(l: LembreteFixo): string {
  const base = l.ultimaConclusao ?? '2000-01-01';
  return addDias(base, l.intervaloDias);
}

export function RecorrentesLembretes() {
  const lembretes = useStoreLocal((s) => s.dados.config.lembretesFixos ?? []);
  const adicionar = useStoreLocal((s) => s.adicionarLembreteFixo);
  const concluir = useStoreLocal((s) => s.concluirLembreteFixo);
  const remover = useStoreLocal((s) => s.removerLembreteFixo);

  const [modalAberto, setModalAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [intervalo, setIntervalo] = useState(15);

  const hoje = hojeISO();

  const salvar = () => {
    const t = titulo.trim();
    if (!t) return;
    adicionar({
      titulo: t,
      intervaloDias: intervalo,
      ultimaConclusao: hoje,
    });
    setTitulo('');
    setIntervalo(15);
    setModalAberto(false);
  };

  return (
    <section className="rounded-xl border border-amber-800/50 bg-amber-950/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-300">
          <BellRing className="h-4 w-4" />
          Lembretes fixos
        </h3>
        <Botao
          variante="secundario"
          tamanho="sm"
          icone={Plus}
          onClick={() => setModalAberto(true)}
        >
          Novo lembrete fixo
        </Botao>
      </div>

      {lembretes.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-amber-200/70">
          Nenhum lembrete fixo cadastrado. Ex.: "Backup da pasta do projeto (Drive)" a cada 15 dias
          — ao vencer, um aviso aparece 3x ao dia (09h, 16h e 20h) até você concluir.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {lembretes.map((l) => {
            const ultima = l.ultimaConclusao;
            const prox = proximo(l);
            const vencido = hoje >= prox;
            return (
              <li
                key={l.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                  vencido
                    ? 'border-rose-700/60 bg-rose-950/20'
                    : 'border-amber-800/40 bg-amber-950/10'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-semibold ${
                      vencido ? 'text-rose-200' : 'text-amber-200'
                    }`}
                    title={l.titulo}
                  >
                    {l.titulo}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-amber-200/70">
                    a cada {l.intervaloDias} dias
                    {' · '}última: {ultima ? formatarData(ultima) : 'nunca'}
                    {' · '}próxima: {formatarData(prox)}
                    {vencido && (
                      <span className="ml-1.5 font-semibold text-rose-300">VENCIDO</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Botao
                    variante="primario"
                    tamanho="sm"
                    icone={Check}
                    onClick={() => concluir(l.id)}
                    title="Marcar como concluído hoje — o contador de 15 dias recomeça"
                  >
                    Concluir hoje
                  </Botao>
                  <Botao
                    variante="fantasma"
                    tamanho="sm"
                    icone={Trash2}
                    onClick={() => remover(l.id)}
                    title="Remover este lembrete fixo"
                    className="text-rose-300 hover:bg-rose-950/40 hover:text-rose-200"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* modal novo lembrete fixo */}
      <Modal
        aberto={modalAberto}
        titulo="Novo lembrete fixo"
        aoFechar={() => setModalAberto(false)}
        largura="max-w-md"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setModalAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={salvar} disabled={!titulo.trim()}>
              Criar lembrete fixo
            </Botao>
          </>
        }
      >
        <div className="space-y-4">
          <Campo rotulo="O que precisa ser feito*">
            <Entrada
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') salvar();
              }}
              placeholder='Ex.: Backup da pasta do projeto (Drive)'
              maxLength={160}
            />
          </Campo>
          <Campo rotulo="Repetir">
            <Selecao value={intervalo} onChange={(e) => setIntervalo(Number(e.target.value))}>
              {INTERVALOS.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </Selecao>
          </Campo>
          <p className="text-xs leading-relaxed text-slate-500">
            O aviso dispara no dia em que o lembrete vence, às <strong>09h</strong>,{' '}
            <strong>16h</strong> e <strong>20h</strong> (borda âmbar, com botão para fechar; some
            sozinho em 5s). Enquanto não concluir, repete todo dia.
          </p>
        </div>
      </Modal>
    </section>
  );
}
