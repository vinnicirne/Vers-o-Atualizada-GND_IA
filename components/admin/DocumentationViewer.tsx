
import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { createApiKey, listApiKeys, revokeApiKey, generateWordPressPluginZip } from '../../services/developerService';
import { ApiKey } from '../../types';
import { Toast } from './Toast';

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

  const getTabClass = (tabName: string) => `px-4 py-2 rounded-md text-sm font-bold transition whitespace-nowrap ${activeTab === tabName ? 'bg-green-600 text-black' : 'text-gray-400 hover:text-white'}`;

  const sqlFixCommand = `
-- 0. Garante extensão para UUID
create extension if not exists "pgcrypto";

-- 1. Cria a tabela de chaves
create table if not exists public.api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_used_at timestamp with time zone,
  status text default 'active' check (status in ('active', 'revoked'))
);

-- 1.1 Correção de Schema (Adiciona coluna se faltar)
ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS key_hash text NOT NULL DEFAULT 'legacy';

-- 2. Habilita RLS
alter table public.api_keys enable row level security;

-- 3. Limpeza de Políticas Antigas
drop policy if exists "Users can manage their own api keys" on public.api_keys;
drop policy if exists "Manage own api keys" on public.api_keys;
drop policy if exists "Public read approved news" on public.news;

-- 4. Recria Políticas
create policy "Users can manage their own api keys" 
on public.api_keys for all 
using (auth.uid() = user_id);

create policy "Public read approved news"
on public.news for select
to anon
using (status = 'approved');
`.trim();

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-green-400">Central de Documentação</h2>
            <div className="flex bg-gray-900 rounded-lg p-1 overflow-x-auto max-w-full">
                <button onClick={() => setActiveTab('user_manual')} className={getTabClass('user_manual')}>Manual do Usuário</button>
                <button onClick={() => setActiveTab('technical')} className={getTabClass('technical')}>Doc. Técnica</button>
                <button onClick={() => setActiveTab('api')} className={getTabClass('api')}>API / Devs</button>
                <button onClick={() => setActiveTab('updates')} className={getTabClass('updates')}>
                    Atualizações <span className="ml-1 text-xs bg-green-900 text-green-300 px-1.5 py-0.5 rounded-full">1.5.1</span>
                </button>
            </div>
        </div>

        <div className="prose prose-invert max-w-none prose-headings:text-green-400 prose-a:text-blue-400">
            
            {/* --- MANUAL DO USUÁRIO --- */}
            {activeTab === 'user_manual' && (
                <div className="space-y-8 animate-fade-in text-gray-300">
                    <div className="bg-gray-900/50 p-6 rounded-xl border border-green-900/20">
                        <h3 className="text-xl font-bold text-white mb-4"><i className="fas fa-flag-checkered mr-2 text-green-500"></i>1. Primeiros Passos</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-bold text-white mb-2">Modo Visitante</h4>
                                <p className="text-sm">Você recebe <strong>3 créditos gratuitos</strong> para testar ferramentas básicas. Ferramentas avançadas (Imagens, Sites) requerem login.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-white mb-2">Acesso (Login)</h4>
                                <p className="text-sm">Ao criar conta, seus créditos são migrados para o banco de dados e seu histórico passa a ser salvo na nuvem.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white"><i className="fas fa-magic mr-2 text-purple-500"></i>2. Ferramentas Criativas</h3>
                        
                        <div className="p-4 bg-black/40 rounded border border-gray-800">
                            <h4 className="font-bold text-green-400">📰 GDN Notícias (SEO)</h4>
                            <p className="text-sm">Gera artigos jornalísticos otimizados. O sistema cria automaticamente Título, Slug, Meta Descrição e analisa a palavra-chave foco.</p>
                        </div>
                        
                        <div className="p-4 bg-black/40 rounded border border-gray-800">
                            <h4 className="font-bold text-orange-400">🏢 Site Institucional</h4>
                            <p className="text-sm">Cria landing pages corporativas completas (Home, Sobre, Serviços) em HTML/Tailwind. Basta informar o nome e ramo da empresa.</p>
                        </div>

                        <div className="p-4 bg-black/40 rounded border border-gray-800">
                            <h4 className="font-bold text-pink-400">🎨 Studio de Arte IA</h4>
                            <p className="text-sm">Cria imagens exclusivas. Escolha o estilo (Fotorealista, Cyberpunk) e o formato (Stories, Feed). Inclui editor de brilho/contraste.</p>
                        </div>
                    </div>

                    <div className="bg-yellow-900/10 border border-yellow-600/30 p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-yellow-500 mb-2"><i className="fas fa-handshake mr-2"></i>3. Programa de Afiliados</h3>
                        <p className="text-sm mb-2">Ganhe <strong>20% de comissão recorrente</strong> indicando amigos.</p>
                        <ol className="list-decimal pl-5 text-sm text-gray-400 space-y-1">
                            <li>Clique no ícone de aperto de mão no topo.</li>
                            <li>Copie seu link exclusivo.</li>
                            <li>Acompanhe ganhos no painel.</li>
                        </ol>
                    </div>

                    <div>
                        <h3 className="text-xl font-bold text-white mb-4"><i className="fas fa-coins mr-2 text-yellow-400"></i>4. Planos e Créditos</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border border-gray-800">
                                <thead className="bg-gray-900 text-gray-400 uppercase font-bold">
                                    <tr><th className="p-3">Ferramenta</th><th className="p-3">Custo (Créditos)</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    <tr><td className="p-3">Notícias, Copy, Prompts</td><td className="p-3">1</td></tr>
                                    <tr><td className="p-3">Texto para Voz (Áudio)</td><td className="p-3">2</td></tr>
                                    <tr><td className="p-3">Social Media</td><td className="p-3">3</td></tr>
                                    <tr><td className="p-3">Imagens IA</td><td className="p-3">5</td></tr>
                                    <tr><td className="p-3">Landing Pages / Sites</td><td className="p-3">15 - 25</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- DOCUMENTAÇÃO TÉCNICA --- */}
            {activeTab === 'technical' && (
                <div className="space-y-8 animate-fade-in text-gray-300">
                    <section>
                        <h3 className="text-xl font-bold text-white mb-4"><i className="fas fa-server mr-2 text-blue-500"></i>1. Visão Geral da Arquitetura</h3>
                        <p className="text-sm mb-4">
                            O sistema utiliza uma arquitetura <strong>Client-Side / Serverless</strong> moderna. Não existe um backend Node.js tradicional intermediário; o Frontend se comunica diretamente com o BaaS e as APIs de IA.
                        </p>
                        <ul className="list-disc pl-5 text-sm space-y-2">
                            <li><strong>Frontend:</strong> React 18, Vite, TypeScript.</li>
                            <li><strong>BaaS (Backend):</strong> Supabase (Auth, PostgreSQL, Realtime).</li>
                            <li><strong>IA Engine:</strong> Google Gemini Pro (Texto/Código) e Pollinations (Imagens).</li>
                        </ul>
                    </section>

                    <section className="bg-gray-900/30 p-6 rounded-lg border border-gray-800">
                        <h3 className="text-xl font-bold text-white mb-4"><i className="fas fa-database mr-2 text-green-500"></i>2. Estrutura de Dados (Schema)</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <code className="text-green-400 font-bold">app_users</code>
                                <p className="text-xs text-gray-400">Perfil público, plano atual, código de afiliado.</p>
                            </div>
                            <div>
                                <code className="text-green-400 font-bold">user_credits</code>
                                <p className="text-xs text-gray-400">Saldo de créditos. Valor <code>-1</code> indica Admin (ilimitado).</p>
                            </div>
                            <div>
                                <code className="text-green-400 font-bold">news</code>
                                <p className="text-xs text-gray-400">Histórico de gerações (Notícias, Sites, Imagens). Campo <code>tipo</code> define o formato.</p>
                            </div>
                            <div>
                                <code className="text-green-400 font-bold">api_keys</code>
                                <p className="text-xs text-gray-400">Chaves para acesso externo (Plugin WP).</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-white mb-4"><i className="fas fa-shield-alt mr-2 text-red-500"></i>3. Segurança</h3>
                        <ul className="list-disc pl-5 text-sm space-y-2">
                            <li><strong>RLS (Row Level Security):</strong> Todas as tabelas são protegidas. Usuários só leem/editam seus próprios dados.</li>
                            <li><strong>Domínios:</strong> O admin pode configurar <code>Allowed Domains</code> para restringir quem pode se cadastrar.</li>
                            <li><strong>WAF Bypass:</strong> O plugin WordPress usa fragmentação de strings para enviar chaves de API sem ser bloqueado por firewalls (ModSecurity).</li>
                        </ul>
                    </section>
                </div>
            )}

            {/* --- API / DEVS (Mantido Original com Melhorias) --- */}
            {activeTab === 'api' && (
                <div className="space-y-8 animate-fade-in">
                    
                    {/* Alerta de Correção de Banco de Dados */}
                    <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-6 mb-6">
                        <h3 className="text-blue-400 font-bold text-lg mb-2"><i className="fas fa-database mr-2"></i>Setup do Banco de Dados</h3>
                        <p className="text-gray-300 text-sm mb-4">
                            Para que a API e o Plugin funcionem, a tabela <code>api_keys</code> deve existir no Supabase.
                        </p>
                        <div className="relative">
                            <pre className="bg-gray-950 p-4 rounded text-xs text-green-300 font-mono overflow-x-auto whitespace-pre-wrap border border-gray-800 max-h-60">
                                {sqlFixCommand}
                            </pre>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(sqlFixCommand);
                                    setToast({ message: "SQL copiado! Cole no Supabase SQL Editor.", type: 'success' });
                                }}
                                className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs transition"
                            >
                                <i className="fas fa-copy mr-1"></i> Copiar SQL
                            </button>
                        </div>
                    </div>

                    {/* WP Plugin Generator */}
                    <div className="bg-gradient-to-r from-blue-900/20 to-black p-6 rounded-xl border border-blue-500/30">
                        <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-blue-400 m-0 mb-2"><i className="fab fa-wordpress mr-2"></i>Plugin WordPress Oficial</h3>
                                <p className="text-sm text-gray-400 m-0">
                                    Baixe o plugin conector pré-configurado v1.5.1.
                                </p>
                            </div>
                        </div>
                        
                        <div className="bg-black/50 p-4 rounded-lg border border-blue-900/50 mb-4">
                            <label className="block text-xs font-bold text-blue-300 uppercase mb-2">
                                <i className="fas fa-key mr-1"></i> Chave Gemini para o Plugin (Obrigatório)
                            </label>
                            <input 
                                type="text"
                                value={geminiKeyInput}
                                onChange={(e) => setGeminiKeyInput(e.target.value)}
                                placeholder="Cole aqui sua chave AIzaSy..."
                                className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-md focus:border-blue-500 focus:outline-none font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Esta chave será injetada no código PHP do plugin.
                            </p>
                        </div>

                        <div className="bg-yellow-900/10 border border-yellow-700/30 p-3 rounded mb-4 text-xs text-yellow-500">
                            <strong><i className="fas fa-exclamation-triangle mr-1"></i> Dica de Upload</strong>
                            <p className="mt-1">
                                O plugin usa fragmentação de chaves para evitar erro 403 em firewalls. Se ainda falhar, suba via FTP.
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <button 
                                onClick={handleDownloadPlugin}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-lg shadow-lg shadow-blue-600/20 transition flex items-center gap-2 whitespace-nowrap"
                            >
                                <i className="fas fa-download"></i> Gerar e Baixar Plugin
                            </button>
                        </div>
                    </div>

                    {/* Key Manager */}
                    <div className="bg-gray-950/50 p-6 rounded-xl border border-green-900/30">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-yellow-500/20 p-3 rounded-full">
                                <i className="fas fa-key text-yellow-500 text-xl"></i>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white m-0">Minhas Chaves de API</h3>
                                <p className="text-sm text-gray-400 m-0">Gerencie chaves para integrações externas.</p>
                            </div>
                        </div>
                        
                        {createdKey && (
                            <div className="mb-6 p-4 bg-green-900/20 border border-green-500 rounded-lg animate-fade-in">
                                <p className="text-green-400 font-bold mb-2 text-sm"><i className="fas fa-check-circle mr-2"></i>Chave criada! Copie agora:</p>
                                <div className="flex items-center gap-2 bg-black p-3 rounded border border-green-900/50">
                                    <code className="text-lg text-white font-mono flex-grow break-all">{createdKey}</code>
                                    <button onClick={() => navigator.clipboard.writeText(createdKey)} className="text-gray-400 hover:text-white px-2 py-1"><i className="fas fa-copy"></i></button>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <input 
                                type="text" 
                                placeholder="Nome da Chave (ex: App Mobile)" 
                                value={newKeyName}
                                onChange={e => setNewKeyName(e.target.value)}
                                className="flex-grow bg-black border border-gray-700 rounded p-2 text-white text-sm focus:border-green-500 focus:outline-none"
                            />
                            <button 
                                onClick={handleCreateKey}
                                className="bg-green-600 hover:bg-green-500 text-black font-bold px-4 py-2 rounded text-sm whitespace-nowrap disabled:opacity-50"
                                disabled={!newKeyName.trim()}
                            >
                                <i className="fas fa-plus mr-2"></i> Gerar Nova Chave
                            </button>
                        </div>

                        <div className="space-y-2">
                            {loadingKeys ? <p className="text-gray-500 text-sm italic">Carregando chaves...</p> : apiKeys.length === 0 ? (
                                <div className="text-center py-8 bg-gray-900/30 rounded border border-gray-800 border-dashed">
                                    <p className="text-gray-500 text-sm">Nenhuma chave ativa.</p>
                                </div>
                            ) : (
                                apiKeys.map(key => (
                                    <div key={key.id} className="flex justify-between items-center bg-gray-900 p-4 rounded border border-gray-800 hover:border-gray-700 transition">
                                        <div>
                                            <p className="font-bold text-gray-200 text-sm m-0">{key.name}</p>
                                            <p className="font-mono text-xs text-gray-500 m-0 mt-1">Prefixo: {key.key_prefix}</p>
                                            <p className="text-[10px] text-gray-600 m-0 mt-1">Criada em: {new Date(key.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleRevokeKey(key.id)} 
                                            className="text-red-500 hover:text-white hover:bg-red-600 transition text-xs font-bold border border-red-900/30 px-3 py-1.5 rounded"
                                        >
                                            Revogar
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- UPDATES --- */}
            {activeTab === 'updates' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="border-l-2 border-green-500 pl-6 relative">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 bg-green-500 rounded-full border-4 border-black"></div>
                        <h3 className="text-xl font-bold text-white">v1.5.1 - Separação de Contexto</h3>
                        <p className="text-sm text-gray-500 mb-4">Lançamento: Atual</p>
                        
                        <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800 space-y-2 text-sm text-gray-300">
                            <p><strong><i className="fas fa-brain mr-2 text-purple-400"></i>IA & Prompting:</strong> O Plugin WP agora usa <code>System Instructions</code> dedicadas. Isso impede que o tema do usuário "confunda" as regras de formatação HTML da IA.</p>
                            <p><strong><i className="fas fa-user-tag mr-2 text-blue-400"></i>Identidade:</strong> O plugin agora exibe qual e-mail GDN está conectado na barra de status.</p>
                            <p><strong><i className="fas fa-database mr-2 text-green-400"></i>Metadados:</strong> Posts gerados agora possuem a meta tag oculta <code>_gdn_generated</code> para rastreabilidade.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
