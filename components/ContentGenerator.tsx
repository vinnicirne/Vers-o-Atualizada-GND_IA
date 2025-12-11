
import React, { useState, useEffect, useRef } from 'react';
import { CREATOR_SUITE_MODES } from '../constants';
import { ServiceKey } from '../types/plan.types';
import { usePlan } from '../hooks/usePlan';
import { CURRICULUM_TEMPLATES } from './resume/templates';
import { sendBriefingMessage } from '../services/geminiService'; // Nova função importada

interface ContentGeneratorProps {
  mode: ServiceKey;
  onModeChange: (mode: ServiceKey) => void;
  onGenerate: (
    prompt: string, 
    mode: ServiceKey, 
    generateAudio: boolean,
    options?: any
  ) => void;
  isLoading: boolean;
  isGuest?: boolean;
  guestAllowedModes?: ServiceKey[];
}

// ... (Constantes THEMES, IMAGE_STYLES, etc mantidas)
const THEMES = [
  { value: 'modern', label: 'Moderno & Clean' },
  { value: 'minimalist', label: 'Minimalista' },
  { value: 'luxury', label: 'Luxo & Elegante' },
  { value: 'startup', label: 'Startup / Tech' },
  { value: 'corporate', label: 'Corporativo' },
  { value: 'playful', label: 'Divertido / Vibrante' },
  { value: 'dark', label: 'Dark Mode / Cyberpunk' },
  { value: 'nature', label: 'Natureza / Orgânico' },
];

const IMAGE_STYLES = [
    { value: 'photorealistic', label: 'Fotorealista (8k)' },
    { value: 'cyberpunk', label: 'Cyberpunk / Neon' },
    { value: 'anime', label: 'Anime / Manga' },
    { value: 'oil_painting', label: 'Pintura a Óleo' },
    { value: '3d_render', label: 'Render 3D (Pixar Style)' },
    { value: 'cinematic', label: 'Cinematográfico' },
    { value: 'vector', label: 'Vetor / Flat Design' },
];

const SOCIAL_PLATFORMS = [
    { value: 'instagram_feed', label: 'Instagram Feed (Quadrado 1:1)' },
    { value: 'instagram_story', label: 'Instagram Stories / Reels (9:16)' },
    { value: 'facebook_post', label: 'Facebook Post (Paisagem)' },
    { value: 'linkedin_post', label: 'LinkedIn Post (Corporativo)' },
    { value: 'twitter_post', label: 'X (Twitter) Post' },
    { value: 'youtube_thumbnail', label: 'YouTube Thumbnail' },
];

const ASPECT_RATIOS = [
    { value: '1:1', label: 'Quadrado (Instagram)' },
    { value: '16:9', label: 'Paisagem (YouTube)' },
    { value: '9:16', label: 'Retrato (Stories)' },
];

const VOICES = [
    { value: 'Kore', label: 'Kore (Feminina - Padrão)' },
    { value: 'Aoede', label: 'Aoede (Feminina - Suave)' },
    { value: 'Puck', label: 'Puck (Masculina - Energética)' },
    { value: 'Charon', label: 'Charon (Masculina - Profunda)' },
    { value: 'Fenrir', label: 'Fenrir (Masculina - Intensa)' },
];

export function ContentGenerator({ mode, onModeChange, onGenerate, isLoading, isGuest = false, guestAllowedModes = [] }: ContentGeneratorProps) {
  const { currentPlan, hasAccessToService, getCreditsCostForService } = usePlan();
  const ttsCost = getCreditsCostForService('text_to_speech');

  // Standard Form State
  const [prompt, setPrompt] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [generateAudio, setGenerateAudio] = useState(false);
  
  const [theme, setTheme] = useState('modern');
  const [primaryColor, setPrimaryColor] = useState('#10B981'); 
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageStyle, setImageStyle] = useState('photorealistic');
  const [platform, setPlatform] = useState('instagram_feed');
  const [selectedVoice, setSelectedVoice] = useState('Kore');

  // Curriculum State
  const [selectedCurriculumTemplate, setSelectedCurriculumTemplate] = useState(Object.keys(CURRICULUM_TEMPLATES)[0]);
  const [personalInfo, setPersonalInfo] = useState({ name: '', email: '', phone: '', linkedin: '', portfolio: '' });
  const [summary, setSummary] = useState('');
  const [experience, setExperience] = useState([{ title: '', company: '', dates: '', description: '' }]);
  const [education, setEducation] = useState([{ degree: '', institution: '', dates: '', description: '' }]);
  const [skills, setSkills] = useState<string[]>([]);
  const [projects, setProjects] = useState([{ name: '', description: '', technologies: '' }]);
  const [certifications, setCertifications] = useState<string[]>([]);

  // --- CHAT BRIEFING STATE ---
  interface ChatMessage { role: 'user' | 'model'; text: string; }
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isBriefingComplete, setIsBriefingComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isModeLocked = (modeValue: ServiceKey) => {
      if (isGuest) {
          return !guestAllowedModes.includes(modeValue);
      }
      return !hasAccessToService(modeValue);
  };

  useEffect(() => {
    const selectedMode = CREATOR_SUITE_MODES.find(m => m.value === mode);
    setPlaceholder(selectedMode?.placeholder || '');
    setPrompt('');
    setGenerateAudio(false);
    
    // Reset Chat when mode changes
    if (mode === 'landingpage_generator') {
        // Updated initial message: humanized consultant persona
        setMessages([{ role: 'model', text: 'Olá! Sou seu consultor de design. Vou te ajudar a criar um site profissional.\n\nPara começar, me diga: Qual é o nome do seu negócio e o que vocês oferecem?' }]);
        setIsChatting(false);
        setIsBriefingComplete(false);
    }
  }, [mode]);

  useEffect(() => {
      // Auto-scroll chat
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleChatSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim() || isChatting) return;

      const userMsg = chatInput;
      setChatInput('');
      
      // Update UI with User Message
      const newMessages = [...messages, { role: 'user', text: userMsg }];
      setMessages(newMessages as ChatMessage[]);
      setIsChatting(true);

      try {
          // Converter histórico para formato da API Gemini
          const apiHistory = newMessages.slice(0, -1).map(m => ({
              role: m.role,
              parts: [{ text: m.text }]
          }));

          const response = await sendBriefingMessage(userMsg, apiHistory);

          if (response.isComplete && response.data) {
              // Briefing Completed!
              setMessages(prev => [...prev, { role: 'model', text: "Perfeito! Tenho todas as informações. Estou gerando seu site agora..." }]);
              setIsBriefingComplete(true);
              
              // Trigger actual generation
              onGenerate(
                  response.data.summary_prompt, 
                  'landingpage_generator', 
                  false, 
                  { 
                      theme: response.data.suggested_theme, 
                      primaryColor: response.data.suggested_color 
                  }
              );
          } else {
              // Continue conversation
              setMessages(prev => [...prev, { role: 'model', text: response.text }]);
          }
      } catch (err) {
          setMessages(prev => [...prev, { role: 'model', text: "Desculpe, tive um erro de conexão. Pode repetir?" }]);
      } finally {
          setIsChatting(false);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let options: any = undefined;
    
    if (mode === 'image_generation') {
        options = { aspectRatio, imageStyle };
    } else if (mode === 'social_media_poster') {
        options = { platform, theme };
    } else if (mode === 'text_to_speech') {
        options = { voice: selectedVoice };
    } else if (mode === 'curriculum_generator') {
        options = {
            template: selectedCurriculumTemplate,
            personalInfo,
            summary,
            experience: experience.filter(exp => exp.title || exp.company || exp.description),
            education: education.filter(edu => edu.degree || edu.institution || edu.description),
            skills: skills.filter(skill => skill.trim() !== ''),
            projects: projects.filter(proj => proj.name || proj.description),
            certifications: certifications.filter(cert => cert.trim() !== ''),
        };
        onGenerate(prompt, mode, generateAudio, options);
        return;
    }

    onGenerate(prompt, mode, generateAudio, options);
  };
  
  const selectClasses = "w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300";
  const inputClasses = "w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300";

  // --- RENDERIZADOR DE CHAT (Para o modo Landing Page) ---
  if (mode === 'landingpage_generator' && !isModeLocked(mode)) {
      return (
        <div className="bg-white p-0 rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col h-[600px] animate-fade-in">
            {/* Header Chat */}
            <div className="bg-gradient-to-r from-[var(--brand-secondary)] to-gray-800 p-4 flex items-center gap-3 shadow-md z-10">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[var(--brand-primary)] border-2 border-green-400 relative">
                    <i className="fas fa-robot text-xl"></i>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm">Assistente de Criação</h3>
                    <p className="text-gray-300 text-xs">Briefing Interativo • GDN_IA</p>
                </div>
                {/* Reset Button */}
                <button 
                    onClick={() => {
                        setMessages([{ role: 'model', text: 'Olá! Sou seu consultor de design. Vou te ajudar a criar um site profissional.\n\nPara começar, me diga: Qual é o nome do seu negócio e o que vocês oferecem?' }]);
                        setIsBriefingComplete(false);
                    }}
                    className="ml-auto text-gray-400 hover:text-white text-xs bg-white/10 px-3 py-1 rounded-full transition"
                >
                    <i className="fas fa-redo mr-1"></i> Reiniciar
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-gray-50 p-4 overflow-y-auto custom-scrollbar space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                            ? 'bg-[var(--brand-primary)] text-white rounded-tr-none' 
                            : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                        }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isChatting && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
                {!isBriefingComplete ? (
                    <form onSubmit={handleChatSubmit} className="flex gap-2">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Digite sua resposta..." 
                            className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-3 focus:ring-2 focus:ring-[var(--brand-primary)] focus:bg-white transition outline-none"
                            disabled={isChatting || isLoading}
                            autoFocus
                        />
                        <button 
                            type="submit" 
                            disabled={!chatInput.trim() || isChatting || isLoading}
                            className="w-12 h-12 bg-[var(--brand-primary)] hover:bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg transition transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
                        >
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </form>
                ) : (
                    <div className="text-center p-2">
                        <p className="text-green-600 font-bold mb-2"><i className="fas fa-check-circle"></i> Informações Coletadas!</p>
                        <p className="text-xs text-gray-500">Aguarde, estamos construindo seu site...</p>
                    </div>
                )}
            </div>
        </div>
      );
  }

  // --- RENDERIZADOR PADRÃO (Formulário) ---
  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <div className="mb-6 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-[var(--brand-secondary)]">
              {CREATOR_SUITE_MODES.find(m => m.value === mode)?.label}
          </h2>
          <p className="text-sm text-gray-500">Preencha os detalhes abaixo para gerar seu conteúdo.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Opções Extras para Image Generation */}
        {mode === 'image_generation' && !isModeLocked('image_generation') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            <div>
              <label htmlFor="imageStyle" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                Estilo da Arte
              </label>
              <select id="imageStyle" value={imageStyle} onChange={e => setImageStyle(e.target.value)} className={selectClasses} disabled={isLoading}>
                {IMAGE_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="aspectRatio" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                Proporção (Formato)
              </label>
              <select id="aspectRatio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className={selectClasses} disabled={isLoading}>
                {ASPECT_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Opções Extras para Social Media Poster */}
        {mode === 'social_media_poster' && !isModeLocked('social_media_poster') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            <div>
              <label htmlFor="platform" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                Plataforma de Destino
              </label>
              <select id="platform" value={platform} onChange={e => setPlatform(e.target.value)} className={selectClasses} disabled={isLoading}>
                {SOCIAL_PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="theme" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                Tema / Vibe
              </label>
              <select id="theme" value={theme} onChange={e => setTheme(e.target.value)} className={selectClasses} disabled={isLoading}>
                {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Opções Extras para Text to Speech */}
        {mode === 'text_to_speech' && !isModeLocked('text_to_speech') && (
            <div className="animate-fade-in">
                <label htmlFor="voice" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                    Selecione a Voz
                </label>
                <select id="voice" value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className={selectClasses} disabled={isLoading}>
                    {VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
            </div>
        )}

        {/* Currículo Generator Form */}
        {mode === 'curriculum_generator' && !isModeLocked(mode) && (
            <div className="space-y-6 animate-fade-in">
                {/* Template Selection */}
                <div>
                    <label htmlFor="curriculumTemplate" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                        Escolha um Template
                    </label>
                    <select 
                        id="curriculumTemplate" 
                        value={selectedCurriculumTemplate} 
                        onChange={e => setSelectedCurriculumTemplate(e.target.value)} 
                        className={selectClasses} 
                        disabled={isLoading}
                    >
                        {Object.keys(CURRICULUM_TEMPLATES).map(key => (
                            <option key={key} value={key}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                        ))}
                    </select>
                </div>

                {/* Personal Info */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">Informações Pessoais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Nome Completo</label>
                            <input type="text" value={personalInfo.name} onChange={e => setPersonalInfo({...personalInfo, name: e.target.value})} className={inputClasses} placeholder="Seu nome" disabled={isLoading} />
                        </div>
                        <div>
                            <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Email</label>
                            <input type="email" value={personalInfo.email} onChange={e => setPersonalInfo({...personalInfo, email: e.target.value})} className={inputClasses} placeholder="seu@email.com" disabled={isLoading} />
                        </div>
                        <div>
                            <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Telefone</label>
                            <input type="tel" value={personalInfo.phone} onChange={e => setPersonalInfo({...personalInfo, phone: e.target.value})} className={inputClasses} placeholder="(XX) XXXXX-XXXX" disabled={isLoading} />
                        </div>
                        <div>
                            <label className="block text-xs uppercase font-bold mb-1 text-gray-500">LinkedIn URL</label>
                            <input type="url" value={personalInfo.linkedin} onChange={e => setPersonalInfo({...personalInfo, linkedin: e.target.value})} className={inputClasses} placeholder="https://linkedin.com/in/seu_perfil" disabled={isLoading} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Portfólio/Website URL</label>
                            <input type="url" value={personalInfo.portfolio} onChange={e => setPersonalInfo({...personalInfo, portfolio: e.target.value})} className={inputClasses} placeholder="https://seuportfolio.com" disabled={isLoading} />
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">Resumo Profissional / Objetivo</h3>
                    <textarea value={summary} onChange={e => setSummary(e.target.value)} className={inputClasses} rows={3} placeholder="Desenvolvedor Fullstack com foco em ... busca oportunidade para ..." disabled={isLoading} />
                </div>

                {/* Work Experience */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">Experiência Profissional</h3>
                    {experience.map((exp, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-3 border border-gray-100 rounded-md bg-white">
                            <div>
                                <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Cargo</label>
                                <input type="text" value={exp.title} onChange={e => { const newExp = [...experience]; newExp[index].title = e.target.value; setExperience(newExp); }} className={inputClasses} placeholder="Desenvolvedor Sênior" disabled={isLoading} />
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Empresa</label>
                                <input type="text" value={exp.company} onChange={e => { const newExp = [...experience]; newExp[index].company = e.target.value; setExperience(newExp); }} className={inputClasses} placeholder="Empresa X S.A." disabled={isLoading} />
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Período (Ex: Jan 2020 - Presente)</label>
                                <input type="text" value={exp.dates} onChange={e => { const newExp = [...experience]; newExp[index].dates = e.target.value; setExperience(newExp); }} className={inputClasses} placeholder="Jan 2020 - Presente" disabled={isLoading} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Descrição / Conquistas (Palavras-chave e números)</label>
                                <textarea value={exp.description} onChange={e => { const newExp = [...experience]; newExp[index].description = e.target.value; setExperience(newExp); }} className={inputClasses} rows={3} placeholder="Desenvolvi features que aumentaram a conversão em 15%..." disabled={isLoading} />
                            </div>
                            {experience.length > 1 && (
                                <button type="button" onClick={() => setExperience(experience.filter((_, i) => i !== index))} className="md:col-span-2 text-red-500 hover:text-red-700 text-sm mt-2">Remover Experiência</button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={() => setExperience([...experience, { title: '', company: '', dates: '', description: '' }])} className="w-full bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-bold hover:bg-blue-200 transition-colors flex items-center justify-center gap-2" disabled={isLoading}>
                        <i className="fas fa-plus"></i> Adicionar Experiência
                    </button>
                </div>

                {/* Education */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">Formação Acadêmica</h3>
                    {education.map((edu, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-3 border border-gray-100 rounded-md bg-white">
                            <div>
                                <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Curso / Grau</label>
                                <input type="text" value={edu.degree} onChange={e => { const newEdu = [...education]; newEdu[index].degree = e.target.value; setEducation(newEdu); }} className={inputClasses} placeholder="Bacharelado em Ciência da Computação" disabled={isLoading} />
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Instituição</label>
                                <input type="text" value={edu.institution} onChange={e => { const newEdu = [...education]; newEdu[index].institution = e.target.value; setEducation(newEdu); }} className={inputClasses} placeholder="Universidade XYZ" disabled={isLoading} />
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Período (Ex: 2015 - 2019)</label>
                                <input type="text" value={edu.dates} onChange={e => { const newEdu = [...education]; newEdu[index].dates = e.target.value; setEducation(newEdu); }} className={inputClasses} placeholder="2015 - 2019" disabled={isLoading} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Detalhes / Projetos Relevantes</label>
                                <textarea value={edu.description} onChange={e => { const newEdu = [...education]; newEdu[index].description = e.target.value; setEducation(newEdu); }} className={inputClasses} rows={2} placeholder="TCC sobre IA e visão computacional..." disabled={isLoading} />
                            </div>
                            {education.length > 1 && (
                                <button type="button" onClick={() => setEducation(education.filter((_, i) => i !== index))} className="md:col-span-2 text-red-500 hover:text-red-700 text-sm mt-2">Remover Formação</button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={() => setEducation([...education, { degree: '', institution: '', dates: '', description: '' }])} className="w-full bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-bold hover:bg-blue-200 transition-colors flex items-center justify-center gap-2" disabled={isLoading}>
                        <i className="fas fa-plus"></i> Adicionar Formação
                    </button>
                </div>

                {/* Skills */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">Habilidades (Separadas por vírgula)</h3>
                    <textarea 
                        value={skills.join(', ')} 
                        onChange={e => setSkills(e.target.value.split(',').map(s => s.trim()))} 
                        className={inputClasses} 
                        rows={2} 
                        placeholder="React, Node.js, Python, AWS, Comunicação, Liderança" 
                        disabled={isLoading} 
                    />
                </div>

                {/* Projects */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">Projetos (Opcional)</h3>
                    {projects.map((proj, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-3 border border-gray-100 rounded-md bg-white">
                            <div>
                                <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Nome do Projeto</label>
                                <input type="text" value={proj.name} onChange={e => { const newProj = [...projects]; newProj[index].name = e.target.value; setProjects(newProj); }} className={inputClasses} placeholder="Sistema de E-commerce B2B" disabled={isLoading} />
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Tecnologias</label>
                                <input type="text" value={proj.technologies} onChange={e => { const newProj = [...projects]; newProj[index].technologies = e.target.value; setProjects(newProj); }} className={inputClasses} placeholder="React, Express, PostgreSQL" disabled={isLoading} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs uppercase font-bold mb-1 text-gray-500">Descrição</label>
                                <textarea value={proj.description} onChange={e => { const newProj = [...projects]; newProj[index].description = e.target.value; setProjects(newProj); }} className={inputClasses} rows={2} placeholder="Desenvolvimento de plataforma para gestão de pedidos..." disabled={isLoading} />
                            </div>
                            {projects.length > 1 && (
                                <button type="button" onClick={() => setProjects(projects.filter((_, i) => i !== index))} className="md:col-span-2 text-red-500 hover:text-red-700 text-sm mt-2">Remover Projeto</button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={() => setProjects([...projects, { name: '', description: '', technologies: '' }])} className="w-full bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-bold hover:bg-blue-200 transition-colors flex items-center justify-center gap-2" disabled={isLoading}>
                        <i className="fas fa-plus"></i> Adicionar Projeto
                    </button>
                </div>

                {/* Certifications */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">Certificações / Prêmios (Separadas por vírgula)</h3>
                    <textarea 
                        value={certifications.join(', ')} 
                        onChange={e => setCertifications(e.target.value.split(',').map(s => s.trim()))} 
                        className={inputClasses} 
                        rows={2} 
                        placeholder="Certificação AWS Solutions Architect, Prêmio de Melhor Projeto Acadêmico" 
                        disabled={isLoading} 
                    />
                </div>
            </div>
        )}
        
        {/* Main Prompt Input (Hidden for landingpage_generator and curriculum_generator handled above) */}
        {mode !== 'curriculum_generator' && mode !== 'landingpage_generator' && ( 
            <div>
            <label htmlFor="prompt" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                {mode === 'image_generation' || mode === 'social_media_poster' ? 'Descreva sua Imagem / Post' : 'Seu Pedido'}
            </label>
            <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholder}
                rows={5}
                className="w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-4 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300 placeholder-gray-400 disabled:opacity-50 disabled:bg-gray-50 resize-y"
                disabled={isLoading || isModeLocked(mode)}
            />
            </div>
        )}
        {mode === 'curriculum_generator' && ( 
            <div>
                <label htmlFor="prompt" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                    Seu Objetivo de Carreira (Opcional, para refinar o resumo)
                </label>
                <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ex: 'Busco uma posição desafiadora em uma empresa inovadora onde possa aplicar minhas habilidades em IA e Machine Learning para impulsionar o crescimento do produto.'"
                    rows={3}
                    className="w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-4 text-sm rounded-md focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition duration-300 placeholder-gray-400 disabled:opacity-50 disabled:bg-gray-50 resize-y"
                    disabled={isLoading || isModeLocked(mode)}
                />
            </div>
        )}

        {/* Gerar áudio checkbox */}
        {mode === 'news_generator' && !isModeLocked('news_generator') && (
          (isGuest || hasAccessToService('text_to_speech')) && (
            <div className="flex flex-col pt-2 animate-fade-in">
                <label htmlFor="generate-audio" className="flex items-center cursor-pointer text-sm text-gray-600 hover:text-gray-900 transition-colors bg-gray-50 p-3 rounded-lg border border-gray-100">
                <input 
                    id="generate-audio"
                    type="checkbox"
                    checked={generateAudio}
                    onChange={(e) => setGenerateAudio(e.target.checked)}
                    className="h-5 w-5 bg-white border border-gray-300 rounded text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] transition duration-200"
                    disabled={isLoading}
                />
                <span className="ml-3 font-medium">Gerar áudio da matéria</span>
                <span className="text-xs text-[var(--brand-primary)] font-bold ml-2 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">+{ttsCost} créditos</span>
                </label>
            </div>
          )
        )}

        <button
          type="submit"
          className="w-full bg-[var(--brand-primary)] hover:bg-orange-500 text-white font-bold py-4 px-6 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all duration-300 disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center shadow-md transform hover:-translate-y-0.5"
          disabled={isLoading || isModeLocked(mode) || (mode === 'curriculum_generator' && (!personalInfo.name || !personalInfo.email))} 
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processando...
            </>
          ) : (
            <>
              {isModeLocked(mode) ? (
                 <>
                    <i className="fas fa-lock mr-2"></i>
                    Recurso Bloqueado
                 </>
              ) : (
                 <>
                    <i className={`fas ${mode === 'image_generation' || mode === 'social_media_poster' ? 'fa-paint-brush' : (mode === 'text_to_speech' ? 'fa-microphone' : (mode === 'curriculum_generator' ? 'fa-file-alt' : 'fa-wand-magic-sparkles'))} mr-2`}></i>
                    {mode === 'image_generation' || mode === 'social_media_poster' ? 'Criar Arte' : (mode === 'text_to_speech' ? 'Gerar Áudio' : (mode === 'curriculum_generator' ? 'Gerar Currículo' : 'Gerar Conteúdo'))}
                 </>
              )}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
