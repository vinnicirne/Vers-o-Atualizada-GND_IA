
import React, { useState } from 'react';
import { saveUserFeedback } from '../services/memoryService';

interface FeedbackWidgetProps {
  userId: string;
  onClose: () => void;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ userId, onClose }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (rating === null) return;
    
    setSent(true);
    await saveUserFeedback(userId, {
      rating,
      comment: comment || 'Sem comentário'
    });
    
    // Fecha após 2 segundos para o usuário ler a mensagem de sucesso
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  if (sent) {
    return (
      <div className="mt-6 p-6 bg-green-900/20 border border-green-500/30 rounded-xl text-center animate-fade-in">
        <p className="text-green-400 font-bold text-lg">Feedback recebido! 🚀</p>
        <p className="text-gray-400 text-sm">Vou usar isso para melhorar sua próxima experiência.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 bg-gray-900/80 border border-purple-500/30 rounded-xl animate-fade-in shadow-[0_0_20px_rgba(168,85,247,0.15)]">
      <p className="text-xl font-bold text-purple-400 mb-4 text-center">
        De 0 a 10, como ficou esse resultado?
      </p>
      
      <div className="flex gap-2 flex-wrap justify-center mb-4">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            className={`w-10 h-10 rounded-lg font-bold text-sm transition-all duration-200 ${
              rating === n
                ? 'bg-purple-600 text-white scale-110 shadow-lg shadow-purple-500/50'
                : 'bg-gray-800 text-gray-400 hover:bg-purple-900/50 hover:text-purple-300'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="relative">
        <textarea
          placeholder="O que você mudaria pra ficar 10/10? (Seja brutal, eu aprendo rápido)"
          className="w-full bg-black/50 border border-gray-700 text-gray-300 rounded-lg p-4 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        {rating !== null && (
          <button
            onClick={handleSubmit}
            className="mt-3 w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-purple-600/20 uppercase tracking-wide text-xs"
          >
            Enviar Feedback e Melhorar IA
          </button>
        )}
      </div>
    </div>
  );
};
