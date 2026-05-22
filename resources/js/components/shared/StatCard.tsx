import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  delay?: number;
}

export const StatCard = ({ title, value, icon: Icon, trend, delay = 0 }: StatCardProps) => (
  <div
    className="stat-card animate-fade-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
        <Icon className="w-5 h-5 text-accent-foreground" />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          trend.positive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
        }`}>
          {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </span>
      )}
    </div>
    <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
    <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
  </div>
);
