import React from 'react';
import {
    Home,
    FileText,
    Image as ImageIcon,
    Mic,
    BarChart3,
    History,
    Plug,
    Lock,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Settings,
    Users,
    Layout,
    Star
} from 'lucide-react';
import { ServiceKey } from '../types/plan.types';
import { CREATOR_SUITE_MODES } from '../constants';
import { User } from '../types';

interface DashboardSidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    currentMode: ServiceKey | 'crm' | 'home';
    onModeChange: (mode: ServiceKey | 'crm' | 'home') => void;
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
    onNavigateFeedback
}: DashboardSidebarProps) {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    const handleModeSelection = (mode: ServiceKey | 'home' | 'crm') => {
        if (mode !== 'home' && mode !== 'crm') {
            const svcMode = mode as ServiceKey;
            if (isGuest && !guestAllowedModes.includes(svcMode)) {
                onModeChange(svcMode);
                return;
            }
            if (!hasAccessToService(svcMode)) {
                onModeChange(svcMode);
                return;
            }
        }
        onModeChange(mode);
        if (window.innerWidth < 768) setIsOpen(false);
    };

    // Helper to map ServiceKey to Lucide Icons
    const getIcon = (key: ServiceKey | 'home' | 'crm') => {
        switch (key) {
            case 'home': return Home;
            case 'news_generator': return FileText;
            case 'copy_generator': return Star;
            case 'prompt_generator': return BarChart3;
            case 'text_to_speech': return Mic;
            case 'curriculum_generator': return FileText;
            case 'social_media_poster': return ImageIcon;
            case 'landingpage_generator': return Layout;
            case 'image_generation': return ImageIcon;
            case 'canva_structure': return Layout;
            case 'crm': return Users;
            default: return FileText;
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                ></div>
            )}

            {/* SIDEBAR */}
            <aside className={`
                fixed md:static top-0 bottom-0 left-0 z-50 bg-gradient-to-b from-indigo-900 via-indigo-800 to-indigo-950 text-white flex flex-col transition-all duration-300 ease-in-out shadow-2xl shrink-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                ${isCollapsed ? 'md:w-20' : 'md:w-64'}
            `}>
                {/* Logo Area */}
                <div className="p-6 flex items-center justify-between border-b border-white/10">
                    {(!isCollapsed || window.innerWidth < 768) && (
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-indigo-500 rounded-lg">
                                <Star className="w-5 h-5 text-white fill-white" />
                            </div>
                            <span className="text-xl font-bold tracking-tight">GND_IA</span>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            if (window.innerWidth < 768) setIsOpen(false);
                            else setIsCollapsed(!isCollapsed);
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        {window.innerWidth < 768 ? <X className="w-6 h-6" /> : (isCollapsed ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />)}
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar scrollbar-hide">
                    {/* Home Item */}
                    <button
                        onClick={() => handleModeSelection('home')}
                        className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${currentMode === 'home'
                            ? 'bg-indigo-600 shadow-xl shadow-indigo-950/20 font-bold'
                            : 'hover:bg-white/5 text-indigo-100 hover:text-white'
                            }`}
                    >
                        <Home className={`${isCollapsed ? 'w-6 h-6 mx-auto' : 'w-5 h-5 mr-3'}`} />
                        {(!isCollapsed || window.innerWidth < 768) && <span>Início</span>}
                    </button>

                    <div className="pt-4 pb-2 px-2">
                        {(!isCollapsed || window.innerWidth < 768) && <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Ferramentas de IA</span>}
                        {isCollapsed && <div className="h-px bg-white/10 my-2"></div>}
                    </div>

                    {CREATOR_SUITE_MODES.map((svc) => {
                        const isSelected = currentMode === svc.value;
                        const isLocked = !hasAccessToService(svc.value);
                        const Icon = getIcon(svc.value);

                        return (
                            <button
                                key={svc.value}
                                onClick={() => handleModeSelection(svc.value)}
                                className={`w-full flex items-center px-4 py-3 rounded-xl transition-all group ${isSelected
                                    ? 'bg-indigo-600 shadow-lg shadow-indigo-950/20 font-bold'
                                    : 'hover:bg-white/5 text-indigo-100 hover:text-white'
                                    } ${isLocked ? 'opacity-50 grayscale' : ''}`}
                            >
                                <Icon className={`${isCollapsed ? 'w-6 h-6 mx-auto' : 'w-5 h-5 mr-3'}`} />
                                {(!isCollapsed || window.innerWidth < 768) && (
                                    <div className="flex-1 flex items-center justify-between">
                                        <span className="truncate">{svc.label}</span>
                                        {isLocked && <Lock className="w-3 h-3 text-indigo-400" />}
                                    </div>
                                )}
                            </button>
                        );
                    })}

                    {user && hasAccessToService('crm_suite') && (
                        <>
                            <div className="h-px bg-white/10 my-4"></div>
                            <button
                                onClick={() => handleModeSelection('crm')}
                                className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${currentMode === 'crm'
                                    ? 'bg-indigo-600 shadow-lg font-bold'
                                    : 'hover:bg-white/5 text-indigo-100'
                                    }`}
                            >
                                <Users className={`${isCollapsed ? 'w-6 h-6 mx-auto' : 'w-5 h-5 mr-3'}`} />
                                {(!isCollapsed || window.innerWidth < 768) && <span>CRM & Leads</span>}
                            </button>
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/10 space-y-1 bg-indigo-950/30">
                    <button
                        onClick={onOpenHistory}
                        className="w-full flex items-center px-4 py-3 rounded-xl hover:bg-white/5 text-indigo-100 transition-colors"
                    >
                        <History className={`${isCollapsed ? 'w-6 h-6 mx-auto' : 'w-5 h-5 mr-3'}`} />
                        {(!isCollapsed || window.innerWidth < 768) && <span>Histórico</span>}
                    </button>
                    <button
                        onClick={onOpenManual}
                        className="w-full flex items-center px-4 py-3 rounded-xl hover:bg-white/5 text-indigo-100 transition-colors"
                    >
                        <Settings className={`${isCollapsed ? 'w-6 h-6 mx-auto' : 'w-5 h-5 mr-3'}`} />
                        {(!isCollapsed || window.innerWidth < 768) && <span>Configurações</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
