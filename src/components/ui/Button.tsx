import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 
  | 'primary' 
  | 'brand' 
  | 'secondary' 
  | 'success' 
  | 'danger' 
  | 'danger-solid' 
  | 'ghost' 
  | 'amber' 
  | 'outline';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  pill = false,
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  iconRight,
  className = '',
  children,
  type = 'button',
  ...props
}, ref) => {
  const variantClass = (() => {
    switch (variant) {
      case 'brand':
        return 'zone-btn-brand';
      case 'secondary':
        return 'zone-btn-secondary';
      case 'success':
        return 'zone-btn-success';
      case 'danger':
        return 'zone-btn-danger';
      case 'danger-solid':
        return 'zone-btn-danger-solid';
      case 'ghost':
        return 'zone-btn-ghost';
      case 'amber':
        return 'zone-btn-amber';
      case 'outline':
        return 'border border-slate-300 hover:border-slate-400 bg-transparent text-slate-700 hover:bg-slate-50';
      case 'primary':
      default:
        return 'zone-btn-primary';
    }
  })();

  const sizeClass = (() => {
    switch (size) {
      case 'sm':
        return 'zone-btn-sm';
      case 'lg':
        return 'zone-btn-lg';
      case 'md':
      default:
        return 'zone-btn-md';
    }
  })();

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`zone-btn ${variantClass} ${sizeClass} ${pill ? 'zone-btn-pill' : ''} ${fullWidth ? 'zone-btn-full' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0 flex items-center">{icon}</span>
      ) : null}
      
      {children && <span className="truncate">{children}</span>}

      {!loading && iconRight && (
        <span className="shrink-0 flex items-center">{iconRight}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'dark' | 'primary' | 'danger';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon,
  label,
  size = 'md',
  variant = 'default',
  className = '',
  disabled = false,
  type = 'button',
  ...props
}, ref) => {
  const sizeClass = size === 'sm' ? 'zone-btn-icon-sm' : size === 'lg' ? 'zone-btn-icon-lg' : '';
  const variantClass = (() => {
    switch (variant) {
      case 'ghost':
        return 'zone-btn-icon-ghost';
      case 'dark':
        return 'zone-btn-icon-dark';
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700 border-blue-700 shadow-sm';
      case 'danger':
        return 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200';
      case 'default':
      default:
        return '';
    }
  })();

  return (
    <button
      ref={ref}
      type={type}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={`zone-btn-icon ${sizeClass} ${variantClass} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
});

IconButton.displayName = 'IconButton';
