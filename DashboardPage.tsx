
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ContentGenerator } from './components/ContentGenerator';
import { ResultDisplay } from './components/ResultDisplay';
import { Loader } from './components/Loader';
import { FeedbackWidget } from './components/FeedbackWidget';
import { AudioPlayer } from './components/AudioPlayer';
import { generateCreativeContent } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { CreatorSuiteMode } from './types';
import { useUser } from './contexts/UserContext';

interface DashboardPageProps {
  onNavigateToAdmin: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateToAdmin }) => {
  const { user, signOut, refresh } = useUser();
  const [resultText, setResultText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ version: string } | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<CreatorSuiteMode>('news'); // Track the last used mode

  useEffect(() => {
    fetch('./metadata.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => setMetadata(data))
      .catch(err => console.error("Failed to load metadata:", err));
  }, []);

  const handleGenerateContent = useCallback(async (prompt: string, mode: CreatorSuiteMode, generateAudio: boolean) => {
    if (!prompt.trim()) {
      setError('Por favor, insira uma descrição para o conteúdo a ser gerado.');
      return;
    }

    if (!user) {
      setError('Sessão inválida. Por favor, faça login novamente.');
      return;
    }
    
    if (user.credits !== -1 && user.credits < 1) {
        setError('Créditos insuficientes. Contate um administrador.');
        return;
    }

    setIsLoading(true);
    setError(null);
    setResultText(null);
    setShowFeedback(false);
    setAudioBase64(null);
    setCurrentMode(mode); // Set the current mode

    try {
      const { text, audioBase64: audioResult } = await generateCreativeContent(prompt, mode, user.id, generateAudio);
      
      setResultText(text);
      setAudioBase64(audioResult);
      
      if (user) {
        if (user.credits !== -1) {
            const newCredits = user.credits - 1;
            const { error: creditError } = await supabase
                .from('user_credits')
                .update({ credits: newCredits })
                .eq('user_id', user.id);
            
            if (creditError) {
                console.error('Erro do Supabase ao atualizar créditos:', creditError);
            } else {
                await refresh();
            }
        }
        
        // Salva log de qualquer geração
        const { error: logError } = await supabase.from('logs').insert([{
           usuario_id: user.id,
           acao: `generated_content_${mode}`,
           modulo: 'CreatorSuite',
        }]);

        if (logError) {
            console.error('Erro do Supabase ao salvar log:', logError);
        }

        setShowFeedback(true);
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
  }, [user, refresh]);
  
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
        userCredits={user.credits}
        userRole={user.role}
      />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-lg text-gray-400 mb-8">
            Selecione um modo, descreva o que você precisa e deixe a IA fazer o resto.
          </p>
          <ContentGenerator onGenerate={handleGenerateContent} isLoading={isLoading} />
          
          {error && (
            <div className="mt-8 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-center" role="alert">
              <strong className="font-bold">Erro: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="mt-8 space-y-8">
            {isLoading && <Loader />}
            {resultText && !isLoading && (
              <>
                <ResultDisplay text={resultText} mode={currentMode} />
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
      <footer className="text-center p-4 text-gray-500 text-sm">
        <p>Desenvolvido com IA | GDN_IA &copy; 2024 | Versão {metadata?.version || '1.0.3'}</p>
      </footer>
    </div>
  );
};

export default DashboardPage;
