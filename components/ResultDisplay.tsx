
import React from 'react';
import { CreatorSuiteMode } from '../types';
import { LiveHTMLEditor } from './LiveHTMLEditor';

interface ResultDisplayProps {
  text: string;
  mode: CreatorSuiteMode;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ text, mode }) => {
  // If the mode is landing_page, render the interactive HTML editor
  if (mode === 'landing_page') {
    return <LiveHTMLEditor initialHtml={text} />;
  }

  // For all other modes, render the pre-formatted text
  return (
    <div className="bg-black/30 border border-green-900/40 rounded-xl shadow-lg shadow-black/30 overflow-hidden animate-fade-in-up">
      <div className="p-6">
        {/* Usamos 'whitespace-pre-wrap' para preservar quebras de linha e espaços, 
            e para quebrar linhas longas que de outra forma transbordariam. 
            'font-mono' é ótimo para exibir código ou texto pré-formatado. */}
        <pre className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">
          {text}
        </pre>
      </div>
    </div>
  );
};
