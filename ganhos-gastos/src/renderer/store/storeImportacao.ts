/**
 * Store da IMPORTACIÓN CSV — mantém o estado da tela vivo ao trocar de aba,
 * para que o usuário possa ir em Lançamentos conferir e voltar sem perder
 * o arquivo, o mapeamento e as ações escolhidas.
 *
 * Nada aqui é persistido em disco (somente em memória, enquanto o app abre).
 */
import { create } from 'zustand';
import type { SiglaMes } from '@/types/api-types';
import type { AcaoImportacao } from '@/lib/importacaoCsv';

export type ColunaChave = 'data' | 'descricao' | 'valor' | 'hora' | 'observacao' | 'portador' | 'parcela';
export type Mapeamento = Record<ColunaChave, string>;
export type ModoImportacao = 'cartao' | 'pix';

export const MAP_VAZIO: Mapeamento = { data: '', descricao: '', valor: '', hora: '', observacao: '', portador: '', parcela: '' };

interface EstadoImportacao {
  nomeArquivo: string;
  textoBruto: string;
  delim: string;
  temCabecalho: boolean;
  map: Mapeamento;
  acoes: Record<number, AcaoImportacao>;
  filtroMes: SiglaMes | '';
  soPendentes: boolean;
  modo: ModoImportacao;
  mesCmp: SiglaMes;

  definirArquivo: (nome: string, texto: string, delim: string) => void;
  setDelim: (v: string) => void;
  setTemCabecalho: (v: boolean) => void;
  setMapCampo: (campo: ColunaChave, valor: string) => void;
  setMap: (m: Mapeamento) => void;
  setAcao: (indice: number, acao: AcaoImportacao) => void;
  setAcoes: (acoes: Record<number, AcaoImportacao>) => void;
  setFiltroMes: (v: SiglaMes | '') => void;
  setSoPendentes: (v: boolean) => void;
  setModo: (v: ModoImportacao) => void;
  setMesCmp: (v: SiglaMes) => void;
  limparTudo: () => void;
}

export const useStoreImportacao = create<EstadoImportacao>((set) => ({
  nomeArquivo: '',
  textoBruto: '',
  delim: ';',
  temCabecalho: true,
  map: { ...MAP_VAZIO },
  acoes: {},
  filtroMes: '',
  soPendentes: false,
  modo: 'cartao',
  mesCmp: 'JAN',

  definirArquivo: (nome, texto, delim) => set({
    nomeArquivo: nome, textoBruto: texto, delim,
    map: { ...MAP_VAZIO }, acoes: {},
  }),
  setDelim: (delim) => set({ delim }),
  setTemCabecalho: (temCabecalho) => set({ temCabecalho }),
  setMapCampo: (campo, valor) => set((s) => ({ map: { ...s.map, [campo]: valor } })),
  setMap: (map) => set({ map }),
  setAcao: (indice, acao) => set((s) => ({ acoes: { ...s.acoes, [indice]: acao } })),
  setAcoes: (acoes) => set({ acoes }),
  setFiltroMes: (filtroMes) => set({ filtroMes }),
  setSoPendentes: (soPendentes) => set({ soPendentes }),
  setModo: (modo) => set({ modo }),
  setMesCmp: (mesCmp) => set({ mesCmp }),
  limparTudo: () => set({
    nomeArquivo: '', textoBruto: '', delim: ';', temCabecalho: true,
    map: { ...MAP_VAZIO }, acoes: {}, filtroMes: '', soPendentes: false,
    modo: 'cartao',
  }),
}));
