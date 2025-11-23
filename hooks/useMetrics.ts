import { useState, useEffect } from 'react';
import { getDashboardMetrics, DashboardMetrics } from '../services/metricsService';

interface UseMetricsReturn {
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string | null;
}

export const useMetrics = (): UseMetricsReturn => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
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
  }, []); // O array de dependências vazio garante que a busca ocorra apenas uma vez (cache leve)

  return { metrics, loading, error };
};