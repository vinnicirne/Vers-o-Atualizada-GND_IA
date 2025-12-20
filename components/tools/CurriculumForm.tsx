import React, { useState, useRef } from 'react';
import { ServiceKey } from '../../types/plan.types';
import { CURRICULUM_TEMPLATES } from '../resume/templates';
import { extractCurriculumData } from '../../services/geminiService';

interface CurriculumFormProps {
    mode: ServiceKey;
    onGenerate: (prompt: string, mode: ServiceKey, generateAudio: boolean, options?: any) => void;
    isLoading: boolean;
    isLocked: boolean;
}

export function CurriculumForm({ mode, onGenerate, isLoading, isLocked }: CurriculumFormProps) {
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Form State
    const [targetJob, setTargetJob] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(Object.keys(CURRICULUM_TEMPLATES)[0]);
    const [personalInfo, setPersonalInfo] = useState({ name: '', email: '', phone: '', linkedin: '', location: '' });
    const [experience, setExperience] = useState([{ title: '', company: '', dates: '', description: '' }]);
    const [education, setEducation] = useState([{ degree: '', institution: '', dates: '' }]);
    const [skills, setSkills] = useState('');

    const inputClasses = "w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300";
    const labelClasses = "block text-[10px] uppercase font-bold mb-1.5 tracking-wider text-gray-400";

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert("Por favor, envie um arquivo PDF.");
            return;
        }

        setIsScanning(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const extracted = await extractCurriculumData(base64, file.type);
                
                // Mapear dados extraídos para o estado
                if (extracted.name) setPersonalInfo(prev => ({ ...prev, name: extracted.name, email: extracted.email, phone: extracted.phone, linkedin: extracted.linkedin, location: extracted.location }));
                if (extracted.experience?.length > 0) setExperience(extracted.experience);
                if (extracted.education?.length > 0) setEducation(extracted.education);
                if (extracted.skills?.length > 0) setSkills(extracted.skills.join(', '));
                
                alert("Currículo escaneado com sucesso! Revise os campos abaixo.");
            };
        } catch (error) {
            console.error("Erro no scan:", error);
            alert("Não foi possível extrair os dados automaticamente. Você pode preencher manualmente.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const options = {
            template: selectedTemplate,
            personalInfo,
            targetJob,
            experience: experience.filter(exp => exp.title || exp.company),
            education: education.filter(edu => edu.degree || edu.institution),
            skills: skills.split(',').map(s => s.trim())
        };
        
        const finalPrompt = targetJob 
            ? `Otimizar currículo para esta vaga: ${targetJob}` 
            : 'Gerar currículo de alto impacto focado em liderança e resultados.';

        onGenerate(finalPrompt, mode, false, options);
    };

    const addExperience = () => setExperience([...experience, { title: '', company: '', dates: '', description: '' }]);
    const addEducation = () => setEducation([...education, { degree: '', institution: '', dates: '' }]);
    const removeExperience = (idx: number) => setExperience(experience.filter((_, i) => i !== idx));

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            
            {/* 0. Elite Scan: Upload Section */}
            <div className={`relative overflow-hidden p-8 rounded-2xl border-2 border-dashed transition-all duration-500 ${isScanning ? 'bg-blue-50 border-blue-400 scale-[0.98]' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}>
                <div className="flex flex-col items-center justify-center text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all ${isScanning ? 'bg-blue-500 text-white animate-bounce' : 'bg-white text-blue-500 shadow-sm'}`}>
                        {isScanning ? <i className="fas fa-microchip text-2xl"></i> : <i className="fas fa-file-pdf text-2xl"></i>}
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Elite Scan & Fill</h3>
                    <p className="text-sm text-gray-500 max-w-xs mt-1">
                        {isScanning ? 'A IA está lendo seu currículo...' : 'Suba seu currículo antigo em PDF para preencher tudo automaticamente em segundos.'}
                    </p>
                    <button 
                        type="button"
                        disabled={isScanning || isLoading || isLocked}
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 px-6 py-2 bg-white border border-blue-200 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-50 transition shadow-sm disabled:opacity-50"
                    >
                        {isScanning ? 'ESCANEANDO...' : 'SELECIONAR PDF'}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/pdf" className="hidden" />
                </div>
                {isScanning && (
                    <div className="absolute bottom-0 left-0 h-1 bg-blue-500 animate-progress-fast w-full"></div>
                )}
            </div>

            {/* 1. Estratégia de Vaga */}
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 shadow-sm">
                <h3 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-bullseye"></i> 1. Alinhamento com a Vaga (Job Match)
                </h3>
                <label className={labelClasses}>Descrição da Vaga Desejada (Opcional)</label>
                <textarea 
                    value={targetJob}
                    onChange={e => setTargetJob(e.target.value)}
                    placeholder="Cole aqui a descrição da vaga do LinkedIn. A IA extrairá palavras-chave para o algoritmo ATS automaticamente."
                    className={`${inputClasses} h-24 text-xs`}
                    disabled={isLoading || isLocked || isScanning}
                />
            </div>

            {/* 2. Design Selector */}
            <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 shadow-sm">
                <h3 className="text-sm font-bold text-purple-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-paint-roller"></i> 2. Template e Estilo
                </h3>
                <select 
                    value={selectedTemplate} 
                    onChange={e => setSelectedTemplate(e.target.value)} 
                    className={inputClasses}
                    disabled={isLoading || isLocked || isScanning}
                >
                    {Object.keys(CURRICULUM_TEMPLATES).map(key => (
                        <option key={key} value={key}>{key.replace(/_/g, ' ').toUpperCase()}</option>
                    ))}
                </select>
            </div>

            {/* 3. Dados Pessoais */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <i className="fas fa-user-circle text-blue-500"></i> Informações de Contato
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Nome Completo" value={personalInfo.name} onChange={e => setPersonalInfo({...personalInfo, name: e.target.value})} className={inputClasses} required disabled={isScanning} />
                    <input type="email" placeholder="Email Profissional" value={personalInfo.email} onChange={e => setPersonalInfo({...personalInfo, email: e.target.value})} className={inputClasses} required disabled={isScanning} />
                    <input type="text" placeholder="LinkedIn (URL)" value={personalInfo.linkedin} onChange={e => setPersonalInfo({...personalInfo, linkedin: e.target.value})} className={inputClasses} disabled={isScanning} />
                    <input type="text" placeholder="Cidade/Estado" value={personalInfo.location} onChange={e => setPersonalInfo({...personalInfo, location: e.target.value})} className={inputClasses} disabled={isScanning} />
                </div>
            </div>

            {/* 4. Experiência */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <i className="fas fa-briefcase text-orange-500"></i> Experiência Profissional
                </h3>
                <div className="space-y-6">
                    {experience.map((exp, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 relative group animate-fade-in">
                            <button type="button" onClick={() => removeExperience(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-[10px] shadow-md opacity-0 group-hover:opacity-100 transition"><i className="fas fa-times"></i></button>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                <input type="text" placeholder="Cargo" value={exp.title} onChange={e => { const n = [...experience]; n[idx].title = e.target.value; setExperience(n); }} className={inputClasses} disabled={isScanning} />
                                <input type="text" placeholder="Empresa" value={exp.company} onChange={e => { const n = [...experience]; n[idx].company = e.target.value; setExperience(n); }} className={inputClasses} disabled={isScanning} />
                                <input type="text" placeholder="Período (Ex: 2020 - Presente)" value={exp.dates} onChange={e => { const n = [...experience]; n[idx].dates = e.target.value; setExperience(n); }} className={inputClasses} disabled={isScanning} />
                            </div>
                            <textarea 
                                placeholder="Descreva suas conquistas. Ex: 'Liderei equipe de 5 pessoas e reduzi custos em 15%'. (A IA irá polir estas frases usando a fórmula X-Y-Z do Google)" 
                                value={exp.description} 
                                onChange={e => { const n = [...experience]; n[idx].description = e.target.value; setExperience(n); }} 
                                className={`${inputClasses} h-24`}
                                disabled={isScanning}
                            />
                        </div>
                    ))}
                    <button type="button" onClick={addExperience} className="w-full py-2 border-2 border-dashed border-gray-200 text-gray-400 rounded-xl text-xs font-bold hover:border-blue-300 hover:text-blue-500 transition">
                        + ADICIONAR EXPERIÊNCIA
                    </button>
                </div>
            </div>

            {/* 5. Competências */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <i className="fas fa-tools text-yellow-500"></i> Competências e Habilidades
                </h3>
                <textarea 
                    value={skills}
                    onChange={e => setSkills(e.target.value)}
                    placeholder="React, Gestão de Projetos, Inglês Fluente, SCRUM... (Separe por vírgula)"
                    className={inputClasses}
                    rows={2}
                    disabled={isScanning}
                />
            </div>

            {/* Submit */}
            <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-5 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl transform hover:-translate-y-1"
                disabled={isLoading || isLocked || isScanning || !personalInfo.name}
            >
                {isLoading ? (
                    <><i className="fas fa-spinner fa-spin"></i> Otimizando para Algoritmos ATS...</>
                ) : (
                    <>
                        <i className="fas fa-magic"></i> 
                        <span>{isLocked ? 'Recurso Bloqueado' : 'Gerar Currículo de Alta Performance (8 Créditos)'}</span>
                    </>
                )}
            </button>
        </form>
    );
}