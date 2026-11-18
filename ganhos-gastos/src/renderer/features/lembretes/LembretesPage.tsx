/**
 * LEMBRETES — cadastrados no banco/Supabase. O que envia o aviso na data
 * é o requisito do usuário por e-mail + Google Agenda; aqui o app apenas
 * salva o lembrete e oferece um clique para ele ir para a Google Agenda
 * confirmar o evento (o aviso chega por lá, na data marcada).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarDays,
  CalendarPlus,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { DadosLembrete, Lembrete, StatusLembrete } from '@/types/api-types';
import { Botao } from '@/components/Botoes';
import { Campo, CLASSES_INPUT, Entrada } from '@/components/Campos';
import { AreaErro, Carregando, EstadoVazio } from '@/components/Estados';
import { Modal } from '@/components/Modal';
import { formatarData, hojeISO } from '@/lib/formatar';
import { linkGoogleAgenda } from '@/lib/google-agenda';
import { useStoreLembretes } from '@/store/storeLembretes';
import { usePedidoNovo } from '@/hooks/usePedidoNovo';

type FiltroStatus = 'TODOS' | StatusLembrete;

const FORM_VAZIO: DadosLembrete = {
  titulo: '',
  dataLembrete: '',
  email: '',
  whatsapp: '',
  mensagem: '',
};

const ESTILO_STATUS: Record<StatusLembrete, string> = {
  PENDENTE: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  ENVIADO: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  CANCELADO: 'bg-slate-700/30 text-slate-400 ring-slate-600/40',
};

const ROTULO_STATUS: Record<StatusLembrete, string> = {
  PENDENTE: 'Pendente',
  ENVIADO: 'Enviado',
  CANCELADO: 'Cancelado',
};

export function LembretesPage() {
  const lembretes = useStoreLembretes((s) => s.lembretes);
  const carregado = useStoreLembretes((s) => s.carregado);
  const carregando = useStoreLembretes((s) => s.carregando);
  const salvando = useStoreLembretes((s) => s.salvando);
  const erro = useStoreLembretes((s) => s.erro);
  const carregar = useStoreLembretes((s) => s.carregar);
  const adicionar = useStoreLembretes((s) => s.adicionar);
  const editar = useStoreLembretes((s) => s.editar);
  const marcarEnviado = useStoreLembretes((s) => s.marcarEnviado);
  const remover = useStoreLembretes((s) => s.remover);

  const [filtro, setFiltro] = useState<FiltroStatus>('TODOS');
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Lembrete | null>(null);
  const [form, setForm] = useState<DadosLembrete>({ ...FORM_VAZIO });
  const [erroForm, setErroForm] = useState('');

  // Primeira abertura: carrega (o store evita repetir em trocas de aba).
  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Ctrl+O → novo lembrete
  usePedidoNovo(() => abrirNovo());

  const listaFiltrada = useMemo(() => {
    if (filtro === 'TODOS') return lembretes;
    return lembretes.filter((l) => l.status === filtro);
  }, [lembretes, filtro]);

  const contagem = useMemo(() => {
    const pendentes = lembretes.filter((l) => l.status === 'PENDENTE').length;
    const enviados = lembretes.filter((l) => l.status === 'ENVIADO').length;
    return { pendentes, enviados };
  }, [lembretes]);

  function abrirNovo() {
    setEditando(null);
    setForm({ ...FORM_VAZIO });
    setErroForm('');
    setModalAberto(true);
  }

  function abrirEdicao(lembrete: Lembrete) {
    setEditando(lembrete);
    setForm({
      titulo: lembrete.titulo,
      dataLembrete: lembrete.dataLembrete,
      email: lembrete.email,
      whatsapp: lembrete.whatsapp,
      mensagem: lembrete.mensagem,
    });
    setErroForm('');
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.dataLembrete) {
      setErroForm('Informe a data do lembrete.');
      return;
    }
    if (!form.mensagem.trim()) {
      setErroForm('Escreva a mensagem do lembrete.');
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setErroForm('E-mail inválido.');
      return;
    }

    const dados: DadosLembrete = {
      titulo: form.titulo.trim() || 'Lembrete',
      dataLembrete: form.dataLembrete,
      email: form.email.trim(),
      whatsapp: form.whatsapp.trim(),
      mensagem: form.mensagem.trim(),
    };

    const ok = editando ? await editar(editando.id, dados) : await adicionar(dados);
    if (!ok) {
      // erro já foi mostrado em toast pelo store
      return;
    }

    // Lembretes: só em criação — abre direto a Google Agenda com o evento preenchido.
    if (!editando) {
      window.open(linkGoogleAgenda(dados), '_blank', 'noopener,noreferrer');
    }
    setModalAberto(false);
  }

  async function excluir(lembrete: Lembrete) {
    const confirmou = window.confirm(
      `Excluir o lembrete "${lembrete.titulo}"? O evento da agenda também será removido.`,
    );
    if (confirmou) await remover(lembrete.id);
  }

  return (
    <div className="space-y-5">
      {/* ---------- cabeçalho ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-200">
            <BellRing className="h-5 w-5 text-amber-400" />
            Lembretes
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Crie o lembrete aqui; na hora de criar ele abre a <strong>Google Agenda</strong> com o
            evento já preenchido — você só clica <em>Salvar</em> e o Google te avisa na data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Botao
            icone={RefreshCw}
            variante="secundario"
            onClick={() => void carregar(true)}
            carregando={carregando}
            title="Buscar novamente na planilha"
          >
            Atualizar
          </Botao>
          <Botao icone={Plus} variante="primario" onClick={abrirNovo}>
            Novo lembrete
          </Botao>
        </div>
      </div>

      {/* ---------- como funciona ---------- */}
      <section className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-200/90">
        <p className="font-semibold text-amber-200">Como funciona</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>
            Você cria o lembrete aqui → o app abre a <strong>Google Agenda</strong> com o evento já
            preenchido → você clica <strong>Salvar</strong> (uma vez).
          </li>
          <li>
            Ao abrir a Google Agenda — tanto na criação quanto pelo botão <strong>Agenda</strong> do
            cartão — o lembrete é marcado como <strong>Enviado</strong>. Sem abrir a agenda, ele
            fica como <strong>Pendente</strong>.
          </li>
          <li>
            O Google envia o aviso na data marcada (e-mail + notificação no celular). O site não
            envia e-mail — a própria Google Agenda faz isso de graça.
          </li>
          <li>
            O WhatsApp fica salvo para uso futuro; hoje não enviamos mensagens.
          </li>
        </ol>
      </section>

      {/* ---------- filtros ---------- */}
      <div className="flex flex-wrap items-center gap-2">
        {(['TODOS', 'PENDENTE', 'ENVIADO', 'CANCELADO'] as FiltroStatus[]).map((valor) => {
          const ativo = filtro === valor;
          const rotulo =
            valor === 'TODOS'
              ? `Todos (${lembretes.length})`
              : valor === 'PENDENTE'
                ? `Pendentes (${contagem.pendentes})`
                : valor === 'ENVIADO'
                  ? `Enviados (${contagem.enviados})`
                  : 'Cancelados';
          return (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltro(valor)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                ativo
                  ? 'bg-sky-600/20 text-sky-200 ring-1 ring-inset ring-sky-500/50'
                  : 'bg-slate-900 text-slate-400 ring-1 ring-inset ring-slate-800 hover:text-slate-200'
              }`}
            >
              {rotulo}
            </button>
          );
        })}
      </div>

      {/* ---------- conteúdo ---------- */}
      {!carregado && carregando ? (
        <Carregando texto="Carregando lembretes…" />
      ) : erro && !carregado ? (
        <AreaErro mensagem={erro} aoTentar={() => void carregar(true)} />
      ) : lembretes.length === 0 ? (
        <EstadoVazio
          icone={BellRing}
          titulo="Nenhum lembrete cadastrado"
          descricao="Ao criar o lembrete, ele abre o Google Agenda já preenchido — você clica Salvar lá e o Google avisa na data."
          acao={
            <Botao icone={Plus} variante="primario" onClick={abrirNovo}>
              Criar primeiro lembrete
            </Botao>
          }
        />
      ) : listaFiltrada.length === 0 ? (
        <EstadoVazio
          icone={BellRing}
          titulo="Nenhum lembrete neste filtro"
          descricao="Troque o filtro para ver os demais lembretes."
        />
      ) : (
        <ul className="space-y-3">
          {listaFiltrada.map((lembrete) => (
            <li
              key={lembrete.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-slate-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-100">
                      {lembrete.titulo || 'Lembrete'}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${ESTILO_STATUS[lembrete.status]}`}
                    >
                      {ROTULO_STATUS[lembrete.status]}
                    </span>
                  </div>

                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatarData(lembrete.dataLembrete)}
                    </span>
                    {lembrete.email && (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {lembrete.email}
                      </span>
                    )}
                    {lembrete.whatsapp && (
                      <span className="inline-flex items-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {lembrete.whatsapp}
                        <span className="text-[10px] uppercase tracking-wide text-slate-600">
                          (não envia)
                        </span>
                      </span>
                    )}
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                    {lembrete.mensagem}
                  </p>

                  {lembrete.erro && (
                    <p className="mt-2 text-xs text-rose-300">Erro no último envio: {lembrete.erro}</p>
                  )}
                  {lembrete.enviadoEm && (
                    <p className="mt-1 text-xs text-slate-600">
                      Enviado em {formatarData(lembrete.enviadoEm.slice(0, 10))}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Botao
                    icone={CalendarPlus}
                    variante="fantasma"
                    tamanho="sm"
                    onClick={() => {
                      // clicou em Agenda: considera agendado → Enviado
                      void marcarEnviado(lembrete.id);
                      window.open(linkGoogleAgenda(lembrete), '_blank', 'noopener,noreferrer');
                    }}
                    title="Adicionar ao Google Agenda (marca como Enviado)"
                  >
                    Agenda
                  </Botao>
                  <Botao
                    icone={Pencil}
                    variante="fantasma"
                    tamanho="sm"
                    onClick={() => abrirEdicao(lembrete)}
                    title="Editar"
                  />
                  <Botao
                    icone={Trash2}
                    variante="fantasma"
                    tamanho="sm"
                    onClick={() => void excluir(lembrete)}
                    disabled={salvando}
                    title="Excluir"
                    className="text-rose-300 hover:bg-rose-950/50 hover:text-rose-200"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ---------- modal de criação/edição ---------- */}
      <Modal
        aberto={modalAberto}
        titulo={editando ? 'Editar lembrete' : 'Novo lembrete'}
        aoFechar={() => setModalAberto(false)}
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setModalAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              onClick={() => void salvar()}
              carregando={salvando}
            >
              {editando ? 'Salvar alterações' : 'Criar lembrete'}
            </Botao>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void salvar();
          }}
        >
          <Campo rotulo="Título">
            <Entrada
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex.: Pagar boleto do carro"
              maxLength={120}
            />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Data atual" dica="Preenchida automaticamente pelo seu computador.">
              <Entrada type="date" value={hojeISO()} readOnly disabled />
            </Campo>
            <Campo rotulo="Data lembrete">
              <Entrada
                type="date"
                value={form.dataLembrete}
                onChange={(e) => setForm({ ...form, dataLembrete: e.target.value })}
                required
              />
            </Campo>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="E-mail" dica="O lembrete será enviado para este e-mail.">
              <Entrada
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="voce@exemplo.com"
              />
            </Campo>
            <Campo rotulo="WhatsApp" dica="Guardado para uso futuro; ainda não envia mensagens.">
              <Entrada
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </Campo>
          </div>

          <Campo rotulo="Mensagem">
            <textarea
              value={form.mensagem}
              onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
              placeholder="Escreva o que deve ser lembrado…"
              rows={4}
              maxLength={2000}
              required
              className={`${CLASSES_INPUT} min-h-[96px] resize-y`}
            />
          </Campo>

          {erroForm && <p className="text-sm text-rose-300">{erroForm}</p>}
        </form>
      </Modal>
    </div>
  );
}
