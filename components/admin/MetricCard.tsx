

import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  key?: React.Key;
  variant?: 'default' | 'danger' | 'warning';
}

export function MetricCard({ title, value, icon, variant = 'default' }: MetricCardProps) {
  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';
  
  let bgClass = 'bg-black/50 border-green-900/40';
  let iconBgClass = 'bg-green-900/20 text-green-400';
  let textClass = 'text-gray-100';
  let titleClass = 'text-gray-400';

  if (isDanger) {
      bgClass = 'bg-red-900/20 border-red-500/30';
      iconBgClass = 'bg-red-900/30 text-red-400';
      textClass = 'text-red-100';
      titleClass = 'text-red-300';
  } else if (isWarning) {
      bgClass = 'bg-yellow-900/10 border-yellow-500/30';
      iconBgClass = 'bg-yellow-900/20 text-yellow-400';
      textClass = 'text-yellow-100';
      titleClass = 'text-yellow-500/80';
  }

  return (
    <div className={`${bgClass} border rounded-lg p-5 flex items-center gap-4 shadow-lg shadow-black/30 transform hover:-translate-y-1 transition-transform duration-300 h-full overflow-hidden`}>
      <div className={`${iconBgClass} p-3.5 rounded-full flex-shrink-0`}>
        <i className={`fas ${icon} text-xl w-6 h-6 flex items-center justify-center`}></i>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-bold ${titleClass} uppercase tracking-wider truncate mb-0.5`} title={title}>{title}</p>
        <p className={`text-xl lg:text-2xl xl:text-3xl font-bold ${textClass} truncate`} title={value}>{value}</p>
      </div>
    </div>
  );
}