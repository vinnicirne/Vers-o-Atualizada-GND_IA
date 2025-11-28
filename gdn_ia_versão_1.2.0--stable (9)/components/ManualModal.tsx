
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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-black border border-green-900/50 rounded-2xl shadow-2xl w-full max-w-5xl my-8 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-green-900/30 flex justify-between items-center sticky top-0 bg-black z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
             <div className="bg-green-900/20 p-2 rounded-full">
                <i className="fas fa-book-open text-green-400 text-xl"></i>
             </div>
             <div>
                <h2 className="text-2xl font-bold text-white">Guia Oficial do Usuário</h2>
                <p className="text-sm text-gray-400">Aprenda a dominar o GDN_IA</p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition bg-gray-900/50 w-10 h-10 rounded-full flex items-center justify-center">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar text-gray-300 space-y-12">
            
            {/* Seção 1: Introdução */}
            <section className="border-b border-gray-800 pb-8">
                <h3 className="text-2xl font-bold text-green-400 mb-4 flex items-center">
                    <span className="bg-green-900/30 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">1</span>
                    Primeiros Passos
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-800">
                        <h4 className="font-bold text-white mb-2"><i className="fas fa-tachometer-alt text-blue-400 mr-2"></i>O Dashboard</h4>
                        <p className="text-sm text-gray-400">É sua central de comando. No topo, você vê seus <strong>créditos</strong> e seu <strong>plano</strong>. Logo abaixo, a grade de ferramentas.</p>
                    </div>
                    <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-800">
                        <h4 className="font-bold text-white mb-2"><i className="fas fa-wallet text-yellow-400 mr-2"></i>Créditos</h4>
                        <p className="text-sm text-gray-400">Cada ação consome créditos. Textos custam 1 crédito, Imagens custam 3, Sites custam 8.</p>
                    </div>
                </div>
            </section>

            {/* Seção 2: Ferramentas */}
            <section className="border-b border-gray-800 pb-8">
                <h3 className="text-2xl font-bold text-green-400 mb-6 flex items-center">
                     <span className="bg-green-900/30 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">2</span>
                     Ferramentas Criativas
                </h3>
                
                <div className="space-y-6">
                    {/* Notícias */}
                    <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-950/50 rounded-xl border border-gray-800 hover:border-green-900/50 transition">
                        <div className="bg-green-900/20 w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-newspaper text-2xl text-green-400"></i>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white">GDN Notícias</h4>
                            <p className="text-sm text-gray-400 mb-2">Gera artigos baseados em fatos reais das últimas 48h.</p>
                            <ul className="text-xs text-gray-500 space-y-1">
                                <li>• Digite o tema (ex: "Jogos olímpicos").</li>
                                <li>• Marque "Gerar Áudio" para narração automática.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Site Institucional (NOVO) */}
                    <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-950/50 rounded-xl border border-gray-800 hover:border-orange-900/50 transition">
                        <div className="bg-orange-900/20 w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-building text-2xl text-orange-400"></i>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white">Site Institucional <span className="bg-orange-600 text-black text-[10px] px-2 py-0.5 rounded ml-2">NOVO</span></h4>
                            <p className="text-sm text-gray-400 mb-2">Cria sites corporativos completos (Home, Sobre, Serviços) em segundos.</p>
                            <ul className="text-xs text-gray-500 space-y-1">
                                <li>• Informe o nome da empresa e o ramo de atuação.</li>
                                <li>• A IA gera o código, as seções e o design responsivo.</li>
                                <li>• Use o editor para visualizar e exportar o HTML.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Imagens */}
                    <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-950/50 rounded-xl border border-gray-800 hover:border-purple-900/50 transition">
                        <div className="bg-purple-900/20 w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-paint-brush text-2xl text-purple-400"></i>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white">Studio de Arte IA</h4>
                            <p className="text-sm text-gray-400 mb-2">Cria imagens de alta definição a partir de texto.</p>
                            <ul className="text-xs text-gray-500 space-y-1">
                                <li>• Escolha o estilo (Fotorealista, Cyberpunk, etc).</li>
                                <li>• Escolha o formato (Quadrado, Paisagem, Stories).</li>
                                <li>• Use o editor para aplicar filtros antes de baixar.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Landing Page */}
                    <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-950/50 rounded-xl border border-gray-800 hover:border-pink-900/50 transition">
                        <div className="bg-pink-900/20 w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-code text-2xl text-pink-400"></i>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white">Gerador de Landing Page</h4>
                            <p className="text-sm text-gray-400 mb-2">Cria sites de venda focados em conversão.</p>
                            <ul className="text-xs text-gray-500 space-y-1">
                                <li>• Defina o tema (Moderno, Luxo) e cor principal.</li>
                                <li>• O sistema abre um <strong>Editor Visual</strong> onde você pode editar textos e exportar o código.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Outros */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-900/30 p-3 rounded border border-gray-800">
                             <h5 className="font-bold text-white text-sm"><i className="fas fa-vector-square mr-2 text-cyan-400"></i>Editor Visual</h5>
                             <p className="text-xs text-gray-500">Cria layouts para posts de redes sociais.</p>
                        </div>
                        <div className="bg-gray-900/30 p-3 rounded border border-gray-800">
                             <h5 className="font-bold text-white text-sm"><i className="fas fa-microphone-lines mr-2 text-blue-400"></i>Texto para Voz</h5>
                             <p className="text-xs text-gray-500">Transforma qualquer texto em áudio.</p>
                        </div>
                    </div>
                </div>
            </section>

             {/* Seção 3: Feedback */}
             <section className="border-b border-gray-800 pb-8">
                <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center">
                    <span className="bg-yellow-900/30 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 text-yellow-500">3</span>
                    Memória e Feedback
                </h3>
                <div className="bg-yellow-900/10 border border-yellow-700/30 p-4 rounded-lg flex gap-4">
                    <i className="fas fa-brain text-4xl text-yellow-600"></i>
                    <div>
                        <p className="text-sm text-gray-300">
                            O sistema possui <strong>Memória de Aprendizado</strong>. Sempre que você gera algo, pedimos uma nota de 0 a 10.
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            • Notas <strong>8 a 10</strong>: A IA entende que você gostou e tentará replicar o estilo.<br/>
                            • Notas <strong>0 a 4</strong>: A IA entende como erro e evitará fazer igual.
                        </p>
                    </div>
                </div>
            </section>

            {/* Seção 4: Afiliados (Novo) */}
            <section>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <span className="bg-yellow-600/20 text-yellow-500 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">4</span>
                    Programa de Afiliados
                </h3>
                <div className="bg-gradient-to-r from-yellow-900/10 to-transparent border border-yellow-600/30 p-5 rounded-lg">
                    <div className="flex items-start gap-4">
                        <div className="bg-yellow-600/20 p-3 rounded-full">
                            <i className="fas fa-handshake text-yellow-500 text-xl"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-yellow-500 mb-2">Divulgue e Ganhe 20%</h4>
                            <p className="text-sm text-gray-300 mb-3">
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

        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-green-900/30 bg-black rounded-b-2xl flex justify-end">
             <button
                onClick={onClose}
                className="px-6 py-2 font-bold text-black bg-green-600 rounded-lg hover:bg-green-500 transition shadow-lg shadow-green-600/20"
              >
                Entendi, vamos começar!
              </button>
        </div>
      </div>
    </div>
  );
}
