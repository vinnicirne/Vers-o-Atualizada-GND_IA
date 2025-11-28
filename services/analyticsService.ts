
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

  // Injeta o script principal do GTAG
  const script = document.createElement('script');
  script.id = 'gdn-ga4-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  // Injeta o script de configuração inline
  const inlineScript = document.createElement('script');
  inlineScript.id = 'gdn-ga4-config';
  inlineScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}');
  `;
  document.head.appendChild(inlineScript);
};
