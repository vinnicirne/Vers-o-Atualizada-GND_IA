
import { AnalyticsConfig } from '../types';

const STORAGE_KEY = 'gdn_ga4_config';

export const getAnalyticsConfig = (): AnalyticsConfig | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const saveAnalyticsConfig = (config: AnalyticsConfig) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  // Tenta inicializar imediatamente
  initGA4();
};

export const clearAnalyticsConfig = () => {
  localStorage.removeItem(STORAGE_KEY);
  // Para limpar completamente o GA, geralmente é necessário recarregar a página
  // para que o script pare de rastrear na próxima sessão.
  window.location.reload();
};

export const initGA4 = () => {
  const config = getAnalyticsConfig();
  if (!config || !config.measurementId || !config.isConnected) return;

  const gaId = config.measurementId;

  // Evita duplicação de scripts
  if (document.getElementById('gdn-ga4-script')) {
      return;
  }

  console.log(`[Analytics] Inicializando GA4 com ID: ${gaId}`);

  // Gera um nonce único ou usa um fixo para demonstração.
  // Em produção, este nonce DEVE ser gerado no servidor a cada requisição e injetado no HTML e CSP.
  // Para o contexto do AI Studio, um nonce fixo é aceitável, pois não há servidor para gerar dinamicamente.
  const nonce = 'ga4'; 

  // Injeta o script principal do GTAG
  const script = document.createElement('script');
  script.id = 'gdn-ga4-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  // Adiciona o nonce ao script principal do GA4
  script.setAttribute('nonce', nonce);
  document.head.appendChild(script);

  // Injeta o script de configuração inline com nonce
  const inlineScript = document.createElement('script');
  inlineScript.id = 'gdn-ga4-config';
  inlineScript.nonce = nonce; // Adiciona o nonce aqui para a CSP
  inlineScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}');
  `;
  document.head.appendChild(inlineScript);
};