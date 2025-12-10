
import React, { useState, useEffect, useRef } from 'react';
import QRCode from "react-qr-code";
import { getConversations, getMessages, subscribeToConversations, subscribeToMessages, getAiSettings, updateAiSettings } from '../../services/chatService';
import { ChatConversation, ChatMessage, AiSettings } from '../../types';
import { Toast } from '../admin/Toast';
import { useUser } from '../../contexts/UserContext';

export function CrmDashboard() {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<'chats' | 'connection' | 'settings'>('chats');
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [qrCode, setQrCode] = useState("");
    // ATUALIZAÇÃO: URL padrão aponta para o Railway
    const [serverUrl, setServerUrl] = useState(localStorage.getItem('whatsapp_server_url') || 'https://crm-whatsapp-backend-whatsapptoken.up.railway.app');
    const [status, setStatus] = useState("Desconectado");
    const [isServerOnline, setIsServerOnline] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // AI Settings State
    const [aiSettings, setAiSettings] = useState<AiSettings>({
        enabled: false,
        temperature: 0.7,
        system_prompt: "Você é um assistente virtual útil."
    });
    const [showAiModal, setShowAiModal] = useState(false);
    const [savingAi, setSavingAi] = useState(false);

    // Load AI Settings
    useEffect(() => {
        if (user) {
            getAiSettings(user.id).then(setAiSettings);
        }
    }, [user]);

    // Initial Load & Subscription for Conversations
    useEffect(() => {
        loadConversations();
        
        const sub = subscribeToConversations((payload) => {
            console.log("Realtime Conversation Update:", payload);
            loadConversations(); // Reload list on any change (simple approach)
        });

        return () => { sub.unsubscribe(); };
    }, []);

    // Load & Subscription for Messages when chat selected
    useEffect(() => {
        if (!selectedChat) return;

        loadMessages(selectedChat);

        const sub = subscribeToMessages(selectedChat, (payload) => {
            console.log("Realtime Message:", payload);
            const newMsg = payload.new as ChatMessage;
            setMessages(prev => [...prev, newMsg]);
        });

        return () => { sub.unsubscribe(); };
    }, [selectedChat]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // QR Code Polling - Robust check for backend
    useEffect(() => {
        let interval: any;
        
        const checkConnection = async () => {
            try {
                // Tenta buscar status primeiro
                const res = await fetch(`${serverUrl}/qr`);
                if (res.ok) {
                    setIsServerOnline(true);
                    const data = await res.json();
                    
                    if (data.qr) {
                        setQrCode(data.qr);
                        setStatus("Aguardando Leitura");
                    } else if (data.connected) {
                        setQrCode("");
                        setStatus("Conectado");
                    }
                } else {
                    setIsServerOnline(false);
                    setStatus("Erro HTTP Server");
                }
            } catch (e) {
                setIsServerOnline(false);
                setStatus("Servidor Offline");
            }
        };

        if (activeTab === 'connection') {
            checkConnection(); // Immediate check
            interval = setInterval(checkConnection, 3000);
        }
        return () => clearInterval(interval);
    }, [activeTab, serverUrl]);

    async function loadConversations() {
        const data = await getConversations();
        setConversations(data);
    }

    async function loadMessages(id: string) {
        const data = await getMessages(id);
        setMessages(data);
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedChat) return;

        const currentChat = conversations.find(c => c.id === selectedChat);
        if (!currentChat?.contact?.phone) {
            setToast({ message: "Erro: Contato sem telefone.", type: 'error' });
            return;
        }

        try {
            // Formata o JID corretamente (adiciona @s.whatsapp.net se não tiver)
            let jid = currentChat.contact.phone.replace(/\D/g, ''); // Limpa caracteres
            if (!jid.includes('@s.whatsapp.net')) {
                jid = `${jid}@s.whatsapp.net`;
            }

            // Envia para o servidor backend na Railway
            const res = await fetch(`${serverUrl}/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jid: jid,           // Formato atualizado
                    message: messageInput // Formato atualizado
                }),
            });

            if (res.ok) {
                setMessageInput("");
                // Opcional: Atualizar UI localmente ou esperar o Realtime do Supabase
            } else {
                const errData = await res.json();
                throw new Error(errData.message || "Falha no envio");
            }
        } catch (e: any) {
            console.error(e);
            setToast({ message: `Erro ao enviar: ${e.message}`, type: 'error' });
        }
    };

    const handleSaveSettings = () => {
        localStorage.setItem('whatsapp_server_url', serverUrl);
        setToast({ message: "Configurações salvas!", type: 'success' });
    };

    const handleSaveAiSettings = async () => {
        if (!user) return;
        setSavingAi(true);
        try {
            await updateAiSettings(user.id, aiSettings);
            setToast({ message: "Configurações de IA salvas!", type: 'success' });
            setShowAiModal(false);
        } catch (e) {
            setToast({ message: "Erro ao salvar IA.", type: 'error' });
        } finally {
            setSavingAi(false);
        }
    };

    const toggleAi = async () => {
        if (!user) return;
        const newState = !aiSettings.enabled;
        setAiSettings(prev => ({ ...prev, enabled: newState }));
        // Auto-save toggle
        try {
            await updateAiSettings(user.id, { ...aiSettings, enabled: newState });
            setToast({ message: `IA ${newState ? 'Ativada' : 'Desativada'}!`, type: 'success' });
        } catch(e) {
            setToast({ message: "Erro ao alterar status da IA.", type: 'error' });
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative animate-fade-in-up">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            {/* LEFT COLUMN: SIDEBAR LIST */}
            <div className="w-full md:w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
                {/* Header da Lista */}
                <div className="p-4 border-b border-gray-200 bg-white flex flex-col gap-3">
                    <div className="flex justify-between items-center w-full">
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setActiveTab('chats')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'chats' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                                title="Conversas"
                            >
                                <i className="fas fa-comments mr-1"></i>
                            </button>
                            <button 
                                onClick={() => setActiveTab('connection')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'connection' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
                                title="Conexão QR Code"
                            >
                                <i className="fas fa-qrcode mr-1"></i>
                            </button>
                            <button 
                                onClick={() => setActiveTab('settings')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'settings' ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
                                title="Configurações Locais"
                            >
                                <i className="fas fa-cog"></i>
                            </button>
                        </div>
                        
                        {/* AI CONTROLS */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={toggleAi}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${aiSettings.enabled ? 'bg-purple-600 text-white shadow-purple-200 shadow-sm' : 'bg-gray-200 text-gray-500'}`}
                                title={aiSettings.enabled ? "IA Ativada (Auto-Reply)" : "IA Desativada"}
                            >
                                <i className="fas fa-robot"></i> {aiSettings.enabled ? 'ON' : 'OFF'}
                            </button>
                            <button
                                onClick={() => setShowAiModal(true)}
                                className="px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition"
                                title="Configurar IA"
                            >
                                <i className="fas fa-sliders-h"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area Sidebar */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'chats' ? (
                        <div>
                            {/* Search */}
                            <div className="p-3">
                                <div className="relative">
                                    <input type="text" placeholder="Buscar conversa..." className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                                    <i className="fas fa-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                                </div>
                            </div>

                            {/* List */}
                            <div className="divide-y divide-gray-100">
                                {conversations.length === 0 && (
                                    <div className="text-center p-8">
                                        <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <i className="fas fa-inbox text-gray-400 text-xl"></i>
                                        </div>
                                        <p className="text-gray-400 text-xs">Nenhuma conversa encontrada.</p>
                                    </div>
                                )}
                                {conversations.map(chat => (
                                    <div 
                                        key={chat.id}
                                        onClick={() => setSelectedChat(chat.id)}
                                        className={`p-4 cursor-pointer hover:bg-blue-50 transition flex gap-3 ${selectedChat === chat.id ? 'bg-blue-100/50' : 'bg-white'}`}
                                    >
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold border border-gray-300">
                                                {chat.contact?.name?.charAt(0) || chat.contact?.phone?.charAt(0)}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-gray-800 text-sm truncate">{chat.contact?.name || chat.contact?.phone}</h4>
                                                <span className="text-[10px] text-gray-400">{new Date(chat.last_message_at || chat.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 truncate mt-0.5">{chat.last_message || "Iniciar conversa"}</p>
                                        </div>
                                        {chat.unread_count > 0 && (
                                            <div className="flex flex-col justify-center">
                                                <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                                                    {chat.unread_count}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : activeTab === 'connection' ? (
                        <div className="p-6 text-center flex flex-col items-center">
                            <h3 className="font-bold text-gray-800 mb-2">Conectar WhatsApp</h3>
                            <div className={`text-xs px-3 py-1 rounded-full inline-block font-bold mb-6 ${status === 'Conectado' ? 'bg-green-100 text-green-700' : (isServerOnline ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}`}>
                                Status: {status}
                            </div>
                            
                            {qrCode ? (
                                <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 inline-block mb-4">
                                    <QRCode value={qrCode} size={180} />
                                    <p className="text-[10px] text-gray-400 mt-2">Escaneie com seu celular</p>
                                </div>
                            ) : status === 'Conectado' ? (
                                <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 animate-bounce">
                                    <i className="fas fa-check text-4xl"></i>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-2">
                                        <i className="fas fa-server text-3xl"></i>
                                    </div>
                                    {!isServerOnline && (
                                        <div className="text-left bg-red-50 p-3 rounded border border-red-100 text-xs text-red-700 max-w-xs">
                                            <strong>Servidor Offline?</strong><br/>
                                            O frontend não conseguiu conectar em:<br/>
                                            <span className="font-mono bg-red-100 px-1 rounded break-all">{serverUrl}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <p className="text-xs text-gray-500 mt-4">Backend URL: <code>{serverUrl}</code></p>
                        </div>
                    ) : (
                        <div className="p-6">
                            <h3 className="font-bold text-gray-800 mb-4">Configurações de Conexão</h3>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-500 mb-1">URL do Servidor Backend</label>
                                <input 
                                    type="text" 
                                    value={serverUrl} 
                                    onChange={(e) => setServerUrl(e.target.value)} 
                                    className="w-full border border-gray-300 rounded p-2 text-sm" 
                                    placeholder="https://seu-backend.up.railway.app" 
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Cole aqui a URL do seu Railway.</p>
                            </div>
                            <button onClick={handleSaveSettings} className="w-full bg-blue-600 text-white py-2 rounded text-sm font-bold">Salvar URL</button>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: CHAT WINDOW */}
            <div className="hidden md:flex flex-1 flex-col bg-[#E5DDD5]/30 relative">
                <div className="absolute inset-0 opacity-10 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] pointer-events-none"></div>

                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 bg-white border-b border-gray-200 flex items-center px-4 justify-between z-10 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold border border-gray-300">
                                    {conversations.find(c => c.id === selectedChat)?.contact?.name?.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{conversations.find(c => c.id === selectedChat)?.contact?.name}</h3>
                                    <p className="text-xs text-gray-500">{conversations.find(c => c.id === selectedChat)?.contact?.phone}</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-0">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-lg px-4 py-2 shadow-sm relative text-sm ${msg.direction === 'out' ? 'bg-[#D9FDD3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}`}>
                                        <p>{msg.body}</p>
                                        <span className="text-[10px] text-gray-500 block text-right mt-1 ml-4 opacity-70">
                                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-[#F0F2F5] flex items-center gap-2 z-10 border-t border-gray-200">
                            <button className="text-gray-500 hover:text-gray-700 p-2"><i className="far fa-smile text-xl"></i></button>
                            <form className="flex-1 flex gap-2" onSubmit={handleSendMessage}>
                                <input 
                                    type="text" 
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    placeholder="Digite uma mensagem" 
                                    className="flex-1 bg-white border-none rounded-lg px-4 py-2 focus:ring-0 text-sm shadow-sm" 
                                />
                                <button type="submit" className="text-gray-500 hover:text-blue-600 p-2 transition">
                                    <i className="fas fa-paper-plane text-xl"></i>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-[#F0F2F5] border-b-[6px] border-green-500 z-10">
                        <div className="w-64 h-64 bg-gray-200 rounded-full flex items-center justify-center mb-6 opacity-50">
                            <i className="fas fa-comments text-8xl text-gray-400"></i>
                        </div>
                        <h2 className="text-3xl font-light text-gray-600 mb-4">Central de Atendimento</h2>
                        <p className="text-sm text-gray-500 text-center max-w-md">
                            Selecione uma conversa para começar o atendimento.
                        </p>
                    </div>
                )}
            </div>

            {/* AI CONFIG MODAL */}
            {showAiModal && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 animate-fade-in-scale">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                <i className="fas fa-robot text-purple-600"></i> Configurar IA
                            </h3>
                            <button onClick={() => setShowAiModal(false)} className="text-gray-400 hover:text-gray-600">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prompt do Sistema</label>
                                <textarea
                                    value={aiSettings.system_prompt}
                                    onChange={e => setAiSettings({...aiSettings, system_prompt: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm h-32 focus:ring-purple-500 focus:border-purple-500"
                                    placeholder="Ex: Você é um atendente de pizzaria..."
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Instrua a IA sobre como ela deve se comportar.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Criatividade (Temperatura): {aiSettings.temperature}</label>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="1" 
                                    step="0.1" 
                                    value={aiSettings.temperature}
                                    onChange={e => setAiSettings({...aiSettings, temperature: parseFloat(e.target.value)})}
                                    className="w-full accent-purple-600"
                                />
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>Preciso (0.0)</span>
                                    <span>Criativo (1.0)</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <input 
                                    type="checkbox" 
                                    checked={aiSettings.enabled} 
                                    onChange={e => setAiSettings({...aiSettings, enabled: e.target.checked})}
                                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm font-bold text-gray-700">Ativar Respostas Automáticas</span>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-b-xl flex justify-end">
                            <button 
                                onClick={handleSaveAiSettings}
                                disabled={savingAi}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition disabled:opacity-50"
                            >
                                {savingAi ? 'Salvando...' : 'Salvar Configurações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
