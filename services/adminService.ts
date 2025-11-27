
import { api } from './api';
import { logger } from './loggerService';
import { User, Log, UserRole, NewsStatus, NewsArticle, UserStatus, Transaction, PaymentSettings, MultiAISettings, AILog, CreditPackage, AIModel, Plan, AllowedDomain, SecuritySettings, AffiliateLog } from '../types';

// Helper for client-side pagination since API might return all data
const paginate = (items: any[], page: number, limit: number) => {
  const from = (page - 1) * limit;
  const to = from + limit;
  return items.slice(from, to);
};

// --- DOMAIN BLACKLIST ---
// Domínios que devem ser bloqueados automaticamente no modo DNS, pois são usados para teste ou spam
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

// --- AFFILIATE SYSTEM ---

// Gera um código de afiliado único (ex: JOHN-DOE-123)
export const generateAffiliateCode = async (userId: string, fullName: string): Promise<string> => {
    let base = 'PARTNER';
    
    if (fullName) {
        // 1. Pega o primeiro nome
        // 2. Normaliza (separa acentos: Á -> A + ´)
        // 3. Remove os caracteres de acento
        // 4. Converte para maiúsculas
        // 5. Remove tudo que não for letra A-Z
        base = fullName
            .split(' ')[0]
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .replace(/[^A-Z]/g, '');
    }
    
    // Fallback: Se o nome for vazio ou inválido (ex: símbolos), usa 'PARTNER'
    if (!base || base.length < 2) {
        base = 'PARTNER';
    }

    let code = '';
    let isUnique = false;
    let attempts = 0;

    // Tenta gerar um código único até 5 vezes
    while (!isUnique && attempts < 5) {
        const random = Math.floor(1000 + Math.random() * 9000);
        code = `${base}-${random}`;
        
        // Verifica se já existe
        const { data, error } = await api.select('app_users', { affiliate_code: code });
        
        // Se der erro na API, assumimos que não é único para evitar conflito e tentamos de novo
        // Se data for vazio, significa que não encontrou ninguém com esse código -> É único.
        if (!error && (!data || data.length === 0)) {
            isUnique = true;
        }
        attempts++;
        
        // Pequeno delay para evitar martelar a API em caso de falha
        if (!isUnique) await new Promise(r => setTimeout(r, 200));
    }

    if (!isUnique) {
        // Fallback final com timestamp se falhar nas tentativas aleatórias
        code = `${base}-${Date.now().toString().slice(-4)}`;
    }
    
    await api.update('app_users', { affiliate_code: code }, { id: userId });
    return code;
};

export const getAffiliateStats = async (userId: string) => {
    // 1. Get Logs
    const { data: logsData } = await api.select('affiliate_logs', { affiliate_id: userId });
    
    // 2. Get Referral Count
    const { data: referrals } = await api.select('app_users', { referred_by: userId });
    
    // 3. Enrich logs with source email if possible (manual join)
    let enrichedLogs: AffiliateLog[] = [];
    if (logsData) {
        const sourceIds = [...new Set(logsData.map((l: any) => l.source_user_id).filter(Boolean))];
        let userMap = new Map();
        
        if (sourceIds.length > 0) {
             const { data: users } = await api.select('app_users'); // Inefficient but necessary without RPC
             if(users) {
                 users.forEach((u:any) => {
                     if(sourceIds.includes(u.id)) userMap.set(u.id, u.email);
                 });
             }
        }

        enrichedLogs = logsData.map((l: any) => ({
            ...l,
            source_email: userMap.get(l.source_user_id) || 'Usuário'
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

export const processAffiliateCommission = async (payerUserId: string, amount: number, description: string) => {
    // 1. Check if payer was referred
    const { data: payerData } = await api.select('app_users', { id: payerUserId });
    if (!payerData || payerData.length === 0) return;
    
    const referrerId = payerData[0].referred_by;
    if (!referrerId) return; // No affiliate to pay

    // Evita pagar comissão para si mesmo (caso haja erro no vínculo)
    if (referrerId === payerUserId) return;

    // 2. Calculate Commission (e.g., 20%)
    const COMMISSION_RATE = 0.20;
    // Fix: Use float math correction
    const commission = parseFloat((amount * COMMISSION_RATE).toFixed(2));
    
    if (commission <= 0) return;

    // 3. Update Affiliate Balance
    // First fetch current balance
    const { data: affiliateData } = await api.select('app_users', { id: referrerId });
    if (!affiliateData || affiliateData.length === 0) return;
    
    const currentBalance = Number(affiliateData[0].affiliate_balance || 0);
    // Fix: Use float math correction to avoid 0.1 + 0.2 = 0.300000004
    const newBalance = parseFloat((currentBalance + commission).toFixed(2));

    await api.update('app_users', { affiliate_balance: newBalance }, { id: referrerId });

    // 4. Log Transaction
    await api.insert('affiliate_logs', {
        affiliate_id: referrerId,
        source_user_id: payerUserId,
        amount: commission,
        description: `${description} (20%)`
    });
    
    logger.info(referrerId, 'Pagamentos', 'affiliate_commission_paid', { 
        amount: commission, 
        source: payerUserId 
    });
};

// --- CONFIGURAÇÕES GERAIS (System Config) ---

const getConfig = async <T>(key: string, defaultValue: T): Promise<T> => {
    const { data, error } = await api.select('system_config', { key });
    if (error || !data || data.length === 0) return defaultValue;
    return data[0].value as T;
};

const setConfig = async <T>(key: string, value: T, adminId: string) => {
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
      if (b.last_login) return 1;
      if (a.last_login) return -1;
      
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const paginatedUsers = paginate(enrichedUsers, page, limit);

  return { users: paginatedUsers, count: enrichedUsers.length };
};

export const updateUser = async (userId: string, updates: { role?: UserRole; credits?: number; status?: UserStatus; full_name?: string }, adminId: string) => {
  const profileUpdates: any = {};
  if (updates.role) profileUpdates.role = updates.role;
  if (updates.status) profileUpdates.status = updates.status;
  if (updates.full_name) profileUpdates.full_name = updates.full_name;

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await api.update('app_users', profileUpdates, { id: userId });
    if (error) throw error;
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
    // 1. Limpeza de Dependências (Cascade Manual)
    const dependencies = [
        { table: 'user_credits', key: 'user_id' },
        { table: 'user_memory', key: 'user_id' }, 
        { table: 'news', key: 'author_id' },      
        { table: 'logs', key: 'usuario_id' },     
        { table: 'ai_logs', key: 'usuario_id' },  
        { table: 'transactions', key: 'usuario_id' },
        { table: 'affiliate_logs', key: 'affiliate_id' }, // Limpar logs de afiliado
    ];

    for (const dep of dependencies) {
        const { error } = await api.delete(dep.table, { [dep.key]: userId });
        if (error) {
            console.warn(`Aviso ao limpar ${dep.table} para usuário ${userId}:`, error);
        }
    }
    
    // 2. Remover o Usuário da tabela de perfil pública
    const { error } = await api.delete('app_users', { id: userId });
    
    if (error) {
        throw new Error(`Erro ao excluir perfil do usuário (app_users): ${error}`);
    }

    // 3. Log de auditoria via LoggerService
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
  throw new Error("A criação de usuários via Admin requer acesso direto à API de Autenticação, não suportada pelo modo Proxy atual.");
};

// --- NEWS ---

export const getNewsWithAuthors = async ({ page, limit, status }: { page?: number; limit?: number; status?: NewsStatus | 'all' } = {}) => {
  const filters: any = {};
  if (status && status !== 'all') filters.status = status;

  const { data, error } = await api.select('news', filters);
  if (error) throw error;

  let newsList = data || [];
  
  const userIds = [...new Set(newsList.map((n: any) => n.author_id).filter(Boolean))];
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
    const defaults: PaymentSettings = {
        gateways: {
            stripe: { enabled: false, publicKey: '', secretKey: '' },
            mercadoPago: { enabled: false, publicKey: '', secretKey: '' },
            asaas: { enabled: false, publicKey: '', secretKey: '' }
        },
        packages: []
    };

    const saved = await getConfig<Partial<PaymentSettings>>('payment_settings', defaults);
    return {
        ...defaults,
        ...saved,
        gateways: { ...defaults.gateways, ...(saved.gateways || {}) }
    };
};

export const saveGatewaySettings = async (gateways: any, adminId: string) => {
    const current = await getPaymentSettings();
    const newSettings = { ...current, gateways };
    await setConfig('payment_settings', newSettings, adminId);
    
    logger.info(adminId, 'Pagamentos', 'update_payment_settings', { updated: 'gateways' });
};

export const saveCreditPackages = async (packages: CreditPackage[], adminId: string) => {
    const current = await getPaymentSettings();
    const newSettings = { ...current, packages };
    await setConfig('payment_settings', newSettings, adminId);
    
    logger.info(adminId, 'Pagamentos', 'update_payment_settings', { updated: 'packages', count: packages.length });
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
    
    logger.info(adminId, 'Sistema Multi-IA', 'update_multi_ai_settings', { 
        platforms: Object.keys(settings.platforms).filter(k => (settings.platforms as any)[k].enabled) 
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
    
    logger.info(adminId, 'Planos', 'update_plans_config', { plan_count: plans.length });
};

// --- SECURITY & DOMAINS ---

export const getAllowedDomains = async (): Promise<AllowedDomain[]> => {
  const { data, error } = await api.select('allowed_domains');
  if (error) {
      if (error.includes('does not exist')) {
          console.warn("Tabela 'allowed_domains' não existe.");
          return [];
      }
      throw error;
  }
  return data || [];
};

export const addAllowedDomain = async (domain: string, adminId: string) => {
  if (!domain.includes('.') || domain.includes('@')) {
      throw new Error("Formato de domínio inválido. Use algo como 'empresa.com'.");
  }
  
  const { error } = await api.insert('allowed_domains', { domain: domain.toLowerCase() });
  if (error) throw error;
  
  logger.info(adminId, 'Segurança', 'add_allowed_domain', { domain });
};

export const removeAllowedDomain = async (id: string, domain: string, adminId: string) => {
  const { error } = await api.delete('allowed_domains', { id });
  if (error) throw error;
  
  logger.warn(adminId, 'Segurança', 'remove_allowed_domain', { domain });
};

export const getSecuritySettings = async (): Promise<SecuritySettings> => {
    return getConfig<SecuritySettings>('security_settings', {
        validationMode: 'strict_allowlist' 
    });
};

export const updateSecuritySettings = async (settings: SecuritySettings, adminId: string) => {
    await setConfig('security_settings', settings, adminId);
    
    logger.info(adminId, 'Segurança', 'update_security_settings', settings);
};

const checkDomainDNS = async (domain: string): Promise<boolean> => {
    try {
        const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
        const data = await response.json();
        if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
            return true;
        }
        return false;
    } catch (e) {
        console.error("Falha ao consultar DNS:", e);
        return false;
    }
};

export const isDomainAllowed = async (email: string): Promise<boolean> => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  if (DOMAIN_BLACKLIST.includes(domain)) {
      console.warn(`Cadastro bloqueado pela blacklist: ${domain}`);
      return false;
  }
  
  try {
      const { data, error } = await api.select('allowed_domains', { domain: domain });
      
      if (error && !error.includes('relation "public.allowed_domains" does not exist')) {
          console.error("Erro ao verificar allowlist:", error);
      }
      
      const isWhitelisted = data && data.length > 0;
      if (isWhitelisted) return true;

      const settings = await getSecuritySettings();

      if (settings.validationMode === 'strict_allowlist') {
          return false;
      }

      if (settings.validationMode === 'dns_validation') {
          const isValidDNS = await checkDomainDNS(domain);
          return isValidDNS;
      }

      return false;
  } catch (e) {
      console.error("Exceção na verificação de domínio:", e);
      return false;
  }
};
