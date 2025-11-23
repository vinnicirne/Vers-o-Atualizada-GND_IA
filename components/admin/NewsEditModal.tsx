

import React, { useState, useEffect } from 'react';
import { NewsArticle } from '../../types';

interface NewsEditModalProps {
  article: NewsArticle;
  onSave: (id: number, titulo: string, conteudo: string) => void;
  onClose: () => void;
}

export const NewsEditModal: React.FC<NewsEditModalProps> = ({ article, onSave, onClose }) => {
  const [titulo, setTitulo] = useState(article.titulo);
  const [conteudo, setConteudo] = useState(article.conteudo);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const handleSave = () => {
    if (article.id) {
        onSave(article.id, titulo, conteudo);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black rounded-lg shadow-xl w-full max-w-2xl border border-green-500/30">
        <div className="p-6 border-b border-green-900/30">
          <h2 className="text-2xl font-bold text-green-400">Editar Notícia</h2>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="mb-4">
            <label htmlFor="title" className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">
              Título
            </label>
            <input
              id="title"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0 transition duration-300"
            />
          </div>
          <div>
            <label htmlFor="content" className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">
              Conteúdo
            </label>
            <textarea
              id="content"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={10}
              className="w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0 transition duration-300"
            />
          </div>
        </div>
        <div className="p-6 bg-black/50 flex justify-end space-x-4 rounded-b-lg border-t border-green-900/30">
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 font-bold text-black bg-green-600 rounded-lg hover:bg-green-500 transition"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};