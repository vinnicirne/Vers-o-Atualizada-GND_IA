
import { N8nConfig } from '../types';
import { api } from './api';
import { supabase } from './supabaseClient'; // Import necessário para invocar function

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
 * Função utilitária para chamar o N8N via Proxy Seguro (Edge Function)
 * Substitui o fetch direto para evitar CORS e expor tokens.
 */
export const callN8N = async (prompt: string, context: Record<string, any> = {}) => {
  try {
      // Chama a Edge Function 'n8n-proxy'
      // O Supabase injeta automaticamente o Authorization Bearer do usuário logado
      const { data, error } = await supabase.functions.invoke('n8n-proxy', {
          body: {
              prompt,
              task: context.task || 'generation',
              metadata: context // Passa outros dados como metadata
          }
      });

      if (error) {
          console.error("Erro na Edge Function n8n-proxy:", error);
          throw new Error(error.message || "Falha na comunicação com o servidor de automação.");
      }

      // Verifica se o N8N retornou erro lógico (mas HTTP 200 do proxy)
      if (data && data.status === 'error') {
          throw new Error(data.message || "Erro no processamento do fluxo N8N.");
      }

      return data;

  } catch (error: any) {
      console.error("Falha na integração N8N (Proxy):", error);
      // Retorna objeto de erro seguro para não quebrar a UI
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
  userId?: string; 
}

/**
 * Envia resultado gerado para o N8N.
 * Tenta usar a config do usuário se existir (Integração Customizada).
 * Se não, pode ser configurado para usar o Proxy do Sistema (Opcional).
 */
export const sendToN8nWebhook = async (
  payload: N8nPayload
): Promise<{ success: boolean; message?: string }> => {
  const userConfig = getN8nConfig();
  
  // CENÁRIO 1: Usuário trouxe o próprio Webhook (Configuração Manual)
  // Fazemos a requisição direta (Client-side) pois é o webhook DELE.
  if (userConfig && userConfig.isConnected && userConfig.webhookUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); 

        // Constrói URL Segura (Append /user/ID) se necessário, para manter padrão
        let finalUrl = userConfig.webhookUrl.trim().replace(/\/$/, '');
        if (payload.userId && !finalUrl.includes('/user/')) {
             finalUrl = `${finalUrl}/user/${payload.userId}`;
        }

        const response = await fetch(finalUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Source': 'GDN_IA_CLIENT'
          },
          body: JSON.stringify({
              ...payload,
              source: 'gdn_ia_dashboard_custom'
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
        console.error("Erro ao enviar para n8n customizado:", error);
        return { success: false, message: error.message };
      }
  }

  // CENÁRIO 2: Uso do Proxy do Sistema (Se quisermos enviar tudo para um N8N central)
  // Descomente abaixo se desejar que TODOS os usuarios enviem dados para o SEU N8N
  /*
  try {
      await callN8N("Log de Geração Automática", { ...payload, task: 'auto_log' });
      return { success: true };
  } catch (e: any) {
      return { success: false, message: e.message };
  }
  */

  return { success: false, message: 'N8n não configurado.' };
};

// Mantido para compatibilidade com o modal de teste de conexão manual
export const validateN8nWebhook = async (url: string, userId?: string): Promise<{ success: boolean; message?: string }> => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { success: false, message: 'URL inválida. Deve começar com http:// ou https://' };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        let finalUrl = url.trim().replace(/\/$/, '');
        if (userId && !finalUrl.includes('/user/')) {
             finalUrl = `${finalUrl}/user/${userId}`;
        }

        const response = await fetch(finalUrl, {
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
