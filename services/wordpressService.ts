
import { WordPressConfig } from '../types';
import { supabase } from './supabaseClient';

const DB_INTEGRATION_TYPE = 'wordpress';

// Removed localStorage methods for security

/**
 * Fetches WordPress configuration securely from Supabase `user_integrations` table.
 * Does NOT return the applicationPassword to the frontend.
 */
export const getWordPressConfig = async (userId: string): Promise<WordPressConfig | null> => {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('config_data')
      .eq('user_id', userId)
      .eq('integration_type', DB_INTEGRATION_TYPE)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error("Erro ao buscar config WP do DB:", error);
        throw error;
    }
    
    // Configurações públicas (siteUrl, username) podem ser lidas pelo cliente, mas não a senha.
    // A senha é gerida apenas pela Edge Function.
    return data ? {
        siteUrl: data.config_data.siteUrl,
        username: data.config_data.username,
        applicationPassword: '', // NEVER EXPOSE PASSWORD TO FRONTEND
        isConnected: true // If we found config, assume connected (actual connection check is done via validate/post functions)
    } : null;
  } catch (e) {
      console.error("Exceção em getWordPressConfig:", e);
      return null;
  }
};

/**
 * Saves or updates WordPress configuration to Supabase `user_integrations` table.
 * This is called by the frontend after a successful connection via wp-credentials-proxy.
 * It will only store the siteUrl and username on the client in memory (for display).
 * The sensitive data (password) is handled ONLY by the backend.
 */
export const saveWordPressConfig = async (config: WordPressConfig, userId: string) => {
    if (!userId) throw new Error("User ID is required to save WordPress config.");
    try {
        const { error } = await supabase
            .from('user_integrations')
            .upsert(
                {
                    user_id: userId,
                    integration_type: DB_INTEGRATION_TYPE,
                    config_data: {
                        siteUrl: config.siteUrl,
                        username: config.username,
                        // applicationPassword IS NOT STORED OR SENT FROM FRONTEND
                    }
                },
                { onConflict: 'user_id,integration_type' }
            );
        if (error) throw error;
        window.dispatchEvent(new Event('wordpress-config-updated')); // Notify UI
    } catch (e) {
        console.error("Erro ao salvar config WP no DB:", e);
        throw e;
    }
};

/**
 * Clears WordPress configuration from Supabase `user_integrations` table.
 */
export const clearWordPressConfig = async (userId: string) => {
  if (!userId) return;
  try {
    const { error } = await supabase
        .from('user_integrations')
        .delete()
        .eq('user_id', userId)
        .eq('integration_type', DB_INTEGRATION_TYPE);
    if (error) throw error;
    window.dispatchEvent(new Event('wordpress-config-updated')); // Notify UI
  } catch (e) {
      console.error("Erro ao limpar config WP do DB:", e);
      throw e;
  }
};

/**
 * Valida a conexão com o WordPress através de uma Edge Function proxy.
 * A Edge Function gerencia as credenciais seguras.
 */
export const validateWordPressConnection = async (config: WordPressConfig, userId: string, jwt: string): Promise<{ success: boolean; message?: string }> => {
  try {
    if (!config.siteUrl || !config.username || !config.applicationPassword) {
        return { success: false, message: 'Todos os campos (URL, Usuário, Senha de Aplicativo) são obrigatórios.' };
    }

    const response = await supabase.functions.invoke('wp-credentials-proxy', {
        body: {
            action: 'validate',
            siteUrl: config.siteUrl.trim().replace(/\/$/, ''),
            username: config.username,
            applicationPassword: config.applicationPassword // Sent ONLY to Edge Function
        },
        headers: {
            'Authorization': `Bearer ${jwt}`
        }
    });

    const { data, error } = response;

    if (error) {
        console.error("Erro na Edge Function 'wp-credentials-proxy':", error);
        return { success: false, message: error.message || "Erro desconhecido na Edge Function." };
    }

    if (data.success) {
        // Upon successful validation, save a partial config to client-side for display (no password)
        // And also upsert into user_integrations in the database (via client-side api.update)
        await saveWordPressConfig({
            siteUrl: config.siteUrl,
            username: config.username,
            applicationPassword: '', // Empty password for client-side representation
            isConnected: true
        }, userId);
    }

    return { success: data.success, message: data.message };

  } catch (error: any) {
    console.error("Erro ao validar conexão WP (client-side):", error);
    let msg = error.message || 'Erro desconhecido.';
    return { success: false, message: msg };
  }
};

/**
 * Posta conteúdo no WordPress através de uma Edge Function proxy.
 * A Edge Function gerencia as credenciais seguras.
 */
export const postToWordPress = async (
  title: string,
  content: string,
  status: 'draft' | 'publish' = 'draft',
  userId: string,
  jwt: string
): Promise<{ success: boolean; link?: string; message?: string }> => {
  try {
    if (!userId) return { success: false, message: 'Usuário não autenticado.' };

    const response = await supabase.functions.invoke('wp-post-proxy', {
        body: {
            title: title,
            content: content,
            status: status,
            userId: userId // Pass userId for fetching credentials in Edge Function
        },
        headers: {
            'Authorization': `Bearer ${jwt}`
        }
    });

    const { data, error } = response;

    if (error) {
        console.error("Erro na Edge Function 'wp-post-proxy':", error);
        return { success: false, message: error.message || "Erro desconhecido na Edge Function." };
    }

    return { success: data.success, link: data.link, message: data.message };

  } catch (error: any) {
    console.error("Erro ao postar no WP (client-side):", error);
    return { success: false, message: error.message || 'Erro desconhecido.' };
  }
};
