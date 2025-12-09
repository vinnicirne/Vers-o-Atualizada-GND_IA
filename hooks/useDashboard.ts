
import { useState, useEffect } from 'react';
import { ServiceKey } from '../types/plan.types';
import { useUser } from '../contexts/UserContext';
import { usePlan } from './usePlan';
import { generateCreativeContent } from '../services/geminiService';

// Helper para extrair título e conteúdo
const extractTitleAndContent = (text: string): { title: string | null, content: string } => {
  if (!text) return { title: null, content: '' };
  
  const lines = text.split('\n');
  let title = null;
  let content = text;

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

export function useDashboard() {
    const { user, refresh } = useUser();
    const { currentPlan, hasAccessToService, hasEnoughCredits, getCreditsCostForService } = usePlan();

    // UI Control
    const [sidebarOpen, setSidebarOpen] = useState(false);
    // Allow 'crm_suite' as a valid mode for the dashboard state
    const [currentMode, setCurrentMode] = useState<ServiceKey | 'crm_suite'>('news_generator');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Results State
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

    // Modals State
    const [modals, setModals] = useState({
        plans: false,
        history: false,
        manual: false,
        affiliate: false,
        integrations: false,
        guestLimit: false,
        featureLock: false
    });

    // Guest Logic
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

    // Check URL params for direct mode access (e.g. ?mode=crm_suite)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const modeParam = params.get('mode');
        if (modeParam === 'crm' || modeParam === 'crm_suite') {
            setCurrentMode('crm_suite');
        } else if (modeParam && hasAccessToService(modeParam as ServiceKey)) {
            setCurrentMode(modeParam as ServiceKey);
        }
    }, [hasAccessToService]);

    const toggleModal = (modal: keyof typeof modals, value: boolean) => {
        setModals(prev => ({ ...prev, [modal]: value }));
    };

    const handleModeChange = (mode: ServiceKey | 'crm_suite') => {
        // Special handling for CRM
        if (mode === 'crm_suite') {
            setCurrentMode(mode);
            setSidebarOpen(false);
            // Update URL for bookmarking without reloading
            const url = new URL(window.location.href);
            url.searchParams.set('mode', 'crm_suite');
            window.history.pushState({}, '', url);
            return;
        }

        // hasAccessToService já encapsula a lógica de permissão do plano E a ativação global da ferramenta.
        if (!hasAccessToService(mode)) {
            if (isGuest) {
                toggleModal('featureLock', true);
            } else {
                toggleModal('plans', true);
            }
            return;
        }
        
        setCurrentMode(mode);
        
        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('mode', mode);
        window.history.pushState({}, '', url);

        // Clear results
        setResults(prev => ({
            ...prev,
            text: null,
            title: null,
            audioBase64: null,
            imagePrompt: null
        }));
        setShowFeedback(false);
        setError(null);
        setSidebarOpen(false); // Fecha sidebar no mobile
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

        // Validation
        const cost = getCreditsCostForService(mode) + (generateAudio ? getCreditsCostForService('text_to_speech') : 0);
        
        if (isGuest) {
            if (guestCredits < cost) {
                toggleModal('guestLimit', true);
                return;
            }
        } else {
            if (!hasEnoughCredits(mode)) { // hasEnoughCredits agora também verifica o custo correto
                setToast({ message: "Saldo insuficiente.", type: 'error' });
                toggleModal('plans', true);
                return;
            }
        }

        setIsLoading(true);

        try {
            // Image specific config
            let imgDims = { width: 1024, height: 1024 };
            if (mode === 'image_generation' && options?.aspectRatio) {
                const [wRatio, hRatio] = options.aspectRatio.split(':').map(Number);
                const base = 1024;
                let w = base, h = base;
                if (wRatio > hRatio) { h = Math.round(base * (hRatio / wRatio)); }
                else if (hRatio > wRatio) { w = Math.round(base * (wRatio / hRatio)); }
                imgDims = { width: w, height: h };
            }

            const apiResult = await generateCreativeContent(prompt, mode, user?.id, generateAudio, options);
            
            let newText = null;
            let newTitle = null;
            let newImagePrompt = null;

            if (mode === 'image_generation' || mode === 'social_media_poster') {
                newText = apiResult.text;
                newImagePrompt = apiResult.text;
            } else {
                const extracted = extractTitleAndContent(apiResult.text);
                newTitle = extracted.title;
                newText = extracted.content;
            }

            // Update State
            setResults({
                text: newText,
                title: newTitle,
                audioBase64: apiResult.audioBase64 || null,
                imagePrompt: newImagePrompt,
                imageDimensions: imgDims,
                metadata: isGuest 
                    ? { plan: 'Visitante', credits: guestCredits - cost } // Deduz o custo total para guest
                    : { plan: currentPlan.name, credits: user?.credits === -1 ? 'Ilimitado' : (user?.credits || 0) - cost }
            });

            // Consume Credits
            if (isGuest) {
                const newCredits = guestCredits - cost; // Deduz o custo total para guest
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
        updateResultText, // Exposed setter for text clearing
        showFeedback,
        setShowFeedback,
        modals,
        toggleModal,
        handleModeChange,
        handleGenerateContent,
        hasAccessToService
    };
}
