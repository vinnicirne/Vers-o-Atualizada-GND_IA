import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';
import AdminPage from './pages/admin';
import { AdminGate } from './components/admin/AdminGate';

// Este componente consome o contexto e lida com a lógica principal do aplicativo.
const AppContent: React.FC = () => {
  const { user, loading, error } = useUser();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'admin'>('dashboard');

  // Navega para a página de administração, mas apenas se a role do usuário permitir.
  // O AdminGate cuidará do acesso não autorizado.
  const handleNavigateToAdmin = () => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      setCurrentPage('admin');
    }
  };
  
  const handleNavigateToDashboard = () => {
    setCurrentPage('dashboard');
  };

  if (error) {
    const isSqlConfigError = error.startsWith('SQL_CONFIG_ERROR:');
    const instructions = isSqlConfigError ? error.replace('SQL_CONFIG_ERROR:', '').trim() : '';
    
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className={`w-full ${isSqlConfigError ? 'max-w-2xl' : 'max-w-lg'} bg-black rounded-lg shadow-xl border border-red-500/50`}>
          <div className="p-6 border-b border-red-900/50 text-center">
            <i className="fas fa-exclamation-triangle text-red-400 text-4xl mb-3"></i>
            <h1 className="text-xl font-bold text-red-300">{isSqlConfigError ? 'Ação Necessária: Configurar Banco de Dados' : 'Erro Crítico do Sistema'}</h1>
          </div>
          <div className="p-6">
            {isSqlConfigError ? (
                <div className="text-left text-sm space-y-4">
                    <p className="text-red-400">
                        Ocorreu um erro de configuração do banco de dados que impede o aplicativo de funcionar. Isso geralmente é causado por permissões de acesso (Row Level Security) ausentes ou incorretas.
                    </p>
                    <p className="text-gray-300 font-semibold">Para corrigir o problema, siga as instruções abaixo, que foram copiadas do arquivo de setup:</p>
                    <div className="relative">
                        <pre className="bg-gray-950/50 border border-gray-700 text-green-300 p-4 rounded-md text-xs whitespace-pre-wrap overflow-x-auto max-h-60">
                            <code>{instructions}</code>
                        </pre>
                        <button 
                            onClick={() => navigator.clipboard.writeText(instructions)}
                            className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                            title="Copiar Instruções"
                        >
                            <i className="fas fa-copy mr-1"></i> Copiar
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <p className="text-red-400 text-center text-base leading-relaxed">{error}</p>
                    <p className="text-xs text-gray-400 text-center mt-4">
                        Isso pode ser um problema temporário. Por favor, tente recarregar a página. Se o problema persistir, contate o suporte.
                    </p>
                </>
            )}
          </div>
          <div className="p-4 bg-black/50 flex justify-center rounded-b-lg border-t border-red-900/50">
            <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 font-bold rounded-lg transition text-white bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-red-500"
            >
                {isSqlConfigError ? 'Recarregar Após Executar' : 'Recarregar'}
            </button>
          </div>
        </div>
      </div>,
      modalRoot
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        {/* Loader inicial simples */}
        <p className="text-green-400 animate-pulse">Iniciando sistema...</p>
      </div>
    );
  }

  return (
    <>
      {!user ? (
        <LoginPage />
      ) : (
        <>
          {currentPage === 'dashboard' && (
            <DashboardPage 
              onNavigateToAdmin={handleNavigateToAdmin}
            />
          )}
          {currentPage === 'admin' && (
             <AdminGate onAccessDenied={handleNavigateToDashboard}>
              <AdminPage 
                onNavigateToDashboard={handleNavigateToDashboard}
              />
            </AdminGate>
          )}
        </>
      )}
    </>
  );
};


// O componente principal do App agora é apenas o wrapper do Provider.
const App: React.FC = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};

export default App;