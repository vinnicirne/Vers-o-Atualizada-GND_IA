
import React, { useState, useEffect, useRef } from 'react';
// FIX: Imported searchUsers from adminService
import { sendSystemNotification, searchUsers } from '../../services/adminService';
import { useUser } from '../../contexts/UserContext';
import { Toast } from './Toast';
import { User } from '../../types';

export function NotificationManager() {
    const { user: adminUser } = useUser();
    
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
    const [target, setTarget] = useState<'all' | 'specific'>('all');
    const [link, setLink] = useState('');
    
    // Search States
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Debounce effect for search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length >= 3 && !selectedUser) {
                setIsSearching(true);
                try {
                    // FIX: Call searchUsers
                    const results = await searchUsers(searchTerm);
                    setSearchResults(results);
                    setShowDropdown(true);
                } catch (error) {
                    console.error("Erro na busca:", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setShowDropdown(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, selectedUser]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        setSearchTerm('');
        setSearchResults([]);
        setShowDropdown(false);
    };

    const handleClearSelection = () => {
        setSelectedUser(null);
        setSearchTerm('');
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminUser) return;
        if (!title.trim() || !message.trim()) {
            setToast({ message: "Título e mensagem são obrigatórios.", type: 'error' });
            return;
        }
        if (target === 'specific' && !selectedUser) {
            setToast({ message: "Selecione um usuário para o envio individual.", type: 'error' });
            return;
        }

        setSending(true);
        try {
            const recipient = target === 'all' ? 'all' : selectedUser!.id;
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
            if (target === 'specific') {
                handleClearSelection();
            }
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
                                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded border flex-1 transition ${target === 'all' ? 'bg-blue-50 border-blue-500 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                    <input 
                                        type="radio" 
                                        name="target" 
                                        value="all" 
                                        checked={target === 'all'} 
                                        onChange={() => { setTarget('all'); handleClearSelection(); }}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium">Todos (Broadcast)</span>
                                </label>
                                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded border flex-1 transition ${target === 'specific' ? 'bg-blue-50 border-blue-500 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                    <input 
                                        type="radio" 
                                        name="target" 
                                        value="specific" 
                                        checked={target === 'specific'} 
                                        onChange={() => setTarget('specific')}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium">Usuário Específico</span>
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
                        <div className="animate-fade-in relative" ref={dropdownRef}>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Buscar Usuário (Nome, Email ou ID)</label>
                            
                            {!selectedUser ? (
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onFocus={() => { if(searchResults.length > 0) setShowDropdown(true); }}
                                        className="w-full bg-white border border-gray-300 rounded p-2 pl-9 text-sm focus:border-blue-500 outline-none transition"
                                        placeholder="Digite para buscar..."
                                    />
                                    <div className="absolute left-3 top-2.5 text-gray-400">
                                        {isSearching ? <i className="fas fa-spinner fa-spin text-blue-500"></i> : <i className="fas fa-search"></i>}
                                    </div>

                                    {/* Dropdown Results */}
                                    {showDropdown && (
                                        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                                            {searchResults.length > 0 ? (
                                                searchResults.map(u => (
                                                    <div 
                                                        key={u.id}
                                                        onClick={() => handleSelectUser(u)}
                                                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 transition"
                                                    >
                                                        <p className="text-sm font-bold text-gray-800">{u.full_name || 'Sem nome'}</p>
                                                        <p className="text-xs text-gray-500">{u.email}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-3 text-sm text-gray-500 text-center">Nenhum usuário encontrado.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Selected User Card
                                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-3 rounded-lg animate-fade-in-scale">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center font-bold">
                                            {selectedUser.full_name?.charAt(0).toUpperCase() || selectedUser.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[#263238]">{selectedUser.full_name || 'Sem nome'}</p>
                                            <p className="text-xs text-gray-500">{selectedUser.email}</p>
                                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{selectedUser.id}</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={handleClearSelection}
                                        className="text-gray-400 hover:text-red-500 hover:bg-white p-2 rounded-full transition"
                                        title="Remover seleção"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            )}
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