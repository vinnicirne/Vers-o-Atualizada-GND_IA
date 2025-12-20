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
    const [summary, setSummary] = useState('');
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
            const base64Promise = new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
            });

            const base64 = await base64Promise;
            const extracted = await extractCurriculumData(base64, file.type);
            
            if (extracted) {
                if (extracted.name) setPersonalInfo({
                    name: extracted.name || '',
                    email: extracted.email || '',
                    phone: extracted.phone || '',
                    linkedin: extracted.linkedin || '',
                    location: extracted.location || ''
                });
                if (extracted.summary) setSummary(extracted.summary);
                if (extracted.experience?.length > 0) setExperience(extracted.experience);
                if (extracted.education?.length > 0) setEducation(extracted.education);
                if (extracted.skills) setSkills(Array.isArray(extracted.skills) ? extracted.skills.join(', ') : extracted.skills);
                
                alert("Dados extraídos com sucesso! Revise as informações abaixo.");
            }
        } catch (error) {
            console.error("Scan error:", error);
            alert("Erro ao ler o PDF. Tente preencher manualmente.");
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(`Gerar currículo de impacto para: ${targetJob}`, mode, false, {
            template: selectedTemplate,
            personalInfo,
            summary,
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
                className={`group relative p-12 rounded-3xl border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center text-center cursor-pointer
                ${isScanning ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-200 hover:border-blue-400 hover:bg-white'}`}
                onClick={() => !isScanning && fileInputRef.current?.click()}
            >
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all duration-500 
                    ${isScanning ? 'bg-blue-500 text-white animate-bounce' : 'bg-white text-blue-500 shadow-xl group-hover:scale-110'}`}>
                    {isScanning ? <i className="fas fa-microchip text-4xl"></i> : <i className="fas fa-cloud-upload-alt text-4xl"></i>}
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-800">Elite Scan & Pre-Fill</h3>
                    <p className="text-sm text-gray-500 mt-2 max-w-sm">
                        {isScanning ? 'Lendo histórico e extraindo métricas...' : 'Suba seu currículo atual e deixe a IA preencher o formulário para você.'}
                    </p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/pdf" className="hidden" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lateral */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i className="fas fa-bullseye text-blue-600"></i> Job Match
                        </h3>
                        <label className={labelClasses}>Descrição da Vaga</label>
                        <textarea 
                            value={targetJob}
                            onChange={e => setTargetJob(e.target.value)}
                            placeholder="Cole a descrição da vaga do LinkedIn..."
                            className={`${inputClasses} h-32 text-xs`}
                        />
                    </div>

                    <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-xl shadow-indigo-100">
                        <h4 className="font-bold mb-2">Design de Elite</h4>
                        <select 
                            value={selectedTemplate} 
                            onChange={e => setSelectedTemplate(e.target.value)} 
                            className="w-full bg-white/10 border-none text-white p-3 rounded-lg text-sm font-bold focus:ring-0 cursor-pointer"
                        >
                            <option value="modern_standard" className="text-gray-900">MODERN EXECUTIVE (Ref. Fernando)</option>
                            <option value="professional_clean" className="text-gray-900">CLEAN ACADEMIC</option>
                            <option value="creative_sidebar" className="text-gray-900">CREATIVE SIDEBAR</option>
                        </select>
                    </div>
                </div>

                {/* Principal */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-800 mb-6 border-b pb-4">Dados de Contato</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className={labelClasses}>Nome Completo</label>
                                <input type="text" value={personalInfo.name} onChange={e => setPersonalInfo({...personalInfo, name: e.target.value})} className={inputClasses} required />
                            </div>
                            <input type="email" placeholder="Email" value={personalInfo.email} onChange={e => setPersonalInfo({...personalInfo, email: e.target.value})} className={inputClasses} required />
                            <input type="text" placeholder="WhatsApp" value={personalInfo.phone} onChange={e => setPersonalInfo({...personalInfo, phone: e.target.value})} className={inputClasses} />
                            <input type="text" placeholder="LinkedIn URL" value={personalInfo.linkedin} onChange={e => setPersonalInfo({...personalInfo, linkedin: e.target.value})} className={inputClasses} />
                            <input type="text" placeholder="Cidade/Estado" value={personalInfo.location} onChange={e => setPersonalInfo({...personalInfo, location: e.target.value})} className={inputClasses} />
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-800 mb-4">Perfil Profissional</h3>
                        <textarea 
                            value={summary}
                            onChange={e => setSummary(e.target.value)}
                            placeholder="Descreva seu perfil de liderança e objetivos..."
                            className={`${inputClasses} h-32`}
                        />
                    </div>

                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-gray-800">Experiências</h3>
                            <button type="button" onClick={() => setExperience([...experience, { title: '', company: '', dates: '', description: '' }])} className="text-blue-600 font-bold text-xs">+ ADICIONAR</button>
                        </div>
                        <div className="space-y-6">
                            {experience.map((exp, idx) => (
                                <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <input placeholder="Cargo" value={exp.title} onChange={e => { const n = [...experience]; n[idx].title = e.target.value; setExperience(n); }} className={inputClasses} />
                                        <input placeholder="Empresa" value={exp.company} onChange={e => { const n = [...experience]; n[idx].company = e.target.value; setExperience(n); }} className={inputClasses} />
                                    </div>
                                    <input placeholder="Datas (ex: Jan 2022 - Mar 2024)" value={exp.dates} onChange={e => { const n = [...experience]; n[idx].dates = e.target.value; setExperience(n); }} className={`${inputClasses} mb-3`} />
                                    <textarea placeholder="Principais entregas e métricas..." value={exp.description} onChange={e => { const n = [...experience]; n[idx].description = e.target.value; setExperience(n); }} className={`${inputClasses} h-24 text-xs`} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-800 mb-4">Competências</h3>
                        <textarea value={skills} onChange={e => setSkills(e.target.value)} placeholder="React, Liderança, SCRUM..." className={inputClasses} rows={3} />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-6 rounded-3xl transition-all shadow-2xl disabled:opacity-50"
                        disabled={isLoading || isLocked || isScanning || !personalInfo.name}
                    >
                        {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>Gerando Design Elite...</> : 'Gerar Currículo Aprovado (8 Créditos)'}
                    </button>
                </div>
            </div>
        </form>
    );
}