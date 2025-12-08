
import { api } from './api';
import { MarketingEventType } from '../types';

export const trackEvent = async (
  tipo_evento: MarketingEventType, 
  lead_id?: string, 
  metadata?: Record<string, any>
) => {
  try {
    // Tenta pegar UTMs da sessão se não passados
    const enrichedMetadata = {
      ...metadata,
      utm_source: sessionStorage.getItem('utm_source'),
      utm_medium: sessionStorage.getItem('utm_medium'),
      utm_campaign: sessionStorage.getItem('utm_campaign'),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    await api.insert('eventos_marketing', {
      tipo_evento,
      lead_id,
      metadata: enrichedMetadata,
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.error("[Tracking] Erro ao registrar evento:", e);
  }
};