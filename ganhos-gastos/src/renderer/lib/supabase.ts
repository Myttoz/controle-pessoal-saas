import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidas. ' +
      'Crie um arquivo .env na pasta ganhos-gastos (veja .env.example).',
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '');

export type { SupabaseClient } from '@supabase/supabase-js';
