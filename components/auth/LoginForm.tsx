
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
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            const { data, error } = await api.update('app_users', { referred_by: referrerId }, { id: newUserId });
            
            if (!error && data && data.length > 0) {
                console.log(`Sucesso! Usuário vinculado ao afiliado ${referrerId}`);
                return;
            }
            
            attempts++;
            const delay = 1500 * attempts; 
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
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
        setReferralCode(ref);
        localStorage.setItem('gdn_referral', ref);
    } else {
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
        const allowed = await isDomainAllowed(email);
        if (!allowed) {
            setMessage({ type: 'error', text: 'Cadastro não permitido para este domínio de e-mail. Entre em contato com o administrador.' });
            setIsLoading(false);
            return;
        }

        const { data: signUpData, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    referral_code: referralCode 
                }
            }
        });

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            if (signUpData.user && referralCode) {
                linkUserToAffiliate(signUpData.user.id, referralCode);
            }

            setEmail('');
            setPassword('');
            setMessage({ type: 'success', text: 'Conta criada! Por favor, verifique seu email para confirmar.' });
            setIsSignUp(false);
            localStorage.removeItem('gdn_referral'); 
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
      textColor: 'text-red-500',
      borderColor: 'border-red-200',
      focusBorderColor: 'focus:border-red-500',
      shadow: 'shadow-lg shadow-red-100',
      buttonBg: 'bg-red-600 hover:bg-red-500 text-white',
      toggleActive: 'bg-red-500 text-white',
      icon: 'fa-user-secret',
      title: 'Acesso Admin',
      subtitle: 'Área Restrita',
  } 
  : { 
      textColor: 'text-[#263238]',
      borderColor: 'border-gray-200',
      focusBorderColor: 'focus:border-[#F39C12]',
      shadow: 'shadow-xl shadow-gray-200',
      buttonBg: 'bg-[#F39C12] hover:bg-orange-500 text-white',
      toggleActive: 'bg-[#263238] text-white',
      icon: 'fa-robot',
      title: 'Bem-vindo',
      subtitle: 'Gerador de Notícias Inteligente',
  };

  const currentTitle = isSignUp ? 'Criar Nova Conta' : theme.title;
  const buttonText = isLoading ? 'Processando...' : (isSignUp ? 'Registrar' : 'Entrar');

  const modalRoot = document.getElementById('modal-root');

  return (
    <>
      <div className={`w-full max-w-sm bg-white border ${theme.borderColor} rounded-2xl ${theme.shadow} overflow-hidden animate-fade-in-scale`}>
        <div className="p-8 text-center bg-white">
          <div className="w-16 h-16 bg-[#ECEFF1] rounded-full flex items-center justify-center mx-auto mb-4">
             <i className={`fas ${isSignUp ? 'fa-user-plus' : theme.icon} text-3xl text-[#263238] opacity-80`}></i>
          </div>
          <h1 className="text-2xl font-bold text-[#263238] mb-1">{currentTitle}</h1>
          <p className="text-sm text-gray-500">{isSignUp ? 'Junte-se à plataforma' : theme.subtitle}</p>
        </div>
        <div className="px-8 pb-8 pt-0">
          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className={`w-full bg-[#F5F7FA] border border-gray-200 text-[#263238] p-3 text-sm rounded-lg ${theme.focusBorderColor} focus:outline-none focus:ring-2 focus:ring-opacity-20 transition duration-200`}
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Senha</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className={`w-full bg-[#F5F7FA] border border-gray-200 text-[#263238] p-3 text-sm rounded-lg ${theme.focusBorderColor} focus:outline-none focus:ring-2 focus:ring-opacity-20 transition duration-200`}
                placeholder="••••••••"
              />
            </div>
            {isSignUp && referralCode && (
                <div className="text-xs text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-100 text-center font-medium">
                    <i className="fas fa-gift mr-1"></i> Você foi indicado! Código: <strong>{referralCode}</strong>
                </div>
            )}
            <button type="submit" disabled={isLoading}
              className={`w-full font-bold py-3.5 text-sm uppercase tracking-wide rounded-lg transition-all duration-200 shadow-md transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait ${theme.buttonBg}`}
            >
              {buttonText}
            </button>
          </form>
          <div className="mt-6 text-center text-xs">
            {isSignUp ? (
                <p className="text-gray-500">
                  Já tem uma conta?{' '}
                  <button onClick={() => setIsSignUp(false)} className="font-bold text-[#F39C12] hover:underline">Fazer Login</button>
                </p>
            ) : (
              <>
                <div className="flex justify-center items-center my-4">
                  <div className="bg-[#F5F7FA] p-1 rounded-lg flex">
                      <button onClick={() => setIsAdminMode(false)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${!isAdminMode ? 'bg-white text-[#263238] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Usuário</button>
                      <button onClick={() => setIsAdminMode(true)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${isAdminMode ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Admin</button>
                  </div>
                </div>
                {!isAdminMode && (
                    <p className="text-gray-500">
                      Não tem uma conta?{' '}
                      <button onClick={() => setIsSignUp(true)} className="font-bold text-[#F39C12] hover:underline">Criar conta grátis</button>
                    </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {message && modalRoot && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className={`w-full max-w-md bg-white rounded-xl shadow-2xl border-t-4 ${message.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
            <div className="p-6 text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${message.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                  <i className={`fas ${message.type === 'error' ? 'fa-exclamation-triangle' : 'fa-check'} text-2xl`}></i>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">{message.type === 'error' ? 'Erro' : 'Sucesso'}</h3>
              <p className="text-gray-600 mb-6 text-sm">{message.text}</p>
              <button 
                  onClick={() => setMessage(null)}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition focus:outline-none"
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