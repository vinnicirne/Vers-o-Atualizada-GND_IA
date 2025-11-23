import React, { useState } from 'react';
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
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-red-900/20 border border-red-500/30 text-red-400 p-8 rounded-lg text-center shadow-[0_0_15px_rgba(220,38,38,0.4)] animate-fade-in-scale">
          <i className="fas fa-exclamation-triangle text-4xl mb-4"></i>
          <h1 className="text-xl font-bold mb-2">Erro Crítico do Sistema</h1>
          <p className="text-base">{error}</p>
          <p className="text-xs text-gray-400 mt-4">
            Isso pode ser um problema temporário. Por favor, tente recarregar a página. Se o problema persistir, contate o suporte.
          </p>
           <button 
                onClick={() => window.location.reload()}
                className="mt-6 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-md transition-all"
            >
                Recarregar
            </button>
        </div>
      </div>
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
