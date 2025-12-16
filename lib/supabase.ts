import { createClient } from '@supabase/supabase-js';

// NOTA: Em produção, estas variáveis devem estar em um arquivo .env
// Para este ambiente de demonstração, substitua pelos dados do seu projeto Supabase
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
