/*
  ================================================================================================
  ==  ATENÇÃO: CONFIGURAÇÃO NECESSÁRIA NO SUPABASE PARA O NOVO ESQUEMA DE USUÁRIOS  ==
  ================================================================================================
  
  As funções de gerenciamento de usuário foram atualizadas para um novo esquema de banco de dados
  onde os perfis de usuário estão em `app_users` e os créditos em `user_credits`.
  
  Execute os seguintes scripts SQL no seu Editor de SQL do Supabase para migrar.
  
  Acesse: Database -> SQL Editor -> New query.
  
  --- SCRIPT 1: RENAME A TABELA ANTIGA E CRIE A NOVA TABELA DE CRÉDITOS ---
  
  -- Renomeia a tabela 'usuarios' para 'app_users'
  ALTER TABLE public.usuarios RENAME TO app_users;
  
  -- Cria a nova tabela 'user_credits'
  CREATE TABLE public.user_credits (
      user_id uuid NOT NULL PRIMARY KEY REFERENCES public.app_users(id) ON DELETE CASCADE,
      credits integer NOT NULL DEFAULT 0
  );
  
  -- Habilita Row Level Security (RLS) para a nova tabela
  ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
  
  -- Políticas de Acesso para 'user_credits':
  -- Permite que usuários leiam seus próprios créditos
  CREATE POLICY "Allow individual user read access to their own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);
  
  -- Permite que administradores gerenciem todos os créditos
  CREATE POLICY "Allow admin full access to all credits"
  ON public.user_credits FOR ALL
  USING (
    (SELECT "role" FROM public.app_users WHERE id = auth.uid()) IN ('admin'::text, 'super_admin'::text)
  );

  -- Migra os dados de créditos da tabela antiga para a nova
  INSERT INTO public.user_credits (user_id, credits)
  SELECT id, credits FROM public.app_users;
  
  -- Remove a coluna 'credits' da tabela 'app_users'
  ALTER TABLE public.app_users DROP COLUMN credits;
  
  
  --- SCRIPT 2: ATUALIZE A FUNÇÃO RPC PARA CRIAR USUÁRIOS ---
  
  create or replace function public.create_new_user(
      email text,
      password text,
      full_name text,
      role text,
      credits integer,
      status text
  )
  returns public.app_users -- Retorna o perfil de app_users; a função TS adiciona os créditos
  language plpgsql
  security definer -- ESSENCIAL: Permite que a função execute com privilégios elevados
  set search_path = public
  as $$
  declare
    new_auth_user record;
    new_profile public.app_users;
  begin
    -- 1. Cria o usuário na tabela 'auth.users' usando a função de administrador.
    new_auth_user := auth.admin_create_user(
      email,
      password,
      '{}'::jsonb
    );
  
    -- 2. Insere o perfil correspondente na sua tabela 'public.app_users'.
    insert into public.app_users (id, email, full_name, "role", status)
    values (
      new_auth_user.id,
      email,
      full_name,
      role::public.user_role,
      status::public.user_status
    )
    returning * into new_profile;
    
    -- 3. Insere os créditos iniciais na tabela 'public.user_credits'.
    insert into public.user_credits (user_id, credits)
    values (
        new_auth_user.id,
        credits
    );
  
    return new_profile;
  end;
  $$;
  
  -- Garante que a função ainda pode ser executada por usuários autenticados (admins)
  grant execute on function public.create_new_user(text, text, text, text, integer, text) to authenticated;

*/
import { supabase } from './supabaseClient';
// FIX: Added AIPlatformSettings to the import list to resolve a type error.
import { User, Log, UserRole, NewsStatus, NewsArticle, UserStatus, Transaction, TransactionStatus, PaymentMethod, PaymentSettings, MultiAISettings, AILog, CreditPackage, AIModel, AIPlatformSettings } from '../types';

// --- NEW USER MANAGEMENT FUNCTIONS ---

export interface CreateUserPayload {
  email: string;
  password?: string;
  full_name: string;
  role: UserRole;
  credits: number;
}

/**
 * Creates a new user in authentication and across 'app_users' and 'user_credits' tables.
 * It first tries a secure RPC function (`create_new_user`) that doesn't send a confirmation email.
 * If the RPC fails, it falls back to a client-side method (`supabase.auth.signUp`) which
 * creates the user but sends a confirmation email.
 * @param payload New user data.
 * @param adminUserId ID of the admin performing the action.
 */
export const createUser = async (
  payload: CreateUserPayload,
  adminUserId: string
): Promise<User> => {
  let newUser: User;
  let methodUsed = 'rpc';

  // 1. Attempt the preferred RPC method (no confirmation email)
  const { data: rpcProfile, error: rpcError } = await supabase.rpc('create_new_user', {
    email: payload.email,
    password: payload.password,
    full_name: payload.full_name,
    role: payload.role,
    credits: payload.credits,
    status: 'active'
  });

  if (!rpcError && rpcProfile) {
    // The RPC returns the app_users profile; we add the credits from the payload.
    newUser = { ...rpcProfile, credits: payload.credits };
  } else {
    if (rpcError && (rpcError.message.includes('duplicate key') || rpcError.message.includes('already exists'))) {
      throw new Error('Um usuário com este email já existe.');
    }

    // 2. If RPC fails for other reasons (e.g., function not found), try fallback.
    console.warn(`RPC call to 'create_new_user' failed. Attempting client-side fallback. Error: ${rpcError?.message}`);
    methodUsed = 'fallback (signUp)';

    if (!payload.password) {
      throw new Error('A senha é necessária para o método de criação de fallback.');
    }

    // Fallback Step A: Create auth user via signUp
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
    });

    if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
          throw new Error('Um usuário com este email já existe.');
      }
      throw new Error(`Falha na criação da autenticação (fallback): ${signUpError.message}`);
    }
    if (!authData.user) {
      throw new Error('Usuário de autenticação criado, mas o objeto do usuário não foi retornado.');
    }
    
    // Fallback Step B: Upsert user profile in 'app_users'
    const { data: profileData, error: profileError } = await supabase
      .from('app_users')
      .upsert({
        id: authData.user.id,
        email: payload.email,
        full_name: payload.full_name,
        role: payload.role,
        status: 'active',
      })
      .select()
      .single();

    if (profileError) {
      console.error('CRITICAL: Auth user created, but profile upsert failed:', profileError);
      throw new Error(`Falha ao criar o perfil do usuário (fallback): ${profileError.message}`);
    }

    // Fallback Step C: Upsert user credits in 'user_credits'
    const { error: creditError } = await supabase
      .from('user_credits')
      .upsert({ user_id: authData.user.id, credits: payload.credits });
    
    if (creditError) {
        // This is a critical state. A full solution would involve deleting the auth user, which requires admin privileges.
        console.error('CRITICAL: Auth user and profile created, but credit upsert failed:', creditError);
        throw new Error(`Falha ao atribuir créditos ao usuário (fallback): ${creditError.message}`);
    }

    newUser = { ...profileData, credits: payload.credits };
  }

  // Create audit log for the successful operation
  const { error: logError } = await supabase.from('logs').insert({
    usuario_id: adminUserId,
    acao: 'create_user',
    modulo: 'Usuários',
    detalhes: {
      new_user_email: payload.email,
      new_user_name: payload.full_name,
      role_assigned: payload.role,
      initial_credits: payload.credits,
      method: methodUsed,
    },
  });

  if (logError) {
    console.error(`Failed to create audit log for user creation (method: ${methodUsed}):`, logError.message);
  }

  return newUser;
};


interface GetUsersParams {
  role?: UserRole | 'all';
  status?: UserStatus | 'all';
  page?: number;
  limit?: number;
}

interface GetUsersResult {
    users: User[];
    count: number;
}

/**
 * Fetches users with filtering and pagination, joining credit data.
 * Returns a list of users and the total count for pagination.
 */
export const getUsers = async ({
  role = 'all',
  status = 'all',
  page = 1,
  limit = 10,
}: GetUsersParams): Promise<GetUsersResult> => {
  let query = supabase
    .from('app_users')
    .select('id, email, full_name, role, status, user_credits(credits)', { count: 'exact' });

  if (role !== 'all') {
    query = query.eq('role', role);
  }
  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching users:', error.message);
    throw error;
  }

  // Flatten the nested credit data
  const flattenedUsers = data?.map((user: any) => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      credits: user.user_credits?.[0]?.credits ?? 0,
  })) || [];

  return { users: flattenedUsers, count: count ?? 0 };
};

interface UpdateUserPayload {
  role?: UserRole;
  credits?: number;
  status?: UserStatus;
}

/**
 * Updates a user's data across 'app_users' and 'user_credits' and creates an audit log.
 * @param targetUserId ID of the user to be modified.
 * @param updates Object with the fields to be updated.
 * @param adminUserId ID of the admin performing the action.
 */
export const updateUser = async (
  targetUserId: string,
  updates: UpdateUserPayload,
  adminUserId: string
): Promise<User> => {
  const { credits, ...profileUpdates } = updates;

  // 1. Fetch current full user state for logging
  const { data: currentUserData, error: fetchError } = await supabase
    .from('app_users')
    .select('*, user_credits(credits)')
    .eq('id', targetUserId)
    .maybeSingle(); // FIX: Use maybeSingle for robustness.

  if (fetchError || !currentUserData) {
    throw new Error('Usuário a ser atualizado não encontrado.');
  }
  const currentUser: User = { ...currentUserData, credits: currentUserData.user_credits?.[0]?.credits ?? 0, user_credits: undefined };


  // 2. Perform updates
  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await supabase
      .from('app_users')
      .update(profileUpdates)
      .eq('id', targetUserId);
    if (profileError) throw profileError;
  }
  if (credits !== undefined) {
    const { error: creditsError } = await supabase
      .from('user_credits')
      .update({ credits })
      .eq('user_id', targetUserId);
    if (creditsError) throw creditsError;
  }
  
  // 3. Fetch the final updated user to return
  const { data: updatedUserData, error: refetchError } = await supabase
    .from('app_users')
    .select('*, user_credits(credits)')
    .eq('id', targetUserId)
    .maybeSingle(); // FIX: Use maybeSingle for robustness.
    
  if (refetchError || !updatedUserData) throw new Error('Falha ao recarregar usuário após atualização.');
  
  const updatedUser: User = { ...updatedUserData, credits: updatedUserData.user_credits?.[0]?.credits ?? 0, user_credits: undefined };

  // 4. Create audit log
  const changes: Record<string, { from: any; to: any }> = {};
  if (updates.role && updates.role !== currentUser.role) {
    changes.role = { from: currentUser.role, to: updates.role };
  }
  if (updates.credits !== undefined && updates.credits !== currentUser.credits) {
    changes.credits = { from: currentUser.credits, to: updates.credits };
  }
  if (updates.status && updates.status !== currentUser.status) {
    changes.status = { from: currentUser.status, to: updates.status };
  }

  if (Object.keys(changes).length > 0) {
    const { error: logError } = await supabase.from('logs').insert({
      usuario_id: adminUserId,
      acao: 'update_user',
      modulo: 'Usuários',
      detalhes: { target_user_id: targetUserId, changes },
    });
    if (logError) console.error('Failed to create audit log for user update:', logError.message);
  }

  return updatedUser;
};


// --- NEWS & LOGS FUNCTIONS ---

interface GetNewsParams {
  status?: NewsStatus | 'all';
  page?: number;
  limit?: number;
}

interface GetNewsResult {
  news: NewsArticle[];
  count: number;
}

/**
 * Busca notícias com informações do autor, com suporte a filtros e paginação.
 */
export const getNewsWithAuthors = async ({
  status = 'all',
  page = 1,
  limit = 10,
}: GetNewsParams): Promise<GetNewsResult> => {
  let query = supabase
    .from('news')
    .select('*, author:app_users(email)', { count: 'exact' });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1).order('criado_em', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching news with authors:', error.message);
    throw error;
  }

  return { news: (data as NewsArticle[]) || [], count: count ?? 0 };
};

export const updateNewsStatus = async (newsId: number, status: NewsStatus, adminUserId: string): Promise<NewsArticle> => {
    const { data, error } = await supabase
        .from('news')
        .update({ status })
        .eq('id', newsId)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating news status:', error.message);
        throw error;
    }

    const { error: logError } = await supabase.from('logs').insert({
        usuario_id: adminUserId,
        acao: `update_news_status`,
        modulo: 'Notícias',
        detalhes: {
            news_id: newsId,
            new_status: status,
        }
    });

    if (logError) {
        console.error('Failed to create audit log for news status update:', logError.message);
    }

    return data;
};

export const updateNewsArticle = async (newsId: number, titulo: string, conteudo: string, adminUserId: string): Promise<NewsArticle> => {
    const { data: currentNews, error: fetchError } = await supabase
        .from('news')
        .select('titulo, conteudo')
        .eq('id', newsId)
        .maybeSingle(); // FIX: Use maybeSingle for robustness.
    
    if (fetchError || !currentNews) {
        throw new Error("Could not find news article to update.");
    }

    const { data, error } = await supabase
        .from('news')
        .update({ titulo, conteudo })
        .eq('id', newsId)
        .select()
        .single();

    if (error) {
        console.error('Error updating news article:', error.message);
        throw error;
    }

    const changes: Record<string, any> = {};
    if (titulo !== currentNews.titulo) {
        changes.title = { from: currentNews.titulo, to: titulo };
    }
    if (conteudo !== currentNews.conteudo) {
        changes.content = "updated";
    }

    if (Object.keys(changes).length > 0) {
        const { error: logError } = await supabase.from('logs').insert({
            usuario_id: adminUserId,
            acao: 'update_news_content',
            modulo: 'Notícias',
            detalhes: {
                news_id: newsId,
                changes,
            },
        });
        if (logError) {
            console.error('Failed to log news article update:', logError.message);
        }
    }

    return data;
};

export interface GetLogsParams {
  page?: number;
  limit?: number;
  action?: string;
  module?: string;
  searchText?: string;
}

export interface GetLogsResult {
  logs: Log[];
  count: number;
}

export const getLogs = async ({
  page = 1,
  limit = 15,
  action,
  module,
  searchText,
}: GetLogsParams): Promise<GetLogsResult> => {
  let query = supabase
    .from('logs')
    .select('*, user_email:app_users(email)', { count: 'exact' });

  if (action && action !== 'all') {
    query = query.eq('acao', action);
  }

  if (module && module !== 'all') {
    query = query.eq('modulo', module);
  }
  
  if (searchText) {
    query = query.ilike('acao', `%${searchText}%`);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1).order('data', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching logs:', error.message);
    throw error;
  }
  
  return {
    logs: data?.map((log: any) => ({
      ...log,
      user_email: log.user_email?.email || 'N/A',
    })) || [],
    count: count ?? 0,
  };
};

// --- BILLING FUNCTIONS ---

export interface GetTransactionsParams {
  status?: TransactionStatus | 'all';
  method?: PaymentMethod | 'all';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface GetTransactionsResult {
  transactions: Transaction[];
  count: number;
}

export const getTransactions = async ({
  status = 'all',
  method = 'all',
  startDate,
  endDate,
  page = 1,
  limit = 15,
}: GetTransactionsParams): Promise<GetTransactionsResult> => {
  let query = supabase
    .from('transactions') 
    .select('*, user:app_users(email)', { count: 'exact' });

  if (status !== 'all') query = query.eq('status', status);
  if (method !== 'all') query = query.eq('metodo', method);
  if (startDate) query = query.gte('data', `${startDate}T00:00:00.000Z`);
  if (endDate) query = query.lte('data', `${endDate}T23:59:59.999Z`);
  
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1).order('data', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching transactions:', error.message);
    throw new Error('Falha ao buscar transações. Verifique se a view "transactions" existe e as permissões RLS estão corretas.');
  }
  
  return { transactions: (data as any[]) || [], count: count ?? 0 };
};

export const getApprovedRevenueInRange = async (startDate?: string, endDate?: string): Promise<number> => {
    let query = supabase
      .from('transactions')
      .select('valor')
      .eq('status', 'approved');
      
    if (startDate) query = query.gte('data', `${startDate}T00:00:00.000Z`);
    if (endDate) query = query.lte('data', `${endDate}T23:59:59.999Z`);
    
    const { data, error } = await query;

    if (error) {
        console.error('Error fetching approved revenue:', error.message);
        throw error;
    }

    const total = data?.reduce((sum, transaction) => sum + transaction.valor, 0) || 0;
    return total;
};

// --- PAYMENT SETTINGS FUNCTIONS ---

const SETTINGS_TABLE = 'settings';

export const getPaymentSettings = async (): Promise<PaymentSettings> => {
    // Fetch gateway settings (new format)
    const { data: gatewaySettings, error: gatewaysError } = await supabase
        .from(SETTINGS_TABLE)
        .select('chave, valor')
        .eq('categoria', 'gateway');

    // Fetch credit packages (unchanged)
    const { data: packagesData, error: packagesError } = await supabase
        .from('pacotes_credito')
        .select('*')
        .order('preco', { ascending: true });

    if (gatewaysError) {
        console.error('Error fetching payment gateways:', gatewaysError.message);
        throw new Error('Falha ao carregar as configurações de gateways de pagamento.');
    }
    if (packagesError) {
        console.error('Error fetching credit packages:', packagesError.message);
        throw new Error('Falha ao carregar os pacotes de crédito.');
    }

    // Reconstruct the gateways object from individual rows
    const gateways: PaymentSettings['gateways'] = {
        stripe: { enabled: false, publicKey: '', secretKey: '' },
        mercadoPago: { enabled: false, publicKey: '', secretKey: '' },
    };

    gatewaySettings?.forEach(setting => {
        const { chave, valor } = setting;
        const isTrue = String(valor).toLowerCase() === 'true';

        if (chave === 'stripe_enabled') gateways.stripe.enabled = isTrue;
        else if (chave === 'stripe_publicKey') gateways.stripe.publicKey = valor;
        else if (chave === 'stripe_secretKey') gateways.stripe.secretKey = valor;
        else if (chave === 'mercadoPago_enabled') gateways.mercadoPago.enabled = isTrue;
        else if (chave === 'mercadoPago_publicKey') gateways.mercadoPago.publicKey = valor;
        else if (chave === 'mercadoPago_secretKey') gateways.mercadoPago.secretKey = valor;
    });
    
    const packages = packagesData ?? [];

    return { gateways, packages };
};

export const saveGatewaySettings = async (gateways: PaymentSettings['gateways'], adminUserId: string): Promise<void> => {
    const gatewayRows = [
        { chave: 'stripe_enabled', valor: String(gateways.stripe.enabled), categoria: 'gateway' },
        { chave: 'stripe_publicKey', valor: gateways.stripe.publicKey, categoria: 'gateway' },
        { chave: 'stripe_secretKey', valor: gateways.stripe.secretKey, categoria: 'gateway' },
        { chave: 'mercadoPago_enabled', valor: String(gateways.mercadoPago.enabled), categoria: 'gateway' },
        { chave: 'mercadoPago_publicKey', valor: gateways.mercadoPago.publicKey, categoria: 'gateway' },
        { chave: 'mercadoPago_secretKey', valor: gateways.mercadoPago.secretKey, categoria: 'gateway' },
    ];

    const { error } = await supabase.from(SETTINGS_TABLE).upsert(gatewayRows);

    if (error) {
        console.error('Error saving gateway settings:', error.message);
        throw new Error('Falha ao salvar as configurações de gateways.');
    }

    const { error: logError } = await supabase.from('logs').insert({
        usuario_id: adminUserId,
        acao: 'update_gateway_settings',
        modulo: 'Pagamentos',
        detalhes: { updated_gateways: Object.keys(gateways) }
    });

    if (logError) {
        console.error('Failed to log gateway settings update:', logError.message);
    }
};

export const saveCreditPackages = async (packages: CreditPackage[], adminUserId: string): Promise<void> => {
    const { error } = await supabase
        .from('pacotes_credito')
        .upsert(packages);

    if (error) {
        console.error('Error saving credit packages:', error.message);
        throw new Error('Falha ao salvar os pacotes de crédito.');
    }
    
    const { error: logError } = await supabase.from('logs').insert({
        usuario_id: adminUserId,
        acao: 'update_credit_packages',
        modulo: 'Pagamentos',
        detalhes: { package_count: packages.length }
    });

    if (logError) {
        console.error('Failed to log credit packages update:', logError.message);
    }
};


// --- MULTI-AI SETTINGS FUNCTIONS ---

const MULTI_AI_PLATFORMS_KEY = 'multi_ai_platforms';

export const getMultiAISettings = async (): Promise<MultiAISettings> => {
    // FIX: Changed column name from 'key' to 'chave' to match the database schema.
    const { data: platformsData, error: platformsError } = await supabase
        .from(SETTINGS_TABLE)
        .select('valor')
        .eq('chave', MULTI_AI_PLATFORMS_KEY)
        .maybeSingle(); // FIX: Use maybeSingle to avoid errors on missing settings row.

    const { data: modelsData, error: modelsError } = await supabase
        .from('modelos_ia')
        .select('*');

    // FIX: Simplified error check since maybeSingle() won't throw a "0 rows" error.
    if (platformsError) {
        console.error('Error fetching multi-AI platforms:', platformsError.message);
        throw new Error('Falha ao carregar as configurações de plataformas de IA.');
    }
    if (modelsError) {
        console.error('Error fetching AI models:', modelsError.message);
        throw new Error('Falha ao carregar os modelos de IA.');
    }
    
    // FIX: Changed property access from .value to .valor.
    const platforms: AIPlatformSettings = platformsData?.valor ?? {
        gemini: { enabled: true, apiKey: '', costPerMillionTokens: 0.50, maxTokens: 8192 },
        openai: { enabled: false, apiKey: '', costPerMillionTokens: 1.00, maxTokens: 4096 },
        claude: { enabled: false, apiKey: '', costPerMillionTokens: 1.50, maxTokens: 100000 },
    };

    const models: AIModel[] = (modelsData ?? []).map(m => ({
        ...m,
        ativo: m.status === 'active' // Convert string status to boolean
    }));

    return { platforms, models };
};


export const updateMultiAISettings = async (settings: MultiAISettings, adminUserId: string): Promise<MultiAISettings> => {
    // 1. Update Platforms in settings table
    // FIX: Changed column name from 'key' to 'chave' in the upsert payload.
    const { error: platformsError } = await supabase
        .from(SETTINGS_TABLE)
        .upsert({ chave: MULTI_AI_PLATFORMS_KEY, valor: settings.platforms });
    
    if (platformsError) {
        console.error('Error updating multi-AI platforms:', platformsError.message);
        throw new Error('Falha ao salvar as configurações de plataformas de IA.');
    }

    // 2. Update AI Models in modelos_ia table
    const modelsToUpsert = settings.models.map(m => ({
        ...m,
        status: m.ativo ? 'active' : 'inactive' // Convert boolean back to string status
    }));
    const { error: modelsError } = await supabase
        .from('modelos_ia')
        .upsert(modelsToUpsert);

    if (modelsError) {
        console.error('Error updating AI models:', modelsError.message);
        throw new Error('Falha ao salvar os modelos de IA.');
    }
    
    // 3. Log the update
    const { error: logError } = await supabase.from('logs').insert({
        usuario_id: adminUserId,
        acao: 'update_multi_ai_settings',
        modulo: 'Sistema Multi-IA',
        detalhes: {
            updated_platforms: Object.keys(settings.platforms),
            model_count: settings.models.length,
        }
    });

    if (logError) {
        console.error('Failed to create audit log for multi-AI settings update:', logError.message);
    }

    return settings;
};

// --- AI LOGS FUNCTIONS ---

export interface GetAILogsParams {
  page?: number;
  limit?: number;
}

export interface GetAILogsResult {
  logs: AILog[];
  count: number;
}

/**
 * Fetches AI usage logs with pagination, joining user data directly in the query.
 */
export const getAILogs = async ({
  page = 1,
  limit = 15,
}: GetAILogsParams): Promise<GetAILogsResult> => {
  // REFACTOR: Changed from a manual two-step fetch to a direct join with Supabase
  // for better performance and code consistency with other services.
  let query = supabase
    .from('consumo_ia')
    .select('*, user:app_users(email)', { count: 'exact' });
  
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1).order('data', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching AI logs with user join:', error.message);
    throw new Error('Falha ao buscar logs de uso da IA. Verifique se a tabela "consumo_ia" e a relação com "app_users" existem.');
  }

  // Supabase join already structures the data; we just ensure it fits our type by
  // flattening the nested user object.
  const enrichedLogs = data?.map((log: any) => ({
    ...log,
    user: {
      email: log.user?.email || 'N/A',
    },
  })) || [];

  return { logs: enrichedLogs as AILog[], count: count ?? 0 };
};