<<<<<<< HEAD


import { ServiceKey, Plan, ServicePermission, UserPlan } from './types/plan.types'; // Importar os novos tipos de plano e serviço

interface CreatorSuiteModeConfig {
  value: ServiceKey; // Usar ServiceKey
=======
import { ServiceKey, Plan, ServicePermission, UserPlan } from './types/plan.types';

interface CreatorSuiteModeConfig {
  value: ServiceKey;
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
  label: string;
  placeholder: string;
}

export const GUEST_ID = '00000000-0000-0000-0000-000000000000';

export const CREATOR_SUITE_MODES: CreatorSuiteModeConfig[] = [
<<<<<<< HEAD
  // --- OPÇÕES FREE / BÁSICAS (PRIMEIRA FILEIRA) ---
=======
  // --- TEXTO & PESQUISA ---
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
  {
    value: 'news_generator',
    label: 'GDN Notícias',
    placeholder: 'Ex: Final da Libertadores, eventos de Ano Novo, alta do dólar...',
  },
  {
    value: 'copy_generator',
    label: 'Gerador de Copy',
<<<<<<< HEAD
    placeholder: 'Descreva o produto, o público e o objetivo do texto. Ex: "copy para anúncio no Facebook sobre um curso de marketing digital para pequenos empresários".',
=======
    placeholder: 'Descreva o produto, o público e o objetivo do texto.',
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
  },
  {
    value: 'prompt_generator',
    label: 'Gerador de Prompts',
<<<<<<< HEAD
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
    value: 'landingpage_generator',
    label: 'Criador de Sites (Web)', // Unificado: Landing Page e Site Institucional
    placeholder: 'Descreva o site (empresa, produto, público, seções). Ex: "Site institucional para uma consultoria de TI focada em segurança cibernética" ou "Landing Page de vendas para um e-book de receitas veganas".',
=======
    placeholder: 'Descreva a tarefa para a qual você precisa de um prompt.',
  },
  
  // --- VOZ & ÁUDIO ---
  {
    value: 'text_to_speech',
    label: 'Texto para Fala (Voz Realista)',
    placeholder: 'Cole o texto que você deseja transformar em narração humana.',
  },

  // --- CARREIRA ---
  {
    value: 'curriculum_generator',
    label: 'Criador de Currículos (IA)',
    placeholder: 'Descreva seu perfil e objetivo (ex: "Desenvolvedor Fullstack, 5 anos exp, React/Node.").',
  },

  // --- VISUAL & WEB ---
  {
    value: 'social_media_poster',
    label: 'Criador de Posts Sociais',
    placeholder: 'Descreva o post para redes sociais.',
  },
  {
    value: 'landingpage_generator',
    label: 'Criador de Sites (Web)', 
    placeholder: 'Descreva o site (empresa, produto, público, seções).',
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
  },
  {
    value: 'image_generation',
    label: 'Studio de Arte IA',
<<<<<<< HEAD
    placeholder: 'Descreva a imagem que você quer criar. Ex: "Um gato astronauta flutuando em uma galáxia feita de doces, estilo cyberpunk 8k".',
=======
    placeholder: 'Descreva a imagem (ex: "Gato astronauta, cyberpunk, 8k").',
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
  },
  {
    value: 'canva_structure',
    label: 'Editor Visual (Social Media)',
<<<<<<< HEAD
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
=======
    placeholder: 'Descreva o layout visual do post.',
  }
];

>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
export const TASK_COSTS: Record<ServiceKey, number> = {
  news_generator: 1,
  text_to_speech: 2, // Custo atualizado de 1 para 2 créditos
  copy_generator: 1,
  prompt_generator: 1,
  canva_structure: 3,
  landingpage_generator: 25, // Custo maior para cobrir sites institucionais mais complexos
  image_generation: 5,
  social_media_poster: 5, // Custo similar à geração de imagem
  curriculum_generator: 8, // Custo para o novo gerador de currículos
<<<<<<< HEAD
  n8n_integration: 0, // Recurso de acesso, sem custo de crédito por uso
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

// Nova feature de Social Media Poster
=======
  curriculum_parse: 2, // Custo para extração inteligente de dados do PDF
  n8n_integration: 0, // Recurso de acesso, sem custo de crédito por uso
  crm_suite: 0, // Recurso de acesso (CRM), sem custo por uso
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
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
const socialPosterService: ServicePermission = { key: 'social_media_poster', name: 'Criador de Posts Sociais', enabled: true, creditsPerUse: TASK_COSTS.social_media_poster };

// Agora apenas um serviço para sites
const siteBuilderService: ServicePermission = { key: 'landingpage_generator', name: 'Criador de Sites (Web)', enabled: true, creditsPerUse: TASK_COSTS.landingpage_generator };

// Novo serviço de currículo
const curriculumService: ServicePermission = { key: 'curriculum_generator', name: 'Criador de Currículos (IA)', enabled: true, creditsPerUse: TASK_COSTS.curriculum_generator };

// Serviço N8N (Apenas Standard e Premium)
const n8nService: ServicePermission = { key: 'n8n_integration', name: 'Integração N8N / Webhooks', enabled: true, creditsPerUse: 0 };

<<<<<<< HEAD
=======
// Serviço CRM (Apenas Basic, Standard e Premium)
const crmService: ServicePermission = { key: 'crm_suite', name: 'CRM & Gestão de Leads', enabled: true, creditsPerUse: 0 };

>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa

export const PLANS: Record<UserPlan, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    credits: 3,
    price: 0,
    interval: 'month',
    isActive: true,
    expressCreditPrice: 15.00,
<<<<<<< HEAD
    color: 'gray', // Cor Tailwind
    services: [
      ...commonServices,
      promptService // Adicionado ao Free
=======
    color: 'gray',
    services: [
      ...commonServices,
      promptService
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
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
<<<<<<< HEAD
    color: 'blue', // Cor Tailwind
    services: [
      ...commonServices,
      promptService,
=======
    color: 'blue',
    services: [
      ...commonServices,
      promptService,
      crmService // CRM no Basic
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
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
<<<<<<< HEAD
    color: 'green', // Cor Tailwind
=======
    color: 'green',
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
    services: [
      ...commonServices,
      promptService,
      curriculumService, // Adicionado ao Standard
      socialPosterService, // Adicionado ao Standard
      imageService, 
      siteBuilderService, // Usando o serviço unificado
      ...artServices, // Agora contém apenas o Editor Visual
<<<<<<< HEAD
      n8nService 
=======
      n8nService,
      crmService // CRM no Standard
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
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
<<<<<<< HEAD
    color: 'purple', // Cor Tailwind
=======
    color: 'purple',
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
    services: [
      ...commonServices,
      promptService,
      curriculumService, // Adicionado ao Premium
      socialPosterService, // Adicionado ao Premium
      imageService,
      siteBuilderService, // Usando o serviço unificado
      ...artServices,
<<<<<<< HEAD
      n8nService 
=======
      n8nService,
      crmService // CRM no Premium
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
    ]
  }
};

// Mapeamento de Ícones
export const SERVICE_ICONS: Record<ServiceKey, string> = {
    news_generator: 'fa-newspaper',
    text_to_speech: 'fa-microphone-lines',
    copy_generator: 'fa-pen-nib',
    prompt_generator: 'fa-terminal',
    landingpage_generator: 'fa-code', // Icone para Criador de Sites (Web)
    canva_structure: 'fa-vector-square',
    image_generation: 'fa-paint-brush',
    social_media_poster: 'fa-share-alt',
    curriculum_generator: 'fa-file-alt', // Icone para Criador de Currículos (IA)
<<<<<<< HEAD
    n8n_integration: 'fa-plug',
=======
    curriculum_parse: 'fa-file-import',
    n8n_integration: 'fa-plug',
    crm_suite: 'fa-users-cog',
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
};

// Cores para os ícones
export const SERVICE_COLORS: Record<ServiceKey, string> = {
    news_generator: 'text-green-500 bg-green-50',
    text_to_speech: 'text-blue-500 bg-blue-50',
    copy_generator: 'text-purple-500 bg-purple-50',
    prompt_generator: 'text-yellow-500 bg-yellow-50',
    landingpage_generator: 'text-orange-500 bg-orange-50', // Cor para Criador de Sites (Web)
    canva_structure: 'text-cyan-500 bg-cyan-50',
    image_generation: 'text-rose-500 bg-rose-50',
    social_media_poster: 'text-indigo-500 bg-indigo-50',
    curriculum_generator: 'text-blue-500 bg-blue-50', // Cor para Criador de Currículos (IA)
<<<<<<< HEAD
    n8n_integration: 'text-red-500 bg-red-50',
=======
    curriculum_parse: 'text-green-500 bg-green-50',
    n8n_integration: 'text-red-500 bg-red-50',
    crm_suite: 'text-blue-700 bg-blue-100',
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
};
