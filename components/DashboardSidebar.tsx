
import React from 'react';
import { ServiceKey } from '../types/plan.types';
import { CREATOR_SUITE_MODES, SERVICE_ICONS } from '../constants'; // SERVICE_COLORS não será mais usado diretamente
import { User } from '../types';

interface DashboardSidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    currentMode: ServiceKey; // Removed 'crm' from union type
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
}: DashboardSidebarProps) {

    const handleModeSelection = (mode: ServiceKey) => {
        if (isGuest && !guestAllowedModes.includes(mode)) {
            onModeChange(mode); 
            return;
        }

        if (!hasAccessToService(mode)) {
            onModeChange(mode); 
            return;
        }

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
                    <span className="text-xs font-bold text-[var(--brand-secondary)] uppercase tracking-wider">Ferramentas</span>
                    <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-red-500">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-white">
                    
                    {/* BOTÃO ESPECIAL CRM / WHATICKET */}
                    {hasAccessToService('crm_suite') && (
                        <button
                            onClick={() => handleModeSelection('crm_suite')}
                            className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 text-left mb-4 shadow-sm border
                                ${currentMode === 'crm_suite' 
                                    ? 'bg-blue-600 text-white border-blue-700 shadow-blue-200' 
                                    : 'bg-white hover:bg-blue-50 text-blue-900 border-blue-100 hover:border-blue-200'
                                }
                            `}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${currentMode === 'crm_suite' ? 'bg-white/20' : 'bg-blue-100'}`}>
                                <i className={`fab fa-whatsapp text-lg ${currentMode === 'crm_suite' ? 'text-white' : 'text-blue-600'}`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wider">Central de Atendimento</p>
                                <p className={`text-[10px] truncate ${currentMode === 'crm_suite' ? 'text-blue-100' : 'text-blue-400'}`}>CRM 360º • Multi-agente</p>
                            </div>
                        </button>
                    )}

                    <div className="h-px bg-gray-100 my-2"></div>

                    {CREATOR_SUITE_MODES.map((svc) => {
                        const isSelected = currentMode === svc.value;
                        const isLocked = !hasAccessToService(svc.value); 
                        const iconClass = SERVICE_ICONS[svc.value] || 'fa-question'; 

                        let iconBgColor = 'bg-gray-100';
                        let iconTextColor = 'text-gray-500';

                        if (isSelected && !isLocked) {
                            iconBgColor = 'bg-[var(--brand-primary)]/[0.1]';
                            iconTextColor = 'text-[var(--brand-primary)]';
                        } else if (!isSelected && !isLocked) {
                            iconBgColor = 'bg-gray-100';
                            iconTextColor = 'text-gray-500';
                        } else if (isLocked) {
                            iconBgColor = 'bg-gray-50';
                            iconTextColor = 'text-gray-400';
                        }

                        return (
                            <button
                                key={svc.value}
                                onClick={() => handleModeSelection(svc.value)}
                                className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 text-left group
                                    ${isSelected 
                                        ? 'bg-gray-100 shadow-sm ring-1 ring-[var(--brand-primary)]' 
                                        : 'hover:bg-gray-50'
                                    }
                                    ${isLocked ? 'opacity-60 grayscale cursor-not-allowed' : ''}
                                `}
                                disabled={isLocked}
                            >
                                <div className={`w-8 h-8 rounded-md flex items-center justify-center mr-3 ${iconBgColor} ${iconTextColor}`}>
                                    <i className={`fas ${iconClass} text-sm`}></i>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[var(--brand-secondary)]' : 'text-gray-600 group-hover:text-[var(--brand-secondary)]'}`}>
                                        {svc.label}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5 truncate">{svc.placeholder}</p>
                                </div>

                                {isLocked && <i className="fas fa-lock text-xs text-gray-400 ml-2"></i>}
                            </button>
                        );
                    })}
                </div>

                {/* Menu Extra (Mobile Only) */}
                <div className={`p-3 border-t border-gray-200 bg-white space-y-2 md:hidden ${!user ? 'hidden' : ''}`}>
                    <div className="px-2 py-1">
                        <span className="text-[10px] font-extrabold text-[var(--brand-secondary)] uppercase tracking-widest">Minha Conta</span>
                    </div>
                    
                    <button
                        onClick={() => { onOpenPlans(); setIsOpen(false); }}
                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[var(--brand-secondary)] transition-colors group"
                    >
                        <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-[var(--brand-primary)] border border-gray-200 group-hover:border-[var(--brand-primary)]">
                            <i className="fas fa-coins text-xs"></i>
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-sm font-bold">Planos & Créditos</span>
                            <span className="text-[10px] text-gray-500 font-medium">Saldo: {activeCredits === -1 ? '∞' : activeCredits}</span>
                        </div>
                    </button>

                    <button
                        onClick={() => { onOpenAffiliates(); setIsOpen(false); }}
                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[var(--brand-secondary)] transition-colors group"
                    >
                        <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-yellow-600 border border-gray-200 group-hover:border-yellow-600">
                            <i className="fas fa-handshake text-xs"></i>
                        </div>
                        <span className="text-sm font-bold">Afiliados</span>
                    </button>

                    <button
                        onClick={() => { onOpenHistory(); setIsOpen(false); }}
                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[var(--brand-secondary)] transition-colors group"
                    >
                        <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-gray-600 border border-gray-200 group-hover:border-gray-600">
                            <i className="fas fa-history text-xs"></i>
                        </div>
                        <span className="text-sm font-bold">Meu Histórico</span>
                    </button>

                    <button
                        onClick={() => { onOpenIntegrations(); setIsOpen(false); }}
                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[var(--brand-secondary)] transition-colors group"
                    >
                        <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-pink-600 border border-gray-200 group-hover:border-pink-600">
                            <i className="fas fa-plug text-xs"></i>
                        </div>
                        <span className="text-sm font-bold">Integrações</span>
                    </button>

                    <button
                        onClick={() => { onOpenManual(); setIsOpen(false); }}
                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[var(--brand-secondary)] transition-colors group"
                    >
                        <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-blue-600 border border-gray-200 group-hover:border-blue-600">
                            <i className="fas fa-book text-xs"></i>
                        </div>
                        <span className="text-sm font-bold">Ajuda / Manual</span>
                    </button>

                    <button
                        onClick={() => { onNavigateFeedback(); setIsOpen(false); }}
                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[var(--brand-secondary)] transition-colors group"
                    >
                        <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-[var(--brand-tertiary)] border border-gray-300 group-hover:border-[var(--brand-tertiary)]">
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
                            className="w-full bg-white border border-gray-300 text-gray-600 hover:text-[var(--brand-tertiary)] hover:border-[var(--brand-tertiary-dark)] px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-comment-dots"></i> Deixe seu Depoimento
                        </button>
                    </div>
                )}
            </aside>
        </>
    );
}