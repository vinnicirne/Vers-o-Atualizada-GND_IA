
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ContentGenerator } from './components/ContentGenerator';
import { ResultDisplay } from './components/ResultDisplay';
import { Loader } from './components/Loader';
import { FeedbackWidget } from './components/FeedbackWidget';
import { AudioPlayer } from './components/AudioPlayer';
import { LandingPageBuilder } from './components/LandingPageBuilder'; 
import { ImageStudio } from './components/ImageStudio'; 
import { PlansModal } from './components/PlansModal';
import { ManualModal } from './components/ManualModal'; 
import { UserHistoryModal } from './components/UserHistoryModal'; 
import { AffiliateModal } from './components/AffiliateModal'; 
import { IntegrationsModal } from './components/integrations/IntegrationsModal'; 
import { AffiliateInvitePopup } from './components/AffiliateInvitePopup';
import { FeedbackInvitePopup } from './components/FeedbackInvitePopup'; 
import { Toast } from './components/admin/Toast';
import { generateCreativeContent } from './services/geminiService';
import { api } from './services/api';
import { logContentGeneration } from './services/loggerService';
import { ServiceKey, UserPlan } from './types/plan.types';
import { PLANS, CREATOR_SUITE_MODES, GUEST_ID } from './constants';
import { useUser } from './contexts/UserContext';
import { usePlan } from './hooks/usePlan'; 
import { SeoScorecard } from './components/SEO/SeoScorecard'; 
import { SeoHead } from './components/SEO/SeoHead'; 
import { getN8nConfig, sendToN8nWebhook, syncN8nConfig } from './services/n8nService';

interface DashboardPageProps {
  onNavigateToAdmin: () => void;
  onNavigateToLogin?: () => void;
  onNavigate?: (page: string) => void;
}

// Mapeamento de Ícones
const SERVICE_ICONS: Record<ServiceKey, string> = {
    news_generator: 'fa-newspaper',
    text_to_speech: 'fa-microphone-lines',
    copy_generator: 'fa-pen-nib',
    prompt_generator: 'fa-terminal',
    landingpage_generator: 'fa-code',
    institutional_website_generator: 'fa-building',
    canva_structure: 'fa-vector-square',
    image_generation: 'fa-paint-brush',
    social_media_poster: 'fa-share-alt', // Novo Ícone
    n8n_integration: 'fa-plug',
};

// Cores para os ícones
const SERVICE_COLORS: Record<ServiceKey, string> = {
    news_generator: 'text-green-500 bg-green-50',
    text_to_speech: 'text-blue-500 bg-blue-50',
    copy_generator: 'text-purple-500 bg-purple-50',
    prompt_generator: 'text-yellow-500 bg-yellow-50',
    landingpage_generator: 'text-pink-500 bg-pink-50',
    institutional_website_generator: 'text-orange-500 bg-orange-50',
    canva_structure: 'text-cyan-500 bg-cyan-50',
    image_generation: 'text-rose-500 bg-rose-50',
    social_media_poster: 'text-indigo-500 bg-indigo-50', // Nova Cor
    n8n_integration: 'text-red-500 bg-red-50',
};

// Modos permitidos para Visitantes
const GUEST_ALLOWED_MODES: ServiceKey[] = ['news_generator', 'copy_generator', 'prompt_generator'];

const extractTitleAndContent = (text: string, mode: ServiceKey) => {
    // Adicionei social_media_poster na lista de exclusão de título, pois é tratado como imagem/copy
    if (['landingpage_generator', 'institutional_website_generator', 'canva_structure', 'image_generation', 'social_media_poster'].includes(mode)) {
        return { title: null, content: text };
    }

    const lines = text.split('\n');
    if (lines.length > 0) {
        let firstLine = lines[0].trim();
        const isMarkdownTitle = firstLine.startsWith('**') || firstLine.startsWith('#');
        const hasPrefix = /^(título|title|headline|manchete|assunto|subject|prompt|copy):/i.test(firstLine);
        const isShortLine = firstLine.length > 2 && firstLine.length < 150 && lines.length > 1;

        if (isMarkdownTitle || hasPrefix || isShortLine) {
            let cleanTitle = firstLine;
            cleanTitle = cleanTitle.replace(/[*#]/g, '').trim();
            cleanTitle = cleanTitle.replace(/^(título|title|headline|manchete|assunto|subject|prompt|copy|foco)\s*[:|-]\s*/i, '').trim();

            let startIndex = 1;
            while (startIndex < lines.length && lines[startIndex].trim() === '') {
                startIndex++;
            }
            
            return {
                title: cleanTitle,
                content: lines.slice(startIndex).join('\n').trim()
            };
        }
    }
    
    return { title: null, content: text };
};

function DashboardPage({ onNavigateToAdmin, onNavigateToLogin, onNavigate }: DashboardPageProps) {
  const { user, signOut, refresh } = useUser();
  const { currentPlan, userCredits: dbCredits, hasAccessToService, getCreditsCostForService } = usePlan();

  const [guestCredits, setGuestCredits] = useState<number>(3);
  const isGuest = !user;
  const activeCredits = isGuest ? guestCredits : dbCredits;
  const activePlanName = isGuest ? 'Visitante' : currentPlan.name;

  const [resultText, setResultText] = useState<string | null>(null);
  const [resultTitle, setResultTitle] = useState<string | null>(null); 
  const [resultMetadata, setResultMetadata] = useState<{ plan: string; credits: string | number } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ version: string }>({ version: 'N/A' }); 
  const [showFeedback, setShowFeedback] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number}>({width: 1024, height: 1024});
  
  const [currentMode, setCurrentMode] = useState<ServiceKey>('news_generator');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // Modals States
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showGuestLimitModal, setShowGuestLimitModal] = useState(false); 
  const [showFeatureLockModal, setShowFeatureLockModal] = useState(false); 
  const [showManualModal, setShowManualModal] = useState(false); 
  const [showHistoryModal, setShowHistoryModal] = useState(false); 
  const [showAffiliateModal, setShowAffiliateModal] = useState(false); 
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false);
  const [showAffiliateInvite, setShowAffiliateInvite] = useState(false);
  const [showFeedbackInvite, setShowFeedbackInvite] = useState(false); 
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Inicialização de Dados
  useEffect(() => {
    const stored = localStorage.getItem('gdn_guest_credits');
    if (stored !== null) {
        setGuestCredits(parseInt(stored, 10));
    } else {
        localStorage.setItem('gdn_guest_credits', '3');
    }

    fetch('/metadata.json')
      .then(response => response.ok ? response.json() : { version: 'Error' })
      .then(data => setMetadata(data))
      .catch(err => console.error("Failed to load metadata:", err));
  }, []);

  // Sincroniza configurações do n8n
  useEffect(() => {
      if (user) {
          syncN8nConfig(user.id).then(config => {
              if(config) console.log("N8n config synced from cloud.");
          });
      }
  }, [user]);

  useEffect(() => {
    if (user && !isGuest) {
      const hasSeenInvite = localStorage.getItem('gdn_seen_affiliate_invite');
      if (!hasSeenInvite) {
        const timer = setTimeout(() => setShowAffiliateInvite(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, isGuest]);

  const handleCloseAffiliateInvite = () => {
    setShowAffiliateInvite(false);
    localStorage.setItem('gdn_seen_affiliate_invite', 'true');
  };

  const handleAcceptAffiliateInvite = () => {
    handleCloseAffiliateInvite();
    setShowAffiliateModal(true);
  };

  const handleModeSelection = (mode: ServiceKey) => {
    if (isGuest && !GUEST_ALLOWED_MODES.includes(mode)) {
        setShowFeatureLockModal(true);
        return;
    }
    setCurrentMode(mode);
    setSidebarOpen(false); 
  };

  const handleGenerateContent = useCallback(async (
    prompt: string, 
    mode: ServiceKey, 
    generateAudio: boolean,
    options?: { theme?: string; primaryColor?: string; aspectRatio?: string; imageStyle?: string; platform?: string }
  ) => {
    if (isGuest && !GUEST_ALLOWED_MODES.includes(mode)) {
        setShowFeatureLockModal(true);
        return;
    }

    if (!prompt.trim()) {
      setError('Por favor, insira uma descrição para o conteúdo a ser gerado.');
      return;
    }

    const mainCost = getCreditsCostForService(mode);
    const audioServiceEnabled = hasAccessToService('text_to_speech') || isGuest;
    const shouldGenerateAudio = generateAudio && audioServiceEnabled;
    const audioCost = shouldGenerateAudio ? getCreditsCostForService('text_to_speech') : 0;
    const totalCost = mainCost + audioCost;

    if (isGuest) {
        if (guestCredits < totalCost) {
            setShowGuestLimitModal(true);
            return;
        }
    } else {
        if (!hasAccessToService(mode)) {
             setError(`Acesso Negado: O modo "${mode.replace(/_/g, ' ').toUpperCase()}" é exclusivo de planos superiores.`);
             setShowPlansModal(true);
             return;
        }
        if (generateAudio && !hasAccessToService('text_to_speech')) {
             setError(`Acesso Negado: A ferramenta de Texto para Voz é exclusiva de planos superiores.`);
             setShowPlansModal(true);
             return;
        }
        if (activeCredits !== -1 && activeCredits < totalCost) {
            setError(`Saldo insuficiente. Esta operação custa ${totalCost} créditos.`);
            setShowPlansModal(true);
            return;
        }
    }

    setIsLoading(true);
    setError(null);
    setResultText(null);
    setResultTitle(null);
    setResultMetadata(null);
    setShowFeedback(false);
    setAudioBase64(null);
    setGeneratedImagePrompt('');
    setShowFeedbackInvite(false); 

    try {
      const { text, audioBase64: audioResult, sources } = await generateCreativeContent(
        prompt, 
        mode, 
        user?.id, 
        shouldGenerateAudio,
        options
      );
      
      let updatedCredits = activeCredits;

      if (isGuest) {
          updatedCredits = guestCredits - totalCost;
          setGuestCredits(updatedCredits);
          localStorage.setItem('gdn_guest_credits', updatedCredits.toString());
      } else if (user && activeCredits !== -1) {
          updatedCredits = activeCredits - totalCost;
          const { error: creditError } = await api.update('user_credits', { credits: updatedCredits }, { user_id: user.id });
          if (creditError) {
              console.error('Erro API Proxy ao atualizar créditos:', creditError);
          } else {
              await refresh();
          }
      }

      let processedText = text;
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      
      if (!isAdmin && (isGuest || currentPlan.id !== 'premium') && mode !== 'image_generation' && mode !== 'social_media_poster' && mode !== 'landingpage_generator' && mode !== 'institutional_website_generator' && mode !== 'canva_structure') {
          processedText += "\n\nGerado por GDN_IA";
      }

      setResultMetadata({
          plan: activePlanName,
          credits: activeCredits === -1 ? 'Ilimitado' : updatedCredits
      });
      
      if ((mode === 'landingpage_generator' || mode === 'institutional_website_generator') && (isGuest || (currentPlan.id !== 'premium' && !isAdmin))) {
            const watermark = `<div style="text-align:center; font-size:10px; color:#888; padding:20px; background:#f9f9f9; border-top:1px solid #eee;">Gerado por GDN_IA</div>`;
            if (processedText.includes('</body>')) {
                processedText = processedText.replace('</body>', `${watermark}</body>`);
            } else {
                processedText += watermark;
            }
      }

      let finalTitle = null;
      let finalContent = processedText;

      // Handle Image and Social Poster modes
      if (mode === 'image_generation') {
          setGeneratedImagePrompt(text);
          let w = 1024, h = 1024;
          if (options?.aspectRatio === '16:9') { w = 1280; h = 720; }
          if (options?.aspectRatio === '9:16') { w = 720; h = 1280; }
          setImageDimensions({ width: w, height: h });
          setResultText(prompt); 
      } else if (mode === 'social_media_poster') {
          // Parse Dual Output: [IMAGE_PROMPT] ... [COPY] ...
          const parts = text.split('[COPY]');
          let imgPrompt = text;
          let copyText = "";

          if (parts.length > 1) {
              imgPrompt = parts[0].replace('[IMAGE_PROMPT]', '').trim();
              copyText = parts[1].trim();
          }

          setGeneratedImagePrompt(imgPrompt);
          setResultText(copyText); // Show the copy in text box
          setResultTitle(`Post para ${options?.platform || 'Social Media'}`);

          // Dimensões automáticas
          let w = 1080, h = 1080;
          const p = options?.platform || 'instagram_feed';
          if (p.includes('story') || p.includes('reels')) { w = 720; h = 1280; } // 9:16
          else if (p.includes('youtube') || p.includes('facebook') || p.includes('linkedin') || p.includes('twitter')) { w = 1280; h = 720; } // 16:9 (ou próximo)
          
          setImageDimensions({ width: w, height: h });
      } else {
          const { title, content } = extractTitleAndContent(processedText, mode);
          finalTitle = title;
          finalContent = content;
          setResultTitle(title);
          setResultText(content);
      }
      
      setAudioBase64(audioResult);
      
      const userIdToLog = user ? user.id : GUEST_ID;
      const planIdToLog = user ? currentPlan.id : 'guest';
      
      logContentGeneration(userIdToLog, mode, totalCost, updatedCredits, planIdToLog);
      
      if (user) {
         try {
              let historyTitle = '';
              const shortPrompt = prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt;
              
              switch(mode) {
                  case 'news_generator': historyTitle = finalTitle ? `Notícia: ${finalTitle}` : `Notícia: ${shortPrompt}`; break;
                  case 'social_media_poster': historyTitle = `Post: ${shortPrompt}`; break;
                  default: historyTitle = `Geração: ${shortPrompt}`;
              }

              const contentToSave = (mode === 'image_generation') ? `PROMPT: ${text}` : processedText;

              await api.insert('news', {
                  titulo: historyTitle,
                  conteudo: contentToSave,
                  status: 'approved', 
                  tipo: mode,
                  author_id: user.id,
                  sources: sources || [] 
              });
          } catch (historyError: any) {
              console.error("Exceção ao salvar no histórico:", historyError);
          }
      }

      // --- N8N AUTO SEND ---
      const n8nConfig = getN8nConfig();
      if (n8nConfig && n8nConfig.isConnected && n8nConfig.autoSend) {
          sendToN8nWebhook({
              title: finalTitle,
              content: finalContent,
              mode: mode,
              generated_at: new Date().toISOString(),
              audio_base64: audioResult,
              image_prompt: (mode === 'image_generation' || mode === 'social_media_poster') ? generatedImagePrompt : undefined,
              userId: user?.id
          }).then(res => {
              if(res.success) {
                  setToast({ message: "Conteúdo enviado automaticamente para n8n!", type: 'success' });
              } else {
                  console.warn("Falha no envio automático n8n:", res.message);
              }
          });
      }

      setShowFeedback(true);
      
      if (user && Math.random() > 0.5) { 
          setTimeout(() => setShowFeedbackInvite(true), 2000);
      }

    } catch (err) {
      if (err instanceof Error) {
        setError(`Falha ao gerar conteúdo: ${err.message}`);
      } else {
        setError('Ocorreu um erro desconhecido.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, activeCredits, isGuest, guestCredits, currentPlan, refresh, hasAccessToService, getCreditsCostForService]);
  
  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="flex flex-col h-screen bg-[#ECEFF1] text-[#263238] overflow-hidden">
      <SeoHead 
        title={resultTitle || "GDN_IA - Creator Suite"} 
        description="Plataforma de Inteligência Artificial para geração de notícias, imagens e sites." 
      />

      <Header 
        userEmail={user?.email} 
        onLogout={handleLogout} 
        isAdmin={user?.role === 'admin' || user?.role === 'super_admin'}
        onNavigateToAdmin={onNavigateToAdmin}
        onNavigateToLogin={onNavigateToLogin}
        onOpenPlans={() => setShowPlansModal(true)}
        onOpenManual={() => setShowManualModal(true)}
        onOpenHistory={() => setShowHistoryModal(true)} 
        onOpenAffiliates={() => setShowAffiliateModal(true)} 
        onOpenIntegrations={() => setShowIntegrationsModal(true)}
        userCredits={activeCredits}
        userRole={user?.role}
        metadata={metadata} 
        onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* SIDEBAR OVERLAY (Mobile) */}
        {isSidebarOpen && (
            <div 
                className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
            ></div>
        )}

        {/* SIDEBAR */}
        <aside className={`
            fixed top-0 bottom-0 left-0 z-50 w-64 h-full bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none md:relative
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
            {/* ... (Mobile Header) ... */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
                <span className="text-xs font-bold text-[#263238] uppercase tracking-wider">Ferramentas</span>
                <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-red-500">
                    <i className="fas fa-times text-lg"></i>
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-white">
                {CREATOR_SUITE_MODES.map((svc) => {
                    const isSelected = currentMode === svc.value;
                    const isLocked = (isGuest && !GUEST_ALLOWED_MODES.includes(svc.value)) || (!isGuest && !hasAccessToService(svc.value));
                    
                    const colorClasses = SERVICE_COLORS[svc.value] || 'text-gray-600 bg-gray-100';
                    const [textColor, bgColor] = colorClasses.split(' ');

                    return (
                        <button
                            key={svc.value}
                            onClick={() => handleModeSelection(svc.value)}
                            className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 text-left group
                                ${isSelected 
                                    ? 'bg-gray-100 shadow-sm ring-1 ring-[#F39C12]' 
                                    : 'hover:bg-gray-50'
                                }
                                ${isLocked ? 'opacity-60 grayscale' : ''}
                            `}
                        >
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center mr-3 ${bgColor} ${isSelected ? textColor : 'text-gray-500 bg-gray-100'}`}>
                                <i className={`fas ${SERVICE_ICONS[svc.value]} text-sm`}></i>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[#263238]' : 'text-gray-600 group-hover:text-[#263238]'}`}>
                                    {svc.label}
                                </p>
                            </div>

                            {isLocked && <i className="fas fa-lock text-xs text-gray-400 ml-2"></i>}
                        </button>
                    );
                })}
            </div>

            {/* Menu Extra (Mobile Only) */}
            <div className={`p-3 border-t border-gray-200 bg-white space-y-2 md:hidden ${!user ? 'hidden' : ''}`}>
                <div className="px-2 py-1">
                    <span className="text-[10px] font-extrabold text-gray-900 uppercase tracking-widest">Minha Conta</span>
                </div>
                
                <button
                    onClick={() => { setShowPlansModal(true); setSidebarOpen(false); }}
                    className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[#263238] transition-colors group"
                >
                    <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-[#F39C12] border border-gray-200 group-hover:border-[#F39C12]">
                        <i className="fas fa-coins text-xs"></i>
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-bold">Planos & Créditos</span>
                        <span className="text-[10px] text-gray-500 font-medium">Saldo: {activeCredits === -1 ? '∞' : activeCredits}</span>
                    </div>
                </button>

                <button
                    onClick={() => { setShowAffiliateModal(true); setSidebarOpen(false); }}
                    className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[#263238] transition-colors group"
                >
                    <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-yellow-600 border border-gray-200 group-hover:border-yellow-600">
                        <i className="fas fa-handshake text-xs"></i>
                    </div>
                    <span className="text-sm font-bold">Afiliados</span>
                </button>

                <button
                    onClick={() => { setShowHistoryModal(true); setSidebarOpen(false); }}
                    className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[#263238] transition-colors group"
                >
                    <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-gray-600 border border-gray-200 group-hover:border-gray-600">
                        <i className="fas fa-history text-xs"></i>
                    </div>
                    <span className="text-sm font-bold">Meu Histórico</span>
                </button>

                <button
                    onClick={() => { setShowIntegrationsModal(true); setSidebarOpen(false); }}
                    className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[#263238] transition-colors group"
                >
                    <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-pink-600 border border-gray-200 group-hover:border-pink-600">
                        <i className="fas fa-plug text-xs"></i>
                    </div>
                    <span className="text-sm font-bold">Integrações</span>
                </button>

                <button
                    onClick={() => { setShowManualModal(true); setSidebarOpen(false); }}
                    className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[#263238] transition-colors group"
                >
                    <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-blue-600 border border-gray-200 group-hover:border-blue-600">
                        <i className="fas fa-book text-xs"></i>
                    </div>
                    <span className="text-sm font-bold">Ajuda / Manual</span>
                </button>

                <button
                    onClick={() => { if(onNavigate) onNavigate('feedback'); setSidebarOpen(false); }}
                    className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 text-[#263238] transition-colors group"
                >
                    <div className="w-7 h-7 rounded flex items-center justify-center mr-3 bg-white text-green-600 border border-gray-300 group-hover:border-green-600">
                        <i className="fas fa-comment-dots text-xs"></i>
                    </div>
                    <span className="text-sm font-bold">Mural do Cliente</span>
                </button>
            </div>
            
            {/* Link para Feedback Desktop */}
            {user && (
                <div className="hidden md:block p-4 border-t border-gray-200">
                    <button 
                        onClick={() => onNavigate && onNavigate('feedback')}
                        className="w-full bg-white border border-gray-300 text-gray-600 hover:text-green-600 hover:border-green-400 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-comment-dots"></i> Deixe seu Depoimento
                    </button>
                </div>
            )}
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#ECEFF1] w-full">
            <div className="max-w-5xl mx-auto">
                
                {/* Hero Section for Guests (Hybrid Landing) */}
                {isGuest && (
                    <div className="text-center mb-10 mt-2 animate-fade-in">
                        <span className="inline-block py-1 px-3 rounded-full bg-green-100 text-green-700 text-xs font-bold tracking-wide uppercase mb-4 shadow-sm border border-green-200">
                            🚀 Teste Grátis Agora
                        </span>
                        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#263238] mb-4 leading-tight">
                            Crie Notícias, Imagens e Sites <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">10x Mais Rápido.</span>
                        </h1>
                        <p className="text-lg text-gray-500 mb-6 max-w-2xl mx-auto">
                            Plataforma completa para criadores. Experimente nossas ferramentas abaixo sem compromisso.
                        </p>
                    </div>
                )}

                {/* Plan Info Bar */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#ECEFF1] p-2 rounded-full text-gray-500">
                            <i className="fas fa-user-circle text-xl"></i>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Plano Atual</p>
                            <p className={`font-bold capitalize ${isGuest ? 'text-gray-500' : `text-${currentPlan.color}-600`}`}>{activePlanName}</p>
                        </div>
                    </div>
                    
                    {isGuest && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full border border-orange-200 font-medium animate-pulse">
                            <i className="fas fa-info-circle mr-1"></i> Modo Visitante ({guestCredits} créditos)
                        </span>
                    )}
                </div>

                <div className="transition-all duration-500">
                    <ContentGenerator 
                        mode={currentMode}
                        onModeChange={handleModeSelection}
                        onGenerate={handleGenerateContent} 
                        isLoading={isLoading}
                        isGuest={isGuest}
                        guestAllowedModes={GUEST_ALLOWED_MODES}
                    />
                </div>
            
                {error && (
                    <div className="mt-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-center animate-fade-in shadow-sm" role="alert">
                        <strong className="font-bold block mb-1"><i className="fas fa-exclamation-circle mr-2"></i>Atenção</strong>
                        <span className="block text-sm">{error}</span>
                        {!isGuest && (error.includes('Acesso Negado') || error.includes('saldo')) && (
                            <button 
                                onClick={() => setShowPlansModal(true)}
                                className="mt-3 bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-4 rounded text-xs transition shadow-sm"
                            >
                                Resolver Agora
                            </button>
                        )}
                    </div>
                )}

                <div className="mt-8 space-y-8 pb-12">
                    {isLoading && <Loader mode={currentMode} />}
                    
                    {!isLoading && (
                    <>
                        {(currentMode === 'landingpage_generator' || currentMode === 'institutional_website_generator' || currentMode === 'canva_structure') && resultText && (
                        <LandingPageBuilder 
                                initialHtml={resultText} 
                                onClose={() => setResultText(null)}
                        />
                        )}

                        {/* RENDERIZAÇÃO DE IMAGENS E POSTERS */}
                        {(currentMode === 'image_generation' || currentMode === 'social_media_poster') && generatedImagePrompt && (
                        <ImageStudio 
                            prompt={resultText || ''} 
                            originalPrompt={generatedImagePrompt} 
                            width={imageDimensions.width} 
                            height={imageDimensions.height} 
                        />
                        )}

                        {/* RESULT DISPLAY & SEO WIDGET */}
                        {currentMode !== 'landingpage_generator' && 
                         currentMode !== 'institutional_website_generator' && 
                         currentMode !== 'image_generation' && 
                         currentMode !== 'canva_structure' && resultText && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                            <div className="lg:col-span-2">
                                <ResultDisplay 
                                    title={resultTitle} 
                                    text={resultText} 
                                    mode={currentMode} 
                                    metadata={resultMetadata || undefined}
                                />
                            </div>
                            
                            {/* SEO Scorecard não faz sentido para copy curto de post, mas ok para noticias e artigos */}
                            {currentMode === 'news_generator' && (
                                <div className="lg:col-span-1">
                                    <SeoScorecard 
                                            title={resultTitle || "Sem Título"} 
                                            content={resultText} 
                                    />
                                </div>
                            )}
                        </div>
                        )}

                        {audioBase64 && <AudioPlayer audioBase64={audioBase64} />}
                        
                        {(resultText || generatedImagePrompt) && showFeedback && user && (
                        <FeedbackWidget 
                            userId={user.id} 
                            onClose={() => setShowFeedback(false)} 
                        />
                        )}
                    </>
                    )}
                </div>

                {/* GUEST MARKETING SECTIONS */}
                {isGuest && (
                    <div className="mt-20 border-t border-gray-200 pt-16 animate-fade-in">
                        {/* Features */}
                        <section className="mb-20">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-bold text-[#263238] mb-3">Tudo em um só lugar</h2>
                                <p className="text-gray-500">Substitua dezenas de ferramentas caras por uma suíte inteligente.</p>
                            </div>
                            <div className="grid md:grid-cols-3 gap-6">
                                <FeatureCard icon="fa-newspaper" title="Notícias & SEO" desc="Artigos completos e otimizados para o Google." color="text-green-600" bg="bg-green-50"/>
                                <FeatureCard icon="fa-paint-brush" title="Studio de Arte IA" desc="Crie imagens e logos ultra-realistas." color="text-purple-600" bg="bg-purple-50"/>
                                <FeatureCard icon="fa-laptop-code" title="Criador de Sites" desc="Landing pages e sites institucionais prontos." color="text-blue-600" bg="bg-blue-50"/>
                            </div>
                        </section>

                        {/* Pricing Preview */}
                        <section className="mb-20">
                             <div className="text-center mb-10">
                                <h2 className="text-3xl font-bold text-[#263238] mb-3">Planos Flexíveis</h2>
                                <p className="text-gray-500">Comece grátis e escale conforme sua necessidade.</p>
                            </div>
                            <div className="grid md:grid-cols-3 gap-6">
                                 {Object.values(PLANS).filter(p => p.id !== 'free').slice(0, 3).map(plan => (
                                     <div key={plan.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative hover:shadow-md transition">
                                         {plan.id === 'premium' && <span className="absolute top-0 right-0 bg-green-600 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold uppercase tracking-wide">Mais Popular</span>}
                                         <h3 className="font-bold text-xl text-[#263238] mb-2">{plan.name}</h3>
                                         <p className="text-3xl font-bold text-[#263238] mb-1">R$ {plan.price.toFixed(0)}<span className="text-sm text-gray-500 font-normal">/mês</span></p>
                                         <p className="text-xs text-gray-400 mb-6 font-medium">{plan.credits} Créditos Mensais</p>
                                         <ul className="space-y-3 mb-8 text-sm text-gray-600">
                                             <li className="flex items-center"><i className="fas fa-check-circle text-green-500 mr-2"></i> Acesso ao Creator Suite</li>
                                             <li className="flex items-center"><i className="fas fa-check-circle text-green-500 mr-2"></i> Geração de Imagens</li>
                                             <li className="flex items-center"><i className="fas fa-check-circle text-green-500 mr-2"></i> Suporte Prioritário</li>
                                         </ul>
                                         <button onClick={() => onNavigateToLogin && onNavigateToLogin()} className="w-full py-2.5 bg-[#F39C12] hover:bg-orange-500 text-white font-bold rounded-lg transition shadow-md shadow-orange-100">
                                             Escolher {plan.name}
                                         </button>
                                     </div>
                                 ))}
                            </div>
                        </section>

                        {/* Footer */}
                        <footer className="bg-white border-t border-gray-200 pt-10 pb-6">
                             <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                 <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center font-bold text-white shadow-sm">G</div>
                                    <span className="font-bold text-xl text-[#263238]">GDN<span className="text-green-600">_IA</span></span>
                                 </div>
                                 <div className="text-sm text-gray-500">
                                     &copy; {new Date().getFullYear()} GDN_IA. Todos os direitos reservados.
                                 </div>
                                 <div className="flex gap-4">
                                     <button onClick={() => onNavigate && onNavigate('terms')} className="text-gray-400 hover:text-green-600 text-xs">Termos</button>
                                     <button onClick={() => onNavigate && onNavigate('privacy')} className="text-gray-400 hover:text-green-600 text-xs">Privacidade</button>
                                 </div>
                             </div>
                        </footer>
                    </div>
                )}
            </div>
        </main>
      </div>
      
      {/* Modals */}
      {showPlansModal && user && (
        <PlansModal 
            currentPlanId={currentPlan.id} 
            onClose={() => setShowPlansModal(false)} 
            onSelectPlan={() => console.log('Plan selection triggered, handled by modal internally')} 
            onBuyCredits={() => console.log('Buy credits triggered, handled by modal internally')} 
        />
      )}

      {showIntegrationsModal && (
          <IntegrationsModal onClose={() => setShowIntegrationsModal(false)} />
      )}

      {/* Guest & Lock Modals */}
      {showGuestLimitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center relative overflow-hidden border border-gray-200">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600"></div>
                <i className="fas fa-ticket-alt text-5xl text-gray-300 mb-6 block"></i>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Fim dos Testes Grátis</h2>
                <p className="text-gray-600 mb-6 text-sm">
                    Você utilizou todos os seus créditos de visitante. Crie uma conta gratuita para continuar.
                </p>
                <div className="space-y-3">
                    {onNavigateToLogin && (
                        <button 
                            onClick={() => { setShowGuestLimitModal(false); onNavigateToLogin(); }}
                            className="w-full bg-[#F39C12] hover:bg-orange-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-sign-in-alt"></i> Criar Conta / Entrar
                        </button>
                    )}
                    <button onClick={() => setShowGuestLimitModal(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 px-4 rounded-lg transition-all text-sm">Fechar</button>
                </div>
             </div>
        </div>
      )}

      {showFeatureLockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center relative overflow-hidden border border-gray-200">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-pink-600"></div>
                <div className="bg-purple-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-100">
                    <i className="fas fa-lock text-3xl text-purple-500"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Recurso Exclusivo</h2>
                <p className="text-gray-600 mb-6 text-sm">
                    Esta ferramenta é exclusiva para membros cadastrados ou planos superiores.
                </p>
                <div className="space-y-3">
                    {onNavigateToLogin && (
                        <button 
                            onClick={() => { setShowFeatureLockModal(false); onNavigateToLogin(); }}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-rocket"></i> Desbloquear Agora
                        </button>
                    )}
                    <button onClick={() => setShowFeatureLockModal(false)} className="w-full bg-transparent hover:bg-gray-100 text-gray-500 font-bold py-3 px-4 rounded-lg transition-all text-sm">Continuar Testando Grátis</button>
                </div>
             </div>
        </div>
      )}

      {showManualModal && <ManualModal onClose={() => setShowManualModal(false)} />}
      {showHistoryModal && user && <UserHistoryModal userId={user.id} onClose={() => setShowHistoryModal(false)} />}
      {showAffiliateModal && user && <AffiliateModal onClose={() => setShowAffiliateModal(false)} />}
      
      {/* Popups */}
      {showAffiliateInvite && <AffiliateInvitePopup onClose={handleCloseAffiliateInvite} onAccept={handleAcceptAffiliateInvite} />}
      
      {showFeedbackInvite && onNavigate && (
          <FeedbackInvitePopup 
            onClose={() => setShowFeedbackInvite(false)}
            onAccept={() => {
                setShowFeedbackInvite(false);
                onNavigate('feedback');
            }}
          />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function FeatureCard({ icon, title, desc, color, bg }: { icon: string, title: string, desc: string, color: string, bg: string }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition duration-300">
            <div className={`w-12 h-12 ${bg} ${color} rounded-lg flex items-center justify-center text-xl mb-4 border border-opacity-50`}>
                <i className={`fas ${icon}`}></i>
            </div>
            <h3 className="text-lg font-bold text-[#263238] mb-2">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
        </div>
    );
}

export default DashboardPage;
