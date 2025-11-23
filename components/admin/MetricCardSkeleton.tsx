import React from 'react';

export const MetricCardSkeleton: React.FC = () => {
  return (
    <div className="bg-black/50 border border-green-900/40 rounded-lg p-6 flex items-center space-x-4 shadow-lg">
      <div className="bg-gray-800 p-4 rounded-full animate-pulse">
        <div className="w-8 h-8 rounded-full bg-gray-700"></div>
      </div>
      <div className="w-full">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2 animate-pulse"></div>
        <div className="h-8 bg-gray-700 rounded w-1/2 animate-pulse"></div>
      </div>
    </div>
  );
};