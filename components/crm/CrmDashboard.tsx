
import React, { useState, useEffect, useRef } from 'react';

// MOCK DATA PARA VISUALIZAÇÃO IMEDIATA (Substituir por chamadas reais API)
const MOCK_CONVERSATIONS = [
    { id: 1, name: "Maria Silva", phone: "5511999998888", lastMessage: "Olá, gostaria de saber mais sobre o plano.", time: "10:30", unread: 2, status: "open", tags: ["Vendas"] },
    { id: 2, name: "João Souza", phone: "5521988887777", lastMessage: "Obrigado pelo atendimento!", time: "Ontem", unread: 0, status: "closed", tags: ["Suporte"] },
    { id: 3, name: "Empresa XYZ", phone: "5531977776666", lastMessage: "Aguardando retorno.", time: "Ontem", unread: 0, status: "pending", tags: ["Financeiro"] },
];

const MOCK_MESSAGES = [
    { id: 1, text: "Olá, bom dia! Como posso ajudar?", fromMe: true, time: "10:00" },
    { id: 2, text: "Olá, gostaria de saber mais sobre o plano Premium.", fromMe: false, time: "10:05" },
    { id: 3, text: "Claro! O plano Premium oferece créditos ilimitados e acesso ao CRM.", fromMe: true, time: "10:06" },
];

export function CrmDashboard() {
    const [activeTab, setActiveTab] = useState<'chats' | 'connection'>('chats');
    const [selectedChat, setSelectedChat] = useState<number | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
    const [messages, setMessages] = useState(MOCK_MESSAGES);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, selectedChat]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim()) return;

        const newMessage = {
            id: Date.now(),
            text: messageInput,
            fromMe: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages([...messages, newMessage]);
        setMessageInput("");
        
        // Simular resposta
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "Entendi, obrigado!",
                fromMe: false,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        }, 2000);
    };

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            
            {/* LEFT COLUMN: SIDEBAR LIST */}
            <div className="w-full md:w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
                {/* Header da Lista */}
                <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setActiveTab('chats')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'chats' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            <i className="fas fa-comments mr-1"></i> Conversas
                        </button>
                        <button 
                            onClick={() => setActiveTab('connection')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'connection' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            <i className="fas fa-qrcode mr-1"></i> Conexão
                        </button>
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
                                {conversations.map(chat => (
                                    <div 
                                        key={chat.id}
                                        onClick={() => setSelectedChat(chat.id)}
                                        className={`p-4 cursor-pointer hover:bg-blue-50 transition flex gap-3 ${selectedChat === chat.id ? 'bg-blue-100/50' : 'bg-white'}`}
                                    >
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                                                {chat.name.charAt(0)}
                                            </div>
                                            {/* Status Dot */}
                                            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-gray-800 text-sm truncate">{chat.name}</h4>
                                                <span className="text-[10px] text-gray-400">{chat.time}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 truncate mt-0.5">{chat.lastMessage}</p>
                                            <div className="flex mt-1.5 gap-1">
                                                {chat.tags.map(tag => (
                                                    <span key={tag} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                        {chat.unread > 0 && (
                                            <div className="flex flex-col justify-center">
                                                <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                    {chat.unread}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 text-center">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 inline-block mb-4">
                                {/* Placeholder QR */}
                                <div className="w-48 h-48 bg-gray-100 flex items-center justify-center text-gray-400 rounded-lg">
                                    <i className="fas fa-qrcode text-6xl"></i>
                                </div>
                            </div>
                            <h3 className="font-bold text-gray-800 mb-2">Conectar WhatsApp</h3>
                            <p className="text-xs text-gray-500 mb-4">Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o código acima.</p>
                            <div className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full inline-block font-bold">
                                Status: Aguardando leitura
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: CHAT WINDOW */}
            <div className="hidden md:flex flex-1 flex-col bg-[#E5DDD5]/30 relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] pointer-events-none"></div>

                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 bg-white border-b border-gray-200 flex items-center px-4 justify-between z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                    {conversations.find(c => c.id === selectedChat)?.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{conversations.find(c => c.id === selectedChat)?.name}</h3>
                                    <p className="text-xs text-gray-500">{conversations.find(c => c.id === selectedChat)?.phone}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 text-gray-500">
                                <button className="p-2 hover:bg-gray-100 rounded-full"><i className="fas fa-search"></i></button>
                                <button className="p-2 hover:bg-gray-100 rounded-full"><i className="fas fa-ellipsis-v"></i></button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-0">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-lg px-4 py-2 shadow-sm relative ${msg.fromMe ? 'bg-[#D9FDD3] text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}`}>
                                        <p className="text-sm">{msg.text}</p>
                                        <span className="text-[10px] text-gray-500 block text-right mt-1 ml-4">{msg.time}</span>
                                        {/* Tail triangle */}
                                        <div className={`absolute top-0 w-0 h-0 border-[6px] border-transparent ${msg.fromMe ? '-right-[6px] border-t-[#D9FDD3] border-l-[#D9FDD3]' : '-left-[6px] border-t-white border-r-white'}`}></div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-[#F0F2F5] flex items-center gap-2 z-10">
                            <button className="text-gray-500 hover:text-gray-700 p-2"><i className="far fa-smile text-xl"></i></button>
                            <button className="text-gray-500 hover:text-gray-700 p-2"><i className="fas fa-paperclip text-xl"></i></button>
                            <form className="flex-1 flex gap-2" onSubmit={handleSendMessage}>
                                <input 
                                    type="text" 
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    placeholder="Digite uma mensagem" 
                                    className="flex-1 bg-white border-none rounded-lg px-4 py-2 focus:ring-0 text-sm shadow-sm" 
                                />
                                <button type="submit" className="text-gray-500 hover:text-blue-600 p-2">
                                    {messageInput ? <i className="fas fa-paper-plane text-xl text-blue-600"></i> : <i className="fas fa-microphone text-xl"></i>}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-[#F0F2F5] border-b-[6px] border-green-500 z-10">
                        <div className="w-64 h-64 bg-gray-200 rounded-full flex items-center justify-center mb-6 opacity-50">
                            <i className="fas fa-comments text-8xl text-gray-400"></i>
                        </div>
                        <h2 className="text-3xl font-light text-gray-600 mb-4">GDN_IA <span className="font-bold">Whaticket</span></h2>
                        <p className="text-sm text-gray-500 text-center max-w-md">
                            Envie e receba mensagens sem precisar manter seu celular conectado.<br/>
                            Use o GDN_IA em até 4 aparelhos e 1 telefone ao mesmo tempo.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
