
import React from 'react';
import { useUser } from '../contexts/UserContext';
import { CRMManager } from '../components/admin/CRMManager'; // Admin View
import { ClientCRM } from '../components/crm/ClientCRM'; // User View
import { Header } from '../components/Header'; // Reusing Header for consistency

interface CRMPageProps {
    onNavigateToDashboard: () => void;
}

export default function CRMPage({ onNavigateToDashboard }: CRMPageProps) {
    const { user } = useUser();

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p className="text-gray-500">Faça login para acessar o CRM.</p>
            </div>
        );
    }

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';

    return (
        <div className="min-h-screen bg-[#F0F2F5] font-['Poppins']">
            {/* Custom Header for CRM Page */}
            <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 justify-between sticky top-0 z-30 shadow-sm">
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
                
                {isAdmin && (
                    <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200">
                        Modo Administrador (Visão do Sistema)
                    </div>
                )}
            </header>

            <main className="p-6 max-w-7xl mx-auto">
                {isAdmin ? (
                    <div className="space-y-6">
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
                    <div className="space-y-6">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Seus Clientes</h2>
                                <p className="text-gray-500 text-sm">Gerencie os contatos capturados pelo Chat e Landing Pages.</p>
                            </div>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition">
                                <i className="fas fa-plus mr-2"></i> Adicionar Manualmente
                            </button>
                        </div>
                        <ClientCRM userId={user.id} />
                    </div>
                )}
            </main>
        </div>
    );
}
