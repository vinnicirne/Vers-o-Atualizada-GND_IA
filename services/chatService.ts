
import { WhatsAppInstance, ChatConversation, ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Simulação de banco de dados local para o frontend
let MOCK_INSTANCES: WhatsAppInstance[] = [];
let MOCK_CONVERSATIONS: ChatConversation[] = [];
let MOCK_MESSAGES: ChatMessage[] = [];

// Helper para delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getWhatsAppInstances = async (): Promise<WhatsAppInstance[]> => {
    await delay(500);
    return MOCK_INSTANCES;
};

export const createWhatsAppInstance = async (name: string, apiUrl: string, token: string): Promise<WhatsAppInstance> => {
    await delay(1000);
    const newInstance: WhatsAppInstance = {
        id: uuidv4(),
        user_id: 'current_user',
        name,
        api_url: apiUrl,
        api_token: token,
        status: 'connecting',
        created_at: new Date().toISOString()
    };
    MOCK_INSTANCES.push(newInstance);
    
    // Simula conexão após 3 segundos
    setTimeout(() => {
        newInstance.status = 'connected';
        newInstance.phone_number = '5511999999999';
    }, 3000);

    return newInstance;
};

export const deleteWhatsAppInstance = async (id: string) => {
    await delay(500);
    MOCK_INSTANCES = MOCK_INSTANCES.filter(i => i.id !== id);
};

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
                status: 'open'
            },
            {
                id: '2',
                instance_id: instanceId,
                contact_id: 'c2',
                contact: { id: 'c2', name: 'Maria Souza', phone: '5511977776666', profile_pic_url: 'https://ui-avatars.com/api/?name=Maria+Souza&background=random' },
                last_message: 'Obrigado pelo atendimento!',
                last_message_at: new Date(Date.now() - 3600000).toISOString(),
                unread_count: 0,
                status: 'closed'
            }
        ];
    }
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
