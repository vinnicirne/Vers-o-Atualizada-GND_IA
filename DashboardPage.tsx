import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ContentGenerator } from './components/ContentGenerator';
import { ResultDisplay } from './components/ResultDisplay';
import { Loader } from './components/Loader';
import { FeedbackWidget } from './components/FeedbackWidget';
import { AudioPlayer } from './components/AudioPlayer';
import { LandingPageBuilder } from './components/LandingPageBuilder'; 
import { PlansModal } from './components/PlansModal';
import { Toast } from './components/admin/Toast';
import { generateCreativeContent } from './services/geminiService';
import { supabase } from './services/supabaseClient';
// Correctly import UserPlan from plan.types.ts
import { ServiceKey, UserPlan } from './types/plan.types';
import { PLANS } from './constants';
import { useUser } from './contexts/UserContext';
import { usePlan } from './hooks/usePlan'; // Importar o novo hook

interface DashboardPageProps {
  onNavigateToAdmin: () => void;
}

function DashboardPage({ onNavigateToAdmin }: DashboardPageProps) {
  const { user, signOut, refresh } = useUser();
  const { currentPlan, userCredits, hasAccessToService, getCreditsCostForService, canUseService } = usePlan();

  const [resultText, setResultText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ version: string } | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<ServiceKey>('news_generator'); // Usar ServiceKey
  
  // UI States
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/metadata.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => setMetadata(data))
      .catch(err => console.error("Failed to load metadata:", err));
  }, []);

  const handleGenerateContent = useCallback(async (
    prompt: string, 
    mode: ServiceKey, // Usar ServiceKey
    generateAudio: boolean,
    options?: { theme?: string; primaryColor?: string }
  ) => {
    if (!prompt.trim()) {
      setError('Por favor, insira uma descrição para o conteúdo a ser gerado.');
      return;
    }

    if (!user) {
      setError('Sessão inválida. Por favor, faça login novamente.');
      return;
    }
    
    // 1. VERIFICAÇÃO DE PERMISSÃO DE MODO (HIERARQUIA) E CRÉDITOS combinada
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
    setCurrentMode(mode); 

    try {
      const { text, audioBase64: audioResult } = await generateCreativeContent(
        prompt, 
        mode, 
        user.id, 
        // A geração de áudio agora depende diretamente do serviço 'text_to_speech' estar ativo no plano
        hasAccessToService('text_to_speech') && generateAudio,
        options
      );
      
      // Atualiza créditos localmente para exibição imediata
      let updatedCredits = userCredits;
      if (userCredits !== -1) {
          updatedCredits = userCredits - cost;
          const { error: creditError } = await supabase
              .from('user_credits')
              .update({ credits: updatedCredits })
              .eq('user_id', user.id);
          
          if (creditError) {
              console.error('Erro do Supabase ao atualizar créditos:', creditError);
          } else {
              await refresh(); // Força a atualização do UserContext para refletir os novos créditos
          }
      }

      // Processamento do Footer
      let processedText = text;
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';
      const creditsDisplay = userCredits === -1 ? 'Ilimitado' : `${updatedCredits}`;
      const footerInfo = `\n\n---\nCréditos restantes: ${creditsDisplay} | Plano: ${currentPlan.name}`;

      // Adiciona marca d'água se não for Premium (ou Admin)
      if (currentPlan.id !== 'premium' && !isAdmin) {
          if (mode === 'landingpage_generator') {
              const watermark = `<div style="text-align:center; font-size:10px; color:#888; padding:20px; background:#f9f9f9; border-top:1px solid #eee;">Gerado por GDN_IA</div>`;
              if (processedText.includes('</body>')) {
                  processedText = processedText.replace('</body>', `${watermark}</body>`);
              } else {
                  processedText += watermark;
              }
          } else {
              processedText += "\n\nGerado por GDN_IA";
          }
      }

      if (mode !== 'landingpage_generator') {
          processedText += footerInfo;
      }
      
      setResultText(processedText);
      setAudioBase64(audioResult);
      
      const { error: logError } = await supabase.from('logs').insert([{
           usuario_id: user.id,
           acao: `generated_content_${mode}`,
           modulo: 'CreatorSuite',
           detalhes: { cost: cost, credits_after: updatedCredits, plan: currentPlan.id }
      }]);

      if (logError) console.error('Erro do Supabase ao salvar log:', logError);

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
        userCredits={userCredits}
        userRole={user.role}
      />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-lg text-gray-400 mb-8">
            Selecione um modo, descreva o que você precisa e deixe a IA fazer o resto.
          </p>
          
          {user && (
             <div className="mb-4 text-center text-xs text-gray-500">
                <span className="bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
                    Seu Plano: <span className={`font-bold uppercase text-${currentPlan.color}-400`}>{currentPlan.name}</span>
                    {' | '}
                    Saldo: <span className="font-bold text-white">{userCredits === -1 ? '∞' : userCredits}</span> créditos
                </span>
             </div>
          )}

          <ContentGenerator onGenerate={handleGenerateContent} isLoading={isLoading} />
          
          {error && (
            <div className="mt-8 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-center" role="alert">
              <strong className="font-bold block mb-2">Atenção: </strong>
              <span className="block whitespace-pre-wrap text-left mx-auto max-w-lg text-sm font-mono">{error}</span>
              {/* Botão de ação rápida se o erro for de plano/crédito */}
              {(error.includes('Acesso Negado') || error.includes('saldo acabou')) && (
                  <button 
                    onClick={() => setShowPlansModal(true)}
                    className="mt-3 bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-4 rounded text-sm transition"
                  >
                    Resolver Agora
                  </button>
              )}
            </div>
          )}

          <div className="mt-8 space-y-8">
            {isLoading && <Loader />}
            
            {resultText && !isLoading && (
              <>
                {currentMode === 'landingpage_generator' ? (
                   <LandingPageBuilder initialHtml={resultText} />
                ) : (
                   <ResultDisplay text={resultText} mode={currentMode} />
                )}

                {audioBase64 && <AudioPlayer audioBase64={audioBase64} />}
                
                {showFeedback && (
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
            currentPlanId={currentPlan.id} // Passa o ID do plano atual
            onClose={() => setShowPlansModal(false)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <footer className="text-center p-4 text-gray-500 text-sm">
        <p>Desenvolvido com IA | GDN_IA &copy; 2024 | Versão {metadata?.version || '1.0.4'}</p>
      </footer>
    </div>
  );
}

export default DashboardPage;