import { ServiceKey, Plan, ServicePermission, UserPlan } from './types/plan.types'; // Importar os novos tipos de plano e serviço

interface CreatorSuiteModeConfig {
  value: ServiceKey; // Usar ServiceKey
  label: string;
  placeholder: string;
}

export const CREATOR_SUITE_MODES: CreatorSuiteModeConfig[] = [
  {
    value: 'news_generator',
    label: 'GDN Notícias',
    placeholder: 'Ex: Final da Libertadores, eventos de Ano Novo, alta do dólar...',
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
  {
    value: 'canva_structure',
    label: 'Estrutura para Canva',
    placeholder: 'Descreva a peça de design para Canva. Ex: "um post de Instagram para promover um evento de tecnologia, com tema futurista".',
  },
  {
    value: 'photoshop_structure',
    label: 'Estrutura para Photoshop',
    placeholder: 'Descreva a peça de design para Photoshop. Ex: "banner de YouTube para canal de games, estilo neon".',
  },
  {
    value: 'corel_structure',
    label: 'Estrutura para CorelDRAW',
    placeholder: 'Descreva a peça de design para CorelDRAW. Ex: "cartão de visita minimalista para advogado".',
  },
  {
    value: 'landingpage_generator',
    label: 'Gerador de Landing Page',
    placeholder: 'Descreva o produto ou serviço e o público-alvo. Ex: "Página de vendas para um e-book de receitas veganas para iniciantes".',
  },
];

// --- CUSTO POR AÇÃO (CRÉDITOS) ---
// Note: Este objeto TASK_COSTS não é mais o principal local para buscar custos.
// Os custos agora são definidos dentro de cada ServicePermission no objeto PLANS.
// Ele é mantido aqui para referência ou para cenários onde um custo global default é necessário,
// mas a prioridade é o `creditsPerUse` do ServicePermission.
export const TASK_COSTS: Record<ServiceKey | 'image_generation', number> = {
  news_generator: 1,
  text_to_speech: 1,
  copy_generator: 1,
  prompt_generator: 1,
  canva_structure: 1,
  photoshop_structure: 1,
  corel_structure: 1,
  landingpage_generator: 5, // Custo mais alto pois é uma feature premium
  image_generation: 2, 
};

// --- HIERARQUIA DE PLANOS (PADRÃO/INICIAL) ---
// Estes planos serão usados para semear a tabela `system_config` no banco de dados.
// Uma vez no DB, eles podem ser editados via painel admin.
// Free: Apenas Notícias e Copy. 3 Créditos.
// Basic: Adiciona Prompts. 25 Créditos.
// Standard: Adiciona Estrutura de Arte (todos os 3). 50 Créditos.
// Premium: Adiciona Landing Page (High Ticket). 100 Créditos.
// text_to_speech sempre habilitado se for notícia.

const commonServices: ServicePermission[] = [
  { key: 'news_generator', name: 'GDN Notícias', enabled: true, creditsPerUse: TASK_COSTS.news_generator },
  { key: 'copy_generator', name: 'Gerador de Copy', enabled: true, creditsPerUse: TASK_COSTS.copy_generator },
  { key: 'text_to_speech', name: 'Texto para Voz', enabled: true, creditsPerUse: TASK_COSTS.text_to_speech } // Habilitado por padrão
];

const promptService: ServicePermission = { key: 'prompt_generator', name: 'Gerador de Prompts', enabled: true, creditsPerUse: TASK_COSTS.prompt_generator };
const artServices: ServicePermission[] = [
  { key: 'canva_structure', name: 'Estrutura para Canva', enabled: true, creditsPerUse: TASK_COSTS.canva_structure },
  { key: 'photoshop_structure', name: 'Estrutura para Photoshop', enabled: true, creditsPerUse: TASK_COSTS.photoshop_structure },
  { key: 'corel_structure', name: 'Estrutura para CorelDRAW', enabled: true, creditsPerUse: TASK_COSTS.corel_structure },
];
const landingPageService: ServicePermission = { key: 'landingpage_generator', name: 'Gerador de Landing Page', enabled: true, creditsPerUse: TASK_COSTS.landingpage_generator };


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
      ...commonServices
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
      ...artServices,
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
      landingPageService
    ]
  }
};