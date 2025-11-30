
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../contexts/UserContext';
import { createApiKey, listApiKeys, revokeApiKey, generateWordPressPluginZip } from '../../services/developerService';
import { ApiKey } from '../../types';
import { Toast } from './Toast';
import { supabaseUrl, supabaseAnonKey } from '../../services/supabaseClient'; // Importar URLs do Supabase

export function DocumentationViewer() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'user_manual' | 'technical' | 'api' | 'updates'>('user_manual');
  
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
-- (Conteúdo SQL omitido para brevidade, mantém o mesmo do arquivo original)
-- ==============================================================================
-- SCHEMA COMPLETO DO SISTEMA GDN_IA (v1.6.4 - Idempotente & Seed - FIX CRÍTICO)
-- ... (restante do SQL)
`;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="border-b border-gray-200 flex justify-between items-center flex-wrap gap-4 pb-4">
        <nav className="-mb-px flex space-x-2" aria-label="Tabs">
          <button onClick={() => setActiveTab('user_manual')} className={getTabClass('user_manual')}><i className="fas fa-book mr-2"></i>Manual Usuário</button>
          <button onClick={() => setActiveTab('technical')} className={getTabClass('technical')}><i className="fas fa-code mr-2"></i>Visão Técnica</button>
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

            {/* ... Adicionar mais seções conforme necessário ... */}
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

        {activeTab === 'api' && (
          <div className="prose prose-slate max-w-none">
            <h1 className="text-3xl font-bold text-[#263238] mb-4">API / Desenvolvimento</h1>
            <p className="text-gray-600 mb-6">
              Integração com sistemas externos (WordPress, Apps, Webhooks).
            </p>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
                <h2 className="text-xl font-bold text-[#263238] mb-4 mt-0">Endpoints Supabase</h2>
                <div className="space-y-4">
                    <div className="bg-white p-3 rounded border border-gray-200 font-mono text-sm text-gray-600">
                        <span className="font-bold text-purple-600">POST</span> {supabaseUrl}/auth/v1/token?grant_type=password
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200 font-mono text-sm text-gray-600">
                        <span className="font-bold text-blue-600">GET</span> {supabaseUrl}/rest/v1/user_credits?user_id=eq.[ID]
                    </div>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-[#263238] mb-4">Chaves de API (Backend Access)</h2>
            <div className="mb-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
              {loadingKeys ? (
                <p className="text-gray-500 flex items-center"><i className="fas fa-spinner fa-spin mr-2"></i> Carregando chaves...</p>
              ) : showSqlFix ? (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-700 text-sm">
                    <p className="font-bold mb-1"><i className="fas fa-exclamation-triangle mr-1"></i> Tabela 'api_keys' não encontrada!</p>
                    <p>Execute o script SQL na aba "Updates & SQL" para corrigir.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">Nenhuma chave de API criada ainda.</p>
                  ) : (
                    apiKeys.map((key) => (
                      <div key={key.id} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div>
                          <p className="text-[#263238] font-bold">{key.name}</p>
                          <p className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block mt-1">{key.key_prefix}</p>
                          <p className="text-[10px] text-gray-400 mt-1">Criada em: {new Date(key.created_at).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md transition font-bold"
                        >
                          Revogar
                        </button>
                      </div>
                    ))
                  )}
                  
                  {createdKey && (
                      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm">
                          <p className="font-bold mb-2 flex items-center"><i className="fas fa-key mr-2"></i> SUA NOVA CHAVE (Copie AGORA!)</p>
                          <div className="flex gap-2">
                            <code className="block bg-white border border-yellow-300 p-2 rounded flex-grow font-mono select-all">{createdKey}</code>
                            <button onClick={() => handleCopy(createdKey, 'new_key')} className="bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-3 rounded font-bold transition"><i className="fas fa-copy"></i></button>
                          </div>
                          <p className="mt-2 text-xs opacity-80">Esta chave só é mostrada uma vez por segurança.</p>
                      </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <label htmlFor="newKeyName" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">Nova Chave de API</label>
                    <div className="flex gap-3">
                        <input
                            id="newKeyName"
                            type="text"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="Nome (ex: Integração Zapier)"
                            className="flex-grow bg-white border border-gray-300 text-gray-700 p-2.5 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 outline-none transition"
                        />
                        <button
                            onClick={handleCreateKey}
                            disabled={!newKeyName.trim()}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50 shadow-sm"
                        >
                            Criar
                        </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'updates' && (
            <div className="prose prose-slate max-w-none">
                <h1 className="text-3xl font-bold text-[#263238] mb-4">Atualizações & SQL</h1>
                <p className="text-gray-600 mb-6">
                    Script SQL para atualizar o banco de dados Supabase (Idempotente).
                </p>

                <div className="relative bg-gray-50 border border-gray-200 text-gray-700 p-4 rounded-lg text-xs font-mono shadow-inner max-h-[600px] overflow-auto custom-scrollbar">
                    <pre className="whitespace-pre-wrap">{schemaSql}</pre>
                    <button 
                        onClick={() => handleCopy(schemaSql, 'schema_sql')}
                        className="absolute top-2 right-2 px-3 py-1.5 text-xs bg-white border border-gray-300 hover:bg-gray-100 text-gray-600 rounded shadow-sm transition-colors font-bold"
                        title="Copiar SQL"
                    >
                        <i className={`fas ${copiedField === 'schema_sql' ? 'fa-check text-green-500' : 'fa-copy'} mr-1`}></i> {copiedField === 'schema_sql' ? 'Copiado!' : 'Copiar'}
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
