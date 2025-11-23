import { createClient } from '@supabase/supabase-js';

// ATENÇÃO: Substitua pelas variáveis do seu projeto Supabase.
// Você pode encontrá-las nas configurações do seu projeto no painel do Supabase.
const supabaseUrl = 'https://djffiubticbleyehqsps.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZmZpdWJ0aWNibGV5ZWhxc3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODE3NjQsImV4cCI6MjA3OTM1Nzc2NH0.6OBB2WBpIaaJx4xfWsYzKg8dKoi_DwlnxJc1qOBAmPI';

if (supabaseUrl.includes('<seu-projeto-id>') || supabaseAnonKey.includes('<sua-chave-anon>')) {
    const rootEl = document.getElementById('root');
    if (rootEl) {
        rootEl.innerHTML = `
        <div class="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100 p-4">
          <div class="bg-red-900/50 border border-red-700 text-red-300 px-6 py-4 rounded-lg text-center max-w-lg shadow-lg">
            <h1 class="text-2xl font-bold mb-2">Configuração Incompleta do Supabase</h1>
            <p>Por favor, configure sua URL e Chave Anon no arquivo <strong>services/supabaseClient.ts</strong> para conectar a aplicação ao seu banco de dados.</p>
          </div>
        </div>
      `;
       throw new Error("Supabase client not configured.");
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);