
import React from 'react';
import { Plan, ServicePermission } from '../types/plan.types';

interface PlanCardProps {
  plan: Plan;
  isCurrent?: boolean;
  onSelect?: (planId: string) => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, isCurrent = false, onSelect }) => {
  const isMostPopular = plan.name.toLowerCase().includes('premium'); 
  const isFree = plan.price === 0;

  const buttonClasses = `
    w-full py-3 rounded-lg font-bold text-sm transition-all flex justify-center items-center shadow-md
    ${isCurrent
      ? 'bg-gray-100 text-gray-500 cursor-default border border-gray-200'
      : isFree
        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer border border-gray-300'
        : isMostPopular
          ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-purple-200'
          : 'bg-[#F39C12] hover:bg-orange-500 text-white shadow-orange-100'
    }
  `;

  return (
    <div
      className={`
        relative bg-white border rounded-xl p-6 flex flex-col transition-all duration-300 shadow-sm
        ${isCurrent ? 'border-green-500 shadow-lg ring-1 ring-green-500/50 transform scale-105 z-10' : 'border-gray-200 hover:border-gray-300 hover:shadow-xl'}
        ${isMostPopular && !isCurrent ? 'shadow-md border-purple-200' : ''}
      `}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
          SEU PLANO ATUAL
        </div>
      )}
      {isMostPopular && !isCurrent && (
        <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full rotate-3 shadow-sm border border-yellow-500/20">
          <i className="fas fa-star mr-1"></i>MAIS POPULAR!
        </div>
      )}

      <div className="mb-6 text-center">
        <h4 className={`text-2xl font-bold uppercase tracking-widest text-[#263238]`}>{plan.name}</h4>
        <div className="mt-3 flex items-baseline justify-center">
          <span className="text-4xl font-bold text-[#263238]">
            {isFree ? 'Grátis' : `R$ ${plan.price.toFixed(2).replace('.', ',')}`}
          </span>
          {plan.price > 0 && <span className="text-sm text-gray-500 ml-1">/mês</span>}
        </div>
      </div>

      <div className="flex-grow">
        <ul className="space-y-3 mb-6">
          <li className="flex items-center text-base text-gray-600 bg-[#ECEFF1] border border-gray-200 p-3 rounded-md justify-center font-medium">
            <i className="fas fa-coins text-[#F39C12] mr-3"></i>
            {plan.credits === -1 ? 'Créditos Ilimitados' : `${plan.credits} créditos/mês`}
          </li>

          <li className="text-xs text-gray-400 uppercase font-bold mt-5 mb-2 tracking-wider border-b border-gray-100 pb-2 text-center">
            Acesso a Ferramentas:
          </li>
          {plan.services.map((service: ServicePermission, idx: number) => (
            <li key={idx} className={`flex items-center text-sm ${service.enabled ? 'text-gray-600' : 'text-gray-400 line-through decoration-gray-300'} transition-colors`}>
              {service.enabled ? (
                <i className="fas fa-check-circle text-green-500 mr-2 text-xs"></i>
              ) : (
                <i className="fas fa-times-circle text-gray-300 mr-2 text-xs"></i>
              )}
              {service.name}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => onSelect && onSelect(plan.id)}
        disabled={isCurrent}
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
