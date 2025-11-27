
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ContentGenerator } from './components/ContentGenerator';
import { ResultDisplay } from './components/ResultDisplay';
import { Loader } from './components/Loader';
import { FeedbackWidget } from './components/FeedbackWidget';
import { AudioPlayer } from './components/AudioPlayer';
import { LandingPageBuilder } from './components/LandingPageBuilder'; 
import { ImageStudio } from './components/ImageStudio'; // Importar ImageStudio
import { PlansModal } from './components/PlansModal';
import { ManualModal } from './components/ManualModal'; // Importar Manual
import { Toast } from './components/admin/Toast';
import { generateCreativeContent } from './services/geminiService';
import { handlePlanSubscription, handleCreditPurchase } from './services/paymentService';
import { api } from './services/api';
import { ServiceKey, UserPlan } from './types/plan.types';
import { PLANS, CREATOR_SUITE_MODES } from './constants';
import { useUser } from './contexts/UserContext';
import { usePlan } from './hooks/usePlan'; 

interface DashboardPageProps {
  onNavigateToAdmin: () => void;
}

// Mapeamento de Ícones para a Grade de Serviços
const SERVICE_ICONS: Record<ServiceKey, string> = {
    news_generator: 'fa-newspaper',
    text_to_speech: 'fa-microphone-lines',
    copy_generator: 'fa-pen-nib',
    prompt_generator: 'fa-terminal',
    landingpage_generator: 'fa-code',
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
    canva_structure: 'text-cyan-400 border-cyan-500/30 hover:bg-cyan-900/20',
    image_generation: 'text-rose-400 border-rose-500/30 hover:bg-rose-900/20',
};

function DashboardPage({ onNavigateToAdmin }: DashboardPageProps) {
  const { user, signOut, refresh } = useUser();
  const { currentPlan, userCredits, hasAccessToService, getCreditsCostForService, canUseService } = usePlan();

  const [resultText, setResultText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ version: string }>({ version: 'N/A' }); // Initialize with default
  const [showFeedback, setShowFeedback] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  
  // States for Image Generation
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number}>({width: 1024, height: 1024});
  
  // Estado "Lifted Up" - O Dashboard controla o modo atual
  const [currentMode, setCurrentMode] = useState<ServiceKey>('news_generator');
  
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false); // State para o Manual
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('./metadata.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => setMetadata(data))
      .catch(err => {
        console.error("Failed to load metadata:", err);
        setMetadata({ version: 'Erro' }); // Set error state for metadata
      });
  }, []);

  const handleGenerateContent = useCallback(async (
    prompt: string, 
    mode: ServiceKey, 
    generateAudio: boolean,
    options?: { theme?: string; primaryColor?: string; aspectRatio?: string; imageStyle?: string }
  ) => {
    if (!prompt.trim()) {
      setError('Por favor, insira uma descrição para o conteúdo a ser gerado.');
      return;
    }

    if (!user) {
      setError('Sessão inválida. Por favor, faça login novamente.');
      return;
    }
    
    // Verificação de Acesso e Créditos
    if (!canUseService(mode)) {
        if (!hasAccessToService(mode)) {
            setError(`Acesso Negado: O modo "${mode.replace(/_/g, ' ').toUpperCase()}" é exclusivo de planos superiores. Seu plano atual é: ${currentPlan.name}.`);
        } else {
            const cost = getCreditsCostForService(mode);
            setError(`Seu saldo acabou (${userCredits} créditos restantes). Custo da operação: ${cost}.

Você pode:
1. Comprar créditos avulsos agora.
2. Fazer upgrade para um plano maior.`);
        }
        setShowPlansModal(true);
        return;
    }

    const cost = getCreditsCostForService(mode);

    setIsLoading(true);
    setError(null);
    setResultText(null);
    setShowFeedback(false);
    setAudioBase64(null);
    setGeneratedImagePrompt('');

    try {
      const { text, audioBase64: audioResult } = await generateCreativeContent(
        prompt, 
        mode, 
        user.id, 
        hasAccessToService('text_to_speech') && generateAudio,
        options
      );
      
      let updatedCredits = userCredits;
      if (userCredits !== -1) {
          updatedCredits = userCredits - cost;
          
          const { error: creditError } = await api.update('user_credits', { credits: updatedCredits }, { user_id: user.id });
          
          if (creditError) {
              console.error('Erro API Proxy ao atualizar créditos:', creditError);
          } else {
              await refresh();
          }
      }

      let processedText = text;
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';
      const creditsDisplay = userCredits === -1 ? 'Ilimitado' : `${updatedCredits}`;
      const footerInfo = `\n\n---\nCréditos restantes: ${creditsDisplay} | Plano: ${currentPlan.name}`;

      // Adiciona rodapé se não for conteúdo visual/código
      if (currentPlan.id !== 'premium' && !isAdmin && mode !== 'image_generation' && mode !== 'landingpage_generator' && mode !== 'canva_structure') {
          processedText += "\n\nGerado por GDN_IA";
      }

      if (mode !== 'landingpage_generator' && mode !== 'image_generation' && mode !== 'canva_structure') {
          processedText += footerInfo;
      }
      
      // Adiciona marca d'água no código da landing page se não for premium
      if (mode === 'landingpage_generator' && currentPlan.id !== 'premium' && !isAdmin) {
            const watermark = `<div style="text-align:center; font-size:10px; color:#888; padding:20px; background:#f9f9f9; border-top:1px solid #eee;">Gerado por GDN_IA</div>`;
            if (processedText.includes('</body>')) {
                processedText = processedText.replace('</body>', `${watermark}</body>`);
            } else {
                processedText += watermark;
            }
      }

      // Handle specific logic based on mode
      if (mode === 'image_generation') {
          // O 'text' retornado é o Prompt Otimizado em Inglês
          setGeneratedImagePrompt(text);
          
          // Calcular dimensões baseadas no Aspect Ratio escolhido
          let w = 1024, h = 1024;
          if (options?.aspectRatio === '16:9') { w = 1280; h = 720; }
          if (options?.aspectRatio === '9:16') { w = 720; h = 1280; }
          setImageDimensions({ width: w, height: h });
          
          setResultText(prompt); // Guardar o prompt original do usuário para referência
      } else {
          setResultText(processedText);
      }
      
      setAudioBase64(audioResult);
      
      await api.insert('logs', {
           usuario_id: user.id,
           acao: `generated_content_${mode}`,
           modulo: 'CreatorSuite',
           detalhes: { cost: cost, credits_after: updatedCredits, plan: currentPlan.id }
      });

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
  }, [user, userCredits, currentPlan, refresh, hasAccessToService, getCreditsCostForService, canUseService]);
  
  const handleLogout = async () => {
    await signOut();
  };

  const handlePlanSelection = async (planId: UserPlan) => {
    if(!user) return;
    setToast({ message: "Gerando link de pagamento Mercado Pago...", type: 'success' });
    try {
        const link = await handlePlanSubscription(planId, user);
        window.open(link, '_blank');
        setShowPlansModal(false);
    } catch (e: any) {
        setToast({ message: e.message, type: 'error' });
    }
  };

  const handleBuyCredits = async (amount: number, price: number) => {
    if(!user) return;
    setToast({ message: "Gerando link de pagamento Mercado Pago...", type: 'success' });
    try {
        const link = await handleCreditPurchase(amount, price, user);
        window.open(link, '_blank');
        setShowPlansModal(false);
    } catch (e: any) {
        setToast({ message: e.message, type: 'error' });
    }
  };

  if (!user) {
    return null; 
  }

  return (
    <div className="min-h-screen bg-black text-gray-300">
      <Header 
        userEmail={user.email} 
        onLogout={handleLogout} 
        isAdmin={user.role === 'admin' || user.role === 'super_admin'}
        onNavigateToAdmin={onNavigateToAdmin}
        onOpenPlans={() => setShowPlansModal(true)}
        onOpenManual={() => setShowManualModal(true)} // Passando a função
        userCredits={userCredits}
        userRole={user.role}
        metadata={metadata} // Pass metadata
      />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          
          {user && (
             <div className="mb-8 text-center text-xs text-gray-500 animate-fade-in-up">
                <span className="bg-gray-900 px-4 py-2 rounded-full border border-gray-800 shadow-md">
                    Seu Plano: <span className={`font-bold uppercase text-${currentPlan.color}-400`}>{currentPlan.name}</span>
                    {' | '}
                    Saldo: <span className="font-bold text-white">{userCredits === -1 ? '∞' : userCredits}</span> créditos
                </span>
             </div>
          )}

          {/* SERVICE GRID: Grade Visual de Seleção */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
             {CREATOR_SUITE_MODES.map((svc) => {
                 const isSelected = currentMode === svc.value;
                 const isLocked = !hasAccessToService(svc.value);
                 const icon = SERVICE_ICONS[svc.value] || 'fa-star';
                 const colorClass = SERVICE_COLORS[svc.value] || 'text-gray-400 border-gray-600 hover:bg-gray-800';
                 
                 return (
                     <button
                        key={svc.value}
                        onClick={() => setCurrentMode(svc.value)}
                        disabled={isLoading}
                        className={`relative p-4 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center text-center gap-3 h-32 group
                            ${isSelected 
                                ? `bg-gray-900 border-2 shadow-lg shadow-green-900/20 scale-105 z-10 ${colorClass.split(' ')[0]} border-${colorClass.split(' ')[0].replace('text-', '')}` 
                                : `bg-black/50 ${isLocked ? 'opacity-50 grayscale cursor-not-allowed border-gray-800' : `${colorClass}`}`
                            }
                        `}
                     >
                        <i className={`fas ${icon} text-3xl mb-1 transition-transform group-hover:scale-110`}></i>
                        <span className="text-xs font-bold uppercase tracking-wider leading-tight">{svc.label}</span>
                        
                        {isLocked && (
                            <div className="absolute top-2 right-2 text-gray-500">
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
                onModeChange={setCurrentMode}
                onGenerate={handleGenerateContent} 
                isLoading={isLoading} 
              />
          </div>
          
          {error && (
            <div className="mt-8 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-center animate-fade-in" role="alert">
              <strong className="font-bold block mb-2"><i className="fas fa-exclamation-circle mr-2"></i>Atenção</strong>
              <span className="block whitespace-pre-wrap text-left mx-auto max-w-lg text-sm font-mono">{error}</span>
              {(error.includes('Acesso Negado') || error.includes('saldo acabou')) && (
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
                {/* RENDERIZAÇÃO CONDICIONAL BASEADA NO TIPO DE CONTEÚDO */}
                
                {/* 1. Editores Visuais (Landing Page e Social Media) */}
                {(currentMode === 'landingpage_generator' || currentMode === 'canva_structure') && resultText && (
                   <LandingPageBuilder initialHtml={resultText} />
                )}

                {/* 2. Studio de Arte (Imagem) */}
                {currentMode === 'image_generation' && generatedImagePrompt && (
                   <ImageStudio 
                      prompt={resultText || ''} 
                      originalPrompt={generatedImagePrompt} 
                      width={imageDimensions.width} 
                      height={imageDimensions.height} 
                   />
                )}

                {/* 3. Display de Texto Padrão (News, Copy, etc) */}
                {currentMode !== 'landingpage_generator' && currentMode !== 'image_generation' && currentMode !== 'canva_structure' && resultText && (
                   <ResultDisplay text={resultText} mode={currentMode} />
                )}

                {/* Player de Áudio (Se houver) */}
                {audioBase64 && <AudioPlayer audioBase64={audioBase64} />}
                
                {/* Widget de Feedback */}
                {(resultText || generatedImagePrompt) && showFeedback && (
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
      
      {showPlansModal && (
        <PlansModal 
            currentPlanId={currentPlan.id} 
            onClose={() => setShowPlansModal(false)} // Fix: was setShowPlansModal(true)
            onSelectPlan={handlePlanSelection}
            onBuyCredits={handleBuyCredits}
        />
      )}

      {showManualModal && (
        <ManualModal 
            onClose={() => setShowManualModal(false)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <footer className="text-center p-8 text-gray-600 text-xs border-t border-gray-900 mt-12">
        <p>Desenvolvido com IA | GDN_IA &copy; 2024 | Versão {metadata.version}</p>
      </footer>
    </div>
  );
}

export default DashboardPage;
