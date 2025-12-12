export const APP_NAME = "GDN_IA";
export const APP_VERSION = "1.0.9";

export const API_CONFIG = {
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 3
};

export const GUEST_ID = 'guest';

export const CREATOR_SUITE_MODES = [
  { value: 'news_generator', label: 'GDN Notícias', placeholder: 'Digite o tema da notícia (ex: Jogos Olímpicos)...' },
  { value: 'landingpage_generator', label: 'Criador de Sites', placeholder: 'Descreva o site (ex: Site para clínica odontológica)...' },
  { value: 'image_generation', label: 'Studio de Arte IA', placeholder: 'Descreva a imagem (ex: Gato astronauta cyberpunk)...' },
  { value: 'text_to_speech', label: 'Texto para Voz', placeholder: 'Cole o texto para narrar...' },
  { value: 'copy_generator', label: 'Gerador de Copy', placeholder: 'Descreva o produto para venda...' },
  { value: 'prompt_generator', label: 'Engenharia de Prompt', placeholder: 'O que você quer que a IA faça?' },
  { value: 'canva_structure', label: 'Editor Visual', placeholder: 'Descreva o post para social media...' },
  { value: 'social_media_poster', label: 'Criador de Posts', placeholder: 'Tema do post para Instagram/LinkedIn...' },
  { value: 'curriculum_generator', label: 'Criador de Currículos', placeholder: 'Seu objetivo profissional...' },
  // n8n and crm might not be here if they are not "modes" in the generator list but separate tools
];

export const SERVICE_ICONS: Record<string, string> = {
  news_generator: 'fa-newspaper',
  landingpage_generator: 'fa-laptop-code',
  image_generation: 'fa-paint-brush',
  text_to_speech: 'fa-microphone-lines',
  copy_generator: 'fa-pen-nib',
  prompt_generator: 'fa-terminal',
  canva_structure: 'fa-vector-square',
  social_media_poster: 'fa-share-alt',
  curriculum_generator: 'fa-file-alt',
  crm_suite: 'fa-users-cog',
  n8n_integration: 'fa-bolt'
};

export const SERVICE_COLORS: Record<string, string> = {
  news_generator: 'text-green-600 bg-green-100',
  landingpage_generator: 'text-blue-600 bg-blue-100',
  image_generation: 'text-purple-600 bg-purple-100',
  text_to_speech: 'text-orange-600 bg-orange-100',
  copy_generator: 'text-yellow-600 bg-yellow-100',
  prompt_generator: 'text-gray-600 bg-gray-100',
  canva_structure: 'text-cyan-600 bg-cyan-100',
  social_media_poster: 'text-pink-600 bg-pink-100',
  curriculum_generator: 'text-indigo-600 bg-indigo-100',
  crm_suite: 'text-blue-800 bg-blue-50',
  n8n_integration: 'text-red-600 bg-red-100'
};

export const TASK_COSTS: Record<string, number> = {
  news_generator: 1,
  text_to_speech: 2,
  copy_generator: 1,
  prompt_generator: 1,
  canva_structure: 3,
  landingpage_generator: 25,
  image_generation: 5,
  social_media_poster: 5,
  curriculum_generator: 8,
  n8n_integration: 0,
  crm_suite: 0,
};

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    credits: 0,
    price: 0,
    interval: 'month',
    isActive: true,
    color: 'gray',
    expressCreditPrice: 1.0,
    services: CREATOR_SUITE_MODES.map(m => ({ key: m.value, name: m.label, enabled: false, creditsPerUse: TASK_COSTS[m.value] }))
  },
  // Add other plans as needed or keep minimal
};