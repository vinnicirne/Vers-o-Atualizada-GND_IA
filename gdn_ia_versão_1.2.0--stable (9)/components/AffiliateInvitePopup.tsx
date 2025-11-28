
import React, { useEffect, useState } from 'react';

interface AffiliateInvitePopupProps {
  onClose: () => void;
  onAccept: () => void;
}

export function AffiliateInvitePopup({ onClose, onAccept }: AffiliateInvitePopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Pequeno delay para animação de entrada
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Aguarda animação de saída
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop com blur leve */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>

      <div className={`relative w-full max-w-md bg-gradient-to-b from-gray-900 to-black border border-yellow-500/40 rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.2)] overflow-hidden transform transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}>
        
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-600 via-yellow-300 to-yellow-600"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl"></div>

        <div className="p-8 text-center relative z-10">
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          >
            <i className="fas fa-times text-lg"></i>
          </button>

          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-full flex items-center justify-center mb-6 shadow-lg border border-yellow-500/30">
            <i className="fas fa-hand-holding-dollar text-4xl text-white"></i>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Torne-se um Parceiro
          </h2>
          <h3 className="text-lg font-bold text-yellow-400 mb-4 uppercase tracking-widest">
            Ganhe 20% de Comissão
          </h3>

          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Gostou do sistema? Indique o <strong>GDN_IA</strong> para amigos e ganhe dinheiro recorrente por cada assinatura realizada através do seu link exclusivo.
          </p>

          <div className="space-y-3">
            <button
              onClick={onAccept}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold rounded-xl shadow-lg shadow-yellow-500/20 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>Quero meu Link de Afiliado</span>
              <i className="fas fa-arrow-right"></i>
            </button>
            
            <button
              onClick={handleClose}
              className="w-full py-3 px-6 text-gray-500 hover:text-white text-sm font-medium transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
