
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { getWhiteLabelSettings, updateWhiteLabelSettings as saveWhiteLabelSettingsService } from '../services/adminService';
import { WhiteLabelSettings } from '../types';
import { useUser } from './UserContext'; // Para obter o ID do admin ao salvar

const DEFAULT_WHITE_LABEL_SETTINGS: WhiteLabelSettings = {
  appName: "GDN_IA",
  appTagline: "Creator Suite",
  logoTextPart1: "GDN",
  logoTextPart2: "_IA",
  primaryColorHex: "#F39C12", // Laranja original
  secondaryColorHex: "#263238", // Azul escuro original
  tertiaryColorHex: "#10B981", // Verde original
  faviconUrl: "https://cdn-icons-png.flaticon.com/512/16806/16806607.png",
  ogImageUrl: "https://gdn.ia/default-og.jpg", // Placeholder
  wordpressPluginName: "GDN_IA - Poster Pro",
  copyrightText: "GDN_IA",
  appVersion: "1.0.9", // Initial default from metadata.json
  dashboardTitle: "Creator Suite",
};

interface WhiteLabelContextType {
  settings: WhiteLabelSettings;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: WhiteLabelSettings, adminId: string) => Promise<void>;
}

const WhiteLabelContext = createContext<WhiteLabelContextType | undefined>(undefined);

export function WhiteLabelProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<WhiteLabelSettings>(DEFAULT_WHITE_LABEL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser(); // Hook para acessar o usuário autenticado

  const applyCssVariables = useCallback((newSettings: WhiteLabelSettings) => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', newSettings.primaryColorHex);
    root.style.setProperty('--brand-secondary', newSettings.secondaryColorHex);
    root.style.setProperty('--brand-tertiary', newSettings.tertiaryColorHex);
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWhiteLabelSettings();
      setSettings(data);
      applyCssVariables(data);
    } catch (err: any) {
      console.error("Erro ao carregar configurações de White Label:", err);
      setError(err.message || "Falha ao carregar configurações de White Label.");
      setSettings(DEFAULT_WHITE_LABEL_SETTINGS); // Fallback para padrões
      applyCssVariables(DEFAULT_WHITE_LABEL_SETTINGS); // Aplica as variáveis CSS padrão
    } finally {
      setLoading(false);
    }
  }, [applyCssVariables]);

  const updateSettings = useCallback(async (newSettings: WhiteLabelSettings, adminId: string) => {
    setLoading(true);
    setError(null);
    try {
      await saveWhiteLabelSettingsService(newSettings, adminId);
      setSettings(newSettings);
      applyCssVariables(newSettings);
      setLoading(false);
    } catch (err: any) {
      console.error("Erro ao salvar configurações de White Label:", err);
      setError(err.message || "Falha ao salvar configurações de White Label.");
      setLoading(false);
      throw err; // Re-throw para que o componente Admin lide com o erro
    }
  }, [applyCssVariables]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Atualiza o favicon e meta tags no HTML
  useEffect(() => {
    if (loading) return;

    // Favicon
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = settings.faviconUrl;

    let appleTouchLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (!appleTouchLink) {
      appleTouchLink = document.createElement('link');
      appleTouchLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleTouchLink);
    }
    appleTouchLink.href = settings.faviconUrl; // Usa a mesma URL para apple-touch-icon

    // Theme Color
    let themeMeta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = settings.primaryColorHex;

    // Manifest (apenas nome e short_name - o arquivo manifest.json ainda é estático mas com valores genéricos)
    let manifestLink = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
    if (manifestLink) {
        // Se o manifest.json for lido, ele já terá seus próprios valores.
        // Aqui estamos atualizando meta tags individuais para compatibilidade e fallback.
        let nameMeta = document.querySelector<HTMLMetaElement>("meta[property='og:site_name']");
        if (!nameMeta) {
            nameMeta = document.createElement('meta');
            nameMeta.setAttribute('property', 'og:site_name');
            document.head.appendChild(nameMeta);
        }
        nameMeta.content = settings.appName; // Usado por SEOHead como fallback
    }

    // Título da página
    document.title = `${settings.appName} - ${settings.appTagline}`;

  }, [settings, loading]);

  const value = {
    settings,
    loading,
    error,
    refreshSettings: fetchSettings,
    updateSettings,
  };

  return (
    <WhiteLabelContext.Provider value={value}>
      {children}
    </WhiteLabelContext.Provider>
  );
}

export const useWhiteLabel = (): WhiteLabelContextType => {
  const context = useContext(WhiteLabelContext);
  if (context === undefined) {
    throw new Error('useWhiteLabel deve ser usado dentro de um WhiteLabelProvider');
  }
  return context;
};
