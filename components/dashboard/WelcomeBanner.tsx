
import React, { useEffect, useState } from 'react';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext';

interface WelcomeBannerProps {
  onClose: () => void;
  onNavigateToLogin: () => void;
  guestCredits: number;
}

export function WelcomeBanner({ onClose, onNavigateToLogin, guestCredits }: WelcomeBannerProps) {
  const { settings } = useWhiteLabel();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show after a small delay for animation
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('gdn_guest_welcome_shown', 'true'); // Mark as shown
    setTimeout(onClose, 300); // Wait for fade out animation
  };

  return (
    <div className={`
      bg-gradient-to-r from-[var(--brand-primary)] to-orange-400 text-white
      p-4 md:p-5 rounded-xl shadow-lg border border-[var(--brand-primary)]/[0.2]
      flex items-center justify-between gap-4 flex-wrap
      transition-all duration-300 ease-in-out transform
      ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 -translate-y-5'}
    `}>
      <div className="flex items-center gap-3 flex-grow min-w-0">
        <div className="bg-white text-[var(--brand-primary)] w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0">
          <i className="fas fa-robot"></i>
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-lg leading-tight truncate">Bem-vindo ao {settings.appName}!</h3>
          <p className="text-sm opacity-90 leading-tight">Você está no modo visitante com {guestCredits} créditos grátis.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <button 
          onClick={onNavigateToLogin}
          className="bg-white text-[var(--brand-primary)] px-4 py-2 rounded-full font-bold text-sm shadow-md hover:bg-gray-100 transition-all flex items-center gap-2"
        >
          <i className="fas fa-user-plus"></i> Criar Conta Grátis
        </button>
        <button 
          onClick={handleClose}
          className="text-white opacity-80 hover:opacity-100 focus:outline-none"
          title="Fechar"
        >
          <i className="fas fa-times text-lg"></i>
        </button>
      </div>
    </div>
  );
}
