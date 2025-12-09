
import { supabase } from './supabaseClient';
import { ChatConversation, ChatMessage, AiSettings } from '../types';
import { api } from './api';

export const getConversations = async (): Promise<ChatConversation[]> => {
    const { data, error } = await supabase
        .from('conversations')
        .select(`
            *,
            contact:contact_id (
                name,
                phone
            )
        `)
        .order('last_message_at', { ascending: false });

    if (error) {
        console.error("Erro ao buscar conversas:", error);
        return [];
    }
    return data || [];
};

export const getMessages = async (conversationId: string): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Erro ao buscar mensagens:", error);
        return [];
    }
    return data || [];
};

export const subscribeToConversations = (callback: (payload: any) => void) => {
    return supabase
        .channel('public:conversations')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, callback)
        .subscribe();
};

export const subscribeToMessages = (conversationId: string, callback: (payload: any) => void) => {
    return supabase
        .channel(`public:messages:${conversationId}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
        }, callback)
        .subscribe();
};

// --- AI SETTINGS ---

export const getAiSettings = async (userId: string): Promise<AiSettings> => {
    const { data, error } = await api.select('ai_settings', { user_id: userId });
    
    if (error || !data || data.length === 0) {
        // Return default if not found
        return {
            enabled: false,
            temperature: 0.7,
            system_prompt: "Você é um assistente virtual útil e profissional. Responda de forma clara e concisa."
        };
    }
    return data[0];
};

export const updateAiSettings = async (userId: string, settings: Partial<AiSettings>) => {
    // Check if exists
    const { data } = await api.select('ai_settings', { user_id: userId });
    
    if (data && data.length > 0) {
        await api.update('ai_settings', settings, { user_id: userId });
    } else {
        await api.insert('ai_settings', { 
            user_id: userId,
            ...settings
        });
    }
};
