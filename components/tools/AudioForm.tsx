
import React, { useState } from 'react';
import { ServiceKey, VoiceName } from '../../types/plan.types';

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
    { value: 'Zephyr', label: 'Zephyr (Masculina - Elegante)' },
];

const TONES = [
    { value: '', label: 'Natural' },
    { value: 'cheerfully', label: 'Alegre' },
    { value: 'sadly', label: 'Triste' },
    { value: 'excitedly', label: 'Animado' },
    { value: 'calmly', label: 'Calmo' },
    { value: 'seriously', label: 'Sério' },
];

export function AudioForm({ mode, onGenerate, isLoading, isLocked }: AudioFormProps) {
    const [prompt, setPrompt] = useState('');
    const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Kore');
    const [selectedTone, setSelectedTone] = useState('');

    const selectClasses = "w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(prompt, mode, false, { 
            voice: selectedVoice, 
            tone: selectedTone 
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                        Voz Neural
                    </label>
                    <select 
                        value={selectedVoice} 
                        onChange={e => setSelectedVoice(e.target.value as VoiceName)} 
                        className={selectClasses} 
                        disabled={isLoading || isLocked}
                    >
                        {VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                        Tom da Narração
                    </label>
                    <select 
                        value={selectedTone} 
                        onChange={e => setSelectedTone(e.target.value)} 
                        className={selectClasses} 
                        disabled={isLoading || isLocked}
                    >
                        {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                    Texto para Narração
                </label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Insira o texto que você deseja transformar em áudio..."
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
                    <><i className="fas fa-spinner fa-spin mr-2"></i>Sintetizando...</>
                ) : (
                    <>
                        {isLocked ? <><i className="fas fa-lock mr-2"></i> Recurso Bloqueado</> : <><i className="fas fa-microphone mr-2"></i> Gerar Áudio</>}
                    </>
                )}
            </button>
        </form>
    );
}
