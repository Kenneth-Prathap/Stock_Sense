import React from 'react';

interface BadgeProps {
  variant?:
    | 'default'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'neutral'
    | 'purple';
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  const variantClasses = {
    default: 'bg-slate-800 text-slate-300 border border-slate-700',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    info: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    neutral: 'bg-slate-700/50 text-slate-300 border border-slate-600/40',
    purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full tracking-wide transition-colors ${sizeClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    DRAFT: { label: 'Draft', variant: 'neutral' },
    WAITING: { label: 'Waiting', variant: 'warning' },
    READY: { label: 'Ready', variant: 'info' },
    PICKED: { label: 'Picked', variant: 'purple' },
    PACKED: { label: 'Packed', variant: 'info' },
    DONE: { label: 'Done', variant: 'success' },
    CANCELED: { label: 'Canceled', variant: 'danger' },
    IN_STOCK: { label: 'In Stock', variant: 'success' },
    LOW_STOCK: { label: 'Low Stock', variant: 'warning' },
    OUT_OF_STOCK: { label: 'Out of Stock', variant: 'danger' },
    RECEIPT: { label: 'Receipt', variant: 'info' },
    DELIVERY: { label: 'Delivery', variant: 'purple' },
    TRANSFER: { label: 'Transfer', variant: 'warning' },
    ADJUSTMENT: { label: 'Adjustment', variant: 'danger' },
  };

  const config = map[status] || { label: status, variant: 'default' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};
