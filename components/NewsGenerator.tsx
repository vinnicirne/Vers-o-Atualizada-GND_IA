
import React, { useState } from 'react';
import { NewsType } from '../types';

interface NewsGeneratorProps {
  onGenerate: (topic: string, newsType: NewsType) => void;
  isLoading: boolean;
}

export const NewsGenerator: React.FC<NewsGeneratorProps> = ({ onGenerate, isLoading }) => {
  const [topic, setTopic] = useState<string>('');
  const [newsType, setNewsType] = useState<NewsType>(NewsType.CURRENT);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(topic, newsType);
  };

  const typeButtonClasses = (type: NewsType) => 
    `w-full px-4 py-3 text-sm font-bold rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-black ${
      newsType === type 
        ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' 
        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
    }`;

  return (
    <div className="bg-black/50 p-6 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.2)] border border-green-900/30">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="topic" className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">
            Tópico da Notícia
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex: Final da Libertadores, eventos de Ano Novo..."
            className="w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0 transition duration-300 placeholder-gray-600"
            disabled={isLoading}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            type="button"
            onClick={() => setNewsType(NewsType.CURRENT)}
            className={typeButtonClasses(NewsType.CURRENT)}
            disabled={isLoading}
          >
            <i className="fas fa-clock mr-2"></i>
            Últimas 48h
          </button>
          <button
            type="button"
            onClick={() => setNewsType(NewsType.PREDICTIVE)}
            className={typeButtonClasses(NewsType.PREDICTIVE)}
            disabled={isLoading}
          >
            <i className="fas fa-wand-magic-sparkles mr-2"></i>
            Notícia Preditiva
          </button>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-black font-bold py-3 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-green-500 transition-all duration-300 disabled:opacity-50 disabled:bg-gray-800 disabled:text-gray-500 disabled:from-gray-800 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
          disabled={!topic.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Gerando...
            </>
          ) : (
            <>
              <i className="fas fa-feather-alt mr-2"></i>
              Gerar Notícia
            </>
          )}
        </button>
      </form>
    </div>
  );
};