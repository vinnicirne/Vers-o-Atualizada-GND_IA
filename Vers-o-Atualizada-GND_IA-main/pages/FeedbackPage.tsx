
import React, { useState, useEffect } from 'react';
import { LegalLayout } from '../components/legal/LegalLayout';
import { getPublicFeedbacks, createSystemFeedback } from '../services/feedbackService';
import { SystemFeedback } from '../types';
import { useUser } from '../contexts/UserContext';
import { Toast } from '../components/admin/Toast';

interface FeedbackPageProps {
  onBack: () => void;
}

export default function FeedbackPage({ onBack }: FeedbackPageProps) {
  const { user } = useUser();
  const [feedbacks, setFeedbacks] = useState<SystemFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetch = async () => {
        try {
            const data = await getPublicFeedbacks();
            setFeedbacks(data);
        } catch (e) {
            console.error("Erro ao carregar feedbacks:", e);
        } finally {
            setLoading(false);
        }
    };
    fetch();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) {
          setToast({ message: "Faça login para enviar seu depoimento.", type: 'error' });
          return;
      }
      if (!content.trim()) {
          setToast({ message: "Escreva algo no seu depoimento.", type: 'error' });
          return;
      }

      setSubmitting(true);
      try {
          await createSystemFeedback(content, rating, user.id);
          setToast({ message: "Depoimento enviado! Aguarde aprovação.", type: 'success' });
          setContent('');
          setRating(5);
      } catch (e: any) {
          const errMsg = e.message || '';
          if (errMsg.includes('row-level security policy') || errMsg.includes('permission denied')) {
              setToast({ message: "Erro: Permissão negada pelo banco de dados. O Administrador precisa executar o script de correção na aba 'Updates & SQL'.", type: 'error' });
          } else {
              setToast({ message: "Erro ao enviar: " + errMsg, type: 'error' });
          }
          console.error("Erro de envio:", e);
      } finally {
          setSubmitting(false);
      }
  };

  return (
    <div className="min-h-screen bg-[#ECEFF1] text-[#263238] font-['Poppins']">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
        {/* Header Reutilizado do LegalLayout mas com cores claras */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="text-2xl font-bold tracking-widest cursor-pointer" onClick={onBack}>
                    <span className="text-[#263238]">GDN</span>
                    <span className="text-green-600">_IA</span>
                </div>
                <span className="text-gray-400">/</span>
                <h1 className="text-sm md:text-base font-bold text-gray-600 uppercase tracking-wider">Mural do Cliente</h1>
            </div>
            <button 
                onClick={onBack}
                className="text-sm text-gray-600 hover:text-green-600 transition-colors flex items-center gap-2 font-bold"
            >
                <i className="fas fa-arrow-left"></i> Voltar ao App
            </button>
            </div>
        </header>

        <main className="container mx-auto px-4 py-12 max-w-6xl">
            
            <div className="text-center mb-12 animate-fade-in-up">
                <h2 className="text-4xl font-bold text-[#263238] mb-4">O que dizem nossos criadores?</h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                    Veja como o GDN_IA está transformando a produtividade de milhares de usuários.
                </p>
            </div>

            {/* Submission Form */}
            <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-8 mb-12 max-w-2xl mx-auto transform hover:-translate-y-1 transition duration-300">
                <h3 className="text-xl font-bold text-[#263238] mb-4 flex items-center gap-2">
                    <i className="fas fa-comment-medical text-green-500"></i> Deixe seu Depoimento
                </h3>
                
                {!user ? (
                    <div className="bg-gray-50 p-6 rounded-lg text-center border border-gray-200">
                        <p className="text-gray-600 mb-4">Faça login para compartilhar sua experiência com a comunidade.</p>
                        <button onClick={onBack} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-500 transition shadow-md">
                            Fazer Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Sua Nota</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className="focus:outline-none transition-transform hover:scale-110"
                                    >
                                        <i className={`fas fa-star text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}></i>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Seu Comentário</label>
                            <textarea 
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none h-24 resize-none"
                                placeholder="Conte para nós como a ferramenta te ajudou..."
                                required
                            />
                        </div>
                        <div className="flex justify-end">
                            <button 
                                type="submit" 
                                disabled={submitting}
                                className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg shadow-md transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {submitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                                Enviar Depoimento
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Feedbacks Grid */}
            {loading ? (
                <div className="text-center py-12"><i className="fas fa-spinner fa-spin text-4xl text-green-600"></i></div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {feedbacks.map(item => (
                        <div key={item.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition duration-300 flex flex-col h-full relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-blue-500"></div>
                            
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-lg">
                                        {item.user?.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#263238] text-sm">{item.user?.full_name || 'Usuário GDN'}</p>
                                        <p className="text-xs text-gray-400">Verificado</p>
                                    </div>
                                </div>
                                <div className="flex text-yellow-400 text-xs">
                                    {Array(item.rating).fill(0).map((_, i) => <i key={i} className="fas fa-star"></i>)}
                                </div>
                            </div>
                            
                            <div className="flex-grow">
                                <i className="fas fa-quote-left text-gray-200 text-3xl mb-2 block"></i>
                                <p className="text-gray-600 text-sm italic leading-relaxed">
                                    "{item.content}"
                                </p>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-100 text-right">
                                <span className="text-[10px] text-gray-400 font-medium">
                                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    </div>
  );
}
