

import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import type { User } from './types';

// A lógica de authService.ts agora está contida na página de login
const performLogin = async (email: string, password: string): Promise<User> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
            throw new Error('Credenciais inválidas. Verifique seu email e senha.');
        }
        throw new Error('Falha na autenticação: ' + authError.message);
    }

    if (!authData.user) throw new Error('Usuário não encontrado após a autenticação.');

    // O nome do usuário não é estritamente necessário para a verificação de login.
    // O perfil completo do usuário será carregado pelo UserContext após o login ser bem-sucedido.
    const { data: userProfile, error: profileError } = await supabase
        .from('app_users')
        .select('id, email, role, status')
        .eq('id', authData.user.id)
        .maybeSingle(); // FIX: Changed to maybeSingle() to prevent error on missing profile.
    
    // Handle potential DB errors first
    if (profileError) {
        await supabase.auth.signOut();
        throw new Error('Falha ao consultar o perfil do usuário: ' + profileError.message);
    }
    
    // Handle case where user exists in auth but not in our profiles table
    if (!userProfile) {
        await supabase.auth.signOut();
        throw new Error('Não foi possível carregar o perfil do usuário. Contate o suporte.');
    }
    
     const { data: creditData, error: creditError } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', authData.user.id)
      .maybeSingle(); // FIX: Changed to maybeSingle() to handle users without a credit entry.

    if (creditError) {
        console.warn(`Could not fetch credits for user ${authData.user.id}, defaulting to 0.`, creditError);
    }
    
    return {
      ...userProfile,
      credits: creditData?.credits ?? 0,
    };
};


const LoginPage: React.FC = () => {
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
          // Após um login bem-sucedido, o listener onAuthStateChange do UserProvider
          // irá automaticamente buscar o perfil do usuário e renderizar novamente o aplicativo,
          // navegando efetivamente para longe da página de login. Nenhum callback é necessário.
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
  ? { // Tema Admin (Alerta Vermelho)
      textColor: 'text-red-400',
      borderColor: 'border-red-500/30',
      focusRingColor: 'focus:ring-red-500',
      focusBorderColor: 'focus:border-red-500',
      shadow: 'shadow-[0_0_15px_rgba(220,38,38,0.4)]',
      buttonBg: 'bg-red-600 hover:bg-red-500 text-white',
      toggleActive: 'bg-red-500 text-white',
      icon: 'fa-user-secret',
      title: 'Acesso Admin',
      subtitle: 'Protocolo de Segurança GDN_IA',
  } 
  : { // Tema Usuário (Hacker Verde)
      textColor: 'text-green-400',
      borderColor: 'border-green-500/30',
      focusRingColor: 'focus:ring-green-500',
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-black font-mono">
      <div className={`w-full max-w-sm bg-black/80 backdrop-blur-md border ${theme.borderColor} rounded-lg ${theme.shadow} overflow-hidden animate-fade-in-scale`}>
        <div className={`p-6 border-b ${theme.borderColor} text-center bg-black/20`}>
          <i className={`fas ${isSignUp ? 'fa-user-plus' : theme.icon} text-4xl ${theme.textColor} mb-3 opacity-80 transition-all duration-300`}></i>
          <h1 className="text-xl font-bold tracking-widest text-gray-200 uppercase">{currentTitle}</h1>
          <p className={`text-xs ${theme.textColor}/80`}>{isSignUp ? 'Junte-se à plataforma de IA' : theme.subtitle}</p>
        </div>
        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-6">
            {message && (
              <div className={`p-3 text-xs rounded-md border ${message.type === 'error' ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-green-900/20 border-green-500/30 text-green-400'}`}>
                {message.text}
              </div>
            )}
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
    </div>
  );
};

export default LoginPage;