
import { api } from './api';

export type LogModule = 
  | 'Sistema' 
  | 'Usuários' 
  | 'Notícias' 
  | 'Pagamentos' 
  | 'Sistema Multi-IA' 
  | 'Segurança' 
  | 'CreatorSuite' 
  | 'Planos';

export type LogLevel = 'info' | 'warning' | 'error';

interface LogOptions {
  userId: string;
  action: string;
  module: LogModule;
  details?: Record<string, any>;
  level?: LogLevel;
}

/**
 * Serviço Central de Logs
 * Utiliza abordagem "Fire-and-Forget" para não bloquear a UI do usuário.
 */
export const logger = {
  /**
   * Registra uma ação no sistema.
   * Não requer await, executa em background.
   */
  log: ({ userId, action, module, details, level = 'info' }: LogOptions) => {
    // Executa a promessa sem bloquear o fluxo principal (Fire-and-Forget)
    api.insert('logs', {
      usuario_id: userId,
      acao: action,
      modulo: module,
      detalhes: {
        ...details,
        level: level // Adiciona o nível dentro dos detalhes para compatibilidade com tabela atual
      },
      data: new Date().toISOString() // Garante timestamp cliente caso o banco falhe no default
    }).catch(err => {
      // Falhas de log nunca devem quebrar a aplicação, apenas avisar no console dev
      console.warn(`[Logger] Falha ao registrar log de ${module}/${action}:`, err);
    });
  },

  info: (userId: string, module: LogModule, action: string, details?: any) => {
    logger.log({ userId, module, action, details, level: 'info' });
  },

  warn: (userId: string, module: LogModule, action: string, details?: any) => {
    logger.log({ userId, module, action, details, level: 'warning' });
  },

  error: (userId: string, module: LogModule, action: string, error: any) => {
    logger.log({ 
      userId, 
      module, 
      action, 
      details: { error: error instanceof Error ? error.message : String(error) }, 
      level: 'error' 
    });
  }
};

// Helpers específicos para ações comuns
export const logContentGeneration = (userId: string, mode: string, cost: number, creditsAfter: number, planId: string) => {
    logger.info(userId, 'CreatorSuite', `generated_content_${mode}`, {
        cost,
        credits_after: creditsAfter,
        plan: planId
    });
};

export const logAdminAction = (adminId: string, action: string, target: string, changes: any) => {
    logger.info(adminId, 'Sistema', action, { target, changes });
};
