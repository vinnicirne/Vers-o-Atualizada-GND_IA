
import React, { useState, useEffect } from 'react';
import { CREATOR_SUITE_MODES } from '../constants';
import { CreatorSuiteMode } from '../types';

interface ContentGeneratorProps {
  onGenerate: (prompt: string, mode: CreatorSuiteMode, generateAudio: boolean) => void;
  isLoading: boolean;
}

export const ContentGenerator: React.FC<ContentGeneratorProps> = ({ onGenerate, isLoading }) => {
  const [mode, setMode] = useState<CreatorSuiteMode>('news');
  const [prompt, setPrompt] = useState('');
  const [placeholder, setPlaceholder] = useState(CREATOR_SUITE_MODES[0].placeholder);
  const [generateAudio, setGenerateAudio] = useState(false);

  useEffect(() => {
    const selectedMode = CREATOR_SUITE_MODES.find(m => m.value === mode);
    setPlaceholder(selectedMode?.placeholder || '');
    // Reset prompt and audio option when mode changes
    setPrompt('');
    setGenerateAudio(false);
  }, [mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(prompt, mode, generateAudio);
  };

  const selectClasses = "w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0 transition duration-300";

  return (
    <div className="bg-black/50 p-6 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.2)] border border-green-900/30">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="mode" className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">
            Modo de Geração
          </label>
          <select id="mode" value={mode} onChange={e => setMode(e.target.value as CreatorSuiteMode)} className={selectClasses} disabled={isLoading}>
            {CREATOR_SUITE_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        
        <div>
          <label htmlFor="prompt" className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">
            Seu Pedido
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0 transition duration-300 placeholder-gray-600"
            disabled={isLoading}
          />
        </div>

        {mode === 'news' && (
          <div className="flex items-center justify-center pt-4 animate-fade-in">
            <label htmlFor="generate-audio" className="flex items-center cursor-pointer text-sm text-gray-400">
              <input 
                id="generate-audio"
                type="checkbox"
                checked={generateAudio}
                onChange={(e) => setGenerateAudio(e.target.checked)}
                className="h-5 w-5 bg-black border-2 border-green-900/60 rounded text-green-500 focus:ring-green-500 focus:ring-offset-black transition duration-200"
                disabled={isLoading}
              />
              <span className="ml-3">Gerar áudio da matéria</span>
              <i className="fas fa-volume-up ml-2 text-green-500"></i>
            </label>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-black font-bold py-3 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-green-500 transition-all duration-300 disabled:opacity-50 disabled:bg-gray-800 disabled:text-gray-500 disabled:from-gray-800 disabled:cursor-not-allowed flex items-center justify-center shadow-lg mt-4"
          disabled={!prompt.trim() || isLoading}
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
              Gerar Conteúdo
            </>
          )}
        </button>
      </form>
    </div>
  );
};
