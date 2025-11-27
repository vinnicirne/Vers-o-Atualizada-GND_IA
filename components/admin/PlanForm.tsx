
import React, { useState, useEffect, useCallback } from 'react';
import { Plan, ServiceKey, ServicePermission } from '../../types/plan.types';
import { CREATOR_SUITE_MODES } from '../../constants'; // Importe CREATOR_SUITE_MODES para obter labels de serviço

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
  'institutional_website_generator', // Novo
];

// Mapeamento para obter nomes de serviço (labels) de forma mais fácil
const serviceKeyToNameMap = new Map(
  CREATOR_SUITE_MODES.map(mode => [mode.value, mode.label])
);

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
      creditsPerUse: 1, // Default cost
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

  const inputClasses = "w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  const labelClasses = "block text-xs uppercase font-bold mb-2 tracking-wider text-green-400";
  const sectionTitleClasses = "text-xl font-bold text-green-400 mb-4 border-b border-green-900/30 pb-2";

  return (
    <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Detalhes Básicos do Plano */}
        <div>
          <h2 className={sectionTitleClasses}>Detalhes do Plano</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                placeholder="Ex: Plano Básico, Plano Premium"
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
            <div className="flex items-center pt-8">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-5 w-5 bg-black border-2 border-green-900/60 rounded text-green-500 focus:ring-green-500 focus:ring-offset-black transition duration-200"
                disabled={isSaving}
              />
              <label htmlFor="isActive" className="ml-3 text-sm text-gray-300">Plano Ativo</label>
            </div>
          </div>
        </div>

        {/* Permissões de Serviço */}
        <div>
          <h2 className={sectionTitleClasses}>Permissões de Serviço</h2>
          <div className="space-y-4">
            {services.map(service => (
              <div key={service.key} className="flex items-center justify-between bg-gray-950/50 p-3 rounded-md border border-green-900/10">
                <div className="flex items-center flex-grow mr-4">
                  <input
                    id={`service-${service.key}`}
                    type="checkbox"
                    checked={service.enabled}
                    onChange={(e) => handleServiceChange(service.key, 'enabled', e.target.checked)}
                    className="h-5 w-5 bg-black border-2 border-green-900/60 rounded text-green-500 focus:ring-green-500 focus:ring-offset-black transition duration-200"
                    disabled={isSaving}
                  />
                  <label htmlFor={`service-${service.key}`} className="ml-3 text-sm text-gray-300">
                    {service.name}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <label htmlFor={`cost-${service.key}`} className="text-xs text-gray-400 whitespace-nowrap">
                    Custo (Créditos):
                  </label>
                  <input
                    id={`cost-${service.key}`}
                    type="number"
                    value={service.creditsPerUse ?? 1} // Garante que sempre exiba um valor
                    onChange={(e) => handleServiceChange(service.key, 'creditsPerUse', parseInt(e.target.value, 10) || 0)}
                    className="w-20 bg-black border-2 border-green-900/60 text-gray-200 p-2 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    min="0"
                    disabled={isSaving}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-6 border-t border-green-900/30">
          <button
            type="submit"
            className="px-8 py-3 font-bold text-black bg-green-600 rounded-lg hover:bg-green-500 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-wait flex items-center"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i> Salvando...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i> Salvar Plano
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
