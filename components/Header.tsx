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
}