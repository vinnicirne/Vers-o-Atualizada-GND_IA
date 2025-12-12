import React, { useState } from 'react';
import { ServiceKey } from '../../types/plan.types';

interface AudioFormProps {
    mode: ServiceKey;
    onGenerate: (prompt: string, mode: ServiceKey, generateAudio: boolean, options?: any) => void;
    isLoading: boolean;
    isLocked: boolean;
}

const VOICES = [
    { value: 'Kore', label: 'Kore', gender: 'Feminina', style: 'Padrão, Clara' },
    { value: 'Aoede', label: 'Aoede', gender: 'Feminina', style: 'Suave, Empática' },
    { value: 'Puck', label: 'Puck', gender: 'Masculina', style: 'Energética, Jovem' },
    { value: 'Charon', label: 'Charon', gender: 'Masculina', style: 'Profunda, Narrativa' },
    { value: 'Fenrir', label: 'Fenrir', gender: 'Masculina', style: 'Intensa, Autoritária' },
];

// Limite seguro para evitar timeouts e erros de API
const MAX_CHARS = 2500;

export function AudioForm({ mode, onGenerate, isLoading, isLocked }: AudioFormProps) {
    const [prompt, setPrompt] = useState('');
    const [selectedVoice, setSelectedVoice] = useState('Kore');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // CORREÇÃO: Passamos 'true' para generateAudio explicitamente, pois o objetivo desta ferramenta é criar áudio.
        onGenerate(prompt, mode, true, { voice: selectedVoice });
    };

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        if (text.length <= MAX_CHARS) {
            setPrompt(text);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <i className="fas fa-info-circle text-blue-500"></i>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-blue-700">
                            <strong>Tecnologia Neural Avançada (Gemini 2.5):</strong> 
                            Esta ferramenta gera áudios com entonação humana ultra-realista. Ideal para podcasts, narrações e vídeos.
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                    Selecione a Voz
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {VOICES.map(v => (
                        <div 
                            key={v.value}
                            onClick={() => !isLoading && !isLocked && setSelectedVoice(v.value)}
                            className={`cursor-pointer rounded-lg border p-3 transition-all ${
                                selectedVoice === v.value 
                                ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' 
                                : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            } ${isLoading || isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={`font-bold text-sm ${selectedVoice === v.value ? 'text-blue-700' : 'text-gray-700'}`}>{v.label}</span>
                                {selectedVoice === v.value && <i className="fas fa-check-circle text-blue-600"></i>}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                <i className={`fas ${v.gender === 'Feminina' ? 'fa-venus text-pink-400' : 'fa-mars text-blue-400'}`}></i>
                                <span>{v.gender} • {v.style}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                    Texto para Narração
                </label>
                <textarea
                    value={prompt}
                    onChange={handlePromptChange}
                    placeholder="Insira o texto que você deseja transformar em áudio..."
                    rows={6}
                    maxLength={MAX_CHARS}
                    className="w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-4 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300 placeholder-gray-400 disabled:opacity-50 disabled:bg-gray-50 resize-y"
                    disabled={isLoading || isLocked}
                />
                <div className="flex justify-between mt-1 items-center">
                    <p className="text-[10px] text-gray-400 italic">Dica: Use pontuação correta para melhores pausas e entonação.</p>
                    <span className={`text-xs font-bold ${prompt.length >= MAX_CHARS ? 'text-red-500' : 'text-gray-400'}`}>
                        {prompt.length} / {MAX_CHARS} caracteres
                    </span>
                </div>
            </div>

            <button
                type="submit"
                className="w-full bg-[var(--brand-primary)] hover:bg-orange-500 text-white font-bold py-4 px-6 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all duration-300 disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center shadow-md transform hover:-translate-y-0.5"
                disabled={isLoading || isLocked || !prompt.trim()}
            >
                {isLoading ? (
                    <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Sintetizando Áudio...
                    </>
                ) : (
                    <>
                        {isLocked ? <><i className="fas fa-lock mr-2"></i> Recurso Bloqueado</> : <><i className="fas fa-microphone-lines mr-2"></i> Gerar Áudio Neural</>}
                    </>
                )}
            </button>
        </form>
    );
}