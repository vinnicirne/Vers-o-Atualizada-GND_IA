
export type ServiceKey =
  | 'landingpage_generator'
  | 'news_generator'
  | 'text_to_speech'
  | 'prompt_generator'
  | 'canva_structure'
  | 'copy_generator'
  | 'image_generation'; // Novo modo adicionado

export interface ServicePermission {
  key: ServiceKey;
  name: string; // Nome em português
  enabled: boolean;
  creditsPerUse?: number; // Opcional, custo em créditos por uso
}

export interface Plan {
  id: string; // Ex: 'free', 'basic', 'premium' (Corresponde a UserPlan)
  name: string;
  credits: number; // Créditos mensais inclusos
  price: number; // Preço do plano
  interval: 'month' | 'year'; // Intervalo de cobrança
  isActive: boolean; // Se o plano está ativo para ser oferecido
  services: ServicePermission[]; // Permissões de serviço para este plano
  color: string; // Cor do plano para UI
  expressCreditPrice: number; // Preço do crédito avulso para este plano
}

// UserPlan now references the ID of the Plan type
export type UserPlan = Plan['id']; // Definido aqui, onde 'Plan' está disponível
