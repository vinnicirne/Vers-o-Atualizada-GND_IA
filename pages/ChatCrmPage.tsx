
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { Header } from '../components/Header';
import { Ticket, Message, Lead, ChatQueue, User } from '../types';
import { getLeads, updateLead, createLead } from '../services/marketingService';
import { generateChatResponse } from '../services/geminiService';
import { searchUsers } from '../services/adminService'; // To search users for transfer
import { v4 as uuidv4 } from 'uuid';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

// Mock Data
const MOCK_CONTACTS = [
    { id: '1', name: 'João Silva', number: '5511999999999', profilePicUrl: 'https://ui-avatars.com/api/?name=Joao+Silva&background=0D8ABC&color=fff' },
    { id: '2', name: 'Maria Oliveira', number: '5521988888888', profilePicUrl: 'https://ui-avatars.com/api/?name=Maria+Oliveira&background=random' },
    { id: '3', name: 'Suporte Tech', number: '5541977777777', profilePicUrl: 'https://ui-avatars.com/api/?name=Tech+Solutions&background=random' },
];

const MOCK_QUEUES: ChatQueue[] = [
    { id: 'q1', name: 'Suporte', color: '#3B82F6' },
    { id: 'q2', name: 'Financeiro', color: '#10B981' },
    { id: 'q3', name: 'Vendas', color: '#F59E0B' },
];

const MOCK_TICKETS: Ticket[] = [
    { id: 't1', contactId: '1', contact: MOCK_CONTACTS[0], status: 'open', unreadCount: 2, lastMessage: 'Gostaria de saber mais sobre o plano Premium.', updatedAt: new Date().toISOString(), ownerId: '1', queueId: 'q3', tags: ['vendas', 'quente'], botEnabled: false },
    { id: 't2', contactId: '2', contact: MOCK_CONTACTS[1], status: 'pending', unreadCount: 0, lastMessage: 'Obrigada pelo retorno!', updatedAt: new Date(Date.now() - 3600000).toISOString(), ownerId: null, queueId: 'q1', tags: ['suporte'], botEnabled: true }, // Unassigned
    { id: 't3', contactId: '3', contact: MOCK_CONTACTS[2], status: 'closed', unreadCount: 0, lastMessage: 'Atendimento finalizado.', updatedAt: new Date(Date.now() - 86400000).toISOString(), ownerId: '1', queueId: 'q1', tags: [], botEnabled: false },
];

const MOCK_MESSAGES: Message[] = [
    { id: 'm1', ticketId: 't1', body: 'Olá! Como posso ajudar?', fromMe: true, isRead: true, createdAt: new Date(Date.now() - 7200000).toISOString(), status: 'read' },
    { id: 'm2', ticketId: 't1', body: 'Gostaria de saber mais sobre o plano Premium.', fromMe: false, isRead: false, createdAt: new Date(Date.now() - 7100000).toISOString() },
];

// --- MODAL COMPONENT: TRANSFER TICKET ---
interface TransferModalProps {
    onClose: () => void;
    onTransfer: (targetId: string, type: 'user' | 'queue') => void;
    queues: ChatQueue[];
}

function TransferModal({ onClose, onTransfer, queues }: TransferModalProps) {
    const [activeTab, setActiveTab] = useState<'queue' | 'user'>('queue');
    const [searchTerm, setSearchTerm] = useState('');
    const [foundUsers, setFoundUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        if (activeTab === 'user' && searchTerm.length >= 3) {
            const delayDebounceFn = setTimeout(async () => {
                setLoadingUsers(true);
                try {
                    const results = await searchUsers(searchTerm);
                    setFoundUsers(results);
                } finally {
                    setLoadingUsers(false);
                }
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchTerm, activeTab]);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800">Transferir Atendimento</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500"><i className="fas fa-times"></i></button>
                </div>
                
                <div className="flex border-b border-gray-100">
                    <button 
                        onClick={() => setActiveTab('queue')}
                        className={`flex-1 py-3 text-sm font-bold transition ${activeTab === 'queue' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <i className="fas fa-layer-group mr-2"></i> Para uma Fila
                    </button>
                    <button 
                        onClick={() => setActiveTab('user')}
                        className={`flex-1 py-3 text-sm font-bold transition ${activeTab === 'user' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <i className="fas fa-user mr-2"></i> Para um Usuário
                    </button>
                </div>

                <div className="p-4 max-h-80 overflow-y-auto custom-scrollbar">
                    {activeTab === 'queue' ? (
                        <div className="space-y-2">
                            {queues.map(q => (
                                <button 
                                    key={q.id}
                                    onClick={() => onTransfer(q.id, 'queue')}
                                    className="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition group text-left"
                                >
                                    <span className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: q.color }}></span>
                                    <span className="font-medium text-gray-700 group-hover:text-blue-700">{q.name}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <input 
                                type="text" 
                                placeholder="Buscar usuário..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            {loadingUsers ? <div className="text-center text-gray-400 text-sm"><i className="fas fa-spinner fa-spin"></i> Buscando...</div> : (
                                foundUsers.map(u => (
                                    <button 
                                        key={u.id}
                                        onClick={() => onTransfer(u.id, 'user')}
                                        className="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition text-left"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-bold text-xs">
                                            {u.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{u.full_name}</p>
                                            <p className="text-xs text-gray-500">{u.email}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                            {!loadingUsers && searchTerm.length >= 3 && foundUsers.length === 0 && (
                                <p className="text-center text-gray-400 text-xs mt-2">Nenhum usuário encontrado.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- MODAL COMPONENT: QUEUE MANAGEMENT ---
interface QueueSettingsModalProps {
    onClose: () => void;
    queues: ChatQueue[];
    onSave: (queues: ChatQueue[]) => void;
}

function QueueSettingsModal({ onClose, queues, onSave }: QueueSettingsModalProps) {
    const [localQueues, setLocalQueues] = useState<ChatQueue[]>(queues);
    const [newQueueName, setNewQueueName] = useState('');
    const [newQueueColor, setNewQueueColor] = useState('#3B82F6');

    const handleAdd = () => {
        if (!newQueueName.trim()) return;
        setLocalQueues([...localQueues, { id: uuidv4(), name: newQueueName, color: newQueueColor }]);
        setNewQueueName('');
    };

    const handleDelete = (id: string) => {
        setLocalQueues(localQueues.filter(q => q.id !== id));
    };

    const handleSaveLocal = () => {
        onSave(localQueues);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800">Gerenciar Filas</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500"><i className="fas fa-times"></i></button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Fila</label>
                            <input type="text" value={newQueueName} onChange={e => setNewQueueName(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 outline-none" placeholder="Ex: Suporte Nível 2" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cor</label>
                            <input type="color" value={newQueueColor} onChange={e => setNewQueueColor(e.target.value)} className="h-10 w-10 p-1 rounded border border-gray-300 cursor-pointer" />
                        </div>
                        <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition h-10">
                            <i className="fas fa-plus"></i>
                        </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto border-t border-gray-100 pt-4">
                        {localQueues.map(q => (
                            <div key={q.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                                <div className="flex items-center gap-3">
                                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: q.color }}></span>
                                    <span className="font-medium text-gray-700">{q.name}</span>
                                </div>
                                <button onClick={() => handleDelete(q.id)} className="text-red-400 hover:text-red-600 p-1"><i className="fas fa-trash"></i></button>
                            </div>
                        ))}
                        {localQueues.length === 0 && <p className="text-center text-gray-400 text-sm">Nenhuma fila criada.</p>}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button onClick={handleSaveLocal} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">Salvar Alterações</button>
                </div>
            </div>
        </div>
    );
}

interface ChatCrmPageProps {
    onNavigateToDashboard: () => void;
}

export default function ChatCrmPage({ onNavigateToDashboard }: ChatCrmPageProps) {
    const { user } = useUser();
    const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
    const [queues, setQueues] = useState<ChatQueue[]>(MOCK_QUEUES);
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sidebarTab, setSidebarTab] = useState<'my_chats' | 'queue_chats' | 'closed'>('my_chats');
    
    // Config State
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'qrcode'>('disconnected');
    const [qrCode, setQrCode] = useState<string | null>(null);
    
    // Modals
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showQueueSettings, setShowQueueSettings] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false); // Generic settings modal

    // CRM Lead State
    const [currentLead, setCurrentLead] = useState<Lead | null>(null);
    const [leadNote, setLeadNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);

    // AI Automation State
    const [isGeneratingReply, setIsGeneratingReply] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const filteredTickets = tickets.filter(t => {
        if (sidebarTab === 'my_chats') return t.status === 'open' && t.ownerId === user?.id; // Only my open tickets
        if (sidebarTab === 'queue_chats') return t.status === 'pending' || (t.status === 'open' && !t.ownerId); // Tickets waiting in queue
        if (sidebarTab === 'closed') return t.status === 'closed';
        return true;
    });

    const handleSelectTicket = async (ticket: Ticket) => {
        setActiveTicket(ticket);
        
        // Simulação de carregamento de mensagens
        const ticketMessages = MOCK_MESSAGES.filter(m => m.ticketId === ticket.id);
        setMessages(ticketMessages.length > 0 ? ticketMessages : [{ id: uuidv4(), ticketId: ticket.id, body: 'Início do atendimento.', fromMe: true, isRead: true, createdAt: new Date().toISOString(), status: 'read' }]);

        // Se o ticket não tiver dono, assume-o (Auto-assign on click for simplicity, or add button "Aceitar")
        if (!ticket.ownerId && user) {
            // Em produção, isso seria um botão "Aceitar" explícito
            // setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, ownerId: user.id, status: 'open' } : t));
        }

        // Integração CRM: Buscar ou Criar Lead
        if (user) {
            try {
                const allLeads = await getLeads(user.id);
                const existingLead = allLeads.find(l => l.phone?.includes(ticket.contact.number) || l.name === ticket.contact.name);

                if (existingLead) {
                    setCurrentLead(existingLead);
                    setLeadNote(existingLead.notes || '');
                } else {
                    setCurrentLead(null);
                    setLeadNote('');
                }
            } catch (e) { console.error(e); }
        }
    };

    const handleSendMessage = () => {
        if (!newMessage.trim() || !activeTicket) return;
        const msg: Message = { id: uuidv4(), ticketId: activeTicket.id, body: newMessage, fromMe: true, isRead: true, createdAt: new Date().toISOString(), status: 'sent' };
        setMessages(prev => [...prev, msg]);
        setNewMessage('');
        setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, lastMessage: msg.body, updatedAt: new Date().toISOString() } : t));
    };

    const handleTransfer = (targetId: string, type: 'user' | 'queue') => {
        if (!activeTicket) return;
        
        let updates: Partial<Ticket> = { status: 'open' };
        if (type === 'queue') {
            updates = { queueId: targetId, ownerId: null, status: 'pending' }; // Back to queue
        } else {
            updates = { ownerId: targetId, status: 'open' }; // Transfer to user
        }

        setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, ...updates } : t));
        setActiveTicket(null); // Deselect
        setShowTransferModal(false);
        alert(`Atendimento transferido com sucesso!`);
    };

    const handleResolveTicket = () => {
        if(!activeTicket) return;
        if(!confirm("Deseja finalizar este atendimento?")) return;
        setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, status: 'closed' } : t));
        setActiveTicket(null);
    };

    const handleReturnToQueue = () => {
        if(!activeTicket) return;
        if(!activeTicket.queueId) return alert("Este ticket não possui uma fila definida.");
        setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, status: 'pending', ownerId: null } : t));
        setActiveTicket(null);
    };

    const handleConnectQr = () => {
        setConnectionStatus('qrcode');
        setTimeout(() => {
            setQrCode("https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"); 
            setTimeout(() => {
                setConnectionStatus('connected');
                setQrCode(null);
            }, 3000);
        }, 1000);
    };

    const getQueueBadge = (queueId?: string | null) => {
        if (!queueId) return null;
        const q = queues.find(q => q.id === queueId);
        if (!q) return null;
        return <span className="text-[10px] px-2 py-0.5 rounded text-white font-bold" style={{ backgroundColor: q.color }}>{q.name}</span>;
    };

    return (
        <div className="flex flex-col h-screen bg-[#ECEFF1] overflow-hidden font-['Poppins']">
            <Header userEmail={user?.email} onNavigateToDashboard={onNavigateToDashboard} pageTitle="Central de Atendimento" userRole={user?.role} />

            <div className="flex flex-1 overflow-hidden">
                {/* 1. LEFT SIDEBAR (Tickets) */}
                <div className="w-full md:w-[320px] bg-white border-r border-gray-200 flex flex-col z-10 shadow-md">
                    {/* Header Sidebar */}
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={connectionStatus}></div>
                            <span className="text-sm font-bold text-gray-700">WhatsApp</span>
                        </div>
                        <button onClick={() => setShowSettingsModal(true)} className="text-gray-400 hover:text-blue-600 transition"><i className="fas fa-cog"></i></button>
                    </div>

                    {/* Tabs */}
                    <div className="flex p-2 bg-gray-50 gap-1">
                        <button onClick={() => setSidebarTab('my_chats')} className={`flex-1 py-2 text-xs font-bold rounded-md transition ${sidebarTab === 'my_chats' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Meus Chats</button>
                        <button onClick={() => setSidebarTab('queue_chats')} className={`flex-1 py-2 text-xs font-bold rounded-md transition ${sidebarTab === 'queue_chats' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Aguardando</button>
                        <button onClick={() => setSidebarTab('closed')} className={`flex-1 py-2 text-xs font-bold rounded-md transition ${sidebarTab === 'closed' ? 'bg-white text-gray-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Fechados</button>
                    </div>

                    {/* Search */}
                    <div className="p-3 border-b border-gray-100">
                        <div className="relative">
                            <i className="fas fa-search absolute left-3 top-3 text-gray-400 text-xs"></i>
                            <input type="text" placeholder="Buscar..." className="w-full pl-8 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm transition-all outline-none" />
                        </div>
                    </div>

                    {/* Ticket List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filteredTickets.map(ticket => (
                            <div 
                                key={ticket.id} 
                                onClick={() => handleSelectTicket(ticket)}
                                className={`relative p-4 cursor-pointer hover:bg-gray-50 transition border-b border-gray-100 ${activeTicket?.id === ticket.id ? 'bg-blue-50/60 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-gray-800 text-sm truncate">{ticket.contact.name}</h3>
                                    <span className="text-[10px] text-gray-400">{new Date(ticket.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    {getQueueBadge(ticket.queueId)}
                                    {ticket.status === 'pending' && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">Pendente</span>}
                                </div>
                                <p className="text-xs text-gray-500 truncate">{ticket.lastMessage}</p>
                                {ticket.unreadCount > 0 && <div className="absolute top-4 right-4 bg-green-500 text-white text-[9px] font-bold h-5 min-w-[20px] px-1 flex items-center justify-center rounded-full">{ticket.unreadCount}</div>}
                            </div>
                        ))}
                        {filteredTickets.length === 0 && (
                            <div className="p-8 text-center text-gray-400 text-sm">Nenhum ticket encontrado nesta aba.</div>
                        )}
                    </div>
                </div>

                {/* 2. MAIN CHAT AREA */}
                <div className="flex-1 flex flex-col bg-[#efeae2] relative border-r border-gray-200">
                    {activeTicket ? (
                        <>
                            {/* Chat Header Actions */}
                            <div className="h-16 bg-white border-b border-gray-200 flex items-center px-4 justify-between shadow-sm z-10">
                                <div className="flex items-center gap-3">
                                    <img src={activeTicket.contact.profilePicUrl} className="w-10 h-10 rounded-full border border-gray-200" />
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-sm">{activeTicket.contact.name}</h3>
                                        <p className="text-xs text-gray-500">{activeTicket.contact.number}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {!activeTicket.ownerId && (
                                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition">Aceitar Ticket</button>
                                    )}
                                    {activeTicket.status !== 'closed' && (
                                        <>
                                            <button onClick={() => setShowTransferModal(true)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2"><i className="fas fa-exchange-alt"></i> Transferir</button>
                                            <button onClick={handleReturnToQueue} className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2" title="Devolver para Fila"><i className="fas fa-undo"></i></button>
                                            <button onClick={handleResolveTicket} className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2"><i className="fas fa-check"></i> Resolver</button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                                {messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-3 rounded-lg shadow-sm text-sm relative ${msg.fromMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'} ${msg.isAiGenerated ? 'border border-purple-300' : ''}`}>
                                            <p className="text-gray-800 leading-relaxed mb-1">{msg.body}</p>
                                            <div className="text-[10px] text-gray-400 text-right flex items-center justify-end gap-1">
                                                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                {msg.fromMe && <i className={`fas fa-check-double ${msg.status === 'read' ? 'text-blue-500' : 'text-gray-400'}`}></i>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center gap-3">
                                <button className="text-gray-500 hover:text-gray-700 text-xl px-2"><i className="fas fa-paperclip"></i></button>
                                <input 
                                    type="text" 
                                    value={newMessage} 
                                    onChange={e => setNewMessage(e.target.value)} 
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
                                    placeholder="Digite uma mensagem..." 
                                    className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition shadow-sm" 
                                />
                                <button onClick={handleSendMessage} className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-green-700 transition shadow-md"><i className="fas fa-paper-plane"></i></button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <i className="fas fa-comments text-6xl mb-4 text-gray-300"></i>
                            <p className="font-medium">Selecione um chat para iniciar o atendimento.</p>
                        </div>
                    )}
                </div>

                {/* 3. RIGHT SIDEBAR (CRM) */}
                {activeTicket && (
                    <div className="hidden xl:flex w-[300px] bg-white border-l border-gray-200 flex-col z-10 overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex flex-col items-center text-center bg-gray-50">
                            <img src={activeTicket.contact.profilePicUrl} className="w-20 h-20 rounded-full mb-3 shadow-sm border-4 border-white" />
                            <h2 className="text-lg font-bold text-gray-800">{activeTicket.contact.name}</h2>
                            <p className="text-sm text-gray-500">{activeTicket.contact.number}</p>
                        </div>
                        
                        {currentLead ? (
                            <div className="p-5 space-y-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Email</label>
                                    <p className="text-sm text-gray-700 break-all">{currentLead.email || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                                    <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase">{currentLead.status}</span>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Anotações</label>
                                    <textarea className="w-full bg-yellow-50 border border-yellow-200 rounded p-2 text-sm text-gray-700 min-h-[100px] focus:outline-none" value={leadNote} onChange={e => setLeadNote(e.target.value)} placeholder="Notas sobre o cliente..." />
                                    <button className="w-full bg-yellow-100 text-yellow-700 text-xs font-bold py-2 rounded hover:bg-yellow-200 transition">Salvar Nota</button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center">
                                <button className="text-blue-600 font-bold text-sm hover:underline">Adicionar ao CRM</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- MODALS --- */}
            
            {/* 1. Settings (Config & Queues) */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800">Configurações do Chat</h3>
                            <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-red-500"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Connection */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2"><i className="fab fa-whatsapp text-green-500"></i> Conexão WhatsApp</h4>
                                {connectionStatus === 'connected' ? (
                                    <div className="text-green-600 font-bold text-sm flex items-center gap-2"><i className="fas fa-check-circle"></i> Conectado</div>
                                ) : (
                                    <div className="text-center">
                                        {qrCode ? (
                                            <img src={qrCode} className="w-32 h-32 mx-auto mb-2" />
                                        ) : (
                                            <button onClick={handleConnectQr} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition">Gerar QR Code</button>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Queues Button */}
                            <button 
                                onClick={() => { setShowSettingsModal(false); setShowQueueSettings(true); }}
                                className="w-full bg-blue-50 text-blue-700 border border-blue-200 px-4 py-3 rounded-lg text-sm font-bold hover:bg-blue-100 transition flex justify-between items-center"
                            >
                                <span>Gerenciar Filas / Departamentos</span>
                                <i className="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Transfer Ticket */}
            {showTransferModal && (
                <TransferModal 
                    onClose={() => setShowTransferModal(false)}
                    onTransfer={handleTransfer}
                    queues={queues}
                />
            )}

            {/* 3. Queue Management */}
            {showQueueSettings && (
                <QueueSettingsModal 
                    onClose={() => setShowQueueSettings(false)}
                    queues={queues}
                    onSave={(newQueues) => setQueues(newQueues)}
                />
            )}
        </div>
    );
}
