
import React from 'react';
import { NewsArticle } from '../types';

interface NewsCardProps {
  article: NewsArticle;
}

export const NewsCard: React.FC<NewsCardProps> = ({ article }) => {
  return (
    <div className="bg-black/30 border border-green-900/40 rounded-xl shadow-lg shadow-black/30 overflow-hidden animate-fade-in-up">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-green-400 mb-4">{article.titulo}</h2>
        <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
          {article.conteudo.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-4 last:mb-0">{paragraph}</p>
          ))}
        </div>
      </div>
      {article.sources && article.sources.length > 0 && (
        <div className="bg-black/50 px-6 py-4 border-t border-green-900/40">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Fontes (Google Search):</h3>
          <ul className="space-y-2">
            {article.sources.map((source, index) => (
              <li key={index} className="flex items-start">
                 <i className="fas fa-link text-green-500 mt-1 mr-2 text-xs"></i>
                <a
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 hover:underline text-sm truncate"
                  title={source.title}
                >
                  {source.title || source.uri}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
