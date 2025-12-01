
import React, { useState, useEffect } from 'react';
import { getPopups } from '../services/adminService';
import { Popup } from '../types';

export function PopupRenderer() {
    const [popups, setPopups] = useState<Popup[]>([]);
    const [activePopup, setActivePopup] = useState<Popup | null>(null);
    const [isVisible, setIsVisible] = useState(false);

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
                    // Logic can be improved to show multiple or randomize
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
        
        if (activePopup.trigger_settings.button_link) {
            window.open(activePopup.trigger_settings.button_link, '_blank');
        }
    };

    if (!activePopup) return null;

    // Helper to extract YouTube ID
    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

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
