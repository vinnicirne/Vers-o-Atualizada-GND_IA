<<<<<<< HEAD


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
    onToggleSidebar
}: HeaderProps) {
  const { settings } = useWhiteLabel(); // Use white label settings
  const isAdminView = !!onNavigateToDashboard;
  const isLoggedIn = !!userEmail;

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
                title="Gerenciar Plano e Créditos"
             >
              <i className="fas fa-coins text-[var(--brand-primary)]"></i>
              <span className="font-bold text-[var(--brand-secondary)]">
                {userCredits === -1 ? '∞' : userCredits}
              </span>
              <span className="text-gray-400 text-xs hover:text-gray-600">+</span>
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
=======
import React from 'react';
import {
    Search,
    Bell,
    Plus,
    User as UserIcon,
    LogOut,
    Menu,
    ShieldCheck,
    Coins,
    ArrowLeft
} from 'lucide-react';
import { UserRole } from '../types';
import { NotificationBell } from './NotificationBell';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';

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
    userCredits,
    userRole,
    onToggleSidebar
}: HeaderProps) {
    const { settings } = useWhiteLabel();
    const isAdminView = !!onNavigateToDashboard;
    const isLoggedIn = !!userEmail;

    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 h-16 sm:h-20 shadow-sm">
            <div className="h-full px-4 sm:px-8 flex items-center justify-between">

                {/* Left: Mobile Toggle & Context */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onToggleSidebar}
                        className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    {!isAdminView && (
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
                            <div className={`w-2 h-2 rounded-full ${userCredits && userCredits > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">AI Network Stable</span>
                        </div>
                    )}
                </div>

                {/* Center: Search (Desktop) */}
                {!isAdminView && (
                    <div className="hidden md:flex flex-1 max-w-xl mx-8">
                        <div className="relative w-full group">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="O que você quer criar hoje? Ex: Site de imóveis..."
                                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                            />
                        </div>
                    </div>
                )}

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 sm:space-x-4">

                    {/* Credits (Always visible if logged in) */}
                    {isLoggedIn && userCredits !== undefined && (
                        <div
                            onClick={onOpenPlans}
                            className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full cursor-pointer hover:bg-amber-100 transition-colors shadow-sm shadow-amber-50"
                        >
                            <Coins className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-bold text-amber-900">
                                {userCredits === -1 ? '∞' : userCredits}
                            </span>
                        </div>
                    )}

                    {/* Admin/User Context Buttons */}
                    <div className="hidden sm:flex items-center space-x-2">
                        {isAdmin && onNavigateToAdmin && !isAdminView && (
                            <button
                                onClick={onNavigateToAdmin}
                                className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                title="Painel Admin"
                            >
                                <ShieldCheck className="w-5 h-5" />
                            </button>
                        )}

                        {isAdminView && onNavigateToDashboard && (
                            <button
                                onClick={onNavigateToDashboard}
                                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-bold text-sm"
                            >
                                <ArrowLeft className="w-4 h-4" /> App
                            </button>
                        )}
                    </div>

                    <NotificationBell />

                    {/* Main CTA */}
                    {isLoggedIn && !isAdminView && (
                        <button
                            onClick={onOpenPlans}
                            className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all"
                        >
                            <Plus className="w-4 h-4" /> Upgrade Pro
                        </button>
                    )}

                    {/* User Profile / Login */}
                    {isLoggedIn ? (
                        <div className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-slate-100">
                            <div className="hidden lg:block text-right">
                                <p className="text-sm font-bold text-slate-800 leading-none truncate max-w-[120px]">
                                    {userEmail?.split('@')[0]}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                    {userRole || 'Usuário'}
                                </p>
                            </div>
                            <div className="group relative">
                                <button className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200 hover:scale-105 transition-transform">
                                    {userEmail?.charAt(0).toUpperCase()}
                                </button>
                                {/* Simple Dropdown on hover/click could go here */}
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-50">
                                    <button
                                        onClick={onLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-bold"
                                    >
                                        <LogOut className="w-4 h-4" /> Sair da Conta
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        onNavigateToLogin && (
                            <button
                                onClick={onNavigateToLogin}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                            >
                                Entrar
                            </button>
                        )
                    )}

                </div>
            </div>
        </header>
    );
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
}