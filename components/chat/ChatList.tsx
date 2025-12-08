
import React from 'react';
import { ChatConversation } from '../../types';

interface ChatListProps {
    conversations: ChatConversation[];
    selectedId?: string;
    onSelect: (chat: ChatConversation) => void;
    loading: boolean;
}

export function ChatList({ conversations, selectedId, onSelect, loading }: ChatListProps) {
    if (loading) {
        return (
            <div className="p-4 space-y-3">
                {[1,2,3].map(i => (
                    <div key={i} className="animate-pulse flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="p-8 text-center text-gray-400">
                <i className="far fa-comments text-4xl mb-3"></i>
                <p className="text-sm">Nenhuma conversa iniciada.</p>
            </div>
        );
    }

    return (
        <div className="overflow-y-auto h-full">
            {conversations.map(chat => (
                <div 
                    key={chat.id}
                    onClick={() => onSelect(chat)}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition border-b border-gray-50 hover:bg-gray-50 ${selectedId === chat.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''}`}
                >
                    <div className="relative">
                        <img 
                            src={chat.contact.profile_pic_url} 
                            alt={chat.contact.name} 
                            className="w-12 h-12 rounded-full object-cover border border-gray-200"
                        />
                        {/* Status dot example */}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                            <h4 className="font-bold text-[#263238] text-sm truncate">{chat.contact.name}</h4>
                            <span className="text-[10px] text-gray-400">{new Date(chat.last_message_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{chat.last_message}</p>
                    </div>

                    {chat.unread_count > 0 && (
                        <div className="min-w-[20px] h-5 bg-green-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1">
                            {chat.unread_count}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
