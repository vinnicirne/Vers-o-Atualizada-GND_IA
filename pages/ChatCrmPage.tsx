
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { Header } from '../components/Header';
import { Ticket, Message, ChatContact, Lead } from '../types';
import { getLeads, updateLead, createLead } from '../services/marketingService';
import { v4 as uuidv4 } from 'uuid';

// Mock Data para visualização inicial
const MOCK_CONTACTS = [
    { id: '1', name: 'João Silva', number: '5511999999999', profilePicUrl: 'https://ui-avatars.com/api/?name=Joao+Silva&background=0D8ABC&color=fff' },
    { id: '2', name: 'Maria Oliveira', number: '5521988888888', profilePicUrl: 'https://ui-avatars.com/api/?name=Maria+Oliveira&background=random' },
    { id: '3', name: 'Suporte Tech', number: '5541977777777', profilePicUrl: 'https://ui-avatars.com/api/?name=Tech+Solutions&background=random' },
];

const MOCK_TICKETS: Ticket[] = [
    { id: 't1', contactId: '1', contact: MOCK_CONTACTS[0], status: 'open', unreadCount: 2, lastMessage: 'Gostaria de saber mais sobre o plano Premium.', updatedAt: new Date().toISOString(), ownerId: '1', tags: ['vendas', 'quente'] },
    { id: 't2', contactId: '2', contact: MOCK_CONTACTS[1], status: 'pending', unreadCount: 0, lastMessage: 'Obrigada pelo retorno!', updatedAt: new Date(Date.now() - 3600000).toISOString(), ownerId: '1', tags: ['suporte'] },
    { id: 't3', contactId: '3', contact: MOCK_CONTACTS[2], status: 'closed', unreadCount: 0, lastMessage: 'Atendimento finalizado.', updatedAt: new Date(Date.now() - 86400000).toISOString(), ownerId: '1', tags: [] },
];

const MOCK_MESSAGES: Message[] = [
    { id: 'm1', ticketId: 't1', body: 'Olá! Como posso ajudar?', fromMe: true, isRead: true, createdAt: new Date(Date.now() - 7200000).toISOString(), status: 'read' },
    { id: 'm2', ticketId: 't1', body: 'Gostaria de saber mais sobre o plano Premium.', fromMe: false, isRead: false, createdAt: new Date(Date.now() - 7100000).toISOString() },
];

interface ChatCrmPageProps {
    onNavigateToDashboard: () => void;
}

export default function ChatCrmPage({ onNavigateToDashboard }: ChatCrmPageProps) {
    const { user } = useUser();
    const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'qrcode'>('disconnected');
    const [viewMode, setViewMode] = useState<'chat' | 'config'>('chat');
    
    // Config State
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [apiConfig, setApiConfig] = useState({ url: '', token: '' });

    // CRM Lead State
    const [currentLead, setCurrentLead] = useState<Lead | null>(null);
    const [leadNote, setLeadNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSelectTicket = async (ticket: Ticket) => {
        setActiveTicket(ticket);
        
        // Simulação de carregamento de mensagens
        const ticketMessages = MOCK_MESSAGES.filter(m => m.ticketId === ticket.id);
        if (ticketMessages.length === 0) {
            setMessages([
                { id: uuidv4(), ticketId: ticket.id, body: 'Histórico de mensagens carregado...', fromMe: true, isRead: true, createdAt: new Date().toISOString(), status: 'read' }
            ]);
        } else {
            setMessages(ticketMessages);
        }

        // Integração CRM: Buscar ou Criar Lead baseado no telefone
        if (user) {
            try {
                // Tenta buscar lead existente pelo telefone
                // Nota: Em produção, o getLeads deveria suportar filtro por telefone.
                // Aqui simulamos buscando todos e filtrando no cliente.
                const allLeads = await getLeads(user.id);
                const existingLead = allLeads.find(l => l.phone?.includes(ticket.contact.number) || l.name === ticket.contact.name);

                if (existingLead) {
                    setCurrentLead(existingLead);
                    setLeadNote(existingLead.notes || '');
                } else {
                    // Prepara objeto para criação potencial (não cria automaticamente para não poluir, mas preenche o state)
                    const tempLead: Lead = {
                        id: 'temp-' + ticket.contactId,
                        owner_id: user.id,
                        name: ticket.contact.name,
                        email: '', // WhatsApp geralmente não dá email
                        phone: ticket.contact.number,
                        status: 'new',
                        score: 10,
                        source: 'whatsapp_chat',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        notes: ''
                    };
                    setCurrentLead(tempLead);
                    setLeadNote('');
                }
            } catch (e) {
                console.error("Erro ao buscar lead:", e);
            }
        }
    };

    const handleSendMessage = () => {
        if (!newMessage.trim() || !activeTicket) return;

        const msg: Message = {
            id: uuidv4(),
            ticketId: activeTicket.id,
            body: newMessage,
            fromMe: true,
            isRead: true,
            createdAt: new Date().toISOString(),
            status: 'sent'
        };

        setMessages(prev => [...prev, msg]);
        setNewMessage('');
        
        // Atualiza última mensagem na lista lateral
        setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, lastMessage: msg.body, updatedAt: new Date().toISOString() } : t));
    };

    const handleConnectQr = () => {
        setConnectionStatus('qrcode');
        // Simula loading do QR Code
        setTimeout(() => {
            // QR Code de exemplo (wiki)
            setQrCode("https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"); 
            
            // Simula conexão bem-sucedida após 5s
            setTimeout(() => {
                setConnectionStatus('connected');
                setQrCode(null);
            }, 5000);
        }, 1000);
    };

    const handleConnectApi = () => {
        if (apiConfig.url && apiConfig.token) {
            setConnectionStatus('connected');
            alert("Conexão via API configurada com sucesso! (Simulação)");
        } else {
            alert("Preencha a URL e o Token.");
        }
    };

    const handleSaveLeadNote = async () => {
        if (!currentLead || !user) return;
        
        setIsSavingNote(true);
        try {
            if (currentLead.id.startsWith('temp-')) {
                // Criar novo lead
                const newLead = await createLead({
                    name: currentLead.name,
                    phone: currentLead.phone,
                    notes: leadNote,
                    status: 'contacted',
                    source: 'whatsapp_chat',
                    email: `${currentLead.phone}@whatsapp.temp` // Placeholder email required
                }, user.id);
                if (newLead) setCurrentLead(newLead);
            } else {
                // Atualizar existente
                await updateLead(currentLead.id, { notes: leadNote });
                setCurrentLead({ ...currentLead, notes: leadNote });
            }
            alert("Nota salva no CRM!");
        } catch (e) {
            console.error("Erro ao salvar nota:", e);
            alert("Erro ao salvar nota.");
        } finally {
            setIsSavingNote(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#ECEFF1] overflow-hidden font-['Poppins']">
            {/* Header Simplified */}
            <Header 
                userEmail={user?.email} 
                onNavigateToDashboard={onNavigateToDashboard}
                pageTitle="Central de Atendimento"
                userRole={user?.role}
            />

            <div className="flex flex-1 overflow-hidden">
                {/* 1. SIDEBAR TICKETS (Left) */}
                <div className="w-full md:w-[350px] bg-white border-r border-gray-200 flex flex-col z-10 shadow-md">
                    {/* Toolbar */}
                    <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={connectionStatus}></div>
                            <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{connectionStatus === 'connected' ? 'Online' : 'Offline'}</span>
                        </div>
                        <div className="flex gap-1 bg-gray-200 rounded p-1">
                            <button onClick={() => setViewMode('chat')} className={`p-2 rounded text-xs font-bold transition ${viewMode === 'chat' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="Conversas"><i className="fas fa-comments"></i></button>
                            <button onClick={() => setViewMode('config')} className={`p-2 rounded text-xs font-bold transition ${viewMode === 'config' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="Conexão"><i className="fas fa-qrcode"></i></button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="p-3">
                        <div className="relative">
                            <i className="fas fa-search absolute left-3 top-3 text-gray-400 text-sm"></i>
                            <input type="text" placeholder="Buscar ticket ou contato..." className="w-full pl-9 pr-4 py-2.5 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm transition-all outline-none" />
                        </div>
                    </div>

                    {/* Ticket List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {tickets.map(ticket => (
                            <div 
                                key={ticket.id} 
                                onClick={() => handleSelectTicket(ticket)}
                                className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 transition border-b border-gray-100 ${activeTicket?.id === ticket.id ? 'bg-blue-50/60 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                            >
                                <div className="relative mr-3">
                                    <img src={ticket.contact.profilePicUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                                    {ticket.status === 'open' && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-gray-800 text-sm truncate">{ticket.contact.name}</h3>
                                        <span className="text-[10px] text-gray-400 font-medium">{new Date(ticket.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{ticket.lastMessage}</p>
                                    <div className="flex gap-1 mt-2">
                                        {ticket.tags?.map(tag => (
                                            <span key={tag} className="text-[9px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase font-bold border border-gray-200">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                                {ticket.unreadCount > 0 && (
                                    <div className="ml-2 bg-green-500 text-white text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1">
                                        {ticket.unreadCount}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. MAIN CONTENT (Chat or Config) */}
                <div className="flex-1 flex flex-col bg-[#efeae2] relative border-r border-gray-200">
                    
                    {viewMode === 'config' ? (
                        <div className="flex-1 flex items-center justify-center p-8 bg-gray-100">
                            <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl w-full border border-gray-200">
                                <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <i className="fab fa-whatsapp text-green-500"></i> Conexão WhatsApp
                                </h2>
                                <p className="text-gray-500 mb-8">Escaneie o QR Code ou configure uma API externa para começar.</p>
                                
                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* QR Code Option */}
                                    <div 
                                        className={`border-2 rounded-xl p-6 text-center transition cursor-pointer ${connectionStatus === 'qrcode' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-400 hover:bg-gray-50'}`} 
                                        onClick={handleConnectQr}
                                    >
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 text-2xl">
                                            <i className="fas fa-qrcode"></i>
                                        </div>
                                        <h3 className="font-bold text-lg mb-2">Ler QR Code</h3>
                                        <p className="text-sm text-gray-500 mb-4">Conecte seu celular diretamente como no WhatsApp Web.</p>
                                        
                                        {connectionStatus === 'qrcode' && qrCode && (
                                            <div className="mt-4 animate-fade-in bg-white p-4 inline-block rounded-lg shadow-sm border border-gray-200">
                                                <img src={qrCode} alt="QR Code" className="mx-auto w-48 h-48" />
                                                <p className="text-xs text-gray-400 mt-2 font-mono">Aguardando leitura...</p>
                                            </div>
                                        )}
                                        {connectionStatus === 'connected' && (
                                            <div className="mt-4 text-green-600 font-bold flex items-center justify-center gap-2 bg-green-100 py-2 px-4 rounded-full inline-block">
                                                <i className="fas fa-check-circle"></i> Conectado!
                                            </div>
                                        )}
                                    </div>

                                    {/* API Option */}
                                    <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-400 transition bg-white">
                                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 text-2xl">
                                            <i className="fas fa-server"></i>
                                        </div>
                                        <h3 className="font-bold text-lg mb-2 text-center">API Externa</h3>
                                        <p className="text-sm text-gray-500 mb-4 text-center">Integração com Evolution API ou WPPConnect.</p>
                                        
                                        <div className="space-y-4 text-left">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Base URL</label>
                                                <input type="text" placeholder="https://api.meu.com" value={apiConfig.url} onChange={e => setApiConfig({...apiConfig, url: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm mt-1 focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">API Token</label>
                                                <input type="password" placeholder="••••••••" value={apiConfig.token} onChange={e => setApiConfig({...apiConfig, token: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm mt-1 focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                            <button onClick={handleConnectApi} className="w-full bg-blue-600 text-white rounded py-2.5 text-sm font-bold hover:bg-blue-700 transition shadow-md">Salvar Conexão</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Chat View
                        activeTicket ? (
                            <>
                                {/* Chat Header */}
                                <div className="h-16 bg-gray-50 border-b border-gray-200 flex items-center px-4 justify-between shadow-sm z-10">
                                    <div className="flex items-center gap-3">
                                        <img src={activeTicket.contact.profilePicUrl} className="w-10 h-10 rounded-full cursor-pointer border border-white shadow-sm" />
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-sm">{activeTicket.contact.name}</h3>
                                            <p className="text-xs text-gray-500">{activeTicket.contact.number}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition" title="Resolver"><i className="fas fa-check"></i></button>
                                        <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Tags"><i className="fas fa-tag"></i></button>
                                        <button className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition" title="Transferir"><i className="fas fa-exchange-alt"></i></button>
                                    </div>
                                </div>

                                {/* Messages Area */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-[#efeae2]">
                                    {messages.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] p-3 rounded-lg shadow-sm text-sm relative ${msg.fromMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                                                <p className="text-gray-800 mb-1 leading-relaxed">{msg.body}</p>
                                                <div className="text-[10px] text-gray-400 text-right flex items-center justify-end gap-1 mt-1">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    {msg.fromMe && (
                                                        <span className={msg.status === 'read' ? 'text-blue-500' : 'text-gray-400'}>
                                                            <i className="fas fa-check-double"></i>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center gap-3">
                                    <button className="text-gray-500 hover:text-gray-700 text-xl px-2"><i className="fas fa-paperclip"></i></button>
                                    <button className="text-gray-500 hover:text-gray-700 text-xl px-2"><i className="far fa-smile"></i></button>
                                    <input 
                                        type="text" 
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Digite uma mensagem..." 
                                        className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition shadow-sm"
                                    />
                                    {newMessage.trim() ? (
                                        <button onClick={handleSendMessage} className="bg-green-600 text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-green-700 transition shadow-md transform hover:scale-105">
                                            <i className="fas fa-paper-plane"></i>
                                        </button>
                                    ) : (
                                        <button className="text-gray-500 hover:text-gray-700 text-xl px-2"><i className="fas fa-microphone"></i></button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                                <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mb-6">
                                    <i className="fas fa-comments text-5xl text-gray-400"></i>
                                </div>
                                <h2 className="text-xl font-bold text-gray-500">Selecione um chat para começar</h2>
                                <p className="text-sm mt-2 text-gray-400">Gerencie seus atendimentos de forma centralizada.</p>
                            </div>
                        )
                    )}
                </div>

                {/* 3. INFO SIDEBAR (Right - CRM) */}
                {activeTicket && viewMode === 'chat' && (
                    <div className="hidden lg:flex w-[320px] bg-white border-l border-gray-200 flex-col z-10 overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex flex-col items-center text-center bg-gray-50/50">
                            <img src={activeTicket.contact.profilePicUrl} className="w-24 h-24 rounded-full mb-3 shadow-md border-4 border-white" />
                            <h2 className="text-lg font-bold text-gray-800">{activeTicket.contact.name}</h2>
                            <p className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded mt-1">{activeTicket.contact.number}</p>
                        </div>

                        {currentLead ? (
                            <div className="p-5 space-y-6">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <h4 className="text-xs font-bold text-blue-700 uppercase mb-3 flex items-center gap-2">
                                        <i className="fas fa-id-card"></i> Dados do Lead
                                    </h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between border-b border-blue-100 pb-2">
                                            <span className="text-gray-500">Email:</span>
                                            <span className="text-gray-800 font-medium truncate max-w-[140px]" title={currentLead.email}>{currentLead.email || '-'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-blue-100 pb-2">
                                            <span className="text-gray-500">Status:</span>
                                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">{currentLead.status}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Temperatura:</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-blue-400 to-green-500" style={{width: `${currentLead.score}%`}}></div>
                                                </div>
                                                <span className="text-xs font-bold text-gray-700">{currentLead.score}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                        <i className="fas fa-sticky-note"></i> Anotações Internas
                                    </h4>
                                    <textarea 
                                        className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-gray-700 min-h-[120px] resize-none focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
                                        placeholder="Adicione notas sobre o cliente..."
                                        value={leadNote}
                                        onChange={e => setLeadNote(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleSaveLeadNote} 
                                        disabled={isSavingNote}
                                        className="mt-2 w-full bg-yellow-100 text-yellow-700 text-xs font-bold py-2.5 rounded-lg hover:bg-yellow-200 transition border border-yellow-200 flex items-center justify-center gap-2"
                                    >
                                        {isSavingNote ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} Salvar Nota
                                    </button>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Oportunidades</h4>
                                    <button className="w-full border border-dashed border-gray-300 text-gray-500 py-3 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition text-sm flex items-center justify-center gap-2 font-medium">
                                        <i className="fas fa-plus"></i> Criar Negócio (Deal)
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-400">
                                <i className="fas fa-user-slash text-3xl mb-3 opacity-50"></i>
                                <p className="text-sm">Este contato não está no CRM.</p>
                                <button className="mt-4 text-blue-600 font-bold text-sm hover:underline">Adicionar Lead</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
