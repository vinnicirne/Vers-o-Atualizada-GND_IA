
import React from 'react';
import { UserRole } from '../types';

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
  onOpenIntegrations?: () => void; // Novo Prop
  pageTitle?: string;
  userCredits?: number;
  userRole?: UserRole;
  metadata?: { version: string }; 
  realtimeStatus?: string; // New prop for Realtime Status
  onToggleSidebar?: () => void; // For mobile hamburger
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
    metadata,
    realtimeStatus,
    onToggleSidebar
}: HeaderProps) {
  const isAdminView = !!onNavigateToDashboard;
  const isLoggedIn = !!userEmail;

  // Helper to determine status color and label
  const getRealtimeBadge = (status?: string) => {
      if (status === 'SUBSCRIBED') {
          return { color: 'bg-green-500', label: 'Online' };
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
    // New Admin Header Layout
    return (
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 text-sm shadow-sm">
        {/* Top bar for user info and system status */}
        <div className="container mx-auto px-4 py-2 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <span className="text-gray-500 font-medium">Admin:</span>
            <span className="font-bold text-[#263238]">{userEmail}</span>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full capitalize font-medium">{userRole?.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center space-x-6">
            {/* Status Badges */}
            <div className="flex items-center space-x-1.5 text-xs text-gray-500" title="Versão do Sistema">
              <i className="fas fa-code-branch"></i>
              <span className="font-semibold text-gray-600">v{metadata?.version || 'N/A'}</span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-gray-500" title="Ambiente">
              <i className="fas fa-server text-blue-500"></i>
              <span>Produção</span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-gray-500" title={`Status do Realtime: ${realtimeStatus}`}>
              <div className="relative flex h-2 w-2">
                {realtimeStatus === 'SUBSCRIBED' && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${badge.color} opacity-75`}></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${badge.color}`}></span>
              </div>
              <span className={realtimeStatus === 'SUBSCRIBED' ? 'text-green-600 font-semibold' : 'text-gray-400'}>{badge.label}</span>
            </div>
          </div>
        </div>
        
        {/* Bottom bar for title, navigation and quick actions */}
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div>
             <h1 className="text-xl font-bold tracking-tight text-[#263238]">
                GDN_IA <span className="text-gray-400 font-light">/ {pageTitle}</span>
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            {/* Quick Actions */}
            <button 
              onClick={onNewUserClick}
              className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors duration-200 text-xs font-bold shadow-sm"
            >
              <i className="fas fa-plus mr-2"></i>
              Novo Usuário
            </button>

            {/* Navigation */}
            {onNavigateToDashboard && (
                 <button
                  onClick={onNavigateToDashboard}
                  className="bg-white text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:text-[#263238] transition-colors duration-200 text-xs font-bold border border-gray-200"
                  title="Voltar para o Dashboard"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Dashboard
                </button>
            )}

            {onLogout && (
                 <button
                    onClick={onLogout}
                    className="bg-white text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors duration-200 text-xs font-bold border border-red-200"
                    title="Sair"
                >
                    <i className="fas fa-sign-out-alt mr-2"></i>
                    Sair
                </button>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Original Dashboard Header Layout (Light Version)
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm h-16">
      <div className="container mx-auto px-4 h-full flex justify-between items-center relative">
        
        {/* Left: Mobile Toggle & Logo */}
        <div className="flex items-center gap-4">
            {onToggleSidebar && (
                <button 
                    onClick={onToggleSidebar}
                    className="md:hidden text-gray-500 hover:text-[#263238] focus:outline-none"
                >
                    <i className="fas fa-bars text-xl"></i>
                </button>
            )}
            <div className="text-left">
                <h1 className="text-2xl font-bold tracking-tight">
                    <span className="text-[#263238]">GDN</span>
                    <span className="text-[#F39C12]">_IA</span>
                </h1>
            </div>
        </div>

        {/* Center: Title (Desktop Only) */}
        <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 text-center">
             <p className="text-gray-500 text-sm font-medium">{pageTitle || 'Creator Suite'}</p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          
          {isLoggedIn && onOpenIntegrations && (
             <button
                onClick={onOpenIntegrations}
                className="hidden md:flex bg-gray-100 text-gray-600 w-9 h-9 items-center justify-center rounded-full hover:bg-gray-200 hover:text-[#263238] transition-colors duration-200 border border-gray-200 shadow-sm"
                title="Integrações"
            >
                <i className="fas fa-plug text-sm"></i>
            </button>
          )}

          {isLoggedIn && onOpenAffiliates && (
             <button
                onClick={onOpenAffiliates}
                className="hidden md:flex bg-yellow-50 text-yellow-600 w-9 h-9 items-center justify-center rounded-full hover:bg-yellow-100 hover:text-yellow-700 transition-colors duration-200 border border-yellow-200 shadow-sm"
                title="Afiliados"
            >
                <i className="fas fa-handshake text-sm"></i>
            </button>
          )}

          {isLoggedIn && onOpenHistory && (
             <button
                onClick={onOpenHistory}
                className="hidden md:flex bg-gray-100 text-gray-600 w-9 h-9 items-center justify-center rounded-full hover:bg-gray-200 hover:text-[#263238] transition-colors duration-200 border border-gray-200 shadow-sm"
                title="Histórico"
            >
                <i className="fas fa-history text-sm"></i>
            </button>
          )}

          {/* Botão de Ajuda */}
          {onOpenManual && (
            <button
                onClick={onOpenManual}
                className="hidden md:flex bg-gray-100 text-gray-600 w-9 h-9 items-center justify-center rounded-full hover:bg-gray-200 hover:text-[#263238] transition-colors duration-200 border border-gray-200 shadow-sm"
                title="Manual"
            >
                <i className="fas fa-question text-sm"></i>
            </button>
          )}

          {userCredits !== undefined && (
             <div 
                onClick={onOpenPlans} 
                className="cursor-pointer hidden md:flex items-center space-x-2 border border-gray-200 bg-gray-50 px-3 py-1.5 rounded-full text-sm hover:bg-gray-100 transition shadow-sm"
                title="Gerenciar Plano e Créditos"
             >
              <i className="fas fa-coins text-[#F39C12]"></i>
              <span className="font-bold text-[#263238]">
                {userCredits === -1 ? '∞' : userCredits}
              </span>
              <span className="text-gray-400 text-xs hover:text-gray-600">+</span>
            </div>
          )}
          
          {isLoggedIn && onOpenPlans && (
            <button
                onClick={onOpenPlans}
                className="hidden lg:inline bg-[#F39C12] text-white px-4 py-2 rounded-lg hover:bg-orange-500 transition-colors duration-200 text-sm font-bold shadow-md shadow-orange-100"
            >
                Planos
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
                    className="bg-[#F39C12] hover:bg-orange-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition shadow-lg shadow-orange-100"
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