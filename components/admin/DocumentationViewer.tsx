
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
-- === CORREÇÃO DE PERMISSÕES CRÍTICA (RLS) ===

-- 1. TABELA DE FEEDBACKS (Garante permissão de escrita)
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

-- Garante permissões de nível de banco para o papel 'authenticated'
GRANT ALL ON public.system_feedbacks TO authenticated;
GRANT ALL ON public.system_feedbacks TO service_role;

-- POLÍTICAS DE FEEDBACK (Remove antigas para evitar conflitos)
DROP POLICY IF EXISTS "Anyone can read approved feedbacks" ON public.system_feedbacks;
DROP POLICY IF EXISTS "Users can create feedbacks" ON public.system_feedbacks;
DROP POLICY IF EXISTS "Users can see own feedbacks" ON public.system_feedbacks;
DROP POLICY IF EXISTS "Admins manage all feedbacks" ON public.system_feedbacks;

-- Cria políticas corretas
-- Público: Pode ler aprovados
CREATE POLICY "Anyone can read approved feedbacks" ON public.system_feedbacks FOR SELECT USING (status = 'approved');

-- Autenticado: Pode criar
CREATE POLICY "Users can create feedbacks" ON public.system_feedbacks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Autenticado: Pode ver seus próprios feedbacks (mesmo pendentes)
CREATE POLICY "Users can see own feedbacks" ON public.system_feedbacks FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Admin: Gerencia tudo
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
GRANT ALL ON public.system_popups TO authenticated;
GRANT ALL ON public.system_popups TO service_role;

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
GRANT ALL ON public.affiliate_logs TO authenticated;
GRANT ALL ON public.affiliate_logs TO service_role;

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
GRANT ALL ON public.user_memory TO authenticated;
GRANT ALL ON public.user_memory TO service_role;

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
  const n8nWorkflowJson = JSON.stringify({
    "name": "GDN - Fluxo Seguro Multi-Usuário (Gemini)",
    "nodes": [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "gdn/user/:userId",
          "options": {}
        },
        "id": "webhook-node",
        "name": "Webhook Seguro",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [460, 340],
        "credentials": {
          "httpHeaderAuth": {
            "id": "GDN_AUTH_CREDENTIAL",
            "name": "GDN Header Auth"
          }
        }
      },
      {
        "parameters": {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.body.prompt }}",
                "operation": "isNotEmpty"
              },
              {
                "value1": "={{ $json.params.userId }}",
                "operation": "isNotEmpty"
              }
            ]
          }
        },
        "id": "validate-input",
        "name": "Validar Entrada",
        "type": "n8n-nodes-base.if",
        "typeVersion": 1,
        "position": [680, 340]
      },
      {
        "parameters": {
          "method": "POST",
          "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
          "authentication": "none",
          "sendQuery": true,
          "queryParameters": {
            "parameters": [
              {
                "name": "key",
                "value": "={{ $env.GEMINI_API_KEY }}"
              }
            ]
          },
          "sendBody": true,
          "contentType": "json",
          "bodyParameters": {
            "parameters": [
              {
                "name": "contents",
                "value": "={{ [{'parts': [{'text': $json.body.prompt }]}] }}"
              }
            ]
          },
          "options": {
            "response": {
              "response": {
                "neverError": true
              }
            }
          }
        },
        "id": "gemini-api",
        "name": "Gemini AI",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 3,
        "position": [920, 240]
      },
      {
        "parameters": {
          "respondWith": "json",
          "responseBody": "={\n  \"status\": \"success\",\n  \"userId\": \"{{ $('Webhook Seguro').item.json.params.userId }}\",\n  \"data\": {\n    \"text\": \"{{ $json.candidates[0].content.parts[0].text.replace(/\"/g, '\\\\\"') }}\"\n  }\n}",
          "options": {}
        },
        "id": "success-response",
        "name": "Resposta Sucesso",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [1180, 240]
      },
      {
        "parameters": {
          "respondWith": "json",
          "responseBody": "={\n  \"status\": \"error\",\n  \"message\": \"Dados inválidos. Prompt ou UserId ausente.\",\n  \"code\": 400\n}",
          "options": {
            "responseCode": 400
          }
        },
        "id": "error-validation",
        "name": "Erro Validação (400)",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [920, 460]
      },
      {
        "parameters": {
          "conditions": {
            "boolean": [
              {
                "value1": "={{ $json.error === undefined }}",
                "value2": true
              }
            ]
          }
        },
        "id": "check-gemini-success",
        "name": "Verificar Sucesso API",
        "type": "n8n-nodes-base.if",
        "typeVersion": 1,
        "position": [1050, 240]
      },
      {
        "parameters": {
          "respondWith": "json",
          "responseBody": "={\n  \"status\": \"error\",\n  \"message\": \"Erro ao processar com Gemini AI\",\n  \"details\": \"{{ $json.error.message || 'Unknown error' }}\",\n  \"code\": 500\n}",
          "options": {
            "responseCode": 500
          }
        },
        "id": "error-gemini",
        "name": "Erro API (500)",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [1180, 400]
      }
    ],
    "connections": {
      "Webhook Seguro": {
        "main": [
          [
            {
              "node": "Validar Entrada",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Validar Entrada": {
        "main": [
          [
            {
              "node": "Gemini AI",
              "type": "main",
              "index": 0
            }
          ],
          [
            {
              "node": "Erro Validação (400)",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Gemini AI": {
        "main": [
          [
            {
              "node": "Verificar Sucesso API",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Verificar Sucesso API": {
        "main": [
          [
            {
              "node": "Resposta Sucesso",
              "type": "main",
              "index": 0
            }
          ],
          [
            {
              "node": "Erro API (500)",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    }
  }, null, 2);

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
        
        {activeTab === 'user_manual' && (
          <div className="prose prose-slate max-w-none">
            <h1 className="text-3xl font-bold text-[#263238] mb-4">🚀 Guia Oficial do Usuário - GDN_IA</h1>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Bem-vindo ao <strong>GDN_IA</strong>!
            </p>
            {/* ... Content populated from MANUAL_DO_USUARIO.md usually ... */}
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
                        Aprenda a configurar um fluxo N8N <strong>isolado e seguro</strong> onde cada usuário tem seu próprio contexto, sem riscos de vazamento de dados.
                    </p>
                    
                    <h3 className="font-bold text-gray-700 mt-6 mb-2">1. Importar Workflow Seguro</h3>
                    <p className="text-sm text-gray-500 mb-4">Copie o JSON abaixo e cole no seu editor N8N (Ctrl+V).</p>
                    
                    <div className="relative group">
                        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-auto max-h-60 custom-scrollbar font-mono border border-gray-700">
                            {n8nWorkflowJson}
                        </pre>
                        <button 
                            onClick={() => handleCopy(n8nWorkflowJson, 'n8n_json')}
                            className="absolute top-2 right-2 bg-white text-gray-700 px-3 py-1 text-xs font-bold rounded shadow hover:bg-gray-100 border border-gray-300"
                        >
                            {copiedField === 'n8n_json' ? 'Copiado!' : 'Copiar JSON'}
                        </button>
                    </div>

                    <h3 className="font-bold text-gray-700 mt-6 mb-2">2. Configuração de Segurança (Obrigatório)</h3>
                    <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
                        <li><strong>Credencial:</strong> No N8N, crie uma credencial "Header Auth" com o nome <code>x-gdn-token</code>. Defina uma senha forte.</li>
                        <li><strong>Variável de Ambiente:</strong> No Docker/Servidor do N8N, defina <code>GEMINI_API_KEY</code>. O fluxo usa <code>$env.GEMINI_API_KEY</code> para não expor sua chave.</li>
                        <li><strong>URL do Webhook:</strong> A URL final será algo como: <code>https://seu-n8n.com/webhook/gdn/user/:userId</code>. O sistema GDN preenche o <code>:userId</code> automaticamente.</li>
                    </ul>
                </div>
            </div>
        )}

        {activeTab === 'api' && (
            <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h2 className="text-xl font-bold text-[#263238] mb-4">Gerenciamento de API Keys</h2>
                    <p className="text-sm text-gray-500 mb-6">Crie chaves para usar nossa API em seus scripts ou no plugin WordPress.</p>
                    
                    {showSqlFix && (
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded mb-6 text-sm">
                            <strong className="block mb-1"><i className="fas fa-database mr-2"></i>Tabela não encontrada</strong>
                            Para usar a API, execute o SQL na aba "Updates & SQL" para criar a tabela <code>api_keys</code>.
                        </div>
                    )}

                    <div className="flex gap-4 mb-8">
                        <input 
                            type="text" 
                            placeholder="Nome da chave (ex: Wordpress Site A)" 
                            value={newKeyName}
                            onChange={e => setNewKeyName(e.target.value)}
                            className="flex-grow bg-white border border-gray-300 rounded p-2 text-sm"
                        />
                        <button 
                            onClick={handleCreateKey}
                            disabled={!newKeyName.trim() || loadingKeys}
                            className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition disabled:opacity-50"
                        >
                            Criar Chave
                        </button>
                    </div>

                    {createdKey && (
                        <div className="bg-green-50 border border-green-200 p-4 rounded mb-8 animate-fade-in">
                            <p className="text-green-800 font-bold mb-2">Chave Criada com Sucesso!</p>
                            <p className="text-xs text-green-600 mb-2">Copie agora. Você não poderá vê-la novamente.</p>
                            <div className="flex items-center gap-2">
                                <code className="bg-white border border-green-300 p-2 rounded text-sm font-mono flex-grow select-all">{createdKey}</code>
                                <button onClick={() => handleCopy(createdKey, 'new_key')} className="text-green-700 hover:text-green-900"><i className="fas fa-copy"></i></button>
                            </div>
                        </div>
                    )}

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
                        {apiKeys.length === 0 && !loadingKeys && <p className="text-center text-gray-400 py-4">Nenhuma chave ativa.</p>}
                    </div>
                </div>

                <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                    <h2 className="text-xl font-bold text-purple-900 mb-4"><i className="fab fa-wordpress mr-2"></i>Configurar Plugin WordPress</h2>
                    <p className="text-sm text-purple-800 mb-4">
                        Para o plugin funcionar, ele precisa da sua <strong>Chave Gemini</strong> pessoal para gerar o conteúdo.
                        <br/>A chave será embutida no código do plugin antes do download.
                    </p>
                    
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-purple-700 mb-1 uppercase">Sua Google Gemini API Key</label>
                        <input 
                            type="password" 
                            placeholder="AIzaSy..." 
                            value={geminiKeyInput}
                            onChange={e => setGeminiKeyInput(e.target.value)}
                            className="w-full bg-white border border-purple-300 rounded p-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                        />
                        <p className="text-xs text-purple-600 mt-1">Essa chave não é salva no nosso banco, apenas no seu navegador para gerar o zip.</p>
                    </div>

                    <button 
                        onClick={handleDownloadPlugin}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded shadow-md transition flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-download"></i> Baixar Plugin Configurado
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'updates' && (
            <div className="prose prose-slate max-w-none">
                <h1 className="text-3xl font-bold text-[#263238] mb-4">Atualizações & SQL (Correções)</h1>
                <p className="text-sm text-gray-500 mb-4 bg-yellow-50 p-3 rounded border border-yellow-200">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Se você está vendo erros como <code>new row violates row-level security policy</code> ao tentar enviar feedback, criar itens ou usar o mobile, <strong>execute este código no SQL Editor do Supabase</strong>.
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
