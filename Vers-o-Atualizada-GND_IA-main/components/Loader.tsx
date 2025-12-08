
import React from 'react';
import { ServiceKey } from '../types/plan.types';

interface LoaderProps {
  mode?: ServiceKey;
}

export function Loader({ mode }: LoaderProps) {
  
  const getLoadingMessage = (currentMode?: ServiceKey) => {
    switch (currentMode) {
        case 'landingpage_generator':
            return { title: 'Codificando sua Landing Page...', subtitle: 'Estruturando HTML, aplicando Tailwind CSS e design responsivo.' };
        case 'image_generation':
            return { title: 'Renderizando Arte IA...', subtitle: 'Otimizando prompt e processando pixels em alta definição.' };
        case 'text_to_speech':
            return { title: 'Sintetizando Voz Neural...', subtitle: 'Convertendo texto em áudio com entonação natural.' };
        case 'copy_generator':
            return { title: 'Escrevendo Copy Persuasiva...', subtitle: 'Aplicando gatilhos mentais e otimizando para conversão.' };
        case 'prompt_generator':
            return { title: 'Engenharia de Prompt...', subtitle: 'Refinando instruções para obter o melhor resultado da IA.' };
        case 'canva_structure':
            return { title: 'Renderizando Design Editável...', subtitle: 'Montando layout visual, camadas e tipografia para Social Media.' };
        case 'news_generator':
            return { title: 'Analisando dados e gerando sua notícia...', subtitle: 'Cruzando fatos recentes e estruturando o artigo.' };
        default:
            return { title: 'Gerando Conteúdo Inteligente...', subtitle: 'A IA está trabalhando no seu pedido.' };
    }
  };

  const message = getLoadingMessage(mode);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-green-400 animate-fade-in">
      <div className="relative mb-4">
        <svg className="animate-spin h-12 w-12 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {/* Ícone central pulsante dependendo do modo */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-white opacity-80">
            <i className={`fas ${mode === 'image_generation' ? 'fa-paint-brush' : 'fa-brain'} animate-pulse`}></i>
        </div>
      </div>
      
      <p className="text-xl font-bold tracking-wide mb-2 text-green-400">{message.title}</p>
      <p className="text-sm text-gray-500 font-mono">{message.subtitle}</p>
    </div>
  );
};
