
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
-- 🛠️ ATUALIZAÇÃO 1: CRM & CHAT CORE (WHATICKET)
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE CONTATOS
create table if not exists public.contacts (
  id uuid primary key default uuid_generate_v4(),
  phone text not null unique,
  name text,
  created_at timestamptz default now()
);

-- 2. TABELA DE CONVERSAS
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid references public.contacts(id),
  last_message text,
  last_message_at timestamptz default now(),
  unread_count int default 0,
  created_at timestamptz default now()
);

-- 3. TABELA DE MENSAGENS
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id),
  direction text check(direction in ('in','out')),
  body text,
  created_at timestamptz default now()
);

-- 4. HABILITAR RLS (Segurança)
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- 5. POLÍTICAS DE ACESSO
create policy "Allow all access to contacts" on public.contacts for all using (true) with check (true);
create policy "Allow all access to conversations" on public.conversations for all using (true) with check (true);
create policy "Allow all access to messages" on public.messages for all using (true) with check (true);

-- 6. PERMISSÕES
grant all on public.contacts to anon, authenticated, service_role;
grant all on public.conversations to anon, authenticated, service_role;
grant all on public.messages to anon, authenticated, service_role;

-- 7. RPC: SAVE INCOMING MESSAGE
create or replace function save_incoming_message(phone text, text_body text)
returns void
language plpgsql
security definer 
as $$
declare
  contact public.contacts%rowtype;
  conv public.conversations%rowtype;
begin
  select * into contact from public.contacts where public.contacts.phone = phone limit 1;
  if not found then
    insert into public.contacts(phone, name) values(phone, phone) returning * into contact;
  end if;

  select * into conv from public.conversations where contact_id = contact.id limit 1;
  if not found then
    insert into public.conversations(contact_id, last_message, last_message_at, unread_count)
    values(contact.id, text_body, now(), 1)
    returning * into conv;
  else
    update public.conversations
    set last_message = text_body, last_message_at = now(), unread_count = unread_count + 1
    where id = conv.id;
  end if;

  insert into public.messages(conversation_id, direction, body)
  values (conv.id, 'in', text_body);
end;
$$;

-- 8. RPC: SAVE OUTGOING MESSAGE
create or replace function save_outgoing_message(phone text, text_body text)
returns void
language plpgsql
security definer
as $$
declare
  contact public.contacts%rowtype;
  conv public.conversations%rowtype;
begin
  select * into contact from public.contacts where public.contacts.phone = phone limit 1;
  if not found then
    insert into public.contacts(phone, name) values(phone, phone) returning * into contact;
  end if;

  select * into conv from public.conversations where contact_id = contact.id limit 1;
  if not found then
    insert into public.conversations(contact_id, last_message, last_message_at) values(contact.id, text_body, now()) returning * into conv;
  else 
    update public.conversations set last_message = text_body, last_message_at = now() where id = conv.id;
  end if;

  insert into public.messages(conversation_id, direction, body)
  values (conv.id, 'out', text_body);
end;
$$;
`;

const aiSql = `
-- =========================================================
-- 🛠️ ATUALIZAÇÃO 2: CRM AI AUTOMATION
-- Execute este script para habilitar respostas automáticas.
-- =========================================================

-- 1. TABELA DE CONFIGURAÇÕES DE IA
create table if not exists public.ai_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean default false,
  temperature float default 0.7,
  system_prompt text default 'Você é um assistente virtual útil e profissional. Responda de forma clara e concisa.',
  created_at timestamptz default now()
);

-- 2. HABILITAR RLS
alter table public.ai_settings enable row level security;

-- 3. POLÍTICAS DE ACESSO
create policy "Users can manage their own AI settings" 
on public.ai_settings for all 
using (auth.uid() = user_id) 
with check (auth.uid() = user_id);

-- Permitir leitura pública (para o backend/bot ler as configs sem login de usuário específico se necessário, ou use service_role)
create policy "Service role can access all" 
on public.ai_settings for all 
using (true) 
with check (true);

-- 4. PERMISSÕES
grant all on public.ai_settings to anon, authenticated, service_role;
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
            <p className="text-gray-600 mb-6 leading-relaxed">
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
                    Utilize este script para configurar um projeto Supabase <strong>totalmente novo</strong>.
                </p>
            </div>
        )}

        {activeTab === 'updates' && (
            <div className="space-y-8">
                <div className="prose prose-slate max-w-none">
                    <h1 className="text-3xl font-bold text-[#263238] mb-4">Atualizações & SQL</h1>
                    
                    <h3 className="text-lg font-bold text-blue-600 mt-6 mb-2">Atualização 1: CRM Core</h3>
                    <p className="text-sm text-gray-500 mb-2">Estrutura base do Whaticket (Conversas, Mensagens).</p>
                    <div className="relative bg-gray-50 border border-gray-200 text-gray-700 p-4 rounded-lg text-xs font-mono shadow-inner max-h-[300px] overflow-auto custom-scrollbar">
                        <pre className="whitespace-pre-wrap">{schemaSql}</pre>
                        <button onClick={() => handleCopy(schemaSql, 'schema_sql')} className="absolute top-2 right-2 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded font-bold hover:bg-gray-100">
                            {copiedField === 'schema_sql' ? 'Copiado!' : 'Copiar'}
                        </button>
                    </div>

                    <h3 className="text-lg font-bold text-green-600 mt-8 mb-2">Atualização 2: CRM AI Automation</h3>
                    <p className="text-sm text-gray-500 mb-2">Tabela de configurações para o Auto-Reply com IA.</p>
                    <div className="relative bg-gray-50 border border-gray-200 text-gray-700 p-4 rounded-lg text-xs font-mono shadow-inner max-h-[300px] overflow-auto custom-scrollbar">
                        <pre className="whitespace-pre-wrap">{aiSql}</pre>
                        <button onClick={() => handleCopy(aiSql, 'ai_sql')} className="absolute top-2 right-2 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded font-bold hover:bg-gray-100">
                            {copiedField === 'ai_sql' ? 'Copiado!' : 'Copiar'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
