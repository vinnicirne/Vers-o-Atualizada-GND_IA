
import { useState, useEffect } from 'react';
import { getDashboardMetrics, DashboardMetrics } from '../services/metricsService';

interface UseMetricsReturn {
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string | null;
}

export const useMetrics = (refreshTrigger: number = 0): UseMetricsReturn => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Apenas seta loading true se for a primeira carga
        if (refreshTrigger === 0) setLoading(true);
        setError(null);
        const data = await getDashboardMetrics();
        setMetrics(data);
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar métricas.');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [refreshTrigger]); 

  return { metrics, loading, error };
};
