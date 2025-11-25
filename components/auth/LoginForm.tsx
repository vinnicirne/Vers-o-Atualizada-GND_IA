

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../services/supabaseClient';
import type { User } from '../../types';

const performLogin = async (email: string, password: string): Promise<User> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
            throw new Error('Credenciais inválidas. Verifique seu email e senha.');
        }
        if (authError.message.toLowerCase().includes('failed to fetch')) {
            console.error(
                "*********************************************************************************\n" +
                "** ERRO DE REDE: 'Failed to fetch' **\n" +
                "*********************************************************************************\n" +
                "A aplicação não conseguiu se comunicar com o servidor Supabase.\n" +
                "Causas comuns:\n" +
                "1. Sem conexão com a internet.\n" +
                "2. O serviço do Supabase (backend) pode estar pausado ou offline.\n" +
                "3. Um bloqueador de anúncios (AdBlock) ou extensão de navegador está bloqueando a requisição.\n" +
                "4. A URL do Supabase em 'services/supabaseClient.ts' está incorreta.\n" +
                "*********************************************************************************"
            );
            throw new Error(
                'Falha de comunicação com o servidor.\n\n' +
                'Possíveis causas:\n' +
                '1. Verifique sua conexão com a internet.\n' +
                '2. Confirme se seu projeto Supabase está ativo (não pausado).\n' +
                '3. Desative temporariamente bloqueadores de anúncios (AdBlockers).'
            );
        }
        throw new Error('Falha na autenticação: ' + authError.message);
    }

    if (!authData.user) throw new Error('Usuário não encontrado após a autenticação.');

    const { data: profile, error: profileError } = await supabase
        .from('app_users')
        .select('id, full_name, role, status')
        .eq('id', authData.user.id)
        .single();
    
    if (profileError) {
        await supabase.auth.signOut();
        if (profileError.message.includes("Could not find the table") || profileError.message.includes("relation \"public.app_users\" does not exist")) {
            throw new Error("Erro de configuração: A tabela 'app_users' não foi encontrada. Execute o script SQL em 'services/adminService.ts' para configurar o banco de dados.");
        }
        if (profileError.message.includes('permission denied for table app_users')) {
            console.error(
                "*********************************************************************************\n" +
                "** ERRO DE CONFIGURAÇÃO DO SUPABASE (RLS) DETECTADO NA PÁGINA DE LOGIN **\n" +
                "*********************************************************************************\n" +
                "A requisição para `supabase.from('app_users').select(...)` falhou.\n" +
                "Isso significa que a Row Level Security (RLS) está ativa, mas não há uma 'Policy' que permita ao usuário recém-autenticado ler seus próprios dados na tabela 'app_users'.\n\n" +
                "==> SOLUÇÃO: Execute o SCRIPT 3 do arquivo 'services/adminService.ts' no seu Editor SQL do Supabase para criar as políticas de segurança necessárias.\n" +
                "*********************************************************************************"
            );
            const rlsErrorMessage = `SQL_CONFIG_ERROR:
O acesso à tabela de usuários foi negado. Isso ocorre porque a "Row Level Security" (RLS) do Supabase está ativa, mas as permissões (Policies) necessárias não foram configuradas.

Para corrigir, copie e execute o SCRIPT 3 completo do arquivo 'services/adminService.ts' no seu painel Supabase. Ele contém as políticas de segurança mais recentes que evitam erros comuns.
`;
            throw new Error(rlsErrorMessage);
        }
        if (profileError.message.toLowerCase().includes('failed to fetch')) {
            throw new Error(
                'Falha de comunicação ao buscar seu perfil.\n\n' +
                'A autenticação inicial funcionou, mas não foi possível carregar seus dados. Verifique sua conexão com a internet.'
            );
        }
        throw new Error('Falha ao consultar o perfil do usuário: ' + profileError.message);
    }
    
    if (!profile) {
        await supabase.auth.signOut();
        throw new Error('Perfil de usuário não encontrado.');
    }

    const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', authData.user.id)
        .single();
    
    if (creditsError) {
        console.error('Falha ao consultar os créditos do usuário, definindo como 0:', creditsError.message);
    }

    const fullUser: User = {
        ...profile,
        email: authData.user.email!,
        credits: creditsData?.credits ?? 0,
    };
    
    return fullUser;
};

export const LoginForm: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  useEffect(() => {
    if (isSignUp) {
        setIsAdminMode(false);
    }
  }, [isSignUp]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setEmail('');
            setPassword('');
            setMessage({ type: 'success', text: 'Conta criada! Por favor, verifique seu email para confirmar.' });
            setIsSignUp(false);
        }
    } else {
        try {
          const user = await performLogin(email, password);
          if (isAdminMode && user.role !== 'admin' && user.role !== 'super_admin') {
              await supabase.auth.signOut();
              throw new Error('Acesso negado: Credenciais sem privilégios de Administrador.');
          }
        } catch (err) {
          if (err instanceof Error) {
            setMessage({ type: 'error', text: err.message });
          } else {
            setMessage({ type: 'error', text: 'Ocorreu um erro inesperado.' });
          }
        }
    }
    setIsLoading(false);
  };

  const theme = isAdminMode 
  ? { 
      textColor: 'text-red-400',
      borderColor: 'border-red-500/30',
      focusBorderColor: 'focus:border-red-500',
      shadow: 'shadow-[0_0_15px_rgba(220,38,38,0.4)]',
      buttonBg: 'bg-red-600 hover:bg-red-500 text-white',
      toggleActive: 'bg-red-500 text-white',
      icon: 'fa-user-secret',
      title: 'Acesso Admin',
      subtitle: 'Protocolo de Segurança GDN_IA',
  } 
  : { 
      textColor: 'text-green-400',
      borderColor: 'border-green-500/30',
      focusBorderColor: 'focus:border-green-500',
      shadow: 'shadow-[0_0_15px_rgba(34,197,94,0.3)]',
      buttonBg: 'bg-green-600 hover:bg-green-500 text-black',
      toggleActive: 'bg-green-500 text-black',
      icon: 'fa-robot',
      title: 'Login de Usuário',
      subtitle: 'Gerador de Notícias Inteligente',
  };

  const currentTitle = isSignUp ? 'Criar Nova Conta' : theme.title;
  const buttonText = isLoading ? 'Processando...' : (isSignUp ? 'Registrar' : 'Autenticar');

  const modalRoot = document.getElementById('modal-root');

  return (
    <>
      <div className={`w-full max-w-sm bg-black/80 backdrop-blur-md border ${theme.borderColor} rounded-lg ${theme.shadow} overflow-hidden animate-fade-in-scale`}>
        <div className={`p-6 border-b ${theme.borderColor} text-center bg-black/20`}>
          <i className={`fas ${isSignUp ? 'fa-user-plus' : theme.icon} text-4xl ${theme.textColor} mb-3 opacity-80 transition-all duration-300`}></i>
          <h1 className="text-xl font-bold tracking-widest text-gray-200 uppercase">{currentTitle}</h1>
          <p className={`text-xs ${theme.textColor}/80`}>{isSignUp ? 'Junte-se à plataforma de IA' : theme.subtitle}</p>
        </div>
        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className={`block text-xs uppercase font-bold mb-2 tracking-wider ${theme.textColor}`}>Email de Acesso</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className={`w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md ${theme.focusBorderColor} focus:outline-none focus:ring-0 transition duration-300`}
              />
            </div>
            <div>
              <label className={`block text-xs uppercase font-bold mb-2 tracking-wider ${theme.textColor}`}>Senha</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className={`w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md ${theme.focusBorderColor} focus:outline-none focus:ring-0 transition duration-300`}
              />
            </div>
            <button type="submit" disabled={isLoading}
              className={`w-full font-bold py-3 text-sm uppercase tracking-widest rounded-md transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-wait ${theme.buttonBg}`}
            >
              {buttonText}
            </button>
          </form>
          <div className="mt-6 text-center text-xs">
            {isSignUp ? (
                <p className="text-gray-500">
                  Já tem uma conta?{' '}
                  <button onClick={() => setIsSignUp(false)} className={`font-bold ${theme.textColor} hover:underline`}>Fazer Login</button>
                </p>
            ) : (
              <>
                <div className="flex justify-center items-center my-4">
                  <button onClick={() => setIsAdminMode(false)} className={`px-4 py-1 rounded-l-md text-xs font-bold transition ${!isAdminMode ? theme.toggleActive : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600'}`}>Usuário</button>
                  <button onClick={() => setIsAdminMode(true)} className={`px-4 py-1 rounded-r-md text-xs font-bold transition ${isAdminMode ? theme.toggleActive : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600'}`}>Admin</button>
                </div>
                {!isAdminMode && (
                    <p className="text-gray-500">
                      Não tem uma conta?{' '}
                      <button onClick={() => setIsSignUp(true)} className={`font-bold ${theme.textColor} hover:underline`}>Crie uma conta</button>
                    </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {message && modalRoot && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className={`w-full max-w-md bg-black rounded-lg shadow-xl border ${message.type === 'error' ? 'border-red-500/50' : 'border-green-500/50'}`}>
            <div className={`p-6 border-b ${message.type === 'error' ? 'border-red-900/50' : 'border-green-900/50'} text-center`}>
              <i className={`fas ${message.type === 'error' ? 'fa-exclamation-triangle text-red-400' : 'fa-check-circle text-green-400'}`}></i>
              <h1 className="text-xl font-bold text-gray-200 mt-3">{message.type === 'error' ? 'Erro' : 'Sucesso'}</h1>
            </div>
            <div className="p-6">
                <p className={`text-center whitespace-pre-wrap ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{message.text}</p>
            </div>
            <div className={`p-4 bg-black/50 flex justify-center rounded-b-lg border-t ${message.type === 'error' ? 'border-red-900/50' : 'border-green-900/50'}`}>
                <button 
                    onClick={() => setMessage(null)}
                    className={`px-6 py-2 font-bold rounded-lg transition text-white ${message.type === 'error' ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500' : 'bg-green-600 hover:bg-green-500 focus:ring-green-500'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black`}
                >
                    Fechar
                </button>
            </div>
          </div>
        </div>,
        modalRoot
      )}
    </>
  );
};