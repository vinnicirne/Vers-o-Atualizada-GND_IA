
import React, { useState } from 'react';

export function DocumentationViewer() {
  const [activeTab, setActiveTab] = useState<'admin' | 'user'>('admin');

  return (
    <div className="space-y-6">
      <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-green-400">Documentação do Sistema</h2>
            <div className="flex bg-gray-900 rounded-lg p-1">
                <button 
                    onClick={() => setActiveTab('admin')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'admin' ? 'bg-green-600 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    Manual Técnico (Admin)
                </button>
                <button 
                    onClick={() => setActiveTab('user')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'user' ? 'bg-green-600 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    Manual do Usuário
                </button>
            </div>
        </div>

        <div className="prose prose-invert max-w-none prose-headings:text-green-400 prose-a:text-blue-400">
            {activeTab === 'admin' ? (
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
                         <div className="bg-gray-950/50 p-4 rounded border border-gray-800">
                            <h4 className="font-bold text-white mb-2">Planos e Pagamentos</h4>
                            <ul className="list-disc pl-5 text-sm space-y-1 text-gray-400">
                                <li>Planos são definidos como JSON no banco.</li>
                                <li>Permissões de serviço (ex: <code>image_generation</code>) são ligadas a cada plano.</li>
                                <li>Transações são registradas na tabela <code>transactions</code>.</li>
                            </ul>
                        </div>
                        <div className="bg-gray-950/50 p-4 rounded border border-gray-800">
                            <h4 className="font-bold text-white mb-2">Segurança (RLS)</h4>
                            <ul className="list-disc pl-5 text-sm space-y-1 text-gray-400">
                                <li>Todas as tabelas são protegidas por Row Level Security.</li>
                                <li>Admins podem ler/escrever em tabelas sensíveis.</li>
                                <li>Usuários só acessam seus próprios dados.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-white mb-2">Troubleshooting Técnico</h3>
                        <div className="space-y-4">
                            <div className="bg-red-900/10 border-l-4 border-red-500 p-4">
                                <strong className="text-red-400">Erro de RLS (Permission Denied)</strong>
                                <p className="text-sm mt-1">Se o painel admin ou login falhar com erro de permissão, verifique se as Policies do Supabase foram aplicadas corretamente conforme o script em <code>services/adminService.ts</code>.</p>
                            </div>
                             <div className="bg-blue-900/10 border-l-4 border-blue-500 p-4">
                                <strong className="text-blue-400">API Key Gemini</strong>
                                <p className="text-sm mt-1">Certifique-se de que a variável <code>GEMINI_API_KEY</code> está configurada no <code>.env.local</code> e no ambiente de produção.</p>
                            </div>
                        </div>
                    </section>
                </div>
            ) : (
                <div className="bg-gray-900 p-6 rounded text-center">
                    <i className="fas fa-info-circle text-4xl text-blue-400 mb-4"></i>
                    <p className="text-lg">O Manual do Usuário está disponível publicamente para todos os usuários através do botão de ajuda (?) no Dashboard principal.</p>
                    <p className="text-sm text-gray-500 mt-2">Consulte o arquivo <code>MANUAL_DO_USUARIO.md</code> na raiz do projeto para o conteúdo completo.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}