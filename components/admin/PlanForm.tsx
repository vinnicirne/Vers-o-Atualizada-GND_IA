

import React, { useState, useEffect, useCallback } from 'react';
import { Plan, ServiceKey, ServicePermission } from '../../types/plan.types';
import { CREATOR_SUITE_MODES, TASK_COSTS } from '../../constants'; // Importe CREATOR_SUITE_MODES para obter labels de serviço

interface PlanFormProps {
  initialData?: Plan; // Para edição de plano existente
  onSave?: (plan: Plan) => void; // Callback para salvar (opcional, se não for só console.log)
  isSaving?: boolean; // Estado de salvamento para desabilitar botões
}

// Lista de todas as chaves de serviço para garantir que todos os campos apareçam no formulário
const ALL_SERVICE_KEYS: ServiceKey[] = [
  'landingpage_generator',
  'news_generator',
  'text_to_speech',
  'prompt_generator',
  'canva_structure',
  'copy_generator',
  'image_generation',
  'social_media_poster', 
  'curriculum_generator', // NOVO
  'n8n_integration',
];

// Mapeamento para obter nomes de serviço (labels) de forma mais fácil
const serviceKeyToNameMap = new Map(
  CREATOR_SUITE_MODES.map(mode => [mode.value, mode.label])
);
// Adiciona manualmente serviços que não são modos de criação (não estão na sidebar)
serviceKeyToNameMap.set('n8n_integration', 'Integração N8N / Webhooks');

// Cores padrão para os planos (pode ser expandido)
const PLAN_COLORS = [
  { value: 'gray', label: 'Cinza' },
  { value: 'blue', label: 'Azul' },
  { value: 'green', label: 'Verde' },
  { value: 'purple', label: 'Roxo' },
  { value: 'yellow', label: 'Amarelo' },
  { value: 'red', label: 'Vermelho' },
];

export function PlanForm({ initialData, onSave, isSaving = false }: PlanFormProps) {
  const [id, setId] = useState(initialData?.id || '');
  const [name, setName] = useState(initialData?.name || '');
  const [credits, setCredits] = useState(String(initialData?.credits ?? 0));
  const [price, setPrice] = useState(String(initialData?.price ?? 0));
  const [interval, setInterval] = useState<'month' | 'year'>(initialData?.interval || 'month');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [color, setColor] = useState(initialData?.color || 'gray');
  const [expressCreditPrice, setExpressCreditPrice] = useState(String(initialData?.expressCreditPrice ?? 1.00));
  const [services, setServices] = useState<ServicePermission[]>([]);

  // Inicializa os serviços quando o componente monta ou initialData muda
  useEffect(() => {
    const defaultServices: ServicePermission[] = ALL_SERVICE_KEYS.map(key => ({
      key: key,
      name: serviceKeyToNameMap.get(key) || key.replace(/_/g, ' ').toUpperCase(),
      enabled: false,
      creditsPerUse: TASK_COSTS[key] ?? 1, // Usa o custo definido na constante ou 1 como fallback
    }));

    if (initialData) {
      // Mescla os serviços do initialData com a lista completa, garantindo que todos apareçam
      const mergedServices = defaultServices.map(defaultSvc => {
        const existingSvc = initialData.services.find(s => s.key === defaultSvc.key);
        return existingSvc ? { ...defaultSvc, ...existingSvc } : defaultSvc;
      });
      setServices(mergedServices);
      setId(initialData.id);
      setName(initialData.name);
      setCredits(String(initialData.credits));
      setPrice(String(initialData.price));
      setInterval(initialData.interval);
      setIsActive(initialData.isActive);
      setColor(initialData.color);
      setExpressCreditPrice(String(initialData.expressCreditPrice));
    } else {
      setServices(defaultServices);
      setId(`new-plan-${Date.now()}`); // Gerar um ID temporário para novos planos
      setName('');
      setCredits('0');
      setPrice('0');
      setInterval('month');
      setIsActive(true);
      setColor('gray');
      setExpressCreditPrice('1.00');
    }
  }, [initialData]);

  const handleServiceChange = useCallback((serviceKey: ServiceKey, field: 'enabled' | 'creditsPerUse', value: any) => {
    setServices(prevServices =>
      prevServices.map(svc =>
        svc.key === serviceKey ? { ...svc, [field]: value } : svc
      )
    );
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalPlan: Plan = {
      id: id,
      name: name,
      credits: parseInt(credits, 10),
      price: parseFloat(price),
      interval: interval,
      isActive: isActive,
      color: color,
      expressCreditPrice: parseFloat(expressCreditPrice),
      services: services.filter(svc => svc.enabled || svc.creditsPerUse !== undefined), // Inclui serviços habilitados ou com custo definido
    };

    console.log("Plano a ser salvo:", finalPlan);
    if (onSave) {
      onSave(finalPlan);
    }
  };

  // Light theme styles
  const inputClasses = "w-full bg-white border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition duration-300 disabled:opacity-50 disabled:bg-gray-50";
  const labelClasses = "block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500";
  const sectionTitleClasses = "text-xl font-bold text-[#263238] mb-4 border-b border-gray-200 pb-2";

  return (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Detalhes Básicos do Plano */}
        <div>
          <h2 className={sectionTitleClasses}>Detalhes do Plano</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="planId" className={labelClasses}>ID do Plano (Único)</label>
              <input
                id="planId"
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className={inputClasses}
                placeholder="Ex: basic, premium"
                required
                disabled={isSaving || !!initialData?.id} // ID não é editável após a criação
              />
            </div>
            <div>
              <label htmlFor="name" className={labelClasses}>Nome do Plano</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClasses}
                placeholder="Ex: Plano Básico, Plano Enterprise Cliente X"
                required
                disabled={isSaving}
              />
            </div>
            <div>
              <label htmlFor="credits" className={labelClasses}>Créditos Mensais (-1 para ilimitado)</label>
              <input
                id="credits"
                type="number"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                className={inputClasses}
                required
                min="-1"
                disabled={isSaving}
              />
            </div>
            <div>
              <label htmlFor="price" className={labelClasses}>Preço (R$)</label>
              <input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputClasses}
                required
                min="0"
                disabled={isSaving}
              />
            </div>
            <div>
              <label htmlFor="interval" className={labelClasses}>Intervalo de Cobrança</label>
              <select
                id="interval"
                value={interval}
                onChange={(e) => setInterval(e.target.value as 'month' | 'year')}
                className={inputClasses}
                disabled={isSaving}
              >
                <option value="month">Mensal</option>
                <option value="year">Anual</option>
              </select>
            </div>
            <div>
              <label htmlFor="expressCreditPrice" className={labelClasses}>Preço do Crédito Avulso (R$)</label>
              <input
                id="expressCreditPrice"
                type="number"
                step="0.01"
                value={expressCreditPrice}
                onChange={(e) => setExpressCreditPrice(e.target.value)}
                className={inputClasses}
                required
                min="0"
                disabled={isSaving}
              />
            </div>
            <div>
              <label htmlFor="color" className={labelClasses}>Cor de Destaque na UI</label>
              <select
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={inputClasses}
                disabled={isSaving}
              >
                {PLAN_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            
            <div className="flex items-center pt-8 col-span-1 md:col-span-2">
                <div className={`p-4 rounded-lg border w-full transition-colors ${isActive ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-300'}`}>
                    <label className="flex items-start cursor-pointer">
                        <input
                            id="isActive"
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="mt-1 h-5 w-5 bg-white border border-gray-300 rounded text-green-600 focus:ring-green-500 transition duration-200"
                            disabled={isSaving}
                        />
                        <div className="ml-3">
                            <span className="block text-sm font-bold text-gray-800">
                                {isActive ? 'Plano Público (Visível na Loja)' : 'Plano Customizado / Oculto'}
                            </span>
                            <span className="block text-xs text-gray-500 mt-1">
                                {isActive 
                                    ? 'Este plano aparecerá para todos os usuários na tela de "Planos".' 
                                    : 'Este plano NÃO aparecerá na loja. Use para criar planos personalizados para clientes específicos (Enterprise, VIP) e atribua manualmente na aba "Usuários".'
                                }
                            </span>
                        </div>
                    </label>
                </div>
            </div>
          </div>
        </div>

        {/* Permissões de Serviço */}
        <div>
          <h2 className={sectionTitleClasses}>Permissões de Serviço</h2>
          <div className="space-y-4">
            {services.map(service => (
              <div key={service.key} className="flex items-center justify-between bg-white p-4 rounded-md border border-gray-200 shadow-sm transition hover:border-gray-300">
                <div className="flex items-center flex-grow mr-4">
                  <input
                    id={`service-${service.key}`}
                    type="checkbox"
                    checked={service.enabled}
                    onChange={(e) => handleServiceChange(service.key, 'enabled', e.target.checked)}
                    className="h-5 w-5 bg-white border border-gray-300 rounded text-green-600 focus:ring-green-500 transition duration-200"
                    disabled={isSaving}
                  />
                  <label htmlFor={`service-${service.key}`} className="ml-3 text-sm font-medium text-gray-700 cursor-pointer select-none">
                    {service.name}
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <label htmlFor={`cost-${service.key}`} className="text-xs font-bold text-gray-500 whitespace-nowrap uppercase">
                    Custo (Créditos):
                  </label>
                  <input
                    id={`cost-${service.key}`}
                    type="number"
                    value={service.creditsPerUse ?? 1} // Garante que sempre exiba um valor
                    onChange={(e) => handleServiceChange(service.key, 'creditsPerUse', parseInt(e.target.value, 10) || 0)}
                    className="w-20 bg-gray-50 border border-gray-300 text-gray-700 p-2 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
                    min="0"
                    disabled={isSaving}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            className="px-8 py-3 font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Salvando...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i> Salvar Plano
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}