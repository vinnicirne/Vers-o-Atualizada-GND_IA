

import React, { useState, useEffect } from 'react';
import { ServiceKey } from '../../types/plan.types';
import { ResultDisplay } from '../ResultDisplay';
import { AudioPlayer } from '../AudioPlayer';
import { LandingPageBuilder } from '../LandingPageBuilder';
import { SeoScorecard } from '../SEO/SeoScorecard';
import { FeedbackWidget } from '../FeedbackWidget';
import { Loader } from '../Loader';
import { User } from '../../types';

interface DashboardResultsProps {
    currentMode: ServiceKey;
    results: {
        text: string | null;
        title: string | null;
        audioBase64: string | null;
        imagePrompt: string | null;
        imageDimensions: { width: number; height: number };
        metadata: { plan: string; credits: string | number } | null;
    };
    isLoading: boolean;
    user: User | null;
    onCloseEditor: () => void;
    showFeedback: boolean;
    onCloseFeedback: () => void;
    currentError: string | null; // Adicionado para receber o erro principal
}

export function DashboardResults({ 
    currentMode, 
    results, 
    isLoading, 
    user, 
    onCloseEditor,
    showFeedback,
    onCloseFeedback,
    currentError // Recebe o erro principal
}: DashboardResultsProps) {
    const TTS_FAILED_PREFIX = '[TTS_FAILED_TEXT_FALLBACK]';
    const AUDIO_ERROR_FALLBACK_PREFIX = '[AUDIO_ERROR_FALLBACK]';

    // Checa se o erro é de chave Gemini faltando na Edge Function
    const isGeminiKeyMissing = currentError?.includes('GEMINI_KEY_MISSING_EDGE_FUNCTION');

    // Checa se houve um erro na geração de áudio (seja via currentError ou pela tag de fallback no texto)
    const isAudioGenerationFailed = 
        currentError?.includes('AUDIO_GENERATION_FAILED') || 
        results.text?.includes(AUDIO_ERROR_FALLBACK_PREFIX) ||
        results.text?.includes(TTS_FAILED_PREFIX);

    let audioErrorMessage = "O áudio não pôde ser gerado.";
    if (isGeminiKeyMissing) {
        audioErrorMessage = "Erro de Configuração: Chave GEMINI_API_KEY faltando na Edge Function do Supabase.";
    } else if (isAudioGenerationFailed && currentError) {
        // Se houver um erro específico no currentError, usa-o
        audioErrorMessage = `Falha ao gerar áudio: ${currentError
            .replace('AUDIO_GENERATION_FAILED: ', '')
            .replace('AUDIO_GENERATION_FAILED_NEWS: ', '')}`;
    } else if (isAudioGenerationFailed) {
        // Mensagem genérica se o erro não veio no currentError, mas a tag de fallback está presente
        audioErrorMessage = "O sistema não conseguiu gerar o áudio. O texto foi retornado como fallback.";
    } else {
        audioErrorMessage = "O sistema retornou texto como fallback. Tente novamente ou verifique os créditos.";
    }


    if (isLoading) {
        return <Loader mode={currentMode} />;
    }

    if (!results.text && !results.imagePrompt && !results.audioBase64) {
        return null;
    }

    // --- LOGIC: Image Generation & Social Media Poster now use LandingPageBuilder ---
    if ((currentMode === 'image_generation' || currentMode === 'social_media_poster') && results.imagePrompt) {
        // Construct Image URL dynamically
        const prompt = results.text || results.imagePrompt || '';
        const encodedPrompt = encodeURIComponent(prompt);
        const width = results.imageDimensions.width || 1024;
        const height = results.imageDimensions.height || 1024;
        
        // Generating Pollinations URL
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true`;

        // Create HTML wrapper for the builder
        const initialHtml = `
            <div class="flex items-center justify-center min-h-screen bg-gray-900 p-8">
                <div class="relative group">
                    <img src="${imageUrl}" alt="AI Art" class="shadow-2xl rounded-lg max-w-full h-auto" />
                    <div class="absolute inset-0 border-2 border-transparent hover:border-green-500 pointer-events-none transition-colors rounded-lg"></div>
                </div>
            </div>
        `;

        return (
            <div className="mt-8 space-y-8 pb-12">
                <LandingPageBuilder 
                    initialHtml={initialHtml} 
                    onClose={onCloseEditor}
                />
            </div>
        );
    }

    // Determine if an audio-related warning should be shown
    const shouldShowAudioWarning = isAudioGenerationFailed || isGeminiKeyMissing;

    // Clean text by removing fallback prefixes
    const cleanedText = results.text
        ? results.text
            .replace(AUDIO_ERROR_FALLBACK_PREFIX, '')
            .replace(TTS_FAILED_PREFIX, '')
            .trim()
        : null;

    return (
        <div className="mt-8 space-y-8 pb-12">
            
            {/* CRIADOR DE SITES (WEB) & EDITOR VISUAL & CRIADOR DE CURRÍCULOS */}
            {(currentMode === 'landingpage_generator' || currentMode === 'canva_structure' || currentMode === 'curriculum_generator') && results.text && (
                <LandingPageBuilder 
                    initialHtml={results.text} 
                    onClose={onCloseEditor}
                />
            )}

            {/* ALERTAS DE FALHA DE ÁUDIO (Exibido antes do conteúdo principal) */}
            {shouldShowAudioWarning && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r shadow-sm animate-fade-in">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <i className="fas fa-exclamation-triangle text-yellow-400"></i>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700 font-bold">
                                Aviso: {audioErrorMessage.split(':')[0]}
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">
                                {audioErrorMessage.split(':')[1] || audioErrorMessage}
                            </p>
                            {isGeminiKeyMissing && (
                                <p className="text-xs text-blue-700 mt-2">
                                    <i className="fas fa-info-circle mr-1"></i> Por favor, configure a variável de ambiente `GEMINI_API_KEY` nas configurações da sua Edge Function no Supabase.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* RESULT DISPLAY (TEXTO) & SEO WIDGET */}
            {/* Renderiza ResultDisplay se houver texto limpo E NÃO for um modo que usa LandingPageBuilder */}
            {cleanedText && 
             currentMode !== 'landingpage_generator' && 
             currentMode !== 'image_generation' && 
             currentMode !== 'social_media_poster' &&
             currentMode !== 'canva_structure' && 
             currentMode !== 'curriculum_generator' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                    <div className="lg:col-span-2">
                        <ResultDisplay 
                            title={results.title} 
                            text={cleanedText}
                            mode={currentMode} 
                            metadata={results.metadata || undefined}
                        />
                    </div>
                    
                    {/* SEO Scorecard - Útil para notícias e copy */}
                    {(currentMode === 'news_generator' || currentMode === 'copy_generator') && (
                        <div className="lg:col-span-1">
                            <SeoScorecard 
                                title={results.title || "Sem Título"} 
                                content={cleanedText} 
                            />
                        </div>
                    )}
                </div>
            )}

            {/* AUDIO PLAYER */}
            {results.audioBase64 && <AudioPlayer audioBase64={results.audioBase64} />}
            
            {/* FEEDBACK WIDGET */}
            {(results.text || results.imagePrompt || results.audioBase64) && showFeedback && user && (
                <FeedbackWidget 
                    userId={user.id} 
                    onClose={onCloseFeedback} 
                />
            )}
        </div>
    );
}