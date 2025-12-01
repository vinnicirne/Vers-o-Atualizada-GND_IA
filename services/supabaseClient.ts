
import { createClient } from '@supabase/supabase-js';

// Carrega as variáveis de ambiente injetadas pelo Vite (Vercel)
const supabaseUrlEnv = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKeyEnv = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrlEnv || !supabaseAnonKeyEnv) {
  console.warn(
    'ATENÇÃO: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não foram detectadas. ' +
    'Verifique seu arquivo .env ou as configurações de ambiente da Vercel.'
  );
}

export const supabaseUrl = supabaseUrlEnv || '';
export const supabaseAnonKey = supabaseAnonKeyEnv || '';

// Cliente Supabase para acesso direto ao banco de dados e autenticação
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
});
