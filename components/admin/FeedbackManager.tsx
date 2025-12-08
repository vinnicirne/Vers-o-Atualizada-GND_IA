
import React, { useState, useEffect, useCallback } from 'react';
import { getAllFeedbacks, moderateFeedback } from '../../services/feedbackService';
import { SystemFeedback } from '../../types';
import { Toast } from './Toast';

export function FeedbackManager() {
    const [feedbacks, setFeedbacks] = useState<SystemFeedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAllFeedbacks();
            setFeedbacks(data);
        } catch (e: any) {
            setToast({ message: "Erro ao carregar feedbacks.", type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleModerate = async (id: string, status: 'approved' | 'rejected') => {
        try {
            await moderateFeedback(id, status);
            setToast({ message: `Feedback ${status === 'approved' ? 'aprovado' : 'rejeitado'}!`, type: 'success' });
            loadData();
        } catch (e) {
            setToast({ message: "Erro na moderação.", type: 'error' });
        }
    };

    const filteredFeedbacks = filter === 'all' ? feedbacks : feedbacks.filter(f => f.status === filter);

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800'
        };
        return <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${(styles as any)[status]}`}>{status}</span>;
    };

    const renderStars = (rating: number) => {
        return Array(5).fill(0).map((_, i) => (
            <i key={i} className={`fas fa-star text-xs ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}></i>
        ));
    };

    return (
        <div className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#263238]">Moderação de Depoimentos</h2>
                        <p className="text-sm text-gray-500">Aprove ou rejeite feedbacks dos usuários.</p>
                    </div>
                    
                    <div className="flex gap-2">
                        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded text-sm ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}>Todos</button>
                        <button onClick={() => setFilter('pending')} className={`px-3 py-1.5 rounded text-sm ${filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-100'}`}>Pendentes</button>
                        <button onClick={() => setFilter('approved')} className={`px-3 py-1.5 rounded text-sm ${filter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Aprovados</button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i> Carregando...</div>
                ) : filteredFeedbacks.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded border border-dashed border-gray-300 text-gray-500">
                        Nenhum feedback encontrado.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredFeedbacks.map(feedback => (
                            <div key={feedback.id} className="bg-white border border-gray-200 p-4 rounded-lg flex flex-col md:flex-row gap-4 items-start md:items-center shadow-sm hover:shadow-md transition">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-[#263238]">{feedback.user?.full_name || 'Usuário Anônimo'}</h3>
                                        {getStatusBadge(feedback.status)}
                                    </div>
                                    <div className="flex gap-1 mb-2">{renderStars(feedback.rating)}</div>
                                    <p className="text-gray-600 text-sm italic">"{feedback.content}"</p>
                                    <p className="text-xs text-gray-400 mt-2">{new Date(feedback.created_at).toLocaleString('pt-BR')}</p>
                                </div>
                                
                                <div className="flex gap-2 shrink-0">
                                    {feedback.status !== 'approved' && (
                                        <button 
                                            onClick={() => handleModerate(feedback.id, 'approved')}
                                            className="px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-bold flex items-center gap-1"
                                        >
                                            <i className="fas fa-check"></i> Aprovar
                                        </button>
                                    )}
                                    {feedback.status !== 'rejected' && (
                                        <button 
                                            onClick={() => handleModerate(feedback.id, 'rejected')}
                                            className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold flex items-center gap-1"
                                        >
                                            <i className="fas fa-times"></i> Rejeitar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
