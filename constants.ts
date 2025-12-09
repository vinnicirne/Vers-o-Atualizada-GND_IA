
import { ServiceKey, Plan, ServicePermission, UserPlan } from './types/plan.types'; // Importar os novos tipos de plano e serviço

interface CreatorSuiteModeConfig {
  value: ServiceKey; // Usar ServiceKey
  label: string;
  placeholder: string;
}

export const GUEST_ID = '00000000-0000-0000-0000-000000000000';

export const CREATOR_SUITE_MODES: CreatorSuiteModeConfig[] = [
  // --- OPÇÕES FREE / BÁSICAS (PRIMEIRA FILEIRA) ---
  {
    value: 'news_generator',
    label: 'GDN Notícias',
    placeholder: 'Ex: Final da Libertadores, eventos de Ano Novo, alta do dólar...',
  },
  {
    value: 'copy_generator',
    label: 'Gerador de Copy',
    placeholder: 'Descreva o produto, o público e o objetivo do texto. Ex: "copy para anúncio no Facebook sobre um curso de marketing digital para pequenos empresários".',
  },
  {
    value: 'prompt_generator',
    label: 'Gerador de Prompts',
    placeholder: 'Descreva a tarefa para a qual você precisa de um prompt. Ex: "um prompt para criar um carrossel de 5 posts no Instagram sobre produtividade".',
  },
  // --- OPÇÕES PREMIUM / AVANÇADAS (REORDERED FOR VISIBILITY) ---
  {
    value: 'curriculum_generator',
    label: 'Criador de Currículos (IA)', // NOVO
    placeholder: 'Descreva seu perfil e objetivo (ex: "Currículo para Desenvolvedor Fullstack com 5 anos de experiência, focado em React e Node.js. Objetivo: vaga em startup de tecnologia.").',
  },
  {
    value: 'social_media_poster',
    label: 'Criador de Posts Sociais',
    placeholder: 'Descreva o post. Ex: "Promoção de Black Friday para loja de sapatos, fundo preto e dourado, foto do produto".',
  },
  {
    value: 'image_generation',
    label: 'Studio de Arte IA',
    placeholder: 'Descreva a imagem que você quer criar. Ex: "Um gato astronauta flutuando em uma galáxia feita de doces, estilo cyberpunk 8k".',
  },
  {
    value: 'landingpage_generator',
    label: 'Criador de Sites (Web)', // Unificado: Landing Page e Site Institucional
    placeholder: 'Descreva o site (empresa, produto, público, seções). Ex: "Site institucional para uma consultoria de TI focada em segurança cibernética" ou "Landing Page de vendas para um e-book de receitas veganas".',
  },
  {
    value: 'canva_structure',
    label: 'Editor Visual (Social Media)',
    placeholder: 'Descreva o post. Ex: "Post para Instagram sobre Promoção de Verão, fundo amarelo vibrante, texto grande em preto".',
  },
  {
    value: 'text_to_speech',
    label: 'Texto para Voz',
    placeholder: 'Insira o texto que você deseja transformar em áudio.',
  },
];

// --- CUSTO POR AÇÃO (CRÉDITOS) ---
// Estes valores são a fonte da verdade. O Admin deve sincronizar os planos para aplicar mudanças no DB.
export const TASK_COSTS: Record<ServiceKey, number> = {
  news_generator: 1,
  text_to_speech: 2,
  copy_generator: 1,
  prompt_generator: 1,
  canva_structure: 3,
  landingpage_generator: 25, // Custo maior para cobrir sites institucionais mais complexos
  image_generation: 5,
  social_media_poster: 5, // Custo similar à geração de imagem
  curriculum_generator: 8, // Custo para o novo gerador de currículos
  n8n_integration: 0, // Recurso de acesso, sem custo de crédito por uso
  whatsapp_crm: 0, // Recurso de acesso mensal (definido no plano)
};

// --- HIERARQUIA DE PLANOS (PADRÃO/INICIAL) ---
// Estes planos serão usados para semear a tabela `system_config` no banco de dados.

const commonServices: ServicePermission[] = [
  { key: 'news_generator', name: 'GDN Notícias', enabled: true, creditsPerUse: TASK_COSTS.news_generator },
  { key: 'copy_generator', name: 'Gerador de Copy', enabled: true, creditsPerUse: TASK_COSTS.copy_generator },
  { key: 'text_to_speech', name: 'Texto para Voz', enabled: true, creditsPerUse: TASK_COSTS.text_to_speech } // Habilitado por padrão
];

const promptService: ServicePermission = { key: 'prompt_generator', name: 'Gerador de Prompts', enabled: true, creditsPerUse: TASK_COSTS.prompt_generator };

const artServices: ServicePermission[] = [
  { key: 'canva_structure', name: 'Editor Visual (Social Media)', enabled: true, creditsPerUse: TASK_COSTS.canva_structure },
];

const imageService: ServicePermission = { key: 'image_generation', name: 'Studio de Arte IA', enabled: true, creditsPerUse: TASK_COSTS.image_generation };
const socialPosterService: ServicePermission = { key: 'social_media_poster', name: 'Criador de Posts Sociais', enabled: true, creditsPerUse: TASK_COSTS.social_media_poster };
const siteBuilderService: ServicePermission = { key: 'landingpage_generator', name: 'Criador de Sites (Web)', enabled: true, creditsPerUse: TASK_COSTS.landingpage_generator };
const curriculumService: ServicePermission = { key: 'curriculum_generator', name: 'Criador de Currículos (IA)', enabled: true, creditsPerUse: TASK_COSTS.curriculum_generator };
const n8nService: ServicePermission = { key: 'n8n_integration', name: 'Integração N8N / Webhooks', enabled: true, creditsPerUse: 0 };

// Serviço WhatsApp (Disponível a partir do Basic, com limites diferentes)
const whatsappService: ServicePermission = { key: 'whatsapp_crm', name: 'CRM WhatsApp Multi-atendimento', enabled: true, creditsPerUse: 0 };


export const PLANS: Record<UserPlan, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    credits: 3,
    price: 0,
    interval: 'month',
    isActive: true,
    expressCreditPrice: 15.00,
    color: 'gray', 
    services: [
      ...commonServices,
      promptService,
      { ...whatsappService, enabled: false } // Sem acesso
    ],
    maxWhatsAppInstances: 0
  },
  basic: {
    id: 'basic',
    name: 'Básico',
    credits: 25,
    price: 49.99,
    interval: 'month',
    isActive: true,
    expressCreditPrice: 9.00,
    color: 'blue',
    services: [
      ...commonServices,
      promptService,
      whatsappService // 1 Número
    ],
    maxWhatsAppInstances: 1
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    credits: 50,
    price: 99.99,
    interval: 'month',
    isActive: true,
    expressCreditPrice: 7.00,
    color: 'green',
    services: [
      ...commonServices,
      promptService,
      curriculumService,
      socialPosterService,
      imageService, 
      siteBuilderService, 
      ...artServices, 
      n8nService,
      whatsappService // 3 Números
    ],
    maxWhatsAppInstances: 3
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    credits: 100,
    price: 199.00,
    interval: 'month',
    isActive: true,
    expressCreditPrice: 5.00,
    color: 'purple',
    services: [
      ...commonServices,
      promptService,
      curriculumService, 
      socialPosterService, 
      imageService,
      siteBuilderService, 
      ...artServices,
      n8nService,
      whatsappService // 10 Números
    ],
    maxWhatsAppInstances: 10
  }
};

// Mapeamento de Ícones
export const SERVICE_ICONS: Record<ServiceKey, string> = {
    news_generator: 'fa-newspaper',
    text_to_speech: 'fa-microphone-lines',
    copy_generator: 'fa-pen-nib',
    prompt_generator: 'fa-terminal',
    landingpage_generator: 'fa-code', 
    canva_structure: 'fa-vector-square',
    image_generation: 'fa-paint-brush',
    social_media_poster: 'fa-share-alt',
    curriculum_generator: 'fa-file-alt', 
    n8n_integration: 'fa-plug',
    whatsapp_crm: 'fab fa-whatsapp', // Icone do WhatsApp
};

// Cores para os ícones
export const SERVICE_COLORS: Record<ServiceKey, string> = {
    news_generator: 'text-green-500 bg-green-50',
    text_to_speech: 'text-blue-500 bg-blue-50',
    copy_generator: 'text-purple-500 bg-purple-50',
    prompt_generator: 'text-yellow-500 bg-yellow-50',
    landingpage_generator: 'text-orange-500 bg-orange-50', 
    canva_structure: 'text-cyan-500 bg-cyan-50',
    image_generation: 'text-rose-500 bg-rose-50',
    social_media_poster: 'text-indigo-500 bg-indigo-50',
    curriculum_generator: 'text-blue-500 bg-blue-50', 
    n8n_integration: 'text-red-500 bg-red-50',
    whatsapp_crm: 'text-green-600 bg-green-100', // Verde WhatsApp
};
