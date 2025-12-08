
import React, { useEffect, useState } from 'react';

interface FeedbackInvitePopupProps {
  onClose: () => void;
  onAccept: () => void;
}

export function FeedbackInvitePopup({ onClose, onAccept }: FeedbackInvitePopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animação de entrada
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Aguarda saída
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex flex-col items-end transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      
      <div className="w-80 bg-white border border-green-500/20 rounded-xl shadow-2xl overflow-hidden relative">
        <div className="h-1 bg-gradient-to-r from-green-400 to-blue-500 w-full"></div>
        <button 
            onClick={handleClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full w-6 h-6 flex items-center justify-center transition"
        >
            <i className="fas fa-times text-xs"></i>
        </button>

        <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
                <div className="bg-green-100 text-green-600 w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm">
                    <i className="fas fa-thumbs-up"></i>
                </div>
                <h3 className="font-bold text-gray-800 text-sm">Gostou do Resultado?</h3>
            </div>
            
            <p className="text-gray-500 text-xs mb-4 leading-relaxed">
                Sua opinião ajuda outros criadores! Compartilhe sua experiência no nosso Mural da Fama.
            </p>

            <div className="flex gap-2">
                <button 
                    onClick={onAccept}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded-lg shadow-md transition flex items-center justify-center gap-2"
                >
                    <i className="fas fa-star"></i> Avaliar Agora
                </button>
                <button 
                    onClick={handleClose}
                    className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs font-bold py-2 rounded-lg transition"
                >
                    Depois
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
