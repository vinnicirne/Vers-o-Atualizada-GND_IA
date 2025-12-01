
import React, { useState, useEffect } from 'react';
import { getPopups } from '../services/adminService';
import { Popup } from '../types';
import { useUser } from '../contexts/UserContext';
import { AffiliateModal } from './AffiliateModal';

export function PopupRenderer() {
    const { user } = useUser();
    const [popups, setPopups] = useState<Popup[]>([]);
    const [activePopup, setActivePopup] = useState<Popup | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [showAffiliateModal, setShowAffiliateModal] = useState(false);

    useEffect(() => {
        const fetchAndFilterPopups = async () => {
            try {
                const allPopups = await getPopups(true); // Fetch only active
                
                // Filter logic based on localStorage/frequency
                const validPopups = allPopups.filter(popup => {
                    const lastShown = localStorage.getItem(`gdn_popup_${popup.id}`);
                    
                    if (popup.trigger_settings.frequency === 'always') return true;
                    
                    if (popup.trigger_settings.frequency === 'once') {
                        return !lastShown;
                    }
                    
                    if (popup.trigger_settings.frequency === 'daily') {
                        if (!lastShown) return true;
                        const lastDate = new Date(lastShown);
                        const now = new Date();
                        return now.toDateString() !== lastDate.toDateString();
                    }
                    
                    return true;
                });

                if (validPopups.length > 0) {
                    // Show the first eligible popup
                    schedulePopup(validPopups[0]);
                }
            } catch (e) {
                console.warn("Failed to load popups:", e);
            }
        };

        fetchAndFilterPopups();
    }, []);

    const schedulePopup = (popup: Popup) => {
        const delay = (popup.trigger_settings.delay || 0) * 1000;
        setTimeout(() => {
            setActivePopup(popup);
            setIsVisible(true);
        }, delay);
    };

    const handleClose = () => {
        if (!activePopup) return;
        
        setIsVisible(false);
        // Mark as shown
        localStorage.setItem(`gdn_popup_${activePopup.id}`, new Date().toISOString());
        
        // Wait animation then clear
        setTimeout(() => setActivePopup(null), 300);
    };

    const handleAction = () => {
        if (!activePopup) return;
        
        handleClose();
        
        // Check for specific internal action hooks
        if (activePopup.trigger_settings.button_link === '/?open_affiliate=true') {
            if (user) {
                setShowAffiliateModal(true);
            } else {
                // If not logged in, redirect to login with query param to open modal later?
                // For now, just let standard behavior handle it or ignore
                window.location.href = '/?page=login'; 
            }
            return;
        }
        
        if (activePopup.trigger_settings.button_link) {
            window.open(activePopup.trigger_settings.button_link, '_blank');
        }
    };

    // Helper to extract YouTube ID
    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    if (showAffiliateModal) {
        return <AffiliateModal onClose={() => setShowAffiliateModal(false)} />;
    }

    if (!activePopup) return null;

    // --- RENDERIZADOR TEMA DARK GOLD (Premium/Afiliados) ---
    if (activePopup.style.theme === 'dark_gold') {
        return (
            <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {/* Backdrop com blur leve */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>

                <div className={`relative w-full max-w-md bg-gradient-to-b from-gray-900 to-black border border-yellow-500/40 rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.2)] overflow-hidden transform transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}>
                    
                    {/* Decorative Top Glow */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-600 via-yellow-300 to-yellow-600"></div>
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl"></div>

                    <div className="p-8 text-center relative z-10">
                    <button 
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>

                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-full flex items-center justify-center mb-6 shadow-lg border border-yellow-500/30">
                        {activePopup.media_url ? (
                             // Se tiver imagem e for ícone, tenta renderizar img, senao icon default
                             <img src={activePopup.media_url} alt="Icon" className="w-10 h-10 object-contain brightness-0 invert" />
                        ) : (
                             <i className="fas fa-hand-holding-dollar text-4xl text-white"></i>
                        )}
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">
                        {activePopup.title}
                    </h2>
                    
                    <div className="text-gray-400 text-sm mb-8 leading-relaxed whitespace-pre-wrap">
                        {activePopup.content}
                    </div>

                    <div className="space-y-3">
                        <button
                        onClick={handleAction}
                        className="w-full py-3.5 px-6 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold rounded-xl shadow-lg shadow-yellow-500/20 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                        <span>{activePopup.trigger_settings.button_text}</span>
                        <i className="fas fa-arrow-right"></i>
                        </button>
                        
                        <button
                        onClick={handleClose}
                        className="w-full py-3 px-6 text-gray-500 hover:text-white text-sm font-medium transition-colors"
                        >
                        Agora não
                        </button>
                    </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDERIZADOR PADRÃO (Customizável) ---
    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>
            
            <div 
                className="relative bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-lg transform transition-transform duration-300 scale-100"
                style={{ backgroundColor: activePopup.style.background_color }}
            >
                {/* Close Button */}
                <button 
                    onClick={handleClose}
                    className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-gray-600 hover:text-black transition"
                >
                    <i className="fas fa-times"></i>
                </button>

                {/* Media Section */}
                {activePopup.type === 'image' && activePopup.media_url && (
                    <img 
                        src={activePopup.media_url} 
                        alt={activePopup.title} 
                        className="w-full h-auto max-h-[300px] object-cover" 
                    />
                )}

                {activePopup.type === 'video' && activePopup.media_url && (
                    <div className="w-full aspect-video bg-black">
                        {getYoutubeId(activePopup.media_url) ? (
                            <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${getYoutubeId(activePopup.media_url)}`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <video controls className="w-full h-full">
                                <source src={activePopup.media_url} type="video/mp4" />
                                Seu navegador não suporta vídeos HTML5.
                            </video>
                        )}
                    </div>
                )}

                {/* Content Section */}
                <div className="p-6 md:p-8 text-center">
                    <h3 className="text-2xl font-bold mb-4" style={{ color: activePopup.style.text_color }}>
                        {activePopup.title}
                    </h3>
                    <div 
                        className="prose prose-sm max-w-none mb-8 whitespace-pre-wrap leading-relaxed" 
                        style={{ color: activePopup.style.text_color }}
                    >
                        {activePopup.content}
                    </div>

                    <button
                        onClick={handleAction}
                        className="px-8 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5"
                        style={{ 
                            backgroundColor: activePopup.style.button_color,
                            color: activePopup.style.button_text_color
                        }}
                    >
                        {activePopup.trigger_settings.button_text || 'Fechar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
