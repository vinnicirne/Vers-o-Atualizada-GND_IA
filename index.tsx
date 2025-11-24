import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Error Handler Global para "Tela Preta"
 * Captura erros críticos que impedem a renderização do React.
 * Exibe uma mensagem de erro formatada diretamente no DOM.
 * 
 * ATUALIZAÇÃO: A lógica foi aprimorada para lidar com qualquer tipo de 'error'
 * que possa ser lançado, não apenas instâncias de 'Error'. Isso garante que
 * a mensagem de erro seja sempre exibida, evitando uma tela preta vazia.
 */
const handleFatalError = (error: any) => {
  console.error("ERRO GLOBAL CAPTURADO:", error);
  
  // Para a aplicação e limpa a tela para exibir apenas o erro.
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = '';
  }
  document.body.innerHTML = ''; // Limpa completamente o corpo em caso de falha total.
  document.body.style.backgroundColor = '#000';
  document.body.style.color = '#f87171'; // tailwind: red-400
  document.body.style.fontFamily = 'monospace';
  document.body.style.padding = '2rem';
  
  let errorMessage = 'Erro desconhecido.';
  let errorStack = 'Stack trace não disponível.';

  if (error instanceof Error) {
    errorMessage = error.message;
    errorStack = error.stack || error.toString();
  } else if (typeof error === 'string' && error.trim() !== '') {
    errorMessage = error;
  } else if (error) {
    try {
      // Tenta formatar o objeto de erro, caso não seja um tipo padrão.
      const serializedError = JSON.stringify(error, null, 2);
      errorMessage = serializedError === '{}' ? 'Objeto de erro não-padrão recebido. Verifique o log do console.' : serializedError;
    } catch (e) {
      errorMessage = 'Não foi possível serializar o objeto de erro. Verifique o log do console para detalhes.';
    }
  } else {
     errorMessage = 'Ocorreu um erro, mas o objeto de erro estava vazio (null ou undefined).';
  }


  const errorContainer = document.createElement('div');
  errorContainer.innerHTML = `
      <h1 style="font-size: 1.5rem; font-weight: bold; color: #ef4444; border-bottom: 1px solid #ef4444; padding-bottom: 0.5rem;">[FALHA CRÍTICA NO SISTEMA]</h1>
      <p style="margin-top: 1rem; color: #fca5a5;">A aplicação encontrou um erro irrecuperável e foi interrompida.</p>
      <p style="margin-top: 0.5rem; color: #fca5a5;">Isso geralmente ocorre por um problema de configuração (ex: URL do Supabase, chaves de API) ou um erro de programação que acontece durante a inicialização.</p>
      <pre style="background-color: #111827; border: 1px solid #374151; padding: 1rem; margin-top: 1.5rem; color: #f87171; white-space: pre-wrap; word-wrap: break-word; font-size: 0.8rem;">${errorMessage}\n\n${errorStack}</pre>
      <button onclick="window.location.reload()" style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background-color: #dc2626; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: bold;">Recarregar Aplicação</button>
  `;
  document.body.appendChild(errorContainer);
};

// Listener para erros síncronos
window.addEventListener('error', (event) => {
  // Ignora erros de script de extensões do navegador
  if (event.filename && (event.filename.includes('extension://') || !event.filename.includes(window.location.origin))) {
    return;
  }
  handleFatalError(event.error || new Error(event.message));
});

// Listener para erros em Promises (ex: falhas em chamadas async/await não capturadas)
window.addEventListener('unhandledrejection', (event) => {
  handleFatalError(event.reason || new Error('Unhandled promise rejection'));
});


const rootElement = document.getElementById('root');
if (!rootElement) {
  // Se o próprio elemento root não existir, exibe um erro fatal.
  handleFatalError(new Error("Elemento 'root' não encontrado no DOM. Verifique se o index.html está correto."));
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (e) {
    // Captura erros que possam ocorrer durante o render inicial do React.
    handleFatalError(e);
  }
}