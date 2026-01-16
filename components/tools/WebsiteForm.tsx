
import React, { useState } from 'react';
import { ServiceKey } from '../../types/plan.types';

interface WebsiteFormProps {
    mode: ServiceKey;
    onGenerate: (prompt: string, mode: ServiceKey, generateAudio: boolean, options?: any) => void;
    isLoading: boolean;
    isLocked: boolean;
}

const THEMES = [
    { value: 'modern', label: 'Moderno & Clean' },
    { value: 'minimalist', label: 'Minimalista' },
    { value: 'luxury', label: 'Luxo & Elegante' },
    { value: 'startup', label: 'Startup / Tech' },
    { value: 'corporate', label: 'Corporativo' },
    { value: 'playful', label: 'Divertido / Vibrante' },
    { value: 'dark', label: 'Dark Mode / Cyberpunk' },
    { value: 'nature', label: 'Natureza / Orgânico' },
];

export function WebsiteForm({ mode, onGenerate, isLoading, isLocked }: WebsiteFormProps) {
    const [prompt, setPrompt] = useState('');
    const [theme, setTheme] = useState('modern');
    const [primaryColor, setPrimaryColor] = useState('#10B981');

    const selectClasses = "w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300";
    const inputClasses = "w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(prompt, mode, false, { theme, primaryColor });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                        Estilo Visual
                    </label>
                    <select value={theme} onChange={e => setTheme(e.target.value)} className={selectClasses} disabled={isLoading || isLocked}>
                        {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                        Cor Primária
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={primaryColor}
                            onChange={e => setPrimaryColor(e.target.value)}
                            className="h-11 w-16 bg-white border border-gray-300 rounded-md cursor-pointer p-1"
                            disabled={isLoading || isLocked}
                        />
                        <input
                            type="text"
                            value={primaryColor}
                            onChange={e => setPrimaryColor(e.target.value)}
                            className={inputClasses}
                            disabled={isLoading || isLocked}
                        />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                    Descreva seu Site / Landing Page
                </label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Site institucional para uma consultoria de TI focada em segurança cibernética..."
                    rows={5}
                    className="w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-4 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300 placeholder-gray-400 disabled:opacity-50 disabled:bg-gray-50 resize-y"
                    disabled={isLoading || isLocked}
                />
            </div>

            <button
                type="submit"
                className="w-full bg-[var(--brand-primary)] hover:bg-orange-500 text-white font-bold py-4 px-6 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all duration-300 disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center shadow-md transform hover:-translate-y-0.5"
                disabled={isLoading || isLocked || !prompt.trim()}
            >
                {isLoading ? (
                    <>Processando...</>
                ) : (
                    <>
                        {isLocked ? <><i className="fas fa-lock mr-2"></i> Recurso Bloqueado</> : <><i className="fas fa-code mr-2"></i> Gerar Site</>}
                    </>
                )}
            </button>
        </form>
    );
}
