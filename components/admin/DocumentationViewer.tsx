
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../contexts/UserContext';
import { createApiKey, listApiKeys, revokeApiKey, generateWordPressPluginZip } from '../../services/developerService';
import { ApiKey } from '../../types';
import { Toast } from './Toast';
import { supabaseUrl, supabaseAnonKey } from '../../services/supabaseClient'; // Importar URLs do Supabase

export function DocumentationViewer() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'user_manual' | 'technical' | 'api' | 'updates' | 'n8n_guide'>('user_manual');
  
  // API Logic State
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showSqlFix, setShowSqlFix] = useState(false);
  
  // New State for Manual Gemini Key
  const [geminiKeyInput, setGeminiKeyInput] = useState('');

  // Add state for copied field to handle clipboard feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Carrega a chave do cache local ao montar
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
      
      // Salva a chave no navegador para o futuro
      localStorage.setItem('gdn_gemini_key_cache', geminiKeyInput);
      
      generateWordPressPluginZip(geminiKeyInput);
      setToast({ message: "Download iniciado! Chave salva no navegador.", type: 'success' });
  };

  // Add handleCopy function for clipboard functionality
  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getTabClass = (tabName: string) => `px-4 py-2 rounded-md text-sm font-bold transition whitespace-nowrap ${activeTab === tabName ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`;

  const schemaSql = `
-- 1. TABELA DE POPUPS (Sistema de Avisos)
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

-- 2. CAMPOS PARA SISTEMA DE AFILIADOS E PAGAMENTOS (Tabela app_users)
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS affiliate_code text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.app_users(id);
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS affiliate_balance numeric DEFAULT 0;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS asaas_customer_id text;

-- 3. TABELA DE LOGS DE AFILIADOS
CREATE TABLE IF NOT EXISTS public.affiliate_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    affiliate_id uuid REFERENCES public.app_users(id),
    source_user_id uuid REFERENCES public.app_users(id),
    amount numeric NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. TABELA DE MEMÓRIA DO USUÁRIO (Usada para N8N config e Feedback)
CREATE TABLE IF NOT EXISTS public.user_memory (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id uuid REFERENCES public.app_users(id),
    chave text NOT NULL,
    valor text,
    created_at timestamp with time zone DEFAULT now()
);

-- 5. TABELA DE DOMÍNIOS PERMITIDOS (Segurança)
CREATE TABLE IF NOT EXISTS public.allowed_domains (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    domain text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now()
);

-- 6. HABILITAR RLS (SEGURANÇA)
ALTER TABLE public.system_popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_domains ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS RLS (POPUPS)
DROP POLICY IF EXISTS "Public view popups" ON public.system_popups;
CREATE POLICY "Public view popups" ON public.system_popups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage popups" ON public.system_popups;
CREATE POLICY "Admins manage popups" ON public.system_popups FOR ALL USING (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 8. POLÍTICAS RLS (MEMÓRIA / N8N)
DROP POLICY IF EXISTS "Users manage own memory" ON public.user_memory;
CREATE POLICY "Users manage own memory" ON public.user_memory FOR ALL USING (auth.uid() = user_id);

-- 9. POLÍTICAS RLS (AFILIADOS)
DROP POLICY IF EXISTS "Users view own affiliate logs" ON public.affiliate_logs;
CREATE POLICY "Users view own affiliate logs" ON public.affiliate_logs FOR SELECT USING (auth.uid() = affiliate_id);
`;

  // Workflow Seguro com Path Parameters e Validação (N8N)
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
            {/* Conteúdo do MANUAL_DO_USUARIO.md adaptado para React */}
            <h1 className="text-3xl font-bold text-[#263238] mb-4">🚀 Guia Oficial do Usuário - GDN_IA</h1>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Bem-vindo ao <strong>GDN_IA</strong>! Este é o seu manual completo para dominar nossa suíte de criação inteligente. Aqui você aprenderá a gerar notícias, criar artes, desenvolver landing pages e muito mais, utilizando o poder da Inteligência Artificial.
            </p>

            <h2 className="text-2xl font-bold text-green-700 mt-8 mb-4 pb-2 border-b border-gray-100">🏁 1. Primeiros Passos</h2>
            <h3 className="text-xl font-bold text-[#263238] mt-4 mb-2">Testar Grátis (Modo Visitante)</h3>
            <p className="text-gray-600 mb-2">
              Se você ainda não tem conta, pode experimentar o sistema imediatamente!
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-600 space-y-1">
              <li><strong>Acesso:</strong> Basta entrar no site.</li>
              <li><strong>Créditos:</strong> Você recebe <strong>3 créditos gratuitos</strong> para testar ferramentas básicas.</li>
              <li><strong>Limitações:</strong> Ferramentas avançadas aparecerão com um cadeado 🔒.</li>
            </ul>

            <h2 className="text-2xl font-bold text-green-700 mt-8 mb-4 pb-2 border-b border-gray-100">🛠️ 2. Ferramentas Criativas</h2>
            <h3 className="text-xl font-bold text-[#263238] mt-4 mb-2">📰 GDN Notícias</h3>
            <p className="text-gray-600">Gera artigos jornalísticos completos e já otimizados para o Google.</p>
            
            <h3 className="text-xl font-bold text-[#263238] mt-6 mb-2">🏢 Site Institucional</h3>
            <p className="text-gray-600">Cria sites corporativos completos (Home, Sobre, Serviços, Contato) em uma única página.</p>
          </div>
        )}

        {activeTab === 'technical' && (
          <div className="prose prose-slate max-w-none">
            <h1 className="text-3xl font-bold text-[#263238] mb-4">🏗️ Documentação Técnica</h1>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                <h3 className="text-blue-800 font-bold m-0 flex items-center"><i className="fas fa-info-circle mr-2"></i>Stack Tecnológica</h3>
                <ul className="list-disc pl-5 mt-2 text-blue-700 text-sm space-y-1">
                    <li><strong>Frontend:</strong> React 18, Vite, TypeScript, Tailwind CSS.</li>
                    <li><strong>Backend:</strong> Supabase (PostgreSQL, Auth, Realtime).</li>
                    <li><strong>IA:</strong> Google Gemini API & Pollinations.ai.</li>
                </ul>
            </div>

            <h2 className="text-2xl font-bold text-green-700 mt-8 mb-4">Arquitetura de Funcionalidades</h2>
            <h3 className="text-xl font-bold text-[#263238] mt-4 mb-2">Modo Visitante (Guest Mode)</h3>
            <p className="text-gray-600 mb-4">
                Implementado no frontend via <code>localStorage</code>. Permite degustação sem login com limite de créditos locais.
            </p>

            <h3 className="text-xl font-bold text-[#263238] mt-4 mb-2">Motor de SEO</h3>
            <p className="text-gray-600 mb-4">
                O arquivo <code>services/seoService.ts</code> contém a lógica de "Golden Keyword" e análise de densidade lexical para pontuação em tempo real.
            </p>
          </div>
        )}

        {activeTab === 'n8n_guide' && (
            <div className="prose prose-slate max-w-none">
                <h1 className="text-3xl font-bold text-[#263238] mb-4 flex items-center">
                    <span className="bg-[#FF6D5A] text-white w-10 h-10 rounded-lg flex items-center justify-center mr-3 text-2xl">n8n</span>
                    Guia de Segurança N8N (Multi-Tenant)
                </h1>
                
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
                    <h4 className="font-bold text-yellow-800 text-sm uppercase">Arquitetura Isolada</h4>
                    <p className="text-sm text-yellow-700">
                        Este workflow usa <strong>Path Parameters</strong> (<code>/user/:userId</code>) para garantir que cada usuário tenha um endpoint exclusivo, sem que um veja os dados do outro.
                    </p>
                </div>

                <h2 className="text-2xl font-bold text-green-700 mt-8 mb-4 border-b border-gray-100 pb-2">Passo a Passo: Configuração Segura</h2>
                
                <ol className="list-decimal pl-6 space-y-4 text-gray-700">
                    <li>
                        <strong>Configuração no N8N:</strong>
                        <p className="text-sm mt-1 text-gray-500">
                            Importe o JSON abaixo. Ele criará um Webhook com o path <code>gdn/user/:userId</code>.
                            <br/>
                            O node "Validar Entrada" checa se o token e o userId estão presentes.
                        </p>
                    </li>
                    <li>
                        <strong>Variável de Ambiente (Gemini API Key):</strong>
                        <p className="text-sm mt-1 text-gray-500">
                            Configure <code>GEMINI_API_KEY</code> nas variáveis de ambiente do seu N8N. O workflow usa <code>{`{{ $env.GEMINI_API_KEY }}`}</code> para segurança.
                        </p>
                    </li>
                    <li>
                        <strong>Segurança (Credential):</strong>
                        <p className="text-sm mt-1 text-gray-500">
                            O workflow espera uma credencial "Header Auth". Crie uma nova credencial no N8N chamada <code>GDN Header Auth</code> com a chave <code>x-gdn-token</code> (valor opcional, mas recomendado para produção).
                        </p>
                    </li>
                    <li>
                        <strong>Configuração no GDN_IA:</strong>
                        <p className="text-sm mt-1 text-gray-500">
                            Insira a URL base no modal de Integrações: <code>https://seu-n8n.com/webhook/gdn</code>.
                            <br/>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Auto-Magic:</span> O sistema adicionará <code>/user/SEU_ID</code> automaticamente ao chamar.
                        </p>
                    </li>
                </ol>

                <div className="mt-6 mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Workflow JSON (Importar no N8N)</label>
                        <button 
                            onClick={() => handleCopy(n8nWorkflowJson, 'n8n_json')}
                            className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded transition flex items-center gap-2"
                        >
                            <i className={`fas ${copiedField === 'n8n_json' ? 'fa-check' : 'fa-copy'}`}></i>
                            {copiedField === 'n8n_json' ? 'Copiado!' : 'Copiar JSON'}
                        </button>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96 border border-gray-700 shadow-inner">
                        <pre className="text-xs text-green-400 font-mono whitespace-pre">{n8nWorkflowJson}</pre>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-green-700 mt-8 mb-4 border-b border-gray-100 pb-2">Troubleshooting</h2>
                
                <div className="space-y-4">
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                        <h4 className="font-bold text-red-700 text-sm mb-1">Erro: "Workflow not found"</h4>
                        <p className="text-xs text-red-600">
                            Certifique-se de que o Webhook está ativo (Switch "Active" no topo direito do N8N) e que você está usando a URL de <strong>Produção</strong>, não de Teste.
                        </p>
                    </div>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                        <h4 className="font-bold text-blue-700 text-sm mb-1">Resposta 400 Bad Request</h4>
                        <p className="text-xs text-blue-600">
                            O node "Validar Entrada" bloqueia chamadas sem <code>prompt</code> ou <code>userId</code>. Verifique se o GDN_IA está logado e se a URL no modal de integrações está correta (sem espaços extras).
                        </p>
                    </div>
                </div>

            </div>
        )}

        {activeTab === 'api' && (
          <div className="prose prose-slate max-w-none">
            <h1 className="text-3xl font-bold text-[#263238] mb-4">API / Desenvolvimento</h1>
            {/* ... restante do código API ... */}
            <div className="mb-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-gray-500">Gerencie suas chaves de API para acesso programático.</p>
              <div className="mt-4">
                  {loadingKeys ? <p>Carregando...</p> : (
                      apiKeys.map(key => (
                          <div key={key.id} className="flex justify-between border-b py-2">
                              <span>{key.name}</span>
                              <button onClick={() => handleRevokeKey(key.id)} className="text-red-500">Revogar</button>
                          </div>
                      ))
                  )}
              </div>
              <div className="mt-4 flex gap-2">
                  <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Nome da chave" className="border p-2 rounded" />
                  <button onClick={handleCreateKey} className="bg-green-600 text-white px-4 py-2 rounded">Criar Chave</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'updates' && (
            <div className="prose prose-slate max-w-none">
                <h1 className="text-3xl font-bold text-[#263238] mb-4">Atualizações & SQL</h1>
                <p className="text-sm text-gray-500 mb-4">Execute este script no SQL Editor do Supabase para atualizar o banco de dados com todas as tabelas necessárias (Popups, Afiliados, N8N, Pagamentos).</p>
                <div className="relative bg-gray-50 border border-gray-200 text-gray-700 p-4 rounded-lg text-xs font-mono shadow-inner max-h-[600px] overflow-auto custom-scrollbar">
                    <pre className="whitespace-pre-wrap">{schemaSql}</pre>
                    <button onClick={() => handleCopy(schemaSql, 'schema_sql')} className="absolute top-2 right-2 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded font-bold">Copiar</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
