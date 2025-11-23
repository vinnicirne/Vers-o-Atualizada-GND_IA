import React from 'react';

export const TokenUsageChartSkeleton: React.FC = () => {
  return (
    <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
      <div className="h-8 bg-gray-700 rounded w-3/5 mb-4 animate-pulse"></div>
      <div className="bg-black/40 h-72 w-full flex items-end justify-between p-4 rounded-md animate-pulse">
        {/* Simula 7 barras do gráfico */}
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="w-1/12 bg-gray-700 rounded-t-md"
            style={{ height: `${Math.random() * 60 + 20}%` }} // Altura aleatória para visualização
          ></div>
        ))}
      </div>
    </div>
  );
};