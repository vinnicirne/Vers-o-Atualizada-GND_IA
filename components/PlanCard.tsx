import React from 'react';
import { Plan, ServicePermission } from './types/plan.types';

interface PlanCardProps {
  plan: Plan;
  isCurrent?: boolean;
  onSelect?: (planId: string) => void;
}

// FIX: Explicitly define the functional component type using React.FC
// This helps TypeScript recognize that 'key' is a special React prop
// and should not be checked against PlanCardProps.
export const PlanCard: React.FC<PlanCardProps> = ({ plan, isCurrent = false, onSelect }) => {
  const isMostPopular = plan.name.toLowerCase().includes('premium'); // Exemplo: destacar o plano Premium
  const isFree = plan.price === 0;

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      gray: 'border-gray-500 text-gray-400',
      blue: 'border-blue-500 text-blue-400',
      green: 'border-green-500 text-green-400',
      purple: 'border-purple-500 text-purple-400',
      yellow: 'border-yellow-500 text-yellow-400',
      red: 'border-red-500 text-red-400',
    };
    return colors[color] || colors.gray; // Fallback para gray
  };

  const buttonClasses = `
    w-full py-3 rounded-lg font-bold text-sm transition-all flex justify-center items-center
    ${isCurrent
      ? 'bg-gray-800 text-gray-500 cursor-default'
      : isFree
        ? 'bg-gray-800 text-gray-400 cursor-default' // Não "assina" o plano gratuito
        : isMostPopular
          ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-600/20'
          : 'bg-green-600 hover:bg-green-500 text-black shadow-lg shadow-green-600/20'
    }
  `;

  return (
    <div
      className={`
        relative bg-gray-900/50 border-2 rounded-xl p-6 flex flex-col transition-all duration-300
        ${isCurrent ? 'border-green-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] transform scale-105 z-10' : 'border-gray-800 hover:border-gray-600'}
        ${isMostPopular && !isCurrent ? 'shadow-[0_0_25px_rgba(168,85,247,0.3)]' : ''}
      `}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-black text-xs font-bold px-3 py-1 rounded-full">
          SEU PLANO ATUAL
        </div>
      )}
      {isMostPopular && !isCurrent && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full rotate-3">
          <i className="fas fa-star mr-1"></i>MAIS POPULAR!
        </div>
      )}

      <div className="mb-6 text-center">
        <h4 className={`text-2xl font-bold uppercase tracking-widest ${getColorClass(plan.color).split(' ')[1]}`}>{plan.name}</h4>
        <div className="mt-3 flex items-baseline justify-center">
          <span className="text-4xl font-bold text-white">
            {isFree ? 'Grátis' : `R$ ${plan.price.toFixed(2).replace('.', ',')}`}
          </span>
          {plan.price > 0 && <span className="text-sm text-gray-500 ml-1">/mês</span>}
        </div>
      </div>

      <div className="flex-grow">
        <ul className="space-y-3 mb-6">
          <li className="flex items-center text-base text-white bg-gray-800 p-3 rounded-md justify-center">
            <i className="fas fa-coins text-yellow-500 mr-3"></i>
            <strong>{plan.credits === -1 ? 'Créditos Ilimitados' : `${plan.credits} créditos/mês`}</strong>
          </li>

          <li className="text-xs text-gray-500 uppercase font-bold mt-5 mb-2 tracking-wider border-b border-gray-700 pb-2 text-center">
            Acesso a Ferramentas:
          </li>
          {plan.services.map((service: ServicePermission, idx: number) => (
            <li key={idx} className={`flex items-center text-sm ${service.enabled ? 'text-gray-300' : 'text-gray-600'} transition-colors`}>
              {service.enabled ? (
                <i className="fas fa-check-circle text-green-500 mr-2 text-xs"></i>
              ) : (
                <i className="fas fa-times-circle text-gray-700 mr-2 text-xs"></i>
              )}
              {service.name}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => onSelect && onSelect(plan.id)}
        disabled={isCurrent || isFree} // Free Plan has no "subscription" button
        className={buttonClasses}
      >
        {isCurrent
          ? 'Plano Ativo'
          : isFree
            ? 'Começar Grátis'
            : <>Assinar Agora <i className="fas fa-arrow-right ml-2"></i></>
        }
      </button>
    </div>
  );
};