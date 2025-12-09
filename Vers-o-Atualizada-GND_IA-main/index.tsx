
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { HelmetProvider } from 'react-helmet-async';

console.log("🚀 [index.tsx] Aplicação Iniciando...");

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('✅ ServiceWorker registrado com escopo:', registration.scope);
    }).catch(err => {
      console.log('❌ Falha no ServiceWorker:', err);
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
            <div style="padding: 20px; color: red; text-align: center;">
                <h1>Erro Fatal</h1>
                <p>Ocorreu um erro ao iniciar a interface gráfica.</p>
                <pre>${e instanceof Error ? e.message : JSON.stringify(e)}</pre>
            </div>
        `;
    }
} else {
    console.error('❌ [index.tsx] Elemento #root não encontrado no HTML.');
}
