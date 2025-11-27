
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../services/supabaseClient';
import { isDomainAllowed } from '../../services/adminService'; 
import { api } from '../../services/api'; // Import api proxy for updates
import type { User } from '../../types';

const performLogin = async (email: string, password: string): Promise<User> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
            throw new Error('Credenciais inválidas. Verifique seu email e senha.');
        }
        if (authError.message.toLowerCase().includes('failed to fetch')) {
            throw new Error('Falha de comunicação com o servidor. Verifique sua conexão.');
        }
        throw new Error('Falha na autenticação: ' + authError.message);
    }

    if (!authData.user) throw new Error('Usuário não encontrado após a autenticação.');

    // REGISTRAR ÚLTIMO LOGIN
    try {
        await supabase
            .from('app_users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', authData.user.id);
    } catch (e) {
        console.warn("Não foi possível atualizar o último login:", e);
    }

    const { data: profile, error: profileError } = await supabase
        .from('app_users')
        .select('id, full_name, role, status, plan, created_at, last_login, affiliate_code, affiliate_balance')
        .eq('id', authData.user.id)
        .single();
    
    if (profileError) {
        await supabase.auth.signOut();
        throw new Error('Falha ao consultar o perfil do usuário: ' + profileError.message);
    }
    
    if (!profile) {
        await supabase.auth.signOut();
        throw new Error('Perfil de usuário não encontrado.');
    }

    if (profile.status === 'banned') {
        await supabase.auth.signOut();
        throw new Error('Sua conta foi suspensa permanentemente.');
    }

    if (profile.status === 'inactive') {
        await supabase.auth.signOut();
        throw new Error('Sua conta está inativa.');
    }

    const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', authData.user.id)
        .single();
    
    if (creditsError) {
        console.error('Falha ao consultar os créditos do usuário:', creditsError.message);
    }

    const fullUser: User = {
        ...profile,
        email: authData.user.email!,
        credits: creditsData?.credits ?? 0,
    };
    
    return fullUser;
};

// Helper function to link user to affiliate with retries
const linkUserToAffiliate = async (newUserId: string, referralCode: string) => {
    console.log(`Tentando vincular novo usuário ${newUserId} ao código ${referralCode}...`);
    
    try {
        // 1. Encontrar o ID do afiliado dono do código
        const { data: referrers } = await api.select('app_users', { affiliate_code: referralCode });
        
        if (!referrers || referrers.length === 0) {
            console.warn(`Código de afiliado inválido ou não encontrado: ${referralCode}`);
            return;
        }
        
        const referrerId = referrers[0].id;
        
        if (referrerId === newUserId) {
            console.warn("Usuário tentou se auto-indicar. Vínculo ignorado.");
            return;
        }

        // 2. Tentar atualizar o usuário com retries (backoff exponencial)
        // Isso é necessário pois o trigger do Supabase pode levar alguns segundos para criar a row em 'app_users'
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            // Tenta atualizar
            // IMPORTANTE: api.update retorna data[] com as linhas afetadas.
            // Se o usuário ainda não existe (delay do trigger), data será vazio.
            const { data, error } = await api.update('app_users', { referred_by: referrerId }, { id: newUserId });
            
            if (!error && data && data.length > 0) {
                console.log(`Sucesso! Usuário vinculado ao afiliado ${referrerId}`);
                return;
            }
            
            // Se falhar (provavelmente row not found), espera e tenta de novo
            attempts++;
            const delay = 1500 * attempts; // Aumentado delay para 1.5s, 3s... para dar tempo ao DB
            console.log(`Tentativa ${attempts} falhou (User not ready?). Retentando em ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        console.error("Falha ao vincular afiliado após várias tentativas.");
        
    } catch (e) {
        console.error("Erro crítico no processo de vínculo de afiliado:", e);
    }
};

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    // Capture Referral Code from URL
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
        setReferralCode(ref);
        // Persist for page reloads during signup process
        localStorage.setItem('gdn_referral', ref);
    } else {
        // Try local storage if URL param is gone
        const stored = localStorage.getItem('gdn_referral');
        if (stored) setReferralCode(stored);
    }

    if (isSignUp) {
        setIsAdminMode(false);
    }
  }, [isSignUp]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (isSignUp) {
        // --- DOMAIN VALIDATION ---
        const allowed = await isDomainAllowed(email);
        if (!allowed) {
            setMessage({ type: 'error', text: 'Cadastro não permitido para este domínio de e-mail. Entre em contato com o administrador.' });
            setIsLoading(false);
            return;
        }
        // -------------------------

        const { data: signUpData, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    // Pass referral code to trigger (if configured) or handle manually after
                    referral_code: referralCode 
                }
            }
        });

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            // MANUAL REFERRAL LINKING
            // Inicia o processo de vínculo em background (sem await para não travar a UI)
            if (signUpData.user && referralCode) {
                linkUserToAffiliate(signUpData.user.id, referralCode);
            }

            setEmail('');
            setPassword('');
            setMessage({ type: 'success', text: 'Conta criada! Por favor, verifique seu email para confirmar.' });
            setIsSignUp(false);
            localStorage.removeItem('gdn_referral'); // Clean up
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
            {isSignUp && referralCode && (
                <div className="text-xs text-yellow-500 bg-yellow-900/20 p-2 rounded border border-yellow-700/30 text-center">
                    <i className="fas fa-gift mr-1"></i> Você foi indicado! Código: <strong>{referralCode}</strong>
                </div>
            )}
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
}
