import { WordPressConfig } from '../types';

const STORAGE_KEY = 'gdn_wp_config';

export const getWordPressConfig = (): WordPressConfig | null => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const saveWordPressConfig = (config: WordPressConfig) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const clearWordPressConfig = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const validateWordPressConnection = async (config: WordPressConfig): Promise<boolean> => {
  try {
    const auth = btoa(`${config.username}:${config.applicationPassword}`);
    // Tenta buscar o endpoint de usuários (apenas o próprio usuário 'me') para validar credenciais
    const response = await fetch(`${config.siteUrl}/wp-json/wp/v2/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
        return true;
    }
    return false;
  } catch (error) {
    console.error("Erro ao conectar WP:", error);
    return false;
  }
};

export const postToWordPress = async (
  title: string,
  content: string,
  status: 'draft' | 'publish' = 'draft'
): Promise<{ success: boolean; link?: string; message?: string }> => {
  const config = getWordPressConfig();
  if (!config || !config.isConnected) {
    return { success: false, message: 'WordPress não configurado.' };
  }

  try {
    const auth = btoa(`${config.username}:${config.applicationPassword}`);
    
    const payload = {
      title: title,
      content: content,
      status: status,
    };

    const response = await fetch(`${config.siteUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, link: data.link };
    } else {
      return { success: false, message: data.message || 'Erro ao publicar.' };
    }
  } catch (error: any) {
    return { success: false, message: error.message || 'Erro de conexão.' };
  }
};