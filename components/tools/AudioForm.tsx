<<<<<<< HEAD

=======
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
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

export function AudioForm({ mode, onGenerate, isLoading, isLocked }: AudioFormProps) {
    const [prompt, setPrompt] = useState('');
    const [selectedVoice, setSelectedVoice] = useState('Kore');

    const selectClasses = "w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
<<<<<<< HEAD
        onGenerate(prompt, mode, false, { voice: selectedVoice });
=======
        // Envia generateAudio = true para indicar intenção de gerar áudio
        onGenerate(prompt, mode, true, { voice: selectedVoice });
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            <div>
                <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
<<<<<<< HEAD
                    Selecione a Voz
=======
                    Selecione a Voz Neural
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
                </label>
                <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className={selectClasses} disabled={isLoading || isLocked}>
                    {VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
<<<<<<< HEAD
                    Texto para Narração
=======
                    Texto para Narração (Máx. 3000 caracteres)
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
                </label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Insira o texto que você deseja transformar em áudio..."
<<<<<<< HEAD
                    rows={5}
                    className="w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-4 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300 placeholder-gray-400 disabled:opacity-50 disabled:bg-gray-50 resize-y"
                    disabled={isLoading || isLocked}
=======
                    rows={6}
                    className="w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-4 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300 placeholder-gray-400 disabled:opacity-50 disabled:bg-gray-50 resize-y"
                    disabled={isLoading || isLocked}
                    maxLength={3000}
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
                />
            </div>

            <button
                type="submit"
                className="w-full bg-[var(--brand-primary)] hover:bg-orange-500 text-white font-bold py-4 px-6 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all duration-300 disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center shadow-md transform hover:-translate-y-0.5"
                disabled={isLoading || isLocked || !prompt.trim()}
            >
                {isLoading ? (
<<<<<<< HEAD
                    <>Processando...</>
                ) : (
                    <>
                        {isLocked ? <><i className="fas fa-lock mr-2"></i> Recurso Bloqueado</> : <><i className="fas fa-microphone mr-2"></i> Gerar Áudio</>}
=======
                    <><i className="fas fa-spinner fa-spin mr-2"></i>Sintetizando Voz...</>
                ) : (
                    <>
                        {isLocked ? <><i className="fas fa-lock mr-2"></i> Plano Insuficiente</> : <><i className="fas fa-microphone-lines mr-2"></i> Gerar Áudio (2 Créditos)</>}
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
                    </>
                )}
            </button>
        </form>
    );
<<<<<<< HEAD
}
=======
}
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
