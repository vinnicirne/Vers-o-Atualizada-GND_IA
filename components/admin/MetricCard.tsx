

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
  
  // Light theme styles
  let bgClass = 'bg-white border-gray-200';
  let iconBgClass = 'bg-green-100 text-green-600';
  let textClass = 'text-[#263238]';
  let titleClass = 'text-gray-500';

  if (isDanger) {
      bgClass = 'bg-red-50 border-red-200';
      iconBgClass = 'bg-red-100 text-red-600';
      textClass = 'text-red-900';
      titleClass = 'text-red-600';
  } else if (isWarning) {
      bgClass = 'bg-yellow-50 border-yellow-200';
      iconBgClass = 'bg-yellow-100 text-yellow-600';
      textClass = 'text-yellow-900';
      titleClass = 'text-yellow-700';
  }

  return (
    <div className={`${bgClass} border rounded-lg p-5 flex items-center gap-4 shadow-sm hover:shadow-md transform hover:-translate-y-1 transition-all duration-300 h-full overflow-hidden`}>
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