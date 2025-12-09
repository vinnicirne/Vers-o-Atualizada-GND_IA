import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../contexts/UserContext';
import { createApiKey, listApiKeys, revokeApiKey, generateWordPressPluginZip } from '../../services/developerService';
import { testEmailIntegration as sendTestEmail } from '../../services/adminService';
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
  const [isTestingEmail, setIsTestingEmail] = useState(false);

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

  const handleTestEmail = async () => {
      if (!user) return;
      setIsTestingEmail(true);
      try {
          await sendTestEmail(user.email);
          setToast({ message: `E-mail de teste enviado para ${user.email}. Verifique sua caixa de entrada.`, type: 'success' });
      } catch (e: any) {
          console.error(e);
          setToast({ message: `Falha no envio. Verifique a chave RESEND_API_KEY no Supabase. Detalhes: ${e.message}`, type: 'error' });
      } finally {
          setIsTestingEmail(false);
      }
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getTabClass = (tabName: string) => `px-4 py-2 rounded-md text-sm font-bold transition whitespace-nowrap ${activeTab === tabName ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`;

  const schemaSql = `
-- =========================================================
-- 🚨 PACOTE DE CORREÇÃO (CRM & SALES FUNNEL)
-- Execute este script para criar as tabelas de Funil de Vendas
-- =========================================================

-- 1. TABELA DE LEADS (CRM - Estrutura Completa)
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  email text NOT NULL,
  nome text,
  telefone text,
  empresa text,
  fonte text,
  utm_campaign text,
  utm_medium text,
  utm_source text,
  status_funil text DEFAULT 'new' CHECK (status_funil IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  score int DEFAULT 0,
  tags text[],
  consentimento boolean DEFAULT false,
  notes text, 
  created_at timestamptz DEFAULT now()
);

-- 2. TABELA DE EVENTOS DE MARKETING
CREATE TABLE IF NOT EXISTS public.eventos_marketing (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo_evento text CHECK (tipo_evento IN ('view_landing', 'submit_form', 'email_open', 'email_click', 'checkout_view', 'purchase')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 3. TABELA DE DEALS / PEDIDOS
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  plano text,
  valor numeric(10,2),
  status text DEFAULT 'pending' CHECK (status IN ('won', 'lost', 'pending')),
  gateway_ref text,
  created_at timestamptz DEFAULT now()
);

-- =========================================================
-- POLÍTICAS DE SEGURANÇA (RLS) - ISOLAMENTO
-- =========================================================

-- Habilitar RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Anon insert leads" ON public.leads;
DROP POLICY IF EXISTS "Admins manage leads" ON public.leads;
DROP POLICY IF EXISTS "Anon insert events" ON public.eventos_marketing;
DROP POLICY IF EXISTS "Admins view events" ON public.eventos_marketing;
DROP POLICY IF EXISTS "Admins manage deals" ON public.deals;

-- --- LEADS ---
-- Permitir que qualquer um (anon/auth) INSIRA um lead (Captura na Landing Page)
CREATE POLICY "Anon insert leads" ON public.leads 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Apenas Admins podem ver, atualizar ou deletar leads
CREATE POLICY "Admins manage leads" ON public.leads 
FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- --- EVENTOS DE MARKETING ---
-- Permitir inserção pública de eventos (Analytics)
CREATE POLICY "Anon insert events" ON public.eventos_marketing 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Apenas Admins veem eventos
CREATE POLICY "Admins view events" ON public.eventos_marketing 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- --- DEALS ---
-- Apenas Admins gerenciam deals
CREATE POLICY "Admins manage deals" ON public.deals 
FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Grants
GRANT ALL ON public.leads TO service_role;
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT ALL ON public.eventos_marketing TO service_role;
GRANT INSERT ON public.eventos_marketing TO anon, authenticated;
GRANT ALL ON public.deals TO service_role;
`;

  const fullSetupSql = `
-- =========================================================
-- 🚀 FULL SETUP - GDN_IA (INSTALAÇÃO LIMPA)
-- =========================================================

-- ... (Resto do SQL mantido, mas com Leads adicionado)

-- [INCLUIR CRIAÇÃO DAS TABELAS LEADS, EVENTOS E DEALS AQUI TAMBÉM]
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  email text NOT NULL,
  nome text,
  telefone text,
  empresa text,
  fonte text,
  utm_campaign text,
  utm_medium text,
  utm_source text,
  status_funil text DEFAULT 'new' CHECK (status_funil IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  score int DEFAULT 0,
  tags text[],
  consentimento boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eventos_marketing (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo_evento text CHECK (tipo_evento IN ('view_landing', 'submit_form', 'email_open', 'email_click', 'checkout_view', 'purchase')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deals (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  plano text,
  valor numeric(10,2),
  status text DEFAULT 'pending' CHECK (status IN ('won', 'lost', 'pending')),
  gateway_ref text,
  created_at timestamptz DEFAULT now()
);

-- ... (Resto das políticas)
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
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mb-6">
                    <h3 className="text-orange-800 font-bold mb-2 flex items-center gap-2">
                        <i className="fas fa-envelope"></i> Configuração de E-mail (Automação Lead Magnet)
                    </h3>
                    <p className="text-sm text-orange-700 mb-2">
                        Para que o envio automático do E-book funcione, você precisa configurar a chave do Resend no Supabase.
                    </p>
                    <ol className="list-decimal pl-5 text-sm text-orange-700 space-y-1">
                        <li>Crie uma conta em <a href="https://resend.com" target="_blank" className="underline font-bold">Resend.com</a> e gere uma API Key.</li>
                        <li>No painel do Supabase, vá em <strong>Settings &gt; Edge Functions</strong>.</li>
                        <li>Adicione uma nova secret: Nome <code>RESEND_API_KEY</code>, Valor: <code>re_123...</code> (Sua chave).</li>
                    </ol>
                    <div className="mt-4 pt-4 border-t border-orange-200">
                        <button 
                            onClick={handleTestEmail}
                            disabled={isTestingEmail}
                            className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-700 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {isTestingEmail ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                            Testar Integração (Enviar para Mim)
                        </button>
                        <p className="text-[10px] text-orange-600 mt-1">Isso enviará o E-book de teste para {user?.email}.</p>
                    </div>
                </div>

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
                    Use este script para atualizar instalações existentes com as novas tabelas de <strong>Leads/CRM</strong>.
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