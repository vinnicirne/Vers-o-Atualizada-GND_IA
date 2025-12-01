
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
        const { data } = await api.select('user_memory', { user_id: userId, chave: DB_KEY });
        
        if (data && data.length > 0) {
            const sorted = data.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            const latest = sorted[0];
            try {
                const config = JSON.parse(latest.valor);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event('n8n-config-updated'));

  if (userId) {
      try {
          await api.delete('user_memory', { user_id: userId, chave: DB_KEY });
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

/**
 * Constrói URL dinâmica e segura para o usuário
 */
const buildSecureUrl = (baseUrl: string, userId?: string): string => {
    let finalUrl = baseUrl.trim();
    // Se temos um ID de usuário, garantimos que a URL termine com /user/ID para isolamento
    if (userId) {
        // Verifica se a URL já tem o ID (evita duplicação)
        if (!finalUrl.includes(userId)) {
            // Remove trailing slash
            finalUrl = finalUrl.replace(/\/$/, '');
            // Se a URL configurada for a base "webhook/gdn", anexa "/user/ID"
            // Se o usuário colou a URL completa sem ID, anexa.
            if (!finalUrl.includes('/user/')) {
                finalUrl = `${finalUrl}/user/${userId}`;
            } else if (finalUrl.endsWith('/user') || finalUrl.endsWith('/user/')) {
                finalUrl = `${finalUrl.replace(/\/$/, '')}/${userId}`;
            }
        }
    }
    return finalUrl;
};

export const validateN8nWebhook = async (url: string, userId?: string): Promise<{ success: boolean; message?: string }> => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { success: false, message: 'URL inválida. Deve começar com http:// ou https://' };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        // Usa URL segura se possível, senão usa a fornecida
        const targetUrl = buildSecureUrl(url, userId);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Source': 'GDN_IA_TEST' },
            body: JSON.stringify({
                type: 'connection_test',
                event: 'ping',
                test: true,
                message: 'Verificando conexão com GDN_IA',
                userId: userId || 'test_user',
                timestamp: new Date().toISOString()
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            return { success: true };
        } else {
            return { success: false, message: `Erro: ${response.status} ${response.statusText}` };
        }
    } catch (error: any) {
        let msg = error.message || 'Erro de conexão.';
        if (error.name === 'AbortError') msg = 'Timeout: O Webhook demorou muito para responder.';
        else if (msg.includes('Failed to fetch') || error instanceof TypeError) msg = 'Erro de CORS. Verifique as configurações do N8N.';
        
        return { success: false, message: msg };
    }
};

export const callN8N = async (prompt: string, context: Record<string, any> = {}) => {
  const config = getN8nConfig();
  if (!config || !config.webhookUrl) {
      throw new Error("Webhook N8N não configurado.");
  }

  try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      // Secure dynamic URL construction
      const targetUrl = buildSecureUrl(config.webhookUrl, context.userId);

      const response = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
              prompt, 
              ...context,
              source: 'gdn_ia_generation',
              timestamp: new Date().toISOString()
          }),
          signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
          throw new Error(`Erro HTTP N8N: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      try {
          return JSON.parse(text);
      } catch {
          return { output: text };
      }
  } catch (error: any) {
      if (error.name === 'AbortError') throw new Error("Timeout: N8N demorou muito.");
      // Ensure we don't crash, return formatted error
      return { status: 'error', message: error.message };
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
  source?: string;
  userId?: string; // Optional user ID for path construction
}

export const sendToN8nWebhook = async (
  payload: N8nPayload
): Promise<{ success: boolean; message?: string }> => {
  const config = getN8nConfig();
  
  if (!config || !config.isConnected || !config.webhookUrl) {
    return { success: false, message: 'N8n não configurado.' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); 

    // Secure dynamic URL construction
    // We try to find userId in payload or localStorage as fallback
    let currentUserId = payload.userId;
    if (!currentUserId) {
        // Fallback: try to grab from payload metadata or other context if available
        // Ideally payload.userId is passed by the caller
    }
    const targetUrl = buildSecureUrl(config.webhookUrl, currentUserId);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'GDN_IA'
      },
      body: JSON.stringify({
          ...payload,
          source: 'gdn_ia_dashboard'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { success: true };
    } else {
      return { success: false, message: `Erro ${response.status}: ${response.statusText}` };
    }
  } catch (error: any) {
    console.error("Erro ao enviar para n8n:", error);
    let msg = error.message || 'Erro de conexão.';
    if (error.name === 'AbortError') msg = 'Timeout no envio.';
    else if (msg.includes('Failed to fetch')) msg = 'Falha de entrega (CORS/Rede).';
    
    return { success: false, message: msg };
  }
};
