
import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { usePlan } from '../hooks/usePlan';
import { CRMManager } from '../components/admin/CRMManager'; // Admin View
import { ClientCRM } from '../components/crm/ClientCRM'; // User View
import { MultiChatLayout } from '../components/chat/MultiChatLayout'; // Chat View
import { CRMSettings } from '../components/crm/CRMSettings'; // Settings View
import { Header } from '../components/Header'; // Reusing Header for consistency
import { PlansModal } from '../components/PlansModal';

interface CRMPageProps {
    onNavigateToDashboard: () => void;
}

export default function CRMPage({ onNavigateToDashboard }: CRMPageProps) {
    const { user } = useUser();
    const { hasAccessToService } = usePlan();
    const [showPlans, setShowPlans] = useState(false);
    const [activeTab, setActiveTab] = useState<'leads' | 'chat' | 'settings'>('leads');

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 font-['Poppins']">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">Faça login para acessar o CRM.</p>
                    <button onClick={onNavigateToDashboard} className="text-blue-600 hover:underline">Voltar</button>
                </div>
            </div>
        );
    }

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const canAccessCRM = hasAccessToService('crm');

    // Access Denied State
    if (!isAdmin && !canAccessCRM) {
        return (
            <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4 font-['Poppins']">
                {showPlans && (
                    <PlansModal 
                        currentPlanId={user.plan} 
                        onClose={() => setShowPlans(false)}
                        onSelectPlan={() => {}} 
                        onBuyCredits={() => {}} 
                    />
                )}
                
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border-t-8 border-blue-600">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
                        <i className="fas fa-lock text-4xl"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">CRM Bloqueado</h2>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        A gestão de leads e vendas está disponível apenas nos planos <strong>Básico</strong>, <strong>Standard</strong> e <strong>Premium</strong>.
                    </p>
                    <div className="space-y-3">
                        <button 
                            onClick={() => setShowPlans(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition transform hover:-translate-y-0.5"
                        >
                            Ver Planos & Upgrade
                        </button>
                        <button 
                            onClick={onNavigateToDashboard}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition"
                        >
                            Voltar ao Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        if (isAdmin) return <CRMManager />;
        
        switch (activeTab) {
            case 'leads': return <ClientCRM userId={user.id} />;
            case 'chat': return <div className="h-full"><MultiChatLayout user={user} /></div>;
            case 'settings': return <CRMSettings user={user} />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#F0F2F5] font-['Poppins'] flex flex-col">
            {/* Custom Header for CRM Page */}
            <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 justify-between sticky top-0 z-30 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onNavigateToDashboard} className="text-gray-500 hover:text-gray-800 transition">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-[#263238] flex items-center gap-2">
                            <span className="bg-blue-600 text-white w-8 h-8 flex items-center justify-center rounded-lg text-sm shadow-md shadow-blue-200">
                                <i className="fas fa-users"></i>
                            </span>
                            CRM & Gestão
                        </h1>
                    </div>
                </div>
                
                {isAdmin ? (
                    <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200">
                        Modo Administrador (Visão do Sistema)
                    </div>
                ) : (
                    /* Tabs para Usuário Final */
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('leads')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'leads' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <i className="fas fa-columns text-xs"></i> Leads
                        </button>
                        <button 
                            onClick={() => setActiveTab('chat')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'chat' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <i className="fab fa-whatsapp text-xs"></i> Chat
                        </button>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <i className="fas fa-cog text-xs"></i> Configurações
                        </button>
                    </div>
                )}
            </header>

            <main className={`flex-1 overflow-hidden flex flex-col ${activeTab === 'chat' ? 'bg-gray-100' : 'p-6 overflow-y-auto'}`}>
                {isAdmin ? (
                    <div className="space-y-6 max-w-7xl mx-auto w-full">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 items-start mb-6">
                            <i className="fas fa-info-circle text-blue-500 mt-1"></i>
                            <div>
                                <h3 className="font-bold text-blue-800 text-sm">Visão do Sistema (Admin)</h3>
                                <p className="text-xs text-blue-600">
                                    Aqui você gerencia os <strong>Leads do Sistema</strong> (pessoas que se cadastraram na Landing Page do SaaS). 
                                    Para ver o CRM de um cliente específico, acesse "Usuários" e "Ver Detalhes".
                                </p>
                            </div>
                        </div>
                        <CRMManager />
                    </div>
                ) : (
                    activeTab === 'chat' ? (
                        <div className="h-full flex flex-col">
                            <MultiChatLayout user={user} />
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto space-y-6 w-full">
                            {renderContent()}
                        </div>
                    )
                )}
            </main>
        </div>
    );
}
