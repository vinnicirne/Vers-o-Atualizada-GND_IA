
import { api } from './api';
import { logger } from './loggerService';
import { User, Log, UserRole, NewsStatus, NewsArticle, UserStatus, Transaction, PaymentSettings, MultiAISettings, AILog, CreditPackage, AIModel, Plan, AllowedDomain, SecuritySettings, AffiliateLog, Popup, ToolSetting, WhiteLabelSettings, Lead, LeadStatus } from '../types';
import { GUEST_ID, CREATOR_SUITE_MODES } from '../constants';
import { supabase } from './supabaseClient'; // Import supabase directly for complex queries

// Helper for client-side pagination since API might return all data
const paginate = (items: any[], page: number, limit: number) => {
  const from = (page - 1) * limit;
  const to = from + limit;
  return items.slice(from, to);
};

// --- DOMAIN BLACKLIST ---
const DOMAIN_BLACKLIST = [
    'teste.com',
    'teste.com.br',
    'test.com',
    'example.com',
    'exemplo.com',
    'email.com',
    'usuario.com',
    'tempmail.com',
    '10minutemail.com',
    'mailinator.com',
    'yopmail.com',
    'throwawaymail.com'
];

// --- LEAD GENERATION & CRM SYSTEM ---

export const createLead = async (leadData: Partial<Lead>) => {
    // 1. Salva o Lead no Banco de Dados
    const { data, error } = await api.insert('leads', {
        email: leadData.email,
        nome: leadData.nome,
        telefone: leadData.telefone,
        empresa: leadData.empresa,
        utm_source: leadData.utm_source,
        utm_medium: leadData.utm_medium,
        utm_campaign: leadData.utm_campaign,
        status_funil: 'new',
        score: 10, // Score inicial por cadastro
        tags: ['lead_magnet', 'ebook_prompts'], // Tags padrão
        consentimento: leadData.consentimento,
        created_at: new Date().toISOString()
    });
    
    if (error) throw new Error(typeof error === 'string' ? error : error.message);
    
    // 2. Dispara a Automação de E-mail (Lead Magnet)
    // Usamos 'invoke' do supabase client diretamente, sem await para não travar a UI (Fire-and-forget)
    if (leadData.email) {
        supabase.functions.invoke('deliver-lead-magnet', {
            body: { 
                email: leadData.email, 
                nome: leadData.nome 
            }
        }).then(({ error }) => {
            if (error) console.error("Falha na automação de e-mail:", error);
            else console.log("Automação de e-mail disparada com sucesso.");
        });
    }

    return data ? data[0] : null;
};

export const getLeads = async ({ status }: { status?: LeadStatus | 'all' } = {}): Promise<Lead[]> => {
    const filters: any = {};
    if (status && status !== 'all') filters.status_funil = status;
    
    const { data, error } = await api.select('leads', filters);
    
    if (error) {
        if (typeof error === 'string' && error.includes('does not exist')) {
            console.warn("Tabela 'leads' não encontrada. Admin deve criar.");
            return [];
        }
        throw new Error(typeof error === 'string' ? error : error.message);
    }
    
    return (data || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const updateLeadStatus = async (id: string, status: LeadStatus, adminId: string) => {
    const { error } = await api.update('leads', { status_funil: status }, { id });
    if (error) throw new Error(typeof error === 'string' ? error : error.message);
    logger.info(adminId, 'Sistema', 'update_lead_status', { leadId: id, status });
};

export const deleteLead = async (id: string, adminId: string) => {
    const { error } = await api.delete('leads', { id });
    if (error) throw new Error(typeof error === 'string' ? error : error.message);
    logger.warn(adminId, 'Sistema', 'delete_lead', { leadId: id });
};

export const testEmailIntegration = async (email: string) => {
    const { data, error } = await supabase.functions.invoke('deliver-lead-magnet', {
        body: { email, nome: 'Teste Admin' }
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    
    return data;
};

// --- NOTIFICATIONS SYSTEM (ADMIN) ---

export const sendSystemNotification = async (
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error',
    targetUserId: string | 'all',
    actionLink?: string,
    adminId?: string
) => {
    try {
        if (targetUserId === 'all') {
            // Envio em Massa (Broadcast)
            // 1. Busca todos os IDs de usuários ativos
            const { data: users, error: usersError } = await api.select('app_users', { status: 'active' });
            
            if (usersError || !users) throw new Error("Erro ao buscar lista de usuários para envio em massa.");

            if (users.length === 0) return { success: true, count: 0 };

            // 2. Prepara o payload em lote
            const notifications = users.map((u: any) => ({
                user_id: u.id,
                title,
                message,
                type,
                action_link: actionLink || null,
                is_read: false,
                created_at: new Date().toISOString()
            }));

            // 3. Insere em lote (Supabase suporta insert de array)
            const { error } = await api.insert('notifications', notifications);
            if (error) throw new Error(error);

            logger.info(adminId || 'system', 'Sistema', 'send_broadcast_notification', { title, count: users.length });
            return { success: true, count: users.length };

        } else {
            // Envio Individual
            const { error } = await api.insert('notifications', {
                user_id: targetUserId,
                title,
                message,
                type,
                action_link: actionLink || null,
                is_read: false
            });

            if (error) throw new Error(error);
            logger.info(adminId || 'system', 'Sistema', 'send_user_notification', { title, targetUserId });
            return { success: true, count: 1 };
        }
    } catch (e: any) {
        console.error("Erro ao enviar notificação:", e);
        throw e;
    }
};

// --- AFFILIATE SYSTEM ---

export const generateAffiliateCode = async (userId: string, fullName: string): Promise<string> => {
    let base = 'PARTNER';
    
    if (fullName) {
        base = fullName
            .split(' ')[0]
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .replace(/[^A-Z]/g, '');
    }
    
    if (!base || base.length < 2) {
        base = 'PARTNER';
    }

    let code = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
        const random = Math.floor(1000 + Math.random() * 9000);
        code = `${base}-${random}`;
        
        const { data, error } = await api.select('app_users', { affiliate_code: code });
        
        if (!error && (!data || data.length === 0)) {
            isUnique = true;
        }
        attempts++;
        
        if (!isUnique) await new Promise(r => setTimeout(r, 200));
    }

    if (!isUnique) {
        code = `${base}-${Date.now().toString().slice(-4)}`;
    }
    
    await api.update('app_users', { affiliate_code: code }, { id: userId });
    
    logger.info(userId, 'Usuários', 'generate_affiliate_code', { code });
    
    return code;
};

export const getAffiliateStats = async (userId: string) => {
    // 1. Get Logs (Transactions that generated commission)
    const { data: logsData } = await api.select('affiliate_logs', { affiliate_id: userId });
    
    // 2. Get Referral Count
    const { data: referrals } = await api.select('app_users', { referred_by: userId });
    
    // 3. Enrich logs with source email using Optimized Fetch (Only fetch related users)
    let enrichedLogs: AffiliateLog[] = [];
    
    if (logsData && logsData.length > 0) {
        // Extract unique source user IDs from logs
        const sourceIds = [...new Set(logsData.map((l: any) => l.source_user_id).filter(Boolean))];
        const userMap = new Map();
        
        if (sourceIds.length > 0) {
             // OTIMIZAÇÃO: Busca apenas os usuários que estão nos logs usando o novo filtro 'in'
             const { data: users } = await api.select('app_users', {}, { inColumn: 'id', inValues: sourceIds });
             
             if(users) {
                 users.forEach((u:any) => {
                     userMap.set(u.id, u.email);
                 });
             }
        }

        enrichedLogs = logsData.map((l: any) => ({
            ...l,
            source_email: userMap.get(l.source_user_id) || 'Usuário (Removido)'
        }));
        
        // Sort descending
        enrichedLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return {
        logs: enrichedLogs,
        referralCount: referrals ? referrals.length : 0,
        totalEarnings: enrichedLogs.reduce((acc, curr) => acc + Number(curr.amount), 0)
    };
};

// --- CONFIGURAÇÕES GERAIS ---

const getConfig = async <T>(key: string, defaultValue: T): Promise<T> => {
    const { data, error } = await api.select('system_config', { key });
    if (error || !data || data.length === 0) return defaultValue;
    return data[0].value as T;
};

const setConfig = async <T>(key: string, value: T, adminId: string) => {
    const existing = await api.select('system_config', { key });
    if (existing.data && existing.data.length > 0) {
        await api.update('system_config', { value, updated_by: adminId, updated_at: new Date().toISOString() }, { key });
    } else {
        await api.insert('system_config', { key, value, updated_by: adminId, updated_at: new Date().toISOString() });
    }
};

// --- POPUPS SYSTEM ---

export const getPopups = async (onlyActive = false): Promise<Popup[]> => {
    const filters = onlyActive ? { is_active: true } : {};
    const { data, error } = await api.select('system_popups', filters);
    
    if (error) {
        // Conversão segura do erro para string
        const errorMsg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
        
        // Se a tabela não existir (ainda não foi criada via SQL), retorna array vazio para não quebrar a UI
        if(
            errorMsg.includes('does not exist') || 
            errorMsg.includes('404') || 
            errorMsg.includes('Could not find the table') ||
            errorMsg.includes('relation "public.system_popups" does not exist')
        ) {
            console.warn("Tabela system_popups não encontrada. Retornando lista vazia.");
            return [];
        }
        throw new Error(errorMsg);
    }
    
    return data || [];
};

export const createPopup = async (popup: Omit<Popup, 'id' | 'created_at'>, adminId: string) => {
    const { error } = await api.insert('system_popups', popup);
    if (error) throw new Error(error);
    logger.info(adminId, 'Sistema', 'create_popup', { title: popup.title });
};

export const updatePopup = async (id: string, updates: Partial<Popup>, adminId: string) => {
    const { error } = await api.update('system_popups', updates, { id });
    if (error) throw new Error(error);
    logger.info(adminId, 'Sistema', 'update_popup', { id, updates });
};

export const deletePopup = async (id: string, adminId: string) => {
    const { error } = await api.delete('system_popups', { id });
    if (error) throw new Error(error);
    logger.warn(adminId, 'Sistema', 'delete_popup', { id });
};

// --- USERS ---

export interface GetUsersParams {
  page: number;
  limit: number;
  role: UserRole | 'all';
  status: UserStatus | 'all';
}

export const getUsers = async ({ page, limit, role, status }: GetUsersParams) => {
  const filters: any = {};
  if (role !== 'all') filters.role = role;
  if (status !== 'all') filters.status = status;

  const { data, error } = await api.select('app_users', filters);
  if (error) throw error;

  let usersList = data || [];
  
  const { data: creditsData } = await api.select('user_credits');
  const creditsMap = new Map();
  if (creditsData) {
      creditsData.forEach((c: any) => creditsMap.set(c.user_id, c.credits));
  }

  const enrichedUsers: User[] = usersList.map((u: any) => ({
      ...u,
      credits: creditsMap.get(u.id) ?? 0
  }));

  enrichedUsers.sort((a, b) => {
      if (a.last_login && b.last_login) {
          return new Date(b.last_login).getTime() - new Date(a.last_login).getTime();
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  return { users: paginate(enrichedUsers, page, limit), count: enrichedUsers.length };
};

export const searchUsers = async (term: string): Promise<User[]> => {
    if (!term || term.length < 3) return [];

    let query = supabase
        .from('app_users')
        .select('*');

    // Se parecer um UUID, faz match exato, senão busca nome/email
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);

    if (isUuid) {
        query = query.eq('id', term);
    } else {
        query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
    }

    const { data, error } = await query.limit(10); // Limite de resultados para performance

    if (error) {
        console.error("Erro na busca de usuários:", error);
        return [];
    }

    // Mapeamento básico para o tipo User (pode faltar créditos, mas ok para seleção)
    return (data || []).map((u: any) => ({
        ...u,
        credits: 0 // Placeholder, não precisamos dos créditos para esta view
    }));
};

export const updateUser = async (userId: string, updates: any, adminId: string) => {
  const profileUpdates: any = {};
  if (updates.role) profileUpdates.role = updates.role;
  if (updates.status) profileUpdates.status = updates.status;
  if (updates.full_name) profileUpdates.full_name = updates.full_name;
  if (updates.plan) profileUpdates.plan = updates.plan;

  if (Object.keys(profileUpdates).length > 0) {
    await api.update('app_users', profileUpdates, { id: userId });
  }

  if (updates.credits !== undefined) {
    const { data: existing } = await api.select('user_credits', { user_id: userId });
    if (existing && existing.length > 0) {
        await api.update('user_credits', { credits: updates.credits }, { user_id: userId });
    } else {
        await api.insert('user_credits', { user_id: userId, credits: updates.credits });
    }
  }
  logger.info(adminId, 'Usuários', 'update_user', { target_user_id: userId, updates });
};

export const deleteUser = async (userId: string, adminId: string) => {
    const dependencies = [
        { table: 'user_credits', key: 'user_id' },
        { table: 'user_memory', key: 'user_id' }, 
        { table: 'news', key: 'author_id' },      
        { table: 'logs', key: 'usuario_id' },     
        { table: 'ai_logs', key: 'usuario_id' },  
        { table: 'transactions', key: 'usuario_id' },
        { table: 'affiliate_logs', key: 'affiliate_id' },
        { table: 'notifications', key: 'user_id' }, // Added notifications
    ];

    for (const dep of dependencies) {
        await api.delete(dep.table, { [dep.key]: userId });
    }
    
    const { error } = await api.delete('app_users', { id: userId });
    if (error) throw new Error(`Erro ao excluir perfil: ${error}`);

    logger.warn(adminId, 'Usuários', 'delete_user', { deleted_user_id: userId });
};

export interface CreateUserPayload {
  email: string;
  password?: string;
  full_name: string;
  role: UserRole;
  credits: number;
}

export const createUser = async (payload: CreateUserPayload, adminId: string) => {
  throw new Error("Criação de usuário via Admin requer API direta, não suportada pelo proxy atual.");
};

// --- NEWS ---

export const getNewsWithAuthors = async ({ page, limit, status }: { page?: number; limit?: number; status?: NewsStatus | 'all' } = {}) => {
  const filters: any = {};
  if (status && status !== 'all') filters.status = status;

  const { data, error } = await api.select('news', filters);
  if (error) throw error;

  let newsList = data || [];
  
  // Optimization here too if needed, but keeping simple for now
  const userIds = [...new Set(newsList.map((n: any) => n.author_id).filter(Boolean))];
  let userMap = new Map();
  if (userIds.length > 0) {
      const { data: users } = await api.select('app_users', {}, { inColumn: 'id', inValues: userIds });
      if(users) users.forEach((u: any) => userMap.set(u.id, u.email));
  }

  const enrichedNews: NewsArticle[] = newsList.map((n: any) => ({
      ...n,
      author: { email: userMap.get(n.author_id) || 'Desconhecido' }
  }));

  enrichedNews.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());

  if (page !== undefined && limit !== undefined) {
      return { news: paginate(enrichedNews, page, limit), count: enrichedNews.length };
  }
  return { news: enrichedNews, count: enrichedNews.length };
};

export const updateNewsStatus = async (newsId: number, status: NewsStatus, adminId: string) => {
  const { error } = await api.update('news', { status }, { id: newsId });
  if (error) throw error;
  logger.info(adminId, 'Notícias', 'update_news_status', { newsId, status });
};

export const updateNewsArticle = async (id: number, titulo: string, conteudo: string, adminId: string) => {
  const { error } = await api.update('news', { titulo, conteudo }, { id });
  if (error) throw error;
  logger.info(adminId, 'Notícias', 'update_news_content', { newsId: id });
};

// --- LOGS ---

export const getLogs = async ({ page, limit, module, action, searchText }: any) => {
  const filters: any = {};
  if (module !== 'all') filters.modulo = module;
  if (action !== 'all') filters.acao = action;

  const { data, error } = await api.select('logs', filters);
  if (error) throw error;

  let logsList = data || [];

  if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      logsList = logsList.filter((l: any) => 
          (l.acao && l.acao.toLowerCase().includes(lowerSearch)) || 
          (l.modulo && l.modulo.toLowerCase().includes(lowerSearch))
      );
  }

  // Optimized log user fetching
  const userIds = [...new Set(logsList.map((l: any) => l.usuario_id).filter(Boolean))];
  const userMap = new Map();
  if (userIds.length > 0) {
      // Filter out GUEST_ID before querying app_users
      const realUserIds = userIds.filter((id) => id !== GUEST_ID);
      
      if (realUserIds.length > 0) {
          const { data: users } = await api.select('app_users', {}, { inColumn: 'id', inValues: realUserIds });
          if(users) users.forEach((u: any) => userMap.set(u.id, u.email));
      }
  }

  const enrichedLogs: Log[] = logsList.map((l: any) => {
      let userEmail = 'Sistema';
      if (l.usuario_id === GUEST_ID) {
          userEmail = 'Visitante (Guest)';
      } else {
          userEmail = userMap.get(l.usuario_id) || (l.usuario_id ? 'Usuário (Removido)' : 'Sistema');
      }
      
      return {
          ...l,
          user_email: userEmail
      };
  });

  enrichedLogs.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return { logs: paginate(enrichedLogs, page, limit), count: enrichedLogs.length };
};

// --- PAYMENTS ---

export const getTransactions = async ({ page, limit, status, method, startDate, endDate }: any) => {
    const filters: any = {};
    if (status !== 'all') filters.status = status;
    if (method !== 'all') filters.metodo = method;

    const { data, error } = await api.select('transactions', filters);
    if (error) throw error;

    let txList = data || [];

    if (startDate) txList = txList.filter((t: any) => new Date(t.data) >= new Date(startDate));
    if (endDate) txList = txList.filter((t: any) => new Date(t.data) <= new Date(endDate));

    const userIds = [...new Set(txList.map((t: any) => t.usuario_id).filter(Boolean))];
    const userMap = new Map();
    if (userIds.length > 0) {
        const { data: users } = await api.select('app_users', {}, { inColumn: 'id', inValues: userIds });
        if(users) users.forEach((u: any) => userMap.set(u.id, u.email));
    }

    const enrichedTx: Transaction[] = txList.map((t: any) => ({
        ...t,
        user: { email: userMap.get(t.usuario_id) || 'Desconhecido' }
    }));

    enrichedTx.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    return { transactions: paginate(enrichedTx, page, limit), count: enrichedTx.length };
};

export const getApprovedRevenueInRange = async (startDate: string, endDate: string) => {
    const { data } = await api.select('transactions', { status: 'approved' });
    if (!data) return 0;

    let filtered = data;
    if (startDate) filtered = filtered.filter((t: any) => new Date(t.data) >= new Date(startDate));
    if (endDate) filtered = filtered.filter((t: any) => new Date(t.data) <= new Date(endDate));

    return filtered.reduce((acc: number, curr: any) => acc + curr.valor, 0);
};

// --- SETTINGS & OTHERS ---

export const getPaymentSettings = async (): Promise<PaymentSettings> => {
    const defaults: PaymentSettings = {
        // Removed secretKey from defaults for security
        gateways: { 
            stripe: { enabled: false, publicKey: '' }, 
            mercadoPago: { enabled: false, publicKey: '' }, 
            asaas: { enabled: false, publicKey: '' } 
        },
        packages: []
    };
    const saved = await getConfig<Partial<PaymentSettings>>('payment_settings', defaults);
    return { ...defaults, ...saved, gateways: { ...defaults.gateways, ...(saved.gateways || {}) } };
};

export const saveGatewaySettings = async (gateways: any, adminId: string) => {
    const current = await getPaymentSettings();
    await setConfig('payment_settings', { ...current, gateways }, adminId);
    logger.info(adminId, 'Pagamentos', 'update_payment_settings', { updated: 'gateways' });
};

export const saveCreditPackages = async (packages: CreditPackage[], adminId: string) => {
    const current = await getPaymentSettings();
    await setConfig('