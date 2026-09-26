import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm rounded-xl gap-2',
    lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-medium shadow-md shadow-brand-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all',
    secondary:
      'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100 font-medium border border-slate-700 disabled:opacity-50 disabled:pointer-events-none transition-all',
    danger:
      'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-medium shadow-md shadow-rose-600/20 disabled:opacity-50 disabled:pointer-events-none transition-all',
    outline:
      'bg-transparent hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 disabled:opacity-50 disabled:pointer-events-none transition-all',
    ghost:
      'bg-transparent hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:pointer-events-none transition-all',
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
