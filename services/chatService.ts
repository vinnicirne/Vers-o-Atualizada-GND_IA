
import { WhatsAppInstance, ChatConversation, ChatMessage, ChatQueue, ChatAgent } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Simulação de banco de dados local para o frontend
let MOCK_INSTANCES: WhatsAppInstance[] = [];
let MOCK_CONVERSATIONS: ChatConversation[] = [];
let MOCK_MESSAGES: ChatMessage[] = [];
let MOCK_QUEUES: ChatQueue[] = [
    { id: 'q1', name: 'Suporte', color: 'bg-blue-500', created_at: new Date().toISOString() },
    { id: 'q2', name: 'Vendas', color: 'bg-green-500', created_at: new Date().toISOString() }
];
let MOCK_AGENTS: ChatAgent[] = [
    { id: 'a1', name: 'Admin User', email: 'admin@gdn.ia', role: 'admin', status: 'online' },
    { id: 'a2', name: 'Support Agent', email: 'suporte@gdn.ia', role: 'agent', status: 'offline' }
];

// Helper para delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- INSTANCES ---
export const getWhatsAppInstances = async (): Promise<WhatsAppInstance[]> => {
    await delay(500);
    return MOCK_INSTANCES;
};

export const createWhatsAppInstance = async (
    name: string, 
    connectionType: 'gateway' | 'official',
    apiUrl?: string, 
    token?: string
): Promise<WhatsAppInstance> => {
    await delay(1000);
    
    const newInstance: WhatsAppInstance = {
        id: uuidv4(),
        user_id: 'current_user',
        name,
        connection_type: connectionType,
        api_url: apiUrl,
        api_token: token,
        // Se for gateway, começa esperando QR. Se oficial, assume connecting se tiver credenciais
        status: connectionType === 'gateway' ? 'qr_ready' : 'connecting', 
        created_at: new Date().toISOString()
    };
    
    MOCK_INSTANCES.push(newInstance);
    
    // Se for oficial e tiver credenciais, simula conexão rápida
    if (connectionType === 'official') {
        setTimeout(() => {
            newInstance.status = 'connected';
            newInstance.phone_number = '5511999999999';
        }, 3000);
    }
    
    // NOTA: Se for 'gateway', o frontend vai chamar uma rota separada para pegar o QR
    // e o status só muda quando o webhook bater (aqui simulado no frontend component)

    return newInstance;
};

// Simula a mudança de status pós-leitura do QR
export const simulateQrScan = async (instanceId: string) => {
    await delay(2000);
    const instance = MOCK_INSTANCES.find(i => i.id === instanceId);
    if (instance) {
        instance.status = 'connected';
        instance.phone_number = '5511988887777';
    }
};

export const deleteWhatsAppInstance = async (id: string) => {
    await delay(500);
    MOCK_INSTANCES = MOCK_INSTANCES.filter(i => i.id !== id);
};

// --- QUEUES ---
export const getChatQueues = async (): Promise<ChatQueue[]> => {
    await delay(300);
    return MOCK_QUEUES;
};

export const createChatQueue = async (name: string, color: string): Promise<ChatQueue> => {
    await delay(500);
    const newQueue: ChatQueue = {
        id: uuidv4(),
        name,
        color,
        created_at: new Date().toISOString()
    };
    MOCK_QUEUES.push(newQueue);
    return newQueue;
};

export const deleteChatQueue = async (id: string) => {
    await delay(300);
    MOCK_QUEUES = MOCK_QUEUES.filter(q => q.id !== id);
};

// --- AGENTS ---
export const getChatAgents = async (): Promise<ChatAgent[]> => {
    await delay(300);
    return MOCK_AGENTS;
};

export const createChatAgent = async (email: string, name: string): Promise<ChatAgent> => {
    await delay(500);
    const newAgent: ChatAgent = {
        id: uuidv4(),
        email,
        name,
        role: 'agent',
        status: 'offline'
    };
    MOCK_AGENTS.push(newAgent);
    return newAgent;
};

// --- CONVERSATIONS ---
export const getConversations = async (instanceId: string): Promise<ChatConversation[]> => {
    await delay(300);
    if (MOCK_CONVERSATIONS.length === 0) {
        // Seed initial conversations
        MOCK_CONVERSATIONS = [
            {
                id: '1',
                instance_id: instanceId,
                contact_id: 'c1',
                contact: { id: 'c1', name: 'João Silva', phone: '5511988887777', profile_pic_url: 'https://ui-avatars.com/api/?name=Joao+Silva&background=random' },
                last_message: 'Olá, gostaria de saber sobre os planos.',
                last_message_at: new Date().toISOString(),
                unread_count: 2,
                status: 'open',
                queue_id: 'q2' // Vendas
            },
            {
                id: '2',
                instance_id: instanceId,
                contact_id: 'c2',
                contact: { id: 'c2', name: 'Maria Souza', phone: '5511977776666', profile_pic_url: 'https://ui-avatars.com/api/?name=Maria+Souza&background=random' },
                last_message: 'Obrigado pelo atendimento!',
                last_message_at: new Date(Date.now() - 3600000).toISOString(),
                unread_count: 0,
                status: 'closed',
                queue_id: 'q1' // Suporte
            }
        ];
    }
    if (instanceId === 'any') return MOCK_CONVERSATIONS;
    return MOCK_CONVERSATIONS.filter(c => c.instance_id === instanceId);
};

export const getMessages = async (conversationId: string): Promise<ChatMessage[]> => {
    await delay(300);
    if (MOCK_MESSAGES.filter(m => m.conversation_id === conversationId).length === 0) {
        // Seed
        MOCK_MESSAGES.push(
            { id: uuidv4(), conversation_id: conversationId, sender_type: 'contact', content: 'Olá, bom dia!', status: 'read', created_at: new Date(Date.now() - 100000).toISOString() },
            { id: uuidv4(), conversation_id: conversationId, sender_type: 'agent', content: 'Bom dia! Como posso ajudar?', status: 'read', created_at: new Date(Date.now() - 90000).toISOString() }
        );
        
        // Add specific message for the conversation
        const conv = MOCK_CONVERSATIONS.find(c => c.id === conversationId);
        if (conv) {
             MOCK_MESSAGES.push({ id: uuidv4(), conversation_id: conversationId, sender_type: 'contact', content: conv.last_message || '...', status: 'delivered', created_at: conv.last_message_at });
        }
    }
    return MOCK_MESSAGES.filter(m => m.conversation_id === conversationId).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

export const sendMessage = async (conversationId: string, content: string): Promise<ChatMessage> => {
    await delay(300); // Network latency
    const newMessage: ChatMessage = {
        id: uuidv4(),
        conversation_id: conversationId,
        sender_type: 'agent',
        content,
        status: 'sent',
        created_at: new Date().toISOString()
    };
    MOCK_MESSAGES.push(newMessage);
    
    // Update conversation last message
    const convIndex = MOCK_CONVERSATIONS.findIndex(c => c.id === conversationId);
    if (convIndex >= 0) {
        MOCK_CONVERSATIONS[convIndex].last_message = content;
        MOCK_CONVERSATIONS[convIndex].last_message_at = newMessage.created_at;
    }

    return newMessage;
};
