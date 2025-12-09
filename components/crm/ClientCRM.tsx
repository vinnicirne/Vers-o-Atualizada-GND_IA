
import React, { useState, useEffect } from 'react';
import { ChatContact } from '../../types';
import { getConversations } from '../../services/chatService'; // We can use this to get contacts via active convs
import { Toast } from '../admin/Toast';

interface ClientCRMProps {
    userId: string;
}

export function ClientCRM({ userId }: ClientCRMProps) {
    const [contacts, setContacts] = useState<ChatContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'new' | 'negotiation' | 'won'>('all');
    const [toast, setToast] = useState<{message: string, type: 'error' | 'success'} | null>(null);

    useEffect(() => {
        // In a real scenario, fetch directly from `chat_contacts`
        // For now, mock based on chatService
        const load = async () => {
            setLoading(true);
            try {
                // Mocking fetching contacts. In production: api.select('chat_contacts', { owner_id: userId })
                const convs = await getConversations('any'); 
                const mappedContacts: ChatContact[] = convs.map(c => ({
                    ...c.contact,
                    crm_stage: 'new', // Default stage
                    email: `${c.contact.name.toLowerCase().replace(/\s/g, '.')}@example.com`, // Mock email
                    notes: 'Interessado em planos empresariais.'
                }));
                setContacts(mappedContacts);
            } catch (e) {
                console.error(e);
                setToast({ message: "Erro ao carregar contatos.", type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId]);

    const handleStageChange = (contactId: string, newStage: any) => {
        setContacts(prev => prev.map(c => c.id === contactId ? { ...c, crm_stage: newStage } : c));
        setToast({ message: "Status atualizado!", type: 'success' });
        // Update in DB would go here
    };

    const getStageColor = (stage: string) => {
        switch(stage) {
            case 'new': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'negotiation': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'won': return 'bg-green-100 text-green-700 border-green-200';
            case 'lost': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const filteredContacts = filter === 'all' ? contacts : contacts.filter(c => c.crm_stage === filter);

    return (
        <div className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <span className="text-xs text-gray-500 uppercase font-bold">Total Contatos</span>
                    <span className="text-2xl font-bold text-gray-800">{contacts.length}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex flex-col border-l-4 border-l-blue-500">
                    <span className="text-xs text-blue-600 uppercase font-bold">Novos</span>
                    <span className="text-2xl font-bold text-blue-700">{contacts.filter(c => c.crm_stage === 'new').length}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-yellow-200 shadow-sm flex flex-col border-l-4 border-l-yellow-500">
                    <span className="text-xs text-yellow-600 uppercase font-bold">Em Negociação</span>
                    <span className="text-2xl font-bold text-yellow-700">{contacts.filter(c => c.crm_stage === 'negotiation').length}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm flex flex-col border-l-4 border-l-green-500">
                    <span className="text-xs text-green-600 uppercase font-bold">Fechados</span>
                    <span className="text-2xl font-bold text-green-700">{contacts.filter(c => c.crm_stage === 'won').length}</span>
                </div>
            </div>

            {/* List */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-700">Meus Leads (WhatsApp)</h3>
                    <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value as any)} 
                        className="text-sm border-gray-300 rounded-lg p-1.5 focus:ring-blue-500"
                    >
                        <option value="all">Todos</option>
                        <option value="new">Novos</option>
                        <option value="negotiation">Em Negociação</option>
                        <option value="won">Ganhos</option>
                    </select>
                </div>

                {loading ? (
                    <div className="p-8 text-center"><i className="fas fa-spinner fa-spin text-gray-400 text-2xl"></i></div>
                ) : filteredContacts.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <i className="far fa-address-book text-4xl mb-3"></i>
                        <p>Nenhum contato encontrado.</p>
                        <p className="text-xs mt-1">Conecte seu WhatsApp no Chat Multi-Atendimento para capturar leads.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-600">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-6 py-3">Nome</th>
                                    <th className="px-6 py-3">Contato</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Notas</th>
                                    <th className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredContacts.map(contact => (
                                    <tr key={contact.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <img src={contact.profile_pic_url || "https://ui-avatars.com/api/?background=random"} className="w-8 h-8 rounded-full" />
                                            <span className="font-bold text-gray-800">{contact.name}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs"><i className="fab fa-whatsapp text-green-500 mr-1"></i> {contact.phone}</span>
                                                {contact.email && <span className="text-xs text-gray-400"><i className="far fa-envelope mr-1"></i> {contact.email}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select 
                                                value={contact.crm_stage} 
                                                onChange={(e) => handleStageChange(contact.id, e.target.value)}
                                                className={`text-xs font-bold px-2 py-1 rounded border uppercase ${getStageColor(contact.crm_stage || 'new')}`}
                                            >
                                                <option value="new">Novo</option>
                                                <option value="negotiation">Negociação</option>
                                                <option value="won">Ganho</option>
                                                <option value="lost">Perdido</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs truncate text-xs text-gray-500 italic">
                                            {contact.notes || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-blue-500 hover:bg-blue-50 p-2 rounded-full"><i className="fas fa-comment-alt"></i></button>
                                            <button className="text-gray-400 hover:bg-gray-100 p-2 rounded-full"><i className="fas fa-edit"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
