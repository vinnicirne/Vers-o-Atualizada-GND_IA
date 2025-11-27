
import React, { useState } from 'react';

export function DocumentationViewer() {
  const [activeTab, setActiveTab] = useState<'admin' | 'user' | 'updates'>('admin');

  const getTabClass = (tabName: string) => `px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === tabName ? 'bg-green-600 text-black' : 'text-gray-400 hover:text-white'}`;

  return (
    <div className="space-y-6">
      <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-green-400">Documentação do Sistema</h2>
            <div className="flex bg-gray-900 rounded-lg p-1 overflow-x-auto max-w-full">
                <button 
                    onClick={() => setActiveTab('admin')}
                    className={getTabClass('admin')}
                >
                    Manual Técnico
                </button>
                <button 
                    onClick={() => setActiveTab('user')}
                    className={getTabClass('user')}
                >
                    Manual do Usuário
                </button>
                <button 
                    onClick={() => setActiveTab('updates')}
                    className={getTabClass('updates')}
                >
                    Atualizações <span className="ml-1 text-xs bg-green-900 text-green-300 px-1.5 py-0.5 rounded-full">Novo</span>
                </button>
            </div>
        </div>

        <div className="prose prose-invert max-w-none prose-headings:text-green-400 prose-a:text-blue-400">
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
                        <div className="bg-gray-950/50 p-4 rounded border border-gray-800">
                            <h4 className="font-bold text-white mb-2">Sistema de Afiliados</h4>
                            <p className="text-sm mb-2">Lógica de atribuição e comissionamento.</p>
                            <ul className="list-disc pl-5 text-sm space-y-1 text-gray-400">
                                <li>Link com <code>?ref=CODE</code> salva no LocalStorage.</li>
                                <li>Cadastro vincula <code>referred_by</code> (ID do pai).</li>
                                <li>Compra aprovada gera 20% de comissão em <code>affiliate_balance</code>.</li>
                                <li>Logs em <code>affiliate_logs</code>.</li>
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
                        <h3 className="text-xl font-bold text-white">v1.0.5 - Atualização de Segurança e Logs</h3>
                        <p className="text-sm text-gray-500 mb-4">Lançamento: Hoje</p>
                        
                        <div className="space-y-4">
                            <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800">
                                <h4 className="font-bold text-green-400 mb-2"><i className="fas fa-shield-alt mr-2"></i>Segurança de Acesso</h4>
                                <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                                    <li>Implementada <strong>Allowlist de Domínios</strong>: O admin pode restringir cadastro a domínios específicos.</li>
                                    <li>Adicionado modo <strong>Validação DNS Automática</strong>: Verifica se o domínio de e-mail existe e é válido antes de permitir cadastro.</li>
                                    <li>Criada <strong>Blacklist Interna</strong> para bloquear domínios temporários/fake (ex: tempmail, teste.com).</li>
                                </ul>
                            </div>

                            <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800">
                                <h4 className="font-bold text-blue-400 mb-2"><i className="fas fa-clipboard-list mr-2"></i>Arquitetura de Logs</h4>
                                <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                                    <li>Novo <code>LoggerService</code> centralizado.</li>
                                    <li>Logs agora operam em modo <em>Fire-and-Forget</em> (não bloqueiam a tela do usuário se o banco demorar).</li>
                                    <li>Padronização de módulos e ações para melhor auditoria.</li>
                                </ul>
                            </div>

                            <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800">
                                <h4 className="font-bold text-yellow-400 mb-2"><i className="fas fa-tools mr-2"></i>Melhorias Gerais</h4>
                                <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                                    <li><strong>Pagamentos:</strong> Adicionado suporte a configuração de chaves para <strong>Asaas</strong>.</li>
                                    <li><strong>Admin:</strong> Função "Excluir Usuário" agora realiza limpeza em cascata (remove histórico, créditos e logs antes de apagar a conta).</li>
                                    <li><strong>Histórico:</strong> Correção no salvamento de conteúdo (tipo ENUM vs TEXT) e exibição correta de todas as ferramentas.</li>
                                    <li><strong>Afiliados:</strong> Sistema de comissão de 20% para indicações.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Versão Anterior */}
                    <div className="border-l-2 border-gray-700 pl-6 relative opacity-70">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 bg-gray-700 rounded-full border-4 border-black"></div>
                        <h3 className="text-lg font-bold text-gray-400">v1.0.4 - Creator Suite e Planos</h3>
                        <p className="text-sm text-gray-600 mb-4">Lançamento Anterior</p>
                        <ul className="list-disc pl-5 text-sm text-gray-400 space-y-1">
                            <li>Lançamento do <strong>Gerador de Landing Page</strong> com editor visual.</li>
                            <li>Integração com Pollinations.ai para geração de imagens.</li>
                            <li>Novo sistema de gestão de Planos dinâmicos no Admin.</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
