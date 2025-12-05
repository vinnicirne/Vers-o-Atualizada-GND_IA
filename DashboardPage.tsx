// ... imports

// ... extractTitleAndContent function ...

function DashboardPage({ onNavigateToAdmin, onNavigateToLogin, onNavigate }: DashboardPageProps) {
  // ... state declarations ...

  // ... useEffects ...

  // ... handleGenerateContent ... (no major changes needed inside handleGenerateContent unless logic changes)

  // ... inside render/return JSX ...

                <div className="mt-8 space-y-8 pb-12">
                    {isLoading && <Loader mode={currentMode} />}
                    
                    {!isLoading && (
                    <>
                        {(currentMode === 'landingpage_generator' || currentMode === 'institutional_website_generator' || currentMode === 'canva_structure') && resultText && (
                        <LandingPageBuilder 
                                initialHtml={resultText} 
                                onClose={() => setResultText(null)}
                        />
                        )}

                        {/* RENDERIZAÇÃO DE IMAGENS E POSTERS */}
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

                        {/* RESULT DISPLAY & SEO WIDGET */}
                        {currentMode !== 'landingpage_generator' && 
                         currentMode !== 'institutional_website_generator' && 
                         currentMode !== 'image_generation' && 
                         currentMode !== 'canva_structure' && 
                         // Logic change: Hide result display for TTS ONLY IF audio is present (success). 
                         // If TTS failed (no audio) but has text, show it so user sees the error/fallback.
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
                            
                            {/* SEO Scorecard não faz sentido para copy curto de post ou TTS, mas ok para noticias e artigos */}
                            {currentMode === 'news_generator' && (
                                <div className="lg:col-span-1">
                                    <SeoScorecard 
                                            title={resultTitle || "Sem Título"} 
                                            content={resultText} 
                                    />
                                </div>
                            )}
                        </div>
                        )}

                        {/* AUDIO PLAYER (Seja TTS direto ou Áudio de Notícia) */}
                        {audioBase64 && <AudioPlayer audioBase64={audioBase64} />}
                        
                        {(resultText || generatedImagePrompt || audioBase64) && showFeedback && user && (
                        <FeedbackWidget 
                            userId={user.id} 
                            onClose={() => setShowFeedback(false)} 
                        />
                        )}
                    </>
                    )}
                </div>

                {/* ... GUEST MARKETING SECTIONS ... */}
// ...