
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
-- === 🚨 CORREÇÃO URGENTE: PERMISSÃO NOTIFICAÇÕES (RLS) ===
-- Execute este bloco se estiver recebendo erro ao enviar Push Notifications.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas e restritivas
DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

-- 1. Leitura: Usuário vê as suas, Admin vê todas
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 2. Inserção: Apenas Admins podem criar notificações (para qualquer um)
CREATE POLICY "Admins can insert notifications" ON public.notifications
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 3. Atualização: Usuário marca como lida (suas), Admin edita qualquer uma
CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);


-- === ATUALIZAÇÃO CADASTRO (NOME E TELEFONE) ===

-- 1. ADICIONAR COLUNA TELEFONE
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS phone text;

-- 2. ATUALIZAR TRIGGER DE NOVO USUÁRIO
-- Esta função pega os metadados (nome/telefone) enviados pelo formulário de cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.app_users (id, email, full_name, phone, role, credits, status, plan)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name', -- Pega o nome do metadata
    new.raw_user_meta_data->>'phone',     -- Pega o telefone do metadata
    'user',
    3, -- Créditos iniciais (Free)
    'active',
    'free'
  );
  
  -- Inicializa tabela de créditos
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (new.id, 3);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- === ATUALIZAÇÕES ANTERIORES (Para integridade) ===

-- NOTIFICAÇÕES E REALTIME
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.app_users(id) NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info',
    is_read boolean DEFAULT false,
    action_link text,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.notifications;

-- TABELA DE FEEDBACKS
CREATE TABLE IF NOT EXISTS public.system_feedbacks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.app_users(id),
    content text NOT NULL,
    rating int DEFAULT 5,
    status text DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.system_feedbacks ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.system_feedbacks TO authenticated;
GRANT ALL ON public.system_feedbacks TO service_role;
GRANT SELECT ON public.system_feedbacks TO anon;

DROP POLICY IF EXISTS "Anyone can read approved feedbacks" ON public.system_feedbacks;
CREATE POLICY "Anyone can read approved feedbacks" ON public.system_feedbacks FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Users can create feedbacks" ON public.system_feedbacks;
CREATE POLICY "Users can create feedbacks" ON public.system_feedbacks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage all feedbacks" ON public.system_feedbacks;
CREATE POLICY "Admins manage all feedbacks" ON public.system_feedbacks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- CAMPOS EXTRAS
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS affiliate_code text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.app_users(id);
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS affiliate_balance numeric DEFAULT 0;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS asaas_customer_id text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS subscription_id text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS mercadopago_customer_id text;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS metadata jsonb;
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

        {activeTab === 'updates' && (
            <div className="prose prose-slate max-w-none">
                <h1 className="text-3xl font-bold text-[#263238] mb-4">Atualizações & SQL</h1>
                <p className="text-sm text-gray-500 mb-4 bg-yellow-50 p-3 rounded border border-yellow-200">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Para corrigir o erro de envio de Notificações, copie o SQL abaixo e execute no editor SQL do Supabase.
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
