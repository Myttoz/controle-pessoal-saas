/**
 * Adaptador da API para o SaaS (Supabase).
 *
 * Implementa o mesmo contrato `ApiElectron` que o adaptador web/desktop,
 * mas por baixo fala com o Supabase (Postgres + Auth + RLS).
 *
 * - A anon key é pública por design; a segurança vem das políticas de RLS.
 * - O token de sessão do Supabase é gerenciado pelo cliente (localStorage).
 * - Os dados ficam em tabelas relacionais (lancamentos, salarios, extras...).
 */
import type {
  ApiElectron,
  CachePersistido,
  RespostaEscrita,
} from '@/types/api-electron';
import type {
  Categoria,
  DadosExtra,
  DadosMensais,
  DadosLembrete,
  DadosSalario,
  FormaPgto,
  InfoAba,
  LancamentoMensal,
  Lembrete,
  LinhaExtra,
  LinhaSalario,
  LoginResposta,
  MesSnapshot,
  PayloadEscrita,
  PayloadLogin,
  PayloadVerificar,
  QuemPaga,
  Registro,
  Resposta,
  RespostaAbas,
  RespostaDashboard,
  RespostaErro,
  RespostaListarExtra,
  RespostaListarMensal,
  RespostaListarSalario,
  RespostaListas,
  ResumoDashboard,
  SiglaMes,
  SnapshotAno,
  StatusLembrete,
  RespostaLembretes,
  RespostaStatusLembretes,
  RespostaAdicionarLembrete,
  RespostaEditarLembrete,
  RespostaRemoverLembrete,
  RespostaTestarLembrete,
  RespostaInstalarLembretes,
  TokenResposta,
  TipoPagamento,
} from '@/types/api-types';
import { LISTAS } from '@/types/api-types';
import type {
  ConfigLocal,
  DadosLocais,
  RegistroFerias,
  RegistroHoraExtra,
  RegistroManutencao,
} from '@/types/dados-locais';
import { supabase } from '@/lib/supabase';

const MESES: SiglaMes[] = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
];

const CACHE_KEY = 'gg_cache_v1';
const LOCAL_KEY = 'gg_dados_locais_v1';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function erro(mensagem: string, codigo: RespostaErro['codigo'] = 'ERRO_DESCONHECIDO'): RespostaErro {
  return { sucesso: false, erro: mensagem, codigo };
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function inteiro(v: unknown): number | null {
  const n = num(v);
  return n === null ? null : Math.round(n);
}

function siglaMes(mes: number): SiglaMes {
  return MESES[Math.min(Math.max(mes, 1), 12) - 1];
}

function nomeAba(mes: number, ano: number): string {
  return `${siglaMes(mes)} ${String(ano).slice(-2)}`;
}

/** "JAN 26" -> { ano: 2026, mes: 1 } */
function parseAba(aba: string): { ano: number; mes: number } | null {
  const m = aba.trim().toUpperCase().match(/^([A-Z]{3,4})\s+(\d{2,4})$/);
  if (!m) return null;
  const sigla = m[1];
  const idx = MESES.findIndex((s) => s === sigla || (sigla === 'MAIO' && s === 'MAI'));
  if (idx < 0) return null;
  let ano = parseInt(m[2], 10);
  if (ano < 100) ano += 2000;
  return { ano, mes: idx + 1 };
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function tabelaDaAba(aba: string): 'lancamentos' | 'salarios' | 'extras' | null {
  const a = aba.trim().toLowerCase();
  if (a.startsWith('salário') || a.startsWith('salario')) return 'salarios';
  if (a.startsWith('extras')) return 'extras';
  if (parseAba(aba)) return 'lancamentos';
  return null;
}

/**
 * FREELANCE = soma dos extras GANHOS do mês (mesma lógica do SUMIF da
 * planilha). Calculado na leitura para sempre refletir os extras atuais.
 */
async function calcularFreelance(
  uid: string,
  ano: number,
  mes?: number,
): Promise<Map<number, number>> {
  let q = supabase.from('extras').select('mes, valor').eq('user_id', uid).eq('ano', ano).eq('tipo', 'ganho');
  if (mes != null) q = q.eq('mes', mes);
  const { data, error } = await q;
  const mapa = new Map<number, number>();
  if (error) return mapa;
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const m = inteiro(r.mes) ?? 1;
    mapa.set(m, (mapa.get(m) ?? 0) + (num(r.valor) ?? 0));
  }
  return mapa;
}

function rowToLancamento(r: Record<string, unknown>): LancamentoMensal {
  return {
    CATEGORIA: String(r.categoria ?? '') as Categoria,
    VALOR: num(r.valor) ?? 0,
    DESCRIÇÃO: String(r.descricao ?? ''),
    'FORMA DE PGTO': String(r.forma_pgt ?? '') as FormaPgto,
    TIPO: String(r.tipo ?? '') as TipoPagamento,
    'QUEM PAGA': String(r.quem_paga ?? '') as QuemPaga,
    DATA: String(r.data ?? ''),
    OBSERVAÇÃO: String(r.observacao ?? ''),
  };
}

function rowToSalario(r: Record<string, unknown>, freelanceCalculado?: number): LinhaSalario {
  const base = num(r.base) ?? 0;
  const decimo = num(r.decimo_terco) ?? 0;
  const ferias = num(r.ferias) ?? 0;
  const ajuda = num(r.ajuda_custo) ?? 0;
  const horaExtra = num(r.hora_extra) ?? 0;
  const outros = num(r.outros) ?? 0;
  const ticket = num(r.ticket) ?? 0;
  const freelance = freelanceCalculado ?? num(r.freelance) ?? 0;
  const totalSalario = base + decimo + ferias + ajuda + horaExtra + outros + ticket + freelance;
  return {
    'MÊS': siglaMes(inteiro(r.mes) ?? 1),
    'SALÁRIO BASE': base,
    '13º': decimo,
    'FÉRIAS': ferias,
    'AJUDA CUSTO (info)': ajuda,
    'HORA EXTRA (info)': horaExtra,
    OUTROS: outros,
    TICKET: ticket,
    FREELANCE: freelance,
    'TOTAL SALÁRIO': totalSalario,
    'TOTAL GANHOS': totalSalario,
    OBSERVAÇÃO: String(r.observacao ?? ''),
  };
}

function rowToExtra(r: Record<string, unknown>): LinhaExtra {
  return {
    'MÊS': siglaMes(inteiro(r.mes) ?? 1),
    CATEGORIA: String(r.categoria ?? ''),
    DESCRIÇÃO: String(r.descricao ?? ''),
    VALOR: num(r.valor) ?? 0,
    DATA: String(r.data ?? ''),
  };
}

function rowToHoraExtra(r: Record<string, unknown>): RegistroHoraExtra {
  return {
    id: String(r.id),
    data: String(r.data ?? ''),
    chegada: String(r.entrada ?? ''),
    almocoInicio: String(r.almoco_inicio ?? ''),
    almocoFim: String(r.almoco_fim ?? ''),
    saidaEmpresa: String(r.saida ?? ''),
    fimPlantao: '',
    observacao: '',
  };
}

function rowToFerias(r: Record<string, unknown>): RegistroFerias {
  return {
    id: String(r.id),
    periodo: String(r.periodo ?? ''),
    inicio: String(r.inicio ?? ''),
    fim: String(r.fim ?? ''),
    diasRetirados: inteiro(r.dias) ?? 0,
    diasVendidos: 0,
    observacao: String(r.observacao ?? ''),
  };
}

function rowToManutencao(r: Record<string, unknown>): RegistroManutencao {
  const km = inteiro(r.km);
  const proxKm = inteiro(r.prox_km);
  let intervaloDataMeses = 0;
  if (r.data && r.prox_data) {
    const d1 = new Date(String(r.data));
    const d2 = new Date(String(r.prox_data));
    const diffMs = d2.getTime() - d1.getTime();
    intervaloDataMeses = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30));
  }
  return {
    id: String(r.id),
    descricao: String(r.item ?? ''),
    data: String(r.data ?? ''),
    km: km ?? undefined,
    valor: num(r.valor) ?? 0,
    mecanico: String(r.mecanico ?? ''),
    lojaPecas: String(r.observacao ?? ''),
    observacao: '',
    intervaloDataMeses,
    intervaloKm: km != null && proxKm != null ? proxKm - km : undefined,
  };
}

function computeResumo(
  lancamentos: Record<string, unknown>[],
  ano: number,
  agrupar: string,
): ResumoDashboard {
  const somaPorCategoria = new Map<string, number>();
  const somaPorMes = new Map<number, number>();
  let totalGeral = 0;

  for (const r of lancamentos) {
    const valor = num(r.valor) ?? 0;
    totalGeral += valor;
    const mes = inteiro(r.mes) ?? 1;
    somaPorMes.set(mes, (somaPorMes.get(mes) ?? 0) + valor);

    const chave =
      agrupar === 'TIPO'
        ? String(r.tipo ?? '')
        : agrupar === 'FORMA DE PGTO'
          ? String(r.forma_pgt ?? '')
          : agrupar === 'QUEM PAGA'
            ? String(r.quem_paga ?? '')
            : String(r.categoria ?? '');
    somaPorCategoria.set(chave, (somaPorCategoria.get(chave) ?? 0) + valor);
  }

  const categorias = Array.from(somaPorCategoria.entries())
    .map(([categoria, total]) => ({ categoria, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  const meses = MESES.map((mes, i) => ({
    mes,
    total: Math.round((somaPorMes.get(i + 1) ?? 0) * 100) / 100,
  }));

  return {
    sucesso: true,
    ano,
    chaveAgrupamento: agrupar || 'CATEGORIA',
    totalGeral: Math.round(totalGeral * 100) / 100,
    categorias,
    meses,
    abasConsideradas: [],
  };
}

function lerCache<T>(chave: string): T | null {
  try {
    const texto = localStorage.getItem(chave);
    return texto ? (JSON.parse(texto) as T) : null;
  } catch {
    return null;
  }
}

function gravarCache(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // armazenamento indisponível
  }
}

// ---------------------------------------------------------------------------
// lembretes (SaaS: tabela `lembretes`; o envio de e-mail era feito pelo
// Google Apps Script e não existe aqui — o lembrete fica salvo no banco)
// ---------------------------------------------------------------------------

function rowToLembrete(r: Record<string, unknown>): Lembrete {
  const statusBruto = String(r.status ?? 'PENDENTE').toUpperCase();
  const status: StatusLembrete =
    statusBruto === 'ENVIADO' || statusBruto === 'CANCELADO' ? statusBruto : 'PENDENTE';
  return {
    id: String(r.id),
    titulo: String(r.titulo ?? ''),
    dataCriacao: String(r.created_at ?? '').slice(0, 19).replace('T', ' '),
    dataLembrete: String(r.data ?? '').slice(0, 10),
    email: String(r.email ?? ''),
    whatsapp: String(r.whatsapp ?? ''),
    mensagem: String(r.mensagem ?? ''),
    enviadoEmail: false,
    enviadoWhatsapp: false,
    eventoId: '',
    status,
    enviadoEm: '',
    erro: '',
  };
}

async function opListarLembretes(): Promise<RespostaLembretes> {
  const uid = await getUserId();
  if (!uid) return erro('Faça login.', 'NAO_AUTORIZADO');
  const { data, error } = await supabase
    .from('lembretes')
    .select('*')
    .eq('user_id', uid)
    .order('data', { ascending: true });
  if (error) return erro(error.message);
  return {
    sucesso: true,
    lembretes: ((data ?? []) as Record<string, unknown>[]).map(rowToLembrete),
  };
}

async function opStatusLembretes(): Promise<RespostaStatusLembretes> {
  const uid = await getUserId();
  if (!uid) return erro('Faça login.', 'NAO_AUTORIZADO');
  const { count, error } = await supabase
    .from('lembretes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid);
  if (error) return erro(error.message);
  return {
    sucesso: true,
    aba: 'lembretes',
    total: count ?? 0,
    gatilhoAtivo: false,
    fuso: 'America/Sao_Paulo',
    emailRestante: -1,
  };
}

async function opAdicionarLembrete(
  dados: DadosLembrete,
): Promise<RespostaAdicionarLembrete> {
  const uid = await getUserId();
  if (!uid) return erro('Faça login.', 'NAO_AUTORIZADO');
  const { data, error } = await supabase
    .from('lembretes')
    .insert({
      user_id: uid,
      titulo: dados.titulo,
      descricao: dados.mensagem,
      data: dados.dataLembrete || null,
      mensagem: dados.mensagem,
      email: dados.email,
      whatsapp: dados.whatsapp,
      status: 'PENDENTE',
      ativo: true,
    })
    .select()
    .single();
  if (error) return erro(error.message);
  return { sucesso: true, lembrete: rowToLembrete(data as Record<string, unknown>) };
}

async function opEditarLembrete(
  id: string,
  dados: DadosLembrete,
): Promise<RespostaEditarLembrete> {
  const { data, error } = await supabase
    .from('lembretes')
    .update({
      titulo: dados.titulo,
      descricao: dados.mensagem,
      data: dados.dataLembrete || null,
      mensagem: dados.mensagem,
      email: dados.email,
      whatsapp: dados.whatsapp,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) return erro(error.message);
  return { sucesso: true, lembrete: rowToLembrete(data as Record<string, unknown>) };
}

async function opRemoverLembrete(id: string): Promise<RespostaRemoverLembrete> {
  const { error } = await supabase.from('lembretes').delete().eq('id', id);
  if (error) return erro(error.message);
  return { sucesso: true, removido: true, id };
}

// ---------------------------------------------------------------------------
// adaptador
// ---------------------------------------------------------------------------

export function criarApiSupabase(): ApiElectron {
  const api: ApiElectron = {
    janela: undefined,

    // ---- autenticação ----
    login: async (payload: PayloadLogin): Promise<LoginResposta> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: payload.usuario,
        password: payload.senha,
      });
      if (error || !data.session) {
        return erro(error?.message ?? 'Usuário ou senha inválidos.', 'CREDENCIAIS_INVALIDAS');
      }
      return {
        sucesso: true,
        token: data.session.access_token,
        usuario: data.user?.email ?? payload.usuario,
      };
    },

    verificar: async (_payload: PayloadVerificar): Promise<TokenResposta> => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        return erro('Sessão inválida ou expirada.', 'TOKEN_INVALIDO');
      }
      return {
        sucesso: true,
        token: data.session.access_token,
        usuario: data.session.user.email ?? '',
      };
    },

    logout: async (): Promise<void> => {
      await supabase.auth.signOut();
    },

    // ---- leituras ----
    getAbas: async (): Promise<RespostaAbas> => {
      const uid = await getUserId();
      if (!uid) return erro('Faça login.', 'NAO_AUTORIZADO');

      const [{ data: lanc, error: e1 }, { data: sal, error: e2 }] = await Promise.all([
        supabase.from('lancamentos').select('ano'),
        supabase.from('salarios').select('ano'),
      ]);
      if (e1) return erro(e1.message);
      if (e2) return erro(e2.message);

      const anos = Array.from(
        new Set([...(lanc ?? []).map((r) => r.ano), ...(sal ?? []).map((r) => r.ano)]),
      ).sort((a, b) => a - b);

      const abas: InfoAba[] = [];
      for (const ano of anos) {
        for (let mes = 1; mes <= 12; mes++) {
          abas.push({
            aba: nomeAba(mes, ano),
            tipo: 'MENSAL',
            label: 'Mensal',
            ano,
            mes: siglaMes(mes),
            oculta: false,
            indice: mes - 1,
          });
        }
      }
      return { sucesso: true, abas };
    },

    getAno: async (ano: number): Promise<Resposta<SnapshotAno>> => {
      const uid = await getUserId();
      if (!uid) return erro('Faça login.', 'NAO_AUTORIZADO');

      const [lancRes, salRes, extRes] = await Promise.all([
        supabase.from('lancamentos').select('*').eq('ano', ano).eq('user_id', uid),
        supabase.from('salarios').select('*').eq('ano', ano).eq('user_id', uid),
        supabase.from('extras').select('*').eq('ano', ano).eq('user_id', uid),
      ]);
      if (lancRes.error) return erro(lancRes.error.message);
      if (salRes.error) return erro(salRes.error.message);
      if (extRes.error) return erro(extRes.error.message);

      const lanc = (lancRes.data ?? []) as Record<string, unknown>[];
      const sal = (salRes.data ?? []) as Record<string, unknown>[];
      const ext = (extRes.data ?? []) as Record<string, unknown>[];

      const meses: Partial<Record<SiglaMes, MesSnapshot | null>> = {};
      for (let mes = 1; mes <= 12; mes++) {
        const regs = lanc
          .filter((r) => inteiro(r.mes) === mes)
          .map((r) => ({ linha: String(r.id), dados: rowToLancamento(r) }));
        const total = regs.reduce((s, r) => s + (r.dados.VALOR || 0), 0);
        meses[siglaMes(mes)] = {
          aba: nomeAba(mes, ano),
          registros: regs,
          totalLancado: Math.round(total * 100) / 100,
        };
      }

      // FREELANCE por mês = soma dos extras ganhos (mesmo SUMIF da planilha)
      const freelancePorMes = new Map<number, number>();
      for (const r of ext) {
        if (r.tipo !== 'ganho') continue;
        const m = inteiro(r.mes) ?? 1;
        freelancePorMes.set(m, (freelancePorMes.get(m) ?? 0) + (num(r.valor) ?? 0));
      }

      const salRegs: Registro<LinhaSalario>[] = sal
        .slice()
        .sort((a, b) => (inteiro(a.mes) ?? 0) - (inteiro(b.mes) ?? 0))
        .map((r) => ({
          linha: String(r.id),
          dados: rowToSalario(r, freelancePorMes.get(inteiro(r.mes) ?? 1) ?? 0),
        }));

      const ganhos = ext
        .filter((r) => r.tipo === 'ganho')
        .map((r) => ({ linha: String(r.id), dados: rowToExtra(r) }));
      const gastos = ext
        .filter((r) => r.tipo === 'gasto')
        .map((r) => ({ linha: String(r.id), dados: rowToExtra(r) }));

      return {
        sucesso: true,
        ano,
        meses,
        mesesFaltando: [],
        salario: salRegs.length
          ? { aba: `Salário ${ano}`, registros: salRegs }
          : null,
        extras: ext.length
          ? { aba: `Extras ${ano}`, ganhos, gastos }
          : null,
        resumo: computeResumo(lanc, ano, 'CATEGORIA'),
      };
    },

    getDashboard: async (ano: number, agrupar = 'CATEGORIA'): Promise<RespostaDashboard> => {
      const uid = await getUserId();
      if (!uid) return erro('Faça login.', 'NAO_AUTORIZADO');
      const { data, error } = await supabase
        .from('lancamentos')
        .select('*')
        .eq('ano', ano)
        .eq('user_id', uid);
      if (error) return erro(error.message);
      return computeResumo((data ?? []) as Record<string, unknown>[], ano, agrupar);
    },

    getListas: async (): Promise<RespostaListas> => {
      return { sucesso: true, listas: LISTAS as unknown as Record<string, string[]> };
    },

    listar: async (
      aba: string,
      tabela?: 'ganhos' | 'gastos',
    ): Promise<RespostaListarMensal | RespostaListarSalario | RespostaListarExtra> => {
      const uid = await getUserId();
      if (!uid) return erro('Faça login.', 'NAO_AUTORIZADO');

      const tabelaAlvo = tabelaDaAba(aba);
      if (!tabelaAlvo) return erro('Aba inválida.', 'PARAMETRO_AUSENTE');

      if (tabelaAlvo === 'lancamentos') {
        const parsed = parseAba(aba);
        if (!parsed) return erro('Aba inválida.', 'PARAMETRO_AUSENTE');
        const { data, error } = await supabase
          .from('lancamentos')
          .select('*')
          .eq('ano', parsed.ano)
          .eq('mes', parsed.mes)
          .eq('user_id', uid);
        if (error) return erro(error.message);
        const regs = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
          linha: String(r.id),
          dados: rowToLancamento(r),
        }));
        const total = regs.reduce((s, r) => s + (r.dados.VALOR || 0), 0);
        const resp: RespostaListarMensal = {
          sucesso: true,
          aba,
          tipo: 'MENSAL',
          cabecalhos: ['CATEGORIA', 'VALOR', 'DESCRIÇÃO', 'FORMA DE PGTO', 'TIPO', 'QUEM PAGA', 'DATA', 'OBSERVAÇÃO'],
          total: Math.round(total * 100) / 100,
          registros: regs,
        };
        return resp;
      }

      if (tabelaAlvo === 'salarios') {
        const ano = parseInt(aba.replace(/\D/g, ''), 10);
        const [{ data, error }, freelancePorMes] = await Promise.all([
          supabase
            .from('salarios')
            .select('*')
            .eq('ano', ano)
            .eq('user_id', uid),
          calcularFreelance(uid, ano),
        ]);
        if (error) return erro(error.message);
        const regs = ((data ?? []) as Record<string, unknown>[])
          .slice()
          .sort((a, b) => (inteiro(a.mes) ?? 0) - (inteiro(b.mes) ?? 0))
          .map((r) => ({
            linha: String(r.id),
            dados: rowToSalario(r, freelancePorMes.get(inteiro(r.mes) ?? 1) ?? 0),
          }));
        const resp: RespostaListarSalario = {
          sucesso: true,
          aba,
          tipo: 'SALARIO',
          cabecalhos: ['MÊS', 'SALÁRIO BASE', '13º', 'FÉRIAS', 'AJUDA CUSTO (info)', 'HORA EXTRA (info)', 'OUTROS', 'TICKET', 'FREELANCE', 'TOTAL SALÁRIO', 'TOTAL GANHOS', 'OBSERVAÇÃO'],
          total: regs.reduce((s, r) => s + (r.dados['TOTAL SALÁRIO'] || 0), 0),
          registros: regs,
        };
        return resp;
      }

      // extras
      const ano = parseInt(aba.replace(/\D/g, ''), 10);
      const tipo = tabela === 'gastos' ? 'gasto' : 'ganho';
      const { data, error } = await supabase
        .from('extras')
        .select('*')
        .eq('ano', ano)
        .eq('tipo', tipo)
        .eq('user_id', uid);
      if (error) return erro(error.message);
      const regs = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        linha: String(r.id),
        dados: rowToExtra(r),
      }));
      const resp: RespostaListarExtra = {
        sucesso: true,
        aba,
        tipo: 'EXTRAS',
        cabecalhos: ['MÊS', 'CATEGORIA', 'DESCRIÇÃO', 'VALOR', 'DATA'],
        total: regs.reduce((s, r) => s + (r.dados.VALOR || 0), 0),
        registros: regs,
      };
      return resp;
    },

    // ---- escritas ----
    escrita: async (payload): Promise<RespostaEscrita> => {
      const uid = await getUserId();
      if (!uid) return erro('Faça login.', 'NAO_AUTORIZADO');

      const { acao } = payload;

      if (acao === 'adicionar') {
        const tabela = tabelaDaAba(payload.aba);
        if (!tabela) return erro('Aba inválida.', 'PARAMETRO_AUSENTE');

        if (tabela === 'extras') {
          const ano = parseInt(payload.aba.replace(/\D/g, ''), 10);
          const dados = payload.dados as DadosExtra;
          const { data, error } = await supabase
            .from('extras')
            .insert({
              user_id: uid,
              ano,
              mes: inteiro((dados as unknown as { mes?: number }).mes) ?? 1,
              tipo: (payload as { tabela?: string }).tabela === 'gastos' ? 'gasto' : 'ganho',
              categoria: dados.CATEGORIA ?? '',
              descricao: dados.DESCRIÇÃO ?? '',
              valor: num(dados.VALOR) ?? 0,
              data: dados.DATA || null,
            })
            .select()
            .single();
          if (error) return erro(error.message);
          const reg = { linha: String(data.id), dados: rowToExtra(data as Record<string, unknown>) };
          return { sucesso: true, aba: payload.aba, linha: reg.linha, gravadas: Object.keys(dados), registro: reg.dados as unknown as LinhaExtra };
        }

        if (tabela === 'salarios') {
          const parsed = parseAba(payload.aba);
          if (!parsed) return erro('Aba inválida.', 'PARAMETRO_AUSENTE');
          const dados = payload.dados as DadosSalario;
          const freelanceMes = (await calcularFreelance(uid, parsed.ano, parsed.mes)).get(parsed.mes) ?? 0;
          const { data, error } = await supabase
            .from('salarios')
            .upsert({
              user_id: uid,
              ano: parsed.ano,
              mes: parsed.mes,
              base: num(dados['SALÁRIO BASE']) ?? 0,
              decimo_terco: num(dados['13º']) ?? 0,
              ferias: num(dados['FÉRIAS']) ?? 0,
              ajuda_custo: num(dados['AJUDA CUSTO (info)']) ?? 0,
              hora_extra: num(dados['HORA EXTRA (info)']) ?? 0,
              outros: num(dados.OUTROS) ?? 0,
              ticket: num(dados.TICKET) ?? 0,
              freelance: freelanceMes,
              observacao: dados.OBSERVAÇÃO ?? '',
            }, { onConflict: 'user_id,ano,mes' })
            .select()
            .single();
          if (error) return erro(error.message);
          const reg = { linha: String(data.id), dados: rowToSalario(data as Record<string, unknown>, freelanceMes) };
          return { sucesso: true, aba: payload.aba, linha: reg.linha, gravadas: Object.keys(dados), registro: reg.dados as unknown as LinhaSalario };
        }

        // lancamentos
        const parsed = parseAba(payload.aba);
        if (!parsed) return erro('Aba inválida.', 'PARAMETRO_AUSENTE');
        const dados = payload.dados as DadosMensais;
        const { data, error } = await supabase
          .from('lancamentos')
          .insert({
            user_id: uid,
            ano: parsed.ano,
            mes: parsed.mes,
            categoria: dados.CATEGORIA ?? '',
            valor: num(dados.VALOR) ?? 0,
            descricao: dados.DESCRIÇÃO ?? '',
            forma_pgt: dados['FORMA DE PGTO'] ?? '',
            tipo: dados.TIPO ?? '',
            quem_paga: dados['QUEM PAGA'] ?? '',
            data: dados.DATA || null,
            observacao: dados.OBSERVAÇÃO ?? '',
          })
          .select()
          .single();
        if (error) return erro(error.message);
        const reg = { linha: String(data.id), dados: rowToLancamento(data as Record<string, unknown>) };
        return { sucesso: true, aba: payload.aba, linha: reg.linha, gravadas: Object.keys(dados), registro: reg.dados as unknown as LancamentoMensal };
      }

      if (acao === 'editar') {
        const tabela = tabelaDaAba(payload.aba);
        if (!tabela) return erro('Aba inválida.', 'PARAMETRO_AUSENTE');

        if (tabela === 'extras') {
          const dados = payload.dados as DadosExtra;
          const { data, error } = await supabase
            .from('extras')
            .update({
              categoria: dados.CATEGORIA ?? '',
              descricao: dados.DESCRIÇÃO ?? '',
              valor: num(dados.VALOR) ?? 0,
              data: dados.DATA || null,
            })
            .eq('id', payload.linha)
            .select()
            .single();
          if (error) return erro(error.message);
          const reg = { linha: String(data.id), dados: rowToExtra(data as Record<string, unknown>) };
          return { sucesso: true, aba: payload.aba, linha: reg.linha, alteradas: Object.keys(dados), registro: reg.dados as unknown as LinhaExtra };
        }

        if (tabela === 'salarios') {
          const dados = payload.dados as DadosSalario;
          const { data, error } = await supabase
            .from('salarios')
            .update({
              base: num(dados['SALÁRIO BASE']) ?? 0,
              decimo_terco: num(dados['13º']) ?? 0,
              ferias: num(dados['FÉRIAS']) ?? 0,
              ajuda_custo: num(dados['AJUDA CUSTO (info)']) ?? 0,
              hora_extra: num(dados['HORA EXTRA (info)']) ?? 0,
              outros: num(dados.OUTROS) ?? 0,
              ticket: num(dados.TICKET) ?? 0,
              observacao: dados.OBSERVAÇÃO ?? '',
            })
            .eq('id', payload.linha)
            .select()
            .single();
          if (error) return erro(error.message);
          // FREELANCE é calculado a partir dos extras ganhos do mês
          const row = data as Record<string, unknown>;
          const anoSal = inteiro(row.ano) ?? 0;
          const mesSal = inteiro(row.mes) ?? 1;
          const freelanceMes =
            (await calcularFreelance(uid, anoSal, mesSal)).get(mesSal) ?? 0;
          const { error: errFree } = await supabase
            .from('salarios')
            .update({ freelance: freelanceMes })
            .eq('id', payload.linha);
          if (errFree) return erro(errFree.message);
          const reg = { linha: String(data.id), dados: rowToSalario(row, freelanceMes) };
          return { sucesso: true, aba: payload.aba, linha: reg.linha, alteradas: Object.keys(dados), registro: reg.dados as unknown as LinhaSalario };
        }

        const dados = payload.dados as DadosMensais;
        const { data, error } = await supabase
          .from('lancamentos')
          .update({
            categoria: dados.CATEGORIA ?? '',
            valor: num(dados.VALOR) ?? 0,
            descricao: dados.DESCRIÇÃO ?? '',
            forma_pgt: dados['FORMA DE PGTO'] ?? '',
            tipo: dados.TIPO ?? '',
            quem_paga: dados['QUEM PAGA'] ?? '',
            data: dados.DATA || null,
            observacao: dados.OBSERVAÇÃO ?? '',
          })
          .eq('id', payload.linha)
          .select()
          .single();
        if (error) return erro(error.message);
        const reg = { linha: String(data.id), dados: rowToLancamento(data as Record<string, unknown>) };
        return { sucesso: true, aba: payload.aba, linha: reg.linha, alteradas: Object.keys(dados), registro: reg.dados as unknown as LancamentoMensal };
      }

      if (acao === 'remover') {
        const tabela = tabelaDaAba(payload.aba) ?? 'lancamentos';
        const { error } = await supabase.from(tabela).delete().eq('id', payload.linha);
        if (error) return erro(error.message);
        return { sucesso: true, aba: payload.aba, linha: payload.linha, removido: true };
      }

      if (acao === 'criarAno') {
        const ano = (payload as { ano: number }).ano;
        const { error } = await supabase
          .from('anos')
          .upsert({ user_id: uid, ano }, { onConflict: 'user_id,ano' });
        if (error) return erro(error.message);

        // Cria as 12 linhas da aba "Salário YYYY" (mesma estrutura da planilha)
        const linhasSalario = Array.from({ length: 12 }, (_, i) => ({
          user_id: uid,
          ano,
          mes: i + 1,
          base: 0,
          decimo_terco: 0,
          ferias: 0,
          ajuda_custo: 0,
          hora_extra: 0,
          outros: 0,
          ticket: 0,
          freelance: 0,
          observacao: '',
        }));
        const { error: errSal } = await supabase
          .from('salarios')
          .upsert(linhasSalario, { onConflict: 'user_id,ano,mes', ignoreDuplicates: true });
        if (errSal) return erro(errSal.message);

        const criadas = [
          ...MESES.map((m) => nomeAba(MESES.indexOf(m) + 1, ano)),
          `Salário ${ano}`,
          `Extras ${ano}`,
        ];
        return {
          sucesso: true,
          ano,
          criadas,
          puladasJaExistiam: [],
          aviso: null,
        };
      }

      if (acao === 'atualizarDashboard') {
        const ano = (payload as { ano: number }).ano;
        return { sucesso: true, aba: 'Dashboard', ano, totalGeral: 0, categorias: 0 };
      }

      return erro('Ação desconhecida.', 'ACAO_INVALIDA');
    },

    // ---- cache ----
    cacheCarregar: async (): Promise<CachePersistido | null> =>
      lerCache<CachePersistido>(CACHE_KEY),
    cacheSalvar: async (cache: CachePersistido): Promise<void> => {
      gravarCache(CACHE_KEY, cache);
    },

    // ---- dados locais (cache local) ----
    localCarregar: async (): Promise<DadosLocais | null> =>
      lerCache<DadosLocais>(LOCAL_KEY),
    localSalvar: async (dados: DadosLocais): Promise<void> => {
      gravarCache(LOCAL_KEY, dados);
    },

    // ---- proxy: CADA ação real usada por `servicoApi` (services/api.ts) ----
    // O renderer nunca chama as leituras/escritas direto pelo contrato: ele
    // envelopa tudo em `proxy` com `acao_real` (mesma assinatura da versão
    // desktop, que despacha no Auth.gs). Aqui despachamos para as operações
    // do próprio adaptador.
    proxy: async (payload: Record<string, unknown>): Promise<unknown> => {
      const acaoReal = payload.acao_real as string;

      const dadosLocaisCompleto = async (): Promise<unknown> => {
        const uid = await getUserId();
        if (!uid) return erro('Faça login.', 'NAO_AUTORIZADO');
        const [profRes, heRes, ferRes, manRes] = await Promise.all([
          supabase.from('profiles').select('config').eq('id', uid).single(),
          supabase.from('horas_extras').select('*').eq('user_id', uid),
          supabase.from('ferias').select('*').eq('user_id', uid),
          supabase.from('manutencao').select('*').eq('user_id', uid),
        ]);
        if (profRes.error) return erro(profRes.error.message);
        if (heRes.error) return erro(heRes.error.message);
        if (ferRes.error) return erro(ferRes.error.message);
        if (manRes.error) return erro(manRes.error.message);

        const config = (profRes.data?.config as ConfigLocal | null) ?? { salarioBruto: 0, kmAtual: 0 };
        const dados: DadosLocais = {
          versao: 1,
          salvoEm: Date.now(),
          config,
          horasExtras: ((heRes.data ?? []) as Record<string, unknown>[]).map(rowToHoraExtra),
          ferias: ((ferRes.data ?? []) as Record<string, unknown>[]).map(rowToFerias),
          manutencoes: ((manRes.data ?? []) as Record<string, unknown>[]).map(rowToManutencao),
        };
        return { sucesso: true, dados, salvoEm: dados.salvoEm };
      };

      const salvarDadosLocais = async (dados: DadosLocais): Promise<unknown> => {
        const uid = await getUserId();
        if (!uid) return erro('Faça login.', 'NAO_AUTORIZADO');

        const { error: profErr } = await supabase
          .from('profiles')
          .upsert({ id: uid, config: dados.config }, { onConflict: 'id' });
        if (profErr) return erro(profErr.message);

        await supabase.from('horas_extras').delete().eq('user_id', uid);
        await supabase.from('ferias').delete().eq('user_id', uid);
        await supabase.from('manutencao').delete().eq('user_id', uid);

        const heRows = dados.horasExtras.map((h) => ({
          user_id: uid,
          data: h.data || null,
          entrada: h.chegada || null,
          almoco_inicio: h.almocoInicio || null,
          almoco_fim: h.almocoFim || null,
          saida: h.saidaEmpresa || null,
        }));
        const ferRows = dados.ferias.map((f) => ({
          user_id: uid,
          periodo: f.periodo,
          inicio: f.inicio || null,
          fim: f.fim || null,
          dias: f.diasRetirados,
          valor_recebido: 0,
          status: 'Registrado',
          observacao: f.observacao || '',
        }));
        const manRows = dados.manutencoes.map((m) => ({
          user_id: uid,
          veiculo: 'C4',
          item: m.descricao,
          data: m.data || null,
          km: m.km ?? null,
          valor: m.valor,
          mecanico: m.mecanico || '',
          observacao: m.lojaPecas || '',
        }));

        if (heRows.length) {
          const { error } = await supabase.from('horas_extras').insert(heRows);
          if (error) return erro(error.message);
        }
        if (ferRows.length) {
          const { error } = await supabase.from('ferias').insert(ferRows);
          if (error) return erro(error.message);
        }
        if (manRows.length) {
          const { error } = await supabase.from('manutencao').insert(manRows);
          if (error) return erro(error.message);
        }

        return { sucesso: true, salvoEm: Date.now() };
      };

      switch (acaoReal) {
        // ---- leituras ----
        case 'abas':
          return api.getAbas();
        case 'ano':
          return api.getAno(inteiro(payload.ano) ?? 0);
        case 'dashboard':
          return api.getDashboard(
            inteiro(payload.ano) ?? 0,
            typeof payload.agrupar === 'string' ? payload.agrupar : undefined,
          );
        case 'listas':
          return api.getListas();
        case 'listar':
          return api.listar(
            String(payload.aba ?? ''),
            payload.tabela as 'ganhos' | 'gastos' | undefined,
          );

        // ---- escritas ----
        case 'adicionar':
        case 'editar':
        case 'remover':
        case 'criarAno':
        case 'atualizarDashboard': {
          const resto = { ...payload };
          delete resto.acao;
          delete resto.acao_real;
          delete resto.token;
          return api.escrita({ ...resto, acao: acaoReal } as unknown as PayloadEscrita);
        }

        // ---- dados locais (horas extras / férias / manutenção / config) ----
        case 'dadosLocais':
          return dadosLocaisCompleto();
        case 'salvarDadosLocais':
          return salvarDadosLocais(payload.dados as DadosLocais);

        // ---- lembretes ----
        case 'lembretes':
          return opListarLembretes();
        case 'statusLembretes':
          return opStatusLembretes();
        case 'adicionarLembrete':
          return opAdicionarLembrete(payload.dados as DadosLembrete);
        case 'editarLembrete':
          return opEditarLembrete(String(payload.id), payload.dados as DadosLembrete);
        case 'removerLembrete':
          return opRemoverLembrete(String(payload.id));
        case 'testarLembrete': {
          const resposta: RespostaTestarLembrete = {
            sucesso: true,
            mensagem:
              'O SaaS não envia e-mails de lembrete (isso era feito pelo Google Apps Script). O lembrete fica salvo no banco e aparece na lista.',
          };
          return resposta;
        }
        case 'instalarLembretes': {
          const resposta: RespostaInstalarLembretes = {
            sucesso: true,
            mensagem: 'Nenhum gatilho a instalar no SaaS — os lembretes ficam salvos no banco.',
            fuso: 'America/Sao_Paulo',
            gatilhosAnterioresRemovidos: 0,
          };
          return resposta;
        }

        default:
          return erro(`Ação desconhecida: ${acaoReal}`, 'ACAO_INVALIDA');
      }
    },

    // ---- diagnóstico ----
    configResumo: async (): Promise<{ baseUrl: string; temChave: boolean }> => {
      const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      return { baseUrl: url ?? '', temChave: true };
    },
  };

  return api;
}

export default criarApiSupabase;
