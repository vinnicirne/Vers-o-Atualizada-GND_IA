import React from 'react';
import { Header } from '../components/Header';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { ContentGenerator } from '../components/ContentGenerator';
import { Toast } from '../components/admin/Toast';
import { useDashboard } from '../hooks/useDashboard';
import { DashboardResults } from '../components/dashboard/DashboardResults';
import { DashboardModals } from '../components/dashboard/DashboardModals';
import { useWhiteLabel } from '../contexts/WhiteLabelContext'; // Import useWhiteLabel

interface DashboardPageProps {
  onNavigateToAdmin: () => void;
  onNavigateToLogin: () => void;
  onNavigate: (page: string) => void;
}

export default function DashboardPage({ onNavigateToAdmin, onNavigateToLogin, onNavigate }: DashboardPageProps) {
  const { settings: whiteLabelSettings } = useWhiteLabel(); // Use White Label settings
  const {
      user,
      signOut, // Captura signOut do hook
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

  return (
    <div className="min-h-screen bg-[#ECEFF1] text-[#263238] font-['Poppins']">
      <Header
        userEmail={user?.email}
        onLogout={user ? signOut : undefined} // Passa signOut diretamente
        isAdmin={user?.role === 'admin' || user?.role === 'super_admin'}
        onNavigateToAdmin={onNavigateToAdmin}
        onNavigateToLogin={!user ? onNavigateToLogin : undefined}
        onOpenPlans={() => toggleModal('plans', true)}
        onOpenManual={() => toggleModal('manual', true)}
        onOpenHistory={() => toggleModal('history', true)}
        onOpenAffiliates={() => toggleModal('affiliate', true)}
        onOpenIntegrations={() => toggleModal('integrations', true)}
        userCredits={isGuest ? guestCredits : user?.credits}
        pageTitle={whiteLabelSettings.dashboardTitle} // Use dynamic dashboard title
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        
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
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative custom-scrollbar bg-[#F5F7FA]">
            <div className="max-w-5xl mx-auto">
                
                {/* GENERATOR INPUT */}
                <ContentGenerator 
                    mode={currentMode}
                    onModeChange={handleModeChange}
                    onGenerate={handleGenerateContent}
                    isLoading={isLoading}
                    isGuest={isGuest}
                    guestAllowedModes={GUEST_ALLOWED_MODES}
                />

                {/* ERROR DISPLAY */}
                {error && (
                    <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded shadow-sm animate-fade-in" role="alert">
                        <p className="font-bold">Erro</p>
                        <p>{error}</p>
                    </div>
                )}

                {/* RESULTS AREA */}
                <DashboardResults 
                    currentMode={currentMode}
                    results={results}
                    isLoading={isLoading}
                    user={user}
                    onCloseEditor={() => updateResultText(null)}
                    showFeedback={showFeedback}
                    onCloseFeedback={() => setShowFeedback(false)}
                />

                {/* MARKETING FOOTER FOR GUESTS */}
                {isGuest && (
                    <div className="mt-12 p-6 bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl text-center text-white shadow-xl animate-fade-in">
                        <h3 className="text-xl font-bold mb-2">{whiteLabelSettings.guestMarketingFooterTitle}</h3>
                        <p className="text-gray-300 mb-6 text-sm">{whiteLabelSettings.guestMarketingFooterSubtitle}</p>
                        <button 
                            onClick={onNavigateToLogin}
                            className="bg-[var(--brand-tertiary)] hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full transition transform hover:-translate-y-1 shadow-lg shadow-[var(--brand-tertiary)]/30"
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