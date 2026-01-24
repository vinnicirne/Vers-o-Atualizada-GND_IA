import { useState, useEffect } from 'react';
import { getDailyUsageChartData, DailyUsageDataPoint } from '../services/metricsService';

export interface ChartData {
  date: string;
  noticias: number;
  usuarios: number;
}

interface UseTokenUsageReturn {
  data: ChartData[] | null;
  loading: boolean;
  error: string | null;
}

// Função helper para formatar a data de 'YYYY-MM-DD' para 'DD/MM'
const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}`;
};

export const useTokenUsage = (): UseTokenUsageReturn => {
  const [data, setData] = useState<ChartData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);
        const rawData = await getDailyUsageChartData();
        
        const formattedData = rawData.map((item: DailyUsageDataPoint) => ({
            date: formatDate(item.report_date),
            noticias: item.news_count,
            usuarios: item.new_users_count,
        }));

        setData(formattedData);
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar dados do gráfico.');
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  return { data, loading, error };
};