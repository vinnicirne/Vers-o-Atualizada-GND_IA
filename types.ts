
import { Plan, ServiceKey, UserPlan } from './types/plan.types'; // Importar os novos tipos

export type { Plan, ServiceKey, UserPlan }; // Re-exportar para uso em outros arquivos

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
  data: string;
  user_email?: string;
  detalhes?: Record<string, any>;
}

export type AdminView = 'dashboard' | 'users' | 'news' | 'payments' | 'multi_ia_system' | 'logs' | 'plans' | 'docs' | 'security';

export interface AllowedDomain {
  id: string;
  domain: string;
  created_at: string;
}

export interface SecuritySettings {
  validationMode: 'strict_allowlist' | 'dns_validation';
}

export type TransactionStatus = 'pending' | 'approved' | 'failed';
export type PaymentMethod = 'pix' | 'card';

export interface Transaction {
  id: number;
  usuario_id: string;
  valor: number;
  metodo: PaymentMethod;
  status: TransactionStatus;
  data: string;
  external_id?: string; // Mercado Pago ID
  metadata?: any; // Dados extras (plano comprado, qtd creditos, etc)
  user?: {
    email: string;
  };
}

// --- CONFIGURAÇÃO DE PLANOS ---
// O PlanConfig antigo foi substituído pela interface Plan de types/plan.types.ts

// --- NEW PAYMENT SETTINGS TYPES ---

export interface GatewayConfig {
  enabled: boolean;
  publicKey: string; // Para Asaas pode ser usado como API Key se só houver uma
  secretKey: string; // Para Asaas pode ser deixado em branco ou usado para WalletId
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
    asaas: GatewayConfig; // Novo Gateway Adicionado
  };
  packages: CreditPackage[];
}

// --- NEW MULTI-AI SYSTEM TYPES ---

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
