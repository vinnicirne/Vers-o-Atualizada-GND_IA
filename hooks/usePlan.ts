import { useCallback, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import { Plan, ServiceKey, ServicePermission } from '../types/plan.types';
import { usePlans } from './usePlans'; // Importar o novo hook usePlans

interface UsePlanReturn {
  currentPlan: Plan;
  userCredits: number;
  hasAccessToService: (serviceKey: ServiceKey) => boolean;
  getCreditsCostForService: (serviceKey: ServiceKey) => number;
  hasEnoughCredits: (serviceKey: ServiceKey) => boolean;
  canUseService: (serviceKey: ServiceKey) => boolean;
  getServicePermission: (serviceKey: ServiceKey) => ServicePermission | undefined;
}

export function usePlan(): UsePlanReturn {
  const { user } = useUser();
  const { allPlans, loading: loadingPlans } = usePlans(); // Usar o hook usePlans

  const currentPlan = useMemo<Plan>(() => {
    // Se ainda estiver carregando os planos ou não houver planos, retorna um plano 'free' placeholder
    if (loadingPlans || allPlans.length === 0) {
        // Retorna um plano free minimalista para evitar erros enquanto carrega
        return {
            id: 'free',
            name: 'Free (Carregando...)',
            credits: 0,
            price: 0,
            interval: 'month',
            isActive: true,
            color: 'gray',
            expressCreditPrice: 0,
            services: [],
        };
    }
    
    const userPlanId = user?.plan || 'free';
    const foundPlan = allPlans.find(p => p.id === userPlanId);
    
    // Se o plano do usuário não for encontrado na lista de planos ativos,
    // retorna o plano 'free' como fallback, garantindo que o usuário sempre tenha um plano base.
    return foundPlan || allPlans.find(p => p.id === 'free') || {
      id: 'free',
      name: 'Free',
      credits: 0,
      price: 0,
      interval: 'month',
      isActive: true,
      color: 'gray',
      expressCreditPrice: 0,
      services: [],
    };
  }, [user, allPlans, loadingPlans]);

  const userCredits = useMemo<number>(() => {
    return user?.credits ?? 0;
  }, [user]);

  const getServicePermission = useCallback((serviceKey: ServiceKey): ServicePermission | undefined => {
    return currentPlan.services.find(service => service.key === serviceKey);
  }, [currentPlan]);

  const hasAccessToService = useCallback((serviceKey: ServiceKey): boolean => {
    // Admins (credits === -1) sempre têm acesso a todos os serviços,
    // pois a intenção é que eles possam testar todas as funcionalidades.
    if (user?.credits === -1) {
      return true;
    }
    const service = getServicePermission(serviceKey);
    return service?.enabled === true;
  }, [user?.credits, getServicePermission]);

  const getCreditsCostForService = useCallback((serviceKey: ServiceKey): number => {
    const service = getServicePermission(serviceKey);
    // Se creditsPerUse não estiver definido, usa 1 como padrão.
    return service?.creditsPerUse ?? 1;
  }, [getServicePermission]);

  const hasEnoughCredits = useCallback((serviceKey: ServiceKey): boolean => {
    // Admins (credits === -1) sempre têm créditos suficientes.
    if (user?.credits === -1) {
      return true;
    }
    const cost = getCreditsCostForService(serviceKey);
    return userCredits >= cost;
  }, [user?.credits, userCredits, getCreditsCostForService]);

  const canUseService = useCallback((serviceKey: ServiceKey): boolean => {
    return hasAccessToService(serviceKey) && hasEnoughCredits(serviceKey);
  }, [hasAccessToService, hasEnoughCredits]);

  return {
    currentPlan,
    userCredits,
    hasAccessToService,
    getCreditsCostForService,
    hasEnoughCredits,
    canUseService,
    getServicePermission,
  };
}