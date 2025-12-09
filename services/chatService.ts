
import { api } from './api';
import { QuickAnswer, ChatConnection } from '../types';
import { v4 as uuidv4 } from 'uuid';

// --- QUICK ANSWERS ---

export const getQuickAnswers = async (userId: string): Promise<QuickAnswer[]> => {
    const { data, error } = await api.select('chat_quick_answers', { user_id: userId });
    if (error) {
        // Se tabela não existir, retorna array vazio
        if (typeof error === 'string' && error.includes('does not exist')) return [];
        throw new Error(error);
    }
    return data || [];
};

export const createQuickAnswer = async (answer: Partial<QuickAnswer>, userId: string) => {
    const newAnswer = {
        id: uuidv4(),
        user_id: userId,
        ...answer,
        created_at: new Date().toISOString()
    };
    const { error } = await api.insert('chat_quick_answers', newAnswer);
    if (error) throw new Error(error);
    return newAnswer;
};

export const deleteQuickAnswer = async (id: string) => {
    const { error } = await api.delete('chat_quick_answers', { id });
    if (error) throw new Error(error);
};

// --- CONNECTIONS (WHATSAPP) ---

export const getConnections = async (userId: string): Promise<ChatConnection[]> => {
    const { data, error } = await api.select('chat_connections', { user_id: userId });
    if (error) {
        if (typeof error === 'string' && error.includes('does not exist')) return [];
        throw new Error(error);
    }
    return data || [];
};

export const createConnection = async (connData: Partial<ChatConnection>, userId: string) => {
    const isOfficial = connData.type === 'official_api';
    
    // Configuração inicial
    const newConnection = {
        id: uuidv4(),
        user_id: userId,
        name: connData.name || 'Nova Conexão',
        type: connData.type || 'legacy_qrcode',
        profile_type: connData.profile_type || 'personal', // Salva o tipo do perfil
        status: isOfficial ? 'connected' : 'qrcode', // API Oficial assume conectado se token valido, QR espera scan
        
        // Mensagens
        greeting_message: connData.greeting_message,
        farewell_message: connData.farewell_message,
        
        // Official
        phone_number_id: connData.phone_number_id,
        waba_id: connData.waba_id,
        api_token: connData.api_token,

        // Legacy (Simulado)
        session_name: `session_${Date.now()}`,
        qrcode: !isOfficial ? 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=SimulacaoConexaoGenesis' : null, // Mock QR para demo
        
        last_activity: new Date().toISOString(), // Changed to last_activity
        created_at: new Date().toISOString()
    };

    const { error } = await api.insert('chat_connections', newConnection);
    if (error) throw new Error(error);
    
    return newConnection;
};

export const deleteConnection = async (id: string) => {
    const { error } = await api.delete('chat_connections', { id });
    if (error) throw new Error(error);
};

// Função para simular atualização de status (num app real, isso viria via Webhook/Socket)
export const simulateConnectionScan = async (connectionId: string) => {
    await api.update('chat_connections', { status: 'connected', qrcode: null }, { id: connectionId });
};
