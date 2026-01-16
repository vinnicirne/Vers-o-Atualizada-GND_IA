import React, { useState, useEffect } from 'react';
import { ServiceKey } from '../../types/plan.types';
import { CREATOR_SUITE_MODES } from '../../constants';
import { usePlan } from '../../hooks/usePlan';

interface StandardFormProps {
    mode: ServiceKey;
    onGenerate: (prompt: string, mode: ServiceKey, generateAudio: boolean, options?: any) => void;
    isLoading: boolean;
    isLocked: boolean;
    isGuest: boolean;
    hasAccessToService: (key: ServiceKey) => boolean;
}

export function StandardForm({ mode, onGenerate, isLoading, isLocked, isGuest, hasAccessToService }: StandardFormProps) {
    const [prompt, setPrompt] = useState('');
    const [generateAudio, setGenerateAudio] = useState(false);
    const [placeholder, setPlaceholder] = useState('');
    const { getCreditsCostForService } = usePlan();
    const ttsCost = getCreditsCostForService('text_to_speech');

    useEffect(() => {
        const selectedMode = CREATOR_SUITE_MODES.find(m => m.value === mode);
        setPlaceholder(selectedMode?.placeholder || '');
        setPrompt('');
        setGenerateAudio(false);
    }, [mode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(prompt, mode, generateAudio);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            <div>
                <label htmlFor="prompt" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                    Seu Pedido
                </label>
                <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={placeholder}
                    rows={5}
                    className="w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-4 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300 placeholder-gray-400 disabled:opacity-50 disabled:bg-gray-50 resize-y"
                    disabled={isLoading || isLocked}
                />
            </div>

            {/* Gerar áudio só se o serviço text_to_speech estiver ativo e o modo for news_generator */}
            {mode === 'news_generator' && !isLocked && (
                (isGuest || hasAccessToService('text_to_speech')) && (
                    <div className="flex flex-col pt-2 animate-fade-in">
                        <label htmlFor="generate-audio" className="flex items-center cursor-pointer text-sm text-gray-600 hover:text-gray-900 transition-colors bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <input
                                id="generate-audio"
                                type="checkbox"
                                checked={generateAudio}
                                onChange={(e) => setGenerateAudio(e.target.checked)}
                                className="h-5 w-5 bg-white border border-gray-300 rounded text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] transition duration-200"
                                disabled={isLoading}
                            />
                            <span className="ml-3 font-medium">Gerar áudio da matéria</span>
                            <span className="text-xs text-[var(--brand-primary)] font-bold ml-2 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">+{ttsCost} créditos</span>
                        </label>
                    </div>
                )
            )}
            <button
                type="submit"
                className="w-full bg-[var(--brand-primary)] hover:bg-orange-500 text-white font-bold py-4 px-6 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all duration-300 disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center shadow-md transform hover:-translate-y-0.5"
                disabled={isLoading || isLocked || !prompt.trim()}
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processando...
                    </>
                ) : (
                    <>
                        {isLocked ? (
                            <>
                                <i className="fas fa-lock mr-2"></i>
                                Recurso Bloqueado
                            </>
                        ) : (
                            <>
                                <i className="fas fa-wand-magic-sparkles mr-2"></i>
                                Gerar Conteúdo
                            </>
                        )}
                    </>
                )}
            </button>
        </form>
    );
}
