import React, { useEffect } from 'react';
import { Log } from '../../types';

interface LogDetailsModalProps {
  log: Log;
  onClose: () => void;
}

export const LogDetailsModal: React.FC<LogDetailsModalProps> = ({ log, onClose }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black rounded-lg shadow-xl w-full max-w-2xl border border-green-500/30 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-green-900/30 flex justify-between items-start">
            <div>
                 <h2 className="text-xl font-bold text-green-400">Detalhes do Log</h2>
                 <p className="text-sm text-gray-400">ID do Log: {log.id}</p>
            </div>
             <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <i className="fas fa-times text-2xl"></i>
            </button>
        </div>
        <div className="p-6 overflow-y-auto text-sm space-y-4">
            <div>
                <strong className="text-gray-400 block">Usuário:</strong>
                <span className="text-white">{log.user_email || 'N/A'}</span>
            </div>
             <div>
                <strong className="text-gray-400 block">Ação:</strong>
                <span className="text-white font-mono">{log.acao}</span>
            </div>
             <div>
                <strong className="text-gray-400 block">Data/Hora:</strong>
                <span className="text-white">{new Date(log.data).toLocaleString('pt-BR')}</span>
            </div>
             <div>
                <strong className="text-gray-400 block mb-2">Payload (Dados):</strong>
                <pre className="bg-gray-950 p-4 rounded text-xs text-yellow-300 overflow-auto border border-gray-700">
                    {JSON.stringify(log.detalhes, null, 2)}
                </pre>
            </div>
        </div>
        <div className="p-4 bg-black/50 flex justify-end rounded-b-lg border-t border-green-900/30">
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};