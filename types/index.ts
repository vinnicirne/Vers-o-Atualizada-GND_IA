
import { ReactNode } from 'react';
import { Plan, ServiceKey, UserPlan } from './plan.types';

export type { Plan, ServiceKey, UserPlan };

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
  tipo?: string; 
  author_id?: string;
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
  affiliate_code?: string;
  referred_by?: string;
  affiliate_balance?: number;
  asaas_customer_id?: string;
  subscription_id?: string;
  subscription_status?: string;
  mercadopago_customer_id?: string;
}

export interface AffiliateLog {
  id: string;
  affiliate_id: string;
  source_user_id?: string;
  amount: number;
  description: string;
  created_at: string;
  source_email?: string;
}

export interface Log {
  id: number;
  usuario_id: string;
  acao: string;
  modulo: string;
  detalhes?: any;
  data: string;
  user_email?: string;
}

export type AdminView = 'dashboard' | 'users' | 'news' | 'payments' | 'multi_ia_system' | 'logs' | 'plans' | 'docs' | 'security' | 'popups' | 'feedbacks' | 'notifications_push' | 'crm';

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
  external_id?: string;
  metadata?: {
    item_type?: 'plan' | 'credits';
    item_id?: string;
    provider?: string;
    description?: string;
    plan_id?: string;
    credits_amount?: number;
    payment_method_id?: string;
    issuer_id?: string;
    installments?: number;
    card_token_id?: string;
    customer_id?: string;
    [key: string]: any;
  };
  user?: {
    email: string;
  };
}

export interface GatewayConfig {
  enabled: boolean;
  publicKey: string; 
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

export interface FeedbackData {
  rating: number;
  comment: string;
}

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

export interface WordPressConfig {
  siteUrl: string;
  username: string;
  applicationPassword: string;
  isConnected: boolean;
}

export interface AnalyticsConfig {
  measurementId: string;
  isConnected: boolean;
}

export interface N8nConfig {
  webhookUrl: string;
  autoSend: boolean;
  isConnected: boolean;
}

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
    delay: number;
    frequency: 'once' | 'always' | 'daily';
    button_link?: string;
    button_text?: string;
  };
  is_active: boolean;
  created_at?: string;
}

export interface ApiKey {
  id: string;
  user_id?: string;
  name: string;
  key_prefix: string;
  full_key?: string;
  created_at: string;
  last_used_at?: string;
  status: 'active' | 'revoked';
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  action_link?: string;
  created_at: string;
}

export interface ToolSetting {
  key: ServiceKey;
  enabled: boolean;
}

export interface FeatureCardConfig {
    id: string; 
    icon: string; 
    title: string; 
    description: string; 
    color: string; 
    bgColor: string;
}

export interface FooterLinkConfig {
    id: string; 
    text: string; 
    link: string;
}

export interface WhiteLabelSettings {
  appName: string;
  appTagline: string;
  logoTextPart1: string;
  logoTextPart2: string;
  primaryColorHex: string;
  secondaryColorHex: string;
  tertiaryColorHex: string;
  faviconUrl: string;
  ogImageUrl: string;
  wordpressPluginName: string;
  copyrightText: string;
  appVersion: string;
  dashboardTitle: string;
  landingPageEnabled: boolean;
  heroSectionTitle: string;
  heroSectionSubtitle: string;
  heroCtaPrimaryText: string;
  heroCtaPrimaryLink: string;
  heroCtaSecondaryText: string;
  heroCtaSecondaryLink: string;
  featureSectionTitle: string;
  featureSectionSubtitle: string;
  landingPageFeatures: FeatureCardConfig[];
  pricingSectionTitle: string;
  pricingSectionSubtitle: string;
  landingPageFooterLinks: FooterLinkConfig[];
  guestMarketingFooterTitle: string;
  guestMarketingFooterSubtitle: string;
  guestMarketingFooterCtaText: string;
  guestMarketingFooterCtaLink: string;
}

// --- CHAT SYSTEM TYPES ---
export interface WhatsAppInstance {
    id: string;
    user_id: string;
    name: string;
    phone_number?: string;
    status: 'connected' | 'disconnected' | 'connecting' | 'qr_ready';
    qr_code?: string;
    api_url?: string;
    api_token?: string;
    created_at: string;
}

export interface ChatContact {
    id: string;
    phone: string;
    name: string;
    email?: string; // Added for CRM
    notes?: string; // Added for CRM
    profile_pic_url?: string;
    tags?: string[];
    crm_stage?: 'new' | 'negotiation' | 'won' | 'lost'; // Added for CRM Pipeline
    created_at?: string;
}

export interface ChatConversation {
    id: string;
    instance_id: string;
    contact_id: string;
    contact: ChatContact;
    last_message?: string;
    last_message_at: string;
    unread_count: number;
    status: 'open' | 'closed' | 'pending';
    assigned_agent_id?: string;
}

export interface ChatMessage {
    id: string;
    conversation_id: string;
    sender_type: 'agent' | 'contact' | 'system';
    sender_id?: string; // agent_id or contact_id
    content: string;
    media_url?: string;
    media_type?: 'image' | 'video' | 'audio' | 'document';
    status: 'sent' | 'delivered' | 'read' | 'failed';
    created_at: string;
}

// --- CRM / LEAD SYSTEM ---
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type DealStatus = 'won' | 'lost' | 'pending';
export type MarketingEventType = 'view_landing' | 'submit_form' | 'email_open' | 'email_click' | 'checkout_view' | 'purchase';

export interface Lead {
  id: string;
  email: string;
  nome?: string;
  telefone?: string;
  empresa?: string;
  fonte?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_source?: string;
  status_funil: LeadStatus;
  score: number;
  tags?: string[]; // Array of strings in Supabase (text[])
  consentimento: boolean;
  created_at: string;
  notes?: string;
}

export interface MarketingEvent {
  id: number;
  lead_id: string;
  tipo_evento: MarketingEventType;
  metadata?: any;
  created_at: string;
}

export interface Deal {
  id: string;
  lead_id: string;
  plano: string;
  valor: number;
  status: DealStatus;
  gateway_ref?: string;
  created_at: string;
}
