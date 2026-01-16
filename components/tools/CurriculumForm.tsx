import React, { useState } from 'react';
import {
    Rocket,
    FileUp,
    Sparkles,
    Check,
    Trash2,
    Plus,
    User,
    Mail,
    Phone,
    Linkedin,
    Globe,
    Briefcase,
    GraduationCap,
    Brain,
    Lock,
    Settings,
    Loader2,
    Info,
    AlertCircle
} from 'lucide-react';
import { ServiceKey } from '../../types/plan.types';
import { CURRICULUM_TEMPLATES } from '../resume/templates';

interface CurriculumFormProps {
    mode: ServiceKey;
    onGenerate: (prompt: string, mode: ServiceKey, generateAudio: boolean, options?: any, file?: { data: string, mimeType: string } | null) => Promise<any>;
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
    const [file, setFile] = useState<{ data: string, mimeType: string } | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionStatus, setExtractionStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const selectClasses = "w-full bg-slate-50 border border-slate-200 text-slate-700 p-3.5 text-sm rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 font-medium";
    const inputClasses = "w-full bg-slate-50 border border-slate-200 text-slate-700 p-3.5 text-sm rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 font-medium placeholder-slate-400";

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result?.toString().split(',')[1];
                if (base64String) {
                    setFile({ data: base64String, mimeType: selectedFile.type });
                    setExtractionStatus('idle');
                }
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleExtract = async () => {
        if (!file) return;
        setIsExtracting(true);
        setExtractionStatus('idle');

        try {
            const result = await onGenerate("Extrair dados profissionais", 'curriculum_parse', false, {}, file);

            if (result && result.text) {
                const jsonContent = result.text.match(/\{[\s\S]*\}/);
                if (jsonContent) {
                    const data = JSON.parse(jsonContent[0]);

                    if (data.personalInfo) setPersonalInfo(prev => ({ ...prev, ...data.personalInfo }));
                    if (data.summary) setSummary(data.summary);
                    if (data.experience && Array.isArray(data.experience)) setExperience(data.experience);
                    if (data.education && Array.isArray(data.education)) setEducation(data.education);
                    if (data.skills && Array.isArray(data.skills)) setSkills(data.skills);
                    if (data.projects && Array.isArray(data.projects)) setProjects(data.projects);
                    if (data.certifications && Array.isArray(data.certifications)) setCertifications(data.certifications);

                    setExtractionStatus('success');
                } else {
                    throw new Error("Formato de extração inválido.");
                }
            }
        } catch (error) {
            console.error("Erro na extração:", error);
            setExtractionStatus('error');
        } finally {
            setIsExtracting(false);
        }
    };

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
        onGenerate(prompt, mode, false, options, file);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up">
            {/* GUPY OPTIMIZATION BANNER */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100 mb-8 flex items-center gap-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                    <Rocket className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h3 className="font-black text-xl leading-tight mb-1">Otimização Anti-GUPY 🤖</h3>
                    <p className="text-xs text-indigo-100 font-medium">Nossa IA organiza seu currículo com as palavras-chave certas para vencer os filtros ATS e impressionar recrutadores humanos.</p>
                </div>
            </div>

            {/* Step 1: PDF Upload & Extraction */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 text-xs font-black">1</div>
                    <label className="block text-sm font-bold text-slate-800 uppercase tracking-tight">
                        Importar Currículo Atual
                    </label>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <FileUp className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 transition-all cursor-pointer bg-slate-50 border border-slate-100 rounded-2xl pl-12"
                            disabled={isLoading || isLocked || isExtracting}
                        />
                    </div>

                    {file && (
                        <button
                            type="button"
                            onClick={handleExtract}
                            disabled={isExtracting || isLoading}
                            className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${extractionStatus === 'success'
                                ? 'bg-emerald-500 text-white shadow-emerald-100'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                                }`}
                        >
                            {isExtracting ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                            ) : extractionStatus === 'success' ? (
                                <><Check className="w-4 h-4" /> Pronto!</>
                            ) : (
                                <><Sparkles className="w-4 h-4" /> Auto-Preencher</>
                            )}
                        </button>
                    )}
                </div>

                {extractionStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-500 mt-4 text-xs font-bold animate-shake">
                        <AlertCircle className="w-4 h-4" /> Falha na leitura. Verifique se o PDF está legível.
                    </div>
                )}

                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                    <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        Dica: O "Auto-Preencher" usa IA para identificar suas experiências no PDF e preencher os campos abaixo automaticamente.
                    </p>
                </div>
            </div>

            {/* Step 2: Template Selection */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 text-xs font-black">2</div>
                    <label className="block text-sm font-bold text-slate-800 uppercase tracking-tight">
                        Escolha o Template Premium
                    </label>
                </div>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Settings className="w-5 h-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                    </div>
                    <select
                        id="curriculumTemplate"
                        value={selectedCurriculumTemplate}
                        onChange={e => setSelectedCurriculumTemplate(e.target.value)}
                        className={`${selectClasses} pl-12`}
                        disabled={isLoading || isLocked || isExtracting}
                    >
                        {Object.keys(CURRICULUM_TEMPLATES).map(key => (
                            <option key={key} value={key}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Step 3: Detailed Info */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">

                {/* Personal Info */}
                <div>
                    <h3 className="text-base font-black text-slate-800 mb-6 flex items-center gap-3">
                        <User className="w-5 h-5 text-indigo-600" /> Dados de Contato
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1.5"><User className="w-3 h-3" /> Nome Completo</label>
                            <input type="text" value={personalInfo.name} onChange={e => setPersonalInfo({ ...personalInfo, name: e.target.value })} className={inputClasses} placeholder="Ex: João da Silva" disabled={isLoading || isLocked} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</label>
                            <input type="email" value={personalInfo.email} onChange={e => setPersonalInfo({ ...personalInfo, email: e.target.value })} className={inputClasses} placeholder="joao@exemplo.com" disabled={isLoading || isLocked} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1.5"><Phone className="w-3 h-3" /> Telefone</label>
                            <input type="tel" value={personalInfo.phone} onChange={e => setPersonalInfo({ ...personalInfo, phone: e.target.value })} className={inputClasses} placeholder="(11) 98765-4321" disabled={isLoading || isLocked} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1.5"><Linkedin className="w-3 h-3" /> LinkedIn URL</label>
                            <input type="url" value={personalInfo.linkedin} onChange={e => setPersonalInfo({ ...personalInfo, linkedin: e.target.value })} className={inputClasses} placeholder="linkedin.com/in/seu_perfil" disabled={isLoading || isLocked} />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-50"></div>

                {/* Experience */}
                <div>
                    <h3 className="text-base font-black text-slate-800 mb-6 flex items-center justify-between">
                        <span className="flex items-center gap-3"><Briefcase className="w-5 h-5 text-indigo-600" /> Experiência Profissional</span>
                        <button
                            type="button"
                            onClick={() => setExperience([...experience, { title: '', company: '', dates: '', description: '' }])}
                            className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-100 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-3 h-3" /> Adicionar
                        </button>
                    </h3>
                    <div className="space-y-6">
                        {experience.map((exp, index) => (
                            <div key={index} className="p-6 border border-slate-100 rounded-3xl bg-slate-50/30 relative group transition-all hover:bg-white hover:shadow-md">
                                <button
                                    type="button"
                                    onClick={() => setExperience(experience.filter((_, i) => i !== index))}
                                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Cargo</label>
                                        <input type="text" value={exp.title} onChange={e => { const newExp = [...experience]; newExp[index].title = e.target.value; setExperience(newExp); }} className={inputClasses} placeholder="Ex: Gestor de Vendas" disabled={isLoading || isLocked} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Empresa</label>
                                        <input type="text" value={exp.company} onChange={e => { const newExp = [...experience]; newExp[index].company = e.target.value; setExperience(newExp); }} className={inputClasses} placeholder="Empresa S.A." disabled={isLoading || isLocked} />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Descrição das Atividades</label>
                                        <textarea value={exp.description} onChange={e => { const newExp = [...experience]; newExp[index].description = e.target.value; setExperience(newExp); }} className={inputClasses} rows={3} placeholder="Descreva suas conquistas..." disabled={isLoading || isLocked} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="h-px bg-slate-50"></div>

                {/* Education */}
                <div>
                    <h3 className="text-base font-black text-slate-800 mb-6 flex items-center justify-between">
                        <span className="flex items-center gap-3"><GraduationCap className="w-5 h-5 text-indigo-600" /> Formação Acadêmica</span>
                        <button
                            type="button"
                            onClick={() => setEducation([...education, { degree: '', institution: '', dates: '', description: '' }])}
                            className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-100 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-3 h-3" /> Adicionar
                        </button>
                    </h3>
                    <div className="space-y-6">
                        {education.map((edu, index) => (
                            <div key={index} className="p-6 border border-slate-100 rounded-3xl bg-slate-50/30 relative group transition-all hover:bg-white hover:shadow-md">
                                <button
                                    type="button"
                                    onClick={() => setEducation(education.filter((_, i) => i !== index))}
                                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Curso / Grau</label>
                                        <input type="text" value={edu.degree} onChange={e => { const newEdu = [...education]; newEdu[index].degree = e.target.value; setEducation(newEdu); }} className={inputClasses} placeholder="Administração" disabled={isLoading || isLocked} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Instituição</label>
                                        <input type="text" value={edu.institution} onChange={e => { const newEdu = [...education]; newEdu[index].institution = e.target.value; setEducation(newEdu); }} className={inputClasses} placeholder="Universidade Federal" disabled={isLoading || isLocked} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="h-px bg-slate-50"></div>

                {/* Skills */}
                <div className="space-y-4">
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-3">
                        <Brain className="w-5 h-5 text-indigo-600" /> Habilidades & Palavras-Chave
                    </h3>
                    <p className="text-xs text-slate-500 font-medium italic">Separe as habilidades por vírgula para melhor otimização.</p>
                    <textarea
                        value={skills.join(', ')}
                        onChange={e => setSkills(e.target.value.split(',').map(s => s.trim()))}
                        className={inputClasses}
                        rows={3}
                        placeholder="Ex: Liderança de Equipes, Gestão de Tempo, Inglês-Fluente, Photoshop..."
                        disabled={isLoading || isLocked}
                    />
                </div>
            </div>

            {/* Submission */}
            <div className="pt-8">
                <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black py-5 px-8 rounded-3xl focus:outline-none focus:ring-8 focus:ring-indigo-500/10 transition-all duration-500 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center shadow-2xl shadow-indigo-200 transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-sm"
                    disabled={isLoading || isLocked || isExtracting || !personalInfo.name || !personalInfo.email}
                >
                    {isLoading ? (
                        <><Loader2 className="w-5 h-5 animate-spin mr-3" /> Criando seu Destino...</>
                    ) : (
                        <>
                            {isLocked ? <><Lock className="w-5 h-5 mr-3" /> Acesso Bloqueado</> : <><Sparkles className="w-5 h-5 mr-3" /> Gerar Currículo Ultra-Premium</>}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
