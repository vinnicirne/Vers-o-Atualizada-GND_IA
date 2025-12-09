
import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { CrmDashboard } from '../components/crm/CrmDashboard';
import { ChatConnection } from '../types';
import { useUser } from '../contexts/UserContext';
import { useDashboard } from '../hooks/useDashboard';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { api } from '../services/api';
import { fetchRemoteStatus, fetchRemoteQrCode } from '../services/chatService';

interface ChatCrmPageProps {
    onNavigateToDashboard: () => void;
}

export default function ChatCrmPage({ onNavigateToDashboard }: ChatCrmPageProps) {
    const { user } = useUser();
    const { settings } = useWhiteLabel();
    const { 
        sidebarOpen, 
        setSidebarOpen, 
        GUEST_ALLOWED_MODES, 
        isGuest, 
        guestCredits,
        hasAccessToService,
        toggleModal
    } = useDashboard();

    const [connection, setConnection] = useState<ChatConnection | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'qrcode' | 'pairing'>('disconnected');
    const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
    const pollingRef = useRef<any>(null);

    // Carrega a conexão do banco
    useEffect(() => {
        if (!user) return;
        const loadConnection = async () => {
            try {
                const { data } = await api.select('chat_connections', { user_id: user.id });
                if (data && data.length > 0) {
                    setConnection(data[0] as ChatConnection);
                } else {
                    // Cria objeto temporário se não existir (o usuário salvará no modal)
                    setConnection({
                        user_id: user.id,
                        name: 'WhatsApp Principal',
                        status: 'disconnected',
                        type: 'official_api', 
                        profile_type: 'business',
                        session_name: `session_${user.id.slice(0,8)}`,
                        external_api_url: 'http://localhost:3001' // Default sugerido para o micro-servidor
                    } as ChatConnection);
                }
            } catch (e) {
                console.error("Erro loading connection:", e);
            }
        };
        loadConnection();
    }, [user]);

    // Polling de Status e QR Code (Só roda se o Modal estiver aberto ou se precisarmos monitorar status)
    useEffect(() => {
        if (!connection || !connection.external_api_url) return;

        const checkStatus = async () => {
            const remoteStatus = await fetchRemoteStatus(connection);
            if (remoteStatus) setStatus(remoteStatus);

            // Só busca QR Code se estiver desconectado E o modal estiver aberto (para não gastar recurso)
            if (isConnectionModalOpen && (remoteStatus === 'qrcode' || remoteStatus === 'disconnected')) {
                const qr = await fetchRemoteQrCode(connection);
                setQrCode(qr);
            } else if (remoteStatus === 'connected') {
                setQrCode(null);
                if (isConnectionModalOpen) {
                    // Fecha modal automaticamente ao conectar
                    setTimeout(() => setIsConnectionModalOpen(false), 1000); 
                }
            }
        };

        // Roda imediatamente e depois a cada 3s
        checkStatus();
        pollingRef.current = setInterval(checkStatus, 3000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [connection, isConnectionModalOpen]);

    const handleSaveConnectionUrl = async (url: string) => {
        if (!user || !connection) return;
        // Salva/Atualiza no banco
        const updatedConn = { ...connection, external_api_url: url };
        setConnection(updatedConn);
        
        if (connection.id) {
            await api.update('chat_connections', { external_api_url: url }, { id: connection.id });
        } else {
            const { data } = await api.insert('chat_connections', {
                ...updatedConn,
                user_id: user.id
            });
            if (data) setConnection(data[0]);
        }
    };

    return (
        <div className="min-h-screen bg-[#ECEFF1] text-[#263238] font-['Poppins']">
            <Header
                userEmail={user?.email}
                onLogout={async () => { await import('../contexts/UserContext').then(m => m.useUser().signOut); window.location.reload(); }}
                isAdmin={user?.role === 'admin' || user?.role === 'super_admin'}
                onNavigateToAdmin={() => {}} 
                onNavigateToDashboard={onNavigateToDashboard}
                pageTitle="CRM & Funil de Vendas"
                userCredits={user?.credits}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            />

            <div className="flex h-[calc(100vh-64px)] overflow-hidden">
                <DashboardSidebar 
                    isOpen={sidebarOpen}
                    setIsOpen={setSidebarOpen}
                    currentMode='crm'
                    onModeChange={(m) => { if(m !== 'crm') onNavigateToDashboard(); }}
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
                    onNavigateFeedback={() => {}}
                />

                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative custom-scrollbar bg-[#F5F7FA]">
                    <div className="max-w-[1600px] mx-auto h-full flex flex-col">
                        
                        {/* CRM Header com Status do WhatsApp */}
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-[#263238]">Gestão de Leads</h2>
                                <p className="text-sm text-gray-500">Organize seus contatos e oportunidades.</p>
                            </div>

                            {/* Widget de Conexão (Compacto) */}
                            <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-full shadow-sm border border-gray-200">
                                <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                <div className="text-xs">
                                    <p className="font-bold text-gray-700">{status === 'connected' ? 'WhatsApp Online' : 'WhatsApp Offline'}</p>
                                </div>
                                <button 
                                    onClick={() => setIsConnectionModalOpen(true)}
                                    className={`ml-2 text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${status === 'connected' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'}`}
                                >
                                    {status === 'connected' ? 'Configurar' : 'Conectar Agora'}
                                </button>
                            </div>
                        </div>

                        {/* O CRM é o protagonista agora */}
                        <div className="flex-1">
                            <CrmDashboard isConnected={status === 'connected'} />
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal de Conexão WhatsApp (Pop-up) */}
            {isConnectionModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <i className="fab fa-whatsapp text-green-600 text-lg"></i> Conectar WhatsApp
                            </h3>
                            <button onClick={() => setIsConnectionModalOpen(false)} className="text-gray-400 hover:text-red-500">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="p-6 flex flex-col items-center text-center">
                            {status === 'connected' ? (
                                <div className="py-8">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i className="fas fa-check text-4xl text-green-600"></i>
                                    </div>
                                    <h4 className="text-xl font-bold text-green-700">Tudo Pronto!</h4>
                                    <p className="text-gray-600 text-sm mt-2">Seu WhatsApp está conectado e sincronizado com o CRM.</p>
                                    <button 
                                        onClick={() => setIsConnectionModalOpen(false)}
                                        className="mt-6 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm"
                                    >
                                        Voltar ao CRM
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-gray-600 mb-6">
                                        Escaneie o QR Code abaixo com seu celular para vincular seu WhatsApp ao funil de vendas.
                                    </p>

                                    {/* Configuração de URL (Backend) */}
                                    <div className="w-full mb-6 text-left">
                                        <label className="text-xs font-bold text-gray-500 uppercase">URL do Servidor (Baileys/Evolution)</label>
                                        <input 
                                            type="text" 
                                            value={connection?.external_api_url || 'http://localhost:3001'} 
                                            onChange={(e) => handleSaveConnectionUrl(e.target.value)}
                                            className="w-full mt-1 p-2 border border-gray-300 rounded text-sm bg-gray-50 focus:ring-green-500 focus:border-green-500"
                                            placeholder="http://localhost:3001"
                                        />
                                    </div>

                                    {/* QR Code Area */}
                                    <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center w-64 h-64 relative">
                                        {qrCode ? (
                                            <img src={qrCode} alt="Scan Me" className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="text-gray-400 flex flex-col items-center">
                                                <i className="fas fa-circle-notch fa-spin text-2xl mb-2 text-green-500"></i>
                                                <span className="text-xs">Buscando QR Code...</span>
                                                <span className="text-[10px] mt-1 text-gray-400">Certifique-se que o backend está rodando.</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="mt-6 text-xs text-gray-400">
                                        1. Abra o WhatsApp no celular <br/>
                                        2. Menu {'>'} Aparelhos conectados {'>'} Conectar aparelho
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
