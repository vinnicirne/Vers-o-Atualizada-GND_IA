import React from 'react';
import { BaseComponentProps } from '../types';

interface ButtonProps extends BaseComponentProps {
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  variant = 'primary', 
  disabled = false, 
  className = '', 
  children 
}) => {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm hover:shadow",
    secondary: "bg-slate-800 text-white hover:bg-slate-900 focus:ring-slate-500 shadow-sm",
    outline: "border-2 border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-slate-400"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};