
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
    options?: { theme?: string; primaryColor?: string; aspectRatio?: string; imageStyle?: string }
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
];

const IMAGE_STYLES = [
    { value: 'photorealistic', label: 'Fotorealista (8k)' },
    { value: 'cyberpunk', label: 'Cyberpunk / Neon' },
    { value: 'anime', label: 'Anime / Manga' },
    { value: 'oil_painting', label: 'Pintura a Óleo' },
    { value: '3d_render', label: 'Render 3D (Pixar Style)' },
    { value: 'cinematic', label: 'Cinematográfico' },
    { value: 'pixel_art', label: 'Pixel Art' },
    { value: 'logo', label: 'Logo / Vetor Minimalista' },
];

const ASPECT_RATIOS = [
    { value: '1:1', label: 'Quadrado (Instagram)' },
    { value: '16:9', label: 'Paisagem (YouTube)' },
    { value: '9:16', label: 'Retrato (Stories)' },
];

export function ContentGenerator({ mode, onModeChange, onGenerate, isLoading, isGuest = false, guestAllowedModes = [] }: ContentGeneratorProps) {
  const { currentPlan, hasAccessToService, getCreditsCostForService } = usePlan();
  const ttsCost = getCreditsCostForService('text_to_speech');

  const [prompt, setPrompt] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [generateAudio, setGenerateAudio] = useState(false);
  
  // Landing Page & Website options
  const [theme, setTheme] = useState('modern');
  const [primaryColor, setPrimaryColor] = useState('#10B981'); 

  // Image Generation options
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageStyle, setImageStyle] = useState('photorealistic');

  // Lógica de Bloqueio Híbrida (Visitante vs Plano)
  const isModeLocked = (modeValue: ServiceKey) => {
      if (isGuest) {
          // Se for visitante, bloqueia se não estiver na lista de permitidos explicitamente
          return !guestAllowedModes.includes(modeValue);
      }
      // Se estiver logado, usa a lógica do plano
      return !hasAccessToService(modeValue);
  };

  // Atualiza o placeholder e reseta campos quando o modo muda (controlado pelo pai)
  useEffect(() => {
    const selectedMode = CREATOR_SUITE_MODES.find(m => m.value === mode);
    setPlaceholder(selectedMode?.placeholder || '');
    setPrompt('');
    setGenerateAudio(false); 
  }, [mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let options = undefined;
    
    if (mode === 'landingpage_generator' || mode === 'institutional_website_generator') {
        options = { theme, primaryColor };
    } else if (mode === 'image_generation') {
        options = { aspectRatio, imageStyle };
    }

    onGenerate(prompt, mode, generateAudio, options);
  };
  
  const selectClasses = "w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0 transition duration-300";
  const inputClasses = "w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0 transition duration-300";

  return (
    <div className="bg-black/50 p-6 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.2)] border border-green-900/30">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="mode" className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">
            Ferramenta Selecionada
          </label>
          <div className="grid grid-cols-1 gap-2">
            <select 
                id="mode" 
                value={mode} 
                onChange={e => onModeChange(e.target.value as ServiceKey)}
                className={selectClasses} 
                disabled={isLoading}
            >
                {CREATOR_SUITE_MODES.map(m => {
                    const locked = isModeLocked(m.value);
                    return (
                        <option key={m.value} value={m.value} className={locked ? "text-gray-500 bg-gray-900" : ""}>
                            {locked ? `🔒 ${m.label} (Plano Superior)` : m.label}
                        </option>
                    );
                })}
            </select>
          </div>
          {isModeLocked(mode) && (
              <div className="mt-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center text-red-300 text-xs animate-fade-in">
                  <i className="fas fa-lock mr-2 text-lg"></i>
                  <div>
                      <span className="font-bold">Acesso Bloqueado:</span> A função <span className="underline">{mode.replace(/_/g, ' ').toUpperCase()}</span> não está incluída no seu plano <strong>{isGuest ? 'Visitante' : currentPlan.name}</strong>.
                      <br/>{isGuest ? 'Crie uma conta ou faça login.' : 'Faça upgrade para desbloquear.'}
                  </div>
              </div>
          )}
        </div>
        
        {/* Opções Extras para Landing Page e Site Institucional */}
        {(mode === 'landingpage_generator' || mode === 'institutional_website_generator') && !isModeLocked(mode) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            <div>
              <label htmlFor="theme" className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">
                Estilo Visual
              </label>
              <select id="theme" value={theme} onChange={e => setTheme(e.target.value)} className={selectClasses} disabled={isLoading}>
                {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="color" className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">
                Cor Primária
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  id="color" 
                  value={primaryColor} 
                  onChange={e => setPrimaryColor(e.target.value)} 
                  className="h-11 w-16 bg-black border-2 border-green-900/60 rounded-md cursor-pointer p-1"
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
              <label htmlFor="imageStyle" className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">
                Estilo da Arte
              </label>
              <select id="imageStyle" value={imageStyle} onChange={e => setImageStyle(e.target.value)} className={selectClasses} disabled={isLoading}>
                {IMAGE_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="aspectRatio" className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">
                Proporção (Formato)
              </label>
              <select id="aspectRatio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className={selectClasses} disabled={isLoading}>
                {ASPECT_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
        )}
        
        <div>
          <label htmlFor="prompt" className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">
            {mode === 'image_generation' ? 'Descreva sua Imagem' : (mode === 'institutional_website_generator' ? 'Dados da Empresa' : 'Seu Pedido')}
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0 transition duration-300 placeholder-gray-600 disabled:opacity-50"
            disabled={isLoading || isModeLocked(mode)}
          />
        </div>

        {/* Gerar áudio só se o serviço text_to_speech estiver ativo e o modo for news_generator */}
        {mode === 'news_generator' && !isModeLocked('news_generator') && (
          // Verifica se tem acesso ao TTS (se logado) ou se é visitante (liberado)
          (isGuest || hasAccessToService('text_to_speech')) && (
            <div className="flex flex-col items-center justify-center pt-4 animate-fade-in">
                <label htmlFor="generate-audio" className="flex items-center cursor-pointer text-sm text-gray-400 hover:text-white transition-colors">
                <input 
                    id="generate-audio"
                    type="checkbox"
                    checked={generateAudio}
                    onChange={(e) => setGenerateAudio(e.target.checked)}
                    className="h-5 w-5 bg-black border-2 border-green-900/60 rounded text-green-500 focus:ring-green-500 focus:ring-offset-black transition duration-200"
                    disabled={isLoading}
                />
                <span className="ml-3">Gerar áudio da matéria <span className="text-xs text-yellow-500 font-bold ml-1">({ttsCost} créditos)</span></span>
                <i className="fas fa-volume-up ml-2 text-green-500"></i>
                </label>
                {generateAudio && (
                    <p className="text-[10px] text-yellow-500/80 mt-1">
                        <i className="fas fa-info-circle mr-1"></i>
                        Serão descontados créditos adicionais pela geração do áudio.
                    </p>
                )}
            </div>
          )
        )}

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-black font-bold py-3 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-green-500 transition-all duration-300 disabled:opacity-50 disabled:bg-gray-800 disabled:text-gray-500 disabled:from-gray-800 disabled:cursor-not-allowed flex items-center justify-center shadow-lg mt-4"
          disabled={!prompt.trim() || isLoading || isModeLocked(mode)} 
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Gerando...
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
                    <i className={`fas ${mode === 'image_generation' ? 'fa-paint-brush' : 'fa-feather-alt'} mr-2`}></i>
                    {mode === 'image_generation' ? 'Criar Arte' : 'Gerar Conteúdo'}
                 </>
              )}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
