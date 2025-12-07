
import { createClient } from '@supabase/supabase-js';

const supabaseUrlEnv = import.meta.env?.VITE_SUPABASE_URL;
const supabaseAnonKeyEnv = import.meta.env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrlEnv || !supabaseAnonKeyEnv) {
  const errorMessage = 
    'SUPABASE_CONFIG_ERROR: As variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias.\n' +
    'Verifique o arquivo .env na raiz do projeto e/ou as configurações de ambiente na sua plataforma de deploy (ex: Vercel).\n' +
    'Exemplo no .env:\n' +
    'VITE_SUPABASE_URL="https://seu_projeto_id.supabase.co"\n' +
    'VITE_SUPABASE_ANON_KEY="sua_chave_anonima_publica"';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

export const supabaseUrl = supabaseUrlEnv;
export const supabaseAnonKey = supabaseAnonKeyEnv;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
});
