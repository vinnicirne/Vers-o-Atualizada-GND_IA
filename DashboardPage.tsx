
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DashboardSidebar } from './components/DashboardSidebar';
import { ContentGenerator } from './components/ContentGenerator';
import { ResultDisplay } from './components/ResultDisplay';
import { AudioPlayer } from './components/AudioPlayer';
import { Loader } from './components/Loader';
import { LandingPageBuilder } from './components/LandingPageBuilder';
import { ImageStudio } from './components/ImageStudio';
import { SeoScorecard } from './components/SEO/SeoScorecard';
import { FeedbackWidget } from './components/FeedbackWidget';
import { PlansModal } from './components/PlansModal';
import { UserHistoryModal } from './components/UserHistoryModal';
import { ManualModal } from './components/ManualModal';
import { AffiliateModal } from './components/AffiliateModal';
import { IntegrationsModal } from './components/integrations/IntegrationsModal';
import { Toast } from './components/admin/Toast';
import { generateCreativeContent } from './services/geminiService';
import { useUser } from './contexts/UserContext';
import { usePlan } from './hooks/usePlan';
import { ServiceKey } from './types/plan.types';
import { CREATOR_SUITE_MODES } from './constants';
import { MultiChatLayout } from './components/chat/MultiChatLayout'; // NOVO

interface DashboardPageProps {
  onNavigateToAdmin: () => void;
  onNavigateToLogin: () => void;
  onNavigate: (page: string) => void;
}

// Helper para extrair título e conteúdo
const extractTitleAndContent = (text: string): { title: string | null, content: string } => {
  if (!text) return { title: null, content: '' };
  
  const lines = text.split('\n');
  let title = null;
  let content = text;

  // Tenta identificar um título na primeira linha se for curto e não tiver HTML complexo
  if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // Remove marcadores comuns de MD/Text gerados por IA
      const cleanLine = firstLine.replace(/^(\*\*|#|Título:|Subject:|Headline:)\s*/i, '').replace(/\*\*$/, '');
      
      if (cleanLine.length > 5 && cleanLine.length < 100 && !cleanLine.includes('<')) {
          title = cleanLine;
          // Remove a primeira linha e quebras subsequentes
          content = lines.slice(1).join('\n').trim();
      }
  }

  return { title, content };
};

export default function DashboardPage({ onNavigateToAdmin, onNavigateToLogin, onNavigate }: DashboardPageProps) {
  const { user, refresh } = useUser();
  const { currentPlan, hasAccessToService, hasEnoughCredits, getCreditsCostForService } = usePlan();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<ServiceKey>('news_generator');
  
  // Results State
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultTitle, setResultTitle] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 1024, height: 1024 });
  const [resultMetadata, setResultMetadata] = useState<{ plan: string, credits: string | number } | null>(null);
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals State
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false);
  
  // Guest Logic
  const [isGuest, setIsGuest] = useState(false);
  const [guestCredits, setGuestCredits] = useState(0);
  const [showGuestLimitModal, setShowGuestLimitModal] = useState(false);
  const [showFeatureLockModal, setShowFeatureLockModal] = useState(false);

  useEffect(() => {
      if (!user) {
          setIsGuest(true);
          const localCredits = localStorage.getItem('gdn_guest_credits');
          setGuestCredits(localCredits ? parseInt(localCredits) : 3);
      } else {
          setIsGuest(false);
      }
  }, [user]);

  // Modos permitidos para visitantes
  const GUEST_ALLOWED_MODES: ServiceKey[] = ['news_generator', 'copy_generator', 'prompt_generator', 'text_to_speech'];

  const handleModeChange = (mode: ServiceKey) => {
      if (isGuest && !GUEST_ALLOWED_MODES.includes(mode)) {
          setShowFeatureLockModal(true);
          return;
      }
      
      if (!isGuest && !hasAccessToService(mode)) {
          // Se for usuário logado mas sem acesso ao plano
          setShowPlansModal(true);
          return;
      }

      setCurrentMode(mode);
      // Limpa resultados anteriores ao trocar de modo
      setResultText(null);
      setResultTitle(null);
      setAudioBase64(null);
      setGeneratedImagePrompt(null);
      setShowFeedback(false);
      setError(null);
      setSidebarOpen(false); // Fecha sidebar no mobile
  };

  const handleGenerateContent = async (
      prompt: string, 
      mode: ServiceKey, 
      generateAudio: boolean, 
      options?: any
  ) => {
    setError(null);
    setResultText(null);
    setAudioBase64(null);
    setGeneratedImagePrompt(null);
    setShowFeedback(false);

    // Validação de Créditos
    const cost = isGuest ? 1 : getCreditsCostForService(mode) + (generateAudio ? 2 : 0);
    
    if (isGuest) {
        if (guestCredits < 1) {
            setShowGuestLimitModal(true);
            return;
        }
    } else {
        if (!hasEnoughCredits(mode)) {
            setToast({ message: "Saldo insuficiente para esta operação.", type: 'error' });
            setShowPlansModal(true);
            return;
        }
    }

    setIsLoading(true);

    try {
      // Configuração específica para imagens
      if (mode === 'image_generation' && options?.aspectRatio) {
          const [wRatio, hRatio] = options.aspectRatio.split(':').map(Number);
          // Base 1024
          const base = 1024;
          let w = base, h = base;
          if (wRatio > hRatio) { h = Math.round(base * (hRatio / wRatio)); }
          else if (hRatio > wRatio) { w = Math.round(base * (wRatio / hRatio)); }
          setImageDimensions({ width: w, height: h });
      }

      const result = await generateCreativeContent(prompt, mode, user?.id, generateAudio, options);
      
      if (mode === 'image_generation' || mode === 'social_media_poster') {
          // Para imagens, o 'text' retornado é o prompt em inglês otimizado
          setResultText(result.text); 
          setGeneratedImagePrompt(result.text); // Salva para o ImageStudio usar
      } else {
          // Processamento de Texto
          const { title, content } = extractTitleAndContent(result.text);
          setResultTitle(title);
          setResultText(content);
      }

      if (result.audioBase64) {
          setAudioBase64(result.audioBase64);
      }

      // Consumo de Créditos
      if (isGuest) {
          const newCredits = guestCredits - 1;
          setGuestCredits(newCredits);
          localStorage.setItem('gdn_guest_credits', newCredits.toString());
          setResultMetadata({ plan: 'Visitante', credits: newCredits });
      } else {
          await refresh(); // Atualiza saldo do usuário
          setResultMetadata({ 
              plan: currentPlan.name, 
              credits: user?.credits === -1 ? 'Ilimitado' : (user?.credits || 0) - cost 
          });
      }

      setShowFeedback(true);

    } catch (err: any) {
      console.error("Erro na geração:", err);
      setError(err.message || 'Ocorreu um erro ao gerar o conteúdo. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ECEFF1] text-[#263238] font-['Poppins']">
      <Header
        userEmail={user?.email}
        onLogout={user ? async () => { await import('./contexts/UserContext').then(m => m.useUser().signOut); window.location.reload(); } : undefined}
        isAdmin={user?.role === 'admin' || user?.role === 'super_admin'}
        onNavigateToAdmin={onNavigateToAdmin}
        onNavigateToLogin={!user ? onNavigateToLogin : undefined}
        onOpenPlans={() => setShowPlansModal(true)}
        onOpenManual={() => setShowManualModal(true)}
        onOpenHistory={() => setShowHistoryModal(true)}
        onOpenAffiliates={() => setShowAffiliateModal(true)}
        onOpenIntegrations={() => setShowIntegrationsModal(true)}
        userCredits={isGuest ? guestCredits : user?.credits}
        pageTitle="Creator Suite"
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        
        {/* SIDEBAR */}
        <DashboardSidebar 
            isOpen={sidebarOpen}
            setIsOpen={setSidebarOpen}
            currentMode={currentMode}
            onModeChange={handleModeChange}
            user={user}
            isGuest={isGuest}
            activeCredits={isGuest ? guestCredits : (user?.credits || 0)}
            hasAccessToService={hasAccessToService}
            guestAllowedModes={GUEST_ALLOWED_MODES}
            onOpenPlans={() => setShowPlansModal(true)}
            onOpenAffiliates={() => setShowAffiliateModal(true)}
            onOpenHistory={() => setShowHistoryModal(true)}
            onOpenIntegrations={() => setShowIntegrationsModal(true)}
            onOpenManual={() => setShowManualModal(true)}
            onNavigateFeedback={() => onNavigate('feedback')}
        />

        {/* MAIN CONTENT AREA SWITCHER */}
        <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-[#F5F7FA]">
            
            {/* VIEW: CHAT MULTI-ATENDIMENTO */}
            {currentMode === 'multi_chat' ? (
                <MultiChatLayout user={user} />
            ) : (
            
            /* VIEW: CONTENT GENERATOR (Padrão) */
            <div className="p-4 md:p-8 max-w-5xl mx-auto">
                
                {/* GENERATOR INPUT */}
                <ContentGenerator 
                    mode={currentMode}
                    onModeChange={handleModeChange}
                    onGenerate={handleGenerateContent}
                    isLoading={isLoading}
                    isGuest={isGuest}
                    guestAllowedModes={GUEST_ALLOWED_MODES}
                />

                {/* ERROR DISPLAY */}
                {error && (
                    <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded shadow-sm animate-fade-in" role="alert">
                        <p className="font-bold">Erro</p>
                        <p>{error}</p>
                    </div>
                )}

                {/* RESULTS AREA */}
                <div className="mt-8 space-y-8 pb-12">
                    {isLoading && <Loader mode={currentMode} />}
                    
                    {!isLoading && (
                    <>
                        {/* LANDING PAGE & SITE EDITOR */}
                        {/* FIX: Changed 'institutional_website_generator' to 'landingpage_generator' to match ServiceKey type */}
                        {(currentMode === 'landingpage_generator' || currentMode === 'landingpage_generator' || currentMode === 'canva_structure' || currentMode === 'curriculum_generator') && resultText && (
                            <LandingPageBuilder 
                                initialHtml={resultText} 
                                onClose={() => setResultText(null)}
                            />
                        )}

                        {/* IMAGE STUDIO */}
                        {(currentMode === 'image_generation' || currentMode === 'social_media_poster') && generatedImagePrompt && (
                            <ImageStudio 
                                prompt={resultText || ''} 
                                originalPrompt={generatedImagePrompt} 
                                width={imageDimensions.width} 
                                height={imageDimensions.height} 
                            />
                        )}

                        {/* DIAGNOSTIC ALERT FOR TTS FAILURE */}
                        {currentMode === 'text_to_speech' && resultText && !audioBase64 && (
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r shadow-sm animate-fade-in">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <i className="fas fa-exclamation-triangle text-yellow-400"></i>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-yellow-700 font-bold">
                                            Aviso: O áudio não pôde ser gerado.
                                        </p>
                                        <p className="text-xs text-yellow-600 mt-1">
                                            O sistema retornou texto como fallback. Tente novamente ou verifique os créditos.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* RESULT DISPLAY (TEXTO) & SEO WIDGET */}
                        {/* FIX: Changed 'institutional_website_generator' to 'landingpage_generator' to match ServiceKey type */}
                        {currentMode !== 'landingpage_generator' && 
                         currentMode !== 'landingpage_generator' && 
                         currentMode !== 'image_generation' && 
                         currentMode !== 'canva_structure' && 
                         currentMode !== 'curriculum_generator' &&
                         // LÓGICA DE CORREÇÃO: Esconde o texto apenas se for TTS E tiver áudio com sucesso.
                         // Se for TTS mas falhou (sem áudio), mostra o texto para debug.
                         (currentMode !== 'text_to_speech' || !audioBase64) &&
                         resultText && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                                <div className="lg:col-span-2">
                                    <ResultDisplay 
                                        title={resultTitle} 
                                        text={resultText} 
                                        mode={currentMode} 
                                        metadata={resultMetadata || undefined}
                                    />
                                </div>
                                
                                {/* SEO Scorecard - Útil para notícias e copy */}
                                {(currentMode === 'news_generator' || currentMode === 'copy_generator') && (
                                    <div className="lg:col-span-1">
                                        <SeoScorecard 
                                            title={resultTitle || "Sem Título"} 
                                            content={resultText} 
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* AUDIO PLAYER */}
                        {audioBase64 && <AudioPlayer audioBase64={audioBase64} />}
                        
                        {/* FEEDBACK WIDGET */}
                        {(resultText || generatedImagePrompt || audioBase64) && showFeedback && user && (
                            <FeedbackWidget 
                                userId={user.id} 
                                onClose={() => setShowFeedback(false)} 
                            />
                        )}
                    </>
                    )}
                </div>

                {/* MARKETING FOOTER FOR GUESTS */}
                {isGuest && (
                    <div className="mt-12 p-6 bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl text-center text-white shadow-xl animate-fade-in">
                        <h3 className="text-xl font-bold mb-2">Gostou do teste?</h3>
                        <p className="text-gray-300 mb-6 text-sm">Crie sua conta gratuita agora e desbloqueie ferramentas avançadas como <strong>Geração de Imagens</strong> e <strong>Sites Completos</strong>.</p>
                        <button 
                            onClick={onNavigateToLogin}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full transition transform hover:-translate-y-1 shadow-lg shadow-green-500/30"
                        >
                            Criar Conta Grátis
                        </button>
                    </div>
                )}
            </div>
            )}
        </main>
      </div>

      {/* MODALS */}
      {showPlansModal && (
        <PlansModal 
            currentPlanId={user?.plan || 'free'} 
            onClose={() => setShowPlansModal(false)}
            onSelectPlan={() => {}} 
            onBuyCredits={() => {}}
        />
      )}

      {showHistoryModal && user && (
          <UserHistoryModal userId={user.id} onClose={() => setShowHistoryModal(false)} />
      )}

      {showManualModal && (
          <ManualModal onClose={() => setShowManualModal(false)} />
      )}

      {showAffiliateModal && (
          <AffiliateModal onClose={() => setShowAffiliateModal(false)} />
      )}

      {showIntegrationsModal && (
          <IntegrationsModal onClose={() => setShowIntegrationsModal(false)} />
      )}

      {/* GUEST LIMIT MODAL */}
      {showGuestLimitModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl max-w-md w-full p-8 text-center shadow-2xl border-t-4 border-green-500">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 text-2xl">
                    <i className="fas fa-lock"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Limite de Visitante Atingido</h3>
                <p className="text-gray-600 mb-6">
                    Você usou seus 3 créditos gratuitos de teste. Para continuar gerando conteúdo ilimitado, crie sua conta agora!
                </p>
                <div className="space-y-3">
                    <button 
                        onClick={onNavigateToLogin}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
                    >
                        Criar Conta Grátis
                    </button>
                    <button 
                        onClick={() => setShowGuestLimitModal(false)}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-lg transition"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* FEATURE LOCK MODAL */}
      {showFeatureLockModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl max-w-md w-full p-8 text-center shadow-2xl border-t-4 border-[#F39C12]">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500 text-2xl">
                    <i className="fas fa-star"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Recurso Exclusivo</h3>
                <p className="text-gray-600 mb-6">
                    Esta ferramenta está disponível apenas para usuários cadastrados. Crie sua conta grátis para desbloquear!
                </p>
                <div className="space-y-3">
                    <button 
                        onClick={onNavigateToLogin}
                        className="w-full bg-[#F39C12] hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition"
                    >
                        Desbloquear Agora
                    </button>
                    <button 
                        onClick={() => setShowFeatureLockModal(false)}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-lg transition"
                    >
                        Talvez Depois
                    </button>
                </div>
            </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
