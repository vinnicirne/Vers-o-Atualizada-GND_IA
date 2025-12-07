

import React, { useState, useEffect, useCallback } from 'react';
import { getPopups, createPopup, updatePopup, deletePopup } from '../../services/adminService';
import { Popup } from '../../types';
import { Toast } from './Toast';
import { useUser } from '../../contexts/UserContext';

const DEFAULT_POPUP: Omit<Popup, 'id' | 'created_at'> = {
    title: '',
    content: '',
    type: 'text',
    media_url: '',
    style: {
        background_color: '#ffffff',
        text_color: '#263238',
        button_color: '#10B981',
        button_text_color: '#ffffff',
        theme: 'default'
    },
    trigger_settings: {
        delay: 5,
        frequency: 'once',
        button_text: 'Fechar',
        button_link: ''
    },
    is_active: true
};

const AFFILIATE_TEMPLATE: Omit<Popup, 'id' | 'created_at'> = {
    title: 'Torne-se um Parceiro',
    content: 'Gostou do sistema? Indique o GDN_IA para amigos e ganhe 20% de comissão recorrente por cada assinatura realizada através do seu link exclusivo.',
    type: 'image',
    media_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', // Ícone genérico de aperto de mão/dinheiro (fallback se não tiver no renderer)
    style: {
        background_color: '#111827', // Dark Gray (Quase preto)
        text_color: '#FBBF24',       // Amber 400 (Dourado)
        button_color: '#D97706',     // Amber 600 (Dourado Escuro)
        button_text_color: '#000000', // Preto
        theme: 'dark_gold' // ATIVA O DESIGN PREMIUM
    },
    trigger_settings: {
        delay: 3,
        frequency: 'once', // Mostrar apenas uma vez
        button_text: 'Quero meu Link',
        button_link: '/?open_affiliate=true' // Link interno
    },
    is_active: true
};

const FEEDBACK_TEMPLATE: Omit<Popup, 'id' | 'created_at'> = {
    title: 'Sua opinião vale muito!',
    content: 'Estamos construindo o GDN_IA com a ajuda da comunidade. Conte o que você está achando e ajude a priorizar as próximas features no nosso Mural do Cliente.',
    type: 'image',
    media_url: 'https://cdn-icons-png.flaticon.com/512/1484/1484560.png', // Ícone de Estrela/Feedback
    style: {
        background_color: '#ffffff',
        text_color: '#263238',
        button_color: '#7C3AED', // Purple 600
        button_text_color: '#ffffff',
        theme: 'default'
    },
    trigger_settings: {
        delay: 15, // Espera um pouco mais
        frequency: 'once',
        button_text: 'Avaliar Agora',
        button_link: '/?page=feedback' // Redireciona para página de feedback
    },
    is_active: true
};

export function PopupManager() {
    const { user: adminUser } = useUser();
    const [popups, setPopups] = useState<Popup[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState(DEFAULT_POPUP);
    const [saving, setSaving] = useState(false);

    const fetchPopups = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getPopups(true); // Fetch only active
            
            // Filter logic based on localStorage/frequency
            const validPopups = data.filter(popup => {
                const lastShown = localStorage.getItem(`gdn_popup_${popup.id}`);
                
                if (popup.trigger_settings.frequency === 'always') return true;
                
                if (popup.trigger_settings.frequency === 'once') {
                    return !lastShown;
                }
                
                if (popup.trigger_settings.frequency === 'daily') {
                    if (!lastShown) return true;
                    const lastDate = new Date(lastShown);
                    const now = new Date();
                    return now.toDateString() !== lastDate.toDateString();
                }
                
                return true;
            });

            if (validPopups.length > 0) {
                // Show the first eligible popup
                // schedulePopup(validPopups[0]); // This is client-side in PopupRenderer
            }

            setPopups(data); // Set all popups for admin to view
        } catch (e) {
            console.warn("Failed to load popups:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPopups();
    }, [fetchPopups]);

    const handleCreateNew = () => {
        setEditingPopup(null);
        setFormData(DEFAULT_POPUP);
        setIsFormOpen(true);
    };

    const handleLoadTemplate = (template: typeof DEFAULT_POPUP, name: string) => {
        setEditingPopup(null);
        setFormData(template);
        setIsFormOpen(true);
        setToast({ message: `Template '${name}' carregado! Salve para ativar.`, type: 'success' });
    };

    const handleEdit = (popup: Popup) => {
        setEditingPopup(popup);
        setFormData({
            title: popup.title,
            content: popup.content,
            type: popup.type,
            media_url: popup.media_url,
            style: popup.style,
            trigger_settings: popup.trigger_settings,
            is_active: popup.is_active
        });
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja excluir este popup?")) return;
        if (!adminUser) return;

        try {
            await deletePopup(id, adminUser.id);
            setToast({ message: "Popup excluído com sucesso!", type: 'success' });
            fetchPopups();
        } catch (error: any) {
            setToast({ message: "Erro ao excluir popup.", type: 'error' });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminUser) return;

        // Basic Validation
        if (!formData.title) {
            setToast({ message: "Título é obrigatório.", type: 'error' });
            return;
        }
        
        // Em dark_gold, media_url pode ser opcional ou usado como icone
        if ((formData.type === 'image' || formData.type === 'video') && !formData.media_url && formData.style.theme !== 'dark_gold') {
            setToast({ message: "URL da mídia é obrigatória para Imagem/Vídeo.", type: 'error' });
            return;
        }

        setSaving(true);
        try {
            if (editingPopup) {
                await updatePopup(editingPopup.id, formData, adminUser.id);
                setToast({ message: "Popup atualizado com sucesso!", type: 'success' });
            } else {
                await createPopup(formData, adminUser.id);
                setToast({ message: "Popup criado com sucesso!", type: 'success' });
            }
            setIsFormOpen(false);
            fetchPopups();
        } catch (error: any) {
            setToast({ message: `Erro ao salvar: ${error.message}`, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNestedChange = (parent: 'style' | 'trigger_settings', field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [parent]: { ...prev[parent], [field]: value }
        }));
    };

    return (
        <div className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {!isFormOpen ? (
                // LIST VIEW
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-[#263238]">Gerenciador de Popups</h2>
                            <p className="text-sm text-gray-500">Crie avisos, promoções ou mensagens de boas-vindas.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleLoadTemplate(AFFILIATE_TEMPLATE, 'Afiliados Gold')}
                                className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-2 rounded-lg hover:bg-yellow-100 transition font-bold flex items-center gap-2 text-xs"
                            >
                                <i className="fas fa-hand-holding-dollar"></i> Template Afiliados
                            </button>
                            <button
                                onClick={() => handleLoadTemplate(FEEDBACK_TEMPLATE, 'Convite Feedback')}
                                className="bg-purple-50 text-purple-700 border border-purple-200 px-3 py-2 rounded-lg hover:bg-purple-100 transition font-bold flex items-center gap-2 text-xs"
                            >
                                <i className="fas fa-star"></i> Template Feedback
                            </button>
                            <button
                                onClick={handleCreateNew}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-bold flex items-center gap-2 text-sm"
                            >
                                <i className="fas fa-plus"></i> Novo Popup
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12"><i className="fas fa-spinner fa-spin text-2xl text-green-600"></i></div>
                    ) : popups.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-gray-500">
                            Nenhum popup configurado.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {popups.map(popup => (
                                <div key={popup.id} className={`border rounded-xl p-4 transition ${popup.is_active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'} ${popup.style.theme === 'dark_gold' ? 'ring-1 ring-yellow-400' : ''}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex gap-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded capitalize ${popup.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                                {popup.is_active ? 'Ativo' : 'Inativo'}
                                            </span>
                                            {popup.style.theme === 'dark_gold' && (
                                                <span className="text-xs font-bold px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">
                                                    Gold
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEdit(popup)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><i className="fas fa-edit"></i></button>
                                            <button onClick={() => handleDelete(popup.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><i className="fas fa-trash"></i></button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-gray-800 mb-1 truncate" title={popup.title}>{popup.title}</h3>
                                    <p className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                                        <i className={`fas ${popup.type === 'video' ? 'fa-video' : popup.type === 'image' ? 'fa-image' : 'fa-align-left'}`}></i>
                                        {popup.type.toUpperCase()} • {popup.trigger_settings.frequency === 'once' ? 'Uma vez' : popup.trigger_settings.frequency === 'always' ? 'Sempre' : 'Diário'}
                                    </p>
                                    <div className="text-xs text-gray-400 truncate">
                                        Delay: {popup.trigger_settings.delay}s
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                // FORM VIEW
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-[#263238]">{editingPopup ? 'Editar Popup' : 'Novo Popup'}</h2>
                        <button onClick={() => setIsFormOpen(false)} className="text-gray-500 hover:text-gray-700"><i className="fas fa-times text-xl"></i></button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        
                        {/* Conteúdo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Conteúdo</h3>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Título</label>
                                    <input type="text" value={formData.title} onChange={e => handleChange('title', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Tipo de Mídia</label>
                                    <select value={formData.type} onChange={e => handleChange('type', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500">
                                        <option value="text">Apenas Texto</option>
                                        <option value="image">Imagem</option>
                                        <option value="video">Vídeo (YouTube/MP4)</option>
                                    </select>
                                </div>
                                {(formData.type === 'image' || formData.type === 'video') && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">URL da Mídia</label>
                                        <input type="text" value={formData.media_url} onChange={e => handleChange('media_url', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500" placeholder="https://..." />
                                        <p className="text-[10px] text-gray-400 mt-1">Dica: Para o template de afiliados, use uma imagem PNG transparente.</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Texto / Descrição</label>
                                    <textarea value={formData.content} onChange={e => handleChange('content', e.target.value)} rows={4} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500" />
                                </div>
                            </div>

                            {/* Configuração Visual e Gatilhos */}
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Aparência</h3>
                                    
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Tema Visual</label>
                                        <select 
                                            value={formData.style.theme || 'default'} 
                                            onChange={e => handleNestedChange('style', 'theme', e.target.value)} 
                                            className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm focus:ring-green-500"
                                        >
                                            <option value="default">Padrão (Customizável)</option>
                                            <option value="dark_gold">Afiliados Gold (Premium)</option>
                                        </select>
                                        <p className="text-[10px] text-gray-400 mt-1">O tema 'Afiliados Gold' ignora algumas cores personalizadas para manter o estilo premium.</p>
                                    </div>

                                    {formData.style.theme !== 'dark_gold' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Fundo</label>
                                                <div className="flex items