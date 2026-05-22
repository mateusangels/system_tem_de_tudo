import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

const DASHBOARD_PIN = import.meta.env.VITE_DASHBOARD_PIN || '1234';
const STORAGE_KEY = 'dashboard_pin_ok';

export const PinGate = ({ children }: { children: React.ReactNode }) => {
  const [authorized, setAuthorized] = useState(() => sessionStorage.getItem(STORAGE_KEY) === '1');
  const [pin, setPin] = useState('');
  const [cancel, setCancel] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authorized) inputRef.current?.focus();
  }, [authorized]);

  if (cancel) return <Navigate to="/produtos" replace />;
  if (authorized) return <>{children}</>;

  const validar = () => {
    if (pin === DASHBOARD_PIN) {
      sessionStorage.setItem(STORAGE_KEY, '1');
      setAuthorized(true);
    } else {
      toast({ title: '🔒 PIN incorreto', description: 'Acesso restrito ao proprietário', variant: 'destructive' });
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="flex flex-col items-center gap-3 mb-4">
          <div className="rounded-full bg-amber-500/15 p-3">
            <Lock className="w-6 h-6 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold">Área Restrita</h2>
          <p className="text-sm text-muted-foreground text-center">
            Digite o PIN do proprietário para acessar.
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">PIN</Label>
            <Input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') validar();
                if (e.key === 'Escape') setCancel(true);
              }}
              className="mt-1 text-center text-2xl font-bold tracking-widest"
              placeholder="••••"
              maxLength={10}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setCancel(true)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={validar}>
              Entrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
