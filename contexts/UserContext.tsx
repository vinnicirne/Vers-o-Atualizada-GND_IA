
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
         
         // Tratamento para erro de conexão/rede
         if (typeof profileError === 'string' && profileError.toLowerCase().includes('failed to fetch')) {
             setError('Erro de Conexão: Não foi possível contactar o servidor. Verifique sua internet ou se há bloqueadores (AdBlock) ativos.');
             return;
         }

         // Se for um erro de permissão RLS
         if (typeof profileError === 'string' && (profileError.includes('permission denied') || profileError.includes('policy'))) {
             setError(`SQL_CONFIG_ERROR: ${profileError}`);
         } else {
             setError(`Erro ao carregar perfil: ${profileError}`);
         }
         return;
      }
      
      const profileData = profiles && profiles.length > 0 ? profiles[0] : null;

      if (!profileData) {
         // Perfil não existe no banco real.
         console.warn("Usuário autenticado, mas sem perfil na tabela 'app_users'.");
         setError("Perfil de usuário não encontrado no banco de dados.");
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
      console.error("Erro crítico em fetchUserProfile:", e);
      const msg = e.message || JSON.stringify(e);
      
      if (msg.toLowerCase().includes('failed to fetch')) {
          setError('Erro de Conexão: O sistema não conseguiu carregar seus dados. Verifique sua conexão com a internet.');
      } else {
          setError(msg || 'Erro inesperado ao carregar usuário.');
      }
      setUser(null);
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
