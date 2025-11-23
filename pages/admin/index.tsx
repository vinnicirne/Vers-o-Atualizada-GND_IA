import React, { useState } from 'react';
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
import { Toast } from '../../components/admin/Toast';
import { NewsArticle, AdminView } from '../../types';
import { updateNewsArticle, createUser, CreateUserPayload } from '../../services/adminService';
import { useUser } from '../../contexts/UserContext';

interface AdminPageProps {
  onNavigateToDashboard: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ onNavigateToDashboard }) => {
  const { user, signOut } = useUser();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  
  // State for modals
  const [editingNews, setEditingNews] = useState<NewsArticle | null>(null);
  const [isCreateUserModalOpen, setCreateUserModalOpen] = useState(false);
  
  // State for UI feedback and data refresh
  const [dataVersion, setDataVersion] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const refreshData = () => setDataVersion(v => v + 1);

  const handleLogout = async () => {
    await signOut();
  };
  
  // --- News Editing Handlers ---
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
  
  // --- User Creation Handlers ---
  const handleSaveNewUser = async (payload: CreateUserPayload) => {
    if (!user) {
      setToast({ message: "Sessão de administrador inválida.", type: 'error' });
      return;
    }
    try {
      await createUser(payload, user.id);
      setToast({ message: `Usuário ${payload.email} criado com sucesso!`, type: 'success' });
      setCreateUserModalOpen(false);
      refreshData(); // This will trigger a refresh in the UserTable
    } catch (error: any) {
      setToast({ message: error.message || 'Falha ao criar usuário.', type: 'error' });
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <>
            <MetricsCards />
            <TokenUsageChart />
          </>
        );
      case 'users':
        return <UserTable dataVersion={dataVersion} />;
      case 'news':
        return <NewsManager onEdit={handleOpenEditModal} dataVersion={dataVersion} />;
      case 'payments':
        return <PaymentsManager />;
      case 'multi_ia_system':
        return <MultiIASystem />;
      case 'logs':
        return <LogsViewer />;
      default:
        return (
          <>
            <MetricsCards />
            <TokenUsageChart />
          </>
        );
    }
  };
  
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-gray-300">
      <Header
        userEmail={user.email}
        onLogout={handleLogout}
        onNavigateToDashboard={onNavigateToDashboard}
        onNewUserClick={() => setCreateUserModalOpen(true)}
        pageTitle="Painel Administrativo"
        userCredits={user.credits}
        userRole={user.role}
      />
      <div className="container mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8">
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
        <main className="flex-grow">
          {renderContent()}
        </main>
      </div>
      
       {/* Modals and Toasts */}
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