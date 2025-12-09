
import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus } from '../../types';
import { getLeads, updateLead, deleteLead, createLead } from '../../services/marketingService';
import { useUser } from '../../contexts/UserContext';
import { Toast } from '../admin/Toast';
import { ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip, Cell } from 'recharts';

interface CrmDashboardProps {
    isAdminView?: boolean;
}

const STAGES: { id: LeadStatus; label: string; color: string; bg: string; chartColor: string }[] = [
    { id: 'new', label: 'Novos', color: 'text-blue-700', bg: 'bg-blue-50', chartColor: '#3b82f6' },
    { id: 'contacted', label: 'Contatados', color: 'text-yellow-700', bg: 'bg-yellow-50', chartColor: '#eab308' },
    { id: 'qualified', label: 'Qualificados', color: 'text-purple-700', bg: 'bg-purple-50', chartColor: '#a855f7' },
    { id: 'customer', label: 'Clientes (Ganho)', color: 'text-green-700', bg: 'bg-green-50', chartColor: '#22c55e' },
    { id: 'lost', label: 'Perdidos', color: 'text-gray-600', bg: 'bg-gray-100', chartColor: '#9ca3af' },
];

const INSTALL_SQL = `
-- 1. TABELA DE LEADS
create table if not exists public.leads (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.app_users(id) not null,
  email text not null,
  name text,
  phone text,
  company text,
  status text default 'new',
  score int default 0,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. TABELA DE EVENTOS DE MARKETING
create table if not exists public.marketing_events (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete cascade,
  event_type text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 3. TABELA DE DEALS (NEGÓCIOS)
create table if not exists public.deals (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete cascade,
  owner_id uuid references public.app_users(id) not null,
  title text not null,
  value numeric default 0,
  status text default 'open',
  created_at timestamptz default now()
);

-- 4. HABILITAR RLS
alter table public.leads enable row level security;
alter table public.marketing_events enable row level security;
alter table public.deals enable row level security;

-- 5. POLÍTICAS
create policy "Users manage own leads" on public.leads for all using (auth.uid() = owner_id or exists (select 1 from public.app_users where id = auth.uid() and role in ('admin', 'super_admin')));
create policy "Users manage own deals" on public.deals for all using (auth.uid() = owner_id or exists (select 1 from public.app_users where id = auth.uid() and role in ('admin', 'super_admin')));
create policy "Read events" on public.marketing_events for select using (exists (select 1 from public.leads where id = lead_id and (owner_id = auth.uid() or exists (select 1 from public.app_users where id = auth.uid() and role in ('admin', 'super_admin')))));
create policy "Insert events" on public.marketing_events for insert with check (true);

-- 6. PERMISSÕES
grant all on public.leads to authenticated;
grant all on public.marketing_events to authenticated;
grant all on public.deals to authenticated;
grant all on public.leads to service_role;
grant all on public.marketing_events to service_role;
grant all on public.deals to service_role;
`;

export function CrmDashboard({ isAdminView = false }: CrmDashboardProps) {
    const { user } = useUser();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'analytics'>('kanban'); 
    const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [missingTables, setMissingTables] = useState(false);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Partial<Lead>>({});

    const fetchLeads = async () => {
        if (!user) return;
        setLoading(true);
        setMissingTables(false);
        try {
            const data = await getLeads(user.id, isAdminView && user.role === 'admin');
            setLeads(data);
        } catch (e: any) {
            console.error(e);
            // Detect if error is due to missing tables
            if (e.message && (
                e.message.includes('relation "public.leads" does not exist') || 
                e.message.includes('404')
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

    const copySql = () => {
        navigator.clipboard.writeText(INSTALL_SQL);
        setToast({ message: "SQL copiado! Cole no SQL Editor do Supabase.", type: 'success' });
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

    const getStatusBadge = (status: LeadStatus) => {
        const stage = STAGES.find(s => s.id === status);
        return <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${stage ? stage.bg.replace('50', '100') + ' ' + stage.color : 'bg-gray-100 text-gray-600'}`}>{stage?.label || status}</span>;
    };

    // Calculate Funnel Metrics
    const metrics = STAGES.reduce((acc, stage) => {
        acc[stage.id] = leads.filter(l => l.status === stage.id).length;
        return acc;
    }, {} as Record<string, number>);

    // Data for Funnel Chart
    const funnelChartData = STAGES
        .filter(s => s.id !== 'lost') // Usually lost leads are not in the main funnel visualization
        .map(stage => ({
            name: stage.label,
            value: metrics[stage.id] || 0,
            fill: stage.chartColor
        }))
        .filter(d => d.value > 0); 

    // --- MISSING TABLES STATE ---
    if (missingTables) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-3xl mx-auto mt-8 shadow-sm">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 text-3xl">
                    <i className="fas fa-database"></i>
                </div>
                <h2 className="text-2xl font-bold text-red-700 mb-2">Banco de Dados Desatualizado</h2>
                <p className="text-red-600 mb-6">
                    As tabelas necessárias para o CRM (Leads, Eventos, Negócios) ainda não existem no seu Supabase.
                </p>
                
                <div className="bg-white border border-red-100 rounded-lg p-4 text-left mb-6 relative group">
                    <pre className="text-xs text-gray-600 font-mono overflow-x-auto whitespace-pre-wrap max-h-48 custom-scrollbar">
                        {INSTALL_SQL}
                    </pre>
                    <button 
                        onClick={copySql}
                        className="absolute top-2 right-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs font-bold transition flex items-center gap-2"
                    >
                        <i className="fas fa-copy"></i> Copiar SQL
                    </button>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <button 
                        onClick={copySql}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-red-200 transition flex items-center gap-2"
                    >
                        <i className="fas fa-copy"></i> Copiar Código de Instalação
                    </button>
                    <p className="text-sm text-gray-500">
                        1. Copie o código acima.<br/>
                        2. Vá ao seu painel Supabase > SQL Editor.<br/>
                        3. Cole e clique em "Run".<br/>
                        4. Recarregue esta página.
                    </p>
                </div>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Funnel Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {STAGES.map(stage => (
                    <div key={stage.id} className={`p-4 rounded-lg border ${stage.bg} border-opacity-50`}>
                        <p className={`text-xs font-bold uppercase ${stage.color} opacity-70`}>{stage.label}</p>
                        <p className={`text-2xl font-bold ${stage.color}`}>{metrics[stage.id] || 0}</p>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex bg-gray-100 p-1 rounded-lg mr-2">
                        <button 
                            onClick={() => setViewMode('kanban')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition ${viewMode === 'kanban' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <i className="fas fa-columns"></i> Funil (Kanban)
                        </button>
                        <button 
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <i className="fas fa-list"></i> Lista
                        </button>
                        <button 
                            onClick={() => setViewMode('analytics')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition ${viewMode === 'analytics' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <i className="fas fa-chart-pie"></i> Gráficos
                        </button>
                    </div>

                    <div className="relative flex-grow md:flex-grow-0">
                        <i className="fas fa-search absolute left-3 top-2.5 text-gray-400"></i>
                        <input 
                            type="text" 
                            placeholder="Buscar leads..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500 w-full md:w-48"
                        />
                    </div>
                    
                    {viewMode === 'table' && (
                        <select 
                            value={filterStatus} 
                            onChange={e => setFilterStatus(e.target.value as any)}
                            className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500"
                        >
                            <option value="all">Todos</option>
                            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                    )}
                </div>
                <button 
                    onClick={openNewModal}
                    className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow flex items-center justify-center gap-2 text-sm font-bold"
                >
                    <i className="fas fa-plus"></i> Novo Lead
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12"><i className="fas fa-spinner fa-spin text-2xl text-green-600"></i></div>
            ) : filteredLeads.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <i className="fas fa-filter text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-700">Nenhum resultado</h3>
                    <p className="text-gray-500 text-sm">Tente ajustar os filtros ou adicione um novo lead.</p>
                </div>
            ) : (
                <>
                    {/* ANALYTICS VIEW (VISUAL FUNNEL) */}
                    {viewMode === 'analytics' && (
                        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Visualização do Funil de Vendas</h3>
                            {funnelChartData.length > 0 ? (
                                <div className="w-full h-[400px] flex justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <FunnelChart>
                                            <Tooltip />
                                            <Funnel
                                                dataKey="value"
                                                data={funnelChartData}
                                                isAnimationActive
                                            >
                                                <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                                                {funnelChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Funnel>
                                        </FunnelChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-10">Dados insuficientes para gerar o gráfico de funil. Adicione leads em diferentes estágios.</p>
                            )}
                        </div>
                    )}

                    {/* KANBAN VIEW */}
                    {viewMode === 'kanban' && (
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                            {STAGES.map(stage => {
                                const stageLeads = filteredLeads.filter(l => l.status === stage.id);
                                return (
                                    <div key={stage.id} className="min-w-[280px] w-full md:w-1/5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col h-[calc(100vh-280px)]">
                                        <div className={`p-3 border-b border-gray-200 font-bold text-sm ${stage.color} flex justify-between items-center`}>
                                            <span>{stage.label}</span>
                                            <span className="bg-white px-2 py-0.5 rounded-full text-xs shadow-sm border border-gray-100">{stageLeads.length}</span>
                                        </div>
                                        <div className="p-2 flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                            {stageLeads.map(lead => (
                                                <div 
                                                    key={lead.id} 
                                                    onClick={() => openEditModal(lead)}
                                                    className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md cursor-pointer transition border-l-4"
                                                    style={{ borderLeftColor: stage.chartColor }}
                                                >
                                                    <h4 className="font-bold text-gray-800 text-sm truncate">{lead.name || 'Sem Nome'}</h4>
                                                    <p className="text-xs text-gray-500 mb-1 truncate">{lead.company}</p>
                                                    
                                                    <div className="flex justify-between items-center mt-2">
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${lead.score > 50 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            Score: {lead.score}
                                                        </span>
                                                        <div className="text-xs text-gray-400">
                                                            {new Date(lead.created_at).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* TABLE VIEW */}
                    {viewMode === 'table' && (
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
                </>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-scale">
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
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status (Funil)</label>
                                    <select value={editingLead.status || 'new'} onChange={e => setEditingLead({...editingLead, status: e.target.value as any})} className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500 bg-white">
                                        <option value="new">Novo</option>
                                        <option value="contacted">Contatado</option>
                                        <option value="qualified">Qualificado</option>
                                        <option value="customer">Cliente (Ganho)</option>
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
                                <textarea value={editingLead.notes || ''} onChange={e => setEditingLead({...editingLead, notes: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500 h-20" placeholder="Anotações sobre o lead..." />
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
