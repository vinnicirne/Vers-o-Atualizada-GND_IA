
import React from 'react';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext'; // NOVO

interface LegalLayoutProps {
  title: string;
  children: React.ReactNode;
  onBack: () => void;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({ title, children, onBack }) => {
  const { settings } = useWhiteLabel(); // NOVO

  return (
    <div className="min-h-screen bg-black text-gray-300 font-mono selection:bg-green-900 selection:text-white">
      <header className="bg-black/80 backdrop-blur-md border-b border-green-900/30 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="text-2xl font-bold tracking-widest cursor-pointer" onClick={onBack}>
                <span className="text-gray-200">{settings.logoTextPart1}</span>
                <span className="text-[var(--brand-tertiary)]">{settings.logoTextPart2}</span>
             </div>
             <span className="text-gray-600">/</span>
             <h1 className="text-sm md:text-base font-bold text-gray-400 uppercase tracking-wider">{title}</h1>
          </div>
          <button 
            onClick={onBack}
            className="text-sm text-[var(--brand-tertiary)] hover:text-green-300 transition-colors flex items-center gap-2"
          >
            <i className="fas fa-arrow-left"></i> Voltar
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-gray-900/30 border border-green-900/20 rounded-2xl p-8 md:p-12 shadow-2xl">
            <div className="prose prose-invert prose-green max-w-none">
                {children}
            </div>
        </div>
      </main>

      <footer className="border-t border-green-900/30 py-8 mt-12 bg-black">
        <div className="container mx-auto px-4 text-center text-xs text-gray-600">
            &copy; {new Date().getFullYear()} {settings.copyrightText}. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};