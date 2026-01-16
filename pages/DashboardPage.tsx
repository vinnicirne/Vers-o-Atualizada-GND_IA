import React from 'react';
import { Header } from '../components/Header';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { ContentGenerator } from '../components/ContentGenerator';
import { Toast } from '../components/admin/Toast';
import { useDashboard } from '../hooks/useDashboard';
import { DashboardResults } from '../components/dashboard/DashboardResults';
import { DashboardModals } from '../components/dashboard/DashboardModals';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { CrmDashboard } from '../components/crm/CrmDashboard';
import { DashboardHome } from '../components/dashboard/DashboardHome';
import { ServiceKey } from '../types/plan.types';
import { Users, AlertTriangle } from 'lucide-react';

interface DashboardPageProps {
    onNavigateToAdmin: () => void;
    onNavigateToLogin: () => void;
    onNavigate: (page: string) => void;
}

export default function DashboardPage({ onNavigateToAdmin, onNavigateToLogin, onNavigate }: DashboardPageProps) {
    const { settings: whiteLabelSettings } = useWhiteLabel();
    const {
        user,
        isGuest,
        guestCredits,
        GUEST_ALLOWED_MODES,
        sidebarOpen,
        setSidebarOpen,
        currentMode,
        isLoading,
        error,
        toast,
        setToast,
        results,
        updateResultText,
        showFeedback,
        setShowFeedback,
        modals,
        toggleModal,
        handleModeChange,
        handleGenerateContent,
        hasAccessToService
    } = useDashboard();

    const handleLogout = async () => {
        const { supabase } = await import('../services/supabaseClient');
        await supabase.auth.signOut();
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            <Header
                userEmail={user?.email}
                onLogout={handleLogout}
                isAdmin={user?.role === 'admin' || user?.role === 'super_admin'}
                onNavigateToAdmin={onNavigateToAdmin}
                onNavigateToLogin={!user ? onNavigateToLogin : undefined}
                onOpenPlans={() => toggleModal('plans', true)}
                onOpenManual={() => toggleModal('manual', true)}
                onOpenHistory={() => toggleModal('history', true)}
                onOpenAffiliates={() => toggleModal('affiliate', true)}
                onOpenIntegrations={() => toggleModal('integrations', true)}
                userCredits={isGuest ? guestCredits : user?.credits}
                userRole={user?.role}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            />

            <div className="flex h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)] overflow-hidden relative">
                {/* Mobile Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* SIDEBAR */}
                <DashboardSidebar
                    isOpen={sidebarOpen}
                    setIsOpen={setSidebarOpen}
                    currentMode={currentMode}
                    onModeChange={handleModeChange}
                    user={user}
                    isGuest={isGuest}
                    activeCredits={isGuest ? guestCredits : (user?.credits || 0)}
                    hasAccessToService={hasAccessToService}
                    guestAllowedModes={GUEST_ALLOWED_MODES}
                    onOpenPlans={() => toggleModal('plans', true)}
                    onOpenAffiliates={() => toggleModal('affiliate', true)}
                    onOpenHistory={() => toggleModal('history', true)}
                    onOpenIntegrations={() => toggleModal('integrations', true)}
                    onOpenManual={() => toggleModal('manual', true)}
                    onNavigateFeedback={() => onNavigate('feedback')}
                />

                {/* MAIN CONTENT */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 lg:p-12 relative custom-scrollbar bg-slate-50 min-w-0">
                    <div className="max-w-7xl mx-auto">

                        {/* CONDITIONAL RENDER: HOME, CRM OR GENERATOR */}
                        {currentMode === 'home' ? (
                            <DashboardHome
                                userEmail={user?.email}
                                userCredits={isGuest ? guestCredits : user?.credits}
                                userPlan={user?.role?.replace('_', ' ')}
                                onStartService={(mode) => handleModeChange(mode)}
                            />
                        ) : currentMode === 'crm' ? (
                            <div className="animate-fade-in-up">
                                <div className="mb-8">
                                    <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
                                        <Users className="w-8 h-8 text-indigo-600" /> CRM & Leads
                                    </h2>
                                    <p className="text-slate-500 font-medium">Controle total sobre os leads gerados em suas campanhas.</p>
                                </div>
                                <CrmDashboard />
                            </div>
                        ) : (
                            <div className="max-w-5xl mx-auto space-y-8">
                                {/* GENERATOR INPUT */}
                                <div className="animate-fade-in-up">
                                    <ContentGenerator
                                        mode={currentMode as ServiceKey}
                                        onModeChange={(m) => handleModeChange(m)}
                                        onGenerate={handleGenerateContent}
                                        isLoading={isLoading}
                                        isGuest={isGuest}
                                        guestAllowedModes={GUEST_ALLOWED_MODES}
                                    />
                                </div>

                                {/* ERROR DISPLAY */}
                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl shadow-sm animate-shake flex items-center gap-3" role="alert">
                                        <div className="p-2 bg-red-100 rounded-lg">
                                            <AlertTriangle className="w-5 h-5 text-red-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">Ops! Algo deu errado</p>
                                            <p className="text-xs opacity-80">{error}</p>
                                        </div>
                                    </div>
                                )}

                                {/* RESULTS AREA */}
                                <DashboardResults
                                    currentMode={currentMode as ServiceKey}
                                    results={results}
                                    isLoading={isLoading}
                                    user={user}
                                    onCloseEditor={() => updateResultText(null)}
                                    showFeedback={showFeedback}
                                    onCloseFeedback={() => setShowFeedback(false)}
                                />
                            </div>
                        )}

                        {/* MARKETING FOOTER FOR GUESTS */}
                        {isGuest && currentMode !== 'home' && (
                            <div className="mt-16 p-8 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl text-center text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-110"></div>
                                <h3 className="text-2xl font-bold mb-3 relative z-10">{whiteLabelSettings.guestMarketingFooterTitle}</h3>
                                <p className="text-indigo-200 mb-8 text-sm max-w-lg mx-auto relative z-10">{whiteLabelSettings.guestMarketingFooterSubtitle}</p>
                                <button
                                    onClick={onNavigateToLogin}
                                    className="relative z-10 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-10 rounded-2xl transition-all transform hover:-translate-y-1 shadow-xl shadow-indigo-500/20 active:scale-95"
                                >
                                    {whiteLabelSettings.guestMarketingFooterCtaText}
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* MODALS */}
            <DashboardModals
                modals={modals}
                toggleModal={toggleModal}
                user={user}
                onNavigateToLogin={onNavigateToLogin}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
