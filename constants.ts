

import { ServiceKey, Plan, ServicePermission, UserPlan } from './types/plan.types'; // Importar os novos tipos de plano e serviço

interface CreatorSuiteModeConfig {
  value: ServiceKey; // Usar ServiceKey
  label: string;
  placeholder: string;
}

export const GUEST_ID = '00000000-0000-0000-0000-000000000000';

export const CREATOR_SUITE_MODES: CreatorSuiteModeConfig[] = [
  {
    value: 'news_generator',
    label: 'GDN Notícias',
    placeholder: 'Ex: Final da Libertadores, eventos de Ano Novo, alta do dólar...',
  },
  {
    value: 'institutional_website_generator',
    label: 'Site Institucional',
    placeholder: 'Nome da Empresa, Ramo de Atuação e Diferenciais. Ex: "TechSoluções, consultoria de TI focada em segurança cibernética para pequenas empresas".',
  },
  {
    value: 'image_generation',
    label: 'Studio de Arte IA',
    placeholder: 'Descreva a imagem que você quer criar. Ex: "Um gato astronauta flutuando em uma galáxia feita de doces, estilo cyberpunk 8k".',
  },
  {
    value: 'landingpage_generator',
    label: 'Gerador de Landing Page',
    placeholder: 'Descreva o produto ou serviço e o público-alvo. Ex: "Página de vendas para um e-book de receitas veganas para iniciantes".',
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
];

// --- CUSTO POR AÇÃO (CRÉDITOS) ---
// Estes valores são a fonte da verdade. O Admin deve sincronizar os planos para aplicar mudanças no DB.
export const TASK_COSTS: Record<ServiceKey, number> = {
  news_generator: 1,
  text_to_speech: 2,
  copy_generator: 1,
  prompt_generator: 1,
  canva_structure: 3,
  landingpage_generator: 15,
  institutional_website_generator: 25,
  image_generation: 5,
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

// Adicionando a nova feature de imagem
const imageService: ServicePermission = { key: 'image_generation', name: 'Studio de Arte IA', enabled: true, creditsPerUse: TASK_COSTS.image_generation };

const landingPageService: ServicePermission = { key: 'landingpage_generator', name: 'Gerador de Landing Page', enabled: true, creditsPerUse: TASK_COSTS.landingpage_generator };

const institutionalSiteService: ServicePermission = { key: 'institutional_website_generator', name: 'Site Institucional', enabled: true, creditsPerUse: TASK_COSTS.institutional_website_generator };


export const PLANS: Record<UserPlan, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    credits: 3,
    price: 0,
    interval: 'month',
    isActive: true,
    expressCreditPrice: 15.00,
    color: 'gray', // Cor Tailwind
    services: [
      ...commonServices,
      promptService // Adicionado ao Free
    ]
  },
  basic: {
    id: 'basic',
    name: 'Básico',
    credits: 25,
    price: 49.99,
    interval: 'month',
    isActive: true,
    expressCreditPrice: 9.00,
    color: 'blue', // Cor Tailwind
    services: [
      ...commonServices,
      promptService,
    ]
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    credits: 50,
    price: 99.99,
    interval: 'month',
    isActive: true,
    expressCreditPrice: 7.00,
    color: 'green', // Cor Tailwind
    services: [
      ...commonServices,
      promptService,
      ...artServices, // Agora contém apenas o Editor Visual
      imageService, // Adicionado ao Standard
      institutionalSiteService // Disponível no Standard
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    credits: 100,
    price: 199.00,
    interval: 'month',
    isActive: true,
    expressCreditPrice: 5.00,
    color: 'purple', // Cor Tailwind
    services: [
      ...commonServices,
      promptService,
      ...artServices,
      imageService, // Adicionado ao Premium
      landingPageService,
      institutionalSiteService // Disponível no Premium
    ]
  }
};