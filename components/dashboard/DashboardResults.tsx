
import React from 'react';
import { ServiceKey } from '../../types/plan.types';
import { ResultDisplay } from '../ResultDisplay';
import { AudioPlayer } from '../AudioPlayer';
import { LandingPageBuilder } from '../LandingPageBuilder';
import { ImageStudio } from '../ImageStudio';
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
}

export function DashboardResults({ 
    currentMode, 
    results, 
    isLoading, 
    user, 
    onCloseEditor,
    showFeedback,
    onCloseFeedback
}: DashboardResultsProps) {

    if (isLoading) {
        return <Loader mode={currentMode} />;
    }

    if (!results.text && !results.imagePrompt && !results.audioBase64) {
        return null;
    }

    return (
        <div className="mt-8 space-y-8 pb-12">
            
            {/* LANDING PAGE & SITE EDITOR */}
            {(currentMode === 'landingpage_generator' || currentMode === 'institutional_website_generator' || currentMode === 'canva_structure') && results.text && (
                <LandingPageBuilder 
                    initialHtml={results.text} 
                    onClose={onCloseEditor}
                />
            )}

            {/* IMAGE STUDIO */}
            {(currentMode === 'image_generation' || currentMode === 'social_media_poster') && results.imagePrompt && (
                <ImageStudio 
                    prompt={results.text || ''} 
                    originalPrompt={results.imagePrompt} 
                    width={results.imageDimensions.width} 
                    height={results.imageDimensions.height} 
                />
            )}

            {/* DIAGNOSTIC ALERT FOR TTS FAILURE */}
            {currentMode === 'text_to_speech' && results.text && !results.audioBase64 && (
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
            {currentMode !== 'landingpage_generator' && 
             currentMode !== 'institutional_website_generator' && 
             currentMode !== 'image_generation' && 
             currentMode !== 'canva_structure' && 
             // CORREÇÃO: Esconde o texto SE o modo for TTS, independente de sucesso ou falha, 
             // para evitar que a mensagem "Áudio gerado com sucesso" apareça como resultado.
             currentMode !== 'text_to_speech' &&
             results.text && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                    <div className="lg:col-span-2">
                        <ResultDisplay 
                            title={results.title} 
                            text={results.text} 
                            mode={currentMode} 
                            metadata={results.metadata || undefined}
                        />
                    </div>
                    
                    {/* SEO Scorecard - Útil para notícias e copy */}
                    {(currentMode === 'news_generator' || currentMode === 'copy_generator') && (
                        <div className="lg:col-span-1">
                            <SeoScorecard 
                                title={results.title || "Sem Título"} 
                                content={results.text} 
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