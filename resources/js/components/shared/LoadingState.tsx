import { Loader2 } from 'lucide-react';

export const LoadingState = ({ message = 'Carregando...' }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
    <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);
