
import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus } from '../../types';
import { getLeads, updateLead, deleteLead, createLead } from '../../services/marketingService';
import { useUser } from '../../contexts/UserContext';
import { Toast } from '../admin/Toast';
import { ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip, Cell } from 'recharts';
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface CrmDashboardProps {
    isAdminView?: boolean;
}

// Estágios do Funil (Mapeados para o fluxo sugerido)
const STAGES: { id: LeadStatus; label: string; color: string; bg: string; chartColor: string, borderColor: string, icon: string }[] = [
    { id: 'new', label: 'Novos (Atração)', color: 'text-blue-700', bg: 'bg-blue-50', chartColor: '#3b82f6', borderColor: 'border-blue-200', icon: 'fa-magnet' },
    { id: 'contacted', label: 'Em Conversa (WhatsApp)', color: 'text-yellow-700', bg: 'bg-yellow-50', chartColor: '#eab308', borderColor: 'border-yellow-200', icon: 'fa-comments' },
    { id: 'qualified', label: 'Proposta Enviada', color: 'text-purple-700', bg: 'bg-purple-50', chartColor: '#a855f7', borderColor: 'border-purple-200', icon: 'fa-file-invoice-dollar' },
    { id: 'customer', label: 'Fechado (Ganho)', color: 'text-green-700', bg: 'bg-green-50', chartColor: '#22c55e', borderColor: 'border-green-200', icon: 'fa-check-circle' },
    { id: 'lost', label: 'Perdidos', color: 'text-gray-600', bg: 'bg-gray-100', chartColor: '#9ca3af', borderColor: 'border-gray-200', icon: 'fa-ban' },
];

// Helper para Tags de Temperatura
const getTemperatureTag = (score: number) => {
    if (score >= 80) return { label: 'Quente', icon: '🔥', bg: 'bg-red-100', text: 'text-red-700' };
    if (score >= 40) return { label: 'Morno', icon: '⛅', bg: 'bg-orange-100', text: 'text-orange-700' };
    return { label: 'Frio', icon: '❄️', bg: 'bg-blue-100', text: 'text-blue-700' };
};

// Helper para WhatsApp
const openWhatsApp = (phone: string | undefined, name: string | undefined) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const text = `Olá ${name || ''}, tudo bem? Vi seu contato no nosso site.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
};

// --- COMPONENTES DRAG AND DROP ---

// 1. LEAD CARD (Visual Component)
const LeadCard = ({ lead, onClick, isOverlay = false }: { lead: Lead, onClick?: () => void, isOverlay?: boolean }) => {
    const tempTag = getTemperatureTag(lead.score);

    const handleWhatsAppClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Evita abrir o modal de edição
        openWhatsApp(lead.phone, lead.name);
    };

    return (
        <div 
            onClick={onClick}
            className={`
                bg-white p-4 rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing group relative
                ${isOverlay ? 'shadow-2xl rotate-2 scale-105 ring-2 ring-green-500 z-50 border-green-500' : 'border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300'}
            `}
        >
            {/* Header do Card */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="font-bold text-gray-800 text-sm truncate pr-2 max-w-[150px]">{lead.name || 'Sem Nome'}</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold truncate max-w-[150px]">
                        {lead.company || 'Particular'}
                    </p>
                </div>
                
                {/* Tag de Temperatura */}
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${tempTag.bg} ${tempTag.text}`}>
                    <span>{tempTag.icon}</span>
                    <span>{tempTag.label}</span>
                </div>
            </div>
            
            {/* Ações Rápidas (Footer) */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                <div className="text-[10px] text-gray-400">
                    {new Date(lead.updated_at).toLocaleDateString('pt-BR')}
                </div>

                <div className="flex gap-2">
                    {lead.phone && (
                        <button 
                            onClick={handleWhatsAppClick}
                            className="w-7 h-7 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-600 hover:text-white transition-colors"
                            title="Chamar no WhatsApp"
                        >
                            <i className="fab fa-whatsapp"></i>
                        </button>
                    )}
                    <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                        <i className="fas fa-pen text-xs"></i>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 2. DRAGGABLE WRAPPER
const DraggableLead = ({ lead, onClick }: { lead: Lead, onClick: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: lead.id,
        data: { lead }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} {...listeners} {...attributes} style={style} className="touch-none">
            <LeadCard lead={lead} onClick={onClick} />
        </div>
    );
};

// 3. DROPPABLE COLUMN
const DroppableColumn = ({ stage, leads, onEditLead }: { stage: typeof STAGES[0], leads: Lead[], onEditLead: (l: Lead) => void }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: stage.id,
    });

    const totalValue = leads.length; // Futuramente pode ser a soma de deal values

    return (
        <div 
            ref={setNodeRef}
            className={`
                min-w-[280px] w-full md:w-1/5 rounded-xl flex flex-col h-[calc(100vh-240px)] transition-all duration-200 border-t-4
                ${isOver ? 'bg-blue-50/80 border-blue-400' : `bg-gray-50/50 border-${stage.color.split('-')[1]}-400`}
            `}
            style={{ borderColor: stage.chartColor }}
        >
            {/* Column Header */}
            <div className="p-3 mb-2">
                <div className="flex justify-between items-center mb-1">
                    <h3 className={`font-bold text-sm flex items-center gap-2 ${stage.color}`}>
                        <i className={`fas ${stage.icon}`}></i> {stage.label}
                    </h3>
                    <span className="bg-white px-2 py-0.5 rounded-md text-xs font-bold text-gray-600 shadow-sm border border-gray-200">
                        {totalValue}
                    </span>
                </div>
            </div>
            
            {/* Column Body */}
            <div className="px-2 pb-2 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {leads.map(lead => (
                    <DraggableLead key={lead.id} lead={lead} onClick={() => onEditLead(lead)} />
                ))}
                {leads.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50">
                        <i className="fas fa-inbox text-3xl mb-2"></i>
                        <span className="text-xs">Vazio</span>
                    </div>
                )}
            </div>
        </div>
    );
};


export function CrmDashboard({ isAdminView = false }: CrmDashboardProps) {
    const { user } = useUser();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'analytics'>('kanban'); 
    const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [missingTables, setMissingTables] = useState(false);
    
    // Drag State
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [activeDragLead, setActiveDragLead] = useState<Lead | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Partial<Lead>>({});

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const fetchLeads = async () => {
        if (!user) return;
        setLoading(true);
        setMissingTables(false);
        try {
            const data = await getLeads(user.id, isAdminView && user.role === 'admin');
            setLeads(data);
        } catch (e: any) {
            console.error(e);
            if (e.message && (
                e.message.includes('relation "public.leads" does not exist') || 
                e.message.includes('404') ||
                e.message.includes('does not exist')
            )) {
                setMissingTables(true);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [user, isAdminView]);

    const handleDragStart = (event: any) => {
        const { active } = event;
        setActiveDragId(active.id);
        const lead = leads.find(l => l.id === active.id);
        if (lead) setActiveDragLead(lead);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);
        setActiveDragLead(null);

        if (!over) return;

        const leadId = active.id as string;
        const newStatus = over.id as LeadStatus;
        const currentLead = leads.find(l => l.id === leadId);

        // If status changed
        if (currentLead && currentLead.status !== newStatus) {
            // 1. Optimistic Update
            setLeads(prev => prev.map(l => 
                l.id === leadId ? { ...l, status: newStatus } : l
            ));

            // 2. API Call
            try {
                await updateLead(leadId, { status: newStatus });
            } catch (e) {
                // Revert on error
                setLeads(prev => prev.map(l => 
                    l.id === leadId ? { ...l, status: currentLead.status } : l
                ));
                setToast({ message: "Erro ao mover lead.", type: 'error' });
            }
        }
    };

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
            setLeads(prev => prev.filter(l => l.id !== id));
            setIsModalOpen(false);
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
        const matchesStatus = (viewMode === 'kanban' || viewMode === 'analytics') ? true : (filterStatus === 'all' || lead.status === filterStatus);
        const matchesSearch = !searchTerm || 
            (lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
             lead.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
             lead.company?.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    const metrics = STAGES.reduce((acc, stage) => {
        acc[stage.id] = leads.filter(l => l.status === stage.id).length;
        return acc;
    }, {} as Record<string, number>);

    const funnelChartData = STAGES
        .filter(s => s.id !== 'lost') 
        .map(stage => ({
            name: stage.label.split('(')[0].trim(), // Simplificar nome pro gráfico
            value: metrics[stage.id] || 0,
            fill: stage.chartColor
        }))
        .filter(d => d.value > 0); 

    if (missingTables) {
        return <div className="p-8 text-center text-red-500">Erro: Tabelas de CRM não encontradas. Contate o suporte.</div>;
    }

    return (
        <div className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Toolbar Minimalista */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setViewMode('kanban')} className={`w-9 h-9 rounded-md flex items-center justify-center transition ${viewMode === 'kanban' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Quadro Kanban"><i className="fas fa-columns"></i></button>
                        <button onClick={() => setViewMode('table')} className={`w-9 h-9 rounded-md flex items-center justify-center transition ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Lista"><i className="fas fa-list"></i></button>
                        <button onClick={() => setViewMode('analytics')} className={`w-9 h-9 rounded-md flex items-center justify-center transition ${viewMode === 'analytics' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Analytics"><i className="fas fa-chart-pie"></i></button>
                    </div>

                    <div className="relative flex-grow md:flex-grow-0">
                        <i className="fas fa-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                        <input 
                            type="text" 
                            placeholder="Buscar cliente..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none w-full md:w-64 transition-all"
                        />
                    </div>
                </div>
                
                <button 
                    onClick={openNewModal}
                    className="w-full md:w-auto px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition shadow-md shadow-green-200 flex items-center justify-center gap-2 text-sm font-bold"
                >
                    <i className="fas fa-plus"></i> Novo Cliente
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20"><i className="fas fa-circle-notch fa-spin text-3xl text-gray-300"></i></div>
            ) : filteredLeads.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-300">
                        <i className="fas fa-inbox text-3xl"></i>
                    </div>
                    <h3 className="text-gray-600 font-bold">Tudo limpo por aqui!</h3>
                    <p className="text-gray-400 text-sm mt-1">Nenhum lead encontrado. Que tal adicionar um?</p>
                </div>
            ) : (
                <>
                    {/* ANALYTICS VIEW */}
                    {viewMode === 'analytics' && (
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Saúde do Funil</h3>
                            {funnelChartData.length > 0 ? (
                                <div className="w-full h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <FunnelChart>
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Funnel dataKey="value" data={funnelChartData} isAnimationActive>
                                                <LabelList position="right" fill="#4B5563" stroke="none" dataKey="name" />
                                                {funnelChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Funnel>
                                        </FunnelChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="text-gray-400 py-10">Adicione leads para ver as estatísticas.</p>
                            )}
                        </div>
                    )}

                    {/* KANBAN VIEW */}
                    {viewMode === 'kanban' && (
                        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar h-[calc(100vh-220px)] items-start">
                                {STAGES.map(stage => (
                                    <DroppableColumn 
                                        key={stage.id} 
                                        stage={stage} 
                                        leads={filteredLeads.filter(l => l.status === stage.id)}
                                        onEditLead={openEditModal}
                                    />
                                ))}
                            </div>
                            <DragOverlay>
                                {activeDragLead ? <LeadCard lead={activeDragLead} isOverlay /> : null}
                            </DragOverlay>
                        </DndContext>
                    )}

                    {/* TABLE VIEW */}
                    {viewMode === 'table' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase font-bold">
                                        <tr>
                                            <th className="px-6 py-4">Cliente</th>
                                            <th className="px-6 py-4">Contato</th>
                                            <th className="px-6 py-4 text-center">Temp.</th>
                                            <th className="px-6 py-4 text-center">Etapa</th>
                                            <th className="px-6 py-4 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 text-sm">
                                        {filteredLeads.map(lead => {
                                            const temp = getTemperatureTag(lead.score);
                                            return (
                                                <tr key={lead.id} className="hover:bg-gray-50 transition group">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900">{lead.name || 'Sem nome'}</div>
                                                        <div className="text-xs text-gray-500">{lead.company}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-gray-600">{lead.email}</div>
                                                        <div className="text-xs text-gray-400">{lead.phone}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${temp.bg} ${temp.text}`}>
                                                            {temp.icon} {temp.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs uppercase font-bold">
                                                            {STAGES.find(s => s.id === lead.status)?.label || lead.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => openEditModal(lead)} className="text-gray-400 hover:text-blue-600 transition p-2">
                                                            <i className="fas fa-pen"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal de Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">{editingLead.id ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition"><i className="fas fa-times"></i></button>
                        </div>
                        
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                                    <input type="text" value={editingLead.name || ''} onChange={e => setEditingLead({...editingLead, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition" placeholder="Ex: João Silva" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Empresa</label>
                                    <input type="text" value={editingLead.company || ''} onChange={e => setEditingLead({...editingLead, company: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition" placeholder="Ex: Acme Corp" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                <input type="email" value={editingLead.email || ''} onChange={e => setEditingLead({...editingLead, email: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition" placeholder="joao@email.com" />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">WhatsApp / Telefone</label>
                                <input type="tel" value={editingLead.phone || ''} onChange={e => setEditingLead({...editingLead, phone: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition" placeholder="(11) 99999-9999" />
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Etapa do Funil</label>
                                    <select value={editingLead.status || 'new'} onChange={e => setEditingLead({...editingLead, status: e.target.value as any})} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:outline-none">
                                        {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Temperatura (Score)</label>
                                    <input 
                                        type="range" 
                                        min="0" max="100" 
                                        value={editingLead.score || 0} 
                                        onChange={e => setEditingLead({...editingLead, score: parseInt(e.target.value)})} 
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-2"
                                    />
                                    <div className="text-center text-xs font-bold mt-1 text-blue-600">{editingLead.score || 0}%</div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Anotações</label>
                                <textarea value={editingLead.notes || ''} onChange={e => setEditingLead({...editingLead, notes: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition h-24 resize-none" placeholder="Detalhes importantes sobre a negociação..." />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                            {editingLead.id && (
                                <button onClick={() => handleDelete(editingLead.id!)} className="px-4 py-2 text-red-500 font-bold text-xs hover:bg-red-50 rounded transition mr-auto border border-red-200">
                                    <i className="fas fa-trash mr-1"></i> Excluir
                                </button>
                            )}
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 font-bold text-sm hover:bg-gray-200 rounded transition">Cancelar</button>
                            <button onClick={handleSaveLead} className="px-6 py-2 bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 rounded transition shadow-lg shadow-blue-200">
                                Salvar Cliente
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
