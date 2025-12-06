
import React, { useState, useEffect, useCallback } from 'react';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext';
import { useUser } from '../../contexts/UserContext';
import { Toast } from './Toast';
import { WhiteLabelSettings } from '../../types';

export function WhiteLabelManager() {
    const { settings, loading, error, updateSettings, refreshSettings } = useWhiteLabel();
    const { user: adminUser } = useUser();
    
    const [formData, setFormData] = useState<WhiteLabelSettings>(settings);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Update form data when settings from context change
    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleColorChange = (name: keyof WhiteLabelSettings, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!adminUser) {
            setToast({ message: "Sessão de administrador inválida.", type: 'error' });
            return;
        }

        setSaving(true);
        try {
            await updateSettings(formData, adminUser.id);
            setToast({ message: "Configurações de White Label salvas com sucesso!", type: 'success' });
        } catch (err: any) {
            setToast({ message: err.message || "Falha ao salvar configurações de White Label.", type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center p-8">
                <i className="fas fa-spinner fa-spin text-2xl text-[var(--brand-tertiary)]"></i>
                <p className="mt-2 text-gray-500">Carregando configurações de branding...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
                <strong>Erro:</strong> {error}
            </div>
        );
    }

    const inputClasses = "w-full bg-white border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300";
    const labelClasses = "block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500";
    const sectionTitleClasses = "text-xl font-bold text-[var(--brand-secondary)] mb-4 border-b border-gray-200 pb-2";

    return (
        <div className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--brand-secondary)]">Gerenciar White Label</h2>
                        <p className="text-sm text-gray-500">Personalize o branding da sua aplicação.</p>
                        <p className="text-xs text-red-500 mt-2"><i className="fas fa-exclamation-triangle mr-1"></i> As mudanças podem exigir uma atualização de página para serem totalmente aplicadas.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 font-bold text-sm text-white bg-[var(--brand-tertiary)] rounded-lg hover:bg-green-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
                    >
                        {saving ? <><i className="fas fa-spinner fa-spin"></i>Salvando...</> : <><i className="fas fa-save"></i>Salvar Configurações</>}
                    </button>
                </div>

                <div className="space-y-8">
                    {/* Informações Básicas */}
                    <div>
                        <h3 className={sectionTitleClasses}>Informações da Marca</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="appName" className={labelClasses}>Nome do Aplicativo</label>
                                <input type="text" id="appName" name="appName" value={formData.appName} onChange={handleChange} className={inputClasses} placeholder="Ex: Minha Empresa AI" />
                            </div>
                            <div>
                                <label htmlFor="appTagline" className={labelClasses}>Slogan / Tagline</label>
                                <input type="text" id="appTagline" name="appTagline" value={formData.appTagline} onChange={handleChange} className={inputClasses} placeholder="Ex: Sua Suíte de Criação Inteligente" />
                            </div>
                            <div>
                                <label htmlFor="logoTextPart1" className={labelClasses}>Logo Parte 1</label>
                                <input type="text" id="logoTextPart1" name="logoTextPart1" value={formData.logoTextPart1} onChange={handleChange} className={inputClasses} placeholder="Ex: Minha" />
                            </div>
                            <div>
                                <label htmlFor="logoTextPart2" className={labelClasses}>Logo Parte 2</label>
                                <input type="text" id="logoTextPart2" name="logoTextPart2" value={formData.logoTextPart2} onChange={handleChange} className={inputClasses} placeholder="Ex: Marca" />
                            </div>
                            <div>
                                <label htmlFor="dashboardTitle" className={labelClasses}>Título do Dashboard (App)</label>
                                <input type="text" id="dashboardTitle" name="dashboardTitle" value={formData.dashboardTitle} onChange={handleChange} className={inputClasses} placeholder="Ex: Central de Criação" />
                            </div>
                             <div>
                                <label htmlFor="appVersion" className={labelClasses}>Versão do App</label>
                                <input type="text" id="appVersion" name="appVersion" value={formData.appVersion} onChange={handleChange} className={inputClasses} placeholder="Ex: 1.0.0" />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="copyrightText" className={labelClasses}>Texto de Copyright (Rodapé)</label>
                                <input type="text" id="copyrightText" name="copyrightText" value={formData.copyrightText} onChange={handleChange} className={inputClasses} placeholder="Ex: © 2024 Minha Empresa. Todos os direitos reservados." />
                            </div>
                        </div>
                    </div>

                    {/* Cores da Marca */}
                    <div>
                        <h3 className={sectionTitleClasses}>Cores da Marca</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="primaryColorHex" className={labelClasses}>Cor Primária</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" id="primaryColorHex" value={formData.primaryColorHex} onChange={e => handleColorChange('primaryColorHex', e.target.value)} className="h-10 w-12 rounded border cursor-pointer" />
                                    <input type="text" value={formData.primaryColorHex} onChange={e => handleColorChange('primaryColorHex', e.target.value)} className={inputClasses} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="secondaryColorHex" className={labelClasses}>Cor Secundária</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" id="secondaryColorHex" value={formData.secondaryColorHex} onChange={e => handleColorChange('secondaryColorHex', e.target.value)} className="h-10 w-12 rounded border cursor-pointer" />
                                    <input type="text" value={formData.secondaryColorHex} onChange={e => handleColorChange('secondaryColorHex', e.target.value)} className={inputClasses} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="tertiaryColorHex" className={labelClasses}>Cor Terciária (Destaque)</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" id="tertiaryColorHex" value={formData.tertiaryColorHex} onChange={e => handleColorChange('tertiaryColorHex', e.target.value)} className="h-10 w-12 rounded border cursor-pointer" />
                                    <input type="text" value={formData.tertiaryColorHex} onChange={e => handleColorChange('tertiaryColorHex', e.target.value)} className={inputClasses} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ícones e Imagens */}
                    <div>
                        <h3 className={sectionTitleClasses}>Ícones e Imagens</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="faviconUrl" className={labelClasses}>URL do Favicon / Ícone App</label>
                                <input type="text" id="faviconUrl" name="faviconUrl" value={formData.faviconUrl} onChange={handleChange} className={inputClasses} placeholder="Ex: https://minhaempresa.com/favicon.png" />
                                <p className="text-xs text-gray-500 mt-1">Recomendado: Imagem PNG 192x192 ou 512x512</p>
                            </div>
                            <div>
                                <label htmlFor="ogImageUrl" className={labelClasses}>URL da Imagem Open Graph (SEO)</label>
                                <input type="text" id="ogImageUrl" name="ogImageUrl" value={formData.ogImageUrl} onChange={handleChange} className={inputClasses} placeholder="Ex: https://minhaempresa.com/og-image.jpg" />
                                <p className="text-xs text-gray-500 mt-1">Recomendado: Imagem 1200x630px para compartilhamento.</p>
                            </div>
                        </div>
                    </div>

                    {/* Integrações */}
                    <div>
                        <h3 className={sectionTitleClasses}>Integrações</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="wordpressPluginName" className={labelClasses}>Nome do Plugin WordPress</label>
                                <input type="text" id="wordpressPluginName" name="wordpressPluginName" value={formData.wordpressPluginName} onChange={handleChange} className={inputClasses} placeholder="Ex: Meu Plugin de IA" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-200 mt-8">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 font-bold text-white bg-[var(--brand-tertiary)] rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i>
                                Salvando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save"></i>
                                Salvar Configurações
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
