
import React, { useState, useEffect, useRef } from 'react';
import { WhatsAppInstance, ChatContact, ChatMessage } from '../../types';

interface ChatInterfaceProps {
    instances: WhatsAppInstance[];
    selectedInstance: WhatsAppInstance | null;
    onSelectInstance: (instance: WhatsAppInstance) => void;
    contacts: ChatContact[];
}

export function ChatInterface({ instances, selectedInstance, onSelectInstance, contacts }: ChatInterfaceProps) {
    const [activeContact, setActiveContact] = useState<ChatContact | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Filter contacts by selected instance
    const filteredContacts = contacts.filter(c => !selectedInstance || c.instance_id === selectedInstance.id);

    // Mock load messages when contact changes
    useEffect(() => {
        if (activeContact) {
            // Simulate fetching messages from DB
            setMessages([
                { id: '1', conversation_id: activeContact.id, content: 'Olá, tudo bem?', type: 'text', direction: 'inbound', status: 'read', timestamp: new Date(Date.now() - 3600000).toISOString() },
                { id: '2', conversation_id: activeContact.id, content: 'Tudo ótimo! Como posso ajudar?', type: 'text', direction: 'outbound', status: 'read', timestamp: new Date(Date.now() - 3500000).toISOString() },
                { id: '3', conversation_id: activeContact.id, content: activeContact.last_message || '...', type: 'text', direction: 'inbound', status: 'delivered', timestamp: new Date().toISOString() },
            ]);
        }
    }, [activeContact]);

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || !activeContact) return;

        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            conversation_id: activeContact.id,
            content: inputMessage,
            type: 'text',
            direction: 'outbound',
            status: 'sent',
            timestamp: new Date().toISOString()
        };

        setMessages([...messages, newMessage]);
        setInputMessage('');

        // Simulate reply
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                conversation_id: activeContact.id,
                content: 'Recebido! Obrigado.',
                type: 'text',
                direction: 'inbound',
                status: 'delivered',
                timestamp: new Date().toISOString()
            }]);
        }, 2000);
    };

    if (instances.length === 0) {
        return <div className="w-full h-full flex items-center justify-center text-gray-500">Nenhum número conectado. Vá em Configurações.</div>;
    }

    return (
        <div className="flex w-full h-full bg-gray-100">
            {/* Left Sidebar: Instances & Contacts */}
            <div className="w-[30%] min-w-[320px] bg-white border-r border-gray-200 flex flex-col h-full">
                {/* Instance Selector */}
                <div className="p-3 bg-gray-50 border-b border-gray-200">
                    <select 
                        value={selectedInstance?.id || ''}
                        onChange={(e) => {
                            const inst = instances.find(i => i.id === e.target.value);
                            if(inst) onSelectInstance(inst);
                        }}
                        className="w-full p-2 rounded border border-gray-300 text-sm font-medium focus:border-[#00A884] focus:outline-none"
                    >
                        {instances.map(inst => (
                            <option key={inst.id} value={inst.id}>{inst.name} ({inst.status})</option>
                        ))}
                    </select>
                </div>

                {/* Search Bar */}
                <div className="p-2 bg-white border-b border-gray-100">
                    <div className="relative bg-gray-100 rounded-lg flex items-center px-3 py-1.5">
                        <i className="fas fa-search text-gray-400 text-sm"></i>
                        <input type="text" placeholder="Pesquisar ou começar nova conversa" className="bg-transparent border-none focus:ring-0 text-sm w-full ml-2" />
                    </div>
                </div>

                {/* Contact List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredContacts.map(contact => (
                        <div 
                            key={contact.id}
                            onClick={() => setActiveContact(contact)}
                            className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition border-b border-gray-100 ${activeContact?.id === contact.id ? 'bg-gray-100' : ''}`}
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                                {contact.avatar_url ? (
                                    <img src={contact.avatar_url} alt={contact.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold bg-gray-200">
                                        {contact.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <div className="flex justify-between items-baseline">
                                    <h4 className="text-sm font-semibold text-gray-900 truncate">{contact.name}</h4>
                                    <span className="text-xs text-gray-400">{contact.last_message_time}</span>
                                </div>
                                <div className="flex justify-between items-center mt-0.5">
                                    <p className="text-sm text-gray-500 truncate">{contact.last_message}</p>
                                    {contact.unread_count > 0 && (
                                        <span className="bg-[#00A884] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                            {contact.unread_count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Side: Chat Window */}
            {activeContact ? (
                <div className="flex-1 flex flex-col bg-[#EFEAE2] relative">
                    {/* Chat Background Pattern Overlay */}
                    <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')" }}></div>

                    {/* Chat Header */}
                    <div className="h-16 bg-[#F0F2F5] border-b border-gray-200 flex items-center px-4 justify-between z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
                                {activeContact.avatar_url ? (
                                    <img src={activeContact.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600 bg-gray-200 font-bold">{activeContact.name.charAt(0)}</div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800">{activeContact.name}</h3>
                                <p className="text-xs text-gray-500">{activeContact.phone}</p>
                            </div>
                        </div>
                        <div className="flex gap-4 text-gray-600">
                            <button><i className="fas fa-search"></i></button>
                            <button><i className="fas fa-ellipsis-v"></i></button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-2 z-10 custom-scrollbar">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] rounded-lg px-3 py-1.5 shadow-sm relative text-sm ${msg.direction === 'outbound' ? 'bg-[#D9FDD3] text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}`}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                    <div className="flex justify-end items-center gap-1 mt-1">
                                        <span className="text-[10px] text-gray-500">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {msg.direction === 'outbound' && (
                                            <span className={`text-[10px] ${msg.status === 'read' ? 'text-blue-500' : 'text-gray-400'}`}>
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
                    <div className="bg-[#F0F2F5] px-4 py-3 z-10">
                        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                            <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition">
                                <i className="far fa-smile text-xl"></i>
                            </button>
                            <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition">
                                <i className="fas fa-paperclip text-xl"></i>
                            </button>
                            <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex items-center">
                                <input 
                                    type="text" 
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    placeholder="Digite uma mensagem" 
                                    className="w-full px-4 py-3 focus:outline-none text-sm"
                                />
                            </div>
                            {inputMessage.trim() ? (
                                <button type="submit" className="p-3 bg-[#00A884] text-white rounded-full hover:bg-[#008F6F] transition shadow-sm">
                                    <i className="fas fa-paper-plane"></i>
                                </button>
                            ) : (
                                <button type="button" className="p-3 text-gray-500 hover:text-gray-700 transition">
                                    <i className="fas fa-microphone text-xl"></i>
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-[#F0F2F5] border-b-4 border-[#00A884] flex flex-col items-center justify-center text-center p-8">
                    <div className="w-64 h-64 bg-gray-200 rounded-full flex items-center justify-center mb-8 opacity-50">
                        <i className="fab fa-whatsapp text-9xl text-gray-400"></i>
                    </div>
                    <h2 className="text-3xl font-light text-gray-700 mb-4">GDN_IA WhatsApp Web</h2>
                    <p className="text-gray-500 max-w-md">
                        Envie e receba mensagens sem precisar manter seu celular conectado.
                        <br/>Use o WhatsApp em até 4 aparelhos e 1 telefone ao mesmo tempo.
                    </p>
                    <div className="mt-8 flex items-center gap-2 text-xs text-gray-400">
                        <i className="fas fa-lock"></i> Protegido com criptografia de ponta a ponta
                    </div>
                </div>
            )}
        </div>
    );
}
