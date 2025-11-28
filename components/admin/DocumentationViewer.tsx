import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { createApiKey, listApiKeys, revokeApiKey } from '../../services/developerService';
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

  useEffect(() => {
      if (activeTab === 'api' && user) {
          loadKeys();
      }
  }, [activeTab, user]);

  const loadKeys = async () => {
      if (!user) return;
      setLoadingKeys(true);
      try {
          const keys = await listApiKeys(user.id);
          setApiKeys(keys);
      } catch (e) {
          console.error(e);
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
          loadKeys();
          setToast({ message: "Chave criada com sucesso!", type: 'success' });
      } catch (e: any) {
          setToast({ message: "Erro ao criar chave.", type: 'error' });
      }
  };

  const handleRevokeKey = async (id: string) => {
      if (!window.confirm("Tem certeza? Qualquer sistema usando esta chave perderá acesso.")) return;
      try {
          await revokeApiKey(id);
          loadKeys();
          setToast({ message: "Chave revogada.", type: 'success' });
      } catch (e) {
          setToast({ message: "Erro ao revogar.", type: 'error' });
      }
  };

  const getTabClass = (tabName: string) => `px-4 py-2 rounded-md text-sm font-bold transition whitespace-nowrap ${activeTab === tabName ? 'bg-green-600 text-black' : 'text-gray-400 hover:text-white'}`;

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
                <div className="space-y-8">
                    {/* Key Manager */}
                    <div className="bg-gray-950/50 p-6 rounded-xl border border-green-900/30">
                        <h3 className="text-xl font-bold text-white mb-4"><i className="fas fa-key mr-2 text-yellow-500"></i>Minhas Chaves de API</h3>
                        
                        {createdKey && (
                            <div className="mb-6 p-4 bg-green-900/20 border border-green-500 rounded-lg">
                                <p className="text-green-400 font-bold mb-2">Chave criada com sucesso! Copie agora, você não a verá novamente.</p>
                                <div className="flex items-center gap-2 bg-black p-3 rounded border border-green-900/50">
                                    <code className="text-lg text-white font-mono flex-grow">{createdKey}</code>
                                    <button onClick={() => navigator.clipboard.writeText(createdKey)} className="text-gray-400 hover:text-white"><i className="fas fa-copy"></i></button>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 mb-6">
                            <input 
                                type="text" 
                                placeholder="Nome da Chave (ex: Integração Blog)" 
                                value={newKeyName}
                                onChange={e => setNewKeyName(e.target.value)}
                                className="flex-grow bg-black border border-gray-700 rounded p-2 text-white text-sm"
                            />
                            <button 
                                onClick={handleCreateKey}
                                className="bg-green-600 hover:bg-green-500 text-black font-bold px-4 py-2 rounded text-sm whitespace-nowrap"
                            >
                                Gerar Nova Chave
                            </button>
                        </div>

                        <div className="space-y-2">
                            {loadingKeys ? <p className="text-gray-500 text-sm">Carregando chaves...</p> : apiKeys.length === 0 ? (
                                <p className="text-gray-500 text-sm">Nenhuma chave ativa.</p>
                            ) : (
                                apiKeys.map(key => (
                                    <div key={key.id} className="flex justify-between items-center bg-gray-900 p-3 rounded border border-gray-800">
                                        <div>
                                            <p className="font-bold text-gray-200 text-sm">{key.name}</p>
                                            <p className="font-mono text-xs text-gray-500">{key.key_prefix}</p>
                                        </div>
                                        <button onClick={() => handleRevokeKey(key.id)} className="text-red-500 hover:text-red-400 text-xs font-bold border border-red-900/30 px-2 py-1 rounded">Revogar</button>
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
                                    <code className="text-blue-300 font-mono">/v1/generate/news</code>
                                </div>
                                <p className="text-sm text-gray-400 mb-4">Gera uma notícia completa com SEO.</p>
                                
                                <div className="bg-black p-4 rounded border border-gray-700 font-mono text-xs overflow-x-auto text-gray-300">
                                    <span className="text-purple-400">curl</span> -X POST https://api.gdn.ia/v1/generate/news \<br/>
                                    &nbsp;&nbsp;-H <span className="text-green-300">"Authorization: Bearer gdn_live_..."</span> \<br/>
                                    &nbsp;&nbsp;-H <span className="text-green-300">"Content-Type: application/json"</span> \<br/>
                                    &nbsp;&nbsp;-d <span className="text-yellow-300">'{ "prompt": "Eleições 2024", "include_image": true }'</span>
                                </div>
                            </div>

                            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">POST</span>
                                    <code className="text-blue-300 font-mono">/v1/generate/tts</code>
                                </div>
                                <p className="text-sm text-gray-400 mb-4">Converte texto em áudio.</p>
                                
                                <div className="bg-black p-4 rounded border border-gray-700 font-mono text-xs overflow-x-auto text-gray-300">
                                    <span className="text-purple-400">curl</span> -X POST https://api.gdn.ia/v1/generate/tts \<br/>
                                    &nbsp;&nbsp;-H <span className="text-green-300">"Authorization: Bearer gdn_live_..."</span> \<br/>
                                    &nbsp;&nbsp;-d <span className="text-yellow-300">'{ "text": "Bem vindo ao GDN IA", "voice": "alloy" }'</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'admin' && (
                <div className="space-y-8 text-gray-300">
                    <section>
                        <h3 className="text-xl font-bold text-white mb-2">Visão Geral do Admin</h3>
                        <p>O <strong>GDN_IA</strong> é uma plataforma SaaS focada em Inteligência Artificial Generativa. O sistema permite criar notícias, imagens, landing pages e áudios utilizando um sistema de créditos e planos.</p>
                        <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
                           <li><strong>Frontend:</strong> React 18, Vite, TypeScript, Tailwind CSS.</li>
                           <li><strong>Backend:</strong> Supabase (PostgreSQL, Auth, Realtime).</li>
                           <li><strong>IA:</strong> Google Gemini (Texto/Áudio) e Pollinations.ai (Imagens).</li>
                        </ul>
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-950/50 p-4 rounded border border-gray-800">
                            <h4 className="font-bold text-white mb-2">Banco de Dados e Usuários</h4>
                            <p className="text-sm mb-2">A tabela <code>public.app_users</code> espelha os dados públicos. Os créditos são gerenciados em <code>public.user_credits</code>.</p>
                            <ul className="list-disc pl-5 text-sm space-y-1 text-gray-400">
                                <li><code>user_id</code> (FK) liga ao Auth do Supabase.</li>
                                <li>Créditos <code>-1</code> significam ilimitado (admins).</li>
                            </ul>
                        </div>
                         <div className="bg-gray-950/50 p-4 rounded border border-gray-800">
                            <h4 className="font-bold text-white mb-2">Sistema Multi-IA</h4>
                            <p className="text-sm mb-2">Configurado via tabela <code>system_config</code>.</p>
                            <ul className="list-disc pl-5 text-sm space-y-1 text-gray-400">
                                <li>Gemini 2.5 Flash: Texto e Raciocínio.</li>
                                <li>Pollinations.ai: Geração de imagens via prompt refinado.</li>
                                <li>Logs de IA registram tokens e custos estimados.</li>
                            </ul>
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'user' && (
                <div className="bg-gray-900 p-6 rounded text-center">
                    <i className="fas fa-info-circle text-4xl text-blue-400 mb-4"></i>
                    <p className="text-lg">O Manual do Usuário está disponível publicamente para todos os usuários através do botão de ajuda (?) no Dashboard principal.</p>
                    <p className="text-sm text-gray-500 mt-2">Consulte o arquivo <code>MANUAL_DO_USUARIO.md</code> na raiz do projeto para o conteúdo completo.</p>
                </div>
            )}

            {activeTab === 'updates' && (
                <div className="space-y-8">
                    {/* Versão Atual */}
                    <div className="border-l-2 border-green-500 pl-6 relative">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 bg-green-500 rounded-full border-4 border-black"></div>
                        <h3 className="text-xl font-bold text-white">v1.0.9 - Developer API & WordPress</h3>
                        <p className="text-sm text-gray-500 mb-4">Lançamento: Hoje</p>
                        
                        <div className="space-y-4">
                            <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800">
                                <h4 className="font-bold text-green-400 mb-2"><i className="fas fa-plug mr-2"></i>Integrações & API</h4>
                                <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                                    <li>Lançamento da <strong>API de Desenvolvedor</strong>: Crie chaves e integre o GDN_IA ao seu sistema.</li>
                                    <li><strong>Integração WordPress</strong>: Publique notícias geradas diretamente no seu blog com um clique.</li>
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