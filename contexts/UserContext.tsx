
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { api } from '../services/api';
import { User } from '../types';
import type { User as AuthUser } from '@supabase/supabase-js';

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children?: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async (authUser: AuthUser | null) => {
    // Resetar erro apenas se não for um erro crítico persistente, 
    // mas aqui limpamos para tentar nova busca
    setError(null);
    
    if (!authUser) {
      setUser(null);
      return;
    }

    try {
      // Busca perfil real no Supabase
      const { data: profiles, error: profileError } = await api.select('app_users', { id: authUser.id });

      if (profileError) {
         console.error("Erro ao buscar perfil real:", profileError);
         
         // Tratamento para erro de conexão/rede (Failed to fetch)
         // IMPORTANTE: Não definimos 'setError' aqui para não bloquear o app inteiro com a tela vermelha.
         // Se falhar o fetch, assumimos que o usuário está "deslogado" temporariamente (Modo Visitante) 
         // ou mostramos um aviso discreto na UI via Toast (se implementado globalmente), 
         // mas permitimos o render do App.
         if (typeof profileError === 'string' && profileError.toLowerCase().includes('failed to fetch')) {
             console.warn("Entrando em modo de degradação graciosa devido a falha de rede.");
             setUser(null); // Fallback para visitante
             return;
         }

         // Se for um erro de permissão RLS, isso é configuração crítica
         if (typeof profileError === 'string' && (profileError.includes('permission denied') || profileError.includes('policy'))) {
             setError(`SQL_CONFIG_ERROR: ${profileError}`);
         } else {
             // Outros erros (perfil não encontrado, etc)
             // Não bloqueamos o app, apenas não logamos o usuário
             console.warn(`Erro não fatal ao carregar perfil: ${profileError}`);
             setUser(null);
         }
         return;
      }
      
      const profileData = profiles && profiles.length > 0 ? profiles[0] : null;

      if (!profileData) {
         // Perfil não existe no banco real.
         console.warn("Usuário autenticado, mas sem perfil na tabela 'app_users'.");
         // Não bloqueia, apenas desloga
         setUser(null);
         return;
      }

      // Busca créditos reais
      const { data: creditsData } = await api.select('user_credits', { user_id: authUser.id });
      const userCredits = creditsData && creditsData.length > 0 ? creditsData[0].credits : 0;

      const userProfile: User = {
          ...profileData,
          email: authUser.email!,
          credits: userCredits,
          plan: profileData.plan || 'free',
      };
      
      setUser(userProfile);
      
    } catch (e: any) {
      console.error("Exceção em fetchUserProfile:", e);
      const msg = e.message || JSON.stringify(e);
      
      // Se for erro de fetch na exceção
      if (msg.toLowerCase().includes('failed to fetch')) {
          console.warn("Falha de rede detectada. Mantendo app em modo visitante.");
          setUser(null);
          // Não setamos setError para não ativar o Modal de Erro Crítico
      } else {
          // Erros inesperados de lógica ainda podem ser críticos, mas preferimos não matar o app se possível
          console.error(msg);
          setUser(null);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Erro ao fazer logout:", error.message);
    }
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        await fetchUserProfile(authUser);
    } catch (error) {
        console.error("Erro no refresh:", error);
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error("Erro ao recuperar sessão:", sessionError);
            // Não bloqueia o app, apenas não loga
        }
        await fetchUserProfile(session?.user ?? null);
      } catch (err) {
        console.error("Falha na inicialização da sessão:", err);
        // Em caso de erro fatal na inicialização, permitimos o app carregar como visitante
      } finally {
        setLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchUserProfile(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const value = {
    user,
    loading,
    error,
    refresh,
    signOut,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser deve ser usado dentro de um UserProvider');
  }
  return context;
};
