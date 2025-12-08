
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './Vers-o-Atualizada-GND_IA-main/App';
import { HelmetProvider } from 'react-helmet-async';
import './Vers-o-Atualizada-GND_IA-main/index.css';

console.log("🚀 [index.tsx] Aplicação Iniciando...");

// Tenta registrar o Service Worker se disponível (caminho ajustado para a estrutura de pastas)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Tenta registrar o SW da pasta interna ou raiz, dependendo de como o build move os arquivos.
    // Usando caminho relativo à pasta principal por segurança.
    navigator.serviceWorker.register('/Vers-o-Atualizada-GND_IA-main/sw.js').then(registration => {
      console.log('✅ ServiceWorker registrado com escopo:', registration.scope);
    }).catch(err => {
      console.log('⚠️ Falha ao registrar ServiceWorker (pode ser ignorado em dev):', err);
    });
  });
}

const container = document.getElementById('root');

if (container) {
    try {
        const root = createRoot(container);
        root.render(
            <React.StrictMode>
                <HelmetProvider>
                    <App />
                </HelmetProvider>
            </React.StrictMode>
        );
        console.log("✅ [index.tsx] React montado com sucesso.");
    } catch (e) {
        console.error("🔥 [index.tsx] Erro fatal ao montar React:", e);
        container.innerHTML = `
            <div style="padding: 20px; color: red; text-align: center; font-family: sans-serif;">
                <h1>Erro Fatal na Inicialização</h1>
                <p>Ocorreu um erro ao iniciar a interface gráfica.</p>
                <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; text-align: left; overflow: auto;">${e instanceof Error ? e.message : JSON.stringify(e)}</pre>
            </div>
        `;
    }
} else {
    console.error('❌ [index.tsx] Elemento #root não encontrado no HTML.');
}
