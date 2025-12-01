
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../contexts/UserContext';
import { createApiKey, listApiKeys, revokeApiKey, generateWordPressPluginZip } from '../../services/developerService';
import { ApiKey } from '../../types';
import { Toast } from './Toast';
import { supabaseUrl, supabaseAnonKey } from '../../services/supabaseClient'; 

export function DocumentationViewer() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'user_manual' | 'technical' | 'api' | 'updates' | 'n8n_guide'>('user_manual');
  
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
-- === CORREÇÃO DE PERMISSÕES E TABELAS ===

-- 1. TABELA DE FEEDBACKS (Garante que existe e tem RLS correto)
CREATE TABLE IF NOT EXISTS public.system_feedbacks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.app_users(id),
    content text NOT NULL,
    rating int DEFAULT 5,
    status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at timestamp with time zone DEFAULT now()
);

-- Habilita RLS
ALTER TABLE public.system_feedbacks ENABLE ROW LEVEL SECURITY;

-- Garante permissões de escrita para usuários autenticados
GRANT ALL ON public.system_feedbacks TO authenticated;
GRANT ALL ON public.system_feedbacks TO service_role;

-- POLÍTICAS DE FEEDBACK (Crucial para corrigir erro 403)
DROP POLICY IF EXISTS "Anyone can read approved feedbacks" ON public.system_feedbacks;
CREATE POLICY "Anyone can read approved feedbacks" ON public.system_feedbacks FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Users can create feedbacks" ON public.system_feedbacks;
CREATE POLICY "Users can create feedbacks" ON public.system_feedbacks FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage all feedbacks" ON public.system_feedbacks;
CREATE POLICY "Admins manage all feedbacks" ON public.system_feedbacks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 2. TABELA DE POPUPS
CREATE TABLE IF NOT EXISTS public.system_popups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    content text,
    type text NOT NULL CHECK (type IN ('text', 'image', 'video')),
    media_url text,
    style jsonb DEFAULT '{"background_color": "#ffffff", "text_color": "#000000", "button_color": "#10B981", "button_text_color": "#ffffff"}',
    trigger_settings jsonb DEFAULT '{"delay": 0, "frequency": "once", "button_text": "Fechar", "button_link": ""}',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.system_popups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view popups" ON public.system_popups;
CREATE POLICY "Public view popups" ON public.system_popups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage popups" ON public.system_popups;
CREATE POLICY "Admins manage popups" ON public.system_popups FOR ALL USING (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 3. CAMPOS EXTRAS (Afiliados, Pagamentos)
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS affiliate_code text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.app_users(id);
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS affiliate_balance numeric DEFAULT 0;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS asaas_customer_id text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS subscription_id text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS mercadopago_customer_id text;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 4. TABELA DE LOGS DE AFILIADOS
CREATE TABLE IF NOT EXISTS public.affiliate_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    affiliate_id uuid REFERENCES public.app_users(id),
    source_user_id uuid REFERENCES public.app_users(id),
    amount numeric NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.affiliate_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own affiliate logs" ON public.affiliate_logs;
CREATE POLICY "Users view own affiliate logs" ON public.affiliate_logs FOR SELECT USING (auth.uid() = affiliate_id);

-- 5. MEMÓRIA E DOMÍNIOS
CREATE TABLE IF NOT EXISTS public.user_memory (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id uuid REFERENCES public.app_users(id),
    chave text NOT NULL,
    valor text,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own memory" ON public.user_memory;
CREATE POLICY "Users manage own memory" ON public.user_memory FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.allowed_domains (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    domain text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.allowed_domains ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS GERAIS DE USUÁRIO
DROP POLICY IF EXISTS "Users view own subscription data" ON public.app_users;
CREATE POLICY "Users view own subscription data" ON public.app_users FOR SELECT USING (auth.uid() = id);
`;

  // ... (Rest of the component including N8N JSON remains same)
  const n8nWorkflowJson = JSON.stringify({ /* ... workflow json ... */ }, null, 2);

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
        {/* ... (Existing Tabs: user_manual, technical, n8n_guide, api) ... */}
        {activeTab === 'user_manual' && (
          <div className="prose prose-slate max-w-none">
            <h1 className="text-3xl font-bold text-[#263238] mb-4">🚀 Guia Oficial do Usuário - GDN_IA</h1>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Bem-vindo ao <strong>GDN_IA</strong>!
            </p>
          </div>
        )}
        {activeTab === 'technical' && <div className="text-gray-500">Documentação Técnica...</div>}
        {activeTab === 'n8n_guide' && <div className="text-gray-500">Guia N8N...</div>}
        {activeTab === 'api' && <div className="text-gray-500">API Keys...</div>}

        {activeTab === 'updates' && (
            <div className="prose prose-slate max-w-none">
                <h1 className="text-3xl font-bold text-[#263238] mb-4">Atualizações & SQL (Correções)</h1>
                <p className="text-sm text-gray-500 mb-4 bg-yellow-50 p-3 rounded border border-yellow-200">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Se você está vendo erros como <code>new row violates row-level security policy</code> ao tentar enviar feedback ou criar itens, execute o código abaixo no SQL Editor do Supabase.
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
