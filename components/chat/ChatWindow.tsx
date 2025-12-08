
import React, { useState, useEffect, useRef } from 'react';
import { ChatConversation, ChatMessage } from '../../types';
import { getMessages, sendMessage } from '../../services/chatService';

interface ChatWindowProps {
    conversation: ChatConversation;
}

export function ChatWindow({ conversation }: ChatWindowProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const load = async () => {
            const data = await getMessages(conversation.id);
            setMessages(data);
            scrollToBottom();
        };
        load();
    }, [conversation.id]);

    const scrollToBottom = () => {
        if(scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const tempId = Date.now().toString();
        const optimisticMsg: ChatMessage = {
            id: tempId,
            conversation_id: conversation.id,
            sender_type: 'agent',
            content: input,
            status: 'sent',
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setInput('');
        scrollToBottom();
        setSending(true);

        try {
            const realMsg = await sendMessage(conversation.id, optimisticMsg.content);
            setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
        } catch (e) {
            console.error("Failed to send", e);
            // Show error state on message
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#EFE7DD] relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] pointer-events-none"></div>

            {/* Header */}
            <div className="h-16 bg-[#F0F2F5] border-b border-gray-300 flex items-center px-4 justify-between z-10">
                <div className="flex items-center gap-3">
                    <img src={conversation.contact.profile_pic_url} className="w-10 h-10 rounded-full" />
                    <div>
                        <h3 className="font-bold text-[#263238]">{conversation.contact.name}</h3>
                        <p className="text-xs text-gray-500">{conversation.contact.phone}</p>
                    </div>
                </div>
                <div className="flex gap-4 text-gray-600">
                    <button title="Buscar"><i className="fas fa-search"></i></button>
                    <button title="Opções"><i className="fas fa-ellipsis-v"></i></button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 relative z-10 custom-scrollbar" ref={scrollRef}>
                {messages.map((msg) => {
                    const isMe = msg.sender_type === 'agent';
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-lg p-2 px-3 text-sm shadow-sm relative ${isMe ? 'bg-[#D9FDD3] text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}`}>
                                <p>{msg.content}</p>
                                <div className="text-[10px] text-gray-500 text-right mt-1 flex justify-end items-center gap-1">
                                    {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    {isMe && (
                                        <i className={`fas fa-check-double ${msg.status === 'read' ? 'text-blue-500' : 'text-gray-400'}`}></i>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input */}
            <div className="bg-[#F0F2F5] p-3 z-10">
                <form onSubmit={handleSend} className="flex gap-2 items-end">
                    <button type="button" className="text-gray-500 p-3 hover:bg-gray-200 rounded-full transition"><i className="far fa-smile text-xl"></i></button>
                    <button type="button" className="text-gray-500 p-3 hover:bg-gray-200 rounded-full transition"><i className="fas fa-paperclip text-xl"></i></button>
                    <div className="flex-1 bg-white rounded-lg border border-gray-300 p-2 max-h-32 overflow-y-auto">
                        <input 
                            type="text" 
                            className="w-full outline-none text-sm p-1" 
                            placeholder="Digite uma mensagem"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={!input.trim()}
                        className="text-gray-500 p-3 hover:bg-gray-200 rounded-full transition disabled:opacity-50"
                    >
                        {input.trim() ? <i className="fas fa-paper-plane text-green-600 text-xl"></i> : <i className="fas fa-microphone text-xl"></i>}
                    </button>
                </form>
            </div>
        </div>
    );
}
