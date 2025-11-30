
import { useState, useEffect, useCallback } from 'react';
import { Plan } from '../types/plan.types';
import { getPlans, savePlans } from '../services/adminService';
import { PLANS as DEFAULT_PLANS_CONSTANT, TASK_COSTS } from '../constants'; // Importar os planos padrão e custos

interface UsePlansReturn {
  allPlans: Plan[];
  loading: boolean;
  error: string | null;
  refreshPlans: () => Promise<void>;
  updateAndSavePlans: (updatedPlans: Plan[], adminId: string) => Promise<void>;
}

export function usePlans(): UsePlansReturn {
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to sync costs from constant code to plan objects
  const syncPlanCosts = (plans: Plan[]): Plan[] => {
    return plans.map(plan => ({
      ...plan,
      services: plan.services.map(service => ({
        ...service,
        // Override credit cost with the constant value if it exists in TASK_COSTS
        creditsPerUse: TASK_COSTS[service.key] ?? service.creditsPerUse ?? 1
      }))
    }));
  };

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let fetchedPlans = await getPlans();
      
      // Se o banco de dados retornar vazio, inicializa com os planos padrão do constants.ts
      if (!fetchedPlans || fetchedPlans.length === 0) {
        console.log("Nenhum plano encontrado no banco de dados. Inicializando com planos padrão.");
        // Converte o objeto de planos padrão para um array
        fetchedPlans = Object.values(DEFAULT_PLANS_CONSTANT);
        // NOTA: Não salvamos automaticamente aqui. O admin deve explicitamente salvar a primeira vez.
      }
      
      // Sincroniza custos para garantir que a UI mostre os valores do código
      const syncedPlans = syncPlanCosts(fetchedPlans);

      // RETORNA TODOS OS PLANOS (ATIVOS E INATIVOS)
      // O filtro visual deve ser feito no componente de exibição do usuário (PlansModal),
      // permitindo que o Admin veja planos ocultos/customizados.
      setAllPlans(syncedPlans); 
    } catch (err: any) {
      console.error("Erro ao buscar planos:", err);
      setError(err.message || 'Falha ao carregar planos.');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAndSavePlans = useCallback(async (updatedPlans: Plan[], adminId: string) => {
    setLoading(true); // Pode setar loading para indicar que está salvando
    setError(null);
    try {
      // Garante que estamos salvando com os custos sincronizados
      const syncedPlans = syncPlanCosts(updatedPlans);

      await savePlans(syncedPlans, adminId);
      setAllPlans(syncedPlans); // Atualiza o estado local com todos os planos
    } catch (err: any) {
      console.error("Erro ao salvar planos:", err);
      setError(err.message || 'Falha ao salvar planos.');
      throw err; // Re-throw para que o componente chamador possa lidar com o erro
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return {
    allPlans,
    loading,
    error,
    refreshPlans: fetchPlans,
    updateAndSavePlans,
  };
}
