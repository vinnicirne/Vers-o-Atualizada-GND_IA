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
  
  -- NOTA: As políticas de segurança (RLS) para esta tabela são configuradas no SCRIPT 3.
  -- Execute o SCRIPT 3 após este para aplicar as permissões corretas.

  -- Migra os dados de créditos da tabela antiga para a nova
  INSERT INTO public.user_credits (user_id, credits)
  SELECT id, credits FROM public.app_users;
  
  -- Remove a coluna 'credits' da tabela 'app_users'
  ALTER TABLE public.app_users DROP COLUMN credits;
  
  
  --- SCRIPT 2 (ATUALIZADO - v3 - FINAL): FUNÇÃO PARA CRIAR DADOS DO USUÁRIO (RPC) ---
  -- Esta função é usada APÓS criar o usuário na API de Auth do cliente.
  -- Ela apenas insere/atualiza os dados nas tabelas públicas.
  
  -- 1. Remove versões anteriores para evitar conflitos
  DROP FUNCTION IF EXISTS public.create_new_user(text, text, text, text, integer, text);
  DROP FUNCTION IF EXISTS public.create_new_user_profile(uuid, text, text, text, integer, text);

  -- 2. Cria a função correta que o painel administrativo chama
  CREATE OR REPLACE FUNCTION public.create_new_user_profile(
      p_user_id uuid,
      p_email text,
      p_full_name text,
      p_role text,
      p_credits integer,
      p_status text
  )
  RETURNS public.app_users
  LANGUAGE plpgsql
  SECURITY DEFINER -- Permite que admins executem
  SET search_path = public
  AS $$
  DECLARE
    new_profile public.app_users;
  BEGIN
    -- A. Insere ou Atualiza o perfil em 'app_users'
    --    Usamos ON CONFLICT para o caso de um gatilho automático já ter criado o registro básico
    INSERT INTO public.app_users (id, email, full_name, "role", status)
    VALUES (
      p_user_id,
      p_email,
      p_full_name,
      p_role::public.user_role,
      p_status::public.user_status
    )
    ON CONFLICT (id) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      "role" = EXCLUDED.role,
      status = EXCLUDED.status,
      email = EXCLUDED.email -- Garante que o email esteja atualizado
    RETURNING * INTO new_profile;
    
    -- B. Insere ou atualiza os créditos na tabela 'user_credits'
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (p_user_id, p_credits)
    ON CONFLICT (user_id) DO UPDATE
    SET credits = EXCLUDED.credits;
  
    RETURN new_profile;
  END;
  $$;
  
  -- 3. Permite que a função seja chamada via API por admins autenticados
  GRANT EXECUTE ON FUNCTION public.create_new_user_profile(uuid, text, text, text, integer, text) TO authenticated;


  --- SCRIPT 3: HABILITE E CONFIGURE CORRETAMENTE O RLS PARA TODAS AS TABELAS ---
  -- ESTA ETAPA É CRUCIAL E CORRIGE ERROS DE PERMISSÃO E RECURSÃO.
  -- Execute este script completo para garantir que as permissões funcionem.

  -- 1. Cria uma função segura para obter a role de um usuário.
  --    SECURITY DEFINER permite que a função ignore RLS, evitando a recursão.
  CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
    RETURN (SELECT role FROM public.app_users WHERE id = user_id);
  END;
  $$;

  -- 2. Habilita Row Level Security (RLS) para as tabelas.
  --    Pode ser executado com segurança mesmo se já estiver ativo.
  ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

  -- 3. Remove políticas antigas ou incorretas para garantir uma reconfiguração limpa.
  DROP POLICY IF EXISTS "Allow individual user read access to their own profile" ON public.app_users;
  DROP POLICY IF EXISTS "Allow admin read access to all user profiles" ON public.app_users;
  DROP POLICY IF EXISTS "Allow admin update access to all user profiles" ON public.app_users;
  DROP POLICY IF EXISTS "Allow individual user read access to their own credits" ON public.user_credits;
  DROP POLICY IF EXISTS "Allow admin full access to all credits" ON public.user_credits;

  -- 4. Recria as políticas para 'app_users' usando a função segura.
  CREATE POLICY "Allow individual user read access to their own profile"
  ON public.app_users FOR SELECT USING (auth.uid() = id);

  CREATE POLICY "Allow admin read access to all user profiles"
  ON public.app_users FOR SELECT USING (get_user_role(auth.uid()) IN ('admin', 'super_admin'));

  CREATE POLICY "Allow admin update access to all user profiles"
  ON public.app_users FOR UPDATE USING (get_user_role(auth.uid()) IN ('admin', 'super_admin'));

  -- 5. Recria as políticas para 'user_credits' usando a função segura.
  CREATE POLICY "Allow individual user read access to their own credits"
  ON public.user_credits FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Allow admin full access to all credits"
  ON public.user_credits FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'super_admin'));

  --- SCRIPT 4: TABELA DE MEMÓRIA DA IA (KIT AUTORIDADE) ---
  -- Cria a tabela para armazenar feedbacks e preferências da IA
  
  CREATE TABLE IF NOT EXISTS public.user_memory (
    id bigint generated by default as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    chave text not null,
    valor text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
  );

  -- Índice pra buscar rápido
  CREATE INDEX IF NOT EXISTS idx_user_memory_user on public.user_memory(user_id);

  -- Habilita RLS
  ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

  -- Políticas de acesso para user_memory
  CREATE POLICY "Users can insert their own memory" 
  ON public.user_memory FOR INSERT WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can read their own memory" 
  ON public.user_memory FOR SELECT USING (auth.uid() = user_id);
  
  CREATE POLICY "Admins can read all memories" 
  ON public.user_memory FOR SELECT USING (get_user_role(auth.uid()) IN ('admin', 'super_admin'));

*/
import { supabase } from './supabaseClient';
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
 * Creates a new user using the secure two-step method.
 * 1. Creates the user in Supabase Auth (Client Side).
 * 2. Configures the user profile and credits via RPC (Server Side logic).
 */
export const createUser = async (
  payload: CreateUserPayload,
  adminUserId: string
): Promise<User> => {
  const methodUsed = 'auth_api_plus_rpc';

  // PASSO 1: Criar o usuário no Auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { full_name: payload.full_name }
  });

  if (authError) {
    console.error("Erro ao criar usuário no Auth:", authError);
    throw new Error(`Falha na autenticação: ${authError.message}`);
  }

  if (!authUser || !authUser.user) {
    throw new Error("Usuário criado, mas sem dados retornados.");
  }

  const newUserId = authUser.user.id;

  // PASSO 2: Salvar perfil e créditos via RPC
  const { data: rpcProfile, error: rpcError } = await supabase.rpc('create_new_user_profile', {
    p_user_id: newUserId,
    p_email: payload.email,
    p_full_name: payload.full_name,
    p_role: payload.role,
    p_credits: payload.credits,
    p_status: 'active'
  });

  if (rpcError) {
    // Log detalhado para depuração
    console.error(
        "*********************************************************************************\n" +
        "** ERRO AO SALVAR DADOS DO USUÁRIO VIA RPC (`create_new_user_profile`) **\n" +
        "*********************************************************************************\n" +
        "O usuário foi criado no Auth, mas falhou ao salvar o perfil/créditos.\n" +
        "==> OBJETO DE ERRO:\n" +
        `${JSON.stringify(rpcError, null, 2)}\n\n` +
        "==> SOLUÇÃO:\n" +
        "Execute o SCRIPT 2 (versão atualizada v3) no SQL Editor do Supabase para criar a função `create_new_user_profile`.\n" +
        "*********************************************************************************"
    );
    
    if (rpcError.message.includes('function') && rpcError.message.includes('does not exist')) {
        throw new Error("A função de banco de dados 'create_new_user_profile' não foi encontrada. Por favor, execute o script SQL atualizado no Supabase.");
    }
    throw new Error(`Usuário autenticado criado, mas falha ao salvar perfil: ${rpcError.message}`);
  }

  const newUser: User = { ...rpcProfile, credits: payload.credits };

  // Log de Auditoria
  const { error: logError } = await supabase.from('logs').insert([{
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
  }]);

  if (logError) {
    console.error(`Failed to create audit log:`, logError.message);
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
 */
export const getUsers = async ({
  role = 'all',
  status = 'all',
  page = 1,
  limit = 10,
}: GetUsersParams): Promise<GetUsersResult> => {
    // 1. Fetch paginated users from app_users
    let usersQuery = supabase
      .from('app_users')
      .select('id, email, full_name, role, status', { count: 'exact' });
  
    if (role !== 'all') {
      usersQuery = usersQuery.eq('role', role);
    }
    if (status !== 'all') {
      usersQuery = usersQuery.eq('status', status);
    }
  
    const offset = (page - 1) * limit;
    usersQuery = usersQuery.range(offset, offset + limit - 1).order('created_at', { ascending: false });
  
    const { data: usersData, error: usersError, count } = await usersQuery;
  
    if (usersError) {
      console.error('Error fetching users:', usersError.message);
      throw usersError;
    }
    
    if (!usersData || usersData.length === 0) {
        return { users: [], count: count ?? 0 };
    }
  
    // 2. Fetch credits for the fetched users
    const userIds = usersData.map(u => u.id);
    const { data: creditsData, error: creditsError } = await supabase
      .from('user_credits')
      .select('user_id, credits')
      .in('user_id', userIds);
  
    if (creditsError) {
        console.error('Error fetching credits for users:', creditsError.message);
        // Proceeding with 0 credits for users with fetch errors
    }
  
    // 3. Map credits to users
    const creditsMap = new Map(creditsData?.map(c => [c.user_id, c.credits]));
    
    const combinedUsers = usersData.map(user => ({
        ...user,
        credits: creditsMap.get(user.id) ?? 0,
    }));
  
    return { users: combinedUsers, count: count ?? 0 };
};

interface UpdateUserPayload {
  role?: UserRole;
  credits?: number;
  status?: UserStatus;
}

/**
 * Updates a user's data across 'app_users' and 'user_credits' and creates an audit log.
 */
export const updateUser = async (
  targetUserId: string,
  updates: UpdateUserPayload,
  adminUserId: string
): Promise<User> => {
  const { credits, ...profileUpdates } = updates;

  // 1. Fetch current user data in two steps to get a 'before' snapshot for logging
  const { data: currentProfile, error: fetchError } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', targetUserId)
    .maybeSingle();

  if (fetchError || !currentProfile) {
    throw new Error('Usuário a ser atualizado não encontrado.');
  }
  const { data: currentCreditsData } = await supabase
    .from('user_credits')
    .select('credits')
    .eq('user_id', targetUserId)
    .maybeSingle();

  const currentUser: User = { ...currentProfile, credits: currentCreditsData?.credits ?? 0 };

  // 2. Apply updates
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
  
  // 3. Refetch updated data in two steps to return the 'after' state
  const { data: updatedProfile, error: refetchError } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', targetUserId)
    .maybeSingle();
    
  if (refetchError || !updatedProfile) throw new Error('Falha ao recarregar usuário após atualização.');
  
  const { data: updatedCreditsData } = await supabase
    .from('user_credits')
    .select('credits')
    .eq('user_id', targetUserId)
    .maybeSingle();
  
  const updatedUser: User = { ...updatedProfile, credits: updatedCreditsData?.credits ?? 0 };

  // 4. Log changes
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
    const { error: logError } = await supabase.from('logs').insert([{
      usuario_id: adminUserId,
      acao: 'update_user',
      modulo: 'Usuários',
      detalhes: { target_user_id: targetUserId, changes },
    }]);
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

    const { error: logError } = await supabase.from('logs').insert([{
        usuario_id: adminUserId,
        acao: `update_news_status`,
        modulo: 'Notícias',
        detalhes: {
            news_id: newsId,
            new_status: status,
        }
    }]);

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
        .maybeSingle();
    
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
        const { error: logError } = await supabase.from('logs').insert([{
            usuario_id: adminUserId,
            acao: 'update_news_content',
            modulo: 'Notícias',
            detalhes: {
                news_id: newsId,
                changes,
            },
        }]);
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
  // 1. Fetch logs without the join
  let query = supabase
    .from('logs')
    .select('*', { count: 'exact' });

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

  const { data: logsData, error, count } = await query;

  if (error) {
    console.error('Error fetching logs:', error.message);
    throw error;
  }
  
  if (!logsData || logsData.length === 0) {
    return { logs: [], count: count ?? 0 };
  }

  // 2. Fetch user emails for the logs retrieved
  const userIds = [...new Set(logsData.map(log => log.usuario_id).filter(Boolean))];
  
  let userMap = new Map<string, string>();
  if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
          .from('app_users')
          .select('id, email')
          .in('id', userIds);
      
      if (usersError) {
          console.error('Error fetching users for logs:', usersError.message);
          // Proceed without emails if this fails
      } else if (usersData) {
          userMap = new Map(usersData.map(u => [u.id, u.email]));
      }
  }
  
  // 3. Combine the data
  const enrichedLogs = logsData.map(log => ({
    ...log,
    user_email: userMap.get(log.usuario_id) || 'N/A',
  }));

  return {
    logs: enrichedLogs,
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
    const { data: gatewaySettings, error: gatewaysError } = await supabase
        .from(SETTINGS_TABLE)
        .select('chave, valor')
        .eq('categoria', 'gateway');

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

    const gateways: PaymentSettings['gateways'] = {
        stripe: { enabled: false, publicKey: '', secretKey: '' },
        mercadoPago: { enabled: false, publicKey: '', secretKey: '' },
    };

    gatewaySettings?.forEach(setting => {
        const { chave, valor } = setting;
        const isTrue = String(valor).toLowerCase() === 'true';

        if (chave === 'stripe_enabled') gateways.stripe.enabled = isTrue;
        else if (chave === 'stripe_publicKey') gateways.stripe.publicKey = String(valor ?? '');
        else if (chave === 'stripe_secretKey') gateways.stripe.secretKey = String(valor ?? '');
        else if (chave === 'mercadoPago_enabled') gateways.mercadoPago.enabled = isTrue;
        else if (chave === 'mercadoPago_publicKey') gateways.mercadoPago.publicKey = String(valor ?? '');
        else if (chave === 'mercadoPago_secretKey') gateways.mercadoPago.secretKey = String(valor ?? '');
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

    const { error: logError } = await supabase.from('logs').insert([{
        usuario_id: adminUserId,
        acao: 'update_gateway_settings',
        modulo: 'Pagamentos',
        detalhes: { updated_gateways: Object.keys(gateways) }
    }]);

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
    
    const { error: logError } = await supabase.from('logs').insert([{
        usuario_id: adminUserId,
        acao: 'update_credit_packages',
        modulo: 'Pagamentos',
        detalhes: { package_count: packages.length }
    }]);

    if (logError) {
        console.error('Failed to log credit packages update:', logError.message);
    }
};

// --- MULTI-AI SETTINGS FUNCTIONS ---

const MULTI_AI_PLATFORMS_KEY = 'multi_ai_platforms';

export const getMultiAISettings = async (): Promise<MultiAISettings> => {
    const { data: platformsData, error: platformsError } = await supabase
        .from(SETTINGS_TABLE)
        .select('valor')
        .eq('chave', MULTI_AI_PLATFORMS_KEY)
        .maybeSingle();

    const { data: modelsData, error: modelsError } = await supabase
        .from('modelos_ia')
        .select('*');

    if (platformsError) {
        console.error('Error fetching multi-AI platforms:', platformsError.message);
        throw new Error('Falha ao carregar as configurações de plataformas de IA.');
    }
    if (modelsError) {
        console.error('Error fetching AI models:', modelsError.message);
        throw new Error('Falha ao carregar os modelos de IA.');
    }
    
    const platforms: AIPlatformSettings = platformsData?.valor ?? {
        gemini: { enabled: true, apiKey: '', costPerMillionTokens: 0.50, maxTokens: 8192 },
        openai: { enabled: false, apiKey: '', costPerMillionTokens: 1.00, maxTokens: 4096 },
        claude: { enabled: false, apiKey: '', costPerMillionTokens: 1.50, maxTokens: 100000 },
    };

    const models: AIModel[] = (modelsData ?? []).map(m => ({
        ...m,
        ativo: m.status === 'active'
    }));

    return { platforms, models };
};

export const updateMultiAISettings = async (settings: MultiAISettings, adminUserId: string): Promise<MultiAISettings> => {
    const { error: platformsError } = await supabase
        .from(SETTINGS_TABLE)
        .upsert({ chave: MULTI_AI_PLATFORMS_KEY, valor: settings.platforms, categoria: 'multi_ia' });
    
    if (platformsError) {
        console.error('Error updating multi-AI platforms:', platformsError.message);
        throw new Error('Falha ao salvar as configurações de plataformas de IA.');
    }

    const modelsToUpsert = settings.models.map(m => ({
        ...m,
        status: m.ativo ? 'active' : 'inactive'
    }));
    const { error: modelsError } = await supabase
        .from('modelos_ia')
        .upsert(modelsToUpsert);

    if (modelsError) {
        console.error('Error updating AI models:', modelsError.message);
        throw new Error('Falha ao salvar os modelos de IA.');
    }
    
    const { error: logError } = await supabase.from('logs').insert([{
        usuario_id: adminUserId,
        acao: 'update_multi_ai_settings',
        modulo: 'Sistema Multi-IA',
        detalhes: {
            updated_platforms: Object.keys(settings.platforms),
            model_count: settings.models.length,
        }
    }]);

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

export const getAILogs = async ({
  page = 1,
  limit = 15,
}: GetAILogsParams): Promise<GetAILogsResult> => {
  // 1. Fetch AI logs
  let query = supabase
    .from('consumo_ia')
    .select('*', { count: 'exact' });
  
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1).order('data', { ascending: false });

  const { data: logsData, error, count } = await query;

  if (error) {
    console.error('Error fetching AI logs:', error.message);
    throw new Error('Falha ao buscar logs de uso da IA.');
  }

  if (!logsData || logsData.length === 0) {
      return { logs: [], count: count ?? 0 };
  }

  // 2. Fetch corresponding users
  const userIds = [...new Set(logsData.map(log => log.usuario_id).filter(Boolean))];
  let userMap = new Map<string, string>();

  if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
          .from('app_users')
          .select('id, email')
          .in('id', userIds);
      
      if (usersError) {
          console.error('Error fetching users for AI logs:', usersError.message);
      } else if (usersData) {
          userMap = new Map(usersData.map(u => [u.id, u.email]));
      }
  }

  // 3. Combine data
  const enrichedLogs = logsData.map((log: any) => ({
    ...log,
    user: {
      email: userMap.get(log.usuario_id) || 'N/A',
    },
  }));

  return { logs: enrichedLogs as AILog[], count: count ?? 0 };
};