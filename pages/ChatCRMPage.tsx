
import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { usePlan } from '../hooks/usePlan';
import { WhatsAppInstance, ChatContact } from '../types';
import { InstanceSettings } from '../components/crm/InstanceSettings';
import { ChatInterface } from '../components/crm/ChatInterface';
import { Header } from '../components/Header';

interface ChatCRMPageProps {
    onNavigateToDashboard: () => void;
}

// MOCK DATA PARA DEMONSTRAÇÃO
const MOCK_INSTANCES: WhatsAppInstance[] = [
    { id: '1', user_id: 'user1', name: 'Suporte Principal', status: 'connected', api_provider: 'evolution', created_at: new Date().toISOString() },
];

const MOCK_CONTACTS: ChatContact[] = [
    { id: 'c1', name: 'João Silva', phone: '5511999998888', last_message: 'Gostaria de saber sobre os planos.', last_message_time: '10:30', unread_count: 2, instance_id: '1' },
    { id: 'c2', name: 'Maria Souza', phone: '5511977776666', last_message: 'Obrigado pelo atendimento!', last_message_time: 'Ontem', unread_count: 0, instance_id: '1' },
    { id: 'c3', name: 'Pedro Tech', phone: '5521988887777', last_message: 'A API está instável?', last_message_time: 'Ontem', unread_count: 0, instance_id: '1' },
];

export default function ChatCRMPage({ onNavigateToDashboard }: ChatCRMPageProps) {
    const { user } = useUser();
    const { currentPlan } = usePlan();
    
    const [activeView, setActiveView] = useState<'chat' | 'settings'>('chat');
    const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
    const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
    const [loading, setLoading] = useState(true);

    // Initial Load
    useEffect(() => {
        // Simulando fetch do backend
        setTimeout(() => {
            setInstances(MOCK_INSTANCES);
            if (MOCK_INSTANCES.length > 0) {
                setSelectedInstance(MOCK_INSTANCES[0]);
            } else {
                setActiveView('settings'); // Se não tiver instância, vai pra config
            }
            setLoading(false);
        }, 800);
    }, []);

    const handleAddInstance = (newInstance: WhatsAppInstance) => {
        setInstances([...instances, newInstance]);
        setActiveView('chat');
        setSelectedInstance(newInstance);
    };

    const handleDeleteInstance = (id: string) => {
        const updated = instances.filter(i => i.id !== id);
        setInstances(updated);
        if (selectedInstance?.id === id) {
            setSelectedInstance(updated.length > 0 ? updated[0] : null);
            if (updated.length === 0) setActiveView('settings');
        }
    };

    // Limits
    const maxInstances = currentPlan.maxWhatsAppInstances || 0;
    const canAddMore = instances.length < maxInstances;

    return (
        <div className="h-screen bg-[#F0F2F5] flex flex-col overflow-hidden font-sans">
            {/* Custom Header for CRM Mode */}
            <div className="bg-[#00A884] h-16 flex items-center justify-between px-4 text-white shadow-md z-20 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onNavigateToDashboard} className="hover:bg-white/10 p-2 rounded-full transition">
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">CRM WhatsApp</h1>
                        <p className="text-xs opacity-90">Multi-atendimento</p>
                    </div>
                </div>
                
                <div className="flex items-center bg-[#008F6F] rounded-lg p-1">
                    <button 
                        onClick={() => setActiveView('chat')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2 ${activeView === 'chat' ? 'bg-white text-[#00A884] shadow-sm' : 'text-white hover:bg-white/10'}`}
                    >
                        <i className="fas fa-comments"></i> Conversas
                    </button>
                    <button 
                        onClick={() => setActiveView('settings')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2 ${activeView === 'settings' ? 'bg-white text-[#00A884] shadow-sm' : 'text-white hover:bg-white/10'}`}
                    >
                        <i className="fas fa-cog"></i> Configurações
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Background Pattern */}
                <div className="absolute top-0 w-full h-32 bg-[#00A884] z-0"></div>
                
                <div className="flex-1 z-10 p-4 h-full flex flex-col max-w-[1600px] mx-auto w-full">
                    <div className="bg-white rounded-xl shadow-xl flex-1 overflow-hidden border border-gray-200 flex">
                        
                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                <i className="fas fa-circle-notch fa-spin text-4xl mb-4 text-[#00A884]"></i>
                                <p>Carregando sistema...</p>
                            </div>
                        ) : (
                            <>
                                {activeView === 'settings' ? (
                                    <InstanceSettings 
                                        instances={instances}
                                        onAdd={handleAddInstance}
                                        onDelete={handleDeleteInstance}
                                        maxInstances={maxInstances}
                                        canAddMore={canAddMore}
                                        planName={currentPlan.name}
                                    />
                                ) : (
                                    <ChatInterface 
                                        instances={instances}
                                        selectedInstance={selectedInstance}
                                        onSelectInstance={setSelectedInstance}
                                        contacts={MOCK_CONTACTS} // Em produção viria do DB
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
