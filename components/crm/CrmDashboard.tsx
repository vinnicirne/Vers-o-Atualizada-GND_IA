
import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus } from '../../types';
import { getLeads, updateLead, deleteLead, createLead } from '../../services/marketingService';
import { useUser } from '../../contexts/UserContext';
import { Toast } from '../admin/Toast';

interface CrmDashboardProps {
    isAdminView?: boolean;
}

export function CrmDashboard({ isAdminView = false }: CrmDashboardProps) {
    const { user } = useUser();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Partial<Lead>>({});

    const fetchLeads = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Pass user.id as owner. If isAdminView is true, service handles fetching all (or specific logic)
            const data = await getLeads(user.id, isAdminView && user.role === 'admin');
            setLeads(data);
        } catch (e: any) {
            console.error(e);
            // Don't show error toast on 404/missing table to avoid scaring users before DB update
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [user, isAdminView]);

    const handleSaveLead = async () => {
        if (!user) return;
        try {
            if (editingLead.id) {
                await updateLead(editingLead.id, editingLead);
                setToast({ message: "Lead atualizado!", type: 'success' });
            } else {
                await createLead(editingLead, user.id);
                setToast({ message: "Lead criado!", type: 'success' });
            }
            setIsModalOpen(false);
            setEditingLead({});
            fetchLeads();
        } catch (e) {
            setToast({ message: "Erro ao salvar lead.", type: 'error' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este lead?")) return;
        try {
            await deleteLead(id);
            setToast({ message: "Lead removido.", type: 'success' });
            fetchLeads();
        } catch (e) {
            setToast({ message: "Erro ao excluir.", type: 'error' });
        }
    };

    const openNewModal = () => {
        setEditingLead({ status: 'new', score: 0 });
        setIsModalOpen(true);
    };

    const openEditModal = (lead: Lead) => {
        setEditingLead(lead);
        setIsModalOpen(true);
    };

    // Filter Logic
    const filteredLeads = leads.filter(lead => {
        const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
        const matchesSearch = !searchTerm || 
            (lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
             lead.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
             lead.company?.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    const getStatusBadge = (status: LeadStatus) => {
        const styles = {
            new: 'bg-blue-100 text-blue-800',
            contacted: 'bg-yellow-100 text-yellow-800',
            qualified: 'bg-purple-100 text-purple-800',
            customer: 'bg-green-100 text-green-800',
            lost: 'bg-gray-100 text-gray-600'
        };
        const labels = {
            new: 'Novo',
            contacted: 'Contatado',
            qualified: 'Qualificado',
            customer: 'Cliente',
            lost: 'Perdido'
        };
        return <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${styles[status]}`}>{labels[status]}</span>;
    };

    return (
        <div className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-grow md:flex-grow-0">
                        <i className="fas fa-search absolute left-3 top-2.5 text-gray-400"></i>
                        <input 
                            type="text" 
                            placeholder="Buscar leads..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500 w-full md:w-64"
                        />
                    </div>
                    <select 
                        value={filterStatus} 
                        onChange={e => setFilterStatus(e.target.value as any)}
                        className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500"
                    >
                        <option value="all">Todos os Status</option>
                        <option value="new">Novos</option>
                        <option value="contacted">Contatados</option>
                        <option value="qualified">Qualificados</option>
                        <option value="customer">Clientes</option>
                        <option value="lost">Perdidos</option>
                    </select>
                </div>
                <button 
                    onClick={openNewModal}
                    className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow flex items-center justify-center gap-2 text-sm font-bold"
                >
                    <i className="fas fa-plus"></i> Novo Lead
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-12"><i className="fas fa-spinner fa-spin text-2xl text-green-600"></i></div>
            ) : filteredLeads.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <i className="fas fa-user-friends text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-700">Nenhum lead encontrado</h3>
                    <p className="text-gray-500 text-sm">Use o formulário de captura ou adicione manualmente.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                                <th className="px-6 py-4 font-bold">Nome / Empresa</th>
                                <th className="px-6 py-4 font-bold">Contato</th>
                                <th className="px-6 py-4 font-bold text-center">Score</th>
                                <th className="px-6 py-4 font-bold text-center">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {filteredLeads.map(lead => (
                                <tr key={lead.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{lead.name || 'Sem nome'}</div>
                                        {lead.company && <div className="text-xs text-gray-500"><i className="fas fa-building mr-1"></i>{lead.company}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-700">{lead.email}</div>
                                        {lead.phone && <div className="text-xs text-gray-500">{lead.phone}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-bold ${lead.score > 50 ? 'text-green-600' : 'text-gray-600'}`}>{lead.score}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {getStatusBadge(lead.status)}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => openEditModal(lead)} className="text-blue-600 hover:text-blue-800 p-1"><i className="fas fa-edit"></i></button>
                                        <button onClick={() => handleDelete(lead.id)} className="text-red-500 hover:text-red-700 p-1"><i className="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">{editingLead.id ? 'Editar Lead' : 'Novo Lead'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                                    <input type="text" value={editingLead.name || ''} onChange={e => setEditingLead({...editingLead, name: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Empresa</label>
                                    <input type="text" value={editingLead.company || ''} onChange={e => setEditingLead({...editingLead, company: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email *</label>
                                <input type="email" value={editingLead.email || ''} onChange={e => setEditingLead({...editingLead, email: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                                <input type="text" value={editingLead.phone || ''} onChange={e => setEditingLead({...editingLead, phone: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                                    <select value={editingLead.status || 'new'} onChange={e => setEditingLead({...editingLead, status: e.target.value as any})} className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500">
                                        <option value="new">Novo</option>
                                        <option value="contacted">Contatado</option>
                                        <option value="qualified">Qualificado</option>
                                        <option value="customer">Cliente</option>
                                        <option value="lost">Perdido</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Score (0-100)</label>
                                    <input type="number" value={editingLead.score || 0} onChange={e => setEditingLead({...editingLead, score: parseInt(e.target.value)})} className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notas</label>
                                <textarea value={editingLead.notes || ''} onChange={e => setEditingLead({...editingLead, notes: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500 h-20" />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold text-sm hover:bg-gray-200 rounded transition">Cancelar</button>
                            <button onClick={handleSaveLead} className="px-4 py-2 bg-green-600 text-white font-bold text-sm hover:bg-green-700 rounded transition shadow">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
