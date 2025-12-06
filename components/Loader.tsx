


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
  // Add a return statement to render the loading UI
  return (
    <div className="mt-8 p-6 bg-white rounded-xl shadow-md border border-gray-200 text-center animate-fade-in">
        <div className="flex items-center justify-center mb-4">
            <i className="fas fa-spinner fa-spin text-4xl text-[var(--brand-primary)]"></i>
        </div>
        <h3 className="text-xl font-bold text-[var(--brand-secondary)] mb-2">{message.title}</h3>
        <p className="text-gray-500 text-sm">{message.subtitle}</p>
    </div>
  );
}