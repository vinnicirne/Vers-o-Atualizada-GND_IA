
import { useCallback } from 'react';
import { logger } from '../services/loggerService';

export const useAccessLog = () => {
  const logAccessAttempt = useCallback(async (userId: string | undefined, reason: string) => {
    try {
      // Se não houver ID de usuário (tentativa anônima), logamos com um placeholder ou ignoramos dependendo da política.
      // Aqui, vamos logar como sistema ou criar um log de 'Segurança' com ID 'anonymous' se necessário,
      // mas a tabela exige UUID válido para usuario_id em muitos casos.
      
      if (userId) {
          logger.warn(userId, 'Segurança', 'access_denied', { reason });
      } else {
          console.warn(`[AccessLog] Tentativa de acesso anônima bloqueada: ${reason}`);
      }
    } catch (e) {
      console.error('Critical error in logAccessAttempt:', e);
    }
  }, []);

  return { logAccessAttempt };
};
