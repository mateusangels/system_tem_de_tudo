import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState = ({ message = 'Ocorreu um erro ao carregar os dados.', onRetry }: ErrorStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
    <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
      <AlertTriangle className="w-8 h-8 text-destructive" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-1">Erro</h3>
    <p className="text-sm text-muted-foreground max-w-sm text-center">{message}</p>
    {onRetry && (
      <Button onClick={onRetry} variant="outline" className="mt-4">
        Tentar novamente
      </Button>
    )}
  </div>
);
