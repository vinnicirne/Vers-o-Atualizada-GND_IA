import { WordPressConfig } from '../types';

const STORAGE_KEY = 'gdn_wp_config';

export const getWordPressConfig = (): WordPressConfig | null => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const saveWordPressConfig = (config: WordPressConfig) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  // Dispara evento customizado para atualizar a UI imediatamente
  window.dispatchEvent(new Event('wordpress-config-updated'));
};

export const clearWordPressConfig = () => {
  localStorage.removeItem(STORAGE_KEY);
  // Dispara evento customizado para atualizar a UI imediatamente
  window.dispatchEvent(new Event('wordpress-config-updated'));
};

/**
 * Valida a conexão com o WordPress.
 * Retorna objeto com sucesso e mensagem de erro se houver.
 */
export const validateWordPressConnection = async (config: WordPressConfig): Promise<{ success: boolean; message?: string }> => {
  try {
    // Codificação segura para caracteres especiais (UTF-8)
    const credentials = `${config.username}:${config.applicationPassword}`;
    // Buffer ou btoa robusto
    const auth = btoa(unescape(encodeURIComponent(credentials)));
    
    // URL normalize
    let cleanUrl = config.siteUrl.trim().replace(/\/$/, '');
    if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
    }
    
    // Tenta buscar o endpoint de usuários (apenas o próprio usuário 'me') para validar credenciais
    // Adiciona timestamp para evitar cache
    const response = await fetch(`${cleanUrl}/wp-json/wp/v2/users/me?context=edit&_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
        return { success: true };
    }

    // Tenta ler a mensagem de erro do WP
    let errorMsg = `Erro ${response.status}: ${response.statusText}`;
    try {
        const errorData = await response.json();
        if (errorData.message) errorMsg = `WordPress recusou: ${errorData.message}`;
    } catch (e) {
        // Ignora erro de parse
    }

    if (response.status === 401 || response.status === 403) {
        return { success: false, message: 'Credenciais inválidas. Verifique se a Senha de Aplicativo está correta e se seu usuário tem permissão.' };
    }

    return { success: false, message: errorMsg };

  } catch (error: any) {
    console.error("Erro ao conectar WP:", error);
    
    let msg = error.message || 'Erro desconhecido';
    
    // Detecta erros de rede comuns (CORS, SSL inválido, Offline)
    if (
        msg === 'Failed to fetch' || 
        msg.includes('NetworkError') || 
        msg.includes('Network request failed') ||
        error instanceof TypeError // Fetch falha com TypeError em problemas de rede/CORS
    ) {
        msg = 'Falha de Conexão (CORS/Rede). O navegador bloqueou a requisição. Isso acontece se o seu site não tiver HTTPS ou se algum plugin de segurança estiver bloqueando a REST API.';
    }
    
    return { success: false, message: msg };
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
    const credentials = `${config.username}:${config.applicationPassword}`;
    const auth = btoa(unescape(encodeURIComponent(credentials)));
    
    const payload = {
      title: title,
      content: content,
      status: status,
    };

    let cleanUrl = config.siteUrl.trim().replace(/\/$/, '');
    if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
    }

    const response = await fetch(`${cleanUrl}/wp-json/wp/v2/posts`, {
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
      return { success: false, message: data.message || `Erro ${response.status}` };
    }
  } catch (error: any) {
    let msg = error.message;
    if (msg === 'Failed to fetch' || error instanceof TypeError) {
        msg = 'Erro de CORS ou Rede. Verifique se o plugin de segurança do WP não está bloqueando a API.';
    }
    return { success: false, message: msg };
  }
};