
import { createClient } from '@supabase/supabase-js';

// Credenciais REAIS do seu projeto Supabase (Atualizado)
export const supabaseUrl = 'https://bckujotuhhkagcqfiyye.supabase.co';
// NOTA DE SEGURANÇA:
// A 'anon' key é pública por design e segura para uso no frontend.
// A segurança real dos dados é garantida pelas Políticas de Segurança de Linha (RLS) configuradas no banco de dados.
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJja3Vqb3R1aGhrYWdjcWZpeXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MDk2NjUsImV4cCI6MjA3OTQ4NTY2NX0.CqbNZJeaThbQtolVOB1HVHfV1AT2gsWYS-ZTpUHGq2A';

// Cliente Supabase para acesso direto ao banco de dados e autenticação
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
});
