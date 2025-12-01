
import React, { useState, useEffect } from 'react';
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
  
  // WP State
  const [wpConfigured, setWpConfigured] = useState(false);
  const [postingToWp, setPostingToWp] = useState(false);
  const [wpStatus, setWpStatus] = useState<{success?: boolean; message?: string} | null>(null);

  // N8N State
  const [n8nConfigured, setN8nConfigured] = useState(false);
  const [sendingToN8n, setSendingToN8n] = useState(false);
  const [n8nStatus, setN8nStatus] = useState<{success?: boolean; message?: string} | null>(null);

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

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCopyTitle = async () => {
    if (!title) return;
    try {
      await navigator.clipboard.writeText(title);
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } catch (err) {
      console.error('Failed to copy title: ', err);
    }
  };

  const handlePostToWordPress = async () => {
      if (!title || !text) return;
      setPostingToWp(true);
      setWpStatus(null);
      
      const result = await postToWordPress(title, text);
      
      if (result.success) {
          setWpStatus({ success: true, message: 'Postado com sucesso!' });
      } else {
          setWpStatus({ success: false, message: result.message || 'Erro ao postar.' });
      }
      setPostingToWp(false);
  };

  const handleSendToN8n = async () => {
      if (!text) return;
      setSendingToN8n(true);
      setN8nStatus(null);

      const result = await sendToN8nWebhook({
          title,
          content: text,
          mode,
          generated_at: new Date().toISOString(),
          userId: user?.id
      });

      if (result.success) {
          setN8nStatus({ success: true, message: 'Enviado!' });
      } else {
          setN8nStatus({ success: false, message: result.message || 'Falha no envio.' });
      }
      setSendingToN8n(false);
  };

  const getTitleLabel = () => {
      if (mode === 'news_generator') return 'Título / Manchete';
      if (mode === 'prompt_generator') return 'Prompt Otimizado';
      if (mode === 'copy_generator') return 'Headline / Título';
      return 'Título Principal';
  };

  const getContentLabel = () => {
      if (mode === 'landingpage_generator' || mode === 'institutional_website_generator') return 'Código HTML Gerado';
      if (mode === 'news_generator') return 'Corpo da Matéria';
      if (mode === 'copy_generator') return 'Corpo do Texto';
      return 'Conteúdo Gerado';
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      {title && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between px-6 py-4 bg-[#F5F7FA] border-b border-gray-100">
               <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {getTitleLabel()}
                  </span>
               </div>
               
               <button
                  onClick={handleCopyTitle}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 border ${
                      copiedTitle
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                  }`}
               >
                  <i className={`fas ${copiedTitle ? 'fa-check-circle' : 'fa-copy'} text-xs`}></i>
                  {copiedTitle ? 'Copiado!' : 'Copiar'}
               </button>
            </div>
            <div className="p-6 bg-white">
                <h3 className="text-lg font-bold text-[#263238] leading-tight font-poppins">{title}</h3>
            </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden group hover:shadow-lg transition-shadow">
        <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-[#F5F7FA] border-b border-gray-100 gap-2">
           <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {getContentLabel()}
              </span>
           </div>
           
           <div className="flex gap-2">
               {/* N8N Button */}
               {n8nConfigured && (
                   <button
                        onClick={handleSendToN8n}
                        disabled={sendingToN8n}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border ${
                            n8nStatus?.success 
                            ? 'bg-pink-100 text-pink-600 border-pink-200'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-[#FF6D5A] hover:text-white hover:border-[#FF6D5A]'
                        } disabled:opacity-50`}
                   >
                       {sendingToN8n ? (
                           <><i className="fas fa-spinner fa-spin"></i> Enviando...</>
                       ) : n8nStatus?.success ? (
                           <><i className="fas fa-check"></i> Enviado!</>
                       ) : (
                           <><i className="fas fa-bolt"></i> Enviar p/ n8n</>
                       )}
                   </button>
               )}

               {/* WP Button */}
               {wpConfigured && title && mode === 'news_generator' && (
                   <button
                        onClick={handlePostToWordPress}
                        disabled={postingToWp}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border ${
                            wpStatus?.success 
                            ? 'bg-green-100 text-green-600 border-green-200'
                            : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                        } disabled:opacity-50`}
                   >
                       {postingToWp ? (
                           <><i className="fas fa-spinner fa-spin"></i> Postando...</>
                       ) : wpStatus?.success ? (
                           <><i className="fas fa-check"></i> Publicado!</>
                       ) : (
                           <><i className="fab fa-wordpress"></i> Publicar no WP</>
                       )}
                   </button>
               )}

               <button
                  onClick={handleCopyText}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border ${
                      copiedText
                      ? 'bg-green-100 text-green-700 border-green-200 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                  }`}
               >
                  <i className={`fas ${copiedText ? 'fa-check-circle' : 'fa-copy'} text-sm`}></i>
                  {copiedText ? 'Copiado!' : 'Copiar Texto'}
               </button>
           </div>
        </div>

        {wpStatus && !wpStatus.success && (
            <div className="bg-red-50 px-6 py-3 text-xs text-red-600 border-b border-red-100">
                <i className="fas fa-exclamation-circle mr-1"></i> {wpStatus.message}
            </div>
        )}
        
        {n8nStatus && !n8nStatus.success && (
            <div className="bg-red-50 px-6 py-3 text-xs text-red-600 border-b border-red-100">
                <i className="fas fa-bolt mr-1"></i> n8n: {n8nStatus.message}
            </div>
        )}

        <div className="p-6 relative">
          <pre className="prose prose-slate max-w-none text-gray-700 whitespace-pre-wrap font-mono text-sm leading-relaxed overflow-x-auto custom-scrollbar">
            {text}
          </pre>
        </div>
      </div>

      {metadata && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 shadow-sm">
            <div className="flex items-center gap-2">
                <i className="fas fa-info-circle text-gray-400"></i>
                <span className="uppercase tracking-wider font-bold">Informações de Consumo</span>
            </div>
            
            <div className="flex items-center gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-gray-500">Plano Utilizado:</span>
                    <span className="font-bold text-[#263238] bg-[#F5F7FA] px-2 py-0.5 rounded border border-gray-200 uppercase">
                        {metadata.plan}
                    </span>
                </div>
                <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-gray-500">Créditos Restantes:</span>
                    <span className={`font-bold px-2 py-0.5 rounded border ${metadata.credits === 'Ilimitado' ? 'text-green-600 bg-green-50 border-green-100' : 'text-[#F39C12] bg-orange-50 border-orange-100'}`}>
                        {metadata.credits}
                    </span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
