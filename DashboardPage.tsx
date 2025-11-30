

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
import { IntegrationsModal } from './components/integrations/IntegrationsModal'; // Importar Modal
import { AffiliateInvitePopup } from './components/AffiliateInvitePopup';
import { Toast } from './components/admin/Toast';
import { generateCreativeContent } from './services/geminiService';
// REMOVIDO: import { handlePlanSubscription, handleCreditPurchase } from './services/paymentService';
import { api } from './services/api';
import { logContentGeneration } from './services/loggerService';
import { ServiceKey, UserPlan } from './types/plan.types';
import { PLANS, CREATOR_SUITE_MODES, GUEST_ID } from './constants';
import { useUser } from './contexts/UserContext';
import { usePlan } from './hooks/usePlan'; 
import { SeoScorecard } from './components/SEO/SeoScorecard'; 
import { SeoHead } from './components/SEO/SeoHead'; 

interface DashboardPageProps {
  onNavigateToAdmin: () => void;
  onNavigateToLogin?: () => void;
  onNavigate?: (page: string) => void;
}

// Mapeamento de Ícones para a Grade de Serviços
const SERVICE_ICONS: Record<ServiceKey, string> = {
    news_generator: 'fa-newspaper',
    text_to_speech: 'fa-microphone-lines',
    copy_generator: 'fa-pen-nib',
    prompt_generator: 'fa-terminal',
    landingpage_generator: 'fa-code',
    institutional_website_generator: 'fa-building',
    canva_structure: 'fa-vector-square',
    image_generation: 'fa-paint-brush',
};

// Cores para os cards da Grade
const SERVICE_COLORS: Record<ServiceKey, string> = {
    news_generator: 'text-green-400 border-green-500/30 hover:bg-green-900/20',
    text_to_speech: 'text-blue-400 border-blue-500/30 hover:bg-blue-900/20',
    copy_generator: 'text-purple-400 border-purple-500/30 hover:bg-purple-900/20',
    prompt_generator: 'text-yellow-400 border-yellow-500/30 hover:bg-yellow-900/20',
    landingpage_generator: 'text-pink-400 border-pink-500/30 hover:bg-pink-900/20',
    institutional_website_generator: 'text-orange-400 border-orange-500/30 hover:bg-orange-900/20',
    canva_structure: 'text-cyan-400 border-cyan-500/30 hover:bg-cyan-900/20',
    image_generation: 'text-rose-400 border-rose-500/30 hover:bg-rose-900/20',
};

// Modos permitidos para Visitantes (Free sem login)
const GUEST_ALLOWED_MODES: ServiceKey[] = ['news_generator', 'copy_generator', 'prompt_generator'];

const extractTitleAndContent = (text: string, mode: ServiceKey) => {
    // Modos que retornam código ou não têm título estruturado
    if (['landingpage_generator', 'institutional_website_generator', 'canva_structure', 'image_generation'].includes(mode)) {
        return { title: null, content: text };
    }

    const lines = text.split('\n');
    if (lines.length > 0) {
        let firstLine = lines[0].trim();
        
        // Critérios para considerar a primeira linha um título
        const isMarkdownTitle = firstLine.startsWith('**') || firstLine.startsWith('#');
        const hasPrefix = /^(título|title|headline|manchete|assunto|subject|prompt|copy):/i.test(firstLine);
        // Aceita linhas curtas que pareçam títulos, mesmo sem markdown, se houver quebra de linha depois
        const isShortLine = firstLine.length > 2 && firstLine.length < 150 && lines.length > 1;

        if (isMarkdownTitle || hasPrefix || isShortLine) {
            let cleanTitle = firstLine;

            // 1. Remove Markdown (*, #)
            cleanTitle = cleanTitle.replace(/[*#]/g, '').trim();

            // 2. Remove Prefixos comuns
            cleanTitle = cleanTitle.replace(/^(título|title|headline|manchete|assunto|subject|prompt|copy|foco)\s*[:|-]\s*/i, '').trim();

            // Define onde começa o conteúdo real (pula a linha do título e linhas vazias subsequentes)
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
  const { currentPlan, userCredits: dbCredits, hasAccessToService, getCreditsCostForService, canUseService } = usePlan();

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
  
  // Modals States
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showGuestLimitModal, setShowGuestLimitModal] = useState(false); 
  const [showFeatureLockModal, setShowFeatureLockModal] = useState(false); 
  const [showManualModal, setShowManualModal] = useState(false); 
  const [showHistoryModal, setShowHistoryModal] = useState(false); 
  const [showAffiliateModal, setShowAffiliateModal] = useState(false); 
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false); // Novo state
  const [showAffiliateInvite, setShowAffiliateInvite] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Inicialização de Dados
  useEffect(() => {
    // 1. Carrega créditos de visitante
    const stored = localStorage.getItem('gdn_guest_credits');
    if (stored !== null) {
        setGuestCredits(parseInt(stored, 10));
    } else {
        localStorage.setItem('gdn_guest_credits', '3');
    }

    // 2. Carrega metadados do app
    fetch('/metadata.json') // Updated to absolute path
      .then(response => response.ok ? response.json() : { version: 'Error' })
      .then(data => setMetadata(data))
      .catch(err => console.error("Failed to load metadata:", err));
  }, []);

  // Lógica de Popup de Afiliados
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
  };

  const handleGenerateContent = useCallback(async (
    prompt: string, 
    mode: ServiceKey, 
    generateAudio: boolean,
    options?: { theme?: string; primaryColor?: string; aspectRatio?: string; imageStyle?: string }
  ) => {
    // Validações Iniciais
    if (isGuest && !GUEST_ALLOWED_MODES.includes(mode)) {
        setShowFeatureLockModal(true);
        return;
    }

    if (!prompt.trim()) {
      setError('Por favor, insira uma descrição para o conteúdo a ser gerado.');
      return;
    }

    // Calculate Costs
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
        // 1. Check permission for Main Service
        if (!hasAccessToService(mode)) {
             setError(`Acesso Negado: O modo "${mode.replace(/_/g, ' ').toUpperCase()}" é exclusivo de planos superiores.`);
             setShowPlansModal(true);
             return;
        }

        // 2. Check permission for Audio if requested
        if (generateAudio && !hasAccessToService('text_to_speech')) {
             setError(`Acesso Negado: A ferramenta de Texto para Voz é exclusiva de planos superiores.`);
             setShowPlansModal(true);
             return;
        }

        // 3. Check Total Balance
        // Admins (credits === -1) always pass
        if (activeCredits !== -1 && activeCredits < totalCost) {
            setError(`Saldo insuficiente. Esta operação custa ${totalCost} créditos (Conteúdo: ${mainCost} + Áudio: ${audioCost}).`);
            setShowPlansModal(true);
            return;
        }
    }

    // Reset de Estado
    setIsLoading(true);
    setError(null);
    setResultText(null);
    setResultTitle(null);
    setResultMetadata(null);
    setShowFeedback(false);
    setAudioBase64(null);
    setGeneratedImagePrompt('');

    try {
      const { text, audioBase64: audioResult, sources } = await generateCreativeContent(
        prompt, 
        mode, 
        user?.id, 
        shouldGenerateAudio,
        options
      );
      
      // Atualização de Créditos (Deduct Total Cost)
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

      // Processamento de Texto
      let processedText = text;
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      
      if (!isAdmin && (isGuest || currentPlan.id !== 'premium') && mode !== 'image_generation' && mode !== 'landingpage_generator' && mode !== 'institutional_website_generator' && mode !== 'canva_structure') {
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

      // Tratamento Específico por Modo
      if (mode === 'image_generation') {
          setGeneratedImagePrompt(text);
          let w = 1024, h = 1024;
          if (options?.aspectRatio === '16:9') { w = 1280; h = 720; }
          if (options?.aspectRatio === '9:16') { w = 720; h = 1280; }
          setImageDimensions({ width: w, height: h });
          setResultText(prompt); 
      } else {
          const { title, content } = extractTitleAndContent(processedText, mode);
          setResultTitle(title);
          setResultText(content);
      }
      
      setAudioBase64(audioResult);
      
      // LOG DE USO (Misto: Usuário ou Visitante)
      const userIdToLog = user ? user.id : GUEST_ID;
      const planIdToLog = user ? currentPlan.id : 'guest';
      
      // Registra a ação no log geral com o CUSTO TOTAL
      logContentGeneration(userIdToLog, mode, totalCost, updatedCredits, planIdToLog);
      
      if (user) {
         // Salvar no Histórico Pessoal (Apenas para usuários logados)
         try {
              let historyTitle = '';
              const shortPrompt = prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt;
              
              switch(mode) {
                  case 'news_generator': historyTitle = resultTitle ? `Notícia: ${resultTitle}` : `Notícia: ${shortPrompt}`; break;
                  default: historyTitle = `Geração: ${shortPrompt}`;
              }

              const contentToSave = mode === 'image_generation' ? `PROMPT: ${text}` : processedText;

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

      setShowFeedback(true);

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

  // Funções de pagamento atualizadas para não esperar URL
  const handlePlanSelection = async (planId: UserPlan) => {
    // This function will be called by PlansModal.tsx now that the transparent checkout is handled there.
    // It doesn't need to do anything here directly as PlansModal will manage the payment flow itself.
    // It's kept for API compatibility if needed elsewhere, but effectively a no-op when called by PlansModal.
    console.log(`Plan ${planId} selected. Payment flow handled in PlansModal.`);
  };

  const handleBuyCredits = async (amount: number, price: number) => {
    // This function will be called by PlansModal.tsx now that the transparent checkout is handled there.
    // It doesn't need to do anything here directly as PlansModal will manage the payment flow itself.
    // It's kept for API compatibility if needed elsewhere, but effectively a no-op when called by PlansModal.
    console.log(`Credits purchase of ${amount} for R$ ${price} initiated. Payment flow handled in PlansModal.`);
  };


  return (
    <div className="min-h-screen bg-black text-gray-300">
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
      />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          
          <div className="mb-8 text-center animate-fade-in-up">
            <div className="inline-block bg-gray-900 rounded-2xl border border-gray-800 shadow-md p-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-sm">
                <span className="bg-black/50 px-3 py-1 rounded-full border border-gray-800">
                    Plano: <span className={`font-bold uppercase ${isGuest ? 'text-gray-400' : `text-${currentPlan.color}-400`}`}>{activePlanName}</span>
                </span>
                <span className="bg-black/50 px-3 py-1 rounded-full border border-gray-800">
                    Saldo: <span className="font-bold text-white">{activeCredits === -1 ? '∞' : activeCredits}</span> créditos
                </span>
                {user?.last_login && (
                    <span className="bg-black/50 px-3 py-1 rounded-full border border-gray-800 text-xs text-gray-400 flex items-center">
                        <i className="fas fa-clock mr-1.5 text-green-500"></i>
                        Acesso: <span className="text-gray-300 ml-1">{new Date(user.last_login).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                )}
                </div>
            </div>
            {isGuest && (
                 <div className="mt-2 text-xs text-yellow-500 bg-yellow-900/10 inline-block px-3 py-1 rounded-lg border border-yellow-900/30">
                    <i className="fas fa-info-circle mr-1"></i> Você está testando como visitante. Algumas ferramentas requerem login.
                 </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
             {CREATOR_SUITE_MODES.map((svc) => {
                 const isSelected = currentMode === svc.value;
                 const isRestrictedGuest = isGuest && !GUEST_ALLOWED_MODES.includes(svc.value);
                 const isLockedByPlan = !isGuest && !hasAccessToService(svc.value);
                 const isLocked = isRestrictedGuest || isLockedByPlan;
                 const cost = getCreditsCostForService(svc.value);

                 const icon = SERVICE_ICONS[svc.value] || 'fa-star';
                 const colorClass = SERVICE_COLORS[svc.value] || 'text-gray-400 border-gray-600 hover:bg-gray-800';
                 
                 return (
                     <button
                        key={svc.value}
                        onClick={() => handleModeSelection(svc.value)}
                        disabled={isLoading}
                        className={`relative p-4 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center text-center gap-3 h-32 group
                            ${isSelected 
                                ? `bg-gray-900 border-2 shadow-lg shadow-green-900/20 scale-105 z-10 ${colorClass.split(' ')[0]} border-${colorClass.split(' ')[0].replace('text-', '')}` 
                                : `bg-black/50 ${isLocked ? 'opacity-75 grayscale-0 border-gray-800 hover:bg-gray-900/50' : `${colorClass}`}`
                            }
                        `}
                     >
                        {!isLocked && (
                            <div className="absolute top-2 left-2 bg-black/60 text-xs text-gray-400 px-2 py-0.5 rounded border border-gray-800 backdrop-blur-sm group-hover:bg-black/80 transition-colors flex items-center">
                                <i className="fas fa-coins text-yellow-500 mr-1 text-[10px]"></i>
                                {cost}
                            </div>
                        )}

                        <i className={`fas ${icon} text-3xl mb-1 transition-transform group-hover:scale-110`}></i>
                        <span className="text-xs font-bold uppercase tracking-wider leading-tight">{svc.label}</span>
                        
                        {isLocked && (
                            <div className="absolute top-2 right-2 text-yellow-500 bg-black/80 rounded-full w-6 h-6 flex items-center justify-center border border-yellow-500/50">
                                <i className="fas fa-lock text-xs"></i>
                            </div>
                        )}
                        {isSelected && (
                            <div className="absolute -bottom-2 bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                SELECIONADO
                            </div>
                        )}
                     </button>
                 );
             })}
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
            <div className="mt-8 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-center animate-fade-in" role="alert">
              <strong className="font-bold block mb-2"><i className="fas fa-exclamation-circle mr-2"></i>Atenção</strong>
              <span className="block whitespace-pre-wrap text-left mx-auto max-w-lg text-sm font-mono">{error}</span>
              {!isGuest && (error.includes('Acesso Negado') || error.includes('saldo acabou') || error.includes('Saldo insuficiente')) && (
                  <button 
                    onClick={() => setShowPlansModal(true)}
                    className="mt-4 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg text-sm transition shadow-lg shadow-red-600/20"
                  >
                    Resolver Agora
                  </button>
              )}
            </div>
          )}

          <div className="mt-8 space-y-8">
            {isLoading && <Loader mode={currentMode} />}
            
            {!isLoading && (
              <>
                {(currentMode === 'landingpage_generator' || currentMode === 'institutional_website_generator' || currentMode === 'canva_structure') && resultText && (
                   <LandingPageBuilder 
                        initialHtml={resultText} 
                        onClose={() => setResultText(null)}
                   />
                )}

                {currentMode === 'image_generation' && generatedImagePrompt && (
                   <ImageStudio 
                      prompt={resultText || ''} 
                      originalPrompt={generatedImagePrompt} 
                      width={imageDimensions.width} 
                      height={imageDimensions.height} 
                   />
                )}

                {/* RESULT DISPLAY & SEO WIDGET */}
                {currentMode !== 'landingpage_generator' && currentMode !== 'institutional_website_generator' && currentMode !== 'image_generation' && currentMode !== 'canva_structure' && resultText && (
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                       <div className="lg:col-span-2">
                           <ResultDisplay 
                              title={resultTitle} 
                              text={resultText} 
                              mode={currentMode} 
                              metadata={resultMetadata || undefined}
                           />
                       </div>
                       
                       <div className="lg:col-span-1">
                           <SeoScorecard 
                                title={resultTitle || "Sem Título"} 
                                content={resultText} 
                           />
                       </div>
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
        </div>
      </main>
      
      {/* Modals */}
      {showPlansModal && user && (
        <PlansModal 
            currentPlanId={currentPlan.id} 
            onClose={() => setShowPlansModal(false)} 
            onSelectPlan={() => console.log('Plan selection triggered, handled by modal internally')} // No-op
            onBuyCredits={() => console.log('Buy credits triggered, handled by modal internally')} // No-op
        />
      )}

      {showIntegrationsModal && (
          <IntegrationsModal onClose={() => setShowIntegrationsModal(false)} />
      )}

      {showGuestLimitModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
             <div className="bg-black border border-green-500/50 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600"></div>
                
                <i className="fas fa-ticket-alt text-5xl text-gray-700 mb-6 block"></i>
                <h2 className="text-2xl font-bold text-white mb-2">Fim dos Testes Grátis</h2>
                <p className="text-gray-400 mb-6">
                    Você utilizou todos os seus créditos de visitante. Para continuar gerando conteúdo incrível e desbloquear recursos avançados, crie uma conta gratuita.
                </p>

                <div className="space-y-3">
                    {onNavigateToLogin && (
                        <button 
                            onClick={() => { setShowGuestLimitModal(false); onNavigateToLogin(); }}
                            className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 px-4 rounded-lg shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-sign-in-alt"></i> Criar Conta / Entrar
                        </button>
                    )}
                    <button 
                         onClick={() => setShowGuestLimitModal(false)}
                         className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 px-4 rounded-lg transition-all"
                    >
                        Fechar
                    </button>
                </div>
             </div>
        </div>
      )}

      {showFeatureLockModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
             <div className="bg-black border border-purple-500/50 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-pink-600"></div>
                
                <div className="bg-purple-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/30">
                    <i className="fas fa-lock text-4xl text-purple-400"></i>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">Recurso Exclusivo para Membros</h2>
                <p className="text-gray-400 mb-6 text-sm">
                    Esta ferramenta avançada está disponível apenas para usuários cadastrados. Crie sua conta gratuita agora para desbloquear:
                </p>
                
                <ul className="text-left text-sm text-gray-400 mb-6 space-y-2 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                    <li><i className="fas fa-check text-green-500 mr-2"></i> Geração de Imagens IA</li>
                    <li><i className="fas fa-check text-green-500 mr-2"></i> Landing Pages & Sites</li>
                    <li><i className="fas fa-check text-green-500 mr-2"></i> Texto para Voz (TTS)</li>
                    <li><i className="fas fa-check text-green-500 mr-2"></i> Editor Visual de Social Media</li>
                </ul>

                <div className="space-y-3">
                    {onNavigateToLogin && (
                        <button 
                            onClick={() => { setShowFeatureLockModal(false); onNavigateToLogin(); }}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-rocket"></i> Desbloquear Tudo Agora
                        </button>
                    )}
                    <button 
                         onClick={() => setShowFeatureLockModal(false)}
                         className="w-full bg-transparent hover:bg-gray-900 text-gray-400 font-bold py-3 px-4 rounded-lg transition-all"
                    >
                        Continuar Testando Grátis
                    </button>
                </div>
             </div>
        </div>
      )}

      {showManualModal && <ManualModal onClose={() => setShowManualModal(false)} />}
      {showHistoryModal && user && <UserHistoryModal userId={user.id} onClose={() => setShowHistoryModal(false)} />}
      {showAffiliateModal && user && <AffiliateModal onClose={() => setShowAffiliateModal(false)} />}
      {showAffiliateInvite && <AffiliateInvitePopup onClose={handleCloseAffiliateInvite} onAccept={handleAcceptAffiliateInvite} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <footer className="border-t border-gray-900 mt-12 py-12 bg-black/30">
        <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-sm">
                <div>
                    <h4 className="text-white font-bold mb-4 uppercase tracking-wider">GDN_IA</h4>
                    <p className="text-gray-500 mb-4">
                        Plataforma líder em geração de conteúdo com Inteligência Artificial.
                    </p>
                </div>
                <div>
                    <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Institucional</h4>
                    <ul className="space-y-2 text-gray-500">
                        <li><button onClick={() => onNavigate?.('about')} className="hover:text-green-400 transition">Quem Somos</button></li>
                        <li><button onClick={() => onNavigate?.('about')} className="hover:text-green-400 transition">Missão e Valores</button></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Legal</h4>
                    <ul className="space-y-2 text-gray-500">
                        <li><button onClick={() => onNavigate?.('terms')} className="hover:text-green-400 transition">Termos de Uso</button></li>
                        <li><button onClick={() => onNavigate?.('privacy')} className="hover:text-green-400 transition">Política de Privacidade</button></li>
                        <li><button onClick={() => onNavigate?.('cookies')} className="hover:text-green-400 transition">Política de Cookies</button></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Contato</h4>
                    <ul className="space-y-2 text-gray-500">
                        <li><a href="mailto:suporte@gdn.ia" className="hover:text-green-400 transition">suporte@gdn.ia</a></li>
                    </ul>
                </div>
            </div>
            <div className="text-center pt-8 border-t border-gray-900 text-gray-600 text-xs">
                <p>&copy; {new Date().getFullYear()} GDN_IA. Todos os direitos reservados. Versão {metadata.version}</p>
            </div>
        </div>
      </footer>
    </div>
  );
}

export default DashboardPage;