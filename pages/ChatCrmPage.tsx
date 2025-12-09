
import React, { useState, useEffect } from 'react';
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
        handleModeChange, 
        isGuest, 
        guestCredits,
        hasAccessToService,
        modals,
        toggleModal
    } = useDashboard();

    const [connection, setConnection] = useState<ChatConnection | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'qrcode' | 'pairing'>('disconnected');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const loadConnection = async () => {
            try {
                // Fetch existing connection
                const { data } = await api.select('chat_connections', { user_id: user.id });
                if (data && data.length > 0) {
                    const conn = data[0] as ChatConnection;
                    setConnection(conn);
                    
                    if (conn.external_api_url) {
                        const remoteStatus = await fetchRemoteStatus(conn);
                        if (remoteStatus) setStatus(remoteStatus);
                        
                        if (remoteStatus === 'qrcode' || remoteStatus === 'disconnected') {
                            const qr = await fetchRemoteQrCode(conn);
                            setQrCode(qr);
                        }
                    }
                } else {
                    // Create default placeholder connection if none exists
                    const newConn: Partial<ChatConnection> = {
                        user_id: user.id,
                        name: 'Default',
                        status: 'disconnected',
                        type: 'official_api', // Default to API for now or prompts setup
                        profile_type: 'business',
                        session_name: `session_${user.id.slice(0,8)}`
                    };
                    // Typically we would save this to DB, here just state for UI setup
                    setConnection(newConn as ChatConnection);
                }
            } catch (e) {
                console.error("Error loading chat connection:", e);
            } finally {
                setLoading(false);
            }
        };

        loadConnection();
    }, [user]);

    return (
        <div className="min-h-screen bg-[#ECEFF1] text-[#263238] font-['Poppins']">
            <Header
                userEmail={user?.email}
                onLogout={async () => { await import('../contexts/UserContext').then(m => m.useUser().signOut); window.location.reload(); }}
                isAdmin={user?.role === 'admin' || user?.role === 'super_admin'}
                onNavigateToAdmin={() => {}} // Not needed here
                onNavigateToDashboard={onNavigateToDashboard}
                pageTitle="Gestão de Leads & CRM"
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
                    <div className="max-w-7xl mx-auto">
                        
                        {/* Status Bar / Connection Warning */}
                        {connection && status !== 'connected' && (
                            <div className="bg-white p-6 rounded-xl border border-orange-200 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div>
                                    <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                                        <i className="fas fa-exclamation-triangle"></i> WhatsApp Desconectado
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">Conecte seu WhatsApp para sincronizar conversas e usar a IA.</p>
                                </div>
                                
                                {qrCode ? (
                                    <div className="flex flex-col items-center bg-white p-2 rounded-lg border border-gray-200">
                                        <img src={qrCode} alt="QR Code" className="w-32 h-32 object-contain" />
                                        <p className="text-xs text-gray-500 mt-2 font-mono">Escaneie no WhatsApp</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        {!connection.external_api_url && (
                                            <div className="text-center text-sm text-gray-500">
                                                <p>Configure a URL da API externa no painel de administração ou configurações.</p>
                                            </div>
                                        )}
                                        {connection.external_api_url && (
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <i className="fas fa-spinner fa-spin"></i> Gerando QR Code...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <CrmDashboard />
                    </div>
                </main>
            </div>
        </div>
    );
}
