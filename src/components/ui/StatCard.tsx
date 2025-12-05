import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'income' | 'expense' | 'transfer' | 'primary';
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  variant = 'default',
  trend,
  className 
}: StatCardProps) {
  const variantClasses = {
    default: 'stat-card',
    income: 'stat-card stat-card-income',
    expense: 'stat-card stat-card-expense',
    transfer: 'stat-card stat-card-transfer',
    primary: 'stat-card stat-card-primary',
  };

  const iconBgClasses = {
    default: 'bg-muted',
    income: 'bg-income-muted',
    expense: 'bg-expense-muted',
    transfer: 'bg-transfer-muted',
    primary: 'bg-primary/10',
  };

  const iconColorClasses = {
    default: 'text-foreground',
    income: 'text-income',
    expense: 'text-expense',
    transfer: 'text-transfer',
    primary: 'text-primary',
  };

  return (
    <div className={cn(variantClasses[variant], 'animate-fade-in', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className={cn(
            'text-2xl font-bold mono-number',
            variant === 'income' && 'amount-income',
            variant === 'expense' && 'amount-expense',
            variant === 'transfer' && 'amount-transfer',
          )}>
            {typeof value === 'number' ? value.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }) : value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-sm font-medium',
              trend.direction === 'up' && 'text-income',
              trend.direction === 'down' && 'text-expense',
              trend.direction === 'stable' && 'text-muted-foreground',
            )}>
              {trend.direction === 'up' && '↑'}
              {trend.direction === 'down' && '↓'}
              {trend.direction === 'stable' && '→'}
              <span>{trend.value}% vs last month</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            iconBgClasses[variant]
          )}>
            <Icon className={cn('w-5 h-5', iconColorClasses[variant])} />
          </div>
        )}
      </div>
    </div>
  );
}
