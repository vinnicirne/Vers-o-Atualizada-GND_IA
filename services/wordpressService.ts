
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
    if (!config.siteUrl) return { success: false, message: 'URL do site é obrigatória.' };
    
    // URL normalize
    let cleanUrl = config.siteUrl.trim().replace(/\/$/, '');
    
    // Check for mixed content (HTTP site in HTTPS app)
    const isAppHttps = window.location.protocol === 'https:';
    const isWpHttp = cleanUrl.startsWith('http://') || cleanUrl.startsWith('http:');
    
    if (isAppHttps && isWpHttp) {
        return { 
            success: false, 
            message: 'Erro de Segurança (Mixed Content): O GDN_IA está em HTTPS, mas seu site WordPress está em HTTP. O navegador bloqueou a conexão automaticamente. Instale um certificado SSL no seu site (HTTPS) para prosseguir.' 
        };
    }

    if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
    }

    try {
        new URL(cleanUrl);
    } catch (e) {
        return { success: false, message: 'URL do site inválida. Verifique o formato.' };
    }

    // Codificação segura para caracteres especiais (UTF-8)
    const credentials = `${config.username}:${config.applicationPassword}`;
    // Buffer ou btoa robusto
    const auth = btoa(unescape(encodeURIComponent(credentials)));
    
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
        if (errorData.code === 'rest_cannot_view') errorMsg = 'Permissão negada. O usuário precisa de permissão de edição.';
    } catch (e) {
        // Ignora erro de parse se não for JSON
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
        msg = `Falha de Conexão (CORS ou Rede).\n\nO navegador bloqueou o acesso ao seu site. Isso geralmente acontece porque o WordPress não permite requisições externas por padrão.\n\nSOLUÇÃO:\n1. Instale o plugin "Application Passwords" (se ainda não fez).\n2. Instale um plugin de "Enable CORS" no seu WordPress.\n3. Verifique se seu site é HTTPS (obrigatório).`;
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
    // Melhoria nas mensagens de erro para o usuário final
    if (msg === 'Failed to fetch' || error instanceof TypeError) {
        msg = 'Erro de Rede ou CORS. O navegador bloqueou a conexão. Verifique se o seu WordPress suporta solicitações CORS e se está usando HTTPS.';
    }
    return { success: false, message: msg };
  }
};
