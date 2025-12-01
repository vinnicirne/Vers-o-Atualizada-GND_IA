
import React, { useState } from 'react';
import { sendSystemNotification } from '../../services/adminService';
import { useUser } from '../../contexts/UserContext';
import { Toast } from './Toast';

export function NotificationManager() {
    const { user: adminUser } = useUser();
    
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
    const [target, setTarget] = useState<'all' | 'specific'>('all');
    const [targetId, setTargetId] = useState('');
    const [link, setLink] = useState('');
    
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminUser) return;
        if (!title.trim() || !message.trim()) {
            setToast({ message: "Título e mensagem são obrigatórios.", type: 'error' });
            return;
        }
        if (target === 'specific' && !targetId.trim()) {
            setToast({ message: "ID do usuário é obrigatório para envio individual.", type: 'error' });
            return;
        }

        setSending(true);
        try {
            const recipient = target === 'all' ? 'all' : targetId.trim();
            const result = await sendSystemNotification(
                title, 
                message, 
                type, 
                recipient, 
                link || undefined, 
                adminUser.id
            );
            
            setToast({ 
                message: `Notificação enviada com sucesso para ${result.count} usuário(s)!`, 
                type: 'success' 
            });
            
            // Reset form
            setTitle('');
            setMessage('');
            setLink('');
        } catch (error: any) {
            setToast({ message: "Erro ao enviar notificação: " + error.message, type: 'error' });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-3xl mx-auto">
                <div className="mb-6 pb-4 border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-[#263238] flex items-center gap-2">
                        <i className="fas fa-paper-plane text-blue-500"></i> Enviar Notificação Push
                    </h2>
                    <p className="text-sm text-gray-500">
                        Envie alertas em tempo real para o painel dos usuários.
                    </p>
                </div>

                <form onSubmit={handleSend} className="space-y-5">
                    
                    <div className="grid md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Destinatário</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded border border-gray-200 flex-1">
                                    <input 
                                        type="radio" 
                                        name="target" 
                                        value="all" 
                                        checked={target === 'all'} 
                                        onChange={() => setTarget('all')}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Todos (Broadcast)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded border border-gray-200 flex-1">
                                    <input 
                                        type="radio" 
                                        name="target" 
                                        value="specific" 
                                        checked={target === 'specific'} 
                                        onChange={() => setTarget('specific')}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Usuário Específico</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tipo de Alerta</label>
                            <select 
                                value={type} 
                                onChange={(e) => setType(e.target.value as any)}
                                className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                                <option value="info">Informação (Azul)</option>
                                <option value="success">Sucesso (Verde)</option>
                                <option value="warning">Aviso (Amarelo)</option>
                                <option value="error">Erro (Vermelho)</option>
                            </select>
                        </div>
                    </div>

                    {target === 'specific' && (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">ID do Usuário (UUID)</label>
                            <input 
                                type="text" 
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:border-blue-500 outline-none font-mono"
                                placeholder="ex: 550e8400-e29b-41d4-a716-446655440000"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Título</label>
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:border-blue-500 outline-none"
                            placeholder="Ex: Manutenção Programada"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Mensagem</label>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:border-blue-500 outline-none h-24 resize-none"
                            placeholder="Escreva sua mensagem aqui..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Link de Ação (Opcional)</label>
                        <input 
                            type="text" 
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:border-blue-500 outline-none"
                            placeholder="Ex: /?page=plans ou https://google.com"
                        />
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={sending}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {sending ? <><i className="fas fa-spinner fa-spin"></i> Enviando...</> : <><i className="fas fa-paper-plane"></i> Enviar Notificação</>}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
