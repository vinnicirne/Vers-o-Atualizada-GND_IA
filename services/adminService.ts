
import { api } from './api';
import { logger } from './loggerService';
import { User, Log, UserRole, NewsStatus, NewsArticle, UserStatus, Transaction, PaymentSettings, MultiAISettings, AILog, CreditPackage, AIModel, Plan, AllowedDomain, SecuritySettings, AffiliateLog, Popup, ToolSetting, WhiteLabelSettings } from '../types';
import { GUEST_ID, CREATOR_SUITE_MODES } from '../constants';
import { supabase } from './supabaseClient'; // Import supabase directly for complex queries

// Helper for client-side pagination since API might return all data
const paginate = (items: any[], page: number, limit: number) => {
  const from = (page - 1) * limit;
  const to = from + limit;
  return items.slice(from, to);
};

// --- USER MANAGEMENT TYPES ---
export interface CreateUserPayload {
    email: string;
    password?: string; // Optional for admin-created users
    full_name: string;
    role: UserRole;
    credits: number;
}

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
            // Nota: Se a lista for muito grande (>1000), ideal seria quebrar em chunks, mas para MVP está ok.
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
            logger.info(adminId, 'Sistema', 'send_user_notification', { title, targetUserId });
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
        
        // Se a tabela não existir (inda não foi criada via SQL), retorna array vazio para não quebrar a UI
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

// --- GLOBAL TOOL SETTINGS ---

const DEFAULT_TOOL_SETTINGS: ToolSetting[] = CREATOR_SUITE_MODES.map(mode => ({
    key: mode.value,
    enabled: true, // Por padrão, todas as ferramentas estão ativadas
}));

export const getGlobalToolSettings = async (): Promise<ToolSetting[]> => {
    let settings = await getConfig<ToolSetting[]>('tool_settings', DEFAULT_TOOL_SETTINGS);
    
    // Ensure all current modes are represented, even if newly added to CREATOR_SUITE_MODES
    const currentModeKeys = new Set(CREATOR_SUITE_MODES.map(m => m.value));
    const existingKeys = new Set(settings.map(s => s.key));

    // Add new modes not present in saved settings
    for (const mode of CREATOR_SUITE_MODES) {
        if (!existingKeys.has(mode.value)) {
            settings.push({ key: mode.value, enabled: true });
        }
    }
    // Remove old modes that are no longer in CREATOR_SUITE_MODES
    settings = settings.filter(s => currentModeKeys.has(s.key));

    return settings;
};

export const updateGlobalToolSettings = async (settings: ToolSetting[], adminId: string) => {
    await setConfig('tool_settings', settings, adminId);
    logger.info(adminId, 'Planos', 'update_global_tool_settings', { tool_count: settings.length });
};

// --- WHITE LABEL SETTINGS ---
const DEFAULT_WHITE_LABEL_SETTINGS: WhiteLabelSettings = {
    appName: "GDN_IA",
    appTagline: "Creator Suite",
    logoTextPart1: "GDN",
    logoTextPart2: "_IA",
    primaryColorHex: "#F39C12",
    secondaryColorHex: "#263238",
    tertiaryColorHex: "#10B981",
    faviconUrl: "https://cdn-icons-png.flaticon.com/512/16806/16806607.png",
    ogImageUrl: "https://gdn.ia/default-og.jpg",
    wordpressPluginName: "GDN_IA - Poster Pro",
    copyrightText: "GDN_IA",
    appVersion: "1.0.9",
    dashboardTitle: "Creator Suite",
    // New defaults for landing page and guest footer
    landingPageEnabled: true,
    heroSectionTitle: "Crie Notícias, Imagens e Sites 10x Mais Rápido com IA.",
    heroSectionSubtitle: "A plataforma completa para criadores, jornalistas e agências. Esqueça o bloqueio criativo e produza conteúdo profissional em segundos.",
    heroCtaPrimaryText: "Começar Agora",
    heroCtaPrimaryLink: "dashboard",
    heroCtaSecondaryText: "Ver Demo",
    heroCtaSecondaryLink: "login",
    featureSectionTitle: "Tudo o que você precisa em um só lugar",
    featureSectionSubtitle: "Substitua dezenas de ferramentas caras por uma única suíte inteligente.",
    landingPageFeatures: [
        { id: '1', icon: "fa-newspaper", color: "text-green-600", bgColor: "bg-green-100", title: "Gerador de Notícias", description: "Artigos jornalísticos completos, imparciais e otimizados para SEO, baseados em fatos reais e recentes." },
        { id: '2', icon: "fa-paint-brush", color: "text-purple-600", bgColor: "bg-purple-100", title: "Studio de Arte IA", description: "Crie imagens ultra-realistas, logotipos e ilustrações apenas descrevendo o que você imagina." },
        { id: '3', icon: "fa-laptop-code", color: "text-blue-600", bgColor: "bg-blue-100", title: "Criador de Sites", description: "Gere Landing Pages e Sites Institucionais completos com código HTML/Tailwind pronto para uso." },
        { id: '4', icon: "fa-microphone-lines", color: "text-orange-600", bgColor: "bg-orange-100", title: "Texto para Voz", description: "Narre seus artigos e vídeos com vozes neurais ultra-realistas em português." },
        { id: '5', icon: "fa-bolt", color: "text-yellow-600", bgColor: "bg-yellow-100", title: "Automação N8N", description: "Conecte seu conteúdo diretamente ao seu WordPress, redes sociais ou planilhas via Webhooks." },
        { id: '6', icon: "fa-search", color: "text-pink-600", bgColor: "bg-pink-100", title: "SEO Automático", description: "Nossa IA analisa e otimiza seu texto para rankear no topo do Google automaticamente." },
    ],
    pricingSectionTitle: "Planos acessíveis para todos",
    pricingSectionSubtitle: "Comece grátis e escale conforme sua necessidade.",
    landingPageFooterLinks: [
        { id: '1', text: "Termos", link: "terms" },
        { id: '2', text: "Privacidade", link: "privacy" },
        { id: '3', text: "Sobre", link: "about" },
    ],
    guestMarketingFooterTitle: "Gostou do teste?",
    guestMarketingFooterSubtitle: "Crie sua conta gratuita agora e desbloqueie ferramentas avançadas como Geração de Imagens e Sites Completos.",
    guestMarketingFooterCtaText: "Criar Conta Grátis",
    guestMarketingFooterCtaLink: "login",
};

export const getWhiteLabelSettings = async (): Promise<WhiteLabelSettings> => {
    return getConfig<WhiteLabelSettings>('white_label_settings', DEFAULT_WHITE_LABEL_SETTINGS);
};

export const updateWhiteLabelSettings = async (settings: WhiteLabelSettings, adminId: string) => {
    await setConfig('white_label_settings', settings, adminId);
    logger.info(adminId, 'Sistema', 'update_white_label_settings', settings);
};


// --- USERS ---

export interface GetUsersParams {
  page: number;
  limit: number;
  role: UserRole | 'all';
  status: UserStatus | 'all';
}

export const getUsers = async ({ page, limit, role, status }: GetUsersParams): Promise<{ users: User[], count: number }> => {
  const filters: any = {};
  if (role !== 'all') filters.role = role;
  if (status !== 'all') filters.status = status;

  // Use the direct supabase client for exact count and filtering
  const { data, count, error } = await supabase
        .from('app_users')
        .select('*', { count: 'exact' })
        .match(filters);

  if (error) {
      console.error("Erro ao buscar usuários:", error);
      throw error;
  }

  let usersList = data || [];
  
  // Enriquecer com dados de créditos
  const userIds = usersList.map(u => u.id);
  const { data: creditsData } = await api.select('user_credits', {}, { inColumn: 'user_id', inValues: userIds });
  const creditsMap = new Map<string, number>();
  if(creditsData) {
      creditsData.forEach((c: any) => creditsMap.set(c.user_id, c.credits));
  }

  const enrichedUsers: User[] = usersList.map((u: any) => ({
      ...u,
      credits: creditsMap.get(u.id) ?? 0 // Default to 0 if no credit entry
  }));

  enrichedUsers.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  if (page !== undefined && limit !== undefined) {
      return { users: paginate(enrichedUsers, page, limit), count: count || 0 };
  }
  return { users: enrichedUsers, count: count || 0 };
};

export const createUser = async (payload: CreateUserPayload, adminId: string) => {
    const { email, password, full_name, role, credits } = payload;
    
    // First, create the user in Auth.supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: { full_name, role, credits } // Pass initial metadata
    });

    if (authError) {
        console.error("Erro ao criar usuário no Auth:", authError);
        throw new Error(authError.message || "Falha ao criar usuário de autenticação.");
    }
    if (!authData.user) {
        throw new Error("Usuário de autenticação não retornado após criação.");
    }

    // The handle_new_user trigger will populate app_users and user_credits
    // We just need to ensure the role and credits are correctly set if the trigger doesn't cover all cases.
    // For now, assume trigger handles initial setup, but we might need explicit updates.

    // If initial credits or role are different from trigger defaults, update explicitly
    await Promise.all([
        api.update('app_users', { role, full_name }, { id: authData.user.id }),
        api.update('user_credits', { credits }, { user_id: authData.user.id })
    ]);

    logger.info(adminId, 'Usuários', 'create_user', { newUserId: authData.user.id, email, role });
    return authData.user;
};

export const updateUser = async (userId: string, updates: { role: UserRole, credits: number, status: UserStatus, full_name: string, plan: string }, adminId: string) => {
    // Update app_users table
    const { error: userError } = await api.update('app_users', { 
        role: updates.role, 
        status: updates.status, 
        full_name: updates.full_name,
        plan: updates.plan
    }, { id: userId });
    if (userError) throw userError;

    // Update user_credits table
    const { error: creditsError } = await api.update('user_credits', { credits: updates.credits }, { user_id: userId });
    if (creditsError) throw creditsError;

    logger.info(adminId, 'Usuários', 'update_user', { userId, updates });
};

export const deleteUser = async (userId: string, adminId: string) => {
    // Deleta o usuário da tabela `app_users` e `user_credits` (cascade se configurado)
    // Deleta o usuário do Auth Supabase (admin API)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
        console.error("Erro ao deletar usuário no Auth:", authError);
        throw new Error(authError.message || "Falha ao deletar usuário de autenticação.");
    }
    
    // Logs são importantes para auditoria, então não deletamos aqui, apenas o perfil
    logger.warn(adminId, 'Usuários', 'delete_user', { userId });
};

// --- NEWS ---

export interface GetNewsParams {
    page: number;
    limit: number;
    status: NewsStatus | 'all';
}

export const getNewsWithAuthors = async ({ page, limit, status }: GetNewsParams): Promise<{ news: NewsArticle[], count: number }> => {
  const filters: any = {};
  if (status !== 'all') filters.status = status;

  // Use direct supabase client for exact count and filtering for news
  const { data, count, error } = await supabase
        .from('news')
        .select('*', { count: 'exact' })
        .match(filters);

  if (error) {
      console.error("Erro ao buscar notícias:", error);
      throw error;
  }

  let newsList = data || [];
  
  // Optimization: Fetch author emails for all relevant news articles in one go
  const authorIds = [...new Set(newsList.map((n: any) => n.author_id).filter(Boolean))];
  let authorMap = new Map();
  if (authorIds.length > 0) {
      const { data: users } = await api.select('app_users', {}, { inColumn: 'id', inValues: authorIds });
      if(users) users.forEach((u: any) => authorMap.set(u.id, u.email));
  }

  const enrichedNews: NewsArticle[] = newsList.map((n: any) => ({
      ...n,
      author: { email: authorMap.get(n.author_id) || 'Desconhecido' }
  }));

  enrichedNews.sort((a, b) => new Date(b.criado_em || '').getTime() - new Date(a.criado_em || '').getTime());

  if (page !== undefined && limit !== undefined) {
      return { news: paginate(enrichedNews, page, limit), count: count || 0 };
  }
  return { news: enrichedNews, count: count || 0 };
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

  // Use direct supabase client for exact count and filtering for logs
  const { data, count, error } = await supabase
        .from('logs')
        .select('*', { count: 'exact' })
        .match(filters);

  if (error) {
      console.error("Erro ao buscar logs:", error);
      throw error;
  }

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

  return { logs: paginate(enrichedLogs, page, limit), count: count || 0 };
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
    return { ...defaults, ...saved, gateways: { ...defaults.gateways, ...(saved.gateways || {}) } } as PaymentSettings; // Cast para segurança
};

export const saveGatewaySettings = async (gateways: any, adminId: string) => {
    const current = await getPaymentSettings();
    await setConfig('payment_settings', { ...current, gateways }, adminId);
    logger.info(adminId, 'Pagamentos', 'update_payment_settings', { updated: 'gateways' });
};

export const saveCreditPackages = async (packages: CreditPackage[], adminId: string) => {
    const current = await getPaymentSettings();
    await setConfig('payment_settings', { ...current, packages }, adminId);
    logger.info(adminId, 'Pagamentos', 'update_payment_settings', { updated: 'packages', count: packages.length });
};

export const getMultiAISettings = async (): Promise<MultiAISettings> => {
    return getConfig<MultiAISettings>('multi_ai_settings', {
        platforms: { gemini: { enabled: true, apiKey: '', costPerMillionTokens: 0, maxTokens: 0 }, openai: { enabled: false, apiKey: '', costPerMillionTokens: 0, maxTokens: 0 }, claude: { enabled: false, apiKey: '', costPerMillionTokens: 0, maxTokens: 0 } },
        models: []
    });
};

export const updateMultiAISettings = async (settings: MultiAISettings, adminId: string) => {
    await setConfig('multi_ai_settings', settings, adminId);
    logger.info(adminId, 'Sistema Multi-IA', 'update_multi_ai_settings', { platforms: Object.keys(settings.platforms).filter(k => (settings.platforms as any)[k].enabled) });
};

export const getAILogs = async ({ page, limit }: { page: number, limit: number }) => {
     const { data, error } = await api.select('ai_logs');
     if (error) return { logs: [], count: 0 };
     
     const userIds = [...new Set((data || []).map((l: any) => l.usuario_id).filter(Boolean))];
     const userMap = new Map();
     if(userIds.length > 0) {
         const { data: users } = await api.select('app_users', {}, { inColumn: 'id', inValues: userIds });
         if(users) users.forEach((u: any) => userMap.set(u.id, u.email));
     }

     const enrichedLogs: AILog[] = (data || []).map((l: any) => ({
         ...l,
         user: { email: userMap.get(l.usuario_id) || 'N/A' }
     }));
     
     enrichedLogs.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
     return { logs: paginate(enrichedLogs, page, limit), count: enrichedLogs.length };
};

export const getPlans = async (): Promise<Plan[]> => getConfig<Plan[]>('all_plans', []);
export const savePlans = async (plans: Plan[], adminId: string) => {
    await setConfig('all_plans', plans, adminId);
    logger.info(adminId, 'Planos', 'update_plans_config', { plan_count: plans.length });
};

export const getAllowedDomains = async (): Promise<AllowedDomain[]> => {
  const { data } = await api.select('allowed_domains');
  return data || [];
};

export const addAllowedDomain = async (domain: string, adminId: string) => {
  if (!domain.includes('.') || domain.includes('@')) throw new Error("Formato de domínio inválido.");
  const { error } = await api.insert('allowed_domains', { domain: domain.toLowerCase() });
  if (error) throw error;
  logger.info(adminId, 'Segurança', 'add_allowed_domain', { domain });
};

export const removeAllowedDomain = async (id: string, domain: string, adminId: string) => {
  const { error } = await api.delete('allowed_domains', { id });
  if (error) throw error;
  logger.warn(adminId, 'Segurança', 'remove_allowed_domain', { domain });
};

export const getSecuritySettings = async (): Promise<SecuritySettings> => getConfig<SecuritySettings>('security_settings', { validationMode: 'strict_allowlist' });
export const updateSecuritySettings = async (settings: SecuritySettings, adminId: string) => {
    await setConfig('security_settings', settings, adminId);
    logger.info(adminId, 'Segurança', 'update_security_settings', settings);
};

export const isDomainAllowed = async (email: string): Promise<boolean> => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || DOMAIN_BLACKLIST.includes(domain)) return false;
  
  try {
      const { data } = await api.select('allowed_domains', { domain });
      if (data && data.length > 0) return true;

      const settings = await getSecuritySettings();
      if (settings.validationMode === 'strict_allowlist') return false;
      if (settings.validationMode === 'dns_validation') {
          // Mock DNS check for frontend only environment
          return true; 
      }
      return false;
  } catch (e) {
      return false;
  }
};

export const searchUsers = async (searchTerm: string): Promise<User[]> => {
    if (!searchTerm || searchTerm.length < 3) return [];

    const { data, error } = await supabase
        .from('app_users')
        .select('id, email, full_name, role, status, plan, credits') // Select necessary fields
        .or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,id.eq.${searchTerm}`); // Search across multiple fields

    if (error) {
        console.error("Error searching users:", error);
        throw error;
    }

    let usersList = data || [];
    
    // Enrich with credits data if not already present (from the `select` above, it's not direct)
    const userIds = usersList.map(u => u.id);
    const { data: creditsData } = await api.select('user_credits', {}, { inColumn: 'user_id', inValues: userIds });
    const creditsMap = new Map<string, number>();
    if(creditsData) {
        creditsData.forEach((c: any) => creditsMap.set(c.user_id, c.credits));
    }

    const enrichedUsers: User[] = usersList.map((u: any) => ({
        ...u,
        credits: creditsMap.get(u.id) ?? 0 // Default to 0 if no credit entry
    }));

    return enrichedUsers;
};
