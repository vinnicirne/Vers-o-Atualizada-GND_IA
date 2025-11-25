/*
  ================================================================================================
  //  ATENÇÃO: CONFIGURAÇÃO NECESSÁRIA NO SUPABASE PARA O NOVO ESQUEMA DE USUÁRIOS  //
  ================================================================================================
  
  // As funções de gerenciamento de usuário e os recursos da aplicação requerem colunas,
  // funções e políticas de segurança (RLS) específicas no banco de dados.
  
  // POR FAVOR, EXECUTE O ARQUIVO `database_update.sql` (disponível na raiz do projeto) 
  // no seu Editor SQL do Supabase.
  
  // Este arquivo SQL executa as seguintes ações críticas:
  // 1. Cria/Altera as colunas 'plan' e 'status' em `app_users` e 'metadata' em `transactions`.
  // 2. Garante a existência de tabelas como `user_credits`, `news`, `logs`, `ai_logs`, `system_config`, `user_memory`.
  // 3. Atualiza a função de gatilho `create_new_user_profile` para:
  //    - Definir Plano Free = 3 créditos (padrão para novos cadastros via `supabase.auth.signUp`).
  //    - Definir Admin/Super Admin = Créditos Ilimitados (-1) - (Ajuste via painel admin ou edge function).
  // 4. Configura TODAS as Políticas de Segurança (RLS) para evitar erros de "Permission denied" em diversas tabelas,
  //    garantindo que usuários e administradores tenham o acesso adequado.
  // 5. Cria as funções RPC necessárias para o dashboard (ex: `get_daily_platform_usage`).
  // 6. Inclui a inicialização dos planos padrão na tabela `system_config`.
  
  // Se você encontrar erros de "SQL_CONFIG_ERROR", "Permission denied" ou tela preta após a implantação, rodar este SQL resolverá.
*/
import { supabase } from './supabaseClient';
import { User, Log, UserRole, NewsStatus, NewsArticle, UserStatus, Transaction, TransactionStatus, PaymentMethod, PaymentSettings, MultiAISettings, AILog, CreditPackage, AIModel, AIPlatformSettings } from '../types';
import { Plan } from '../types/plan.types'; // Importar o tipo Plan

// Helper for pagination
const getPagination = (page: number, limit: number) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to };
};

// --- CONFIGURAÇÕES GERAIS (System Config) ---
// Centraliza a lógica de acesso a `system_config`
const getConfig = async <T>(key: string, defaultValue: T): Promise<T> => {
    const { data, error } = await supabase.from('system_config').select('value').eq('key', key).single();
    if (error || !data) return defaultValue;
    return data.value as T;
};

const setConfig = async <T>(key: string, value: T, adminId: string) => {
    const { error } = await supabase.from('system_config').upsert({
        key,
        value,
        updated_by: adminId,
        updated_at: new Date().toISOString()
    });
    if (error) throw error;
};

// --- USERS ---

export interface GetUsersParams {
  page: number;
  limit: number;
  role: UserRole | 'all';
  status: UserStatus | 'all';
}

export const getUsers = async ({ page, limit, role, status }: GetUsersParams) => {
  const { from, to } = getPagination(page, limit);
  let query = supabase
    .from('app_users')
    .select('*, user_credits(credits)', { count: 'exact' });

  if (role !== 'all') query = query.eq('role', role);
  if (status !== 'all') query = query.eq('status', status);

  const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });

  if (error) throw error;

  const users: User[] = (data || []).map((u: any) => ({
    ...u,
    credits: u.user_credits?.[0]?.credits ?? 0
  }));

  return { users, count: count || 0 };
};

export const updateUser = async (userId: string, updates: { role?: UserRole; credits?: number; status?: UserStatus }, adminId: string) => {
  // Update profile
  const profileUpdates: any = {};
  if (updates.role) profileUpdates.role = updates.role;
  if (updates.status) profileUpdates.status = updates.status;

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await supabase
      .from('app_users')
      .update(profileUpdates)
      .eq('id', userId);
    if (profileError) throw profileError;
  }

  // Update credits
  if (updates.credits !== undefined) {
    const { error: creditsError } = await supabase
      .from('user_credits')
      .upsert({ user_id: userId, credits: updates.credits });
    if (creditsError) throw creditsError;
  }

  // Log action
  await supabase.from('logs').insert({
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
  // Creating a user with password requires Supabase Auth Admin API (backend/edge function).
  // We will assume an Edge Function 'admin-create-user' exists for this purpose.
  
  const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: payload
  });

  if (error) {
      console.error("Erro ao chamar Edge Function:", error);
      throw new Error("Falha ao criar usuário. Verifique se a Edge Function 'admin-create-user' está configurada.");
  }
  
  // Log action
  await supabase.from('logs').insert({
    usuario_id: adminId,
    acao: 'create_user',
    modulo: 'Usuários',
    detalhes: { new_user_email: payload.email, role: payload.role }
  });
};

// --- NEWS ---

export const getNewsWithAuthors = async ({ page, limit, status }: { page?: number; limit?: number; status?: NewsStatus | 'all' } = {}) => {
  let query = supabase
    .from('news')
    .select('*, author:app_users(email)', { count: 'exact' });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (page !== undefined && limit !== undefined) {
    const { from, to } = getPagination(page, limit);
    query = query.range(from, to);
  }

  const { data, error, count } = await query.order('criado_em', { ascending: false });

  if (error) throw error;

  const news: NewsArticle[] = (data || []).map((n: any) => ({
    ...n,
    author: Array.isArray(n.author) ? n.author[0] : n.author
  }));

  return { news, count: count || 0 };
};

export const updateNewsStatus = async (newsId: number, status: NewsStatus, adminId: string) => {
  const { error } = await supabase
    .from('news')
    .update({ status })
    .eq('id', newsId);

  if (error) throw error;

  await supabase.from('logs').insert({
    usuario_id: adminId,
    acao: 'update_news_status',
    modulo: 'Notícias',
    detalhes: { newsId, status }
  });
};

export const updateNewsArticle = async (id: number, titulo: string, conteudo: string, adminId: string) => {
  const { error } = await supabase
    .from('news')
    .update({ titulo, conteudo })
    .eq('id', id);

  if (error) throw error;

  await supabase.from('logs').insert({
    usuario_id: adminId,
    acao: 'update_news_content',
    modulo: 'Notícias',
    detalhes: { newsId: id }
  });
};

// --- LOGS ---

export interface GetLogsParams {
  page: number;
  limit: number;
  module: string;
  action: string;
  searchText: string;
}

export const getLogs = async ({ page, limit, module, action, searchText }: GetLogsParams) => {
  const { from, to } = getPagination(page, limit);
  let query = supabase
    .from('logs')
    .select('*', { count: 'exact' });

  if (module !== 'all') query = query.eq('modulo', module);
  if (action !== 'all') query = query.eq('acao', action);
  if (searchText) {
      query = query.or(`acao.ilike.%${searchText}%,modulo.ilike.%${searchText}%`);
  }

  const { data, error, count } = await query.range(from, to).order('data', { ascending: false });

  if (error) throw error;
  
  // Enrich with user emails if possible
  const userIds = [...new Set(data?.map((l: Log) => l.usuario_id).filter(Boolean))];
  let userMap: Record<string, string> = {};
  
  if (userIds.length > 0) {
      const { data: users } = await supabase.from('app_users').select('id, email').in('id', userIds);
      if (users) {
          users.forEach((u: any) => userMap[u.id] = u.email);
      }
  }

  const logs: Log[] = (data || []).map((l: any) => ({
      ...l,
      user_email: userMap[l.usuario_id] || 'Desconhecido'
  }));

  return { logs, count: count || 0 };
};

// --- PAYMENTS ---

export const getTransactions = async ({ page, limit, status, method, startDate, endDate }: any) => {
    const { from, to } = getPagination(page, limit);
    let query = supabase.from('transactions').select('*, user:app_users(email)', { count: 'exact' });

    if (status !== 'all') query = query.eq('status', status);
    if (method !== 'all') query = query.eq('metodo', method);
    if (startDate) query = query.gte('data', startDate);
    if (endDate) query = query.lte('data', endDate);

    const { data, error, count } = await query.range(from, to).order('data', { ascending: false });
    if (error) throw error;

    const transactions: Transaction[] = (data || []).map((t: any) => ({
        ...t,
        user: Array.isArray(t.user) ? t.user[0] : t.user
    }));

    return { transactions, count: count || 0 };
};

export const getApprovedRevenueInRange = async (startDate: string, endDate: string) => {
    let query = supabase.from('transactions').select('valor').eq('status', 'approved');
    if (startDate) query = query.gte('data', startDate);
    if (endDate) query = query.lte('data', endDate);

    const { data, error } = await query;
    if (error) throw error;

    return data?.reduce((acc: number, curr: any) => acc + curr.valor, 0) || 0;
};

// --- SETTINGS (Payments & Multi AI & PLANS) ---


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
    
    await supabase.from('logs').insert({
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
    
    await supabase.from('logs').insert({
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
    
    await supabase.from('logs').insert({
        usuario_id: adminId,
        acao: 'update_multi_ai_settings',
        modulo: 'Sistema Multi-IA',
        detalhes: { platforms: Object.keys(settings.platforms).filter(k => (settings.platforms as any)[k].enabled) }
    });
};

export const getAILogs = async ({ page, limit }: { page: number, limit: number }) => {
     const { from, to } = getPagination(page, limit);
     const { data, error, count } = await supabase
        .from('ai_logs')
        .select('*, user:app_users(email)', { count: 'exact' })
        .range(from, to)
        .order('data', { ascending: false });
        
     if (error) {
         if (error.message.includes('relation') && error.message.includes('does not exist')) {
             return { logs: [], count: 0 };
         }
         throw error;
     }
     
     const logs: AILog[] = (data || []).map((l: any) => ({
         ...l,
         user: Array.isArray(l.user) ? l.user[0] : l.user
     }));
     
     return { logs, count: count || 0 };
};

// --- PLANOS ---
// O `all_plans` é uma chave em system_config que guarda um array de objetos Plan
export const getPlans = async (): Promise<Plan[]> => {
    return getConfig<Plan[]>('all_plans', []);
};

export const savePlans = async (plans: Plan[], adminId: string) => {
    await setConfig('all_plans', plans, adminId);
    await supabase.from('logs').insert({
        usuario_id: adminId,
        acao: 'update_plans_config',
        modulo: 'Planos',
        detalhes: { plan_count: plans.length }
    });
};
