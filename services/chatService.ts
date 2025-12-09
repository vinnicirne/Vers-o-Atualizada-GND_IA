
import { api } from './api';
import { QuickAnswer, ChatConnection, ChatTicket, ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { generateChatResponse } from './geminiService';

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
        
        last_activity: new Date().toISOString(),
        created_at: new Date().toISOString(),
        
        ai_config: connData.ai_config || { enabled: false, personality: 'formal' }
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

// --- CHAT SYSTEM (MOCK / SIMULATION) ---
// Since we don't have a real backend for messages yet, we simulate state here.

let MOCK_TICKETS: ChatTicket[] = [
    { id: '1', contact_id: 'c1', contact_name: 'João Silva', contact_number: '+55 11 99999-9999', last_message: 'Olá, gostaria de saber sobre preços.', last_message_time: new Date().toISOString(), unread_count: 1, status: 'open', tags: ['lead'], ai_enabled: true },
    { id: '2', contact_id: 'c2', contact_name: 'Maria Oliveira', contact_number: '+55 11 98888-8888', last_message: 'Obrigada pelo suporte!', last_message_time: new Date(Date.now() - 3600000).toISOString(), unread_count: 0, status: 'closed', tags: ['cliente'], ai_enabled: false },
    { id: '3', contact_id: 'c3', contact_name: 'Carlos Souza', contact_number: '+55 21 97777-7777', last_message: 'Quando chega meu pedido?', last_message_time: new Date(Date.now() - 7200000).toISOString(), unread_count: 2, status: 'open', tags: ['suporte'], ai_enabled: true },
    { id: '4', contact_id: 'c4', contact_name: 'Ana Pereira', contact_number: '+55 31 96666-6666', last_message: 'Quero cancelar.', last_message_time: new Date(Date.now() - 86400000).toISOString(), unread_count: 0, status: 'open', tags: ['financeiro'], ai_enabled: true },
];

let MOCK_MESSAGES: Record<string, ChatMessage[]> = {
    '1': [
        { id: 'm1', ticket_id: '1', sender: 'contact', content: 'Olá, boa tarde.', timestamp: new Date(Date.now() - 100000).toISOString(), status: 'read' },
        { id: 'm2', ticket_id: '1', sender: 'contact', content: 'Gostaria de saber sobre preços.', timestamp: new Date().toISOString(), status: 'read' }
    ],
    '2': [
        { id: 'm3', ticket_id: '2', sender: 'user', content: 'Seu problema foi resolvido?', timestamp: new Date(Date.now() - 4000000).toISOString(), status: 'read' },
        { id: 'm4', ticket_id: '2', sender: 'contact', content: 'Sim, obrigada pelo suporte!', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'read' }
    ],
    '3': [
        { id: 'm5', ticket_id: '3', sender: 'contact', content: 'Fiz um pedido ontem.', timestamp: new Date(Date.now() - 7300000).toISOString(), status: 'read' },
        { id: 'm6', ticket_id: '3', sender: 'contact', content: 'Quando chega meu pedido?', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'read' }
    ],
    '4': [
        { id: 'm7', ticket_id: '4', sender: 'contact', content: 'Oi, quero cancelar minha assinatura.', timestamp: new Date(Date.now() - 86400000).toISOString(), status: 'read' }
    ]
};

export const getTickets = async (userId: string): Promise<ChatTicket[]> => {
    // In a real app, fetch from Supabase
    return new Promise(resolve => setTimeout(() => resolve(MOCK_TICKETS), 500));
};

export const getMessages = async (ticketId: string): Promise<ChatMessage[]> => {
    // In a real app, fetch from Supabase
    return new Promise(resolve => setTimeout(() => resolve(MOCK_MESSAGES[ticketId] || []), 300));
};

export const sendMessage = async (ticketId: string, text: string, sender: 'user' | 'bot' = 'user'): Promise<ChatMessage> => {
    const newMessage: ChatMessage = {
        id: uuidv4(),
        ticket_id: ticketId,
        sender: sender,
        content: text,
        timestamp: new Date().toISOString(),
        status: 'sent'
    };

    // Update Mock Data
    if (!MOCK_MESSAGES[ticketId]) MOCK_MESSAGES[ticketId] = [];
    MOCK_MESSAGES[ticketId].push(newMessage);
    
    // Update Ticket Last Message
    const ticketIndex = MOCK_TICKETS.findIndex(t => t.id === ticketId);
    if (ticketIndex >= 0) {
        MOCK_TICKETS[ticketIndex].last_message = text;
        MOCK_TICKETS[ticketIndex].last_message_time = newMessage.timestamp;
        // If sender is user, mark read
        if (sender === 'user' || sender === 'bot') {
            MOCK_TICKETS[ticketIndex].unread_count = 0;
        }
    }

    return newMessage;
};

// Simulate Customer Reply
export const simulateIncomingMessage = async (ticketId: string): Promise<ChatMessage> => {
    const responses = [
        "Entendi, obrigado!",
        "Vou verificar.",
        "Qual o prazo de entrega?",
        "Pode me enviar o catálogo?",
        "Ok, aguardo.",
        "Interessante, conte mais."
    ];
    const text = responses[Math.floor(Math.random() * responses.length)];
    
    const newMessage: ChatMessage = {
        id: uuidv4(),
        ticket_id: ticketId,
        sender: 'contact',
        content: text,
        timestamp: new Date().toISOString(),
        status: 'delivered'
    };

    if (!MOCK_MESSAGES[ticketId]) MOCK_MESSAGES[ticketId] = [];
    MOCK_MESSAGES[ticketId].push(newMessage);

    const ticketIndex = MOCK_TICKETS.findIndex(t => t.id === ticketId);
    if (ticketIndex >= 0) {
        MOCK_TICKETS[ticketIndex].last_message = text;
        MOCK_TICKETS[ticketIndex].last_message_time = newMessage.timestamp;
        MOCK_TICKETS[ticketIndex].unread_count += 1;
    }

    return newMessage;
};

// AI Helper
export const generateSmartReply = async (messages: ChatMessage[]) => {
    // Format history for AI
    const history = messages.slice(-10).map(m => `${m.sender === 'contact' ? 'Cliente' : 'Agente'}: ${m.content}`).join('\n');
    return generateChatResponse(history, 'reply');
};

// Dashboard Metrics Helper
export const getChatMetrics = async () => {
    await new Promise(resolve => setTimeout(resolve, 600)); // Simula delay de rede
    
    const totalTickets = MOCK_TICKETS.length;
    const openTickets = MOCK_TICKETS.filter(t => t.status === 'open').length;
    const unreadMessages = MOCK_TICKETS.reduce((acc, t) => acc + t.unread_count, 0);
    
    // Mock chart data based on simulated activity
    const weeklyData = [
        { name: 'Seg', leads: 45, sales: 20 },
        { name: 'Ter', leads: 52, sales: 25 },
        { name: 'Qua', leads: 38, sales: 18 },
        { name: 'Qui', leads: 65, sales: 40 },
        { name: 'Sex', leads: 48, sales: 30 },
        { name: 'Sab', leads: 25, sales: 15 },
        { name: 'Dom', leads: 15, sales: 10 },
    ];

    return {
        totalLeads: 1240 + totalTickets,
        conversionRate: "18.5%",
        avgResponseTime: "2m 30s",
        activeTickets: openTickets,
        unreadCount: unreadMessages,
        weeklyData
    };
};
