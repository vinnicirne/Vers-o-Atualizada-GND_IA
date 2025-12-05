
import React, { useState, useEffect } from 'react';
import { CREATOR_SUITE_MODES } from '../constants';
import { ServiceKey } from '../types/plan.types';
import { useUser } from '../contexts/UserContext';
import { usePlan } from '../hooks/usePlan';

interface ContentGeneratorProps {
  mode: ServiceKey;
  onModeChange: (mode: ServiceKey) => void;
  onGenerate: (
    prompt: string, 
    mode: ServiceKey, 
    generateAudio: boolean,
    options?: { theme?: string; primaryColor?: string; aspectRatio?: string; imageStyle?: string; platform?: string; voice?: string }
  ) => void;
  isLoading: boolean;
  isGuest?: boolean;
  guestAllowedModes?: ServiceKey[];
}

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

  const [prompt, setPrompt] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [generateAudio, setGenerateAudio] = useState(false);
  
  const [theme, setTheme] = useState('modern');
  const [primaryColor, setPrimaryColor] = useState('#10B981'); 
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageStyle, setImageStyle] = useState('photorealistic');
  const [platform, setPlatform] = useState('instagram_feed');
  const [selectedVoice, setSelectedVoice] = useState('Kore');

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
  }, [mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let options: any = undefined;
    
    if (mode === 'landingpage_generator' || mode === 'institutional_website_generator') {
        options = { theme, primaryColor };
    } else if (mode === 'image_generation') {
        options = { aspectRatio, imageStyle };
    } else if (mode === 'social_media_poster') {
        options = { platform, theme };
    } else if (mode === 'text_to_speech') {
        options = { voice: selectedVoice };
    }

    onGenerate(prompt, mode, generateAudio, options);
  };
  
  // Updated Styles for Light Theme
  const selectClasses = "w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-[#F39C12] focus:outline-none focus:ring-1 focus:ring-[#F39C12] transition duration-300";
  const inputClasses = "w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-[#F39C12] focus:outline-none focus:ring-1 focus:ring-[#F39C12] transition duration-300";

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <div className="mb-6 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-[#263238]">
              {CREATOR_SUITE_MODES.find(m => m.value === mode)?.label}
          </h2>
          <p className="text-sm text-gray-500">Preencha os detalhes abaixo para gerar seu conteúdo.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Opções Extras para Landing Page e Site Institucional */}
        {(mode === 'landingpage_generator' || mode === 'institutional_website_generator') && !isModeLocked(mode) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            <div>
              <label htmlFor="theme" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                Estilo Visual
              </label>
              <select id="theme" value={theme} onChange={e => setTheme(e.target.value)} className={selectClasses} disabled={isLoading}>
                {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="color" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
                Cor Primária
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  id="color" 
                  value={primaryColor} 
                  onChange={e => setPrimaryColor(e.target.value)} 
                  className="h-11 w-16 bg-white border border-gray-300 rounded-md cursor-pointer p-1"
                  disabled={isLoading}
                />
                <input 
                  type="text" 
                  value={primaryColor} 
                  onChange={e => setPrimaryColor(e.target.value)} 
                  className={inputClasses}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        )}

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
        
        <div>
          <label htmlFor="prompt" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
            {mode === 'image_generation' || mode === 'social_media_poster' ? 'Descreva sua Imagem / Post' : (mode === 'institutional_website_generator' ? 'Dados da Empresa' : 'Seu Pedido')}
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            rows={5}
            className="w-full bg-[#F5F7FA] border border-gray-300 text-gray-700 p-4 text-sm rounded-md focus:border-[#F39C12] focus:outline-none focus:ring-1 focus:ring-[#F39C12] transition duration-300 placeholder-gray-400 disabled:opacity-50 disabled:bg-gray-50 resize-y"
            disabled={isLoading || isModeLocked(mode)}
          />
        </div>

        {/* Gerar áudio só se o serviço text_to_speech estiver ativo e o modo for news_generator */}
        {mode === 'news_generator' && !isModeLocked('news_generator') && (
          (isGuest || hasAccessToService('text_to_speech')) && (
            <div className="flex flex-col pt-2 animate-fade-in">
                <label htmlFor="generate-audio" className="flex items-center cursor-pointer text-sm text-gray-600 hover:text-gray-900 transition-colors bg-gray-50 p-3 rounded-lg border border-gray-100">
                <input 
                    id="generate-audio"
                    type="checkbox"
                    checked={generateAudio}
                    onChange={(e) => setGenerateAudio(e.target.checked)}
                    className="h-5 w-5 bg-white border border-gray-300 rounded text-[#F39C12] focus:ring-[#F39C12] transition duration-200"
                    disabled={isLoading}
                />
                <span className="ml-3 font-medium">Gerar áudio da matéria</span>
                <span className="text-xs text-[#F39C12] font-bold ml-2 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">+{ttsCost} créditos</span>
                </label>
            </div>
          )
        )}

        <button
          type="submit"
          className="w-full bg-[#F39C12] hover:bg-orange-500 text-white font-bold py-4 px-6 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all duration-300 disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center shadow-md transform hover:-translate-y-0.5"
          disabled={!prompt.trim() || isLoading || isModeLocked(mode)} 
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
                    <i className={`fas ${mode === 'image_generation' || mode === 'social_media_poster' ? 'fa-paint-brush' : (mode === 'text_to_speech' ? 'fa-microphone' : 'fa-wand-magic-sparkles')} mr-2`}></i>
                    {mode === 'image_generation' || mode === 'social_media_poster' ? 'Criar Arte' : (mode === 'text_to_speech' ? 'Gerar Áudio' : 'Gerar Conteúdo')}
                 </>
              )}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
