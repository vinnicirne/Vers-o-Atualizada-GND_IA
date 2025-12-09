
import { api } from './api';
import { SystemFeedback } from '../types';

// Fetch Approved Feedbacks (Public)
export const getPublicFeedbacks = async (): Promise<SystemFeedback[]> => {
    const { data, error } = await api.select('system_feedbacks', { status: 'approved' });
    if (error) {
        console.error("Error fetching public feedbacks:", error);
        return [];
    }
    
    return await enrichWithUserData(data || []);
};

// Fetch All Feedbacks (Admin)
export const getAllFeedbacks = async (): Promise<SystemFeedback[]> => {
    const { data, error } = await api.select('system_feedbacks'); // Gets all regardless of status
    if (error) {
        throw new Error(error);
    }
    return await enrichWithUserData(data || []);
};

// Create New Feedback
export const createSystemFeedback = async (content: string, rating: number, userId: string) => {
    const { error } = await api.insert('system_feedbacks', {
        user_id: userId,
        content,
        rating,
        status: 'pending'
    });
    if (error) throw new Error(error);
};

// Moderate Feedback (Admin)
export const moderateFeedback = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await api.update('system_feedbacks', { status }, { id });
    if (error) throw new Error(error);
};

// Helper: Join user data
async function enrichWithUserData(feedbacks: any[]): Promise<SystemFeedback[]> {
    if (!feedbacks || feedbacks.length === 0) return [];

    const userIds = [...new Set(feedbacks.map(f => f.user_id).filter(Boolean))];
    const userMap = new Map();

    if (userIds.length > 0) {
        const { data: users } = await api.select('app_users', {}, { inColumn: 'id', inValues: userIds });
        if (users) {
            users.forEach((u: any) => userMap.set(u.id, u));
        }
    }

    return feedbacks.map(f => ({
        ...f,
        user: userMap.get(f.user_id) ? {
            full_name: userMap.get(f.user_id).full_name || 'Usuário',
            email: userMap.get(f.user_id).email
        } : undefined
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
