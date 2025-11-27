
import React from 'react';
import { UserRole } from '../types';

interface HeaderProps {
  userEmail?: string;
  onLogout?: () => void;
  isAdmin?: boolean;
  onNavigateToAdmin?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToLogin?: () => void; // Novo prop para ir ao login
  onNewUserClick?: () => void;
  onOpenPlans?: () => void; 
  onOpenManual?: () => void; 
  onOpenHistory?: () => void;
  onOpenAffiliates?: () => void;
  pageTitle?: string;
  userCredits?: number;
  userRole?: UserRole;
  metadata?: { version: string }; 
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
    pageTitle, 
    userCredits, 
    userRole, 
    metadata 
}: HeaderProps) {
  const isAdminView = !!onNavigateToDashboard;
  const isLoggedIn = !!userEmail;

  if (isAdminView) {
    // New Admin Header Layout
    return (
      <header className="bg-black/80 backdrop-blur-md border-b border-green-500/30 sticky top-0 z-10 text-sm">
        {/* Top bar for user info and system status */}
        <div className="container mx-auto px-4 py-2 flex justify-between items-center border-b border-green-900/20">
          <div className="flex items-center space-x-4">
            <span className="text-gray-400">Admin:</span>
            <span className="font-bold text-white">{userEmail}</span>
            <span className="px-2 py-0.5 bg-green-900/50 text-green-300 text-xs rounded-full capitalize">{userRole?.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center space-x-6">
            {/* Status Badges */}
            <div className="flex items-center space-x-1.5 text-xs text-gray-500" title="Versão do Sistema">
              <i className="fas fa-code-branch"></i>
              <span className="font-semibold text-gray-400">v{metadata?.version || 'N/A'}</span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-gray-500" title="Ambiente">
              <i className="fas fa-server text-blue-400"></i>
              <span>Produção</span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-gray-500" title="Status do Sistema">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </div>
              <span>Online</span>
            </div>
          </div>
        </div>
        
        {/* Bottom bar for title, navigation and quick actions */}
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div>
             <h1 className="text-xl font-bold tracking-widest">
                <span className="text-gray-200">GDN_IA</span>
                <span className="text-green-400/80"> / {pageTitle}</span>
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            {/* Quick Actions */}
            <button 
              onClick={onNewUserClick}
              className="bg-green-600/80 text-black px-3 py-1.5 rounded-lg hover:bg-green-500 transition-colors duration-200 text-xs font-semibold border border-green-500/50"
            >
              <i className="fas fa-plus mr-2"></i>
              Novo Usuário
            </button>

            {/* Navigation */}
            {onNavigateToDashboard && (
                 <button
                  onClick={onNavigateToDashboard}
                  className="bg-gray-700/50 text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-600 hover:text-white transition-colors duration-200 text-xs font-semibold border border-gray-600"
                  title="Voltar para o Dashboard"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Dashboard
                </button>
            )}

            {onLogout && (
                 <button
                    onClick={onLogout}
                    className="bg-red-600/50 text-white px-3 py-1.5 rounded-lg hover:bg-red-500 transition-colors duration-200 text-xs font-semibold border border-red-500"
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

  // Original Dashboard Header Layout
  return (
    <header className="bg-black/80 backdrop-blur-md border-b border-green-500/30 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center relative">
        <div className="text-center flex-grow">
          <h1 className="text-3xl md:text-4xl font-bold tracking-widest">
            <span className="text-gray-200">GDN</span>
            <span className="text-green-400">_IA</span>
          </h1>
          <p className="text-center text-green-400/80 mt-1 text-sm md:text-base">{pageTitle || 'Seu Gerador de Notícias Inteligente'}</p>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-4">
          
          {isLoggedIn && onOpenAffiliates && (
             <button
                onClick={onOpenAffiliates}
                className="hidden lg:flex bg-yellow-600/20 text-yellow-400 w-9 h-9 items-center justify-center rounded-full hover:bg-yellow-600 hover:text-black transition-colors duration-200 border border-yellow-600/50"
                title="Programa de Afiliados (Ganhe Dinheiro)"
            >
                <i className="fas fa-handshake text-sm"></i>
            </button>
          )}

          {isLoggedIn && onOpenHistory && (
             <button
                onClick={onOpenHistory}
                className="hidden md:flex bg-gray-800 text-gray-300 w-9 h-9 items-center justify-center rounded-full hover:bg-gray-700 hover:text-white transition-colors duration-200 border border-gray-700"
                title="Meu Histórico"
            >
                <i className="fas fa-history text-sm"></i>
            </button>
          )}

          {/* Botão de Ajuda */}
          {onOpenManual && (
            <button
                onClick={onOpenManual}
                className="hidden md:flex bg-gray-800 text-gray-300 w-9 h-9 items-center justify-center rounded-full hover:bg-gray-700 hover:text-white transition-colors duration-200 border border-gray-700"
                title="Manual do Usuário"
            >
                <i className="fas fa-question text-sm"></i>
            </button>
          )}

          {userCredits !== undefined && (
             <div 
                onClick={onOpenPlans} 
                className="cursor-pointer hidden md:flex items-center space-x-2 border border-green-700/30 bg-black/30 px-3 py-1 rounded-full text-sm hover:bg-green-900/20 transition"
                title="Gerenciar Plano e Créditos"
             >
              <i className="fas fa-coins text-yellow-400"></i>
              <span className="font-bold text-white">
                {userCredits === -1 ? '∞' : userCredits}
              </span>
              <span className="text-gray-400 text-xs hover:text-white">+</span>
            </div>
          )}
          
          {/* Se estiver logado, mostra "Planos". Se não, não mostra botão extra (o login já leva lá) */}
          {isLoggedIn && onOpenPlans && (
            <button
                onClick={onOpenPlans}
                className="hidden lg:inline bg-purple-600/80 text-white px-3 py-2 rounded-lg hover:bg-purple-500 transition-colors duration-200 text-sm font-semibold border border-purple-500/50 shadow-lg shadow-purple-500/10"
            >
                <i className="fas fa-crown mr-2 text-yellow-300"></i>
                Planos
            </button>
          )}

          {isAdmin && onNavigateToAdmin && (
             <button
              onClick={onNavigateToAdmin}
              className="bg-green-600/80 text-black px-3 py-2 rounded-lg hover:bg-green-500 transition-colors duration-200 text-sm font-semibold border border-green-500/50"
              title="Painel Admin"
            >
              <i className="fas fa-user-shield"></i>
               <span className="hidden md:inline ml-2">Admin</span>
            </button>
          )}

           {onNavigateToDashboard && (
             <button
              onClick={onNavigateToDashboard}
              className="bg-gray-700/50 text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-600 hover:text-white transition-colors duration-200 text-sm font-semibold border border-gray-600"
              title="Voltar para o Dashboard"
            >
              <i className="fas fa-arrow-left"></i>
               <span className="hidden md:inline ml-2">Dashboard</span>
            </button>
          )}

          {isLoggedIn && onLogout ? (
              <button
                onClick={onLogout}
                className="bg-red-600/50 text-white px-3 py-2 rounded-lg hover:bg-red-500 transition-colors duration-200 text-sm font-semibold border border-red-500"
                title="Sair"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
          ) : (
             onNavigateToLogin && (
                 <button
                    onClick={onNavigateToLogin}
                    className="bg-green-600 hover:bg-green-500 text-black px-4 py-2 rounded-lg font-bold text-sm transition shadow-lg shadow-green-600/20"
                 >
                     <i className="fas fa-sign-in-alt mr-2"></i>
                     Entrar
                 </button>
             )
          )}
        </div>
      </div>
    </header>
  );
}
