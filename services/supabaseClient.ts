import { createClient } from '@supabase/supabase-js';

// Credenciais REAIS do seu projeto Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// NOTA DE SEGURANÇA:
// A 'anon' key é pública por design e segura para uso no frontend.
// A segurança real dos dados é garantida pelas Políticas de Segurança de Linha (RLS) configuradas no banco de dados.
// Não utilize a 'service_role' key aqui em hipótese alguma.
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cliente Supabase para acesso direto ao banco de dados e autenticação
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
});