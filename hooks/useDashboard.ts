
import { useState, useEffect } from 'react';
import { ServiceKey } from '../types/plan.types';
import { useUser } from '../contexts/UserContext';
import { usePlan } from './usePlan';
import { generateCreativeContent } from '../services/geminiService';
import { geminiTTSService } from '../services/ttsService';

// Helper para extrair título e conteúdo
const extractTitleAndContent = (text: string): { title: string | null, content: string } => {
  if (!text) return { title: null, content: '' };
  
  const lines = text.split('\n');
  let title = null;
  let content = text;

  if (lines.length > 0) {
      const firstLine = lines[0].trim();
      const cleanLine = firstLine.replace(/^(\*\*|#|Título:|Subject:|Headline:)\s*/i, '').replace(/\*\*$/, '');
      
      if (cleanLine.length > 5 && cleanLine.length < 100 && !cleanLine.includes('<')) {
          title = cleanLine;
          content = lines.slice(1).join('\n').trim();
      }
  }

  return { title, content };
};

export function useDashboard() {
    const { user, refresh } = useUser();
    const { currentPlan, hasAccessToService, hasEnoughCredits, getCreditsCostForService } = usePlan();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentMode, setCurrentMode] = useState<ServiceKey | 'crm'>('news_generator');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [results, setResults] = useState<{
        text: string | null;
        title: string | null;
        audioBase64: string | null;
        imagePrompt: string | null;
        imageDimensions: { width: number; height: number };
        metadata: { plan: string; credits: string | number } | null;
    }>({
        text: null,
        title: null,
        audioBase64: null,
        imagePrompt: null,
        imageDimensions: { width: 1024, height: 1024 },
        metadata: null
    });
    const [showFeedback, setShowFeedback] = useState(false);

    const [modals, setModals] = useState({
        plans: false,
        history: false,
        manual: false,
        affiliate: false,
        integrations: false,
        guestLimit: false,
        featureLock: false
    });

    const [isGuest, setIsGuest] = useState(false);
    const [guestCredits, setGuestCredits] = useState(0);
    const GUEST_ALLOWED_MODES: ServiceKey[] = ['news_generator', 'copy_generator', 'prompt_generator', 'text_to_speech'];

    useEffect(() => {
        if (!user) {
            setIsGuest(true);
            const localCredits = localStorage.getItem('gdn_guest_credits');
            setGuestCredits(localCredits ? parseInt(localCredits) : 3);
        } else {
            setIsGuest(false);
        }
    }, [user]);

    const toggleModal = (modal: keyof typeof modals, value: boolean) => {
        setModals(prev => ({ ...prev, [modal]: value }));
    };

    const handleModeChange = (mode: ServiceKey | 'crm') => {
        if (mode === 'crm') {
            setCurrentMode(mode);
            setSidebarOpen(false);
            return;
        }

        if (!hasAccessToService(mode)) {
            if (isGuest) {
                toggleModal('featureLock', true);
            } else {
                toggleModal('plans', true);
            }
            return;
        }
        
        setCurrentMode(mode);
        setResults(prev => ({
            ...prev,
            text: null,
            title: null,
            audioBase64: null,
            imagePrompt: null
        }));
        setShowFeedback(false);
        setError(null);
        setSidebarOpen(false);
    };

    const updateResultText = (text: string | null) => {
        setResults(prev => ({ ...prev, text }));
    };

    const handleGenerateContent = async (
        prompt: string, 
        mode: ServiceKey, 
        generateAudio: boolean, 
        options?: any
    ) => {
        setError(null);
        setResults(prev => ({ ...prev, text: null, title: null, audioBase64: null, imagePrompt: null }));
        setShowFeedback(false);

        const cost = getCreditsCostForService(mode) + (generateAudio ? getCreditsCostForService('text_to_speech') : 0);
        
        if (isGuest) {
            if (guestCredits < cost) {
                toggleModal('guestLimit', true);
                return;
            }
        } else {
            if (!hasEnoughCredits(mode)) { 
                setToast({ message: "Saldo insuficiente.", type: 'error' });
                toggleModal('plans', true);
                return;
            }
        }

        setIsLoading(true);

        try {
            let apiResultText = '';
            let audioBase64 = null;
            let sources = [];

            // Se for modo TTS puro, usamos o serviço especializado
            if (mode === 'text_to_speech') {
                audioBase64 = await geminiTTSService.generateSingleSpeaker(prompt, options?.voice || 'Kore', options?.tone);
                apiResultText = "Áudio gerado com sucesso.";
            } else {
                // Outros modos continuam usando o gerador de conteúdo criativo
                const result = await generateCreativeContent(prompt, mode, user?.id, generateAudio, options);
                apiResultText = result.text;
                audioBase64 = result.audioBase64;
                sources = result.sources || [];
            }
            
            let newText = null;
            let newTitle = null;
            let newImagePrompt = null;

            if (mode === 'image_generation' || mode === 'social_media_poster') {
                newText = apiResultText;
                newImagePrompt = apiResultText;
            } else if (mode !== 'text_to_speech') {
                const extracted = extractTitleAndContent(apiResultText);
                newTitle = extracted.title;
                newText = extracted.content;
            } else {
                newText = apiResultText;
            }

            setResults(prev => ({
                ...prev,
                text: newText,
                title: newTitle,
                audioBase64,
                imagePrompt: newImagePrompt,
                metadata: isGuest 
                    ? { plan: 'Visitante', credits: guestCredits - cost } 
                    : { plan: currentPlan.name, credits: user?.credits === -1 ? 'Ilimitado' : (user?.credits || 0) - cost }
            }));

            if (isGuest) {
                const newCredits = guestCredits - cost;
                setGuestCredits(newCredits);
                localStorage.setItem('gdn_guest_credits', newCredits.toString());
            } else {
                await refresh();
            }

            setShowFeedback(true);

        } catch (err: any) {
            console.error("Erro na geração:", err);
            setError(err.message || 'Erro ao gerar conteúdo.');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        user,
        isGuest,
        guestCredits,
        GUEST_ALLOWED_MODES,
        sidebarOpen,
        setSidebarOpen,
        currentMode,
        isLoading,
        error,
        toast,
        setToast,
        results,
        updateResultText,
        showFeedback,
        setShowFeedback,
        modals,
        toggleModal,
        handleModeChange,
        handleGenerateContent,
        hasAccessToService
    };
}
