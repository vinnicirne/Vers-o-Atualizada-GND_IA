
import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  key?: React.Key;
}

export function MetricCard({ title, value, icon }: MetricCardProps) {
  return (
    <div className="bg-black/50 border border-green-900/40 rounded-lg p-5 flex items-center gap-4 shadow-lg shadow-black/30 transform hover:-translate-y-1 transition-transform duration-300 h-full overflow-hidden">
      <div className="bg-green-900/20 p-3.5 rounded-full flex-shrink-0">
        <i className={`fas ${icon} text-xl text-green-400 w-6 h-6 flex items-center justify-center`}></i>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate mb-0.5" title={title}>{title}</p>
        <p className="text-xl lg:text-2xl xl:text-3xl font-bold text-gray-100 truncate" title={value}>{value}</p>
      </div>
    </div>
  );
}
