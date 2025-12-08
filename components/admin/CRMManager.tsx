
import React, { useState, useEffect, useCallback } from 'react';
import { getLeads, updateLeadStatus, deleteLead } from '../../services/adminService';
import { Lead, LeadStatus } from '../../types';
import { useUser } from '../../contexts/UserContext';
import { Toast } from './Toast';

export function CRMManager() {
    const { user: adminUser } = useUser();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getLeads({ status: statusFilter });
            setLeads(data);
        } catch (error: any) {
            setToast({ message: "Erro ao carregar leads: " + error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const handleStatusChange = async (id: string, newStatus: LeadStatus) => {
        if (!adminUser) return;
        try {
            // Optimistic update
            setLeads(prev => prev.map(l => l.id === id ? { ...l, status_funil: newStatus } : l));
            await updateLeadStatus(id, newStatus, adminUser.id);
            setToast({ message: "Status atualizado!", type: 'success' });
        } catch (e: any) {
            setToast({ message: "Erro ao atualizar status.", type: 'error' });
            fetchLeads(); // Revert
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Excluir este lead permanentemente?")) return;
        if (!adminUser) return;
        try {
            await deleteLead(id, adminUser.id);
            setLeads(prev => prev.filter(l => l.id !== id));
            setToast({ message: "Lead removido.", type: 'success' });
        } catch (e: any) {
            setToast({ message: "Erro ao excluir lead.", type: 'error' });
        }
    };

    const getStatusColor = (status: LeadStatus) => {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'contacted': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'qualified': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'converted': return 'bg-green-100 text-green-800 border-green-200';
            case 'lost': return 'bg-gray-100 text-gray-600 border-gray-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const STATUS_OPTIONS: { value: LeadStatus, label: string }[] = [
        { value: 'new', label: 'Novo Lead' },
        { value: 'contacted', label: 'Contatado' },
        { value: 'qualified', label: 'Qualificado' },
        { value: 'converted', label: 'Convertido (Venda)' },
        { value: 'lost', label: 'Perdido' }
    ];

    return (
        <div className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#263238] flex items-center gap-2">
                            <i className="fas fa-funnel-dollar text-green-600"></i> CRM de Vendas
                        </h2>
                        <p className="text-sm text-gray-500">Gerencie seus leads capturados na Landing Page.</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-500">Filtro:</span>
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value as LeadStatus | 'all')}
                            className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 p-2"
                        >
                            <option value="all">Todos</option>
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12"><i className="fas fa-spinner fa-spin text-2xl text-green-600"></i></div>
                ) : leads.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                        <i className="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                        <p className="text-gray-500 font-medium">Nenhum lead encontrado nesta etapa do funil.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-600">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Score</th>
                                    <th className="px-6 py-3 font-semibold">Contato</th>
                                    <th className="px-6 py-3 font-semibold">Origem (UTM)</th>
                                    <th className="px-6 py-3 font-semibold text-center">Tags</th>
                                    <th className="px-6 py-3 font-semibold text-center">Estágio do Funil</th>
                                    <th className="px-6 py-3 font-semibold text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map(lead => (
                                    <tr key={lead.id} className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-lg text-green-600">{lead.score}</span>
                                            <div className="text-[10px] text-gray-400">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[#263238]">{lead.nome || 'Sem nome'}</div>
                                            <div className="text-xs text-blue-600 hover:underline cursor-pointer" onClick={() => window.open(`mailto:${lead.email}`)}>
                                                {lead.email}
                                            </div>
                                            {lead.telefone && <div className="text-xs text-gray-400 mt-0.5"><i className="fab fa-whatsapp mr-1"></i>{lead.telefone}</div>}
                                            {lead.empresa && <div className="text-xs text-gray-500 mt-0.5 font-semibold">{lead.empresa}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.utm_source ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-mono bg-gray-100 px-1.5 rounded w-fit border border-gray-200">src: {lead.utm_source}</span>
                                                    {lead.utm_medium && <span className="text-[10px] text-gray-400">med: {lead.utm_medium}</span>}
                                                    {lead.utm_campaign && <span className="text-[10px] text-gray-400">cmp: {lead.utm_campaign}</span>}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Direto / Orgânico</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-wrap justify-center gap-1">
                                                {lead.tags?.map(tag => (
                                                    <span key={tag} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 border border-gray-200">
                                                        {tag}
                                                    </span>
                                                ))}
                                                {(!lead.tags || lead.tags.length === 0) && <span className="text-xs text-gray-300">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <select 
                                                value={lead.status_funil}
                                                onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                                                className={`text-xs font-bold uppercase py-1 px-2 rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 ${getStatusColor(lead.status_funil)}`}
                                            >
                                                {STATUS_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleDelete(lead.id)}
                                                className="text-gray-400 hover:text-red-600 transition p-2 rounded-full hover:bg-red-50"
                                                title="Excluir Lead"
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
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
