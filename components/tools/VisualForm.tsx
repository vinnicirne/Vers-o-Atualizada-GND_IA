
import React, { useState } from 'react';
import { ServiceKey } from '../../types/plan.types';

interface VisualFormProps {
    mode: ServiceKey;
    onGenerate: (prompt: string, mode: ServiceKey, generateAudio: boolean, options?: any, file?: { data: string, mimeType: string } | null) => Promise<any>;
    isLoading: boolean;
    isLocked: boolean;
}

const IMAGE_STYLES = [
    { value: 'photorealistic', label: 'Fotorealista (8k)' },
    { value: 'cyberpunk', label: 'Cyberpunk / Neon' },
    { value: 'anime', label: 'Anime / Manga' },
    { value: 'oil_painting', label: 'Pintura a Óleo' },
    { value: '3d_render', label: 'Render 3D (Pixar Style)' },
    { value: 'cinematic', label: 'Cinematográfico' },
    { value: 'vector', label: 'Vetor / Flat Design' },
];

const SOCIAL_PLATFORMS = [
    { value: 'instagram_feed', label: 'Instagram Feed (Quadrado 1:1)' },
    { value: 'instagram_story', label: 'Instagram Stories / Reels (9:16)' },
    { value: 'facebook_post', label: 'Facebook Post (Paisagem)' },
    { value: 'linkedin_post', label: 'LinkedIn Post (Corporativo)' },
    { value: 'twitter_post', label: 'X (Twitter) Post' },
    { value: 'youtube_thumbnail', label: 'YouTube Thumbnail' },
];

const ASPECT_RATIOS = [
    { value: '1:1', label: 'Quadrado (Instagram)' },
    { value: '16:9', label: 'Paisagem (YouTube)' },
    { value: '9:16', label: 'Retrato (Stories)' },
];

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

export function VisualForm({ mode, onGenerate, isLoading, isLocked }: VisualFormProps) {
    const [prompt, setPrompt] = useState('');
    const [imageStyle, setImageStyle] = useState('photorealistic');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [platform, setPlatform] = useState('instagram_feed');
    const [theme, setTheme] = useState('modern');

    const selectClasses = "w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const options = mode === 'image_generation'
            ? { imageStyle, aspectRatio }
            : { platform, theme };

        onGenerate(prompt, mode, false, options);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            {mode === 'image_generation' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                            Estilo da Arte
                        </label>
                        <select value={imageStyle} onChange={e => setImageStyle(e.target.value)} className={selectClasses} disabled={isLoading || isLocked}>
                            {IMAGE_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                            Proporção
                        </label>
                        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className={selectClasses} disabled={isLoading || isLocked}>
                            {ASPECT_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {mode === 'social_media_poster' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                            Plataforma de Destino
                        </label>
                        <select value={platform} onChange={e => setPlatform(e.target.value)} className={selectClasses} disabled={isLoading || isLocked}>
                            {SOCIAL_PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                            Tema / Vibe
                        </label>
                        <select value={theme} onChange={e => setTheme(e.target.value)} className={selectClasses} disabled={isLoading || isLocked}>
                            {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                </div>
            )}

            <div>
                <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                    Descreva sua {mode === 'image_generation' ? 'Imagem' : 'Postagem'}
                </label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={mode === 'image_generation' ? "Um gato astronauta flutuando em uma galáxia feita de doces..." : "Promoção de Black Friday para loja de sapatos..."}
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
                        {isLocked ? <><i className="fas fa-lock mr-2"></i> Recurso Bloqueado</> : <><i className="fas fa-paint-brush mr-2"></i> Criar Arte</>}
                    </>
                )}
            </button>
        </form>
    );
}
