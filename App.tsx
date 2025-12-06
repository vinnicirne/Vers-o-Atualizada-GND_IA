

import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import LoginPage from './LoginPage';
import { WhiteLabelProvider, useWhiteLabel } from './contexts/WhiteLabelContext'; // Import WhiteLabelContext
// Lazy Load Pages
const AdminPage = React.lazy(() => import('./pages/admin'));
const PrivacyPage = React.lazy(() => import('./pages/legal/PrivacyPage'));
const TermsPage = React.lazy(() => import('./pages/legal/TermsPage'));
const CookiesPage = React.lazy(() => import('./pages/legal/CookiesPage'));
const AboutPage = React.lazy(() => import('./pages/legal/AboutPage'));
const FeedbackPage = React.lazy(() => import('./pages/FeedbackPage'));
const LandingPage = React.lazy(() => import('./pages/LandingPage')); 
const DashboardPage = React.lazy(() => import('./pages/DashboardPage')); // Corrected import path

import { AdminGate } from './components/admin/AdminGate';
import { initGA4 } from './services/analyticsService'; 
import { PopupRenderer } from './components/PopupRenderer'; 

type PageRoute = 'dashboard' | 'admin' | 'login' | 'privacy' | 'terms' | 'cookies' | 'about' | 'feedback' | 'landing';

const SimpleLoader = () => {
  const { settings, loading: wlLoading } = useWhiteLabel(); 
  
  if (wlLoading) {
    return (
      <div className="min-h-screen bg-[#ECEFF1] flex flex-col items-center justify-center space-y-4">
        <i className="fas fa-circle-notch fa-spin text-4xl text-[var(--brand-primary)]"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ECEFF1] flex flex-col items-center justify-center space-y-4">
      <i className="fas fa-circle-notch fa-spin text-4xl text-[var(--brand-primary)]"></i>
      <p className="text-[var(--brand-secondary)] font-medium animate-pulse">Iniciando {settings.appName}...</p>
    </div>
  );
};


function AppContent() {
  const { user, loading: userLoading, error: userError } = useUser();
  const { settings: whiteLabelSettings, loading: whiteLabelLoading } = useWhiteLabel();
  
  useEffect(() => {
      initGA4();
  }, []);
  
  const getInitialPage = useMemo((): PageRoute => {
    if (typeof window === 'undefined') return 'dashboard';

    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get('page');
    const validPages: PageRoute[] = ['admin', 'login', 'privacy', 'terms', 'cookies', 'about', 'feedback', 'landing', 'dashboard'];

    // 1. Prioritize explicit page parameter if valid
    if (pageParam && validPages.includes(pageParam as PageRoute)) {
        return pageParam as PageRoute;
    }

    // 2. Determine default route for root '/' path
    if (userLoading || whiteLabelLoading) {
        return 'dashboard'; 
    }

    if (user) {
        return 'dashboard'; // Logged-in users always start at dashboard
    } else {
        // Not logged-in users default to dashboard (guest mode) for the root path
        return 'dashboard'; 
    }
  }, [user, userLoading, whiteLabelSettings, whiteLabelLoading]);

  const [currentPage, setCurrentPage] = useState<PageRoute>('dashboard'); // Initial state set to a temporary default

  useEffect(() => {
      if (!userLoading && !whiteLabelLoading) {
          setCurrentPage(getInitialPage);
      }
  }, [userLoading, whiteLabelLoading, getInitialPage]);


  const handleNavigate = useCallback((page: PageRoute) => {
      setCurrentPage(page);
      window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (userLoading || whiteLabelLoading || !currentPage) {
        return; 
    }

    let targetPage: PageRoute = currentPage; 

    if (user) {
        // Logged-in users should always be on dashboard (unless explicitly on admin/legal pages)
        if (targetPage === 'landing' || targetPage === 'login') {
            targetPage = 'dashboard';
        }
    } else {
        // Not logged-in users default to dashboard (guest mode) for the root path.
        // If they explicitly try to access 'admin', redirect to guest dashboard.
        // If they navigate to 'landing' but it's disabled, also redirect to guest dashboard.
        if (targetPage === 'admin') {
            targetPage = 'dashboard'; 
        } else if (targetPage === 'landing' && !whiteLabelSettings.landingPageEnabled) {
            targetPage = 'dashboard';
        }
    }

    if (targetPage !== currentPage) {
        handleNavigate(targetPage);
    }
  }, [user, userLoading, currentPage, whiteLabelSettings, whiteLabelLoading, handleNavigate]);


  useEffect(() => {
    const handlePopState = () => {
       setCurrentPage(prev => { 
           const newInitialPage = getInitialPage; 
           if (prev !== newInitialPage) return newInitialPage;
           return prev; 
       });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getInitialPage]); 

  // URL sync logic
  useEffect(() => {
    try {
        if (typeof window === 'undefined' || !window.location || !currentPage) return;

        const params = new URLSearchParams(window.location.search);
        if (currentPage === 'dashboard') {
          params.delete('page'); 
        } else {
          params.set('page', currentPage);
        }
        
        const queryString = params.toString() ? '?' + params.toString() : '';
        const newUrl = `${window.location.pathname}${queryString}`;
        
        if (window.location.search !== queryString) {
            try {
                const isRestrictedEnv = ['blob:', 'data:', 'file:'].includes(window.location.protocol);
                if (!isRestrictedEnv) {
                    window.history.pushState({}, '', newUrl);
                }
            } catch (e) {
                if (e instanceof Error && (e.name === 'SecurityError' || e.message.includes('SecurityError'))) {
                    return; 
                }
                console.warn('Navigation state update skipped:', e);
            }
        }
    } catch (e) {
        console.error('Erro na lógica de roteamento:', e);
    }
  }, [currentPage]);

  const handleNavigateToAdmin = useCallback(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      handleNavigate('admin');
    }
  }, [user, handleNavigate]);


  if (userError) {
    const errorString = typeof userError === 'string' ? userError : JSON.stringify(userError, null, 2);
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
                        Ocorreu um erro de configuração do banco de dados.
                    </p>
                    <p className="text-gray-900 font-semibold">Para corrigir, execute o SQL abaixo:</p>
                    <div className="relative">
                        <pre className="bg-gray-50 border border-gray-200 text-gray-800 p-4 rounded-md text-xs whitespace-pre-wrap overflow-x-auto max-h-60">
                            <code>{instructions}</code>
                        </pre>
                    </div>
                </div>
            ) : (
                <p className="text-red-500 text-center">{errorString}</p>
            )}
          </div>
          <div className="p-4 bg-gray-50 flex justify-center rounded-b-xl border-t border-gray-100">
            <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 font-bold rounded-lg transition text-white bg-red-600 hover:bg-red-500"
            >
                Recarregar
            </button>
          </div>
        </div>
      </div>,
      modalRoot
    );
  }

  if (userLoading || whiteLabelLoading || !currentPage) { 
    return <SimpleLoader />;
  }
  
  // Conditionally render LandingPage to adhere to "sumir se desativada"
  const shouldRenderLandingPage = currentPage === 'landing' && whiteLabelSettings.landingPageEnabled && !user;

  return (
    <Suspense fallback={<SimpleLoader />}>
        <PopupRenderer />

        {shouldRenderLandingPage && (
            <LandingPage onNavigate={handleNavigate} />
        )}

        {currentPage === 'login' && (
            <div className="relative">
                {/* O botão "Voltar" na página de Login agora sempre direciona para o Dashboard (modo convidado) */}
                <button 
                    onClick={() => handleNavigate('dashboard')}
                    className="absolute top-4 left-4 z-50 text-gray-600 hover:text-[var(--brand-secondary)] flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200"
                >
                    <i className="fas fa-arrow-left"></i> Voltar
                </button>
                <LoginPage />
            </div>
        )}

        {currentPage === 'dashboard' && (
            <DashboardPage 
                onNavigateToAdmin={handleNavigateToAdmin}
                onNavigateToLogin={() => handleNavigate('login')}
                onNavigate={handleNavigate}
            />
        )}
        
        {currentPage === 'admin' && (
             <AdminGate onAccessDenied={() => handleNavigate('dashboard')}>
                  <AdminPage 
                    onNavigateToDashboard={() => handleNavigate('dashboard')}
                  />
            </AdminGate>
        )}

        {/* Public Feedback Page */}
        {currentPage === 'feedback' && <FeedbackPage onBack={() => handleNavigate('dashboard')} />}

        {/* Legal Pages */}
        {currentPage === 'privacy' && <PrivacyPage onBack={() => handleNavigate('dashboard')} />}
        {currentPage === 'terms' && <TermsPage onBack={() => handleNavigate('dashboard')} />}
        {currentPage === 'cookies' && <CookiesPage onBack={() => handleNavigate('dashboard')} />}
        {currentPage === 'about' && <AboutPage onBack={() => handleNavigate('dashboard')} />}
    </Suspense>
  );
}

export default function App() {
  return (
    <UserProvider>
      <WhiteLabelProvider>
        <AppContent />
      </WhiteLabelProvider>
    </UserProvider>
  );
}