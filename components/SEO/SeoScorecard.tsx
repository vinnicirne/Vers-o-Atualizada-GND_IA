

import React, { useState, useEffect } from 'react';
import { analyzeSEO, suggestFocusKeyword, generateOptimizedTags, SEOAnalysisResult, OptimizedMeta } from '../../services/seoService';

interface SeoScorecardProps {
    title: string;
    content: string;
    backendMetadata?: any;
}

export function SeoScorecard({ title, content, backendMetadata }: SeoScorecardProps) {
    // Dados de entrada e estado
    const [keyword, setKeyword] = useState('');
    const [analysis, setAnalysis] = useState<SEOAnalysisResult | null>(null);
    const [optimizedData, setOptimizedData] = useState<OptimizedMeta | null>(null);

    // Feedback visual
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // AUTOMATION EFFECT
    useEffect(() => {
        if (title && content) {
            if (backendMetadata) {
                // Priority: Use Backend "Ultra Power" Metadata
                const focusKw = backendMetadata.focus_keyword || suggestFocusKeyword(title, content);

                const meta = {
                    title: backendMetadata.seo_title || title,
                    description: backendMetadata.meta_description || '',
                    slug: backendMetadata.slug || '',
                    keywords: [],
                    keyword: focusKw
                };

                setKeyword(focusKw);
                setOptimizedData(meta);

                // Analyze using backend data
                const result = analyzeSEO(content, meta.title, focusKw);
                setAnalysis(result);
            } else {
                // Fallback: Local Generation
                const autoKeyword = suggestFocusKeyword(title, content);
                setKeyword(autoKeyword);

                const seoData = generateOptimizedTags(title, content, autoKeyword);
                setOptimizedData(seoData);

                const result = analyzeSEO(content, seoData.title, autoKeyword);
                setAnalysis(result);
            }
        }
    }, [title, content, backendMetadata]);

    // Permite ao usuário trocar a palavra-chave manualmente, recalculando tudo
    const handleKeywordChange = (newKeyword: string) => {
        setKeyword(newKeyword);
        if (title && content) {
            const seoData = generateOptimizedTags(title, content, newKeyword);
            setOptimizedData(seoData);
            const result = analyzeSEO(content, seoData.title, newKeyword);
            setAnalysis(result);
        }
    };

    const handleCopy = (text: string, fieldName: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-[var(--brand-tertiary)] border-[var(--brand-tertiary)]';
        if (score >= 70) return 'text-yellow-500 border-yellow-500';
        return 'text-red-500 border-red-500';
    };

    const renderCopyField = (label: string, value: string, fieldId: string, limit: string, multiline = false) => (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                    <label className="text-xs uppercase font-bold tracking-wider text-[var(--brand-tertiary)]">{label}</label>
                    {/* Ícone de alerta se exceder limite, embora a função generateOptimizedTags agora evite isso */}
                    {value.length > parseInt(limit) && <i className="fas fa-exclamation-triangle text-yellow-500 text-xs" title="Longo demais"></i>}
                </div>
                <span className={`text-[10px] ${value.length > parseInt(limit) ? 'text-red-400' : 'text-gray-500'}`}>
                    {value.length}/{limit} chars
                </span>
            </div>
            <div className="relative group">
                {multiline ? (
                    <textarea
                        readOnly
                        value={value}
                        className="w-full bg-black/50 border border-gray-700 text-green-100 rounded-lg p-3 text-sm focus:outline-none resize-none h-24 custom-scrollbar font-mono leading-relaxed"
                    />
                ) : (
                    <input
                        readOnly
                        type="text"
                        value={value}
                        className="w-full bg-black/50 border border-gray-700 text-green-100 rounded-lg p-3 pr-10 text-sm focus:outline-none font-mono"
                    />
                )}
                <button
                    onClick={() => handleCopy(value, fieldId)}
                    className={`absolute top-2 right-2 p-1.5 rounded transition shadow-sm border ${copiedField === fieldId ? 'bg-[var(--brand-tertiary)] text-black border-[var(--brand-tertiary)]/[0.2]' : 'bg-gray-800 text-gray-400 border-gray-600 hover:text-white'}`}
                    title="Copiar"
                >
                    {copiedField === fieldId ? <i className="fas fa-check font-bold"></i> : <i className="fas fa-copy"></i>}
                </button>
            </div>
        </div>
    );

    if (!optimizedData) return null;

    return (
        <div className="bg-gray-900 border border-[var(--brand-tertiary)]/[0.4] rounded-xl p-6 mt-6 shadow-lg animate-fade-in">
            <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                    <i className="fas fa-rocket mr-3 text-[var(--brand-tertiary)]"></i>
                    SEO Otimizado (Pronto)
                </h3>
                {analysis && (
                    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-full border-4 bg-black ${getScoreColor(analysis.score)}`}>
                        <span className="font-bold text-lg leading-none">{analysis.score}</span>
                        <span className="text-[8px] uppercase font-bold opacity-80">Score</span>
                    </div>
                )}
            </div>

            {/* Palavra Chave (Editável mas Automática) */}
            <div className="mb-6 bg-black/30 p-3 rounded-lg border border-gray-800 flex items-center gap-3">
                <div className="bg-[var(--brand-tertiary)]/[0.2] p-2 rounded text-[var(--brand-tertiary)]">
                    <i className="fas fa-key"></i>
                </div>
                <div className="flex-grow">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Palavra-Chave (Auto)</label>
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => handleKeywordChange(e.target.value)}
                        className="w-full bg-transparent text-white font-bold text-sm focus:outline-none border-b border-transparent focus:border-[var(--brand-tertiary)] transition-colors"
                    />
                </div>
                <button onClick={() => handleCopy(keyword, 'keyword')} className="text-gray-500 hover:text-white"><i className="fas fa-copy"></i></button>
            </div>

            {/* Painel de Cópia (Ready to Paste) */}
            <div className="mb-6 space-y-1">
                <p className="text-xs text-gray-400 mb-2 italic"><i className="fas fa-info-circle mr-1"></i>Copie e cole diretamente no seu CMS (WordPress, Webflow).</p>
                <div className="bg-gray-950 p-4 rounded-xl border border-[var(--brand-tertiary)]/[0.3] shadow-inner space-y-2">
                    {renderCopyField("Título SEO (Otimizado)", optimizedData.title, 'title', '60')}
                    {renderCopyField("Slug (URL Amigável)", optimizedData.slug, 'slug', '75')}
                    {renderCopyField("Meta Descrição (Otimizada)", optimizedData.description, 'meta', '160', true)}
                </div>
            </div>

            {/* Checklist de Análise */}
            {analysis && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Análise Técnica</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                        {analysis.results.map((res, idx) => (
                            <div key={idx} className="flex items-start gap-3 text-xs p-2 rounded hover:bg-gray-800/50 transition">
                                <div className="mt-0.5 flex-shrink-0">
                                    {res.status === 'good' && <i className="fas fa-check-circle text-[var(--brand-tertiary)]"></i>}
                                    {res.status === 'warning' && <i className="fas fa-exclamation-circle text-yellow-500"></i>}
                                    {res.status === 'critical' && <i className="fas fa-times-circle text-red-500"></i>}
                                </div>
                                <div>
                                    <span className="font-bold text-gray-400 mr-1">{res.test}:</span>
                                    <span className="text-gray-300">{res.message}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}