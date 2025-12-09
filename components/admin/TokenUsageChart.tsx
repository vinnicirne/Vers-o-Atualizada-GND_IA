
import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { useTokenUsage } from '../../hooks/useTokenUsage';
import { TokenUsageChartSkeleton } from './TokenUsageChartSkeleton';

export function TokenUsageChart() {
  const { data, loading, error } = useTokenUsage();

  if (loading) {
    return <TokenUsageChartSkeleton />;
  }
  
  if (error) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
            <h3 className="text-xl font-bold text-red-600 mb-4">Erro ao Carregar Gráfico</h3>
             <div className="bg-red-50 h-64 flex items-center justify-center rounded-md">
                <p className="text-red-500">{error}</p>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-xl font-bold text-[#263238] mb-4">Uso da Plataforma (Últimos 7 Dias)</h3>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 12 }} />
            <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip
                contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    borderColor: '#E5E7EB',
                    borderRadius: '0.5rem',
                    color: '#1F2937',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#6B7280', fontWeight: 'bold' }}
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
