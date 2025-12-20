import React, { useState } from 'react';
import { ServiceKey } from '../../types/plan.types';
import { CURRICULUM_TEMPLATES } from '../resume/templates';

interface CurriculumFormProps {
    mode: ServiceKey;
    onGenerate: (prompt: string, mode: ServiceKey, generateAudio: boolean, options?: any) => void;
    isLoading: boolean;
    isLocked: boolean;
}

export function CurriculumForm({ mode, onGenerate, isLoading, isLocked }: CurriculumFormProps) {
    const [targetJob, setTargetJob] = useState('');
    const [selectedCurriculumTemplate, setSelectedCurriculumTemplate] = useState(Object.keys(CURRICULUM_TEMPLATES)[0]);
    const [personalInfo, setPersonalInfo] = useState({ name: '', email: '', phone: '', linkedin: '', portfolio: '', location: '' });
    const [summary, setSummary] = useState('');
    const [experience, setExperience] = useState([{ title: '', company: '', dates: '', description: '' }]);
    const [education, setEducation] = useState([{ degree: '', institution: '', dates: '', description: '' }]);
    const [skills, setSkills] = useState<string[]>([]);
    
    const inputClasses = "w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300";
    const labelClasses = "block text-[10px] uppercase font-bold mb-1.5 tracking-wider text-gray-400";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const options = {
            template: selectedCurriculumTemplate,
            personalInfo,
            summary,
            experience: experience.filter(exp => exp.title || exp.company),
            education: education.filter(edu => edu.degree || edu.institution),
            skills: skills.filter(skill => skill.trim() !== ''),
            targetJob,
        };
        // O prompt principal agora é o foco específico ou a descrição da vaga
        const finalPrompt = targetJob ? `OTIMIZAR PARA ESTA VAGA: ${targetJob}` : 'Gerar currículo geral de alto nível.';
        onGenerate(finalPrompt, mode, false, options);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            
            {/* Header Estratégico */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                    <h3 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
                        <i className="fas fa-bullseye"></i> 1. Objetivo & Keyword Match
                    </h3>
                    <label className={labelClasses}>Descrição da Vaga Alvo (Opcional)</label>
                    <textarea 
                        value={targetJob}
                        onChange={e => setTargetJob(e.target.value)}
                        placeholder="Cole aqui a descrição da vaga do LinkedIn para a IA otimizar as palavras-chave (Jobscan Style)..."
                        className={`${inputClasses} h-24 text-xs`}
                        disabled={isLoading || isLocked}
                    />
                </div>

                <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100">
                    <h3 className="text-sm font-bold text-purple-800 mb-4 flex items-center gap-2">
                        <i className="fas fa-paint-roller"></i> 2. Design & Estrutura
                    </h3>
                    <label className={labelClasses}>Template Profissional</label>
                    <select 
                        value={selectedCurriculumTemplate} 
                        onChange={e => setSelectedCurriculumTemplate(e.target.value)} 
                        className={inputClasses}
                        disabled={isLoading || isLocked}
                    >
                        {Object.keys(CURRICULUM_TEMPLATES).map(key => (
                            <option key={key} value={key}>{key.replace(/_/g, ' ').toUpperCase()}</option>
                        ))}
                    </select>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-purple-600 font-bold">
                        <i className="fas fa-check-circle"></i> Todos os templates são 100% ATS-Friendly
                    </div>
                </div>
            </div>

            {/* Informações Pessoais */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <i className="fas fa-user-circle text-blue-500"></i> Informações de Contato
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={labelClasses}>Nome Completo</label>
                        <input type="text" value={personalInfo.name} onChange={e => setPersonalInfo({...personalInfo, name: e.target.value})} className={inputClasses} placeholder="Ex: Ana Silva" required />
                    </div>
                    <div>
                        <label className={labelClasses}>Email</label>
                        <input type="email" value={personalInfo.email} onChange={e => setPersonalInfo({...personalInfo, email: e.target.value})} className={inputClasses} placeholder="ana@email.com" required />
                    </div>
                    <div>
                        <label className={labelClasses}>LinkedIn</label>
                        <input type="text" value={personalInfo.linkedin} onChange={e => setPersonalInfo({...personalInfo, linkedin: e.target.value})} className={inputClasses} placeholder="linkedin.com/in/perfil" />
                    </div>
                </div>
            </div>

            {/* Experiência - O Coração do Currículo */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <i className="fas fa-briefcase text-orange-500"></i> Experiência Profissional (Foco em Métricas)
                    </h3>
                </div>
                
                <div className="space-y-6">
                    {experience.map((exp, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200 relative group">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <input type="text" value={exp.title} onChange={e => { const n = [...experience]; n[index].title = e.target.value; setExperience(n); }} className={inputClasses} placeholder="Cargo (Ex: Gerente de Projetos)" />
                                <input type="text" value={exp.company} onChange={e => { const n = [...experience]; n[index].company = e.target.value; setExperience(n); }} className={inputClasses} placeholder="Empresa" />
                            </div>
                            <textarea 
                                value={exp.description} 
                                onChange={e => { const n = [...experience]; n[index].description = e.target.value; setExperience(n); }} 
                                className={`${inputClasses} h-24`} 
                                placeholder="Liste suas responsabilidades e conquistas. Dica: A IA transformará rascunhos em frases de alto impacto automaticamente."
                            />
                            {experience.length > 1 && (
                                <button type="button" onClick={() => setExperience(experience.filter((_, i) => i !== index))} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs opacity-0 group-hover:opacity-100 transition shadow-lg">×</button>
                            )}
                        </div>
                    ))}
                </div>
                
                <button type="button" onClick={() => setExperience([...experience, { title: '', company: '', dates: '', description: '' }])} className="mt-4 w-full py-2 border-2 border-dashed border-gray-200 text-gray-400 rounded-xl text-xs font-bold hover:border-blue-300 hover:text-blue-500 transition">
                    + ADICIONAR EXPERIÊNCIA
                </button>
            </div>

            {/* Skills Modular */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <i className="fas fa-tools text-yellow-500"></i> Competências Técnicas
                </h3>
                <textarea 
                    value={skills.join(', ')} 
                    onChange={e => setSkills(e.target.value.split(',').map(s => s.trim()))} 
                    className={inputClasses} 
                    rows={2} 
                    placeholder="Python, React, Gestão de Pessoas, Inglês Fluente... (Separe por vírgula)" 
                />
            </div>

            {/* Botão de Geração Elite */}
            <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-5 px-6 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl transform hover:-translate-y-1"
                disabled={isLoading || isLocked || !personalInfo.name}
            >
                {isLoading ? (
                    <><i className="fas fa-spinner fa-spin"></i> Otimizando para ATS...</>
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