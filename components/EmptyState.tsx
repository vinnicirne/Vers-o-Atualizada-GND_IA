import React from 'react';
import { FileCode, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
        <FileCode className="w-8 h-8 text-indigo-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">{title}</h2>
      <p className="text-gray-500 max-w-md mb-8">{description}</p>
      
      <div className="flex gap-4">
        <button className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
          Get Started
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};