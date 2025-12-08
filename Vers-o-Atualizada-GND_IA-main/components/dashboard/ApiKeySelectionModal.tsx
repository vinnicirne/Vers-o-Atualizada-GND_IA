import React, { useState, useEffect } from 'react';

interface ApiKeySelectionModalProps {
  onClose: () => void;
  onKeySelected: () => void;
}

export function ApiKeySelectionModal({ onClose, onKeySelected }: ApiKeySelectionModalProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      setIsSelecting(true);
      setError(null);
      try {
        await window.aistudio.openSelectKey();
        // Assume key selection was successful, proceed.
        // The API_KEY env var will be updated for subsequent calls.
        onKeySelected(); 
      } catch (err: any) {
        console.error("Erro ao abrir seletor de API Key:", err);
        setError(err.message || "Falha ao abrir o seletor de chave.");
      } finally {
        setIsSelecting(false);
      }
    } else {
      setError("Recurso de seleção de API Key não disponível neste ambiente.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl max-w-md w-full p-8 text-center shadow-2xl border-t-4 border-orange-500">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500 text-2xl">
          <i className="fas fa-key"></i>
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Chave Gemini Necessária</h3>
        <p className="text-gray-600 mb-6">
          Para utilizar este recurso (Texto para Voz), é necessário selecionar uma API Key do Google Gemini de um projeto com faturamento ativo.
        </p>
        <p className="text-xs text-gray-500 mb-4">
          <i className="fas fa-info-circle mr-1"></i> A chave será salva localmente e utilizada para todas as chamadas de IA.
          <br/>
          Consulte a documentação de <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">faturamento da API Gemini</a> para mais informações.
        </p>
        {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded text-sm">
                <i className="fas fa-exclamation-triangle mr-2"></i> {error}
            </div>
        )}
        <div className="space-y-3">
          <button 
            onClick={handleSelectKey}
            disabled={isSelecting}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSelecting ? <><i className="fas fa-spinner fa-spin"></i> Abrindo Seletor...</> : <><i className="fas fa-hand-pointer"></i> Selecionar API Key</>}
          </button>
          <button 
            onClick={onClose}
            disabled={isSelecting}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-lg transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}