import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { useTokenUsage } from '../../hooks/useTokenUsage';
import { TokenUsageChartSkeleton } from './TokenUsageChartSkeleton';

export const TokenUsageChart: React.FC = () => {
  const { data, loading, error } = useTokenUsage();

  if (loading) {
    return <TokenUsageChartSkeleton />;
  }
  
  if (error) {
    return (
        <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-red-900/30">
            <h3 className="text-xl font-bold text-red-400 mb-4">Erro ao Carregar Gráfico</h3>
             <div className="bg-black/40 h-64 flex items-center justify-center rounded-md">
                <p className="text-red-400/80">{error}</p>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
      <h3 className="text-xl font-bold text-green-400 mb-4">Uso da Plataforma (Últimos 7 Dias)</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 20,
              left: -10,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(34, 197, 94, 0.1)" />
            <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
            <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip
                contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    borderColor: 'rgba(34, 197, 94, 0.5)',
                    borderRadius: '0.5rem',
                }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ fontWeight: 'bold' }}
            />
            <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}/>
            <Bar dataKey="noticias" name="Notícias Geradas" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="usuarios" name="Novos Usuários" fill="#38BDF8" radius={[4, 4, 0, 0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};