
import React, { useState, useEffect } from 'react';
import { getUserHistory } from '../services/userService';
import { NewsArticle } from '../types';
import { NewsViewModal } from './admin/NewsViewModal'; // Reuse existing view modal logic

interface UserHistoryModalProps {
  userId: string;
  onClose: () => void;
}

export function UserHistoryModal({ userId, onClose }: UserHistoryModalProps) {
  const [history, setHistory] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<NewsArticle | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserHistory(userId);
        setHistory(data);
      } catch (err: any) {
        console.error("Erro no histórico:", err);
        setError(err.message || 'Erro ao carregar histórico. Verifique se o banco de dados está atualizado (coluna author_id).');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();

    const handleEsc = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [userId, onClose]);

  const getTypeName = (type?: string) => {
    if(!type) return 'GERAL';
    if(type === 'news_generator') return 'NOTÍCIA';
    if(type === 'image_generation') return 'IMAGEM';
    if(type === 'landingpage_generator') return 'LANDING PAGE';
    if(type === 'institutional_website_generator') return 'SITE INSTITUCIONAL';
    if(type === 'canva_structure') return 'SOCIAL MEDIA';
    if(type === 'copy_generator') return 'COPY';
    if(type === 'text_to_speech') return 'ÁUDIO';
    if(type === 'prompt_generator') return 'PROMPT';
    return type.toUpperCase().replace('_', ' ');
  };

  const getTypeIcon = (type?: string) => {
      switch(type) {
          case 'news_generator': return 'fa-newspaper text-green-400';
          case 'image_generation': return 'fa-paint-brush text-purple-400';
          case 'landingpage_generator': return 'fa-code text-pink-400';
          case 'institutional_website_generator': return 'fa-building text-orange-400';
          case 'canva_structure': return 'fa-vector-square text-cyan-400';
          case 'text_to_speech': return 'fa-microphone text-blue-400';
          case 'copy_generator': return 'fa-pen-nib text-yellow-400';
          case 'prompt_generator': return 'fa-terminal text-yellow-500';
          default: return 'fa-file-alt text-gray-400';
      }
  };

  const filteredHistory = filterType === 'all' 
    ? history 
    : history.filter(h => h.tipo === filterType);

  return (
    <>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-black border border-green-900/50 rounded-2xl shadow-2xl w-full max-w-4xl my-8 flex flex-col max-h-[85vh]">
          
          {/* Header */}
          <div className="p-6 border-b border-green-900/30 flex justify-between items-center sticky top-0 bg-black z-10 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="bg-green-900/20 p-2 rounded-full">
                  <i className="fas fa-history text-green-400 text-xl"></i>
              </div>
              <div>
                  <h2 className="text-2xl font-bold text-white">Meu Histórico</h2>
                  <p className="text-sm text-gray-400">Suas gerações passadas salvas na nuvem.</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition bg-gray-900/50 w-10 h-10 rounded-full flex items-center justify-center">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-green-900/20 flex gap-2 overflow-x-auto custom-scrollbar">
             <button onClick={() => setFilterType('all')} className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${filterType === 'all' ? 'bg-green-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Todos</button>
             <button onClick={() => setFilterType('news_generator')} className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${filterType === 'news_generator' ? 'bg-green-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Notícias</button>
             <button onClick={() => setFilterType('institutional_website_generator')} className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${filterType === 'institutional_website_generator' ? 'bg-green-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Sites</button>
             <button onClick={() => setFilterType('landingpage_generator')} className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${filterType === 'landingpage_generator' ? 'bg-green-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Landing Pages</button>
             <button onClick={() => setFilterType('image_generation')} className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${filterType === 'image_generation' ? 'bg-green-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Imagens</button>
             <button onClick={() => setFilterType('prompt_generator')} className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${filterType === 'prompt_generator' ? 'bg-green-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Prompts</button>
             <button onClick={() => setFilterType('canva_structure')} className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${filterType === 'canva_structure' ? 'bg-green-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Social Media</button>
             <button onClick={() => setFilterType('copy_generator')} className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${filterType === 'copy_generator' ? 'bg-green-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Copy</button>
             <button onClick={() => setFilterType('text_to_speech')} className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${filterType === 'text_to_speech' ? 'bg-green-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Áudio</button>
          </div>

          {/* List Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
             {loading && <div className="text-center py-10 text-gray-400"><i className="fas fa-spinner fa-spin mr-2"></i> Carregando seu histórico...</div>}
             
             {error && <div className="text-center py-10 text-red-400 px-4"><p className="font-bold mb-2">Erro:</p>{error}</div>}
             
             {!loading && !error && filteredHistory.length === 0 && (
                 <div className="text-center py-12 flex flex-col items-center">
                     <div className="bg-gray-900 rounded-full h-20 w-20 flex items-center justify-center mb-4">
                        <i className="fas fa-ghost text-4xl text-gray-700"></i>
                     </div>
                     <p className="text-gray-400 font-bold">Nenhum registro encontrado.</p>
                     <p className="text-gray-600 text-sm mt-1">
                        {filterType !== 'all' ? `Não há itens do tipo "${getTypeName(filterType)}" ainda.` : 'Comece a gerar conteúdo para vê-lo aqui.'}
                     </p>
                 </div>
             )}

             <div className="grid gap-4">
                 {filteredHistory.map((item) => (
                     <div 
                        key={item.id} 
                        onClick={() => setSelectedItem(item)}
                        className="bg-gray-900/40 border border-gray-800 hover:border-green-500/50 hover:bg-gray-900/80 p-4 rounded-xl cursor-pointer transition-all group"
                     >
                        <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-2">
                                 <span className="text-xs font-bold bg-black/50 px-2 py-0.5 rounded text-gray-400 border border-gray-700">
                                     <i className={`fas ${getTypeIcon(item.tipo)} mr-1.5`}></i>
                                     {getTypeName(item.tipo)}
                                 </span>
                                 <span className="text-xs text-gray-600">{new Date(item.criado_em || '').toLocaleString('pt-BR')}</span>
                             </div>
                             <i className="fas fa-chevron-right text-gray-700 group-hover:text-green-500 transition"></i>
                        </div>
                        <h4 className="font-bold text-white text-md mb-1 line-clamp-1">{item.titulo}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2 font-mono">{item.conteudo.substring(0, 150)}...</p>
                     </div>
                 ))}
             </div>
          </div>
        </div>
      </div>

      {selectedItem && (
          <NewsViewModal article={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </>
  );
}
