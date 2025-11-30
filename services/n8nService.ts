
import { N8nConfig } from '../types';
import { api } from './api';

const STORAGE_KEY = 'gdn_n8n_config';
const DB_KEY = 'n8n_config';

export const getN8nConfig = (): N8nConfig | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const syncN8nConfig = async (userId: string) => {
    try {
        // Tenta buscar do banco de dados
        const { data } = await api.select('user_memory', { user_id: userId, chave: DB_KEY });
        
        if (data && data.length > 0) {
            // Pega o mais recente
            const sorted = data.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            const latest = sorted[0];
            
            try {
                const config = JSON.parse(latest.valor);
                // Atualiza o local storage para manter sincronizado
                localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
                window.dispatchEvent(new Event('n8n-config-updated'));
                return config;
            } catch (e) {
                console.error("Falha ao parsear config N8N do DB:", e);
            }
        }
    } catch (e) {
        console.error("Erro ao sincronizar N8N config:", e);
    }
    return null;
};

export const saveN8nConfig = async (config: N8nConfig, userId?: string) => {
  // Salva localmente para feedback instantâneo
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event('n8n-config-updated'));

  // Salva na nuvem se o usuário estiver logado
  if (userId) {
      try {
          // Remove configuração anterior (Limpeza de logs antigos dessa chave)
          await api.delete('user_memory', { user_id: userId, chave: DB_KEY });
          
          // Insere nova configuração
          await api.insert('user_memory', {
              user_id: userId,
              chave: DB_KEY,
              valor: JSON.stringify(config)
          });
      } catch (e) {
          console.error("Erro ao salvar config N8N na nuvem:", e);
      }
  }
};

export const clearN8nConfig = async (userId?: string) => {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('n8n-config-updated'));
  
  if (userId) {
      try {
          await api.delete('user_memory', { user_id: userId, chave: DB_KEY });
      } catch (e) {
          console.error("Erro ao limpar config N8N da nuvem:", e);
      }
  }
};

interface N8nPayload {
  title?: string | null;
  content: string;
  mode: string;
  generated_at: string;
  credits_cost?: number;
  audio_base64?: string | null;
  image_prompt?: string;
  source?: string; // 'gdn_ia_dashboard'
}

export const sendToN8nWebhook = async (
  payload: N8nPayload
): Promise<{ success: boolean; message?: string }> => {
  const config = getN8nConfig();
  
  if (!config || !config.isConnected || !config.webhookUrl) {
    return { success: false, message: 'N8n não configurado.' };
  }

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'GDN_IA'
      },
      body: JSON.stringify({
          ...payload,
          source: 'gdn_ia_dashboard'
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      return { success: false, message: `Erro ${response.status}: ${response.statusText}` };
    }
  } catch (error: any) {
    console.error("Erro ao enviar para n8n:", error);
    return { success: false, message: error.message || 'Erro de conexão com o Webhook.' };
  }
};
