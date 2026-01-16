import { ServiceKey, Plan, ServicePermission, UserPlan } from './types/plan.types';

interface CreatorSuiteModeConfig {
  value: ServiceKey;
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
    value: 'copy_generator',
    label: 'Gerador de Copy',
    placeholder: 'Descreva o produto, o público e o objetivo do texto.',
  },
  {
    value: 'prompt_generator',
    label: 'Gerador de Prompts',
    placeholder: 'Descreva a tarefa para a qual você precisa de um prompt.',
  },
  {
    value: 'curriculum_generator',
    label: 'Criador de Currículos (IA)',
    placeholder: 'Descreva seu perfil e objetivo profissional.',
  },
<<<<<<< HEAD
  // --- OPÇÕES PREMIUM / AVANÇADAS (REORDERED FOR VISIBILITY) ---
  {
    value: 'curriculum_generator',
    label: 'Criador de Currículos (IA)', // NOVO
    placeholder: 'Descreva seu perfil e objetivo (ex: "Currículo para Desenvolvedor Fullstack com 5 anos de experiência, focado em React e Node.js. Objetivo: vaga em startup de tecnologia.").',
  },
=======
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
  {
    value: 'social_media_poster',
    label: 'Criador de Posts Sociais',
    placeholder: 'Descreva o post para redes sociais.',
  },
  {
    value: 'landingpage_generator',
<<<<<<< HEAD
    label: 'Criador de Sites (Web)', // Unificado: Landing Page e Site Institucional
    placeholder: 'Descreva o site (empresa, produto, público, seções). Ex: "Site institucional para uma consultoria de TI focada em segurança cibernética" ou "Landing Page de vendas para um e-book de receitas veganas".',
=======
    label: 'Criador de Sites (Web)',
    placeholder: 'Descreva o site (empresa, produto, público, seções).',
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
  },
  {
    value: 'image_generation',
    label: 'Studio de Arte IA',
<<<<<<< HEAD
    placeholder: 'Descreva a imagem que você quer criar. Ex: "Um gato astronauta flutuando em uma galáxia feita de doces, estilo cyberpunk 8k".',
=======
    placeholder: 'Descreva a imagem que você quer criar.',
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
  },
  {
    value: 'canva_structure',
    label: 'Editor Visual (Social Media)',
    placeholder: 'Descreva o post visualmente.',
  }
];

export const TASK_COSTS: Record<ServiceKey, number> = {
  news_generator: 1,
<<<<<<< HEAD
  text_to_speech: 2, // Custo atualizado de 1 para 2 créditos
  copy_generator: 1,
  prompt_generator: 1,
  canva_structure: 3,
  landingpage_generator: 25, // Custo maior para cobrir sites institucionais mais complexos
  image_generation: 5,
  social_media_poster: 5, // Custo similar à geração de imagem
  curriculum_generator: 8, // Custo para o novo gerador de currículos
  n8n_integration: 0, // Recurso de acesso, sem custo de crédito por uso
  crm_suite: 0, // Recurso de acesso (CRM), sem custo por uso
=======
  copy_generator: 1,
  prompt_generator: 1,
  canva_structure: 3,
  landingpage_generator: 25,
  image_generation: 5,
  social_media_poster: 5,
  curriculum_generator: 8,
  n8n_integration: 0,
  crm_suite: 0,
  text_to_speech: 0 // Mantido como 0 apenas para compatibilidade de tipo até remoção total do type
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
};

const commonServices: ServicePermission[] = [
  { key: 'news_generator', name: 'GDN Notícias', enabled: true, creditsPerUse: TASK_COSTS.news_generator },
  { key: 'copy_generator', name: 'Gerador de Copy', enabled: true, creditsPerUse: TASK_COSTS.copy_generator }
];

const promptService: ServicePermission = { key: 'prompt_generator', name: 'Gerador de Prompts', enabled: true, creditsPerUse: TASK_COSTS.prompt_generator };
const artServices: ServicePermission[] = [
  { key: 'canva_structure', name: 'Editor Visual (Social Media)', enabled: true, creditsPerUse: TASK_COSTS.canva_structure },
];
const imageService: ServicePermission = { key: 'image_generation', name: 'Studio de Arte IA', enabled: true, creditsPerUse: TASK_COSTS.image_generation };
const socialPosterService: ServicePermission = { key: 'social_media_poster', name: 'Criador de Posts Sociais', enabled: true, creditsPerUse: TASK_COSTS.social_media_poster };
<<<<<<< HEAD

// Agora apenas um serviço para sites
const siteBuilderService: ServicePermission = { key: 'landingpage_generator', name: 'Criador de Sites (Web)', enabled: true, creditsPerUse: TASK_COSTS.landingpage_generator };

// Novo serviço de currículo
const curriculumService: ServicePermission = { key: 'curriculum_generator', name: 'Criador de Currículos (IA)', enabled: true, creditsPerUse: TASK_COSTS.curriculum_generator };

// Serviço N8N (Apenas Standard e Premium)
const n8nService: ServicePermission = { key: 'n8n_integration', name: 'Integração N8N / Webhooks', enabled: true, creditsPerUse: 0 };

// Serviço CRM (Apenas Basic, Standard e Premium)
const crmService: ServicePermission = { key: 'crm_suite', name: 'CRM & Gestão de Leads', enabled: true, creditsPerUse: 0 };

=======
const siteBuilderService: ServicePermission = { key: 'landingpage_generator', name: 'Criador de Sites (Web)', enabled: true, creditsPerUse: TASK_COSTS.landingpage_generator };
const curriculumService: ServicePermission = { key: 'curriculum_generator', name: 'Criador de Currículos (IA)', enabled: true, creditsPerUse: TASK_COSTS.curriculum_generator };
const n8nService: ServicePermission = { key: 'n8n_integration', name: 'Integração N8N / Webhooks', enabled: true, creditsPerUse: 0 };
const crmService: ServicePermission = { key: 'crm_suite', name: 'CRM & Gestão de Leads', enabled: true, creditsPerUse: 0 };
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d

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
      promptService
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
    color: 'blue',
    services: [
      ...commonServices,
      promptService,
<<<<<<< HEAD
      crmService // CRM no Basic
=======
      crmService
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
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
    color: 'green',
    services: [
      ...commonServices,
      promptService,
<<<<<<< HEAD
      curriculumService, // Adicionado ao Standard
      socialPosterService, // Adicionado ao Standard
      imageService, 
      siteBuilderService, // Usando o serviço unificado
      ...artServices, // Agora contém apenas o Editor Visual
      n8nService,
      crmService // CRM no Standard
=======
      curriculumService,
      socialPosterService,
      imageService, 
      siteBuilderService,
      ...artServices,
      n8nService,
      crmService
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
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
    color: 'purple',
    services: [
      ...commonServices,
      promptService,
<<<<<<< HEAD
      curriculumService, // Adicionado ao Premium
      socialPosterService, // Adicionado ao Premium
      imageService,
      siteBuilderService, // Usando o serviço unificado
      ...artServices,
      n8nService,
      crmService // CRM no Premium
=======
      curriculumService,
      socialPosterService,
      imageService,
      siteBuilderService,
      ...artServices,
      n8nService,
      crmService
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
    ]
  }
};

<<<<<<< HEAD
// Mapeamento de Ícones
=======
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
export const SERVICE_ICONS: Record<ServiceKey, string> = {
    news_generator: 'fa-newspaper',
    text_to_speech: 'fa-microphone-lines',
    copy_generator: 'fa-pen-nib',
    prompt_generator: 'fa-terminal',
<<<<<<< HEAD
    landingpage_generator: 'fa-code', // Icone para Criador de Sites (Web)
    canva_structure: 'fa-vector-square',
    image_generation: 'fa-paint-brush',
    social_media_poster: 'fa-share-alt',
    curriculum_generator: 'fa-file-alt', // Icone para Criador de Currículos (IA)
=======
    landingpage_generator: 'fa-code',
    canva_structure: 'fa-vector-square',
    image_generation: 'fa-paint-brush',
    social_media_poster: 'fa-share-alt',
    curriculum_generator: 'fa-file-alt',
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
    n8n_integration: 'fa-plug',
    crm_suite: 'fa-users-cog',
};

<<<<<<< HEAD
// Cores para os ícones
=======
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
export const SERVICE_COLORS: Record<ServiceKey, string> = {
    news_generator: 'text-green-500 bg-green-50',
    text_to_speech: 'text-blue-500 bg-blue-50',
    copy_generator: 'text-purple-500 bg-purple-50',
    prompt_generator: 'text-yellow-500 bg-yellow-50',
<<<<<<< HEAD
    landingpage_generator: 'text-orange-500 bg-orange-50', // Cor para Criador de Sites (Web)
    canva_structure: 'text-cyan-500 bg-cyan-50',
    image_generation: 'text-rose-500 bg-rose-50',
    social_media_poster: 'text-indigo-500 bg-indigo-50',
    curriculum_generator: 'text-blue-500 bg-blue-50', // Cor para Criador de Currículos (IA)
    n8n_integration: 'text-red-500 bg-red-50',
    crm_suite: 'text-blue-700 bg-blue-100',
};
=======
    landingpage_generator: 'text-orange-500 bg-orange-50',
    canva_structure: 'text-cyan-500 bg-cyan-50',
    image_generation: 'text-rose-500 bg-rose-50',
    social_media_poster: 'text-indigo-500 bg-indigo-50',
    curriculum_generator: 'text-blue-500 bg-blue-50',
    n8n_integration: 'text-red-500 bg-red-50',
    crm_suite: 'text-blue-700 bg-blue-100',
};
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
