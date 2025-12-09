
import React, { useState, useEffect } from 'react';
import { WhatsAppInstance, ChatQueue, ChatAgent, User } from '../../types';
import { 
    getWhatsAppInstances, deleteWhatsAppInstance,
    getChatQueues, createChatQueue, deleteChatQueue,
    getChatAgents, createChatAgent
} from '../../services/chatService';
import { WhatsAppConnect } from '../chat/WhatsAppConnect';
import { Toast } from '../admin/Toast';
import { PLANS } from '../../constants';

interface CRMSettingsProps {
    user: User;
}

export function CRMSettings({ user }: CRMSettingsProps) {
    const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
    const [queues, setQueues] = useState<ChatQueue[]>([]);
    const [agents, setAgents] = useState<ChatAgent[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    // Queue Form
    const [newQueueName, setNewQueueName] = useState('');
    const [newQueueColor, setNewQueueColor] = useState('bg-gray-500');

    // Agent Form
    const [newAgentEmail, setNewAgentEmail] = useState('');
    const [newAgentName, setNewAgentName] = useState('');

    const planLimits = user?.plan ? PLANS[user.plan]?.limits : PLANS['free'].limits;
    const maxInstances = planLimits?.whatsapp_instances || 0;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [inst, qs, ags] = await Promise.all([
                getWhatsAppInstances(),
                getChatQueues(),
                getChatAgents()
            ]);
            setInstances(inst);
            setQueues(qs);
            setAgents(ags);
        } catch (e) {
            setToast({ message: "Erro ao carregar configurações.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteInstance = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja desconectar este número?")) return;
        await deleteWhatsAppInstance(id);
        setToast({ message: "Número desconectado.", type: 'success' });
        loadData();
    };

    const handleAddQueue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newQueueName.trim()) return;
        try {
            await createChatQueue(newQueueName, newQueueColor);
            setNewQueueName('');
            loadData();
            setToast({ message: "Fila criada!", type: 'success' });
        } catch (e) {
            setToast({ message: "Erro ao criar fila.", type: 'error' });
        }
    };

    const handleDeleteQueue = async (id: string) => {
        if (!window.confirm("Excluir esta fila?")) return;
        await deleteChatQueue(id);
        loadData();
    };

    const handleAddAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAgentEmail.trim() || !newAgentName.trim()) return;
        
        // Check limits
        const maxAgents = planLimits?.agents || 1;
        if (agents.length >= maxAgents) {
            setToast({ message: `Limite de agentes atingido (${maxAgents}). Faça upgrade.`, type: 'error' });
            return;
        }

        try {
            await createChatAgent(newAgentEmail, newAgentName);
            setNewAgentEmail('');
            setNewAgentName('');
            loadData();
            setToast({ message: "Agente convidado!", type: 'success' });
        } catch (e) {
            setToast({ message: "Erro ao adicionar agente.", type: 'error' });
        }
    };

    if (loading) return <div className="p-8 text-center"><i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i></div>;

    const colors = ['bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-gray-500'];

    return (
        <div className="space-y-8 pb-12">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* 1. WHATSAPP CONNECTIONS */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800"><i className="fab fa-whatsapp text-green-600 mr-2"></i> Canais & Conexões</h3>
                        <p className="text-sm text-gray-500">Gerencie os números conectados ao sistema.</p>
                    </div>
                    <button 
                        onClick={() => setShowConnectModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow flex items-center gap-2 transition"
                    >
                        <i className="fas fa-plus"></i> Adicionar Número
                    </button>
                </div>
                
                <div className="p-6">
                    {instances.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                            <i className="fas fa-mobile-alt text-3xl mb-2 opacity-50"></i>
                            <p>Nenhum número conectado.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {instances.map(inst => (
                                <div key={inst.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition bg-white">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl ${inst.status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                                            <i className="fab fa-whatsapp"></i>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">{inst.name}</h4>
                                            <p className="text-xs text-gray-500 font-mono">{inst.phone_number || 'Conectando...'}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <div className={`w-2 h-2 rounded-full ${inst.status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                                <span className="text-[10px] uppercase font-bold text-gray-400">{inst.status === 'connected' ? 'Online' : 'Aguardando'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteInstance(inst.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition">
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-4 text-right text-xs text-gray-400">
                        Usando {instances.length} de {maxInstances} slots disponíveis no seu plano.
                    </div>
                </div>
            </div>

            {/* 2. QUEUES (FILAS) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800"><i className="fas fa-layer-group text-blue-600 mr-2"></i> Filas de Atendimento</h3>
                    <p className="text-sm text-gray-500">Organize os atendimentos por departamentos (Ex: Suporte, Vendas).</p>
                </div>
                
                <div className="p-6">
                    <form onSubmit={handleAddQueue} className="flex gap-4 mb-6 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Fila</label>
                            <input 
                                type="text" 
                                value={newQueueName} 
                                onChange={e => setNewQueueName(e.target.value)} 
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                                placeholder="Ex: Financeiro" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cor</label>
                            <div className="flex gap-1">
                                {colors.map(c => (
                                    <button 
                                        key={c}
                                        type="button"
                                        onClick={() => setNewQueueColor(c)}
                                        className={`w-8 h-8 rounded-full ${c} ${newQueueColor === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                                    />
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow transition">
                            Criar
                        </button>
                    </form>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {queues.map(q => (
                            <div key={q.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full ${q.color}`}></div>
                                    <span className="font-bold text-gray-700 text-sm">{q.name}</span>
                                </div>
                                <button onClick={() => handleDeleteQueue(q.id)} className="text-gray-400 hover:text-red-500 text-xs">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. AGENTS */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800"><i className="fas fa-users text-purple-600 mr-2"></i> Equipe (Agentes)</h3>
                    <p className="text-sm text-gray-500">Adicione membros para atender nas filas.</p>
                </div>
                
                <div className="p-6">
                    <form onSubmit={handleAddAgent} className="flex flex-col md:flex-row gap-4 mb-6 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                            <input 
                                type="text" 
                                value={newAgentName} 
                                onChange={e => setNewAgentName(e.target.value)} 
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-purple-500 focus:border-purple-500" 
                                placeholder="Nome do Agente" 
                            />
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                            <input 
                                type="email" 
                                value={newAgentEmail} 
                                onChange={e => setNewAgentEmail(e.target.value)} 
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-purple-500 focus:border-purple-500" 
                                placeholder="email@exemplo.com" 
                            />
                        </div>
                        <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow transition w-full md:w-auto">
                            Convidar
                        </button>
                    </form>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-600">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Agente</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Função</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agents.map(agent => (
                                    <tr key={agent.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-bold text-gray-800 flex items-center gap-2">
                                            <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs">
                                                {agent.name.charAt(0)}
                                            </div>
                                            {agent.name}
                                        </td>
                                        <td className="px-4 py-3">{agent.email}</td>
                                        <td className="px-4 py-3 capitalize">{agent.role}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${agent.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {agent.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showConnectModal && (
                <WhatsAppConnect 
                    onClose={() => setShowConnectModal(false)}
                    onSuccess={loadData}
                    currentCount={instances.length}
                    maxLimit={maxInstances}
                />
            )}
        </div>
    );
}
