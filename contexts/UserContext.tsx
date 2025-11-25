
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
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
      // Tenta buscar com a coluna 'plan'. Se falhar (ex: coluna não existe), tenta sem ela (fallback).
      let profileData: any = null;
      let profileError: any = null;
      
      const { data: profileWithPlan, error: errWithPlan } = await supabase
        .from('app_users')
        .select('id, full_name, role, status, plan')
        .eq('id', authUser.id)
        .maybeSingle();

      profileError = errWithPlan;
      profileData = profileWithPlan;

      if (profileError) {
        // Se o erro for especificamente sobre a coluna 'plan' não existir, 
        // tentamos buscar novamente sem ela para não bloquear o usuário.
        if (profileError.message.includes('column app_users.plan does not exist')) {
             console.warn("Coluna 'plan' não encontrada. Usando fallback para plano 'free'.");
             const { data: profileFallback, error: fallbackError } = await supabase
                .from('app_users')
                .select('id, full_name, role, status')
                .eq('id', authUser.id)
                .maybeSingle();
             
             if (fallbackError) throw fallbackError;
             profileData = { ...profileFallback, plan: 'free' }; // Atribui 'free' como padrão no fallback
        } else {
             // Erros reais (conexão, RLS, etc)
             console.error("Erro ao buscar perfil do usuário:", profileError.message);
             if (profileError.message.includes('permission denied for table app_users')) {
                 const rlsErrorMessage = `SQL_CONFIG_ERROR: O acesso à tabela de usuários foi negado (RLS). Execute o SCRIPT de atualização do banco de dados (database_update.sql) para corrigir as permissões.`;
                 setError(rlsErrorMessage);
             } else {
                 setError(`Não foi possível carregar o perfil do usuário: ${profileError.message}`);
             }
             await supabase.auth.signOut();
             setUser(null);
             return;
        }
      } 
      
      if (profileData) {
        // Usa maybeSingle para evitar erro se o registro de créditos ainda não existir
        const { data: creditsData, error: creditsError } = await supabase
            .from('user_credits')
            .select('credits')
            .eq('user_id', authUser.id)
            .maybeSingle();

        if (creditsError) {
            console.error('Falha ao carregar créditos do usuário:', creditsError.message);
        }

        const userProfile: User = {
            ...profileData,
            email: authUser.email!,
            credits: creditsData?.credits ?? 0,
            plan: profileData.plan || 'free', // Garante que plan sempre tenha um valor
        };
        setUser(userProfile);
      } else {
        const errorMessage = `Inconsistência de dados crítica: Perfil para o usuário ${authUser.id} não encontrado.`;
        console.error(errorMessage);
        setError(errorMessage);
        await supabase.auth.signOut();
        setUser(null);
      }
    } catch (e: any) {
      console.error("Ocorreu um erro crítico em fetchUserProfile:", e);
      let errorMessage = 'Ocorreu um erro inesperado ao carregar seus dados.';
       if (e instanceof Error) {
        errorMessage = e.message;
      }
      setError(errorMessage);
      setUser(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Erro ao fazer logout:", error.message);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        if (error) throw error;
        await fetchUserProfile(authUser);
    } catch (error: any) {
        if (error.message !== 'Auth session missing!') {
            console.error("Erro ao tentar atualizar o usuário:", error.message);
        }
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    const initializeSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await fetchUserProfile(session?.user ?? null);
      setLoading(false);
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