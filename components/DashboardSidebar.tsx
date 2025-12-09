
import React from 'react';
import { ServiceKey } from '../types/plan.types';
import { CREATOR_SUITE_MODES, SERVICE_ICONS, SERVICE_COLORS } from '../constants'; // Importe SERVICE_ICONS e SERVICE_COLORS
import { User } from '../types';

interface DashboardSidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    currentMode: ServiceKey;
    onModeChange: (mode: ServiceKey) => void;
    user: User | null;
    isGuest: boolean;
    activeCredits: number;
    hasAccessToService: (key: ServiceKey) => boolean;
    guestAllowedModes: ServiceKey[];
    onOpenPlans: () => void;
    onOpenAffiliates: () => void;
    onOpenHistory: () => void;
    onOpenIntegrations: () => void;
    onOpenManual: () => void;
    onNavigateFeedback: () => void;
    onNavigateCRM?: () => void; // Novo callback
}

export function DashboardSidebar({
    isOpen,
    setIsOpen,
    currentMode,
    onModeChange,
    user,
    isGuest,
    activeCredits,
    hasAccessToService,
    guestAllowedModes,
    onOpenPlans,
    onOpenAffiliates,
    onOpenHistory,
    onOpenIntegrations,
    onOpenManual,
    onNavigateFeedback,
    onNavigateCRM
}: DashboardSidebarProps) {

    const handleModeSelection = (mode: ServiceKey) => {
        onModeChange(mode);
    };

    return (
        <>
            {/* SIDEBAR OVERLAY (Mobile) */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                ></div>
            )}

            {/* SIDEBAR */}
            <aside className={`
                fixed top-0 bottom-0 left-0 z-50 w-64 h-full bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none md:relative
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Mobile Header */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white md:hidden">
                    <span className="text-xs font-bold text-[#263238] uppercase tracking-wider">Ferramentas</span>
                    <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-red-500">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-white">
                    {/* CRM BUTTON HIGHLIGHTED */}
                    {!isGuest && onNavigateCRM && (
                        <div className="mb-4">
                            <button
                                onClick={() => {
                                    onNavigateCRM();
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center p-3 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/30 hover:scale-[1.02] transition-transform duration-200 group"
                            >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-white/20 text-white">
                                    <i className="fab fa-whatsapp text-lg"></i>
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-bold">CRM WhatsApp</p>
                                    <p className="text-[10px] text-green-100 opacity-90">Multi-atendimento</p>
                                </div>
                                <i className="fas fa-chevron-right text-xs opacity-60"></i>
                            </button>
                        </div>
                    )}

                    <div className="px-2 py-1">
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Criação IA</span>
                    </div>

                    {CREATOR_SUITE_MODES.map((svc) => {
                        const isSelected = currentMode === svc.value;
                        const isLocked = (isGuest && !guestAllowedModes.includes(svc.value)) || (!isGuest && !hasAccessToService(svc.value));
                        
                        const colorClasses = SERVICE_COLORS[svc.value] || 'text-gray-600 bg-gray-100';
                        const [textColor, bgColor] = colorClasses.split(' ');

                        return (
                            <button
                                key={svc.value}
                                onClick={() => handleModeSelection(svc.value)}
                                className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 text-left group
                                    ${isSelected 
                                        ? 'bg-gray-100 shadow-sm ring-1 ring-[#F39C12]' 
                                        : 'hover:bg-gray-50'
                                    }
                                    ${isLocked ? 'opacity-60 grayscale' : ''}
                                `}
                            >
                                <div className={`w-8 h-8 rounded-md flex items-center justify-center mr-3 ${bgColor} ${isSelected ? textColor : 'text-gray-500 bg-gray-100'}`}>
                                    <i className={`fas ${SERVICE_ICONS[svc.value]} text-sm`}></i>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[#263238]' : 'text-gray-600 group-hover:text-[#263238]'}`}>
                                        {svc.label}
                                    </p>
                                </div>

                                {isLocked && <i className="fas fa-lock text-xs text-gray-400 ml-2"></i>}
                            </button>
                        );
                    })}
                </div>

                {/* Menu Extra (Mobile Only) */}
                <div className={`p-3 border-t border-gray-200 bg-white space-y-2 md:hidden ${!user ? 'hidden' : ''}`}>
                    <div className="px-2 py-1">
                        <span className="text-[10px] font-extrabold text-gray-900 uppercase tracking-widest">Minha Conta</span>
                    </div>
                    
                    <button
                        onClick={() => { onOpenPlans(); setIsOpen(false); }}
                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[#263238] transition-colors group"
                    >
                        <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-[#F39C12] border border-gray-200 group-hover:border-[#F39C12]">
                            <i className="fas fa-coins text-xs"></i>
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-sm font-bold">Planos & Créditos</span>
                            <span className="text-[10px] text-gray-500 font-medium">Saldo: {activeCredits === -1 ? '∞' : activeCredits}</span>
                        </div>
                    </button>

                    <button
                        onClick={() => { onOpenAffiliates(); setIsOpen(false); }}
                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[#263238] transition-colors group"
                    >
                        <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-yellow-600 border border-gray-200 group-hover:border-yellow-600">
                            <i className="fas fa-handshake text-xs"></i>
                        </div>
                        <span className="text-sm font-bold">Afiliados</span>
                    </button>

                    <button
                        onClick={() => { onOpenHistory(); setIsOpen(false); }}
                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[#263238] transition-colors group"
                    >
                        <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-gray-600 border border-gray-200 group-hover:border-gray-600">
                            <i className="fas fa-history text-xs"></i>
                        </div>
                        <span className="text-sm font-bold">Meu Histórico</span>
                    </button>

                    <button
                        onClick={() => { onOpenIntegrations(); setIsOpen(false); }}
                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[#263238] transition-colors group"
                    >
                        <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-pink-600 border border-gray-200 group-hover:border-pink-600">
                            <i className="fas fa-plug text-xs"></i>
                        </div>
                        <span className="text-sm font-bold">Integrações</span>
                    </button>

                    <button
                        onClick={() => { onOpenManual(); setIsOpen(false); }}
                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[#263238] transition-colors group"
                    >
                        <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-blue-600 border border-gray-200 group-hover:border-blue-600">
                            <i className="fas fa-book text-xs"></i>
                        </div>
                        <span className="text-sm font-bold">Ajuda / Manual</span>
                    </button>

                    <button
                        onClick={() => { onNavigateFeedback(); setIsOpen(false); }}
                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[#263238] transition-colors group"
                    >
                        <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-green-600 border border-gray-300 group-hover:border-green-600">
                            <i className="fas fa-comment-dots text-xs"></i>
                        </div>
                        <span className="text-sm font-bold">Mural do Cliente</span>
                    </button>
                </div>
                
                {/* Link para Feedback Desktop */}
                {user && (
                    <div className="hidden md:block p-4 border-t border-gray-200">
                        <button 
                            onClick={onNavigateFeedback}
                            className="w-full bg-white border border-gray-300 text-gray-600 hover:text-green-600 hover:border-green-400 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-comment-dots"></i> Deixe seu Depoimento
                        </button>
                    </div>
                )}
            </aside>
        </>
    );
}
