import { useState, useEffect, useCallback } from 'react';
import { Plan } from '../types/plan.types';
import { getPlans, savePlans } from '../services/adminService';
import { PLANS as DEFAULT_PLANS_CONSTANT } from '../constants'; // Importar os planos padrão

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
        // Isso evita que `savePlans` seja chamado em cada carregamento se a config estiver vazia.
      }
      setAllPlans(fetchedPlans.filter(p => p.isActive)); // Filtra apenas planos ativos por padrão na UI
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
      await savePlans(updatedPlans, adminId);
      setAllPlans(updatedPlans.filter(p => p.isActive)); // Atualiza o estado local e filtra
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