import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Apenas a API Key do Gemini, que é usada diretamente com import.meta.env no código
        // Removido o define para process.env.API_KEY, agora usado diretamente import.meta.env.GEMINI_API_KEY
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});