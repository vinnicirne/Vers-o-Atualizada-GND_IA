
import React, { useState, useEffect } from 'react';
import { WhatsAppConnect } from './WhatsAppConnect';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { getWhatsAppInstances, deleteWhatsAppInstance, getConversations } from '../../services/chatService';
import { WhatsAppInstance, ChatConversation, User } from '../../types';
import { PLANS } from '../../constants';

interface MultiChatLayoutProps {
    user: User | null;
}

export function MultiChatLayout({ user }: MultiChatLayoutProps) {
    const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
    const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [selectedChat, setSelectedChat] = useState<ChatConversation | null>(null);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const planLimits = user?.plan ? PLANS[user.plan]?.limits : PLANS['free'].limits;
    const maxInstances = planLimits?.whatsapp_instances || 0;

    useEffect(() => {
        loadInstances();
    }, []);

    useEffect(() => {
        if (selectedInstance) {
            loadChats(selectedInstance);
        } else {
            setConversations([]);
        }
    }, [selectedInstance]);

    const loadInstances = async () => {
        setLoading(true);
        const data = await getWhatsAppInstances();
        setInstances(data);
        if (data.length > 0 && !selectedInstance) {
            setSelectedInstance(data[0].id);
        }
        setLoading(false);
    };

    const loadChats = async (instanceId: string) => {
        const chats = await getConversations(instanceId);
        setConversations(chats);
    };

    const handleDeleteInstance = async (id: string) => {
        if (!confirm("Desconectar este número?")) return;
        await deleteWhatsAppInstance(id);
        await loadInstances();
        if (selectedInstance === id) setSelectedInstance(null);
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-100 overflow-hidden font-sans">
            {/* 1. LEFT SIDEBAR: INSTANCES & SETTINGS */}
            <div className="w-16 bg-[#202C33] flex flex-col items-center py-4 gap-4 z-20">
                {instances.map(inst => (
                    <button 
                        key={inst.id}
                        onClick={() => setSelectedInstance(inst.id)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition relative group ${selectedInstance === inst.id ? 'bg-[#00A884] text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                        title={inst.name}
                    >
                        <i className="fab fa-whatsapp text-lg"></i>
                        {/* Status Indicator */}
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#202C33] ${inst.status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    </button>
                ))}

                <button 
                    onClick={() => setShowConnectModal(true)}
                    className="w-10 h-10 rounded-full bg-gray-700 hover:bg-[#00A884] text-gray-400 hover:text-white flex items-center justify-center transition"
                    title="Adicionar Número"
                >
                    <i className="fas fa-plus"></i>
                </button>
                
                <div className="mt-auto">
                    <button className="text-gray-400 hover:text-white p-2"><i className="fas fa-cog"></i></button>
                </div>
            </div>

            {/* 2. MIDDLE: CHAT LIST */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col z-10">
                <div className="h-16 bg-[#F0F2F5] px-4 flex items-center justify-between border-b border-gray-300">
                    <h2 className="font-bold text-[#263238]">Conversas</h2>
                    <div className="flex gap-2">
                        <button className="text-gray-500 hover:bg-gray-200 p-2 rounded-full"><i className="fas fa-comment-medical"></i></button>
                        <button className="text-gray-500 hover:bg-gray-200 p-2 rounded-full"><i className="fas fa-ellipsis-v"></i></button>
                    </div>
                </div>
                
                {/* Search */}
                <div className="p-2 bg-white border-b border-gray-100">
                    <div className="bg-[#F0F2F5] rounded-lg flex items-center px-3 py-1.5">
                        <i className="fas fa-search text-gray-500 text-xs"></i>
                        <input type="text" placeholder="Pesquisar ou começar nova..." className="bg-transparent border-none outline-none text-sm ml-2 w-full text-gray-700 placeholder-gray-500" />
                    </div>
                </div>

                <ChatList 
                    conversations={conversations} 
                    selectedId={selectedChat?.id} 
                    onSelect={setSelectedChat}
                    loading={loading}
                />
            </div>

            {/* 3. RIGHT: CHAT WINDOW */}
            <div className="flex-1 relative">
                {selectedChat ? (
                    <ChatWindow conversation={selectedChat} />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-[#F0F2F5] border-b-[6px] border-green-500 text-center p-8">
                        <div className="w-64 h-64 bg-[url('https://cdn-icons-png.flaticon.com/512/1077/1077063.png')] bg-contain bg-no-repeat bg-center opacity-10 mb-6"></div>
                        <h2 className="text-3xl font-light text-gray-600 mb-4">GDN Chat Multi-Atendimento</h2>
                        <p className="text-sm text-gray-500 max-w-md">
                            Envie e receba mensagens sem precisar manter seu celular conectado. <br/>
                            Use o WhatsApp em até {maxInstances} números ao mesmo tempo.
                        </p>
                        <div className="mt-8 flex items-center gap-2 text-xs text-gray-400">
                            <i className="fas fa-lock"></i> Protegido com criptografia de ponta-a-ponta
                        </div>
                    </div>
                )}
            </div>

            {showConnectModal && (
                <WhatsAppConnect 
                    onClose={() => setShowConnectModal(false)}
                    onSuccess={loadInstances}
                    currentCount={instances.length}
                    maxLimit={maxInstances}
                />
            )}
        </div>
    );
}
