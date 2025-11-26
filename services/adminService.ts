import { api } from './api';
import { User, Log, UserRole, NewsStatus, NewsArticle, UserStatus, Transaction, PaymentSettings, MultiAISettings, AILog, CreditPackage, AIModel, Plan } from '../types';

// Helper for client-side pagination since API might return all data
const paginate = (items: any[], page: number, limit: number) => {
  const from = (page - 1) * limit;
  const to = from + limit;
  return items.slice(from, to);
};

// --- CONFIGURAÇÕES GERAIS (System Config) ---

const getConfig = async <T>(key: string, defaultValue: T): Promise<T> => {
    const { data, error } = await api.select('system_config', { key });
    if (error || !data || data.length === 0) return defaultValue;
    return data[0].value as T;
};

const setConfig = async <T>(key: string, value: T, adminId: string) => {
    // Usamos insert/update (upsert logic via proxy usually handled by insert or update)
    // Vamos tentar update primeiro, se não existir, insert (ou o proxy lida com isso)
    // Para simplificar, assumimos que a config já existe ou o insert trata duplicação.
    // Estratégia segura: buscar, se existir update, senão insert.
    const existing = await api.select('system_config', { key });
    
    if (existing.data && existing.data.length > 0) {
        await api.update('system_config', { 
            value, 
            updated_by: adminId, 
            updated_at: new Date().toISOString() 
        }, { key });
    } else {
        await api.insert('system_config', {
            key,
            value,
            updated_by: adminId,
            updated_at: new Date().toISOString()
        });
    }
};

// --- USERS ---

export interface GetUsersParams {
  page: number;
  limit: number;
  role: UserRole | 'all';
  status: UserStatus | 'all';
}

export const getUsers = async ({ page, limit, role, status }: GetUsersParams) => {
  // Busca todos e filtra no cliente (limitação do proxy simples)
  const filters: any = {};
  if (role !== 'all') filters.role = role;
  if (status !== 'all') filters.status = status;

  const { data, error } = await api.select('app_users', filters);
  if (error) throw error;

  let usersList = data || [];
  
  // Buscar créditos para cada usuário (pode ser pesado, ideal seria join no backend)
  // Workaround: Buscar todos os créditos e mapear
  const { data: creditsData } = await api.select('user_credits');
  const creditsMap = new Map();
  if (creditsData) {
      creditsData.forEach((c: any) => creditsMap.set(c.user_id, c.credits));
  }

  const enrichedUsers: User[] = usersList.map((u: any) => ({
      ...u,
      credits: creditsMap.get(u.id) ?? 0
  }));

  // Ordenação Client-side
  enrichedUsers.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const paginatedUsers = paginate(enrichedUsers, page, limit);

  return { users: paginatedUsers, count: enrichedUsers.length };
};

export const updateUser = async (userId: string, updates: { role?: UserRole; credits?: number; status?: UserStatus }, adminId: string) => {
  const profileUpdates: any = {};
  if (updates.role) profileUpdates.role = updates.role;
  if (updates.status) profileUpdates.status = updates.status;

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await api.update('app_users', profileUpdates, { id: userId });
    if (error) throw error;
  }

  if (updates.credits !== undefined) {
    // Verifica se já existe registro de crédito
    const { data: existing } = await api.select('user_credits', { user_id: userId });
    if (existing && existing.length > 0) {
        await api.update('user_credits', { credits: updates.credits }, { user_id: userId });
    } else {
        await api.insert('user_credits', { user_id: userId, credits: updates.credits });
    }
  }

  await api.insert('logs', {
    usuario_id: adminId,
    acao: 'update_user',
    modulo: 'Usuários',
    detalhes: { target_user_id: userId, updates }
  });
};

export interface CreateUserPayload {
  email: string;
  password?: string;
  full_name: string;
  role: UserRole;
  credits: number;
}

export const createUser = async (payload: CreateUserPayload, adminId: string) => {
  // NOTA: A criação de usuário com senha requer Supabase Auth Admin.
  // O Proxy API 'insert' em 'app_users' não cria a conta de autenticação.
  // Como estamos limitados ao Proxy, não podemos chamar Edge Functions ou Auth Admin diretamente.
  // -> Vamos apenas simular o erro ou avisar.
  throw new Error("A criação de usuários via Admin requer acesso direto à API de Autenticação, não suportada pelo modo Proxy atual.");
};

// --- NEWS ---

export const getNewsWithAuthors = async ({ page, limit, status }: { page?: number; limit?: number; status?: NewsStatus | 'all' } = {}) => {
  const filters: any = {};
  if (status && status !== 'all') filters.status = status;

  const { data, error } = await api.select('news', filters);
  if (error) throw error;

  let newsList = data || [];
  
  // Enriquecer com emails dos autores
  const userIds = [...new Set(newsList.map((n: any) => n.author_id).filter(Boolean))];
  // Fetch users logic skipped for brevity/performance in simple proxy mode, or fetching all users
  const { data: users } = await api.select('app_users');
  const userMap = new Map();
  if(users) users.forEach((u: any) => userMap.set(u.id, u.email));

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

  await api.insert('logs', {
    usuario_id: adminId,
    acao: 'update_news_status',
    modulo: 'Notícias',
    detalhes: { newsId, status }
  });
};

export const updateNewsArticle = async (id: number, titulo: string, conteudo: string, adminId: string) => {
  const { error } = await api.update('news', { titulo, conteudo }, { id });
  if (error) throw error;

  await api.insert('logs', {
    usuario_id: adminId,
    acao: 'update_news_content',
    modulo: 'Notícias',
    detalhes: { newsId: id }
  });
};

// --- LOGS ---

export const getLogs = async ({ page, limit, module, action, searchText }: any) => {
  // Fetching all logs might be heavy. Assuming proxy returns reasonable amount or we filter hard.
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

  // Enrich emails
  const { data: users } = await api.select('app_users');
  const userMap = new Map();
  if(users) users.forEach((u: any) => userMap.set(u.id, u.email));

  const enrichedLogs: Log[] = logsList.map((l: any) => ({
      ...l,
      user_email: userMap.get(l.usuario_id) || 'Sistema'
  }));

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

    // Date filtering client-side
    if (startDate) {
        txList = txList.filter((t: any) => new Date(t.data) >= new Date(startDate));
    }
    if (endDate) {
        txList = txList.filter((t: any) => new Date(t.data) <= new Date(endDate));
    }

    const { data: users } = await api.select('app_users');
    const userMap = new Map();
    if(users) users.forEach((u: any) => userMap.set(u.id, u.email));

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

// --- SETTINGS ---

export const getPaymentSettings = async (): Promise<PaymentSettings> => {
    return getConfig<PaymentSettings>('payment_settings', {
        gateways: {
            stripe: { enabled: false, publicKey: '', secretKey: '' },
            mercadoPago: { enabled: false, publicKey: '', secretKey: '' }
        },
        packages: []
    });
};

export const saveGatewaySettings = async (gateways: any, adminId: string) => {
    const current = await getPaymentSettings();
    const newSettings = { ...current, gateways };
    await setConfig('payment_settings', newSettings, adminId);
    
    await api.insert('logs', {
        usuario_id: adminId,
        acao: 'update_payment_settings',
        modulo: 'Pagamentos',
        detalhes: { updated: 'gateways' }
    });
};

export const saveCreditPackages = async (packages: CreditPackage[], adminId: string) => {
    const current = await getPaymentSettings();
    const newSettings = { ...current, packages };
    await setConfig('payment_settings', newSettings, adminId);
    
    await api.insert('logs', {
        usuario_id: adminId,
        acao: 'update_payment_settings',
        modulo: 'Pagamentos',
        detalhes: { updated: 'packages', count: packages.length }
    });
};

export const getMultiAISettings = async (): Promise<MultiAISettings> => {
    return getConfig<MultiAISettings>('multi_ai_settings', {
        platforms: {
            gemini: { enabled: true, apiKey: '', costPerMillionTokens: 0, maxTokens: 0 },
            openai: { enabled: false, apiKey: '', costPerMillionTokens: 0, maxTokens: 0 },
            claude: { enabled: false, apiKey: '', costPerMillionTokens: 0, maxTokens: 0 }
        },
        models: []
    });
};

export const updateMultiAISettings = async (settings: MultiAISettings, adminId: string) => {
    await setConfig('multi_ai_settings', settings, adminId);
    
    await api.insert('logs', {
        usuario_id: adminId,
        acao: 'update_multi_ai_settings',
        modulo: 'Sistema Multi-IA',
        detalhes: { platforms: Object.keys(settings.platforms).filter(k => (settings.platforms as any)[k].enabled) }
    });
};

export const getAILogs = async ({ page, limit }: { page: number, limit: number }) => {
     const { data, error } = await api.select('ai_logs');
     if (error) return { logs: [], count: 0 };
     
     const { data: users } = await api.select('app_users');
     const userMap = new Map();
     if(users) users.forEach((u: any) => userMap.set(u.id, u.email));

     const enrichedLogs: AILog[] = (data || []).map((l: any) => ({
         ...l,
         user: { email: userMap.get(l.usuario_id) || 'N/A' }
     }));
     
     enrichedLogs.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

     return { logs: paginate(enrichedLogs, page, limit), count: enrichedLogs.length };
};

// --- PLANOS ---
export const getPlans = async (): Promise<Plan[]> => {
    return getConfig<Plan[]>('all_plans', []);
};

export const savePlans = async (plans: Plan[], adminId: string) => {
    await setConfig('all_plans', plans, adminId);
    await api.insert('logs', {
        usuario_id: adminId,
        acao: 'update_plans_config',
        modulo: 'Planos',
        detalhes: { plan_count: plans.length }
    });
};
