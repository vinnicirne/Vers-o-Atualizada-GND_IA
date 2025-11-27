
import React, { useState } from 'react';
import { ServiceKey } from '../types/plan.types';

interface ResultDisplayProps {
  text: string;
  title?: string | null; // Título opcional para separação visual
  mode: ServiceKey;
  metadata?: {
    plan: string;
    credits: string | number;
  };
}

export function ResultDisplay({ text, title, mode, metadata }: ResultDisplayProps) {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCopyTitle = async () => {
    if (!title) return;
    try {
      await navigator.clipboard.writeText(title);
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } catch (err) {
      console.error('Failed to copy title: ', err);
    }
  };

  const getTitleLabel = () => {
      if (mode === 'news_generator') return 'Título / Manchete';
      if (mode === 'prompt_generator') return 'Prompt Otimizado';
      if (mode === 'copy_generator') return 'Headline / Título';
      return 'Título Principal';
  };

  const getContentLabel = () => {
      if (mode === 'landingpage_generator' || mode === 'institutional_website_generator') return 'Código HTML Gerado';
      if (mode === 'news_generator') return 'Corpo da Matéria';
      if (mode === 'copy_generator') return 'Corpo do Texto';
      return 'Conteúdo Gerado';
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      
      {/* Box do Título (Renderizado apenas se houver título identificado) */}
      {title && (
        <div className="bg-black/30 border border-green-900/40 rounded-xl shadow-lg shadow-black/30 overflow-hidden group">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-green-900/30">
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-green-400 uppercase tracking-wider">
                      {getTitleLabel()}
                  </span>
               </div>
               
               <button
                  onClick={handleCopyTitle}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 border ${
                      copiedTitle
                      ? 'bg-green-600 text-black border-green-500'
                      : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white'
                  }`}
               >
                  <i className={`fas ${copiedTitle ? 'fa-check-circle' : 'fa-copy'} text-xs`}></i>
                  {copiedTitle ? 'Copiado!' : 'Copiar Título'}
               </button>
            </div>
            <div className="p-4 bg-gray-950/30">
                <h3 className="text-lg font-bold text-white leading-tight">{title}</h3>
            </div>
        </div>
      )}

      {/* Box Principal: Conteúdo Gerado */}
      <div className="bg-black/30 border border-green-900/40 rounded-xl shadow-lg shadow-black/30 overflow-hidden group">
        {/* Toolbar Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-green-900/30">
           <div className="flex items-center gap-2">
              {!title && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>}
              <span className="text-xs font-bold text-green-400 uppercase tracking-wider">
                  {getContentLabel()}
              </span>
           </div>
           
           <button
              onClick={handleCopyText}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border ${
                  copiedText
                  ? 'bg-green-600 text-black border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)] scale-105'
                  : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white hover:border-gray-500'
              }`}
              title="Copiar conteúdo para a área de transferência"
           >
              <i className={`fas ${copiedText ? 'fa-check-circle' : 'fa-copy'} text-sm`}></i>
              {copiedText ? 'Copiado!' : 'Copiar Texto'}
           </button>
        </div>

        <div className="p-6 relative">
          {/* Usamos 'whitespace-pre-wrap' para preservar quebras de linha e espaços */}
          <pre className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed overflow-x-auto custom-scrollbar selection:bg-green-900 selection:text-green-100">
            {text}
          </pre>
          
          {/* Overlay hint on hover */}
          <div className="absolute top-2 right-4 text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {text.length} caracteres
          </div>
        </div>
      </div>

      {/* Box Secundário: Informações da Conta/Geração */}
      {metadata && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-2">
                <i className="fas fa-info-circle text-gray-500"></i>
                <span className="uppercase tracking-wider font-bold text-gray-500">Informações de Consumo</span>
            </div>
            
            <div className="flex items-center gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-gray-500">Plano Utilizado:</span>
                    <span className="font-bold text-white bg-gray-800 px-2 py-0.5 rounded border border-gray-700 uppercase">
                        {metadata.plan}
                    </span>
                </div>
                <div className="h-4 w-px bg-gray-700 hidden sm:block"></div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-gray-500">Créditos Restantes:</span>
                    <span className={`font-bold px-2 py-0.5 rounded border border-gray-700 ${metadata.credits === 'Ilimitado' ? 'text-green-400 bg-green-900/20' : 'text-yellow-400 bg-yellow-900/20'}`}>
                        {metadata.credits}
                    </span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
