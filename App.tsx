
import React, { useState, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';
// Lazy Load do Admin e Páginas Legais para reduzir bundle size inicial
const AdminPage = React.lazy(() => import('./pages/admin'));
const PrivacyPage = React.lazy(() => import('./pages/legal/PrivacyPage'));
const TermsPage = React.lazy(() => import('./pages/legal/TermsPage'));
const CookiesPage = React.lazy(() => import('./pages/legal/CookiesPage'));
const AboutPage = React.lazy(() => import('./pages/legal/AboutPage'));

import { AdminGate } from './components/admin/AdminGate';
import { initGA4 } from './services/analyticsService'; // Import GA4 init

// Componente de Loading Simples
const SimpleLoader = () => (
  <div className="min-h-screen bg-[#ECEFF1] flex flex-col items-center justify-center space-y-4">
    <i className="fas fa-circle-notch fa-spin text-4xl text-[#F39C12]"></i>
  </div>
);

// Define as rotas possíveis
type PageRoute = 'dashboard' | 'admin' | 'login' | 'privacy' | 'terms' | 'cookies' | 'about';

// Este componente consome o contexto e lida com a lógica principal do aplicativo.
function AppContent() {
  const { user, loading, error } = useUser();
  
  // Inicializa Analytics ao montar o app
  useEffect(() => {
      initGA4();
  }, []);
  
  // ROTEAMENTO: Inicializa o estado com base na URL
  const getInitialPage = (): PageRoute => {
    if (typeof window !== 'undefined' && window.location.search) {
        try {
            const params = new URLSearchParams(window.location.search);
            const page = params.get('page');
            const validPages: PageRoute[] = ['admin', 'login', 'privacy', 'terms', 'cookies', 'about'];
            if (page && validPages.includes(page as PageRoute)) {
                return page as PageRoute;
            }
            return 'dashboard';
        } catch (e) {
            console.warn('Erro ao ler URLSearchParams:', e);
            return 'dashboard';
        }
    }
    return 'dashboard';
  };

  const [currentPage, setCurrentPage] = useState<PageRoute>(getInitialPage);

  // Se o usuário logar enquanto estiver na tela de login, manda pro dashboard
  useEffect(() => {
    if (user && currentPage === 'login') {
      setCurrentPage('dashboard');
    }
  }, [user, currentPage]);

  // Sincroniza a URL quando o estado muda e lida com o botão "Voltar" do navegador
  useEffect(() => {
    const handlePopState = () => {
       setCurrentPage(getInitialPage());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    try {
        // Verifica se window.location está disponível
        if (typeof window === 'undefined' || !window.location) return;

        const params = new URLSearchParams(window.location.search);
        if (currentPage === 'dashboard') {
          params.delete('page');
        } else {
          params.set('page', currentPage);
        }
        
        const queryString = params.toString() ? '?' + params.toString() : '';
        const newUrl = `${window.location.pathname}${queryString}`;
        
        // Evita pushState se a URL já for a mesma
        if (window.location.search !== queryString) {
            try {
                // Proteção contra ambientes restritos (Blob, Data URI, Sandboxes estritos)
                const isRestrictedEnv = ['blob:', 'data:', 'file:'].includes(window.location.protocol);
                
                if (!isRestrictedEnv) {
                    window.history.pushState({}, '', newUrl);
                }
            } catch (e) {
                // Silencia erros de segurança esperados em previews (StackBlitz, Replit, etc)
                // para não poluir o console do usuário.
                if (e instanceof Error && (e.name === 'SecurityError' || e.message.includes('SecurityError'))) {
                    return; // Ignore completely
                }
                console.warn('Navigation state update skipped:', e);
            }
        }
    } catch (e) {
        console.error('Erro na lógica de roteamento:', e);
    }
  }, [currentPage]);

  // Handler genérico de navegação
  const handleNavigate = (page: PageRoute) => {
      setCurrentPage(page);
      window.scrollTo(0, 0);
  };

  const handleNavigateToAdmin = () => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      handleNavigate('admin');
    }
  };

  if (error) {
    const errorString = typeof error === 'string' ? error : JSON.stringify(error, null, 2);
    const isSqlConfigError = errorString.startsWith('SQL_CONFIG_ERROR:');
    const instructions = isSqlConfigError ? errorString.replace('SQL_CONFIG_ERROR:', '').trim() : '';
    
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className={`w-full ${isSqlConfigError ? 'max-w-2xl' : 'max-w-lg'} bg-white rounded-xl shadow-2xl border border-red-200`}>
          <div className="p-6 border-b border-gray-100 text-center">
            <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-3"></i>
            <h1 className="text-xl font-bold text-red-600">{isSqlConfigError ? 'Ação Necessária: Configurar Banco de Dados' : 'Erro Crítico do Sistema'}</h1>
          </div>
          <div className="p-6">
            {isSqlConfigError ? (
                <div className="text-left text-sm space-y-4">
                    <p className="text-gray-700">
                        Ocorreu um erro de configuração do banco de dados que impede o aplicativo de funcionar. Isso geralmente é causado por permissões de acesso (Row Level Security) ausentes ou incorretas.
                    </p>
                    <p className="text-gray-900 font-semibold">Para corrigir o problema, siga as instruções abaixo, que foram copiadas do arquivo de setup:</p>
                    <div className="relative">
                        <pre className="bg-gray-50 border border-gray-200 text-gray-800 p-4 rounded-md text-xs whitespace-pre-wrap overflow-x-auto max-h-60">
                            <code>{instructions}</code>
                        </pre>
                        <button 
                            onClick={() => navigator.clipboard.writeText(instructions)}
                            className="absolute top-2 right-2 px-2 py-1 text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded transition-colors shadow-sm"
                            title="Copiar Instruções"
                        >
                            <i className="fas fa-copy mr-1"></i> Copiar
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <p className="text-red-500 text-center text-base leading-relaxed whitespace-pre-wrap">{errorString}</p>
                    <p className="text-xs text-gray-500 text-center mt-4">
                        Isso pode ser um problema temporário. Por favor, tente recarregar a página. Se o problema persistir, contate o suporte.
                    </p>
                </>
            )}
          </div>
          <div className="p-4 bg-gray-50 flex justify-center rounded-b-xl border-t border-gray-100">
            <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 font-bold rounded-lg transition text-white bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-md"
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
      <div className="min-h-screen bg-[#ECEFF1] flex items-center justify-center">
        <p className="text-[#263238] font-medium animate-pulse">Iniciando sistema...</p>
      </div>
    );
  }

  // ROTEAMENTO PRINCIPAL
  return (
    <Suspense fallback={<SimpleLoader />}>
        {currentPage === 'login' && (
            <div className="relative">
                {/* Botão para voltar ao modo visitante */}
                <button 
                    onClick={() => handleNavigate('dashboard')}
                    className="absolute top-4 left-4 z-50 text-gray-600 hover:text-[#263238] flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200"
                >
                    <i className="fas fa-arrow-left"></i> Voltar ao Dashboard (Visitante)
                </button>
                <LoginPage />
            </div>
        )}

        {currentPage === 'dashboard' && (
            <DashboardPage 
                onNavigateToAdmin={handleNavigateToAdmin}
                onNavigateToLogin={() => handleNavigate('login')}
                onNavigate={(page) => handleNavigate(page as PageRoute)}
            />
        )}
        
        {currentPage === 'admin' && (
             <AdminGate onAccessDenied={() => handleNavigate('dashboard')}>
                  <AdminPage 
                    onNavigateToDashboard={() => handleNavigate('dashboard')}
                  />
            </AdminGate>
        )}

        {/* Páginas Legais */}
        {currentPage === 'privacy' && <PrivacyPage onBack={() => handleNavigate('dashboard')} />}
        {currentPage === 'terms' && <TermsPage onBack={() => handleNavigate('dashboard')} />}
        {currentPage === 'cookies' && <CookiesPage onBack={() => handleNavigate('dashboard')} />}
        {currentPage === 'about' && <AboutPage onBack={() => handleNavigate('dashboard')} />}
    </Suspense>
  );
}

// O componente principal do App agora é apenas o wrapper do Provider.
export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}