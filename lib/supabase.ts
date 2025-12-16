import { createClient } from '@supabase/supabase-js';

// Tenta ler as variáveis de ambiente (Padrão Vite/Vercel)
// Se não encontrar (ex: rodando local sem build), usa strings vazias ou placeholders para evitar crash imediato,
// mas o ideal é que o .env esteja configurado.

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

if (!(import.meta as any).env?.VITE_SUPABASE_URL || !(import.meta as any).env?.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ ATENÇÃO: As chaves do Supabase não foram encontradas no arquivo .env ou nas variáveis de ambiente. O sistema pode não funcionar corretamente.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);