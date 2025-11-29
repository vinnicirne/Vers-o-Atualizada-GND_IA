

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../contexts/UserContext';
import { createApiKey, listApiKeys, revokeApiKey, generateWordPressPluginZip } from '../../services/developerService';
import { ApiKey } from '../../types';
import { Toast } from './Toast';
import { supabaseUrl, supabaseAnonKey } from '../../services/supabaseClient'; // Importar URLs do Supabase

export function DocumentationViewer() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'user_manual' | 'technical' | 'api' | 'updates'>('user_manual');
  
  // API Logic State
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showSqlFix, setShowSqlFix] = useState(false);
  
  // New State for Manual Gemini Key
  const [geminiKeyInput, setGeminiKeyInput] = useState('');

  // Add state for copied field to handle clipboard feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Carrega a chave do cache local ao montar
  useEffect(() => {
      const cachedKey = localStorage.getItem('gdn_gemini_key_cache');
      if (cachedKey) {
          setGeminiKeyInput(cachedKey);
      }
  }, []);

  useEffect(() => {
      if (activeTab === 'api' && user) {
          loadKeys();
      }
  }, [activeTab, user]);

  const loadKeys = async () => {
      if (!user) return;
      setLoadingKeys(true);
      setShowSqlFix(false);
      try {
          const keys = await listApiKeys(user.id);
          setApiKeys(keys);
      } catch (e: any) {
          console.error("Erro ao carregar chaves:", e);
          if (e.message === 'TABLE_NOT_FOUND') {
              setShowSqlFix(true);
          }
      } finally {
          setLoadingKeys(false);
      }
  };

  const handleCreateKey = async () => {
      if (!user || !newKeyName.trim()) return;
      try {
          const key = await createApiKey(user.id, newKeyName);
          setCreatedKey(key.full_key || null);
          setNewKeyName('');
          await loadKeys();
          setToast({ message: "Chave criada com sucesso!", type: 'success' });
      } catch (e: any) {
          console.error("Erro na criação:", e);
          if (e.message === 'TABLE_NOT_FOUND') {
              setShowSqlFix(true);
              setToast({ message: "Erro: Tabela de Chaves não encontrada. Veja instrução abaixo.", type: 'error' });
          } else {
              setToast({ message: `Erro ao criar chave: ${e.message}`, type: 'error' });
          }
      }
  };

  const handleRevokeKey = async (id: string) => {
      if (!window.confirm("Tem certeza? Qualquer sistema usando esta chave perderá acesso.")) return;
      try {
          await revokeApiKey(id);
          loadKeys();
          setToast({ message: "Chave revogada.", type: 'success' });
      } catch (e: any) {
          setToast({ message: `Erro ao revogar: ${e.message}`, type: 'error' });
      }
  };

  const handleDownloadPlugin = () => {
      if (!geminiKeyInput && !confirm("ATENÇÃO: Você não inseriu uma Chave Gemini. O plugin pode falhar com erro 'API Key not valid'. Deseja continuar mesmo assim?")) {
          return;
      }
      
      // Salva a chave no navegador para o futuro
      localStorage.setItem('gdn_gemini_key_cache', geminiKeyInput);
      
      generateWordPressPluginZip(geminiKeyInput);
      setToast({ message: "Download iniciado! Chave salva no navegador.", type: 'success' });
  };

  // Add handleCopy function for clipboard functionality
  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getTabClass = (tabName: string) => `px-4 py-2 rounded-md text-sm font-bold transition whitespace-nowrap ${activeTab === tabName ? 'bg-green-600 text-black' : 'text-gray-400 hover:text-white'}`;

  const schemaSql = `
-- ==============================================================================
-- SCHEMA COMPLETO DO SISTEMA GDN_IA (v1.6.4 - Idempotente & Seed - FIX CRÍTICO)
-- Execute este script no Editor SQL do Supabase.
-- Ele verifica se as tabelas existem antes de criar, evitando erros.
-- ==============================================================================

-- 1. Habilita extensão pgcrypto para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela de Usuários (Perfil Público)
CREATE TABLE IF NOT EXISTS public.app_users (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    full_name text,
    avatar_url text,
    role text DEFAULT 'user',
    status text DEFAULT 'active',
    plan text DEFAULT 'free',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    last_login timestamp with time zone,
    PRIMARY KEY (id)
);

-- Adiciona colunas novas de forma segura (Afiliados e Asaas)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_users' AND column_name='affiliate_code') THEN
        ALTER TABLE public.app_users ADD COLUMN affiliate_code text UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_users' AND column_name='referred_by') THEN
        ALTER TABLE public.app_users ADD COLUMN referred_by uuid REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_users' AND column_name='affiliate_balance') THEN
        ALTER TABLE public.app_users ADD COLUMN affiliate_balance numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_users' AND column_name='asaas_customer_id') THEN
        ALTER TABLE public.app_users ADD COLUMN asaas_customer_id text;
    END IF;
END $$;

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- 3. Tabela de Créditos
CREATE TABLE IF NOT EXISTS public.user_credits (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credits integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id)
);
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- 4. Tabela de Notícias/Conteúdo
CREATE TABLE IF NOT EXISTS public.news (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    titulo text,
    conteudo text,
    status text DEFAULT 'pending',
    tipo text DEFAULT 'news_generator',
    author_id uuid REFERENCES auth.users(id),
    sources jsonb,
    criado_em timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- 5. Tabela de Transações Financeiras
CREATE TABLE IF NOT EXISTS public.transactions (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    valor numeric NOT NULL,
    metodo text,
    status text,
    external_id text,
    metadata jsonb,
    data timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON public.transactions(external_id);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 6. Logs do Sistema de Afiliados
CREATE TABLE IF NOT EXISTS public.affiliate_logs (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    affiliate_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    source_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    amount numeric NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.affiliate_logs ENABLE ROW LEVEL SECURITY;

-- 7. Configurações Globais do Sistema
CREATE TABLE IF NOT EXISTS public.system_config (
    key text PRIMARY KEY,
    value jsonb,
    updated_by uuid REFERENCES auth.users(id),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- 8. Logs Gerais de Auditoria
CREATE TABLE IF NOT EXISTS public.logs (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    usuario_id uuid, -- Nullable, pois pode ser sistema ou visitante
    acao text NOT NULL,
    modulo text,
    detalhes jsonb,
    data timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- 9. Chaves de API para Desenvolvedores
CREATE TABLE IF NOT EXISTS public.api_keys (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    key_prefix text NOT NULL,
    key_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_used_at timestamp with time zone,
    status text DEFAULT 'active'
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 10. Memória do Usuário (Feedback e Preferências)
CREATE TABLE IF NOT EXISTS public.user_memory (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    chave text NOT NULL,
    valor text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

-- 11. Domínios Permitidos (Segurança)
CREATE TABLE IF NOT EXISTS public.allowed_domains (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    domain text UNIQUE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.allowed_domains ENABLE ROW LEVEL SECURITY;

-- 12. Logs de IA (Uso de Tokens)
CREATE TABLE IF NOT EXISTS public.ai_logs (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    usuario_id uuid REFERENCES auth.users(id),
    modelo_id text,
    tokens integer,
    custo numeric,
    data timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- 13. SEED DE DADOS (Planos Padrão)
-- Garante que o webhook funcione mesmo se o admin nunca tiver salvo configurações de planos.
-- ==============================================================================
DO $$
DECLARE
    default_plans jsonb := '[
        {"id": "free", "name": "Free", "credits": 3, "price": 0, "interval": "month", "isActive": true, "color": "gray", "expressCreditPrice": 15, "services": [{"key": "news_generator", "name": "GDN Notícias", "enabled": true, "creditsPerUse": 1}, {"key": "copy_generator", "name": "Gerador de Copy", "enabled": true, "creditsPerUse": 1}, {"key": "prompt_generator", "name": "Gerador de Prompts", "enabled": true, "creditsPerUse": 1}]},
        {"id": "basic", "name": "Básico", "credits": 25, "price": 49.99, "interval": "month", "isActive": true, "color": "blue", "expressCreditPrice": 9, "services": [{"key": "news_generator", "name": "GDN Notícias", "enabled": true, "creditsPerUse": 1}, {"key": "copy_generator", "name": "Gerador de Copy", "enabled": true, "creditsPerUse": 1}, {"key": "prompt_generator", "name": "Gerador de Prompts", "enabled": true, "creditsPerUse": 1}, {"key": "text_to_speech", "name": "Texto para Voz", "enabled": true, "creditsPerUse": 2}]},
        {"id": "standard", "name": "Standard", "credits": 50, "price": 99.99, "interval": "month", "isActive": true, "color": "green", "expressCreditPrice": 7, "services": [{"key": "news_generator", "name": "GDN Notícias", "enabled": true, "creditsPerUse": 1}, {"key": "copy_generator", "name": "Gerador de Copy", "name": "Gerador de Copy", "enabled": true, "creditsPerUse": 1}, {"key": "prompt_generator", "name": "Gerador de Prompts", "enabled": true, "creditsPerUse": 1}, {"key": "text_to_speech", "name": "Texto para Voz", "enabled": true, "creditsPerUse": 2}, {"key": "canva_structure", "name": "Social Media", "enabled": true, "creditsPerUse": 3}, {"key": "image_generation", "name": "Studio de Arte IA", "enabled": true, "creditsPerUse": 5}, {"key": "institutional_website_generator", "name": "Site Institucional", "enabled": true, "creditsPerUse": 25}]},
        {"id": "premium", "name": "Premium", "credits": 100, "price": 199.00, "interval": "month", "isActive": true, "color": "purple", "expressCreditPrice": 5, "services": [{"key": "news_generator", "name": "GDN Notícias", "enabled": true, "creditsPerUse": 1}, {"key": "copy_generator", "name": "Gerador de Copy", "enabled": true, "creditsPerUse": 1}, {"key": "prompt_generator", "name": "Gerador de Prompts", "enabled": true, "creditsPerUse": 1}, {"key": "text_to_speech", "name": "Texto para Voz", "enabled": true, "creditsPerUse": 2}, {"key": "canva_structure", "name": "Social Media", "enabled": true, "creditsPerUse": 3}, {"key": "image_generation", "name": "Studio de Arte IA", "enabled": true, "creditsPerUse": 5}, {"key": "institutional_website_generator", "name": "Site Institucional", "enabled": true, "creditsPerUse": 25}, {"key": "landingpage_generator", "name": "Landing Pages", "enabled": true, "creditsPerUse": 15}]}
    ]';
BEGIN
    INSERT INTO public.system_config (key, value, updated_at)
    VALUES ('all_plans', default_plans, now())
    ON CONFLICT (key) DO NOTHING;
END $$;


-- ==============================================================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- Removemos e recriamos para garantir que estejam atualizadas sem erro
-- ==============================================================================

DO $$
BEGIN
    -- APP USERS
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.app_users;
    CREATE POLICY "Public profiles are viewable by everyone" ON public.app_users FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.app_users;
    CREATE POLICY "Users can insert their own profile" ON public.app_users FOR INSERT WITH CHECK (auth.uid() = id);

    DROP POLICY IF EXISTS "Users can update own profile" ON public.app_users;
    CREATE POLICY "Users can update own profile" ON public.app_users FOR UPDATE USING (auth.uid() = id);

    -- USER CREDITS
    DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
    CREATE POLICY "Users can view own credits" ON public.user_credits FOR SELECT USING (auth.uid() = user_id);

    -- TRANSACTIONS
    DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
    CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = usuario_id);

    -- API KEYS
    DROP POLICY IF EXISTS "Users manage own keys" ON public.api_keys;
    CREATE POLICY "Users manage own keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id);

    -- SYSTEM CONFIG (Leitura pública para o app funcionar, Escrita Admin)
    DROP POLICY IF EXISTS "Read system config" ON public.system_config;
    CREATE POLICY "Read system config" ON public.system_config FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Admins update config" ON public.system_config;
    CREATE POLICY "Admins update config" ON public.system_config FOR ALL USING (
        exists (select 1 from public.app_users where id = auth.uid() and role in ('admin', 'super_admin'))
    );

    -- NEWS
    DROP POLICY IF EXISTS "Users read approved or own news" ON public.news;
    CREATE POLICY "Users read approved or own news" ON public.news FOR SELECT USING (
        status = 'approved' OR auth.uid() = author_id
    );
    DROP POLICY IF EXISTS "Users create news" ON public.news;
    CREATE POLICY "Users create news" ON public.news FOR INSERT WITH CHECK (auth.uid() = author_id);
    DROP POLICY IF EXISTS "Users update own news" ON public.news;
    CREATE POLICY "Users update own news" ON public.news FOR UPDATE USING (auth.uid() = author_id);

    -- AFFILIATE LOGS
    DROP POLICY IF EXISTS "View own affiliate logs" ON public.affiliate_logs;
    CREATE POLICY "View own affiliate logs" ON public.affiliate_logs FOR SELECT USING (auth.uid() = affiliate_id);

    -- LOGS GERAIS
    DROP POLICY IF EXISTS "Insert logs" ON public.logs;
    CREATE POLICY "Insert logs" ON public.logs FOR INSERT WITH CHECK (true); -- Permitir insert de qualquer um (auditoria)

    DROP POLICY IF EXISTS "Admins view logs" ON public.logs;
    CREATE POLICY "Admins view logs" ON public.logs FOR SELECT USING (
        exists (select 1 from public.app_users where id = auth.uid() and role in ('admin', 'super_admin'))
    );

    -- ALLOWED DOMAINS
    DROP POLICY IF EXISTS "Public read domains" ON public.allowed_domains;
    CREATE POLICY "Public read domains" ON public.allowed_domains FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Admins manage domains" ON public.allowed_domains;
    CREATE POLICY "Admins manage domains" ON public.allowed_domains FOR ALL USING (
        exists (select 1 from public.app_users where id = auth.uid() and role in ('admin', 'super_admin'))
    );

    -- USER MEMORY
    DROP POLICY IF EXISTS "Users manage own memory" ON public.user_memory;
    CREATE POLICY "Users manage own memory" ON public.user_memory FOR ALL USING (auth.uid() = user_id);

END $$;`;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="border-b border-green-900/30 flex justify-between items-center flex-wrap gap-4">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <button onClick={() => setActiveTab('user_manual')} className={getTabClass('user_manual')}><i className="fas fa-book mr-2"></i>Manual Usuário</button>
          <button onClick={() => setActiveTab('technical')} className={getTabClass('technical')}><i className="fas fa-code mr-2"></i>Visão Técnica</button>
          <button onClick={() => setActiveTab('api')} className={getTabClass('api')}><i className="fas fa-plug mr-2"></i>API / Devs</button>
          <button onClick={() => setActiveTab('updates')} className={getTabClass('updates')}><i className="fas fa-sync-alt mr-2"></i>Updates & SQL</button>
        </nav>
        {activeTab === 'api' && (
             <button
                onClick={handleDownloadPlugin}
                className="px-4 py-2 text-sm font-bold text-black bg-purple-600 rounded-lg hover:bg-purple-500 transition-all shadow-md shadow-purple-600/20"
            >
                <i className="fab fa-wordpress mr-2"></i> Baixar Plugin WP
            </button>
        )}
      </div>

      <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
        {activeTab === 'user_manual' && (
          <div className="prose prose-invert max-w-none text-gray-300">
            {/* Conteúdo do MANUAL_DO_USUARIO.md aqui */}
            <h1 className="text-3xl font-bold text-white mb-4">🚀 Guia Oficial do Usuário - GDN_IA</h1>
            <p className="text-gray-300 mb-6">
              Bem-vindo ao <strong>GDN_IA</strong>! Este é o seu manual completo para dominar nossa suíte de criação inteligente. Aqui você aprenderá a gerar notícias, criar artes, desenvolver landing pages e muito mais, utilizando o poder da Inteligência Artificial.
            </p>

            <h2 className="text-2xl font-bold text-green-400 mt-8 mb-4">🏁 1. Primeiros Passos</h2>
            <h3 className="text-xl font-bold text-white mt-4 mb-2">Testar Grátis (Modo Visitante)</h3>
            <p className="text-gray-300 mb-2">
              Se você ainda não tem conta, pode experimentar o sistema imediatamente!
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-300">
              <li><strong>Acesso:</strong> Basta entrar no site.</li>
              <li><strong>Créditos:</strong> Você recebe <strong>3 créditos gratuitos</strong> para testar ferramentas básicas (Notícias, Copy, Prompts).</li>
              <li><strong>Limitações:</strong> Ferramentas avançadas (Imagens, Sites, Áudio) aparecerão com um cadeado 🔒. Para desbloquear e salvar seu histórico, crie uma conta.</li>
            </ul>

            <h3 className="text-xl font-bold text-white mt-4 mb-2">Acessando sua Conta (Login)</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-300">
              <li><strong>Login:</strong> Utilize seu e-mail e senha cadastrados.</li>
              <li><strong>Dashboard:</strong> Assim que entrar, você verá o <strong>Painel Principal</strong>. No topo, você encontra seu <strong>Plano Atual</strong> e seu <strong>Saldo de Créditos</strong>.</li>
              <li><strong>Menu de Ferramentas:</strong> Logo abaixo, você verá uma grade de ícones.</li>
            </ul>

            <h2 className="text-2xl font-bold text-green-400 mt-8 mb-4">🛠️ 2. Ferramentas Criativas (Creator Suite)</h2>
            <h3 className="text-xl font-bold text-white mt-4 mb-2">📰 GDN Notícias (News Generator) - Com SEO Avançado</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-300">
              <li>Selecione "GDN Notícias".</li>
              <li>Digite o tema. <em>Ex: "Resultados da rodada do campeonato brasileiro".</em></li>
              <li>Clique em <strong>"Gerar Conteúdo"</strong>.</li>
              <li><strong>Novo Painel de Resultados:</strong> Título, Conteúdo e <strong>SEO Scorecard</strong> com Palavra-Chave Foco, Slug e Meta Descrição.</li>
            </ul>

            <h3 className="text-xl font-bold text-white mt-4 mb-2">🏢 Site Institucional (Novo)</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-300">
              <li>Cria sites corporativos completos (Home, Sobre, Serviços, Contato) em uma única página.</li>
              <li>Define o <strong>Estilo Visual</strong> e <strong>Cor da Marca</strong>.</li>
              <li>O sistema abrirá o Editor Visual para você ver e exportar o site.</li>
            </ul>

            <h3 className="text-xl font-bold text-white mt-4 mb-2">🎨 Studio de Arte IA (Image Generation)</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-300">
              <li>Cria imagens exclusivas a partir de texto.</li>
              <li>Escolha o <strong>Estilo</strong> (ex: Fotorealista, Cyberpunk) e o <strong>Formato</strong> (Quadrado, Paisagem).</li>
              <li>Use o Editor para ajustar brilho, contraste e aplicar filtros antes de baixar.</li>
            </ul>

            <h3 className="text-xl font-bold text-white mt-4 mb-2">🌐 Gerador de Landing Page</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-300">
              <li>Cria páginas de vendas ou captura completas.</li>
              <li>O sistema abre um editor onde você pode ver como fica no celular, copiar o código HTML ou exportar o arquivo pronto.</li>
            </ul>

            <h3 className="text-xl font-bold text-white mt-4 mb-2">📱 Editor Visual (Social Media)</h3>
            <p className="text-gray-300 mb-4">Gera layouts prontos para redes sociais. Descreva o post (ex: "Promoção de Natal, fundo vermelho") e receba o design codificado.</p>

            <h3 className="text-xl font-bold text-white mt-4 mb-2">🗣️ Texto para Voz (Text-to-Speech)</h3>
            <p className="text-gray-300 mb-4">Transforma qualquer texto escrito em áudio narrado por IA. Ideal para criar narrações para seus vídeos ou notícias.</p>

            <h3 className="text-xl font-bold text-white mt-4 mb-2">✍️ Gerador de Copy & Prompts</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-300">
              <li><strong>Gerador de Copy:</strong> Cria textos persuasivos para anúncios (Facebook Ads, Google Ads).</li>
              <li><strong>Gerador de Prompts:</strong> Cria instruções perfeitas para usar em outras IAs (ChatGPT, Midjourney).</li>
            </ul>

            <h2 className="text-2xl font-bold text-green-400 mt-8 mb-4">🤝 3. Programa de Afiliados (Ganhe Dinheiro)</h2>
            <ul className="list-disc pl-6 mb-4 text-gray-300">
              <li>Clique no ícone de <strong>Aperto de Mão</strong> (🤝) no topo.</li>
              <li>Copie seu link exclusivo.</li>
              <li>Ganhe <strong>20% de comissão</strong> recorrente sobre todas as compras dos seus indicados.</li>
              <li><strong>Novo:</strong> Fique atento ao popup de convite dourado para acessar rapidamente seu painel.</li>
            </ul>

            <h2 className="text-2xl font-bold text-green-400 mt-8 mb-4">💎 4. Planos e Créditos</h2>
            <p className="text-gray-300 mb-4">
              O GDN_IA funciona com um sistema de economia baseada em créditos.
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-300">
              <li><strong>Texto Simples:</strong> 1 Crédito.</li>
              <li><strong>Imagens e Artes:</strong> 3 Créditos.</li>
              <li><strong>Landing Pages:</strong> 5 Créditos.</li>
              <li><strong>Sites Institucionais:</strong> 8 Créditos.</li>
            </ul>
            <p className="text-gray-300 mb-4">
              <strong>Gerenciando seu Plano:</strong> Clique no botão <strong>"Planos"</strong> ou no ícone de moedas para fazer upgrade ou comprar pacotes de créditos avulsos (Recarga Expressa).
            </p>

            <h2 className="text-2xl font-bold text-green-400 mt-8 mb-4">🧠 5. Memória e Feedback</h2>
            <p className="text-gray-300 mb-4">
              A IA aprende com você! Após cada geração, dê uma nota de 0 a 10. O sistema memoriza seus gostos (notas altas) e evita seus desgostos (notas baixas) nas próximas gerações.
            </p>

            <h2 className="text-2xl font-bold text-green-400 mt-8 mb-4">❓ Dicas de Uso</h2>
            <p className="text-gray-300 mb-4">
              <strong>Organização na hora de publicar:</strong> Use os botões de "Copiar" individuais. Copie primeiro o <strong>Título</strong> para o campo de título do seu Blog, depois o **Conteúdo** para o corpo, e por fim use os dados do **SEO Scorecard** (Meta Descrição e Slug) nos campos de plugin de SEO (como Yoast ou Rank Math).
            </p>
          </div>
        )}

        {activeTab === 'technical' && (
          <div className="prose prose-invert max-w-none text-gray-300">
            {/* Conteúdo do DOCUMENTATION_TECHNICAL.md aqui */}
            <h1 className="text-3xl font-bold text-white mb-4">🏗️ Documentação Técnica do Sistema - GDN_IA</h1>

            <h2 className="text-2xl font-bold text-green-400 mt-8 mb-4">1. Visão Geral</h2>
            <h3 className="text-xl font-bold text-white mt-4 mb-2">Nome do Sistema</h3>
            <p className="text-gray-300 mb-4"><strong>GDN_IA</strong> (Gerador de Notícias Inteligente & Creator Suite)</p>

            <h3 className="text-xl font-bold text-white mt-4 mb-2">Objetivo Principal</h3>
            <p className="text-gray-300 mb-4">
              O GDN_IA é uma plataforma SaaS (Software as a Service) focada em <strong>Inteligência Artificial Generativa</strong>. O sistema permite que usuários criem diversos tipos de conteúdo — notícias, imagens, sites, copys e áudio — utilizando um sistema híbrido de acesso (Visitante/Logado).
            </p>

            <h3 className="text-xl font-bold text-white mt-4 mb-2">Tecnologias Utilizadas</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-300">
              <li><strong>Frontend:</strong> React 18, Vite, TypeScript.</li>
              <li><strong>Estilização:</strong> Tailwind CSS, FontAwesome.</li>
              <li><strong>Backend / BaaS:</strong> Supabase (PostgreSQL, Auth, Realtime).</li>
              <li><strong>Inteligência Artificial:</strong>
                <ul className="list-circle pl-6">
                  <li>Google Gemini API (`gemini-2.5-flash`, `gemini-2.5-flash-preview-tts`) para texto e áudio.</li>
                  <li>Pollinations.ai para geração de imagens.</li>
                </ul>
              </li>
              <li><strong>Editor Visual:</strong> GrapesJS (para Landing Pages e Sites).</li>
              <li><strong>SEO Engine:</strong> Algoritmos proprietários para análise léxica e geração de metadados.</li>
            </ul>

            <h2 className="text-2xl font-bold text-green-400 mt-8 mb-4">2. Arquitetura de Funcionalidades</h2>
            <h3 className="text-xl font-bold text-white mt-4 mb-2">Modo Visitante (Guest Mode)</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-300">
              <li><strong>Estado:</strong> Utiliza `localStorage.getItem('gdn_guest_credits')`.</li>
              <li><strong>Inicialização:</strong> Se a chave não existir, inicia com 3 créditos.</li>
              <li><strong>Restrições:</strong> O componente `ContentGenerator.tsx` recebe uma prop `guestAllowedModes`. Se o usuário não estiver logado (`!user`) e tentar acessar um modo fora da lista permitida (ex: Imagens), um modal de bloqueio (`showFeatureLockModal`) é exibido. Se os créditos locais acabarem, o modal `showGuestLimitModal` bloqueia a ação.</li>
            </ul>

            <h3 className="text-xl font-bold text-white mt-4 mb-2">Motor de SEO (`services/seoService.ts`)</h3>
            <p className="text-gray-300 mb-4">Um sistema avançado para garantir pontuação alta em ferramentas como Yoast/Rank Math.</p>
            <ol className="list-decimal pl-6 mb-4 text-gray-300">
              <li><strong>Engenharia Reversa de Keyword (Golden Keyword):</strong> A função `suggestFocusKeyword` tokeniza o título e os primeiros 300 caracteres do conteúdo, procurando por interseções e priorizando bigramas.</li>
              <li><strong>Otimização de Metadados:</strong> `generateOptimizedTags` cria matematicamente títulos e descrições dentro dos limites de caracteres do Google (Title &lt; 60, Meta &lt; 160).</li>
              <li><strong>Análise de Score:</strong> Calcula uma pontuação de 0 a 100 baseada em 5 critérios.</li>
            </ol>

            <h3 className="text-xl font-bold text-white mt-4 mb-2">Processamento de Texto (`DashboardPage.tsx`)</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-300">
              <li><strong>Regex de Limpeza:</strong> A função `extractTitleAndContent` remove prefixos comuns gerados por LLMs.</li>
              <li><strong>Separação:</strong> O texto é dividido em título e conteúdo.</li>
              <li><strong>Display:</strong> O componente `ResultDisplay` renderiza dois boxes visuais separados, cada um com seu botão de cópia.</li>
            </ul>

            <h2 className="text-2xl font-bold text-green-400 mt-8 mb-4">3. Autenticação e Segurança</h2>
            <h3 className="text-xl font-bold text-white mt-4 mb-2">Fluxo de Autenticação</h3>
            <p className="text-gray-300 mb-4">O sistema utiliza o <strong>Supabase Auth</strong>. A sessão é persistida e monitorada via `UserContext.tsx`.</p>

            <h3 className="text-xl font-bold text-white mt-4 mb-2">Segurança de Domínios (`services/adminService.ts`)</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-300">
              <li><strong>Blacklist Interna:</strong> Bloqueia domínios temporários.</li>
              <li><strong>Validação Híbrida:</strong> Configurada via painel Admin (Modo Estrito (Allowlist) ou Modo DNS (consulta pública de registros MX)).</li>
            </ul>

            <h2 className="text-2xl font-bold text-green-400 mt-8 mb-4">4. Banco de Dados e Afiliados</h2>
            <h3 className="text-xl font-bold text-white mt-4 mb-2">Tabelas Principais</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-300">
              <li><strong>`app_users`</strong>: Perfil público.</li>
              <li><strong>`user_credits`</strong>: Saldo.</li>
              <li><strong>`news`</strong>: Histórico de conteúdo.</li>
              <li><strong>`transactions`</strong>: Histórico financeiro.</li>
              <li><strong>`affiliate_logs`</strong>: Registro de comissões.</li>
            </ul>

            <h3 className="text-xl font-bold text-white mt-4 mb-2">Sistema de Afiliados</h3>
            <ol className="list-decimal pl-6 mb-4 text-gray-300">
              <li><strong>Tracking:</strong> Parâmetro URL `?ref=CODE` salvo no `localStorage`.</li>
              <li><strong>Vínculo:</strong> No cadastro (`signUp`), o código é lido e o ID do afiliado é salvo em `referred_by`.</li>
              <li><strong>Comissão:</strong> Script `processAffiliateCommission` roda após cada transação aprovada, creditando 20% ao afiliado pai.</li>
            </ol>

            <h2 className="text-2xl font-bold text-green-400 mt-8 mb-4">5. Serviços e Logs</h2>
            <h3 className="text-xl font-bold text-white mt-4 mb-2">`services/loggerService.ts`</h3>
            <p className="text-gray-300 mb-4">Logs centralizados operando em modo <em>Fire-and-Forget</em> para performance. Registra ações críticas (geração de conteúdo, alterações admin, erros de sistema).</p>

            <h3 className="text-xl font-bold text-white mt-4 mb-2">`services/geminiService.ts`</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-300">
              <li><strong>System Prompt:</strong> Instruções atualizadas para forçar a IA a colocar a palavra-chave no primeiro parágrafo (crucial para o Score 100 de SEO).</li>
              <li><strong>Grounding:</strong> Integração com Google Search para notícias recentes.</li>
            </ul>

            <p className="text-gray-500 mt-8"><em>Documentação técnica atualizada para o sistema GDN_IA v1.0.7.</em></p>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="prose prose-invert max-w-none text-gray-300">
            <h1 className="text-3xl font-bold text-green-400 mb-4">API / Desenvolvimento</h1>
            <p className="text-gray-400 mb-6">
              Esta seção detalha como integrar seu sistema externo (como um plugin WordPress, aplicativo móvel ou outro backend) com o GDN_IA.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4">1. API de Autenticação e Dados (Supabase REST)</h2>
            <p className="text-gray-400 mb-4">
              A autenticação e o acesso aos dados do usuário (créditos, perfil, histórico) são feitos diretamente através da API REST do Supabase.
            </p>

            <h3 className="text-xl font-bold text-green-400 mb-2">Detalhes do Projeto Supabase</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-300 space-y-1">
              <li><strong>URL Base da API:</strong> <code className="bg-gray-800 text-yellow-300 p-1 rounded text-sm">{supabaseUrl}</code></li>
              <li><strong>Anon Key:</strong> <code className="bg-gray-800 text-yellow-300 p-1 rounded text-sm">{supabaseAnonKey}</code> (Chave pública para inicialização do cliente Supabase e Auth)</li>
            </ul>

            <h3 className="text-xl font-bold text-green-400 mt-6 mb-2">Endpoints Principais</h3>
            <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-green-300 uppercase bg-black/40">
                        <tr>
                            <th className="px-4 py-2">Recurso</th>
                            <th className="px-4 py-2">Método</th>
                            <th className="px-4 py-2">Endpoint</th>
                            <th className="px-4 py-2">Descrição</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="bg-gray-950/50 border-b border-green-900/20">
                            <td className="px-4 py-2 font-bold">Login</td>
                            <td className="px-4 py-2"><code className="bg-gray-800 p-1 rounded">POST</code></td>
                            <td className="px-4 py-2"><code className="bg-gray-800 p-1 rounded">{supabaseUrl}/auth/v1/token?grant_type=password</code></td>
                            <td className="px-4 py-2">Obtém <code>access_token</code> e <code>refresh_token</code>.</td>
                        </tr>
                        <tr className="bg-gray-950/50 border-b border-green-900/20">
                            <td className="px-4 py-2 font-bold">Créditos</td>
                            <td className="px-4 py-2"><code className="bg-gray-800 p-1 rounded">GET</code></td>
                            <td className="px-4 py-2"><code className="bg-gray-800 p-1 rounded">{supabaseUrl}/rest/v1/user_credits?user_id=eq.[USER_ID]</code></td>
                            <td className="px-4 py-2">Consulta saldo do usuário.</td>
                        </tr>
                        <tr className="bg-gray-950/50 border-b border-green-900/20">
                            <td className="px-4 py-2 font-bold">Consumo Créd.</td>
                            <td className="px-4 py-2"><code className="bg-gray-800 p-1 rounded">PATCH</code></td>
                            <td className="px-4 py-2"><code className="bg-gray-800 p-1 rounded">{supabaseUrl}/rest/v1/user_credits?user_id=eq.[USER_ID]</code></td>
                            <td className="px-4 py-2">Deduz créditos após uso. Requer token JWT válido.</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <h2 className="text-2xl font-bold text-white mb-4 mt-8">2. API de Geração de Conteúdo (Google Gemini API)</h2>
            <p className="text-gray-400 mb-4">
              Para gerar conteúdo diretamente (sem passar pelo nosso sistema de créditos, útil para integrações mais profundas), você pode usar a API do Google Gemini.
            </p>

            <h3 className="text-xl font-bold text-green-400 mb-2">Sua Chave Gemini</h3>
            <p className="text-gray-400 mb-2">
              Esta é a chave que será utilizada para autenticar suas requisições diretamente com a Google Gemini API. Mantenha-a segura!
            </p>
            <div className="relative mb-6">
                <input 
                    type="text" 
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    placeholder="Cole sua Gemini API Key aqui (ex: AIzaSy...)"
                    className="w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0"
                />
                 <button 
                    onClick={() => handleCopy(geminiKeyInput, 'gemini_key_input')}
                    className="absolute top-1/2 right-3 -translate-y-1/2 p-1.5 rounded transition shadow-sm border bg-gray-800 text-gray-400 border-gray-600 hover:text-white"
                    title="Copiar Chave"
                >
                    <i className={`fas ${copiedField === 'gemini_key_input' ? 'fa-check' : 'fa-copy'}`}></i>
                </button>
            </div>


            <h2 className="text-2xl font-bold text-white mb-4 mt-8">3. Webhooks de Pagamento (Mercado Pago & Asaas)</h2>
            <p className="text-gray-400 mb-4">
              Para o recebimento automático de pagamentos e a liberação de benefícios (créditos, planos), configure os webhooks dos seus gateways de pagamento para apontarem para as funções do Supabase.
              Lembre-se de fazer o deploy das funções <code className="bg-gray-800 p-1 rounded">webhook</code>, <code className="bg-gray-800 p-1 rounded">mp-pagar</code> e <code className="bg-gray-800 p-1 rounded">asaas-pagar</code> no seu Supabase.
            </p>

            <h3 className="text-xl font-bold text-green-400 mb-2">URLs para Configuração:</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-300 space-y-2">
              <li>
                <strong>Mercado Pago (IPN / Webhook):</strong><br/>
                <code className="bg-gray-800 text-yellow-300 p-1 rounded text-sm break-all">{supabaseUrl}/functions/v1/webhook?provider=mercadopago</code>
              </li>
              <li>
                <strong>Asaas (Webhook):</strong><br/>
                <code className="bg-gray-800 text-yellow-300 p-1 rounded text-sm break-all">{supabaseUrl}/functions/v1/webhook?provider=asaas</code>
              </li>
            </ul>
            <p className="text-gray-500 text-sm mt-4">
                <i className="fas fa-info-circle mr-2"></i><strong>Importante:</strong> Certifique-se de que o token de autenticação no Asaas esteja **vazio** se você não implementou a verificação na sua função `webhook`. A versão atual da função não o exige.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4 mt-8">4. Chaves de API para Acesso ao Backend</h2>
            <p className="text-gray-400 mb-4">
              Para acessar as tabelas do seu banco de dados Supabase via sistemas externos de forma controlada (sem login de usuário), você pode gerar chaves de API. Use com cautela!
            </p>

            <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
              <h3 className="text-lg font-bold text-green-400 mb-3">Minhas Chaves de API</h3>
              {loadingKeys ? (
                <p className="text-gray-500">Carregando chaves...</p>
              ) : showSqlFix ? (
                <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg text-red-400 text-sm">
                    <p className="font-bold mb-2">Tabela 'api_keys' não encontrada!</p>
                    <p>O schema do banco de dados não está completo. Por favor, vá para a aba "Updates & SQL" e execute o script SQL completo no seu Supabase.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.length === 0 ? (
                    <p className="text-gray-500">Nenhuma chave de API criada ainda.</p>
                  ) : (
                    apiKeys.map((key) => (
                      <div key={key.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-md border border-gray-700">
                        <div>
                          <p className="text-white font-bold">{key.name}</p>
                          <p className="text-sm text-gray-400 font-mono">{key.key_prefix}</p>
                          <p className="text-xs text-gray-500">Criada em: {new Date(key.created_at).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
                        >
                          Revogar
                        </button>
                      </div>
                    ))
                  )}
                  {createdKey && (
                      <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 text-yellow-300 rounded-lg text-sm">
                          <p className="font-bold mb-1">SUA NOVA CHAVE (Copie AGORA!)</p>
                          <code className="block bg-black p-2 rounded break-all">{createdKey}</code>
                          <p className="mt-1 text-xs text-gray-400">Esta chave só é mostrada uma vez por segurança.</p>
                      </div>
                  )}
                  <div className="mt-4">
                    <label htmlFor="newKeyName" className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">Nome da Chave</label>
                    <div className="flex gap-2">
                        <input
                            id="newKeyName"
                            type="text"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="Minha integração com Zapier"
                            className="flex-grow bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0"
                        />
                        <button
                            onClick={handleCreateKey}
                            disabled={!newKeyName.trim()}
                            className="px-4 py-2 text-sm font-bold text-black bg-green-600 rounded-lg hover:bg-green-500 transition disabled:opacity-50"
                        >
                            Criar Chave
                        </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'updates' && (
            <div className="prose prose-invert max-w-none text-gray-300">
                <h1 className="text-3xl font-bold text-green-400 mb-4">Atualizações & SQL</h1>
                <p className="text-gray-400 mb-6">
                    Esta seção contém o script SQL mais recente para atualizar a estrutura do seu banco de dados.
                    Ele é idempotente, o que significa que você pode executá-lo várias vezes sem causar erros.
                </p>

                <h2 className="text-2xl font-bold text-white mb-4">Script de Instalação/Atualização do Schema (Recomendado)</h2>
                <p className="text-gray-400 mb-4">
                    <strong>Instruções:</strong> Copie todo o código abaixo, cole no **Editor SQL** do seu painel Supabase e clique em "Run".
                </p>
                <div className="relative bg-gray-950/50 border border-gray-700 text-green-300 p-4 rounded-md text-xs whitespace-pre-wrap overflow-x-auto max-h-[70vh]">
                    <pre><code className="language-sql">{schemaSql}</code></pre>
                    <button 
                        onClick={() => handleCopy(schemaSql, 'schema_sql')}
                        className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                        title="Copiar SQL"
                    >
                        <i className={`fas ${copiedField === 'schema_sql' ? 'fa-check' : 'fa-copy'} mr-1`}></i> {copiedField === 'schema_sql' ? 'Copiado!' : 'Copiar'}
                    </button>
                </div>
                <p className="text-gray-500 text-sm mt-4">
                    Este script garante que todas as tabelas, colunas e políticas de segurança (RLS) estejam corretas, além de semear os dados de planos iniciais.
                </p>
            </div>
        )}
      </div>
    </div>
  );
}