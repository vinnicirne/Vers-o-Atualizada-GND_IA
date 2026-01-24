import React from 'react';
import { BaseComponentProps } from '../types';

export const Card: React.FC<BaseComponentProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
      {children}
    </div>
  );
};