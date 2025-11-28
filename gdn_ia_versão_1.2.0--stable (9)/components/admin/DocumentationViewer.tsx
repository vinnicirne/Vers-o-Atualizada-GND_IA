
import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { createApiKey, listApiKeys, revokeApiKey, generateWordPressPluginZip } from '../../services/developerService';
import { ApiKey } from '../../types';
import { Toast } from './Toast';

export function DocumentationViewer() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'admin' | 'user' | 'updates' | 'api'>('admin');
  
  // API Logic State
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showSqlFix, setShowSqlFix] = useState(false);

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
      generateWordPressPluginZip();
      setToast({ message: "Download do plugin iniciado!", type: 'success' });
  };

  const getTabClass = (tabName: string) => `px-4 py-2 rounded-md text-sm font-bold transition whitespace-nowrap ${activeTab === tabName ? 'bg-green-600 text-black' : 'text-gray-400 hover:text-white'}`;

  // Comando SQL para correção
  const sqlFixCommand = `
-- CRIE A TABELA DE CHAVES DE API
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

-- HABILITE A SEGURANÇA
alter table public.api_keys enable row level security;

-- CRIE A POLÍTICA DE ACESSO
create policy "Manage own api keys" on public.api_keys 
for all using (auth.uid() = user_id);
`.trim();

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-green-400">Documentação do Sistema</h2>
            <div className="flex bg-gray-900 rounded-lg p-1 overflow-x-auto max-w-full">
                <button onClick={() => setActiveTab('admin')} className={getTabClass('admin')}>Manual Técnico</button>
                <button onClick={() => setActiveTab('user')} className={getTabClass('user')}>Manual do Usuário</button>
                <button onClick={() => setActiveTab('api')} className={getTabClass('api')}>API / Devs</button>
                <button onClick={() => setActiveTab('updates')} className={getTabClass('updates')}>
                    Atualizações <span className="ml-1 text-xs bg-green-900 text-green-300 px-1.5 py-0.5 rounded-full">Novo</span>
                </button>
            </div>
        </div>

        <div className="prose prose-invert max-w-none prose-headings:text-green-400 prose-a:text-blue-400">
            {activeTab === 'api' && (
                <div className="space-y-8 animate-fade-in">
                    
                    {/* Alerta de Correção de Banco de Dados */}
                    {showSqlFix && (
                        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 mb-6">
                            <h3 className="text-red-400 font-bold text-lg mb-2"><i className="fas fa-database mr-2"></i>Ação Necessária: Banco de Dados</h3>
                            <p className="text-gray-300 text-sm mb-4">
                                A tabela <code>api_keys</code> não foi encontrada no seu banco de dados Supabase. O sistema não consegue gerar chaves sem ela.
                                <br/>Por favor, vá ao <strong>SQL Editor</strong> do seu projeto Supabase e execute o seguinte comando:
                            </p>
                            <div className="relative">
                                <pre className="bg-gray-950 p-4 rounded text-xs text-green-300 font-mono overflow-x-auto whitespace-pre-wrap border border-gray-800">
                                    {sqlFixCommand}
                                </pre>
                                <button 
                                    onClick={() => navigator.clipboard.writeText(sqlFixCommand)}
                                    className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs transition"
                                >
                                    Copiar SQL
                                </button>
                            </div>
                        </div>
                    )}

                    {/* WP Plugin Generator */}
                    <div className="bg-gradient-to-r from-blue-900/20 to-black p-6 rounded-xl border border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h3 className="text-xl font-bold text-blue-400 m-0 mb-2"><i className="fab fa-wordpress mr-2"></i>Plugin WordPress Oficial</h3>
                            <p className="text-sm text-gray-400 m-0">
                                Baixe o plugin conector pré-configurado com suas credenciais. Instale no seu site WordPress para importar notícias geradas pelo GDN_IA automaticamente via Shortcode ou Cron Job.
                            </p>
                        </div>
                        <button 
                            onClick={handleDownloadPlugin}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-lg shadow-lg shadow-blue-600/20 transition flex items-center gap-2 whitespace-nowrap"
                        >
                            <i className="fas fa-download"></i> Baixar Plugin .zip
                        </button>
                    </div>

                    {/* Key Manager */}
                    <div className="bg-gray-950/50 p-6 rounded-xl border border-green-900/30">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-yellow-500/20 p-3 rounded-full">
                                <i className="fas fa-key text-yellow-500 text-xl"></i>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white m-0">Minhas Chaves de API</h3>
                                <p className="text-sm text-gray-400 m-0">Gerencie chaves para integrar o GDN_IA em seus aplicativos ou no Plugin WordPress.</p>
                            </div>
                        </div>
                        
                        {createdKey && (
                            <div className="mb-6 p-4 bg-green-900/20 border border-green-500 rounded-lg animate-fade-in">
                                <p className="text-green-400 font-bold mb-2 text-sm"><i className="fas fa-check-circle mr-2"></i>Chave criada com sucesso! Copie agora, você não a verá novamente.</p>
                                <div className="flex items-center gap-2 bg-black p-3 rounded border border-green-900/50">
                                    <code className="text-lg text-white font-mono flex-grow break-all">{createdKey}</code>
                                    <button onClick={() => navigator.clipboard.writeText(createdKey)} className="text-gray-400 hover:text-white px-2 py-1"><i className="fas fa-copy"></i></button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Use esta chave nas configurações do Plugin WordPress.</p>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <input 
                                type="text" 
                                placeholder="Nome da Chave (ex: Meu Blog WP)" 
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
                                    <p className="text-gray-500 text-sm">Nenhuma chave ativa. Crie uma para começar.</p>
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

                    {/* Docs */}
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">Referência da API REST</h3>
                        <p className="text-gray-400 mb-6">A API GDN_IA permite integrar geração de conteúdo diretamente em seus aplicativos.</p>

                        <div className="space-y-6">
                            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">POST</span>
                                    <code className="text-blue-300 font-mono text-sm">/v1/generate/news</code>
                                </div>
                                <p className="text-sm text-gray-400 mb-4">Gera uma notícia completa com SEO.</p>
                                
                                <div className="bg-black p-4 rounded border border-gray-700 font-mono text-xs overflow-x-auto text-gray-300">
                                    <span className="text-purple-400">curl</span> -X POST https://api.gdn.ia/v1/generate/news \<br/>
                                    &nbsp;&nbsp;-H <span className="text-green-300">"Authorization: Bearer gdn_live_..."</span> \<br/>
                                    &nbsp;&nbsp;-H <span className="text-green-300">"Content-Type: application/json"</span> \<br/>
                                    {/* Correção de escape para JSON dentro de JSX */}
                                    &nbsp;&nbsp;-d <span className="text-yellow-300">{`'{ "prompt": "Eleições 2024", "include_image": true }'`}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'admin' && (
                <div className="space-y-8 text-gray-300 animate-fade-in">
                    <section>
                        <h3 className="text-xl font-bold text-white mb-2">Visão Geral do Admin</h3>
                        <p>O <strong>GDN_IA</strong> é uma plataforma SaaS focada em Inteligência Artificial Generativa. O sistema permite criar notícias, imagens, landing pages e áudios utilizando um sistema de créditos e planos.</p>
                        <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
                           <li><strong>Frontend:</strong> React 18, Vite, TypeScript, Tailwind CSS.</li>
                           <li><strong>Backend:</strong> Supabase (PostgreSQL, Auth, Realtime).</li>
                           <li><strong>IA:</strong> Google Gemini (Texto/Áudio) e Pollinations.ai (Imagens).</li>
                        </ul>
                    </section>
                </div>
            )}

            {activeTab === 'user' && (
                <div className="bg-gray-900 p-6 rounded text-center animate-fade-in">
                    <i className="fas fa-info-circle text-4xl text-blue-400 mb-4"></i>
                    <p className="text-lg">O Manual do Usuário está disponível publicamente para todos os usuários através do botão de ajuda (?) no Dashboard principal.</p>
                    <p className="text-sm text-gray-500 mt-2">Consulte o arquivo <code>MANUAL_DO_USUARIO.md</code> na raiz do projeto para o conteúdo completo.</p>
                </div>
            )}

            {activeTab === 'updates' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Versão Atual */}
                    <div className="border-l-2 border-green-500 pl-6 relative">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 bg-green-500 rounded-full border-4 border-black"></div>
                        <h3 className="text-xl font-bold text-white">v1.1.0 - Plugin WordPress & API Keys</h3>
                        <p className="text-sm text-gray-500 mb-4">Lançamento: Hoje</p>
                        
                        <div className="space-y-4">
                            <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800">
                                <h4 className="font-bold text-green-400 mb-2"><i className="fas fa-plug mr-2"></i>Integrações & API</h4>
                                <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                                    <li>Lançamento da <strong>API de Desenvolvedor</strong>: Crie chaves e integre o GDN_IA ao seu sistema.</li>
                                    <li><strong>Plugin WordPress</strong>: Download direto do plugin conector.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
