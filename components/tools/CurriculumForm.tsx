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
    const [prompt, setPrompt] = useState('');
    const [selectedCurriculumTemplate, setSelectedCurriculumTemplate] = useState(Object.keys(CURRICULUM_TEMPLATES)[0]);
    const [personalInfo, setPersonalInfo] = useState({ name: '', email: '', phone: '', linkedin: '', portfolio: '' });
    const [summary, setSummary] = useState('');
    const [experience, setExperience] = useState([{ title: '', company: '', dates: '', description: '' }]);
    const [education, setEducation] = useState([{ degree: '', institution: '', dates: '', description: '' }]);
    const [skills, setSkills] = useState<string[]>([]);
    const [projects, setProjects] = useState([{ name: '', description: '', technologies: '' }]);
    const [certifications, setCertifications] = useState<string[]>([]);

    const selectClasses = "w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300";
    const inputClasses = "w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const options = {
            template: selectedCurriculumTemplate,
            personalInfo,
            summary,
            experience: experience.filter(exp => exp.title || exp.company || exp.description),
            education: education.filter(edu => edu.degree || edu.institution || edu.description),
            skills: skills.filter(skill => skill.trim() !== ''),
            projects: projects.filter(proj => proj.name || proj.description),
            certifications: certifications.filter(cert => cert.trim() !== ''),
        };
        onGenerate(prompt, mode, false, options);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            {/* Template Selection */}
            <div>
                <label htmlFor="curriculumTemplate" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                    Design do Currículo
                </label>
                <select 
                    id="curriculumTemplate" 
                    value={selectedCurriculumTemplate} 
                    onChange={e => setSelectedCurriculumTemplate(e.target.value)} 
                    className={selectClasses} 
                    disabled={isLoading || isLocked}
                >
                    {Object.keys(CURRICULUM_TEMPLATES).map(key => (
                        <option key={key} value={key}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                    ))}
                </select>
            </div>

            {/* Personal Info */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-inner">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <i className="fas fa-user-circle text-blue-500"></i> Informações Pessoais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Nome Completo</label>
                        <input type="text" value={personalInfo.name} onChange={e => setPersonalInfo({...personalInfo, name: e.target.value})} className={inputClasses} placeholder="Seu nome" disabled={isLoading || isLocked} />
                    </div>
                    <div>
                        <label className="block text-xs uppercase font-bold mb-1 text-gray-500">E-mail Profissional</label>
                        <input type="email" value={personalInfo.email} onChange={e => setPersonalInfo({...personalInfo, email: e.target.value})} className={inputClasses} placeholder="seu@email.com" disabled={isLoading || isLocked} />
                    </div>
                    <div>
                        <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Telefone / WhatsApp</label>
                        <input type="tel" value={personalInfo.phone} onChange={e => setPersonalInfo({...personalInfo, phone: e.target.value})} className={inputClasses} placeholder="(XX) XXXXX-XXXX" disabled={isLoading || isLocked} />
                    </div>
                    <div>
                        <label className="block text-xs uppercase font-bold mb-1 text-gray-500">LinkedIn URL</label>
                        <input type="url" value={personalInfo.linkedin} onChange={e => setPersonalInfo({...personalInfo, linkedin: e.target.value})} className={inputClasses} placeholder="https://linkedin.com/in/perfil" disabled={isLoading || isLocked} />
                    </div>
                </div>
            </div>

            {/* Main Prompt (Objective) */}
            <div>
                <label htmlFor="prompt" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                    Destaque de Carreira ou Foco Específico (Instrução para a IA)
                </label>
                <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ex: 'Enfatize minha experiência com liderança de equipes remotas e expansão de mercado para os EUA.' ou 'Torne o texto mais sênior e focado em resultados financeiros.'"
                    rows={3}
                    className="w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-4 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300 placeholder-gray-400 disabled:opacity-50 disabled:bg-gray-50 resize-y"
                    disabled={isLoading || isLocked}
                />
            </div>

            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <i className="fas fa-feather-alt text-orange-500"></i> Seu Resumo Base
                </h3>
                <textarea value={summary} onChange={e => setSummary(e.target.value)} className={inputClasses} rows={3} placeholder="Escreva um rascunho curto do seu resumo. A IA irá refiná-lo profissionalmente." disabled={isLoading || isLocked} />
            </div>

            {/* Work Experience */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <i className="fas fa-briefcase text-green-600"></i> Histórico Profissional
                </h3>
                <p className="text-[10px] text-gray-400 mb-3 uppercase font-bold">Liste suas tarefas básicas e a IA criará conquistas com métricas.</p>
                {experience.map((exp, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-3 border border-gray-100 rounded-md bg-white shadow-sm">
                        <div>
                            <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Cargo</label>
                            <input type="text" value={exp.title} onChange={e => { const newExp = [...experience]; newExp[index].title = e.target.value; setExperience(newExp); }} className={inputClasses} placeholder="Ex: Gerente de Vendas" disabled={isLoading || isLocked} />
                        </div>
                        <div>
                            <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Empresa</label>
                            <input type="text" value={exp.company} onChange={e => { const newExp = [...experience]; newExp[index].company = e.target.value; setExperience(newExp); }} className={inputClasses} placeholder="Nome da Organização" disabled={isLoading || isLocked} />
                        </div>
                        <div>
                            <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Período</label>
                            <input type="text" value={exp.dates} onChange={e => { const newExp = [...experience]; newExp[index].dates = e.target.value; setExperience(newExp); }} className={inputClasses} placeholder="2020 - 2024" disabled={isLoading || isLocked} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Atividades Principais</label>
                            <textarea value={exp.description} onChange={e => { const newExp = [...experience]; newExp[index].description = e.target.value; setExperience(newExp); }} className={inputClasses} rows={2} placeholder="O que você fazia? A IA reescreverá como conquista." disabled={isLoading || isLocked} />
                        </div>
                        {experience.length > 1 && (
                            <button type="button" onClick={() => setExperience(experience.filter((_, i) => i !== index))} className="md:col-span-2 text-red-400 hover:text-red-600 text-[10px] font-bold uppercase mt-1 text-right">Excluir Experiência</button>
                        )}
                    </div>
                ))}
                <button type="button" onClick={() => setExperience([...experience, { title: '', company: '', dates: '', description: '' }])} className="w-full bg-blue-50 text-blue-700 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2" disabled={isLoading || isLocked}>
                    <i className="fas fa-plus"></i> Adicionar Cargo
                </button>
            </div>

            {/* Education */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <i className="fas fa-graduation-cap text-indigo-500"></i> Formação Acadêmica
                </h3>
                {education.map((edu, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-3 border border-gray-100 rounded-md bg-white shadow-sm">
                        <div>
                            <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Curso</label>
                            <input type="text" value={edu.degree} onChange={e => { const newEdu = [...education]; newEdu[index].degree = e.target.value; setEducation(newEdu); }} className={inputClasses} placeholder="Bacharelado em..." disabled={isLoading || isLocked} />
                        </div>
                        <div>
                            <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Instituição</label>
                            <input type="text" value={edu.institution} onChange={e => { const newEdu = [...education]; newEdu[index].institution = e.target.value; setEducation(newEdu); }} className={inputClasses} placeholder="Universidade" disabled={isLoading || isLocked} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Skills */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                    <i className="fas fa-tools text-yellow-600"></i> Competências Técnicas & Idiomas
                </h3>
                <label className="block text-[10px] uppercase font-bold mb-3 text-gray-400">Separe por vírgulas.</label>
                <textarea 
                    value={skills.join(', ')} 
                    onChange={e => setSkills(e.target.value.split(',').map(s => s.trim()))} 
                    className={inputClasses} 
                    rows={2} 
                    placeholder="Python, Gestão Ágil, Inglês Fluente, Excel Avançado..." 
                    disabled={isLoading || isLocked} 
                />
            </div>

            <button
                type="submit"
                className="w-full bg-[var(--brand-primary)] hover:bg-orange-500 text-white font-bold py-4 px-6 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all duration-300 disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center shadow-md transform hover:-translate-y-0.5"
                disabled={isLoading || isLocked || !personalInfo.name || !personalInfo.email}
            >
                {isLoading ? (
                    <>Processando com IA de Elite...</>
                ) : (
                    <>
                        {isLocked ? <><i className="fas fa-lock mr-2"></i> Plano Insuficiente</> : <><i className="fas fa-magic mr-2"></i> Gerar Currículo de Elite (8 Créditos)</>}
                    </>
                )}
            </button>
        </form>
    );
}