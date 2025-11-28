
import React from 'react';
import { MetricCard } from './MetricCard';
import { useMetrics } from '../../hooks/useMetrics';
import { MetricCardSkeleton } from './MetricCardSkeleton';

interface MetricsCardsProps {
    dataVersion?: number;
}

export function MetricsCards({ dataVersion = 0 }: MetricsCardsProps) {
  const { metrics, loading, error } = useMetrics(dataVersion);

  if (loading && !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    );
  }

  if (error && !metrics) {
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
    { 
        title: "Comissões Pagas", 
        value: metrics?.totalCommissions.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00', 
        icon: "fa-hand-holding-dollar",
        variant: 'warning'
    },
    { title: "Serviços Gerados", value: metrics?.totalGenerations.toLocaleString('pt-BR') || '0', icon: "fa-robot" },
    { title: "Visitantes (Ações)", value: metrics?.guestGenerations.toLocaleString('pt-BR') || '0', icon: "fa-user-secret" },
    { 
        title: "Erros (24h)", 
        value: metrics?.systemErrors.toLocaleString('pt-BR') || '0', 
        icon: "fa-triangle-exclamation",
        variant: (metrics?.systemErrors || 0) > 0 ? 'danger' : 'default'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {formattedMetrics.map((metric, index) => (
        <MetricCard 
            key={index} 
            title={metric.title} 
            value={metric.value} 
            icon={metric.icon} 
            variant={metric.variant as any}
        />
      ))}
    </div>
  );
};
