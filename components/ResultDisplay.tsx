import React from 'react';
import { ServiceKey } from '../types/plan.types'; // Usar ServiceKey

interface ResultDisplayProps {
  text: string;
  mode: ServiceKey; // Usar ServiceKey
}

export function ResultDisplay({ text, mode }: ResultDisplayProps) {
  return (
    <div className="bg-black/30 border border-green-900/40 rounded-xl shadow-lg shadow-black/30 overflow-hidden animate-fade-in-up">
      <div className="p-6">
        {mode === 'landingpage_generator' && ( // Usar ServiceKey
            <div className="mb-4 flex items-center justify-between border-b border-green-900/30 pb-2">
                <span className="text-xs text-green-400 font-bold uppercase tracking-wider">Código HTML Gerado</span>
                <span className="text-xs text-gray-500">Copie o código abaixo e salve como .html</span>
            </div>
        )}
        {/* Usamos 'whitespace-pre-wrap' para preservar quebras de linha e espaços, 
            e para quebrar linhas longas que de outra forma transbordariam. 
            'font-mono' é ótimo para exibir código ou texto pré-formatado. */}
        <pre className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed overflow-x-auto">
          {text}
        </pre>
      </div>
    </div>
  );
}