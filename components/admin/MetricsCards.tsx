import React from 'react';
import { MetricCard } from './MetricCard';
import { useMetrics } from '../../hooks/useMetrics';
import { MetricCardSkeleton } from './MetricCardSkeleton';

export const MetricsCards: React.FC = () => {
  const { metrics, loading, error } = useMetrics();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
        <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg text-center">
            <strong>Falha ao carregar métricas:</strong> {error}
        </div>
    );
  }
  
  const formattedMetrics = [
    { title: "Total de Usuários", value: metrics?.totalUsers.toLocaleString('pt-BR') || '0', icon: "fa-users" },
    { title: "Usuários Ativos (7d)", value: metrics?.activeUsers.toLocaleString('pt-BR') || '0', icon: "fa-user-check" },
    { title: "Créditos em Circulação", value: metrics?.creditsInCirculation.toLocaleString('pt-BR') || '0', icon: "fa-coins" },
    { 
      title: "Faturamento Total", 
      value: metrics?.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00', 
      icon: "fa-wallet" 
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {formattedMetrics.map((metric, index) => (
        <MetricCard key={index} title={metric.title} value={metric.value} icon={metric.icon} />
      ))}
    </div>
  );
};