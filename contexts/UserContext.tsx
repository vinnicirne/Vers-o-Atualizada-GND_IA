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

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
      // 1. Busca o perfil do usuário na tabela 'app_users'.
      const { data: profile, error: profileError } = await supabase
        .from('app_users')
        .select('id, full_name, role, status')
        .eq('id', authUser.id)
        .maybeSingle(); 

      if (profileError) {
        console.error("Erro ao buscar perfil do usuário:", profileError.message);
        if (profileError.message.includes("Could not find the table") || profileError.message.includes("relation \"public.app_users\" does not exist")) {
            setError("Erro de configuração: a tabela 'app_users' não foi encontrada. Por favor, execute o script SQL de configuração em 'services/adminService.ts'.");
        } else if (profileError.message.includes('permission denied for table app_users')) {
            console.error(
                "*************************************************************************************\n" +
                "** ERRO DE CONFIGURAÇÃO DO SUPABASE (RLS) DETECTADO NO CONTEXTO DO USUÁRIO **\n" +
                "*************************************************************************************\n" +
                "A requisição para `supabase.from('app_users').select(...)` falhou durante a atualização da sessão do usuário.\n" +
                "Isso significa que a Row Level Security (RLS) está ativa, mas não há uma 'Policy' que permita ao usuário autenticado ler seus próprios dados na tabela 'app_users'.\n\n" +
                "==> SOLUÇÃO: Execute o SCRIPT 3 do arquivo 'services/adminService.ts' no seu Editor SQL do Supabase para criar as políticas de segurança necessárias.\n" +
                "*************************************************************************************"
            );
             const rlsErrorMessage = `SQL_CONFIG_ERROR:
O acesso à tabela de usuários foi negado. Isso ocorre porque a "Row Level Security" (RLS) do Supabase está ativa, mas as permissões (Policies) necessárias não foram configuradas.

Para corrigir, copie e execute o SCRIPT 3 completo do arquivo 'services/adminService.ts' no seu painel Supabase. Ele contém as políticas de segurança mais recentes que evitam erros comuns.
`;
             setError(rlsErrorMessage);
        } else if (profileError.message.toLowerCase().includes('failed to fetch')) {
            setError(
                'Falha de comunicação com o servidor.\n\n' +
                'Possíveis causas:\n' +
                '1. Verifique sua conexão com a internet.\n' +
                '2. Confirme se seu projeto Supabase está ativo (não pausado).\n' +
                '3. Desative temporariamente bloqueadores de anúncios (AdBlockers).'
            );
        } else {
            setError(`Não foi possível carregar o perfil do usuário: ${profileError.message}`);
        }
        await supabase.auth.signOut();
        setUser(null);
        return;
      }
      
      if (profile) {
        // 2. Busca os créditos do usuário na tabela 'user_credits'.
        const { data: creditsData, error: creditsError } = await supabase
            .from('user_credits')
            .select('credits')
            .eq('user_id', authUser.id)
            .single();

        if (creditsError) {
            console.error('Falha ao carregar créditos do usuário, definindo como 0:', creditsError.message);
        }

        // 3. Combina os dados para criar o objeto User completo.
        const userProfile: User = {
            ...profile,
            email: authUser.email!,
            credits: creditsData?.credits ?? 0,
        };
        setUser(userProfile);
      } else {
        // Se o perfil não for encontrado, é uma inconsistência de dados crítica,
        // pois o gatilho do banco de dados deveria tê-lo criado.
        const errorMessage = `Inconsistência de dados crítica: Perfil para o usuário ${authUser.id} não encontrado. O gatilho para criação automática de perfil pode não estar configurado corretamente no banco de dados.`;
        console.error(errorMessage);
        setError(errorMessage);
        await supabase.auth.signOut();
        setUser(null);
      }
    } catch (e: any) {
      console.error("Ocorreu um erro crítico em fetchUserProfile:", e.message);
      let errorMessage = 'Ocorreu um erro inesperado ao carregar seus dados.';
       if (e instanceof TypeError && e.message.toLowerCase().includes('failed to fetch')) {
           errorMessage = 'Falha de comunicação com o servidor.\n\n' +
                'Possíveis causas:\n' +
                '1. Verifique sua conexão com a internet.\n' +
                '2. Confirme se seu projeto Supabase está ativo (não pausado).\n' +
                '3. Desative temporariamente bloqueadores de anúncios (AdBlockers).';
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
    // O listener onAuthStateChange cuidará de definir o usuário como nulo.
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
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser deve ser usado dentro de um UserProvider');
  }
  return context;
};