import React from 'react';
import { ServiceKey } from '../../types/plan.types';
import { ResultDisplay } from '../ResultDisplay';
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

    if (!results.text && !results.imagePrompt) {
        return null;
    }

    if ((currentMode === 'image_generation' || currentMode === 'social_media_poster') && results.imagePrompt) {
        const prompt = results.text || results.imagePrompt || '';
        const encodedPrompt = encodeURIComponent(prompt);
        const width = results.imageDimensions.width || 1024;
        const height = results.imageDimensions.height || 1024;
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true`;

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

    return (
        <div className="mt-8 space-y-8 pb-12">
            
            {(currentMode === 'landingpage_generator' || currentMode === 'canva_structure' || currentMode === 'curriculum_generator') && results.text && (
                <LandingPageBuilder 
                    initialHtml={results.text} 
                    onClose={onCloseEditor}
                />
            )}

            {currentMode !== 'landingpage_generator' && 
             currentMode !== 'image_generation' && 
             currentMode !== 'social_media_poster' &&
             currentMode !== 'canva_structure' && 
             currentMode !== 'curriculum_generator' &&
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
            
            {(results.text || results.imagePrompt) && showFeedback && user && (
                <FeedbackWidget 
                    userId={user.id} 
                    onClose={onCloseFeedback} 
                />
            )}
        </div>
    );
}