
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
                        <p>O painel administrativo permite controle total sobre usuários, conteúdo, pagamentos e configurações de IA. Requer role <code>admin</code> ou <code>super_admin</code>.</p>
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-950/50 p-4 rounded border border-gray-800">
                            <h4 className="font-bold text-white mb-2">Gerenciamento de Usuários</h4>
                            <ul className="list-disc pl-5 text-sm space-y-1">
                                <li>Visualize todos os usuários e seus créditos.</li>
                                <li>Edite roles (promova usuários).</li>
                                <li>Ajuste créditos manualmente (use <code>-1</code> para ilimitado).</li>
                            </ul>
                        </div>
                         <div className="bg-gray-950/50 p-4 rounded border border-gray-800">
                            <h4 className="font-bold text-white mb-2">Sistema Multi-IA</h4>
                            <ul className="list-disc pl-5 text-sm space-y-1">
                                <li>Configure chaves de API para Gemini, OpenAI e Claude.</li>
                                <li>Ative/Desative modelos específicos.</li>
                                <li>Monitore custos e uso de tokens em tempo real.</li>
                            </ul>
                        </div>
                         <div className="bg-gray-950/50 p-4 rounded border border-gray-800">
                            <h4 className="font-bold text-white mb-2">Planos e Pagamentos</h4>
                            <ul className="list-disc pl-5 text-sm space-y-1">
                                <li>Crie planos de assinatura (Free, Basic, Premium).</li>
                                <li>Defina quais ferramentas cada plano acessa na aba <strong>Planos</strong>.</li>
                                <li>Configure Stripe/Mercado Pago na aba <strong>Pagamentos</strong>.</li>
                            </ul>
                        </div>
                        <div className="bg-gray-950/50 p-4 rounded border border-gray-800">
                            <h4 className="font-bold text-white mb-2">Logs de Auditoria</h4>
                            <ul className="list-disc pl-5 text-sm space-y-1">
                                <li>Rastreio completo de ações sensíveis.</li>
                                <li>Filtre por usuário, módulo ou tipo de ação.</li>
                                <li>Utilize para debugging e segurança.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-white mb-2">Troubleshooting Comum</h3>
                        <div className="space-y-4">
                            <div className="bg-red-900/10 border-l-4 border-red-500 p-4">
                                <strong className="text-red-400">Erro RLS (Row Level Security)</strong>
                                <p className="text-sm mt-1">Se usuários não conseguem logar ou ver dados, provavelmente faltam Policies no Supabase. Execute os scripts SQL fornecidos no código fonte (services/adminService.ts).</p>
                            </div>
                             <div className="bg-yellow-900/10 border-l-4 border-yellow-500 p-4">
                                <strong className="text-yellow-400">Imagens não carregam</strong>
                                <p className="text-sm mt-1">A API da Pollinations pode estar lenta ou sendo bloqueada por extensões de privacidade no navegador do cliente.</p>
                            </div>
                        </div>
                    </section>
                </div>
            ) : (
                <div className="bg-gray-900 p-6 rounded text-center">
                    <i className="fas fa-info-circle text-4xl text-blue-400 mb-4"></i>
                    <p className="text-lg">O Manual do Usuário está disponível publicamente para todos os usuários através do botão de ajuda (?) no Dashboard principal.</p>
                    <p className="text-sm text-gray-500 mt-2">Consulte a visualização "User" para ver exatamente o que eles veem.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
