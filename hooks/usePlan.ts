
import { useCallback, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import { Plan, ServiceKey, ServicePermission } from '../types/plan.types';
import { usePlans } from './usePlans'; // Importar o novo hook usePlans
import { PLANS, TASK_COSTS } from '../constants'; // Importar constantes de planos

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
        // Retorna o plano Free definido nas constantes como fallback seguro
        return PLANS.free;
    }
    
    const userPlanId = user?.plan || 'free';
    const foundPlan = allPlans.find(p => p.id === userPlanId);
    
    // Se o plano do usuário não for encontrado na lista de planos ativos,
    // retorna o plano 'free' como fallback, garantindo que o usuário sempre tenha um plano base.
    return foundPlan || allPlans.find(p => p.id === 'free') || PLANS.free;
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
    // Prioriza o custo definido no plano, senão usa o custo global (constants), senão 1
    return service?.creditsPerUse ?? TASK_COSTS[serviceKey] ?? 1;
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
