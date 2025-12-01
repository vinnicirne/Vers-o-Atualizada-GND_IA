
import { ReactNode } from 'react';
import { Plan, ServiceKey, UserPlan } from './types/plan.types'; // Importar os novos tipos

export type { Plan, ServiceKey, UserPlan }; // Re-exportar para uso em outros arquivos

export interface BaseComponentProps {
  children?: ReactNode;
  className?: string;
}

export type NewsStatus = 'pending' | 'approved' | 'rejected';

export interface Source {
  uri: string;
  title: string;
}

export interface NewsArticle {
  id?: number;
  titulo: string;
  conteudo: string;
  sources?: Source[];
  status?: NewsStatus;
  tipo?: string; // Tipo do conteúdo (news, image, landing_page, etc)
  author_id?: string; // ID do autor
  criado_em?: string;
  author?: {
    email: string;
  };
}

export type UserRole = 'user' | 'editor' | 'admin' | 'super_admin';
export type UserStatus = 'active' | 'inactive' | 'banned';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  credits: number;
  status: UserStatus;
  plan: UserPlan; 
  created_at?: string;
  last_login?: string;
  // Affiliate System
  affiliate_code?: string;
  referred_by?: string;
  affiliate_balance?: number;
  asaas_customer_id?: string; // Novo campo para Asaas Customer ID
  // Subscription System
  subscription_id?: string; // ID da assinatura recorrente (Asaas)
  subscription_status?: string; // ACTIVE, EXPIRED, etc.
  mercadopago_customer_id?: string;
}

export interface AffiliateLog {
  id: string;
  affiliate_id: string;
  source_user_id?: string;
  amount: number;
  description: string;
  created_at: string;
  source_email?: string; // Enriched field
}

export interface Log {
  id: number;
  usuario_id: string;
  acao: string;
  modulo: string;
  // FIX: Replaced 'jsonb' with 'any' as 'jsonb' is a PostgreSQL type, not a TypeScript type.
  detalhes?: any;
  data: string;
  user_email?: string;
}

export type AdminView = 'dashboard' | 'users' | 'news' | 'payments' | 'multi_ia_system' | 'logs' | 'plans' | 'docs' | 'security' | 'popups' | 'feedbacks';

export interface AllowedDomain {
  id: string;
  domain: string;
  created_at: string;
}

export interface SecuritySettings {
  validationMode: 'strict_allowlist' | 'dns_validation';
}

export type TransactionStatus = 'pending' | 'approved' | 'failed' | 'refunded';
export type PaymentMethod = 'pix' | 'card';

export interface Transaction {
  id: number;
  usuario_id: string;
  valor: number;
  metodo: PaymentMethod;
  status: TransactionStatus;
  data: string;
  external_id?: string; // Mercado Pago ID, Asaas ID
  metadata?: { // Dados extras
    item_type?: 'plan' | 'credits';
    item_id?: string; // ID do plano ou pacote de créditos
    provider?: string; // Ex: 'mercado_pago', 'asaas'
    description?: string; // Descrição do item comprado
    plan_id?: string; // ID do plano, se for compra de plano
    credits_amount?: number; // Quantidade de créditos, se for compra de créditos
    // Mercado Pago specific
    payment_method_id?: string; // e.g., 'visa'
    issuer_id?: string; // e.g., '24' for Visa
    installments?: number;
    // Asaas specific
    card_token_id?: string;
    customer_id?: string; // Asaas customer ID
    // Any other relevant data
    [key: string]: any;
  };
  user?: {
    email: string;
  };
}

export interface GatewayConfig {
  enabled: boolean;
  publicKey: string; 
  secretKey: string; 
}

export interface CreditPackage {
  id: string;
  nome: string;
  quantidade: number;
  preco: number;
  ativo: boolean;
}

export interface PaymentSettings {
  gateways: {
    stripe: GatewayConfig;
    mercadoPago: GatewayConfig;
    asaas: GatewayConfig; 
  };
  packages: CreditPackage[];
}

export interface AIPlatform {
  enabled: boolean;
  apiKey: string;
  costPerMillionTokens: number;
  maxTokens: number;
}

export interface AIPlatformSettings {
  gemini: AIPlatform;
  openai: AIPlatform;
  claude: AIPlatform;
}

export interface AIModel {
  id: string;
  nome: string;
  plataforma: 'gemini' | 'openai' | 'claude';
  contexto_maximo: number;
  capacidades: {
    vision: boolean;
    audio: boolean;
  };
  ativo: boolean;
  custo_token: number;
}

export interface MultiAISettings {
  platforms: AIPlatformSettings;
  models: AIModel[];
}

export interface AILog {
  id: number;
  usuario_id: string;
  modelo_id: string;
  tokens: number;
  custo: number;
  data: string;
  user?: { 
    email: string;
  };
}

// --- FEEDBACK TYPES ---
export interface FeedbackData {
  rating: number;
  comment: string;
}

// Nova interface para Feedbacks do Sistema (Depoimentos)
export interface SystemFeedback {
  id: string;
  user_id: string;
  content: string;
  rating: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

// --- WORDPRESS INTEGRATION ---
export interface WordPressConfig {
  siteUrl: string;
  username: string;
  applicationPassword: string;
  isConnected: boolean;
}

// --- ANALYTICS INTEGRATION ---
export interface AnalyticsConfig {
  measurementId: string; // G-XXXXXXXXXX
  isConnected: boolean;
}

// --- N8N / WEBHOOK INTEGRATION ---
export interface N8nConfig {
  webhookUrl: string;
  autoSend: boolean; // Se true, envia automaticamente após gerar
  isConnected: boolean;
}

// --- POPUP SYSTEM ---
export interface Popup {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'image' | 'video';
  media_url?: string;
  style: {
    background_color: string;
    text_color: string;
    button_color: string;
    button_text_color: string;
    theme?: 'default' | 'dark_gold';
  };
  trigger_settings: {
    delay: number; // segundos
    frequency: 'once' | 'always' | 'daily';
    button_link?: string; // Link do botão de ação
    button_text?: string; // Texto do botão
  };
  is_active: boolean;
  created_at?: string;
}

// --- DEVELOPER API ---
export interface ApiKey {
  id: string;
  user_id?: string;
  name: string;
  key_prefix: string; // Mostramos apenas o começo ou fim
  full_key?: string; // Usado apenas na criação para mostrar uma vez
  created_at: string;
  last_used_at?: string;
  status: 'active' | 'revoked';
}
