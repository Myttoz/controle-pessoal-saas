import { supabase } from '@/lib/supabase';

export type EntidadeAnexo = 'lancamento' | 'manutencao';

export interface Anexo {
  id: string;
  entidade_tipo: EntidadeAnexo;
  entidade_id: string;
  nome: string;
  caminho: string;
  mime: string | null;
  tamanho: number | null;
  created_at: string;
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function listarAnexos(entidadeTipo: EntidadeAnexo, entidadeId: string): Promise<Anexo[]> {
  const uid = await getUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from('anexos')
    .select('*')
    .eq('user_id', uid)
    .eq('entidade_tipo', entidadeTipo)
    .eq('entidade_id', entidadeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Anexo[];
}

export async function uploadAnexo(
  entidadeTipo: EntidadeAnexo,
  entidadeId: string,
  arquivo: File,
): Promise<Anexo> {
  const uid = await getUserId();
  if (!uid) throw new Error('Usuário não autenticado.');
  const safeName = arquivo.name.replace(/[^\w.\-() ]+/g, '_');
  const caminho = `${uid}/${entidadeTipo}/${entidadeId}/${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase.storage.from('anexos').upload(caminho, arquivo, {
    cacheControl: '3600',
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from('anexos')
    .insert({
      user_id: uid,
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      nome: arquivo.name,
      caminho,
      mime: arquivo.type || null,
      tamanho: arquivo.size,
    })
    .select('*')
    .single();
  if (error) {
    // tenta limpar o arquivo órfão
    await supabase.storage.from('anexos').remove([caminho]);
    throw error;
  }
  return data as Anexo;
}

export async function removerAnexo(anexo: Anexo): Promise<void> {
  const { error: stErr } = await supabase.storage.from('anexos').remove([anexo.caminho]);
  if (stErr) throw stErr;
  const { error } = await supabase.from('anexos').delete().eq('id', anexo.id);
  if (error) throw error;
}

export async function urlAnexo(anexo: Anexo): Promise<string> {
  const { data, error } = await supabase.storage.from('anexos').createSignedUrl(anexo.caminho, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
