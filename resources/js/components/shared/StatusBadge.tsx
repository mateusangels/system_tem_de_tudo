import { Badge } from '@/components/ui/badge';

type StatusType = 'ativo' | 'inadimplente' | 'pendente' | 'parcial' | 'pago' | 'vencida' | 'ativa' | 'cancelada' | 'confirmado';

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  ativo: { label: 'Ativo', className: 'bg-success/10 text-success border-success/20' },
  inadimplente: { label: 'Inadimplente', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  pendente: { label: 'Pendente', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  parcial: { label: 'Parcial', className: 'bg-info/10 text-info border-info/20' },
  pago: { label: 'Pago', className: 'bg-success/10 text-success border-success/20' },
  vencida: { label: 'Vencida', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  ativa: { label: 'Ativa', className: 'bg-success/10 text-success border-success/20' },
  cancelada: { label: 'Cancelada', className: 'bg-muted text-muted-foreground border-border' },
  confirmado: { label: 'Confirmado', className: 'bg-success/10 text-success border-success/20' },
};

export const StatusBadge = ({ status }: { status: string }) => {
  const config = statusConfig[status as StatusType] || { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
};
