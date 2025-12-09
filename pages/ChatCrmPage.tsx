
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { Header } from '../components/Header';
import { Ticket, Message, ChatQueue, QuickAnswer, ChatConnection } from '../types';
import { Toast } from '../components/admin/Toast';
import { v4 as uuidv4 } from 'uuid';

// --- MOCK DATA FOR UI ---
const MOCK_QUEUES: ChatQueue[] = [
    { id: 'q1', name: 'Suporte', color: '#3B82F6' },
    { id: 'q2', name: 'Financeiro', color: '#10B981' },
    { id: 'q3', name: 'Vendas', color: '#F59E0B' },
];

const MOCK_TICKETS: Ticket[] = [
    { id: 't1', contactId: '1', contact: { id: '1', name: 'João Silva', number: '5511999999999', profilePicUrl: 'https://ui-avatars.com/api/?name=Joao+Silva&background=0D8ABC&color=fff' }, status: 'open', unreadCount: 2, lastMessage: 'Gostaria de saber mais sobre o plano Premium.', updatedAt: new Date().toISOString(), ownerId: '1', queueId: 'q3', tags: ['vendas'], botEnabled: false },
    { id: 't2', contactId: '2', contact: { id: '2', name: 'Maria Oliveira', number: '5521988888888', profilePicUrl: 'https://ui-avatars.com/api/?name=Maria+Oliveira&background=random' }, status: 'pending', unreadCount: 0, lastMessage: 'Obrigada pelo retorno!', updatedAt: new Date(Date.now() - 3600000).toISOString(), ownerId: null, queueId: 'q1', tags: ['suporte'], botEnabled: true },
];

const MOCK_QUICK_ANSWERS: QuickAnswer[] = [
    { id: '1', shortcut: 'bomdia', message: 'Olá! Bom dia, como posso ajudar?' },
    { id: '2', shortcut: 'pix', message: 'Nossa chave Pix é: cnpj@empresa.com' },
];

type MenuOption = 'dashboard' | 'connections' | 'chats' | 'contacts' | 'tags' | 'quick_answers' | 'schedules' | 'support' | 'account';

// --- COMPONENTS ---

// 1. SIDEBAR (Whaticket Style)
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
                <div className="flex items-center gap-2 text-white font-bold text-xl">
                    <i className="fab fa-whatsapp text-2xl"></i>
                    <span>Whaticket</span>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 space-y-1">
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
                <div className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="flex items-center gap-2"><i className="fas fa-moon"></i> Modo escuro</span>
                    <div className="w-8 h-4 bg-blue-600 rounded-full relative cursor-pointer">
                        <div className="absolute right-0.5 top-0.5 bg-white w-3 h-3 rounded-full"></div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

// 2. QUICK ANSWERS VIEW
const QuickAnswersView = ({ answers, onDelete, onAdd }: { answers: QuickAnswer[], onDelete: (id: string) => void, onAdd: () => void }) => {
    return (
        <div className="p-8 animate-fade-in w-full">
            <h2 className="text-2xl font-bold text-[#343a40] mb-6">Respostas rápidas</h2>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Actions Toolbar */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-4">
                        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition">
                            Departamentos <i className="fas fa-caret-down ml-2"></i>
                        </button>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Pesquisar" 
                                className="pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 rounded-full text-sm outline-none transition w-64"
                            />
                            <i className="fas fa-search absolute left-3 top-2.5 text-gray-400"></i>
                        </div>
                    </div>
                    <button 
                        onClick={onAdd}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-bold hover:bg-blue-600 transition shadow-sm uppercase tracking-wide"
                    >
                        ADICIONAR RESPOSTA RÁPIDA
                    </button>
                </div>

                {/* Table */}
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white text-gray-600 border-b border-gray-200">
                            <th className="px-6 py-4 font-bold text-sm">Atalho</th>
                            <th className="px-6 py-4 font-bold text-sm">Mensagem</th>
                            <th className="px-6 py-4 font-bold text-sm text-center w-32">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {answers.length === 0 ? (
                            <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">Nenhum registro encontrado</td></tr>
                        ) : (
                            answers.map(ans => (
                                <tr key={ans.id} className="hover:bg-gray-50 transition text-sm text-gray-700">
                                    <td className="px-6 py-4">{ans.shortcut}</td>
                                    <td className="px-6 py-4">{ans.message}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-3">
                                            <button className="text-gray-400 hover:text-blue-500 transition"><i className="fas fa-edit"></i></button>
                                            <button onClick={() => onDelete(ans.id)} className="text-gray-400 hover:text-red-500 transition"><i className="fas fa-trash-alt"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                
                {/* Pagination (Visual) */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end items-center gap-4 text-xs text-gray-500">
                    <span>1-{answers.length} de {answers.length}</span>
                    <div className="flex gap-2">
                        <button disabled className="text-gray-300 cursor-not-allowed"><i className="fas fa-chevron-left"></i></button>
                        <button disabled className="text-gray-300 cursor-not-allowed"><i className="fas fa-chevron-right"></i></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 3. CONNECTION MODAL
const ConnectionModal = ({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (data: any) => void }) => {
    const [name, setName] = useState('');
    const [greeting, setGreeting] = useState('');
    const [farewell, setFarewell] = useState('');
    
    if (!isOpen) return null;

    const inputClass = "w-full bg-transparent border border-gray-600 rounded px-3 py-3 text-gray-200 focus:border-blue-500 outline-none transition";
    const labelClass = "absolute left-3 -top-2.5 bg-[#2a2a3c] px-1 text-xs text-blue-400";

    const Toolbar = () => (
        <div className="flex gap-4 mb-2 text-gray-400 text-sm">
            <button className="hover:text-white font-bold">B</button>
            <button className="hover:text-white italic">I</button>
            <button className="hover:text-white underline">U</button>
            <button className="hover:text-white"><i className="far fa-smile"></i></button>
            <button className="hover:text-white"><i className="fas fa-paperclip"></i></button>
        </div>
    );

    const VariableChip = ({ label }: { label: string }) => (
        <span className="bg-[#3e3e55] text-gray-300 px-2 py-1 rounded-full text-xs cursor-pointer hover:bg-gray-600 transition">{label}</span>
    );

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in font-sans">
            <div className="bg-[#2a2a3c] w-full max-w-2xl rounded shadow-2xl flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-700">
                    <h3 className="text-lg font-medium text-white">Adicionar conexão</h3>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {/* Nome */}
                    <div className="relative mt-2">
                        <label className={labelClass}>Nome</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
                    </div>

                    {/* Saudação */}
                    <div className="relative border border-gray-600 rounded p-3 pt-4">
                        <label className={labelClass}>Mensagem de saudação</label>
                        <textarea 
                            value={greeting} 
                            onChange={e => setGreeting(e.target.value)} 
                            className="w-full bg-transparent text-gray-200 outline-none resize-none h-20"
                        />
                        <Toolbar />
                    </div>

                    {/* Despedida */}
                    <div className="relative border border-gray-600 rounded p-3 pt-4">
                        <label className={labelClass}>Mensagem de despedida <i className="far fa-question-circle ml-1"></i></label>
                        <textarea 
                            value={farewell} 
                            onChange={e => setFarewell(e.target.value)} 
                            className="w-full bg-transparent text-gray-200 outline-none resize-none h-20"
                        />
                        <Toolbar />
                    </div>

                    {/* Variáveis */}
                    <div>
                        <p className="text-xs text-gray-500 mb-2">Variáveis disponíveis</p>
                        <div className="flex flex-wrap gap-2">
                            <VariableChip label="Saudações" />
                            <VariableChip label="Apelido do contato" />
                            <VariableChip label="Nome do contato" />
                            <VariableChip label="Número de contato" />
                            <VariableChip label="Número do protocolo" />
                            <VariableChip label="Endereço de Email" />
                        </div>
                    </div>

                    {/* Dropdowns & Extras */}
                    <div>
                        <div className="relative mt-4 mb-6">
                            <label className={labelClass}>Departamentos</label>
                            <div className={`${inputClass} flex justify-between items-center cursor-pointer`}>
                                <span className="text-gray-400">Selecione...</span>
                                <i className="fas fa-caret-down text-gray-500"></i>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <label className={labelClass}>Reiniciar o chatbot após</label>
                                <div className="flex items-center border border-gray-600 rounded">
                                    <input type="number" defaultValue={15} className="bg-transparent text-gray-200 px-3 py-3 w-full outline-none" />
                                    <span className="text-gray-500 pr-3">min</span>
                                    <i className="far fa-question-circle text-gray-500 pr-2"></i>
                                </div>
                            </div>
                            <div className="relative">
                                <label className={labelClass}>Tipo de visualização das opções</label>
                                <select className={`${inputClass} appearance-none bg-[#2a2a3c]`}>
                                    <option>Números</option>
                                    <option>Botões</option>
                                    <option>Listas</option>
                                </select>
                                <i className="fas fa-caret-down absolute right-3 top-4 text-gray-500 pointer-events-none"></i>
                                <a href="#" className="text-blue-400 text-xs mt-1 block hover:underline">Saiba mais</a>
                            </div>
                        </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="w-5 h-5 border-2 border-gray-500 rounded flex items-center justify-center group-hover:border-gray-400">
                            {/* Check mock */}
                        </div>
                        <span className="text-gray-300 text-sm">Atribuir essa conexão à todos os chats que não tem conexão</span>
                    </label>
                </div>

                <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="text-blue-400 hover:text-blue-300 font-medium text-sm px-4 py-2 uppercase transition">Cancelar</button>
                    <button onClick={() => onSave({ name, greeting, farewell })} className="bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm px-6 py-2 rounded uppercase shadow-md transition">Adicionar</button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---

export default function ChatCrmPage({ onNavigateToDashboard }: { onNavigateToDashboard: () => void }) {
    const [activeView, setActiveView] = useState<MenuOption>('quick_answers'); // Default to show requested UI
    const [quickAnswers, setQuickAnswers] = useState<QuickAnswer[]>(MOCK_QUICK_ANSWERS);
    const [connections, setConnections] = useState<ChatConnection[]>([]);
    const [showConnectionModal, setShowConnectionModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleAddQuickAnswer = () => {
        const id = uuidv4();
        const newAns = { id, shortcut: `novo${id.slice(0,4)}`, message: 'Nova mensagem de resposta rápida.' };
        setQuickAnswers([...quickAnswers, newAns]);
        setToast({ message: "Resposta rápida adicionada!", type: 'success' });
    };

    const handleDeleteQuickAnswer = (id: string) => {
        if(confirm('Tem certeza?')) {
            setQuickAnswers(quickAnswers.filter(a => a.id !== id));
            setToast({ message: "Item removido.", type: 'success' });
        }
    };

    const handleSaveConnection = (data: any) => {
        console.log("Saving connection:", data);
        setConnections([...connections, { id: uuidv4(), name: data.name || 'Nova Conexão', status: 'disconnected' }]);
        setShowConnectionModal(false);
        setToast({ message: "Conexão salva com sucesso!", type: 'success' });
    };

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
                            onAdd={handleAddQuickAnswer}
                        />
                    )}

                    {activeView === 'connections' && (
                        <div className="p-8 w-full">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-[#343a40]">Conexões</h2>
                                <button onClick={() => setShowConnectionModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-bold uppercase hover:bg-blue-600 transition">Adicionar Conexão</button>
                            </div>
                            {connections.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-500">
                                    <i className="fas fa-wifi text-4xl mb-4 text-gray-300"></i>
                                    <p>Nenhuma conexão configurada.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {connections.map(conn => (
                                        <div key={conn.id} className="bg-white p-4 rounded shadow-sm border border-gray-200 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                <span className="font-bold text-gray-700">{conn.name}</span>
                                            </div>
                                            <button className="text-red-500 hover:bg-red-50 p-2 rounded"><i className="fas fa-trash"></i></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {(activeView === 'dashboard' || activeView === 'chats' || activeView === 'contacts') && (
                        <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                            <i className="fas fa-tools text-6xl mb-4 opacity-50"></i>
                            <p className="text-lg">Módulo em construção na nova interface.</p>
                            <button onClick={onNavigateToDashboard} className="mt-4 text-blue-500 hover:underline">Voltar ao App Anterior</button>
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
        </div>
    );
}
