/**
 * Monta o link "Adicionar ao Google Agenda" já preenchido com o lembrete.
 *
 * Google Calendar renderiza um template pronto: quando o usuário clica,
 * pede só a confirmação na página do Google — não exige conta ou permissão.
 * A notificação chega via Google (e-mail + push no celular) na data marcada.
 */
import type { DadosLembrete } from '@/types/api-types';

function paraDataGoogle(iso: string): string {
  // iso esperado: 'yyyy-MM-dd'
  return iso.replace(/-/g, '');
}

function diaSeguinte(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export function linkGoogleAgenda(dados: Pick<DadosLembrete, 'titulo' | 'dataLembrete' | 'mensagem'>): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: dados.titulo.trim() || 'Lembrete',
    details: dados.mensagem.trim() || dados.titulo.trim() || 'Lembrete',
    dates: `${paraDataGoogle(dados.dataLembrete)}/${diaSeguinte(dados.dataLembrete)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
