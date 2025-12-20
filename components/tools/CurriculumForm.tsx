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

    const inputClasses = "w-full bg-white border border-gray-200 text-gray-700 p-3 text-sm rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all duration-300";
    const labelClasses = "block text-[10px] uppercase font-bold mb-1.5 tracking-widest text-gray-400";

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;

        setIsScanning(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const extracted = await extractCurriculumData(base64, file.type);
                
                if (extracted) {
                    if (extracted.name) setPersonalInfo({
                        name: extracted.name || '',
                        email: extracted.email || '',
                        phone: extracted.phone || '',
                        linkedin: extracted.linkedin || '',
                        location: extracted.location || ''
                    });
                    if (extracted.experience?.length > 0) setExperience(extracted.experience);
                    if (extracted.education?.length > 0) setEducation(extracted.education);
                    if (extracted.skills) setSkills(Array.isArray(extracted.skills) ? extracted.skills.join(', ') : extracted.skills);
                }
            };
        } catch (error) {
            console.error("Scan error:", error);
        } finally {
            setIsScanning(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(`Gerar currículo de elite otimizado para ATS. Objetivo: ${targetJob}`, mode, false, {
            template: selectedTemplate,
            personalInfo,
            targetJob,
            experience,
            education,
            skills: skills.split(',').map(s => s.trim())
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-12">
            
            {/* Elite Scan Area */}
            <div 
                className={`group relative p-10 rounded-3xl border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center text-center cursor-pointer
                ${isScanning ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-200 hover:border-blue-400 hover:bg-white'}`}
                onClick={() => !isScanning && fileInputRef.current?.click()}
            >
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 
                    ${isScanning ? 'bg-blue-500 text-white animate-pulse' : 'bg-white text-blue-500 shadow-xl group-hover:scale-110'}`}>
                    {isScanning ? <i className="fas fa-microchip text-3xl"></i> : <i className="fas fa-file-upload text-3xl"></i>}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Elite Scan & Pre-Fill</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-sm">
                        {isScanning ? 'Nossa IA está extraindo suas competências...' : 'Suba seu PDF antigo e nós preenchemos tudo para você em 5 segundos.'}
                    </p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/pdf" className="hidden" />
                
                {isScanning && (
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gray-100 overflow-hidden rounded-b-3xl">
                        <div className="h-full bg-blue-500 animate-progress-fast w-full"></div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lateral: Estratégia */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i className="fas fa-bullseye text-red-500"></i> Alvo da Carreira
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className={labelClasses}>Vaga Desejada / Link LinkedIn</label>
                                <textarea 
                                    value={targetJob}
                                    onChange={e => setTargetJob(e.target.value)}
                                    placeholder="Ex: Gerente de Projetos Sênior na Amazon..."
                                    className={`${inputClasses} h-32 text-xs`}
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Modelo de Design</label>
                                <select 
                                    value={selectedTemplate} 
                                    onChange={e => setSelectedTemplate(e.target.value)} 
                                    className={inputClasses}
                                >
                                    <option value="modern_standard">MODERN ELITE (RECOMENDADO)</option>
                                    <option value="professional_clean">CLEAN EXECUTIVE</option>
                                    <option value="creative_sidebar">CREATIVE SIDEBAR</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-xl shadow-blue-200">
                        <h4 className="font-bold flex items-center gap-2 mb-2">
                            <i className="fas fa-magic"></i> Dica de Especialista
                        </h4>
                        <p className="text-xs opacity-90 leading-relaxed">
                            Nossa IA usa a <strong>Fórmula X-Y-Z do Google</strong> para reescrever suas experiências. O scan de PDF ajuda a identificar as palavras-chave que os recrutadores buscam.
                        </p>
                    </div>
                </div>

                {/* Principal: Dados */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Contato */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-800 mb-6 border-b pb-4 flex items-center gap-2">
                            <i className="fas fa-user-circle text-blue-500"></i> Informações Pessoais
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className={labelClasses}>Nome Completo</label>
                                <input type="text" value={personalInfo.name} onChange={e => setPersonalInfo({...personalInfo, name: e.target.value})} className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Email Profissional</label>
                                <input type="email" value={personalInfo.email} onChange={e => setPersonalInfo({...personalInfo, email: e.target.value})} className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Telefone</label>
                                <input type="text" value={personalInfo.phone} onChange={e => setPersonalInfo({...personalInfo, phone: e.target.value})} className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>LinkedIn (URL)</label>
                                <input type="text" value={personalInfo.linkedin} onChange={e => setPersonalInfo({...personalInfo, linkedin: e.target.value})} className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Cidade / Estado</label>
                                <input type="text" value={personalInfo.location} onChange={e => setPersonalInfo({...personalInfo, location: e.target.value})} className={inputClasses} />
                            </div>
                        </div>
                    </div>

                    {/* Experiência */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <i className="fas fa-briefcase text-orange-500"></i> Trajetória Profissional
                            </h3>
                            <button 
                                type="button" 
                                onClick={() => setExperience([...experience, { title: '', company: '', dates: '', description: '' }])}
                                className="text-blue-600 font-bold text-xs hover:underline"
                            >
                                + ADICIONAR
                            </button>
                        </div>
                        <div className="space-y-8">
                            {experience.map((exp, idx) => (
                                <div key={idx} className="group relative p-6 bg-gray-50 rounded-2xl border border-gray-100 animate-fade-in">
                                    <button 
                                        type="button" 
                                        onClick={() => setExperience(experience.filter((_, i) => i !== idx))}
                                        className="absolute -top-2 -right-2 w-7 h-7 bg-white text-red-500 rounded-full shadow-lg border border-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div className="md:col-span-1">
                                            <label className={labelClasses}>Cargo</label>
                                            <input type="text" value={exp.title} onChange={e => { const n = [...experience]; n[idx].title = e.target.value; setExperience(n); }} className={inputClasses} />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className={labelClasses}>Empresa</label>
                                            <input type="text" value={exp.company} onChange={e => { const n = [...experience]; n[idx].company = e.target.value; setExperience(n); }} className={inputClasses} />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className={labelClasses}>Período</label>
                                            <input type="text" value={exp.dates} onChange={e => { const n = [...experience]; n[idx].dates = e.target.value; setExperience(n); }} className={inputClasses} />
                                        </div>
                                    </div>
                                    <label className={labelClasses}>Conquistas Principais (Métricas)</label>
                                    <textarea 
                                        value={exp.description} 
                                        onChange={e => { const n = [...experience]; n[idx].description = e.target.value; setExperience(n); }} 
                                        className={`${inputClasses} h-28 text-xs`}
                                        placeholder="Fale o que você fez. A IA vai polir com resultados reais."
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <i className="fas fa-tools text-purple-500"></i> Competências
                        </h3>
                        <textarea 
                            value={skills}
                            onChange={e => setSkills(e.target.value)}
                            placeholder="React, Gestão Ágil, Liderança, Inglês, SQL..."
                            className={inputClasses}
                            rows={3}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-6 px-6 rounded-3xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl shadow-blue-200 transform hover:-translate-y-1"
                        disabled={isLoading || isLocked || isScanning || !personalInfo.name}
                    >
                        {isLoading ? (
                            <><i className="fas fa-spinner fa-spin"></i> Otimizando Currículo...</>
                        ) : (
                            <>
                                <i className="fas fa-paper-plane"></i> 
                                <span>Gerar Currículo de Elite (8 Créditos)</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
}