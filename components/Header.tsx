

import React from 'react';
import { UserRole } from '../types';
import { NotificationBell } from './NotificationBell';
import { useWhiteLabel } from '../contexts/WhiteLabelContext'; // Import useWhiteLabel

interface HeaderProps {
  userEmail?: string;
  onLogout?: () => void;
  isAdmin?: boolean;
  onNavigateToAdmin?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToLogin?: () => void;
  onNewUserClick?: () => void;
  onOpenPlans?: () => void; 
  onOpenManual?: () => void; 
  onOpenHistory?: () => void;
  onOpenAffiliates?: () => void;
  onOpenIntegrations?: () => void;
  pageTitle?: string;
  userCredits?: number;
  userRole?: UserRole;
  realtimeStatus?: string;
  onToggleSidebar?: () => void;
  isGuest?: boolean; // NOVO: Prop para indicar se é convidado
}

export function Header({ 
    userEmail, 
    onLogout, 
    isAdmin, 
    onNavigateToAdmin, 
    onNavigateToDashboard, 
    onNavigateToLogin,
    onNewUserClick, 
    onOpenPlans, 
    onOpenManual, 
    onOpenHistory, 
    onOpenAffiliates, 
    onOpenIntegrations,
    pageTitle, 
    userCredits, 
    userRole, 
    realtimeStatus,
    onToggleSidebar,
    isGuest = false // Default para false
}: HeaderProps) {
  const { settings } = useWhiteLabel(); // Use white label settings
  const isAdminView = !!onNavigateToDashboard;
  const isLoggedIn = !!userEmail && !isGuest; // Um guest logado é um estado de transição, mas aqui consideramos 'logado' quando tem email e não é guest

  // Helper to determine status color and label
  const getRealtimeBadge = (status?: string) => {
      if (status === 'SUBSCRIBED') {
          return { color: 'bg-[var(--brand-tertiary)]', label: 'Online' };
      }
      if (status === 'CONNECTING' || status === 'CHANNEL_ERROR') {
          return { color: 'bg-yellow-500', label: 'Conectando...' };
      }
      if (status === 'TIMED_OUT' || status === 'CLOSED') {
          return { color: 'bg-red-500', label: 'Offline' };
      }
      // Default / Initial state
      return { color: 'bg-gray-400', label: 'Desconectado' };
  };

  const badge = getRealtimeBadge(realtimeStatus);

  if (isAdminView) {
    // Admin Header Layout
    return (
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 text-sm shadow-sm h-16">
        <div className="container mx-auto px-4 h-full flex justify-between items-center">
          
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold tracking-tight text-[var(--brand-secondary)]">
                {settings.logoTextPart1} <span className="text-gray-400 font-light mx-2">/</span> <span className="text-[var(--brand-tertiary)]">{pageTitle}</span>
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            
            <div className="hidden md:flex items-center space-x-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <div className="flex flex-col text-right leading-tight">
                    <span className="font-bold text-[var(--brand-secondary)] text-xs">{userEmail}</span>
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">{userRole?.replace('_', ' ')}</span>
                </div>
                <div className="h-8 w-8 bg-[var(--brand-secondary)] text-white rounded-full flex items-center justify-center font-bold text-xs">
                    {userEmail?.charAt(0).toUpperCase()}
                </div>
            </div>

            <NotificationBell />

            <div className="hidden lg:flex items-center space-x-4 border-l border-gray-200 pl-4">
                <div className="flex items-center space-x-1.5 text-xs text-gray-500" title={`Status do Realtime: ${realtimeStatus}`}>
                    <div className="relative flex h-2 w-2">
                        {realtimeStatus === 'SUBSCRIBED' && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${badge.color} opacity-75`}></span>}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${badge.color}`}></span>
                    </div>
                    <span className={realtimeStatus === 'SUBSCRIBED' ? 'text-[var(--brand-tertiary)] font-semibold' : 'text-gray-400'}>{badge.label}</span>
                </div>
                <span className="text-xs text-gray-400 font-mono">v{settings.appVersion}</span>
            </div>

            <div className="flex items-center space-x-2 border-l border-gray-200 pl-4">
                {onNewUserClick && (
                    <button 
                    onClick={onNewUserClick}
                    className="bg-[var(--brand-tertiary)] text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors duration-200 text-xs font-bold shadow-sm flex items-center gap-2"
                    >
                    <i className="fas fa-plus"></i>
                    <span className="hidden sm:inline">Novo Usuário</span>
                    </button>
                )}

                {onNavigateToDashboard && (
                    <button
                    onClick={onNavigateToDashboard}
                    className="bg-white text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:text-[var(--brand-secondary)] transition-colors duration-200 text-xs font-bold border border-gray-200"
                    title="Voltar para o Dashboard"
                    >
                    <i className="fas fa-arrow-left mr-2"></i>
                    App
                    </button>
                )}

                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="bg-white text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors duration-200 text-xs font-bold border border-red-200"
                        title="Sair"
                    >
                        <i className="fas fa-sign-out-alt"></i>
                    </button>
                )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Original Dashboard Header Layout
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm h-16">
      <div className="container mx-auto px-4 h-full flex justify-between items-center relative">
        
        {/* Left: Mobile Toggle & Logo */}
        <div className="flex items-center gap-4">
            {onToggleSidebar && (
                <button 
                    onClick={onToggleSidebar}
                    className="md:hidden text-gray-500 hover:text-[var(--brand-secondary)] focus:outline-none"
                >
                    <i className="fas fa-bars text-xl"></i>
                </button>
            )}
            <div className="text-left">
                <h1 className="text-2xl font-bold tracking-tight">
                    <span className="text-[var(--brand-secondary)]">{settings.logoTextPart1}</span>
                    <span className="text-[var(--brand-primary)]">{settings.logoTextPart2}</span>
                </h1>
            </div>
        </div>

        {/* Center: Title (Desktop Only) */}
        <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 text-center">
             <p className="text-gray-500 text-sm font-medium">{settings.dashboardTitle}</p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          
          {isLoggedIn && (
              <>
                {onOpenIntegrations && (
                    <button
                        onClick={onOpenIntegrations}
                        className="hidden md:flex bg-gray-100 text-gray-600 w-9 h-9 items-center justify-center rounded-full hover:bg-gray-200 hover:text-[var(--brand-secondary)] transition-colors duration-200 border border-gray-200 shadow-sm"
                        title="Integrações"
                    >
                        <i className="fas fa-plug text-sm"></i>
                    </button>
                )}

                {onOpenAffiliates && (
                    <button
                        onClick={onOpenAffiliates}
                        className="hidden md:flex bg-yellow-50 text-yellow-600 w-9 h-9 items-center justify-center rounded-full hover:bg-yellow-100 hover:text-yellow-700 transition-colors duration-200 border border-yellow-200 shadow-sm"
                        title="Afiliados"
                    >
                        <i className="fas fa-handshake text-sm"></i>
                    </button>
                )}

                {onOpenHistory && (
                    <button
                        onClick={onOpenHistory}
                        className="hidden md:flex bg-gray-100 text-gray-600 w-9 h-9 items-center justify-center rounded-full hover:bg-gray-200 hover:text-[var(--brand-secondary)] transition-colors duration-200 border border-gray-200 shadow-sm"
                        title="Histórico"
                    >
                        <i className="fas fa-history text-sm"></i>
                    </button>
                )}

                {onOpenManual && (
                    <button
                        onClick={onOpenManual}
                        className="hidden md:flex bg-gray-100 text-gray-600 w-9 h-9 items-center justify-center rounded-full hover:bg-gray-200 hover:text-[var(--brand-secondary)] transition-colors duration-200 border border-gray-200 shadow-sm"
                        title="Manual"
                    >
                        <i className="fas fa-question text-sm"></i>
                    </button>
                )}

                <NotificationBell />
              </>
          )}

          {userCredits !== undefined && (
             <div 
                onClick={onOpenPlans} 
                className="cursor-pointer hidden md:flex items-center space-x-2 border border-gray-200 bg-gray-50 px-3 py-1.5 rounded-full text-sm hover:bg-gray-100 transition shadow-sm"
                title={isGuest ? "Créditos de teste para experimentar as ferramentas básicas" : "Gerenciar Plano e Créditos"} // TOOLTIP NOVO
             >
              <i className="fas fa-coins text-[var(--brand-primary)]"></i>
              <span className="font-bold text-[var(--brand-secondary)]">
                {userCredits === -1 ? '∞' : userCredits}
              </span>
              {isGuest && <span className="text-xs text-green-600 font-bold ml-1">(Grátis)</span>}
              {!isGuest && <span className="text-gray-400 text-xs hover:text-gray-600">+</span>}
            </div>
          )}
          
          {isLoggedIn && onOpenPlans && (
            <button
                onClick={onOpenPlans}
                className="bg-[var(--brand-primary)] hover:bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-[var(--brand-primary-dark)] transition-colors duration-200 text-sm font-bold shadow-md shadow-orange-100"
            >
                Planos
            </button>
          )}

          {isAdmin && onNavigateToAdmin && (
             <button
              onClick={onNavigateToAdmin}
              className="bg-[var(--brand-secondary)] text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 text-sm font-bold shadow-md flex items-center gap-2 border border-gray-600"
              title="Painel Administrativo"
            >
              <i className="fas fa-user-shield"></i>
               <span>Admin</span>
            </button>
          )}

          {isLoggedIn && onLogout ? (
              <button
                onClick={onLogout}
                className="bg-white text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors duration-200 text-sm font-bold border border-red-200"
                title="Sair"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
          ) : (
             onNavigateToLogin && (
                 <button
                    onClick={onNavigateToLogin}
                    className="bg-[var(--brand-primary)] hover:bg-orange-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition shadow-lg shadow-orange-100"
                 >
                     Entrar
                 </button>
             )
          )}
        </div>
      </div>
    </header>
  );
}