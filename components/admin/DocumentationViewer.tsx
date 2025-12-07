

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../contexts/UserContext';
import { createApiKey, listApiKeys, revokeApiKey, generateWordPressPluginZip } from '../../services/developerService';
import { ApiKey } from '../../types';
import { Toast } from './Toast';
import { supabaseUrl, supabaseAnonKey } from '../../services/supabaseClient'; 

export function DocumentationViewer() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'user_manual' | 'technical' | 'api' | 'updates' | 'setup' | 'n8n_guide'>('user_manual');
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showSqlFix, setShowSqlFix] = useState(false);
  
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
      const cachedKey = localStorage.getItem('gdn_gemini_key_cache');
      if (cachedKey) {
          setGeminiKeyInput(cachedKey);
      }
  }, []);

  useEffect(() => {
      if (activeTab === 'api' && user) {
          loadKeys();
      }
  }, [activeTab, user]);

  const loadKeys = async () => {
      if (!user) return;
      setLoadingKeys(true);
      setShowSqlFix(false);
      try {
          const keys = await listApiKeys(user.id);
          setApiKeys(keys);
      } catch (e: any) {
          console.error("Erro ao carregar chaves:", e);
          if (e.message === 'TABLE_NOT_FOUND') {
              setShowSqlFix(true);
          }
      } finally {
          setLoadingKeys(false);
      }
  };

  const handleCreateKey = async () => {
      if (!user || !newKeyName.trim()) return;
      try {
          const key = await createApiKey(user.id, newKeyName);
          setCreatedKey(key.full_key || null);
          setNewKeyName('');
          await loadKeys();
          setToast({ message: "Chave criada com sucesso!", type: 'success' });
      } catch (e: any) {
          console.error("Erro na criação:", e);
          if (e.message === 'TABLE_NOT_FOUND') {
              setShowSqlFix(true);
              setToast({ message: "Erro: Tabela de Chaves não encontrada. Veja instrução abaixo.", type: 'error' });
          } else {
              setToast({ message: `Erro ao criar chave: ${e.message}`, type: 'error' });
          }
      }
  };

  const handleRevokeKey = async (id: string) => {
      if (!window.confirm("Tem certeza? Qualquer sistema usando esta chave perderá acesso.")) return;
      try {
          await revokeApiKey(id);
          loadKeys();
          setToast({ message: "Chave revogada.", type: 'success' });
      } catch (e: any) {
          setToast({ message: `Erro ao revogar: ${e.message}`, type: 'error' });
      }
  };

  const handleDownloadPlugin = () => {
      if (!geminiKeyInput && !confirm("ATENÇÃO: Você não inseriu uma Chave Gemini. O plugin pode falhar com erro 'API Key not valid'. Deseja continuar mesmo assim?")) {
          return;
      }
      
      localStorage.setItem('gdn_gemini_key_cache', geminiKeyInput);
      
      generateWordPressPluginZip(geminiKeyInput);
      setToast({ message: "Download iniciado! Chave salva no navegador.", type: 'success' });
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getTabClass = (tabName: string) => `px-4 py-2 rounded-md text-sm font-bold transition whitespace-nowrap ${activeTab === tabName ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`;

  const schemaSql = `
-- =========================================================
-- 🚨 PACOTE DE CORREÇÃO (UPDATES)
-- Use este SQL para corrigir problemas em instalações existentes.
-- Para uma instalação nova, use a aba "Instalação Limpa".
-- =========================================================

-- 1. CORREÇÃO DE LOGS DE VISITANTES (Dashboard)
ALTER TABLE public.logs DROP CONSTRAINT IF EXISTS logs_usuario_id_fkey;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can insert logs" ON public.logs;
DROP POLICY IF EXISTS "Admins can view all logs" ON public.logs;
DROP POLICY IF EXISTS "Users can view own logs" ON public.logs;

CREATE POLICY "Anon can insert logs" ON public.logs 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Admins can view all logs" ON public.logs 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

GRANT INSERT, SELECT ON public.logs TO anon, authenticated;
GRANT ALL ON public.logs TO service_role;

-- 2. CORREÇÃO DE CRÉDITOS (RPC)
CREATE OR REPLACE FUNCTION public.deduct_credits(cost int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits int;
BEGIN
  SELECT credits INTO current_credits FROM public.user_credits WHERE user_id = auth.uid();
  
  IF current_credits IS NULL THEN
    INSERT INTO public.user_credits (user_id, credits) VALUES (auth.uid(), 3);
    current_credits := 3;
  END IF;

  IF current_credits = -1 THEN
    RETURN;
  END IF;

  IF current_credits < cost THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  UPDATE public.user_credits
  SET credits = credits - cost
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits TO service_role;

-- 3. CORREÇÃO DE NOTIFICAÇÕES
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- 4. CORREÇÃO DE ÚLTIMO LOGIN & PERFIL
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS last_login timestamptz;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own profile" ON public.app_users;

-- Permite que o usuário edite o PRÓPRIO perfil (necessário para last_login)
CREATE POLICY "Users can update own profile" ON public.app_users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

GRANT UPDATE ON public.app_users TO authenticated;
GRANT UPDATE ON public.app_users TO service_role;
`;

  const fullSetupSql = `
-- =========================================================
-- 🚀 FULL SETUP - GDN_IA (INSTALAÇÃO LIMPA)
-- Execute este script no SQL Editor do Supabase para criar
-- toda a estrutura do banco de dados do zero.
-- =========================================================

-- 1. EXTENSÕES
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- 2. TABELA DE USUÁRIOS (PERFIL)
create table if not exists public.app_users (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  role text default 'user' check (role in ('user', 'editor', 'admin', 'super_admin')),
  status text default 'active' check (status in ('active', 'inactive', 'banned')),
  plan text default 'free',
  affiliate_code text unique,
  referred_by uuid references public.app_users(id),
  affiliate_balance numeric default 0,
  asaas_customer_id text,
  mercadopago_customer_id text,
  subscription_id text,
  subscription_status text,
  phone text,
  last_login timestamptz,
  created_at timestamptz default now()
);

-- 3. TABELA DE CRÉDITOS
create table if not exists public.user_credits (
  user_id uuid references public.app_users(id) on delete cascade not null primary key,
  credits int default 3
);

-- 4. TABELA DE NOTÍCIAS/CONTEÚDO
create table if not exists public.news (
  id bigint generated by default as identity primary key,
  titulo text not null,
  conteudo text not null,
  tipo text default 'news_generator',
  status text default 'approved',
  author_id uuid references public.app_users(id),
  sources jsonb default '[]'::jsonb,
  criado_em timestamptz default now()
);

-- 5. TABELA DE TRANSAÇÕES
create table if not exists public.transactions (
  id bigint generated by default as identity primary key,
  usuario_id uuid references public.app_users(id) not null,
  valor numeric not null,
  metodo text check (metodo in ('pix', 'card')),
  status text check (status in ('pending', 'approved', 'failed', 'refunded')),
  external_id text,
  metadata jsonb default '{}'::jsonb,
  data timestamptz default now()
);

-- 6. TABELA DE LOGS DO SISTEMA
create table if not exists public.logs (
  id bigint generated by default as identity primary key,
  usuario_id uuid, -- Pode ser null ou GUEST_ID fictício
  acao text not null,
  modulo text,
  detalhes jsonb,
  data timestamptz default now()
);

-- 7. TABELA DE LOGS DE AFILIADOS
create table if not exists public.affiliate_logs (
  id uuid default uuid_generate_v4() primary key,
  affiliate_id uuid references public.app_users(id) not null,
  source_user_id uuid references public.app_users(id),
  amount numeric not null,
  description text,
  created_at timestamptz default now()
);

-- 8. TABELA DE CONFIGURAÇÕES DO SISTEMA (JSON STORE)
create table if not exists public.system_config (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.app_users(id),
  updated_at timestamptz default now()
);

-- 9. TABELA DE POPUPS
create table if not exists public.system_popups (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text,
  type text default 'text',
  media_url text,
  style jsonb default '{}'::jsonb,
  trigger_settings jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 10. TABELA DE FEEDBACKS (DEPOIMENTOS)
create table if not exists public.system_feedbacks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.app_users(id) not null,
  content text not null,
  rating int not null,
  status text default 'pending',
  created_at timestamptz default now()
);

-- 11. TABELA DE NOTIFICAÇÕES
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.app_users(id) not null,
  title text not null,
  message text not null,
  type text default 'info',
  is_read boolean default false,
  action_link text,
  created_at timestamptz default now()
);

-- 12. TABELA DE API KEYS
create table if not exists public.api_keys (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.app_users(id) not null,
  name text not null,
  key_prefix text not null,
  key_hash text not null, -- Armazenar hash real em produção
  status text default 'active',
  last_used_at timestamptz,
  created_at timestamptz default now()
);

-- 13. TABELA DE MEMÓRIA DO USUÁRIO
create table if not exists public.user_memory (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.app_users(id) not null,
  chave text not null,
  valor text not null,
  created_at timestamptz default now()
);

-- 14. TABELA DE DOMÍNIOS PERMITIDOS (ALLOWLIST)
create table if not exists public.allowed_domains (
  id uuid default uuid_generate_v4() primary key,
  domain text unique not null,
  created_at timestamptz default now()
);

-- 15. TABELA DE LOGS DE IA
create table if not exists public.ai_logs (
  id bigint generated by default as identity primary key,
  usuario_id uuid references public.app_users(id),
  modelo_id text,
  tokens int,
  custo numeric,
  data timestamptz default now()
);

-- =========================================================
-- FUNÇÕES E TRIGGERS
-- =========================================================

-- Trigger para criar perfil automaticamente ao cadastrar no Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.app_users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  
  insert into public.user_credits (user_id, credits)
  values (new.id, 3); -- 3 créditos grátis iniciais
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger bind
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Função RPC para deduzir créditos com segurança
create or replace function public.deduct_credits(cost int)
returns void
language plpgsql
security definer
as $$
declare
  current_credits int;
begin
  select credits into current_credits from public.user_credits where user_id = auth.uid();
  
  if current_credits is null then
    -- Se não existir registro, cria com padrão
    insert into public.user_credits (user_id, credits) values (auth.uid(), 3);
    current_credits := 3;
  end if;

  if current_credits = -1 then
    return; -- Créditos ilimitados
  end if;

  if current_credits < cost then
    raise exception 'Saldo insuficiente';
  end if;

  update public.user_credits
  set credits = credits - cost
  where user_id = auth.uid();
end;
$$;

-- =========================================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- =========================================================

-- Habilitar RLS em todas as tabelas
alter table public.app_users enable row level security;
alter table public.user_credits enable row level security;
alter table public.news enable row level security;
alter table public.transactions enable row level security;
alter table public.logs enable row level security;
alter table public.affiliate_logs enable row level security;
alter table public.system_config enable row level security;
alter table public.system_popups enable row level security;
alter table public.system_feedbacks enable row level security;
alter table public.notifications enable row level security;
alter table public.api_keys enable row level security;
alter table public.user_memory enable row level security;
alter table public.allowed_domains enable row level security;
alter table public.ai_logs enable row level security;

-- App Users Policies
create policy "Users can view own profile" on public.app_users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.app_users for update using (auth.uid() = id);
create policy "Admins can view all profiles" on public.app_users for select using (
  exists (select 1 from public.app_users where id = auth.uid() and role in ('admin', 'super_admin'))
);
create policy "Admins can update all profiles" on public.app_users for update using (
  exists (select 1 from public.app_users where id = auth.uid() and role in ('admin', 'super_admin'))
);

-- User Credits Policies
create policy "Users can view own credits" on public.user_credits for select using (auth.uid() = user_id);
create policy "Admins can view all credits" on public.user_credits for select using (
  exists (select 1 from public.app_users where id = auth.uid() and role in ('admin', 'super_admin'))
);
create policy "Admins can update credits" on public.user_credits for update using (
  exists (select 1 from public.app_users where id = auth.uid() and role in ('admin', 'super_admin'))
);

-- News Policies
create policy "Users can view own news" on public.news for select using (auth.uid() = author_id);
create policy "Users can insert own news" on public.news for insert with check (auth.uid() = author_id);
create policy "Admins can view all news" on public.news for select using (
  exists (select 1 from public.app_users where id = auth.uid() and role in ('admin', 'super_admin'))
);
create policy "Public can view approved news" on public.news for select using (status = 'approved');

-- Logs Policies
create policy "Anon can insert logs" on public.logs for insert with check (true);
create policy "Admins can view all logs" on public.logs for select using (
  exists (select 1 from public.app_users where id = auth.uid() and role in ('admin', 'super_admin'))
);

-- System Config Policies
create policy "Admins can manage config" on public.system_config for all using (
  exists (select 1 from public.app_users where id = auth.uid() and role in ('admin', 'super_admin'))
);
create policy "Public read config" on public.system_config for select using (true);

-- Permissões básicas
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert on public.logs to anon;
`;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="border-b border-gray-200 flex justify-between items-center flex-wrap gap-4 pb-4">
        <nav className="-mb-px flex space-x-2 overflow-x-auto" aria-label="Tabs">
          <button onClick={() => setActiveTab('user_manual')} className={getTabClass('user_manual')}><i className="fas fa-book mr-2"></i>Manual Usuário</button>
          <button onClick={() => setActiveTab('technical')} className={getTabClass('technical')}><i className="fas fa-code mr-2"></i>Visão Técnica</button>
          <button onClick={() => setActiveTab('n8n_guide')} className={getTabClass('n8n_guide')}><i className="fas fa-project-diagram mr-2"></i>N8N Seguro</button>
          <button onClick={() => setActiveTab('api')} className={getTabClass('api')}><i className="fas fa-plug mr-2"></i>API / Devs</button>
          <button onClick={() => setActiveTab('setup')} className={getTabClass('setup')}><i className="fas fa-database mr-2"></i>Instalação Limpa</button>
          <button onClick={() => setActiveTab('updates')} className={getTabClass('updates')}><i className="fas fa-sync-alt mr-2"></i>Updates & SQL</button>
        </nav>
        {activeTab === 'api' && (
             <button
                onClick={handleDownloadPlugin}
                className="px-4 py-2 text-sm font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-all shadow-md shadow-purple-200 flex items-center gap-2"
            >
                <i className="fab fa-wordpress text-lg"></i> Baixar Plugin WP
            </button>
        )}
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        
        {/* ... Other tabs ... */}
        {activeTab === 'user_manual' && (
          <div className="prose prose-slate max-w-none">
            <h1 className="text-3xl font-bold text-[#263238] mb-4">🚀 Guia Oficial do Usuário - GDN_IA</h1>
            <p className="text-gray-600 mb-4">
              Bem-vindo ao <strong>GDN_IA</strong>!
            </p>
            <p className="text-sm text-gray-500">Consulte o arquivo <code>MANUAL_DO_USUARIO.md</code> para o conteúdo completo.</p>
          </div>
        )}

        {activeTab === 'technical' && (
            <div className="prose prose-slate max-w-none">
                <h1 className="text-3xl font-bold text-[#263238] mb-4">Arquitetura Técnica</h1>
                <p className="text-gray-600">Detalhes sobre o stack (React, Supabase, Gemini) e fluxos de dados.</p>
                <p className="text-sm text-gray-500">Consulte o arquivo <code>DOCUMENTATION_TECHNICAL.md</code> para o conteúdo completo.</p>
            </div>
        )}

        {activeTab === 'n8n_guide' && (
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-lg border border-pink-100">
                    <h2 className="text-2xl font-bold text-[#263238] mb-2"><i className="fas fa-bolt text-pink-500 mr-2"></i>Guia de Segurança Avançada N8N</h2>
                    <p className="text-gray-600 text-sm mb-4">
                        Aprenda a configurar um fluxo N8N <strong>isolado e seguro</strong> onde cada usuário tem seu próprio contexto.
                    </p>
                </div>
            </div>
        )}

        {activeTab === 'api' && (
            <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h2 className="text-xl font-bold text-[#263238] mb-4">Gerenciamento de API Keys</h2>
                    <div className="space-y-2">
                        {apiKeys.map(key => (
                            <div key={key.id} className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded hover:shadow-sm transition">
                                <div>
                                    <p className="font-bold text-sm text-[#263238]">{key.name}</p>
                                    <p className="text-xs text-gray-400 font-mono">Prefix: {key.key_prefix}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`text-xs px-2 py-1 rounded font-bold ${key.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{key.status}</span>
                                    {key.status === 'active' && (
                                        <button onClick={() => handleRevokeKey(key.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">Revogar</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'setup' && (
            <div className="prose prose-slate max-w-none">
                <h1 className="text-3xl font-bold text-[#263238] mb-4">Instalação Limpa (Full Setup)</h1>
                <p className="text-gray-600 mb-4">
                    Utilize este script para configurar um projeto Supabase <strong>totalmente novo</strong>. Ele cria todas as tabelas, triggers, funções e políticas de segurança RLS necessárias.
                </p>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                    <h3 className="font-bold text-blue-800 text-sm mb-2"><i className="fas fa-info-circle mr-2"></i>Como usar:</h3>
                    <ol className="list-decimal pl-5 text-sm text-blue-700 space-y-1">
                        <li>Acesse o <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline">Dashboard do Supabase</a>.</li>
                        <li>Vá até a seção <strong>SQL Editor</strong>.</li>
                        <li>Crie uma nova query, cole o código abaixo e clique em <strong>Run</strong>.</li>
                    </ol>
                </div>
                <div className="relative bg-gray-900 border border-gray-700 text-gray-300 p-4 rounded-lg text-xs font-mono shadow-inner max-h-[600px] overflow-auto custom-scrollbar">
                    <pre className="whitespace-pre-wrap">{fullSetupSql}</pre>
                    <button onClick={() => handleCopy(fullSetupSql, 'setup_sql')} className="absolute top-2 right-2 px-3 py-1.5 text-xs bg-gray-800 border border-gray-600 rounded font-bold hover:bg-gray-700 text-white transition">
                        {copiedField === 'setup_sql' ? 'Copiado!' : 'Copiar SQL'}
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'updates' && (
            <div className="prose prose-slate max-w-none">
                <h1 className="text-3xl font-bold text-[#263238] mb-4">Atualizações & SQL</h1>
                <p className="text-sm text-gray-500 mb-4 bg-yellow-50 p-3 rounded border border-yellow-200">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Use este script apenas para <strong>corrigir instalações existentes</strong>. Ele aplica patches incrementais para logs, créditos e notificações.
                </p>
                <div className="relative bg-gray-50 border border-gray-200 text-gray-700 p-4 rounded-lg text-xs font-mono shadow-inner max-h-[600px] overflow-auto custom-scrollbar">
                    <pre className="whitespace-pre-wrap">{schemaSql}</pre>
                    <button onClick={() => handleCopy(schemaSql, 'schema_sql')} className="absolute top-2 right-2 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded font-bold hover:bg-gray-100">
                        {copiedField === 'schema_sql' ? 'Copiado!' : 'Copiar SQL'}
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}