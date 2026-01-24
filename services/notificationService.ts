
import { api } from './api';
import { supabase } from './supabaseClient';
import { AppNotification } from '../types';

export const getNotifications = async (userId: string, limit = 20): Promise<AppNotification[]> => {
    const { data, error } = await api.select('notifications', { user_id: userId });
    
    if (error) {
        console.warn("Erro ao buscar notificações:", error);
        return [];
    }
    
    // Sort descending by created_at
    return (data || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
};

export const markAsRead = async (notificationId: string) => {
    await api.update('notifications', { is_read: true }, { id: notificationId });
};

export const markAllAsRead = async (userId: string) => {
    // Note: Supabase doesn't support bulk update with 'where' easily via this proxy style without dedicated RPC or loop
    // But we can update all where user_id matches
    await api.update('notifications', { is_read: true }, { user_id: userId, is_read: false });
};

export const createNotification = async (notification: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>) => {
    await api.insert('notifications', {
        ...notification,
        is_read: false
    });
};

export const subscribeToNotifications = (userId: string, callback: (payload: any) => void) => {
    return supabase
        .channel(`notifications:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            },
            callback
        )
        .subscribe();
};
