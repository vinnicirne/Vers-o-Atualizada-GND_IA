

import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../../components/Header';
import { Sidebar } from '../../components/admin/Sidebar';
import { UserTable } from '../../components/admin/UserTable';
import { LogsViewer } from '../../components/admin/LogsViewer';
import { NewsEditModal } from '../../components/admin/NewsEditModal';
import { MetricsCards } from '../../components/admin/MetricsCards';
import { TokenUsageChart } from '../../components/admin/TokenUsageChart';
import { NewsManager } from '../../components/admin/NewsManager';
import { PaymentsManager } from '../../components/admin/PaymentsManager';
import { MultiIASystem } from '../../components/admin/MultiIASystem';
import { CreateUserModal } from '../../components/admin/CreateUserModal';
import { PlansManager } from '../../components/admin/PlansManager'; 
import { SecurityManager } from '../../components/admin/SecurityManager'; 
import { DocumentationViewer } from '../../components/admin/DocumentationViewer'; 
import { PopupManager } from '../../components/admin/PopupManager'; 
import { FeedbackManager } from '../../components/admin/FeedbackManager'; 
import { NotificationManager } from '../../components/admin/NotificationManager'; 
import { ToolManager } from '../../components/admin/ToolManager'; 
import { WhiteLabelManager } from '../../components/admin/WhiteLabelManager'; // NOVO
import { Toast } from '../../components/admin/Toast';
import { NewsArticle, AdminView } from '../../types';
import { updateNewsArticle, createUser, CreateUserPayload } from '../../services/adminService';
import { useUser } from '../../contexts/UserContext';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext'; // NOVO
import { downloadSitemap } from '../../services/sitemapService'; 
import { supabase } from '../../services/supabaseClient';

interface AdminPageProps {
  onNavigateToDashboard: () => void;
}

function AdminPage({ onNavigateToDashboard }: AdminPageProps) {
  const { user, signOut } = useUser();
  const { settings: whiteLabelSettings } = useWhiteLabel(); // Use White Label settings
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  
  const [editingNews, setEditingNews] = useState<NewsArticle | null>(null);
  const [isCreateUserModalOpen, setCreateUserModalOpen] = useState(false);
  
  const [dataVersion, setDataVersion] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('CONNECTING');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const refreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshData = () => {
      if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
      refreshTimeout.current = setTimeout(() => {
          console.log("Admin: Detectada mudança no banco. Atualizando...");
          setDataVersion(v => v + 1);
      }, 500);
  };

  useEffect(() => {
      const channel = supabase.channel('admin_dashboard_global')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, refreshData)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, refreshData)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, refreshData)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'logs' }, refreshData)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'system_feedbacks' }, refreshData) 
          .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, refreshData) // Monitorar system_config
          .subscribe((status) => {
              console.log(`[Admin] Realtime status: ${status}`);
              setRealtimeStatus(status);
          });

      return () => {
          supabase.removeChannel(channel);
          if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
      };
  }, []);

  const handleLogout = async () => {
    await signOut();
  };
  
  const handleOpenEditModal = (article: NewsArticle) => {
    setEditingNews(article);
  };

  const handleCloseEditModal = () => {
    setEditingNews(null);
  };

  const handleSaveNews = async (id: number, titulo: string, conteudo: string) => {
    if (!user) {
        setToast({ message: "Sessão de administrador inválida.", type: 'error' });
        return;
    }
    try {
      await updateNewsArticle(id, titulo, conteudo, user.id);
      setToast({ message: "Notícia atualizada com sucesso!", type: 'success' });
      handleCloseEditModal();
      refreshData();
    } catch (error: any) {
      setToast({ message: error.message || "Falha ao salvar o artigo de notícia.", type: 'error' });
    }
  };
  
  const handleSaveNewUser = async (payload: CreateUserPayload) => {
    if (!user) {
      setToast({ message: "Sessão de administrador inválida.", type: 'error' });
      return;
    }
    try {
      await createUser(payload, user.id);
      setToast({ message: `Usuário ${payload.email} criado com sucesso!`, type: 'success' });
      setCreateUserModalOpen(false);
      refreshData(); 
    } catch (error: any) {
      setToast({ message: error.message || 'Falha ao criar usuário.', type: 'error' });
    }
  };

  const handleDownloadSitemap = async () => {
      setToast({ message: "Gerando Sitemap...", type: 'success' });
      await downloadSitemap();
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <>
            <div className="flex justify-end mb-4">
                <button 
                    onClick={handleDownloadSitemap}
                    className="bg-white hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm border border-gray-200 shadow-sm flex items-center gap-2 transition-colors"
                >
                    <i className="fas fa-sitemap text-[var(--brand-primary)]"></i> Download Sitemap.xml
                </button>
            </div>
            <MetricsCards dataVersion={dataVersion} />
            <TokenUsageChart />
          </>
        );
      case 'users':
        return <UserTable dataVersion={dataVersion} />;
      case 'news':
        return <NewsManager onEdit={handleOpenEditModal} dataVersion={dataVersion} />;
      case 'payments':
        return <PaymentsManager dataVersion={dataVersion} />;
      case 'plans': 
        return <PlansManager />;
      case 'tool_settings': 
        return <ToolManager />;
      case 'white_label_settings': // NOVO
        return <WhiteLabelManager />;
      case 'popups': 
        return <PopupManager />;
      case 'feedbacks':
        return <FeedbackManager />;
      case 'notifications_push':
        return <NotificationManager />;
      case 'multi_ia_system':
        return <MultiIASystem />;
      case 'security': 
        return <SecurityManager />;
      case 'logs':
        return <LogsViewer dataVersion={dataVersion} />;
      case 'docs': 
        return <DocumentationViewer />;
      default:
        return (
          <>
            <MetricsCards dataVersion={dataVersion} />
            <TokenUsageChart />
          </>
        );
    }
  };
  
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#ECEFF1] text-[#263238]">
      <Header
        userEmail={user.email}
        onLogout={handleLogout}
        onNavigateToDashboard={onNavigateToDashboard}
        onNewUserClick={() => setCreateUserModalOpen(true)}
        pageTitle={whiteLabelSettings.appName + " Admin"} // Dynamic page title
        userCredits={user.credits}
        userRole={user.role}
        realtimeStatus={realtimeStatus} 
      />
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
        <main className="flex-grow p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
      
       {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

       {editingNews && (
        <NewsEditModal 
          article={editingNews}
          onSave={handleSaveNews}
          onClose={handleCloseEditModal}
        />
       )}

       {isCreateUserModalOpen && (
         <CreateUserModal
            onClose={() => setCreateUserModalOpen(false)}
            onSave={handleSaveNewUser}
         />
       )}
    </div>
  );
};

export default AdminPage;