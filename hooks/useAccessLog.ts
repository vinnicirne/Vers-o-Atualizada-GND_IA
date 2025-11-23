import { supabase } from '../services/supabaseClient';
import { useCallback } from 'react';

export const useAccessLog = () => {
  const logAccessAttempt = useCallback(async (userId: string | undefined, reason: string) => {
    try {
      if (!userId) {
        // Log attempt without user ID if someone tries to access a protected route while logged out
        console.warn(`Access attempt log triggered without user ID. Reason: ${reason}`);
        // Depending on requirements, you might still want to log this attempt without a user_id
        // For now, we'll just log to console.
        return;
      }

      const { error } = await supabase.from('logs').insert([{
        usuario_id: userId,
        acao: reason,
        modulo: 'Sistema',
      }]);

      if (error) {
        console.error('Error logging access attempt:', error.message);
      }
    } catch (e) {
      console.error('A critical error occurred in logAccessAttempt:', e);
    }
  }, []);

  return { logAccessAttempt };
};