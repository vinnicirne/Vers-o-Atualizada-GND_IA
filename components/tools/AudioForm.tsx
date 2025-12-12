
import React, { useState } from 'react';
import { ServiceKey } from '../../types/plan.types';

interface AudioFormProps {
    mode: ServiceKey;
    onGenerate: (prompt: string, mode: ServiceKey, generateAudio: boolean, options?: any) => void;
    isLoading: boolean;
    isLocked: boolean;
}

const VOICES = [
    { value: 'Kore', label: 'Kore (Feminina - Padrão)' },
    { value: 'Aoede', label: 'Aoede (Feminina - Suave)' },
    { value: 'Puck', label: 'Puck (Masculina - Energética)' },
    { value: 'Charon', label: 'Charon (Masculina - Profunda)' },
    { value: 'Fenrir', label: 'Fenrir (Masculina - Intensa)' },
];

// Limite seguro para evitar timeouts e erros de API
const MAX_CHARS = 2500;

export function AudioForm({ mode, onGenerate, isLoading, isLocked }: AudioFormProps) {
    const [prompt, setPrompt] = useState('');
    const [selectedVoice, setSelectedVoice] = useState('Kore');

    const selectClasses = "w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300";

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
            <div>
                <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                    Selecione a Voz
                </label>
                <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className={selectClasses} disabled={isLoading || isLocked}>
                    {VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                    Texto para Narração
                </label>
                <textarea
                    value={prompt}
                    onChange={handlePromptChange}
                    placeholder="Insira o texto que você deseja transformar em áudio..."
                    rows={5}
                    maxLength={MAX_CHARS}
                    className="w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-4 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300 placeholder-gray-400 disabled:opacity-50 disabled:bg-gray-50 resize-y"
                    disabled={isLoading || isLocked}
                />
                <div className="flex justify-end mt-1">
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
                    <>Processando...</>
                ) : (
                    <>
                        {isLocked ? <><i className="fas fa-lock mr-2"></i> Recurso Bloqueado</> : <><i className="fas fa-microphone mr-2"></i> Gerar Áudio</>}
                    </>
                )}
            </button>
        </form>
    );
}
