/**
 * Store dos LEMBRETES (aba LEMBRETES da planilha).
 *
 * - Carrega uma vez e mantém em memória: trocar de aba não dispara requisição.
 * - Escritas vão para a planilha via API e atualizam a lista local.
 * - O envio (e-mail + Google Agenda) é feito pelo gatilho diário do Apps
 *   Script, mesmo com o app fechado.
 */
import { create } from 'zustand';
import type {
  DadosLembrete,
  Lembrete,
  StatusLembretes,
} from '@/types/api-types';
import { msgDeErro, servicoApi } from '@/services/api';
import { useStoreUI } from './storeUI';

interface EstadoLembretes {
  lembretes: Lembrete[];
  status: StatusLembretes | null;
  carregado: boolean;
  carregando: boolean;
  salvando: boolean;
  erro: string;

  /** Carrega lista + status. `forcar` ignora o cache em memória. */
  carregar(forcar?: boolean): Promise<void>;
  adicionar(dados: DadosLembrete): Promise<boolean>;
  editar(id: string, dados: DadosLembrete): Promise<boolean>;
  /** Marca o lembrete como ENVIADO (usado ao abrir/clicar na Google Agenda). */
  marcarEnviado(id: string): Promise<void>;
  remover(id: string): Promise<boolean>;
  testar(id: string): Promise<boolean>;
  instalarGatilho(): Promise<boolean>;
  limparErro(): void;
}

function toast(tipo: 'sucesso' | 'erro' | 'info', texto: string): void {
  useStoreUI.getState().toast(tipo, texto);
}

function ordenar(lista: Lembrete[]): Lembrete[] {
  return [...lista].sort((a, b) => {
    if (a.dataLembrete !== b.dataLembrete) return a.dataLembrete.localeCompare(b.dataLembrete);
    return a.titulo.localeCompare(b.titulo, 'pt-BR');
  });
}

export const useStoreLembretes = create<EstadoLembretes>((set, get) => ({
  lembretes: [],
  status: null,
  carregado: false,
  carregando: false,
  salvando: false,
  erro: '',

  carregar: async (forcar = false) => {
    if (get().carregando) return;
    if (get().carregado && !forcar) return;

    set({ carregando: true, erro: '' });
    try {
      // Lista e status em paralelo; se o status falhar, a lista ainda aparece.
      const [lista, status] = await Promise.allSettled([
        servicoApi.getLembretes(),
        servicoApi.getStatusLembretes(),
      ]);

      if (lista.status === 'rejected') throw lista.reason;

      set({
        lembretes: ordenar(lista.value.lembretes ?? []),
        status: status.status === 'fulfilled' ? status.value : get().status,
        carregado: true,
        carregando: false,
      });
    } catch (e) {
      const mensagem = msgDeErro(e);
      set({ carregando: false, erro: mensagem });
    }
  },

  adicionar: async (dados) => {
    set({ salvando: true });
    try {
      const resposta = await servicoApi.adicionarLembrete(dados);
      set({
        lembretes: ordenar([...get().lembretes, resposta.lembrete]),
        salvando: false,
      });
      toast('sucesso', 'Lembrete criado.');
      // A criação abre a Google Agenda automaticamente: o lembrete é
      // considerado agendado → já sai como Enviado.
      void get().marcarEnviado(resposta.lembrete.id);
      return true;
    } catch (e) {
      set({ salvando: false });
      toast('erro', msgDeErro(e));
      return false;
    }
  },

  marcarEnviado: async (id) => {
    const atual = get().lembretes.find((l) => l.id === id);
    if (!atual || atual.status === 'ENVIADO') return;
    const anterior = atual;
    // otimista: reflete na lista na hora
    set({
      lembretes: ordenar(
        get().lembretes.map((l) => (l.id === id ? { ...l, status: 'ENVIADO' as const } : l)),
      ),
    });
    try {
      const resposta = await servicoApi.editarLembrete(id, {
        titulo: atual.titulo,
        dataLembrete: atual.dataLembrete,
        email: atual.email,
        whatsapp: atual.whatsapp,
        mensagem: atual.mensagem,
        status: 'ENVIADO',
      });
      set({
        lembretes: ordenar(
          get().lembretes.map((l) => (l.id === id ? resposta.lembrete : l)),
        ),
      });
    } catch {
      // falhou: volta a ficar Pendente (o usuário ainda não agendou)
      set({ lembretes: ordenar(get().lembretes.map((l) => (l.id === id ? anterior : l))) });
      toast('erro', 'Não foi possível marcar o lembrete como Enviado.');
    }
  },

  editar: async (id, dados) => {
    set({ salvando: true });
    try {
      const resposta = await servicoApi.editarLembrete(id, dados);
      set({
        lembretes: ordenar(
          get().lembretes.map((l) => (l.id === id ? resposta.lembrete : l)),
        ),
        salvando: false,
      });
      toast('sucesso', 'Lembrete atualizado.');
      return true;
    } catch (e) {
      set({ salvando: false });
      toast('erro', msgDeErro(e));
      return false;
    }
  },

  remover: async (id) => {
    set({ salvando: true });
    try {
      await servicoApi.removerLembrete(id);
      set({
        lembretes: get().lembretes.filter((l) => l.id !== id),
        salvando: false,
      });
      toast('sucesso', 'Lembrete removido.');
      return true;
    } catch (e) {
      set({ salvando: false });
      toast('erro', msgDeErro(e));
      return false;
    }
  },

  testar: async (id) => {
    set({ salvando: true });
    try {
      const resposta = await servicoApi.testarLembrete(id);
      set({ salvando: false });
      toast('sucesso', resposta.mensagem || 'Teste enviado.');
      return true;
    } catch (e) {
      set({ salvando: false });
      toast('erro', msgDeErro(e));
      return false;
    }
  },

  instalarGatilho: async () => {
    set({ salvando: true });
    try {
      const resposta = await servicoApi.instalarLembretes();
      set({ salvando: false });
      toast('sucesso', resposta.mensagem || 'Envio automático ativado.');
      // Recarrega o status para refletir o gatilho ativo.
      void get().carregar(true);
      return true;
    } catch (e) {
      set({ salvando: false });
      toast('erro', msgDeErro(e));
      return false;
    }
  },

  limparErro: () => set({ erro: '' }),
}));
