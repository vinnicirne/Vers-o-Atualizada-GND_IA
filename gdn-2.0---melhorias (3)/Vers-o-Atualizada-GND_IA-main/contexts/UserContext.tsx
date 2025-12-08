
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
         
         if (typeof profileError === 'string' && profileError.toLowerCase().includes('failed to fetch')) {
             console.warn("Entrando em modo de degradação graciosa devido a falha de rede.");
             setUser(null); // Fallback para visitante
             return;
         }

         if (typeof profileError === 'string' && (profileError.includes('permission denied') || profileError.includes('policy'))) {
             setError(`SQL_CONFIG_ERROR: ${profileError}`);
         } else {
             console.warn(`Erro não fatal ao carregar perfil: ${profileError}`);
             setUser(null);
         }
         return;
      }
      
      const profileData = profiles && profiles.length > 0 ? profiles[0] : null;

      if (!profileData) {
         console.warn("Usuário autenticado, mas sem perfil na tabela 'app_users'.");
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
      
      if (msg.toLowerCase().includes('failed to fetch')) {
          console.warn("Falha de rede detectada. Mantendo app em modo visitante.");
          setUser(null);
      } else {
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

  // --- REALTIME LISTENER ---
  useEffect(() => {
    if (!user) return;

    // Escuta mudanças na tabela de créditos para o usuário atual
    const creditsChannel = supabase
      .channel(`public:user_credits:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Insert, Update, Delete
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Créditos atualizados:', payload);
          refresh();
        }
      )
      .subscribe();

    // Escuta mudanças no perfil (ex: mudança de plano pelo admin)
    const profileChannel = supabase
      .channel(`public:app_users:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Perfil atualizado:', payload);
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(creditsChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id, refresh]); // Recria apenas se o ID mudar

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error("Erro ao recuperar sessão:", sessionError);
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
