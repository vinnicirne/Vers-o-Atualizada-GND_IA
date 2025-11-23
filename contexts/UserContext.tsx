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
      // 1. Fetch main profile from app_users
      const { data: profile, error: profileError } = await supabase
        .from('app_users')
        .select('id, email, full_name, role, status')
        .eq('id', authUser.id)
        .maybeSingle(); 

      if (profileError) {
        console.error("Erro ao buscar perfil do usuário:", profileError.message);
        if (profileError.message.includes('Failed to fetch')) {
            setError('Falha de comunicação com o servidor. Verifique sua conexão com a internet e se o endereço do serviço (URL) está correto.');
        } else {
            setError(`Não foi possível carregar o perfil do usuário: ${profileError.message}`);
        }
        await supabase.auth.signOut();
        setUser(null);
        return;
      }
      
      if (profile) {
        // Profile exists, fetch credits and set user
        const { data: creditData, error: creditError } = await supabase
          .from('user_credits')
          .select('credits')
          .eq('user_id', authUser.id)
          .maybeSingle();
        
        if (creditError) {
          console.warn(`Não foi possível buscar os créditos para o usuário ${authUser.id}. Definindo como 0.`, creditError);
        }

        const fullUser: User = {
          ...profile,
          credits: creditData?.credits ?? 0,
        };
        setUser(fullUser);
      } else {
        // Profile doesn't exist. This is a new user, create their profile.
        console.log(`Perfil para o usuário ${authUser.id} não encontrado. Criando um novo perfil.`);
        
        const defaultFullName = authUser.email?.split('@')[0] || 'Novo Usuário';
        const initialCredits = 10; // Default credits for new sign-ups

        const { data: newProfile, error: newProfileError } = await supabase
          .from('app_users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: defaultFullName,
            role: 'user',
            status: 'active'
          })
          .select()
          .single();
        
        if (newProfileError) {
          const errorMessage = `Falha ao criar o perfil do usuário: ${newProfileError.message}. Contate o suporte.`;
          console.error(errorMessage);
          setError(errorMessage);
          await supabase.auth.signOut();
          setUser(null);
          return;
        }

        const { error: newCreditError } = await supabase
          .from('user_credits')
          .insert({
            user_id: authUser.id,
            credits: initialCredits
          });

        if (newCreditError) {
          const errorMessage = `Falha ao definir os créditos iniciais: ${newCreditError.message}. O perfil foi parcialmente criado, contate o suporte.`;
          console.error(errorMessage);
          setError(errorMessage);
          await supabase.auth.signOut();
          setUser(null);
          return;
        }
        
        const fullUser: User = {
          ...newProfile,
          credits: initialCredits,
        };
        setUser(fullUser);
      }
    } catch (e: any) {
      console.error("Ocorreu um erro crítico em fetchUserProfile:", e.message);
      let errorMessage = 'Ocorreu um erro inesperado ao carregar seus dados.';
       if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
           errorMessage = 'Falha de comunicação com o servidor. Verifique sua conexão com a internet e se o endereço do serviço (URL) está correto.';
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