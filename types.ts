
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
  // O tipo de notícia agora é gerenciado pelo modo mais genérico
  tipo?: string; 
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
}

export interface Log {
  id: number;
  usuario_id: string;
  acao: string;
  modulo: string;
  data: string;
  user_email?: string; // Optional: for display purposes
  detalhes?: Record<string, any>; // For audit trail
}

export type AdminView = 'dashboard' | 'users' | 'news' | 'payments' | 'multi_ia_system' | 'logs';

export type TransactionStatus = 'pending' | 'approved' | 'failed';
export type PaymentMethod = 'pix' | 'card';

export interface Transaction {
  id: number;
  usuario_id: string;
  valor: number;
  metodo: PaymentMethod;
  status: TransactionStatus;
  data: string;
  user?: {
    email: string;
  };
}

// --- NEW PAYMENT SETTINGS TYPES ---

export interface GatewayConfig {
  enabled: boolean;
  publicKey: string;
  secretKey: string; // Generic name for Access Token or Secret Key
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
  user?: { // For joining with user table
    email: string;
  };
}

// --- FEEDBACK TYPES ---
export interface FeedbackData {
  rating: number;
  comment: string;
}

// --- CREATOR SUITE ---
export type CreatorSuiteMode = 'news' | 'prompts' | 'landing_page' | 'copy' | 'art_structure';
