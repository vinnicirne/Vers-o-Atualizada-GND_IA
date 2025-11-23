import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon }) => {
  return (
    <div className="bg-black/50 border border-green-900/40 rounded-lg p-6 flex items-center space-x-4 shadow-lg shadow-black/30 transform hover:-translate-y-1 transition-transform duration-300">
      <div className="bg-green-900/20 p-4 rounded-full">
        <i className={`fas ${icon} text-2xl text-green-400`}></i>
      </div>
      <div>
        <p className="text-sm text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-bold text-gray-100">{value}</p>
      </div>
    </div>
  );
};