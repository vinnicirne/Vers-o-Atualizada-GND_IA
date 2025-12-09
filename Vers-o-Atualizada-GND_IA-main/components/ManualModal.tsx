
import React, { useEffect } from 'react';

interface ManualModalProps {
  onClose: () => void;
}

export function ManualModal({ onClose }: ManualModalProps) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-5xl my-8 flex flex-col max-h-[90vh]">
        
        {/* Header - Light Theme */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-xl">
          <div className="flex items-center gap-3">
             <div className="bg-green-50 p-2 rounded-full border border-green-100">
                <i className="fas fa-book-open text-green-600 text-xl"></i>
             </div>
             <div>
                <h2 className="text-2xl font-bold text-[#263238]">Guia Oficial do Usuário</h2>
                <p className="text-sm text-gray-500">Aprenda a dominar o GDN_IA</p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-[#263238] transition bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar text-[#263238] space-y-12 bg-[#ECEFF1]">
            
            {/* Seção 1: Introdução */}
            <section className="border-b border-gray-200 pb-8">
                <h3 className="text-2xl font-bold text-green-600 mb-4 flex items-center">
                    <span className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 border border-green-200 text-green-700">1</span>
                    Primeiros Passos
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-[#263238] mb-2 flex items-center"><i className="fas fa-tachometer-alt text-blue-500 mr-2"></i>O Dashboard</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">É sua central de comando. No topo, você vê seus <strong>créditos</strong> e seu <strong>plano</strong>. Logo abaixo, a grade de ferramentas.</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-[#263238] mb-2 flex items-center"><i className="fas fa-wallet text-yellow-500 mr-2"></i>Créditos</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">Cada ação consome créditos. Textos custam 1 crédito, Imagens custam 3, Sites custam 8.</p>
                    </div>
                </div>
            </section>

            {/* Seção 2: Ferramentas */}
            <section className="border-b border-gray-200 pb-8">
                <h3 className="text-2xl font-bold text-green-600 mb-6 flex items-center">
                     <span className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 border border-green-200 text-green-700">2</span>
                     Ferramentas Criativas
                </h3>
                
                <div className="space-y-6">
                    {/* Notícias */}
                    <div className="flex flex-col md:flex-row gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-green-300 transition">
                        <div className="bg-green-50 w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 border border-green-100">
                            <i className="fas fa-newspaper text-2xl text-green-600"></i>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-[#263238]">GDN Notícias</h4>
                            <p className="text-sm text-gray-500 mb-2">Gera artigos baseados em fatos reais das últimas 48h.</p>
                            <ul className="text-xs text-gray-400 space-y-1">
                                <li>• Digite o tema (ex: "Jogos olímpicos").</li>
                                <li>• Marque "Gerar Áudio" para narração automática.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Site Institucional (NOVO) */}
                    <div className="flex flex-col md:flex-row gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-orange-300 transition">
                        <div className="bg-orange-50 w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 border border-orange-100">
                            <i className="fas fa-building text-2xl text-orange-500"></i>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-[#263238]">Site Institucional <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded ml-2 font-bold border border-orange-200">NOVO</span></h4>
                            <p className="text-sm text-gray-500 mb-2">Cria sites corporativos completos (Home, Sobre, Serviços) em segundos.</p>
                            <ul className="text-xs text-gray-400 space-y-1">
                                <li>• Informe o nome da empresa e o ramo de atuação.</li>
                                <li>• A IA gera o código, as seções e o design responsivo.</li>
                                <li>• Use o editor para visualizar e exportar o HTML.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Imagens */}
                    <div className="flex flex-col md:flex-row gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-purple-300 transition">
                        <div className="bg-purple-50 w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 border border-purple-100">
                            <i className="fas fa-paint-brush text-2xl text-purple-600"></i>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-[#263238]">Studio de Arte IA</h4>
                            <p className="text-sm text-gray-500 mb-2">Cria imagens de alta definição a partir de texto.</p>
                            <ul className="text-xs text-gray-400 space-y-1">
                                <li>• Escolha o estilo (Fotorealista, Cyberpunk, etc).</li>
                                <li>• Escolha o formato (Quadrado, Paisagem, Stories).</li>
                                <li>• Use o editor para aplicar filtros antes de baixar.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Landing Page */}
                    <div className="flex flex-col md:flex-row gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-pink-300 transition">
                        <div className="bg-pink-50 w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 border border-pink-100">
                            <i className="fas fa-code text-2xl text-pink-500"></i>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-[#263238]">Gerador de Landing Page</h4>
                            <p className="text-sm text-gray-500 mb-2">Cria sites de venda focados em conversão.</p>
                            <ul className="text-xs text-gray-400 space-y-1">
                                <li>• Defina o tema (Moderno, Luxo) e cor principal.</li>
                                <li>• O sistema abre um <strong>Editor Visual</strong> onde você pode editar textos e exportar o código.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Outros */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded border border-gray-200 shadow-sm">
                             <h5 className="font-bold text-[#263238] text-sm mb-1"><i className="fas fa-vector-square mr-2 text-cyan-500"></i>Editor Visual</h5>
                             <p className="text-xs text-gray-500">Cria layouts para posts de redes sociais.</p>
                        </div>
                        <div className="bg-white p-4 rounded border border-gray-200 shadow-sm">
                             <h5 className="font-bold text-[#263238] text-sm mb-1"><i className="fas fa-microphone-lines mr-2 text-blue-500"></i>Texto para Voz</h5>
                             <p className="text-xs text-gray-500">Transforma qualquer texto em áudio.</p>
                        </div>
                    </div>
                </div>
            </section>

             {/* Seção 3: Feedback */}
             <section className="border-b border-gray-200 pb-8">
                <h3 className="text-xl font-bold text-yellow-600 mb-4 flex items-center">
                    <span className="bg-yellow-50 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 border border-yellow-200 text-yellow-600">3</span>
                    Memória e Feedback
                </h3>
                <div className="bg-yellow-50 border border-yellow-100 p-5 rounded-xl flex gap-4 items-center">
                    <i className="fas fa-brain text-4xl text-yellow-400"></i>
                    <div>
                        <p className="text-sm text-[#263238]">
                            O sistema possui <strong>Memória de Aprendizado</strong>. Sempre que você gera algo, pedimos uma nota de 0 a 10.
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            • Notas <strong>8 a 10</strong>: A IA entende que você gostou e tentará replicar o estilo.<br/>
                            • Notas <strong>0 a 4</strong>: A IA entende como erro e evitará fazer igual.
                        </p>
                    </div>
                </div>
            </section>

            {/* Seção 4: Afiliados (Novo) */}
            <section className="border-b border-gray-200 pb-8">
                <h3 className="text-xl font-bold text-[#263238] mb-4 flex items-center">
                    <span className="bg-gray-200 text-gray-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">4</span>
                    Programa de Afiliados
                </h3>
                <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="bg-yellow-50 p-3 rounded-full border border-yellow-200">
                            <i className="fas fa-handshake text-yellow-500 text-xl"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-yellow-600 mb-2">Divulgue e Ganhe 20%</h4>
                            <p className="text-sm text-gray-500 mb-3">
                                Ganhe comissão recorrente sobre todas as compras (planos ou créditos) feitas por usuários que você indicou.
                            </p>
                            <ol className="text-sm text-gray-400 space-y-2 list-decimal pl-4">
                                <li>Clique no ícone de <strong>Aperto de Mão</strong> no topo do Dashboard.</li>
                                <li>Copie seu <strong>Link Exclusivo</strong>.</li>
                                <li>Envie para amigos ou clientes.</li>
                                <li>Acompanhe seu saldo e solicite saques pelo painel.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </section>

            {/* Seção 5: Integrações (n8n) */}
            <section>
                <h3 className="text-xl font-bold text-pink-600 mb-4 flex items-center">
                    <span className="bg-pink-100 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 border border-pink-200 text-pink-700">5</span>
                    Integrações & Automação (n8n)
                </h3>
                <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                            <div className="bg-pink-50 p-3 rounded-full border border-pink-200">
                                <i className="fas fa-bolt text-pink-500 text-xl"></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-pink-600 mb-2">Conecte com o Mundo</h4>
                                <p className="text-sm text-gray-500 mb-3">
                                    Envie suas notícias, imagens e áudios gerados diretamente para outros apps (WordPress, Google Sheets, Telegram) usando <strong>Webhooks</strong>.
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
                            <h5 className="font-bold text-gray-700 mb-2">Como Configurar no n8n:</h5>
                            <ol className="list-decimal pl-5 space-y-1 text-gray-600">
                                <li>Crie um novo workflow e adicione o nó <strong>Webhook</strong>.</li>
                                <li>Configure o <strong>HTTP Method</strong> para <code className="bg-gray-200 px-1 rounded text-pink-700">POST</code>.</li>
                                <li>Copie a <strong>Production URL</strong>.</li>
                                <li>No GDN_IA, vá em <strong>Integrações</strong> (ícone de tomada), aba n8n, cole a URL e salve.</li>
                            </ol>
                        </div>

                        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 text-xs font-mono text-green-400 overflow-x-auto shadow-inner">
                            <p className="text-gray-500 mb-1 font-sans font-bold">// Exemplo do JSON que você receberá:</p>
                            <pre>{`{
  "title": "Título da Notícia Gerada",
  "content": "<p>Texto completo da notícia em HTML...</p>",
  "mode": "news_generator",
  "generated_at": "2023-10-27T10:00:00.000Z",
  "audio_base64": "...", // Se houver áudio
  "image_prompt": "..." // Se for geração de imagem
}`}</pre>
                        </div>
                        
                        <p className="text-xs text-gray-500 italic mt-2">
                            Dica: Use isso para automatizar postagens em redes sociais, salvar leads em planilhas ou enviar notificações.
                        </p>
                    </div>
                </div>
            </section>

        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-white rounded-b-xl flex justify-end">
             <button
                onClick={onClose}
                className="px-6 py-2 font-bold text-black bg-green-500 hover:bg-green-400 transition shadow-md shadow-green-500/20 rounded-lg"
              >
                Entendi, vamos começar!
              </button>
        </div>
      </div>
    </div>
  );
}
