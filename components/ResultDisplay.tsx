import React, { useState, useEffect } from 'react';
import {
    Copy,
    CheckCircle,
    Globe,
    Zap,
    Info,
    Share2,
    FileText,
    AlertTriangle,
    ExternalLink,
    Loader2
} from 'lucide-react';
import { ServiceKey } from '../types/plan.types';
import { getWordPressConfig, postToWordPress } from '../services/wordpressService';
import { getN8nConfig, sendToN8nWebhook } from '../services/n8nService';
import { useUser } from '../contexts/UserContext';

interface ResultDisplayProps {
    text: string;
    title?: string | null;
    mode: ServiceKey;
    metadata?: {
        plan: string;
        credits: string | number;
    };
}

export function ResultDisplay({ text, title, mode, metadata }: ResultDisplayProps) {
    const { user } = useUser();
    const [copiedText, setCopiedText] = useState(false);
    const [copiedTitle, setCopiedTitle] = useState(false);

    const [wpConfigured, setWpConfigured] = useState(false);
    const [postingToWp, setPostingToWp] = useState(false);
    const [wpStatus, setWpStatus] = useState<{ success?: boolean; message?: string } | null>(null);

    const [n8nConfigured, setN8nConfigured] = useState(false);
    const [sendingToN8n, setSendingToN8n] = useState(false);
    const [n8nStatus, setN8nStatus] = useState<{ success?: boolean; message?: string } | null>(null);

    useEffect(() => {
        const checkConfig = () => {
            const wp = getWordPressConfig();
            setWpConfigured(wp?.isConnected || false);

            const n8n = getN8nConfig();
            setN8nConfigured(n8n?.isConnected || false);
        };

        checkConfig();
        window.addEventListener('wordpress-config-updated', checkConfig);
        window.addEventListener('n8n-config-updated', checkConfig);
        return () => {
            window.removeEventListener('wordpress-config-updated', checkConfig);
            window.removeEventListener('n8n-config-updated', checkConfig);
        };
    }, []);

    const handleCopy = async (val: string, type: 'text' | 'title') => {
        try {
            await navigator.clipboard.writeText(val);
            if (type === 'text') {
                setCopiedText(true);
                setTimeout(() => setCopiedText(false), 2000);
            } else {
                setCopiedTitle(true);
                setTimeout(() => setCopiedTitle(false), 2000);
            }
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const handlePostToWordPress = async () => {
        if (!title || !text) return;
        setPostingToWp(true);
        setWpStatus(null);
        const result = await postToWordPress(title, text);
        setWpStatus({ success: result.success, message: result.success ? 'Postado com sucesso!' : (result.message || 'Erro ao postar.') });
        setPostingToWp(false);
    };

    const handleSendToN8n = async () => {
        if (!text) return;
        setSendingToN8n(true);
        setN8nStatus(null);
        const result = await sendToN8nWebhook({ title, content: text, mode, generated_at: new Date().toISOString(), userId: user?.id });
        setN8nStatus({ success: result.success, message: result.success ? 'Enviado!' : (result.message || 'Falha no envio.') });
        setSendingToN8n(false);
    };

    if (mode === 'text_to_speech') return null;

    const getTitleLabel = () => {
        if (mode === 'news_generator') return 'Título da Notícia';
        if (mode === 'prompt_generator') return 'Prompt Estratégico';
        return 'Título';
    };

    const getContentLabel = () => {
        if (mode === 'news_generator') return 'Matéria Completa';
        if (mode === 'copy_generator') return 'Copywriter Output';
        return 'Conteúdo Gerado';
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* TITLE CARD */}
            {title && (
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                    <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="w-3 h-3" /> {getTitleLabel()}
                        </span>
                        <button
                            onClick={() => handleCopy(title, 'title')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${copiedTitle
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-500 hover:text-indigo-600'
                                }`}
                        >
                            {copiedTitle ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copiedTitle ? 'Copiado' : 'Copiar'}
                        </button>
                    </div>
                    <div className="p-6">
                        <h3 className="text-xl font-extrabold text-slate-800 leading-tight">{title}</h3>
                    </div>
                </div>
            )}

            {/* CONTENT CARD */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-100 gap-4">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Share2 className="w-3 h-3" /> {getContentLabel()}
                    </span>

                    <div className="flex flex-wrap gap-2">
                        {n8nConfigured && (
                            <button
                                onClick={handleSendToN8n}
                                disabled={sendingToN8n}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${n8nStatus?.success
                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900'
                                    } disabled:opacity-50`}
                            >
                                {sendingToN8n ? <Loader2 className="w-3 h-3 animate-spin" /> : (n8nStatus?.success ? <CheckCircle className="w-3 h-3" /> : <Zap className="w-3 h-3" />)}
                                {sendingToN8n ? 'Enviando' : (n8nStatus?.success ? 'Enviado' : 'Enviar n8n')}
                            </button>
                        )}

                        {wpConfigured && title && mode === 'news_generator' && (
                            <button
                                onClick={handlePostToWordPress}
                                disabled={postingToWp}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${wpStatus?.success
                                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                                    } disabled:opacity-50`}
                            >
                                {postingToWp ? <Loader2 className="w-3 h-3 animate-spin" /> : (wpStatus?.success ? <CheckCircle className="w-3 h-3" /> : <Globe className="w-3 h-3" />)}
                                {postingToWp ? 'Postando' : (wpStatus?.success ? 'Ver no WP' : 'Postar WP')}
                            </button>
                        )}

                        <button
                            onClick={() => handleCopy(text, 'text')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${copiedText
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100 font-black'
                                    : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-100'
                                }`}
                        >
                            {copiedText ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copiedText ? 'Texto Copiado!' : 'Copiar Resultado'}
                        </button>
                    </div>
                </div>

                {/* Status Alerts */}
                {(wpStatus || n8nStatus) && !(wpStatus?.success && n8nStatus?.success) && (
                    <div className="bg-amber-50 px-6 py-3 text-[10px] text-amber-700 border-b border-amber-100 font-bold flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{wpStatus?.message || n8nStatus?.message}</span>
                    </div>
                )}

                <div className="p-8">
                    <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-wrap font-sans text-sm leading-relaxed overflow-x-auto selection:bg-indigo-100 selection:text-indigo-900">
                        {text}
                    </div>
                </div>
            </div>

            {/* METADATA FOOTER */}
            {metadata && (
                <div className="bg-slate-900 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400 border border-white/5 shadow-xl">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white/5 rounded-lg"><Info className="w-4 h-4 text-indigo-400" /></div>
                        <span className="uppercase tracking-widest font-black">Consumo da Geração</span>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="flex flex-col text-center sm:text-left">
                            <span className="text-[10px] opacity-50 uppercase tracking-tighter">Plano Ativo</span>
                            <span className="font-bold text-white text-sm">{metadata.plan}</span>
                        </div>
                        <div className="h-8 w-px bg-white/10"></div>
                        <div className="flex flex-col text-center sm:text-right">
                            <span className="text-[10px] opacity-50 uppercase tracking-tighter">Equilíbrio Social</span>
                            <span className={`font-black text-sm ${metadata.credits === 'Ilimitado' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                {metadata.credits} <span className="text-[10px] opacity-50">Créditos</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}