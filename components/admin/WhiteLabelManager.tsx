


import React, { useState, useEffect, useCallback } from 'react';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext';
import { useUser } from '../../contexts/UserContext';
import { Toast } from './Toast';
// FIX: Imported WhiteLabelSettings from types
import { WhiteLabelSettings } from '../../types';
import { v4 as uuidv4 } from 'uuid'; // For unique keys for dynamic lists

interface FeatureCardConfig {
    id: string; // Add ID for list management
    icon: string; 
    title: string; 
    description: string; 
    color: string; 
    bgColor: string;
}

interface FooterLinkConfig {
    id: string; // Add ID for list management
    text: string; 
    link: string;
}

export function WhiteLabelManager() {
    const { settings, loading, error, updateSettings, refreshSettings } = useWhiteLabel();
    const { user: adminUser } = useUser();
    
    // Use an internal state for form data, initialized with context settings
    const [formData, setFormData] = useState<WhiteLabelSettings>(settings);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Update form data when settings from context change
    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        // FIX: Explicitly check for checkbox type to get 'checked' property
        const newValue = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ 
            ...prev, 
            [name]: newValue 
        }));
    };

    const handleColorChange = (name: keyof WhiteLabelSettings, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFeatureChange = (index: number, field: keyof FeatureCardConfig, value: string) => {
        const newFeatures = [...formData.landingPageFeatures];
        (newFeatures[index] as any)[field] = value;
        setFormData(prev => ({ ...prev, landingPageFeatures: newFeatures }));
    };

    const addFeature = () => {
        setFormData(prev => ({
            ...prev,
            landingPageFeatures: [
                ...prev.landingPageFeatures,
                { id: uuidv4(), icon: 'fa-star', title: 'Nova Feature', description: 'Descreva a nova feature.', color: 'text-blue-600', bgColor: 'bg-blue-100' }
            ]
        }));
    };

    const removeFeature = (id: string) => {
        setFormData(prev => ({
            ...prev,
            landingPageFeatures: prev.landingPageFeatures.filter(f => f.id !== id)
        }));
    };

    const handleFooterLinkChange = (index: number, field: keyof FooterLinkConfig, value: string) => {
        const newLinks = [...formData.landingPageFooterLinks];
        (newLinks[index] as any)[field] = value;
        setFormData(prev => ({ ...prev, landingPageFooterLinks: newLinks }));
    };

    const addFooterLink = () => {
        setFormData(prev => ({
            ...prev,
            landingPageFooterLinks: [
                ...prev.landingPageFooterLinks,
                { id: uuidv4(), text: 'Novo Link', link: '/#' }
            ]
        }));
    };

    const removeFooterLink = (id: string) => {
        setFormData(prev => ({
            ...prev,
            landingPageFooterLinks: prev.landingPageFooterLinks.filter(l => l.id !== id)
        }));
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

                    {/* Landing Page Settings */}
                    <div>
                        <h3 className={sectionTitleClasses}>Landing Page (Página Inicial)</h3>
                        <div className="space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
                            <div>
                                <label htmlFor="landingPageEnabled" className="flex items-center cursor-pointer">
                                    <input type="checkbox" id="landingPageEnabled" name="landingPageEnabled" checked={formData.landingPageEnabled} onChange={handleChange} className="sr-only peer" />
                                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--brand-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-primary)]"></div>
                                    <span className="ml-3 text-sm font-medium text-gray-900">Landing Page Ativa (Exibir antes do login)</span>
                                </label>
                                <p className="text-xs text-gray-500 mt-1">Se desativado, o acesso direto será para a página de Login/Dashboard.</p>
                            </div>

                            {/* Hero Section */}
                            <h4 className="text-lg font-bold text-gray-700 mt-6 mb-3">Hero Section</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label htmlFor="heroSectionTitle" className={labelClasses}>Título Principal (Hero)</label>
                                    {/* FIX: Changed input to textarea and set rows to 3 */}
                                    <textarea id="heroSectionTitle" name="heroSectionTitle" value={formData.heroSectionTitle} onChange={handleChange} className={inputClasses} rows={3} placeholder="Ex: Crie Notícias, Imagens e Sites..." />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="heroSectionSubtitle" className={labelClasses}>Subtítulo / Descrição (Hero)</label>
                                    {/* FIX: Changed input to textarea and set rows to 4 */}
                                    <textarea id="heroSectionSubtitle" name="heroSectionSubtitle" value={formData.heroSectionSubtitle} onChange={handleChange} className={inputClasses} rows={4} placeholder="Ex: A plataforma completa para criadores..." />
                                </div>
                                <div>
                                    <label htmlFor="heroCtaPrimaryText" className={labelClasses}>CTA Primário - Texto</label>
                                    <input type="text" id="heroCtaPrimaryText" name="heroCtaPrimaryText" value={formData.heroCtaPrimaryText} onChange={handleChange} className={inputClasses} placeholder="Ex: Começar Agora" />
                                </div>
                                <div>
                                    <label htmlFor="heroCtaPrimaryLink" className={labelClasses}>CTA Primário - Link (ex: dashboard)</label>
                                    <input type="text" id="heroCtaPrimaryLink" name="heroCtaPrimaryLink" value={formData.heroCtaPrimaryLink} onChange={handleChange} className={inputClasses} placeholder="Ex: dashboard ou login" />
                                </div>
                                <div>
                                    <label htmlFor="heroCtaSecondaryText" className={labelClasses}>CTA Secundário - Texto</label>
                                    <input type="text" id="heroCtaSecondaryText" name="heroCtaSecondaryText" value={formData.heroCtaSecondaryText} onChange={handleChange} className={inputClasses} placeholder="Ex: Ver Demo" />
                                </div>
                                <div>
                                    <label htmlFor="heroCtaSecondaryLink" className={labelClasses}>CTA Secundário - Link (ex: login)</label>
                                    <input type="text" id="heroCtaSecondaryLink" name="heroCtaSecondaryLink" value={formData.heroCtaSecondaryLink} onChange={handleChange} className={inputClasses} placeholder="Ex: login ou #video-demo" />
                                </div>
                            </div>

                            {/* Features Section */}
                            <h4 className="text-lg font-bold text-gray-700 mt-6 mb-3">Seção de Features</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label htmlFor="featureSectionTitle" className={labelClasses}>Título da Seção de Features</label>
                                    <input type="text" id="featureSectionTitle" name="featureSectionTitle" value={formData.featureSectionTitle} onChange={handleChange} className={inputClasses} placeholder="Ex: Tudo o que você precisa..." />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="featureSectionSubtitle" className={labelClasses}>Subtítulo da Seção de Features</label>
                                    <textarea id="featureSectionSubtitle" name="featureSectionSubtitle" value={formData.featureSectionSubtitle} onChange={handleChange} className={inputClasses} rows={2} placeholder="Ex: Substitua dezenas de ferramentas..." />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelClasses}>Cards de Features</label>
                                    <div className="space-y-4">
                                        {formData.landingPageFeatures.map((feature, index) => (
                                            <div key={feature.id} className="bg-white p-4 rounded-md border border-gray-200 space-y-2">
                                                <div className="flex justify-end">
                                                    <button type="button" onClick={() => removeFeature(feature.id)} className="text-red-500 hover:text-red-700 text-sm"><i className="fas fa-trash"></i></button>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Ícone (Font Awesome class)</label>
                                                    <input type="text" value={feature.icon} onChange={e => handleFeatureChange(index, 'icon', e.target.value)} className={inputClasses} placeholder="Ex: fa-newspaper" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Título</label>
                                                    <input type="text" value={feature.title} onChange={e => handleFeatureChange(index, 'title', e.target.value)} className={inputClasses} placeholder="Ex: Gerador de Notícias" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Descrição</label>
                                                    {/* FIX: Changed input to textarea and set rows to 2 */}
                                                    <textarea value={feature.description} onChange={e => handleFeatureChange(index, 'description', e.target.value)} className={inputClasses} rows={2} placeholder="Ex: Artigos jornalísticos completos..." />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs text-gray-500 mb-1">Cor do Ícone (Tailwind class)</label>
                                                        <input type="text" value={feature.color} onChange={e => handleFeatureChange(index, 'color', e.target.value)} className={inputClasses} placeholder="Ex: text-green-600" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-500 mb-1">Cor de Fundo do Ícone (Tailwind class)</label>
                                                        <input type="text" value={feature.bgColor} onChange={e => handleFeatureChange(index, 'bgColor', e.target.value)} className={inputClasses} placeholder="Ex: bg-green-100" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" onClick={addFeature} className="w-full bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 transition flex items-center justify-center gap-2">
                                            <i className="fas fa-plus"></i> Adicionar Feature
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Section */}
                            <h4 className="text-lg font-bold text-gray-700 mt-6 mb-3">Seção de Preços</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label htmlFor="pricingSectionTitle" className={labelClasses}>Título da Seção de Preços</label>
                                    <input type="text" id="pricingSectionTitle" name="pricingSectionTitle" value={formData.pricingSectionTitle} onChange={handleChange} className={inputClasses} placeholder="Ex: Planos acessíveis para todos" />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="pricingSectionSubtitle" className={labelClasses}>Subtítulo da Seção de Preços</label>
                                    <textarea id="pricingSectionSubtitle" name="pricingSectionSubtitle" value={formData.pricingSectionSubtitle} onChange={handleChange} className={inputClasses} rows={2} placeholder="Ex: Comece grátis e escale..." />
                                </div>
                            </div>

                            {/* Footer Links */}
                            <h4 className="text-lg font-bold text-gray-700 mt-6 mb-3">Links do Rodapé da Landing Page</h4>
                            <div className="md:col-span-2">
                                <label className={labelClasses}>Links</label>
                                <div className="space-y-4">
                                    {formData.landingPageFooterLinks.map((link, index) => (
                                        <div key={link.id} className="bg-white p-4 rounded-md border border-gray-200 space-y-2">
                                            <div className="flex justify-end">
                                                <button type="button" onClick={() => removeFooterLink(link.id)} className="text-red-500 hover:text-red-700 text-sm"><i className="fas fa-trash"></i></button>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Texto</label>
                                                <input type="text" value={link.text} onChange={e => handleFooterLinkChange(index, 'text', e.target.value)} className={inputClasses} placeholder="Ex: Termos de Uso" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Link (ex: terms, privacy)</label>
                                                <input type="text" value={link.link} onChange={e => handleFooterLinkChange(index, 'link', e.target.value)} className={inputClasses} placeholder="Ex: terms ou https://..." />
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addFooterLink} className="w-full bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 transition flex items-center justify-center gap-2">
                                        <i className="fas fa-plus"></i> Adicionar Link
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Guest Marketing Footer Settings (Dashboard) */}
                    <div>
                        <h3 className={sectionTitleClasses}>Dashboard (Rodapé para Visitantes)</h3>
                        <div className="space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
                            <div>
                                <label htmlFor="guestMarketingFooterTitle" className={labelClasses}>Título (Rodapé Visitante)</label>
                                <input type="text" id="guestMarketingFooterTitle" name="guestMarketingFooterTitle" value={formData.guestMarketingFooterTitle} onChange={handleChange} className={inputClasses} placeholder="Ex: Gostou do teste?" />
                            </div>
                            <div>
                                <label htmlFor="guestMarketingFooterSubtitle" className={labelClasses}>Subtítulo (Rodapé Visitante)</label>
                                <textarea id="guestMarketingFooterSubtitle" name="guestMarketingFooterSubtitle" value={formData.guestMarketingFooterSubtitle} onChange={handleChange} className={inputClasses} rows={3} placeholder="Ex: Crie sua conta gratuita agora..." />
                            </div>
                            <div>
                                <label htmlFor="guestMarketingFooterCtaText" className={labelClasses}>CTA Texto (Rodapé Visitante)</label>
                                <input type="text" id="guestMarketingFooterCtaText" name="guestMarketingFooterCtaText" value={formData.guestMarketingFooterCtaText} onChange={handleChange} className={inputClasses} placeholder="Ex: Criar Conta Grátis" />
                            </div>
                            <div>
                                <label htmlFor="guestMarketingFooterCtaLink" className={labelClasses}>CTA Link (Rodapé Visitante)</label>
                                <input type="text" id="guestMarketingFooterCtaLink" name="guestMarketingFooterCtaLink" value={formData.guestMarketingFooterCtaLink} onChange={handleChange} className={inputClasses} placeholder="Ex: login" />
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