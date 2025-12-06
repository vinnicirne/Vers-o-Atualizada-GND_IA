
import React, { useEffect } from 'react';
import { NewsArticle } from '../../types';

interface NewsViewModalProps {
  article: NewsArticle;
  onClose: () => void;
}

export function NewsViewModal({ article, onClose }: NewsViewModalProps) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const getTypeName = (type?: string) => {
      if(!type) return 'GERAL';
      if(type === 'news_generator') return 'NOTÍCIA';
      if(type === 'image_generation') return 'IMAGEM (PROMPT)';
      if(type === 'landingpage_generator') return 'CRIADOR DE SITES (CÓDIGO)'; // Unificado
      if(type === 'canva_structure') return 'SOCIAL MEDIA (CÓDIGO)';
      return type.toUpperCase().replace('_', ' ');
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-black rounded-lg shadow-xl w-full max-w-3xl border border-green-500/30 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-green-900/30 flex justify-between items-start">
          <div>
            <div className="mb-2">
                <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded border border-gray-600 font-bold tracking-wider">
                    {getTypeName(article.tipo)}
                </span>
            </div>
            <h2 className="text-2xl font-bold text-green-400">{article.titulo}</h2>
            <p className="text-sm text-gray-400 mt-1">
              Por <span className="font-semibold">{article.author?.email || 'Desconhecido'}</span> em {new Date(article.criado_em || '').toLocaleString('pt-BR')}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <i className="fas fa-times text-2xl"></i>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {/* Renderização condicional para código */}
          {(article.tipo === 'landingpage_generator' || article.tipo === 'canva_structure') ? (
              <div className="bg-gray-900 p-4 rounded border border-gray-700">
                  <p className="text-xs text-gray-500 mb-2 uppercase">Código HTML Gerado:</p>
                  <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-96">
                      {article.conteudo}
                  </pre>
              </div>
          ) : (
              <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
                {article.conteudo.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4 last:mb-0">{paragraph}</p>
                ))}
              </div>
          )}

          {article.sources && article.sources.length > 0 && (
            <div className="mt-6 pt-6 border-t border-green-900/40">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Fontes (Google Search):</h3>
              <ul className="space-y-2">
                {article.sources.map((source, index) => (
                  <li key={index} className="flex items-start">
                    <i className="fas fa-link text-green-500 mt-1 mr-2 text-xs"></i>
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 hover:underline text-sm truncate" title={source.title}>
                      {source.title || source.uri}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="p-4 bg-black/50 flex justify-end space-x-4 rounded-b-lg border-t border-green-900/30">
          <button onClick={onClose} className="px-4 py-2 font-bold text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
