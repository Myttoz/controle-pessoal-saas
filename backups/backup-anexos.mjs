#!/usr/bin/env node
/**
 * Baixa todos os arquivos do bucket "anexos" do Supabase Storage.
 *
 * Usado pelo workflow semanal do repositório privado de backups.
 * Usa a API REST do Storage com a chave service_role (ignora RLS),
 * sem precisar instalar dependências (Node 18+ tem fetch global).
 *
 * Variáveis de ambiente:
 *   SUPABASE_URL               https://SEU-PROJETO.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  Settings → API → service_role (NUNCA publique)
 *   SUPABASE_BUCKET            opcional, padrão: anexos
 *   OUT_DIR                    opcional, padrão: anexos
 *
 * Uso local (uma vez, para testar):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node backup-anexos.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const BASE = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = process.env.SUPABASE_BUCKET || 'anexos';
const OUT = process.env.OUT_DIR || 'anexos';

if (!BASE || !KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function listarPrefixo(prefix) {
  const encontrados = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(
      `${BASE}/storage/v1/object/list/${encodeURIComponent(BUCKET)}`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix,
          limit: 1000,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        }),
      },
    );
    if (!res.ok) {
      throw new Error(`list ${prefix || '/'}: ${res.status} ${await res.text()}`);
    }
    const itens = await res.json();
    for (const item of itens) {
      const caminho = prefix ? `${prefix}/${item.name}` : item.name;
      // Pastas vêm com id/metadata nulos; arquivos vêm preenchidos.
      if (item.id === null || item.metadata === null) {
        encontrados.push(...(await listarPrefixo(caminho)));
      } else {
        encontrados.push(caminho);
      }
    }
    if (itens.length < 1000) break;
  }
  return encontrados;
}

async function baixar(caminho) {
  const url = `${BASE}/storage/v1/object/${encodeURIComponent(BUCKET)}/${caminho
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`download ${caminho}: ${res.status} ${await res.text()}`);
  }
  const destino = join(OUT, ...caminho.split('/'));
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, Buffer.from(await res.arrayBuffer()));
  return destino;
}

const arquivos = await listarPrefixo('');
console.log(`Encontrados ${arquivos.length} arquivo(s) no bucket "${BUCKET}".`);
for (const caminho of arquivos) {
  const destino = await baixar(caminho);
  console.log(`  ✓ ${destino}`);
}
console.log(`Concluído. Destino: ${OUT}/`);
