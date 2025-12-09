
import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus } from '../../types';
import { getLeads, updateLead, deleteLead, createLead } from '../../services/marketingService';
import { analyzeLeadQuality } from '../../services/geminiService';
import { useUser } from '../../contexts/UserContext';
import { Toast } from '../admin/Toast';
import { ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip, Cell } from 'recharts';
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface CrmDashboardProps {
    isAdminView?: boolean;
    isConnected?: boolean; // Nova prop para saber se o WA está conectado
}

// Estágios do Funil
const STAGES: { id: LeadStatus; label: string; color: string; bg: string; chartColor: string, borderColor: string, icon: string }[] = [
    { id: 'new', label: 'Novos (Atração)', color: 'text-blue-700', bg: 'bg-blue-50', chartColor: '#3b82f6', borderColor: 'border-blue-200', icon: 'fa-magnet' },
    { id: 'contacted', label: 'Em Conversa', color: 'text-yellow-700', bg: 'bg-yellow-50', chartColor: '#eab308', borderColor: 'border-yellow-200', icon: 'fa-comments' },
    { id: 'qualified', label: 'Proposta Enviada', color: 'text-purple-700', bg: 'bg-purple-50', chartColor: '#a855f7', borderColor: 'border-purple-200', icon: 'fa-file-invoice-dollar' },
    { id: 'customer', label: 'Fechado (Ganho)', color: 'text-green-700', bg: 'bg-green-50', chartColor: '#22c55e', borderColor: 'border-green-200', icon: 'fa-check-circle' },
    { id: 'lost', label: 'Perdidos', color: 'text-gray-600', bg: 'bg-gray-100', chartColor: '#9ca3af', borderColor: 'border-gray-200', icon: 'fa-ban' },
];

const getTemperatureTag = (score: number) => {
    if (score >= 80) return { label: 'Quente', icon: '🔥', bg: 'bg-red-100', text: 'text-red-700' };
    if (score >= 40) return { label: 'Morno', icon: '⛅', bg: 'bg-orange-100', text: 'text-orange-700' };
    return { label: 'Frio', icon: '❄️', bg: 'bg-blue-100', text: 'text-blue-700' };
};

const openWhatsApp = (phone: string | undefined, name: string | undefined) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const text = `Olá ${name || ''}, tudo bem? Vi seu contato no nosso site.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
};

// 1. LEAD CARD
const LeadCard = ({ lead, onClick, onAnalyze, isOverlay = false, isAnalyzing = false }: { lead: Lead, onClick?: () => void, onAnalyze?: (l: Lead) => void, isOverlay?: boolean, isAnalyzing?: boolean }) => {
    const tempTag = getTemperatureTag(lead.score);

    const handleWhatsAppClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // AQUI: Futuramente podemos checar 'isConnected' do pai e enviar via API
        // Por enquanto, mantemos o link seguro para garantir funcionamento imediato do CRM
        openWhatsApp(lead.phone, lead.name);
    };

    const handleAnalyzeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onAnalyze && !isAnalyzing) onAnalyze(lead);
    };

    return (
        <div 
            onClick={onClick}
            className={`
                bg-white p-3 rounded-lg border transition-all duration-200 cursor-grab active:cursor-grabbing group relative select-none
                ${isOverlay ? 'shadow-2xl rotate-3 scale-105 cursor-grabbing ring-2 ring-blue-500 z-50 border-blue-500' : 'border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300'}
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="overflow-hidden">
                    <h4 className="font-bold text-gray-800 text-sm truncate pr-2">{lead.name || 'Sem Nome'}</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold truncate">
                        {lead.company || 'Particular'}
                    </p>
                </div>
                <div className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${tempTag.bg} ${tempTag.text}`}>
                    <span>{tempTag.icon}</span>
                    <span>{tempTag.label}</span>
                </div>
            </div>
            
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                <div className="text-[10px] text-gray-400">
                    {new Date(lead.updated_at).toLocaleDateString('pt-BR')}
                </div>

                <div className="flex gap-1.5">
                    <button 
                        onClick={handleAnalyzeClick}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isAnalyzing ? 'bg-purple-100 text-purple-500 cursor-wait' : 'bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white'}`}
                        title="IA Score"
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? <i className="fas fa-spinner fa-spin text-[10px]"></i> : <i className="fas fa-magic text-[10px]"></i>}
                    </button>

                    {lead.phone && (
                        <button 
                            onClick={handleWhatsAppClick}
                            className="w-6 h-6 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-600 hover:text-white transition-colors"
                            title="WhatsApp"
                        >
                            <i className="fab fa-whatsapp text-[10px]"></i>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// 2. DRAGGABLE WRAPPER
const DraggableLead: React.FC<{ lead: Lead, onClick: () => void, onAnalyze: (l: Lead) => void, isAnalyzing: boolean }> = ({ lead, onClick, onAnalyze, isAnalyzing }) => {
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
            <LeadCard lead={lead} onClick={onClick} onAnalyze={onAnalyze} isAnalyzing={isAnalyzing} />
        </div>
    );
};

// 3. DROPPABLE COLUMN
const DroppableColumn: React.FC<{ stage: typeof STAGES[0], leads: Lead[], onEditLead: (l: Lead) => void, onAnalyzeLead: (l: Lead) => void, analyzingIds: Set<string> }> = ({ stage, leads, onEditLead, onAnalyzeLead, analyzingIds }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: stage.id,
    });

    return (
        <div 
            ref={setNodeRef}
            className={`
                min-w-[260px] w-full md:w-1/5 rounded-xl flex flex-col h-[calc(100vh-200px)] transition-all duration-200 border-t-4 bg-gray-50/50
                ${isOver ? 'bg-blue-50 ring-2 ring-blue-200 border-blue-500' : ''}
            `}
            style={{ borderColor: isOver ? '#3b82f6' : stage.chartColor }}
        >
            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-white/50 rounded-t-lg">
                <h3 className={`font-bold text-xs uppercase flex items-center gap-2 ${stage.color}`}>
                    <i className={`fas ${stage.icon}`}></i> {stage.label}
                </h3>
                <span className="bg-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {leads.length}
                </span>
            </div>
            
            <div className="p-2 flex-1 overflow-y-auto custom-scrollbar space-y-2">
                {leads.map(lead => (
                    <DraggableLead 
                        key={lead.id} 
                        lead={lead} 
                        onClick={() => onEditLead(lead)} 
                        onAnalyze={onAnalyzeLead}
                        isAnalyzing={analyzingIds.has(lead.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export function CrmDashboard({ isAdminView = false, isConnected = false }: CrmDashboardProps) {
    const { user } = useUser();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban'); 
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
    const [activeDragLead, setActiveDragLead] = useState<Lead | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Partial<Lead>>({});

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const fetchLeads = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getLeads(user.id, isAdminView && user.role === 'admin');
            setLeads(data);
        } catch (e) {
            console.error("Erro leads:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLeads(); }, [user]);

    const handleDragStart = (event: any) => {
        const lead = leads.find(l => l.id === event.active.id);
        if (lead) setActiveDragLead(lead);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragLead(null);
        if (!over) return;

        const leadId = active.id as string;
        const newStatus = over.id as LeadStatus;
        const currentLead = leads.find(l => l.id === leadId);

        if (currentLead && currentLead.status !== newStatus) {
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
            try {
                await updateLead(leadId, { status: newStatus });
            } catch (e) {
                fetchLeads(); // Revert
            }
        }
    };

    const handleAnalyzeLead = async (lead: Lead) => {
        if (analyzingIds.has(lead.id)) return;
        setAnalyzingIds(prev => new Set(prev).add(lead.id));
        try {
            const analysis = await analyzeLeadQuality(lead);
            const timestamp = new Date().toLocaleString('pt-BR');
            const newNote = `\n\n[🤖 Análise IA - ${timestamp}]\nScore: ${analysis.score}\nJustificativa: ${analysis.justification}`;
            await updateLead(lead.id, { score: analysis.score, notes: (lead.notes || '') + newNote });
            setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, score: analysis.score, notes: (lead.notes || '') + newNote } : l));
            setToast({ message: "Lead analisado!", type: 'success' });
        } catch (e) {
            setToast({ message: "Erro na análise.", type: 'error' });
        } finally {
            setAnalyzingIds(prev => { const next = new Set(prev); next.delete(lead.id); return next; });
        }
    };

    const handleSaveLead = async () => {
        if (!user) return;
        try {
            if (editingLead.id) {
                await updateLead(editingLead.id, editingLead);
            } else {
                await createLead(editingLead, user.id);
            }
            setIsModalOpen(false);
            fetchLeads();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id: string) => {
        if(!confirm("Deletar?")) return;
        await deleteLead(id);
        setLeads(prev => prev.filter(l => l.id !== id));
        setIsModalOpen(false);
    };

    const filteredLeads = leads.filter(lead => 
        !searchTerm || lead.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Top Bar */}
            <div className="flex justify-between items-center mb-4 gap-4">
                <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                    <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 text-xs font-bold rounded transition ${viewMode === 'kanban' ? 'bg-gray-100 text-gray-800' : 'text-gray-500'}`}><i className="fas fa-columns mr-2"></i>Kanban</button>
                    <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-xs font-bold rounded transition ${viewMode === 'table' ? 'bg-gray-100 text-gray-800' : 'text-gray-500'}`}><i className="fas fa-table mr-2"></i>Lista</button>
                </div>
                
                <div className="flex-grow max-w-md relative">
                    <input 
                        type="text" 
                        placeholder="Buscar lead..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                    <i className="fas fa-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                </div>

                <button 
                    onClick={() => { setEditingLead({ status: 'new', score: 0 }); setIsModalOpen(true); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"
                >
                    <i className="fas fa-plus"></i> Novo Lead
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {loading ? (
                    <div className="h-full flex items-center justify-center"><i className="fas fa-spinner fa-spin text-gray-300 text-2xl"></i></div>
                ) : (
                    viewMode === 'kanban' ? (
                        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                            <div className="flex gap-4 h-full overflow-x-auto pb-2 items-start">
                                {STAGES.map(stage => (
                                    <DroppableColumn 
                                        key={stage.id} 
                                        stage={stage} 
                                        leads={filteredLeads.filter(l => l.status === stage.id)}
                                        onEditLead={(l) => { setEditingLead(l); setIsModalOpen(true); }}
                                        onAnalyzeLead={handleAnalyzeLead}
                                        analyzingIds={analyzingIds}
                                    />
                                ))}
                            </div>
                            <DragOverlay>
                                {activeDragLead ? <LeadCard lead={activeDragLead} isOverlay /> : null}
                            </DragOverlay>
                        </DndContext>
                    ) : (
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-bold text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Nome</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredLeads.map(lead => (
                                        <tr key={lead.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium">{lead.name}</td>
                                            <td className="px-4 py-3 capitalize">{lead.status}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => { setEditingLead(lead); setIsModalOpen(true); }} className="text-blue-600 hover:underline">Editar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {/* Simple Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="font-bold text-lg mb-4">{editingLead.id ? 'Editar Lead' : 'Novo Lead'}</h3>
                        <div className="space-y-3">
                            <input type="text" placeholder="Nome" className="w-full border p-2 rounded" value={editingLead.name || ''} onChange={e => setEditingLead({...editingLead, name: e.target.value})} />
                            <input type="text" placeholder="Empresa" className="w-full border p-2 rounded" value={editingLead.company || ''} onChange={e => setEditingLead({...editingLead, company: e.target.value})} />
                            <input type="text" placeholder="WhatsApp" className="w-full border p-2 rounded" value={editingLead.phone || ''} onChange={e => setEditingLead({...editingLead, phone: e.target.value})} />
                            <textarea placeholder="Notas" className="w-full border p-2 rounded h-24" value={editingLead.notes || ''} onChange={e => setEditingLead({...editingLead, notes: e.target.value})}></textarea>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            {editingLead.id && <button onClick={() => handleDelete(editingLead.id!)} className="px-4 py-2 text-red-500 text-sm">Excluir</button>}
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500 text-sm">Cancelar</button>
                            <button onClick={handleSaveLead} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
