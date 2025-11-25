
import { CreatorSuiteMode } from './types';

interface CreatorSuiteModeConfig {
  value: CreatorSuiteMode;
  label: string;
  placeholder: string;
}

export const CREATOR_SUITE_MODES: CreatorSuiteModeConfig[] = [
  {
    value: 'news',
    label: 'GDN Notícias',
    placeholder: 'Ex: Final da Libertadores, eventos de Ano Novo, alta do dólar...',
  },
  {
    value: 'prompts',
    label: 'Gerador de Prompts',
    placeholder: 'Descreva a tarefa para a qual você precisa de um prompt. Ex: "um prompt para criar um carrossel de 5 posts no Instagram sobre produtividade".',
  },
  {
    value: 'landing_page',
    label: 'Gerador de Landing Page',
    placeholder: 'Descreva o produto ou serviço e o público-alvo. Ex: "Página de vendas para um e-book de receitas veganas para iniciantes".',
  },
  {
    value: 'copy',
    label: 'Gerador de Copy',
    placeholder: 'Descreva o produto, o público e o objetivo do texto. Ex: "copy para anúncio no Facebook sobre um curso de marketing digital para pequenos empresários".',
  },
  {
    value: 'art_structure',
    label: 'Gerador de Estrutura para Arte',
    placeholder: 'Descreva a peça de design que você precisa. Ex: "um post de Instagram para promover um evento de tecnologia, com tema futurista".',
  },
];
