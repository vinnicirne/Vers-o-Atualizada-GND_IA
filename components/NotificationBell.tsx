
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { getNotifications, markAsRead, markAllAsRead, subscribeToNotifications } from '../services/notificationService';
import { AppNotification } from '../types';

export function NotificationBell() {
    const { user } = useUser();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Verifica permissão atual ao carregar
    useEffect(() => {
        if ('Notification' in window) {
            setPermissionStatus(Notification.permission);
        }
    }, []);

    // Função para pedir permissão ao navegador
    const requestPermission = async () => {
        if (!('Notification' in window)) {
            alert("Seu navegador não suporta notificações.");
            return;
        }
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        if (permission === 'granted') {
            new Notification("Notificações Ativadas!", {
                body: "Agora você receberá alertas importantes do GDN_IA aqui.",
                icon: "https://cdn-icons-png.flaticon.com/512/16806/16806607.png"
            });
        }
    };

    // Carrega iniciais e setup Realtime
    useEffect(() => {
        if (!user) return;

        const load = async () => {
            setLoading(true);
            const data = await getNotifications(user.id);
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
            setLoading(false);
        };

        load();

        // Subscribe Realtime
        const subscription = subscribeToNotifications(user.id, (payload) => {
            const newNotif = payload.new as AppNotification;
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // 1. Tocar som suave
            try {
                const audio = new Audio('/notification.mp3'); // Se existir, toca. Se não, ignora erro.
                audio.volume = 0.5;
                audio.play().catch(() => {}); // Ignora erro de autoplay policy
            } catch(e) {}

            // 2. Disparar Notificação Nativa do Navegador (Push)
            if (Notification.permission === 'granted') {
                const systemNotif = new Notification(newNotif.title, {
                    body: newNotif.message,
                    icon: "https://cdn-icons-png.flaticon.com/512/16806/16806607.png", // Ícone do App
                    tag: newNotif.id // Evita duplicação
                });

                // Clique na notificação foca a janela e vai para o link
                systemNotif.onclick = function(event) {
                    event.preventDefault();
                    window.focus();
                    if (newNotif.action_link) {
                        window.location.href = newNotif.action_link;
                    } else {
                        // Se não tiver link específico, apenas abre o menu de notificações (logicamente não abre o dropdown, mas foca o app)
                        setIsOpen(true);
                    }
                    systemNotif.close();
                };
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [user]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (notif: AppNotification) => {
        if (!notif.is_read) {
            await markAsRead(notif.id);
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        if (notif.action_link) {
            window.location.href = notif.action_link;
        }
    };

    const handleMarkAllRead = async () => {
        if (!user) return;
        await markAllAsRead(user.id);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return 'fa-check-circle text-green-500';
            case 'warning': return 'fa-exclamation-triangle text-yellow-500';
            case 'error': return 'fa-times-circle text-red-500';
            default: return 'fa-info-circle text-blue-500';
        }
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative bg-gray-100 text-gray-600 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-200 hover:text-[#263238] transition-colors border border-gray-200 shadow-sm focus:outline-none"
                title="Notificações"
            >
                <i className={`fas fa-bell ${unreadCount > 0 ? 'animate-swing' : ''}`}></i>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white min-w-[16px]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in-up origin-top-right">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-[#263238] text-sm">Notificações</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllRead}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                            >
                                Marcar todas como lidas
                            </button>
                        )}
                    </div>

                    {/* Aviso de Permissão */}
                    {permissionStatus === 'default' && (
                        <div className="bg-blue-50 p-3 border-b border-blue-100 flex items-start gap-3">
                            <i className="fas fa-bell text-blue-500 mt-1"></i>
                            <div className="flex-1">
                                <p className="text-xs text-blue-800 font-medium leading-tight mb-2">
                                    Receba alertas mesmo com o app fechado.
                                </p>
                                <button 
                                    onClick={requestPermission}
                                    className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded-md font-bold hover:bg-blue-700 transition"
                                >
                                    Ativar Notificações no Navegador
                                </button>
                            </div>
                        </div>
                    )}

                    {permissionStatus === 'denied' && (
                        <div className="bg-red-50 p-2 border-b border-red-100 text-center">
                            <p className="text-[10px] text-red-600">
                                <i className="fas fa-bell-slash mr-1"></i> Notificações bloqueadas no navegador.
                            </p>
                        </div>
                    )}

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {loading && notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <i className="fas fa-spinner fa-spin mb-2"></i>
                                <p className="text-xs">Carregando...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <i className="far fa-bell-slash text-2xl mb-2 opacity-50"></i>
                                <p className="text-xs">Nenhuma notificação.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map(notif => (
                                    <div 
                                        key={notif.id}
                                        onClick={() => handleMarkAsRead(notif)}
                                        className={`p-4 hover:bg-gray-50 transition cursor-pointer flex gap-3 ${!notif.is_read ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className="mt-1 flex-shrink-0">
                                            <i className={`fas ${getIcon(notif.type)}`}></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className={`text-sm ${!notif.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                    {notif.title}
                                                </p>
                                                {!notif.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{notif.message}</p>
                                            <p className="text-[10px] text-gray-400 mt-2">
                                                {new Date(notif.created_at).toLocaleString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
