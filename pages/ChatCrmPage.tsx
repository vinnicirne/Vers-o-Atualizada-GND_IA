
import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { ChatConnection, QuickAnswer, ConnectionType } from '../types';
import { Toast } from '../components/admin/Toast';
import { getQuickAnswers, createQuickAnswer, deleteQuickAnswer, getConnections, createConnection, deleteConnection, simulateConnectionScan } from '../services/chatService';

type MenuOption = 'dashboard' | 'connections' | 'chats' | 'contacts' | 'tags' | 'quick_answers' | 'schedules' | 'support' | 'account';

// --- COMPONENTS ---

const Sidebar = ({ active, onChange }: { active: MenuOption, onChange: (opt: MenuOption) => void }) => {
    const menus: { id: MenuOption, icon: string, label: string }[] = [
        { id: 'dashboard', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
        { id: 'connections', icon: 'fas fa-sync-alt', label: 'Conexões' },
        { id: 'chats', icon: 'fab fa-whatsapp', label: 'Atendimentos' },
        { id: 'contacts', icon: 'fas fa-address-book', label: 'Contatos' },
        { id: 'tags', icon: 'fas fa-tags', label: 'Etiquetas' },
        { id: 'quick_answers', icon: 'fas fa-bolt', label: 'Respostas rápidas' },
        { id: 'schedules', icon: 'far fa-clock', label: 'Mensagens Agendadas' },
        { id: 'support', icon: 'far fa-question-circle', label: 'Suporte' },
    ];

    return (
        <aside className="w-64 bg-[#1e1e2d] text-[#a6a7ad] flex flex-col h-full shrink-0 transition-all duration-300">
            <div className="h-16 flex items-center px-6 bg-[#1b1b28] border-b border-[#2d2d3f]">
                <div className="flex items-center gap-3 text-white font-bold text-xl tracking-wider">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <i className="fas fa-atom text-sm"></i>
                    </div>
                    <span>Genesis</span>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 space-y-1 custom-scrollbar">
                {menus.map(menu => (
                    <button
                        key={menu.id}
                        onClick={() => onChange(menu.id)}
                        className={`w-full flex items-center px-6 py-3 transition-colors duration-200 border-l-4 ${
                            active === menu.id 
                            ? 'bg-[#2a2a3c] text-white border-blue-500' 
                            : 'border-transparent hover:bg-[#2a2a3c] hover:text-white'
                        }`}
                    >
                        <i className={`${menu.icon} w-6 text-center mr-3 ${active === menu.id ? 'text-blue-500' : ''}`}></i>
                        <span className="text-sm font-medium">{menu.label}</span>
                    </button>
                ))}
            </div>

            <div className="p-4 border-t border-[#2d2d3f] space-y-1">
                <button 
                    onClick={() => onChange('account')}
                    className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${active === 'account' ? 'bg-[#2a2a3c] text-white' : 'hover:bg-[#2a2a3c] hover:text-white'}`}
                >
                    <i className="fas fa-user-circle w-6 mr-2"></i>
                    <span className="text-sm">Minha conta</span>
                </button>
            </div>
        </aside>
    );
};

const QuickAnswersView = ({ answers, onDelete, onAdd, loading }: { answers: QuickAnswer[], onDelete: (id: string) => void, onAdd: () => void, loading: boolean }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filtered = answers.filter(a => 
        a.shortcut.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.message.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 animate-fade-in w-full h-full flex flex-col">
            <h2 className="text-2xl font-bold text-[#343a40] mb-6">Respostas rápidas</h2>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Pesquisar" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 rounded-full text-sm outline-none transition w-64 border"
                            />
                            <i className="fas fa-search absolute left-3 top-2.5 text-gray-400"></i>
                        </div>
                    </div>
                    <button 
                        onClick={onAdd}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-bold hover:bg-blue-600 transition shadow-sm uppercase tracking-wide flex items-center gap-2"
                    >
                        <i className="fas fa-plus"></i> Adicionar
                    </button>
                </div>

                <div className="overflow-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                <th className="px-6 py-4 font-bold text-sm">Atalho</th>
                                <th className="px-6 py-4 font-bold text-sm">Mensagem</th>
                                <th className="px-6 py-4 font-bold text-sm text-center w-32">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i> Carregando...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-500">Nenhum registro encontrado</td></tr>
                            ) : (
                                filtered.map(ans => (
                                    <tr key={ans.id} className="hover:bg-blue-50/50 transition text-sm text-gray-700">
                                        <td className="px-6 py-4 font-mono text-blue-600 bg-blue-50/30 w-48 truncate">/{ans.shortcut}</td>
                                        <td className="px-6 py-4 max-w-xl truncate">{ans.message}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-3">
                                                <button onClick={() => onDelete(ans.id)} className="text-gray-400 hover:text-red-500 transition p-2 rounded-full hover:bg-red-50"><i className="fas fa-trash-alt"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const ConnectionsView = ({ connections, onDelete, onAdd, onSimulateScan, loading }: { connections: ChatConnection[], onDelete: (id: string) => void, onAdd: () => void, onSimulateScan: (id: string) => void, loading: boolean }) => {
    return (
        <div className="p-8 w-full animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-[#343a40]">Conexões</h2>
                    <p className="text-gray-500 text-sm mt-1">Gerencie seus canais de WhatsApp.</p>
                </div>
                <button onClick={onAdd} className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-bold uppercase hover:bg-blue-600 transition shadow-sm flex items-center gap-2">
                    <i className="fas fa-plus"></i> Adicionar Conexão
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20"><i className="fas fa-spinner fa-spin text-3xl text-gray-300"></i></div>
            ) : connections.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-500">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-wifi text-4xl text-gray-400"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-700">Nenhuma conexão encontrada</h3>
                    <p className="text-sm">Adicione um novo número para começar.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {connections.map(conn => (
                        <div key={conn.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition group">
                            <div className={`h-2 bg-gradient-to-r ${conn.status === 'connected' ? 'from-green-400 to-blue-500' : 'from-yellow-400 to-orange-500'}`}></div>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl text-gray-600">
                                            <i className={`fab fa-${conn.type === 'official_api' ? 'facebook' : 'whatsapp'}`}></i>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 leading-tight">{conn.name}</h3>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                {conn.profile_type === 'business' ? (
                                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold flex items-center gap-1"><i className="fas fa-briefcase"></i> Business</span>
                                                ) : (
                                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold flex items-center gap-1"><i className="fas fa-user"></i> Pessoal</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1 ${
                                        conn.status === 'connected' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                    }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${conn.status === 'connected' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                                        {conn.status === 'connected' ? 'Conectado' : 'Aguardando'}
                                    </div>
                                </div>
                                
                                <p className="text-xs text-gray-500 mb-4 truncate">{conn.type === 'official_api' ? 'API Oficial (Meta Cloud)' : 'WhatsApp Web (Legacy)'}</p>
                                
                                {/* QR Code Display for Legacy */}
                                {conn.status === 'qrcode' && conn.qrcode && (
                                    <div className="mb-4 flex flex-col items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <img src={conn.qrcode} alt="Scan Me" className="w-32 h-32 mb-2" />
                                        <p className="text-[10px] text-gray-500 text-center">Escaneie com seu WhatsApp</p>
                                        <button 
                                            onClick={() => onSimulateScan(conn.id)}
                                            className="mt-2 text-xs text-blue-500 underline hover:text-blue-700"
                                        >
                                            [Simular Scan]
                                        </button>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-4 border-t border-gray-100">
                                    {conn.status === 'connected' && (
                                        <div className="flex-1 text-center py-2 text-xs text-gray-400">
                                            Online desde {new Date(conn.created_at || '').toLocaleDateString()}
                                        </div>
                                    )}
                                    <button onClick={() => onDelete(conn.id)} className="ml-auto py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-bold transition flex items-center justify-center gap-2 border border-red-200">
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ConnectionModal = ({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (data: any) => void }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<ConnectionType>('legacy_qrcode');
    const [profileType, setProfileType] = useState<'personal' | 'business'>('personal');
    
    // Legacy Fields
    const [greeting, setGreeting] = useState('');
    const [farewell, setFarewell] = useState('');
    
    // Official Fields
    const [phoneNumberId, setPhoneNumberId] = useState('');
    const [wabaId, setWabaId] = useState('');
    const [apiToken, setApiToken] = useState('');

    React.useEffect(() => {
        if(isOpen) {
            setName('');
            setGreeting('');
            setFarewell('');
            setPhoneNumberId('');
            setWabaId('');
            setApiToken('');
            setType('legacy_qrcode');
            setProfileType('personal');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const inputClass = "w-full bg-transparent border border-gray-600 rounded px-3 py-3 text-gray-200 focus:border-blue-500 outline-none transition text-sm";
    const labelClass = "absolute left-3 -top-2.5 bg-[#2a2a3c] px-1 text-xs text-blue-400";

    const handleSave = () => {
        if (!name) return;
        onSave({ 
            name, 
            type,
            profile_type: profileType,
            greeting_message: greeting, 
            farewell_message: farewell,
            phone_number_id: phoneNumberId,
            waba_id: wabaId,
            api_token: apiToken
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in font-sans">
            <div className="bg-[#2a2a3c] w-full max-w-2xl rounded shadow-2xl flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-700">
                    <h3 className="text-lg font-medium text-white">Nova Conexão</h3>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {/* Connection Type Selector */}
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setType('legacy_qrcode')}
                            className={`flex-1 py-3 rounded border transition ${type === 'legacy_qrcode' ? 'border-green-500 bg-green-500/10 text-white' : 'border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                        >
                            <i className="fab fa-whatsapp text-lg mb-1 block"></i>
                            <span className="text-xs font-bold">WhatsApp Web (QR Code)</span>
                        </button>
                        <button 
                            onClick={() => setType('official_api')}
                            className={`flex-1 py-3 rounded border transition ${type === 'official_api' ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                        >
                            <i className="fab fa-facebook text-lg mb-1 block"></i>
                            <span className="text-xs font-bold">API Oficial (Meta)</span>
                        </button>
                    </div>

                    {/* Profile Type Selector */}
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setProfileType('personal')}
                            className={`flex-1 py-2 rounded border transition ${profileType === 'personal' ? 'border-gray-400 bg-gray-700 text-white' : 'border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                        >
                            <i className="fas fa-user text-sm mr-2"></i>
                            <span className="text-xs font-bold">Pessoal</span>
                        </button>
                        <button 
                            onClick={() => setProfileType('business')}
                            className={`flex-1 py-2 rounded border transition ${profileType === 'business' ? 'border-gray-400 bg-gray-700 text-white' : 'border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                        >
                            <i className="fas fa-briefcase text-sm mr-2"></i>
                            <span className="text-xs font-bold">Business</span>
                        </button>
                    </div>

                    <div className="relative mt-2">
                        <label className={labelClass}>Nome da Conexão</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Ex: Atendimento Principal" />
                    </div>

                    {type === 'legacy_qrcode' ? (
                        <>
                            <div className="relative border border-gray-600 rounded p-3 pt-4">
                                <label className={labelClass}>Mensagem de saudação</label>
                                <textarea value={greeting} onChange={e => setGreeting(e.target.value)} className="w-full bg-transparent text-gray-200 outline-none resize-none h-20 text-sm" placeholder="Mensagem enviada ao iniciar o atendimento..." />
                            </div>
                            <div className="relative border border-gray-600 rounded p-3 pt-4">
                                <label className={labelClass}>Mensagem de despedida</label>
                                <textarea value={farewell} onChange={e => setFarewell(e.target.value)} className="w-full bg-transparent text-gray-200 outline-none resize-none h-20 text-sm" placeholder="Mensagem enviada ao finalizar..." />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="relative mt-2">
                                <label className={labelClass}>Phone Number ID</label>
                                <input type="text" value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} className={inputClass} placeholder="ID do número no Meta for Developers" />
                            </div>
                            <div className="relative mt-2">
                                <label className={labelClass}>WABA ID (WhatsApp Business Account ID)</label>
                                <input type="text" value={wabaId} onChange={e => setWabaId(e.target.value)} className={inputClass} placeholder="ID da conta empresarial" />
                            </div>
                            <div className="relative mt-2">
                                <label className={labelClass}>API Token (Permanente)</label>
                                <input type="password" value={apiToken} onChange={e => setApiToken(e.target.value)} className={inputClass} placeholder="EAAG..." />
                            </div>
                            <div className="p-3 bg-blue-900/30 border border-blue-800 rounded text-xs text-blue-200">
                                <i className="fas fa-info-circle mr-2"></i>
                                Para usar a API Oficial, você precisa de uma conta verificada no Meta for Developers. A conexão é instantânea se as credenciais estiverem corretas.
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="text-blue-400 hover:text-blue-300 font-medium text-sm px-4 py-2 uppercase transition">Cancelar</button>
                    <button onClick={handleSave} className="bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm px-6 py-2 rounded uppercase shadow-md transition">Salvar Conexão</button>
                </div>
            </div>
        </div>
    );
};

const QuickAnswerModal = ({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (data: {shortcut: string, message: string}) => void }) => {
    const [shortcut, setShortcut] = useState('');
    const [message, setMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!shortcut || !message) return;
        onSave({ shortcut, message });
        setShortcut('');
        setMessage('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in font-sans">
            <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Adicionar Resposta Rápida</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times"></i></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Atalho</label>
                        <input 
                            type="text" 
                            value={shortcut} 
                            onChange={e => setShortcut(e.target.value)} 
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="Ex: bomdia"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mensagem</label>
                        <textarea 
                            value={message} 
                            onChange={e => setMessage(e.target.value)} 
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-32 resize-none"
                            placeholder="Digite a mensagem completa..."
                        />
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 font-bold text-sm hover:bg-gray-200 rounded">Cancelar</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded hover:bg-blue-700 shadow-sm">Salvar</button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---

export default function ChatCrmPage({ onNavigateToDashboard }: { onNavigateToDashboard: () => void }) {
    const { user } = useUser();
    const [activeView, setActiveView] = useState<MenuOption>('quick_answers'); 
    
    // Real Data State
    const [quickAnswers, setQuickAnswers] = useState<QuickAnswer[]>([]);
    const [connections, setConnections] = useState<ChatConnection[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Modal Control
    const [showConnectionModal, setShowConnectionModal] = useState(false);
    const [showQAModal, setShowQAModal] = useState(false);
    
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        if (!user) return;
        
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [qa, conns] = await Promise.all([
                    getQuickAnswers(user.id),
                    getConnections(user.id)
                ]);
                setQuickAnswers(qa);
                setConnections(conns);
            } catch (e: any) {
                console.error("Erro ao carregar dados do chat:", e);
                // Handle "relation does not exist" error
                if (e.message && (e.message.includes('relation') || e.message.includes('does not exist'))) {
                    setError('Tabelas de Chat não encontradas no banco de dados.');
                } else {
                    setToast({ message: "Erro ao carregar dados.", type: 'error' });
                }
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [user]);

    // --- QUICK ANSWERS LOGIC ---
    const handleAddQuickAnswer = async (data: { shortcut: string, message: string }) => {
        if (!user) return;
        try {
            const newAns = await createQuickAnswer(data, user.id);
            setQuickAnswers([...quickAnswers, newAns as QuickAnswer]);
            setToast({ message: "Resposta rápida adicionada!", type: 'success' });
        } catch (e) {
            setToast({ message: "Erro ao salvar.", type: 'error' });
        }
    };

    const handleDeleteQuickAnswer = async (id: string) => {
        if(confirm('Tem certeza?')) {
            try {
                await deleteQuickAnswer(id);
                setQuickAnswers(quickAnswers.filter(a => a.id !== id));
                setToast({ message: "Item removido.", type: 'success' });
            } catch(e) {
                setToast({ message: "Erro ao deletar.", type: 'error' });
            }
        }
    };

    // --- CONNECTIONS LOGIC ---
    const handleSaveConnection = async (data: any) => {
        if (!user) return;
        try {
            const newConn = await createConnection(data, user.id);
            setConnections([...connections, newConn as ChatConnection]);
            setShowConnectionModal(false);
            setToast({ message: "Conexão criada com sucesso!", type: 'success' });
        } catch (e: any) {
            setToast({ message: "Erro ao criar conexão: " + e.message, type: 'error' });
        }
    };

    const handleDeleteConnection = async (id: string) => {
        if(confirm('Desconectar e remover esta conexão?')) {
            try {
                await deleteConnection(id);
                setConnections(connections.filter(c => c.id !== id));
                setToast({ message: "Conexão removida.", type: 'success' });
            } catch(e) {
                setToast({ message: "Erro ao remover.", type: 'error' });
            }
        }
    };

    const handleSimulateScan = async (id: string) => {
        try {
            await simulateConnectionScan(id);
            setConnections(prev => prev.map(c => c.id === id ? { ...c, status: 'connected', qrcode: undefined } : c));
            setToast({ message: "Dispositivo conectado!", type: 'success' });
        } catch(e) {
            setToast({ message: "Erro na simulação.", type: 'error' });
        }
    };

    if (error) {
        return (
            <div className="flex h-screen bg-[#F4F5F7] font-sans items-center justify-center">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg text-center border border-red-200">
                    <i className="fas fa-database text-4xl text-red-500 mb-4"></i>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Configuração Necessária</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <p className="text-sm text-gray-500 mb-6">
                        Por favor, acesse o painel Admin e execute o script SQL de atualização na aba "Updates & SQL" para criar as tabelas necessárias.
                    </p>
                    <button onClick={onNavigateToDashboard} className="px-6 py-2 bg-gray-800 text-white rounded font-bold hover:bg-gray-700 transition">
                        Voltar ao Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#F4F5F7] font-sans overflow-hidden">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            {/* Sidebar Navigation */}
            <Sidebar active={activeView} onChange={setActiveView} />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Top Header - Contextual */}
                <header className="h-16 bg-white border-b border-gray-200 flex justify-between items-center px-6 shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={onNavigateToDashboard} className="text-gray-400 hover:text-blue-600 transition"><i className="fas fa-arrow-left"></i></button>
                        <h1 className="text-xl font-bold text-gray-700 capitalize">{activeView.replace('_', ' ')}</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="text-gray-400 hover:text-blue-500"><i className="fas fa-bell"></i></button>
                        <button className="text-gray-400 hover:text-blue-500"><i className="fas fa-question-circle"></i></button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar flex">
                    {activeView === 'quick_answers' && (
                        <QuickAnswersView 
                            answers={quickAnswers} 
                            onDelete={handleDeleteQuickAnswer} 
                            onAdd={() => setShowQAModal(true)}
                            loading={loading}
                        />
                    )}

                    {activeView === 'connections' && (
                        <ConnectionsView 
                            connections={connections} 
                            onDelete={handleDeleteConnection} 
                            onAdd={() => setShowConnectionModal(true)}
                            onSimulateScan={handleSimulateScan}
                            loading={loading}
                        />
                    )}

                    {/* Placeholder for other views */}
                    {['dashboard', 'chats', 'contacts', 'tags', 'schedules', 'support', 'account'].includes(activeView) && (
                        <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <i className="fas fa-tools text-4xl text-gray-300"></i>
                            </div>
                            <h3 className="text-xl font-bold text-gray-600 mb-2">Módulo em Desenvolvimento</h3>
                            <p className="text-sm">A funcionalidade <strong>{activeView}</strong> estará disponível em breve.</p>
                            <button onClick={onNavigateToDashboard} className="mt-6 px-6 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition shadow-sm">
                                Voltar ao App Anterior
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            <ConnectionModal 
                isOpen={showConnectionModal} 
                onClose={() => setShowConnectionModal(false)} 
                onSave={handleSaveConnection} 
            />

            <QuickAnswerModal 
                isOpen={showQAModal}
                onClose={() => setShowQAModal(false)}
                onSave={handleAddQuickAnswer}
            />
        </div>
    );
}
