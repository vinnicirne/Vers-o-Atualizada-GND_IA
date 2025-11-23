import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const baseClasses = "fixed bottom-5 right-5 z-50 max-w-sm p-4 rounded-lg shadow-lg text-sm font-semibold flex items-center animate-fade-in-up border";
  const typeClasses = {
    success: 'bg-green-800/90 border-green-600 text-white',
    error: 'bg-red-800/90 border-red-600 text-white',
    info: 'bg-blue-800/90 border-blue-600 text-white',
  };
  const iconClasses = {
    success: 'fas fa-check-circle text-green-400',
    error: 'fas fa-exclamation-triangle text-red-400',
    info: 'fas fa-info-circle text-blue-400',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <i className={`${iconClasses[type]} mr-3 text-lg`}></i>
      <span className="flex-grow">{message}</span>
      <button onClick={onClose} className="ml-4 -mr-2 text-2xl font-light leading-none hover:text-white/80 transition-colors">&times;</button>
    </div>
  );
};
