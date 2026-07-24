import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface SensorCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  badge?: ReactNode;
  live?: boolean;
}

export function SensorCard({ title, icon, children, className, badge, live }: SensorCardProps) {
  return (
    <div className={cn(
      'glass-card p-4 fade-in-up',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {live && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">LIVE</span>
            </div>
          )}
          {badge}
        </div>
      </div>
      {children}
    </div>
  );
}

interface ValueRowProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  highlight?: boolean;
}

export function ValueRow({ label, value, unit, highlight }: ValueRowProps) {
  const displayValue = value === null || value === undefined ? '—' : value;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn(
        'text-xs font-mono font-semibold',
        highlight ? 'text-primary' : 'text-foreground'
      )}>
        {displayValue}{unit && value !== null && value !== undefined ? <span className="text-muted-foreground ml-0.5 font-normal">{unit}</span> : ''}
      </span>
    </div>
  );
}
