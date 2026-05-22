import { useEffect, useState } from 'react';
import { vendasApi } from '@/lib/api/index';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { formatBRL } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { Wallet, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

export default function Financeiro() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState<any[]>([]);

  const hojeISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    (async () => {
      try {
        const v: any = await vendasApi.list({ per_page: 200 } as any);
        setVendas(v.data || []);
      } catch (e: any) {
        toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState />;

  const totalHoje = vendas
    .filter(v => v.status === 'finalizada' && (v.created_at || '').startsWith(hojeISO))
    .reduce((s, v) => s + Number(v.total || 0), 0);
  const totalMes = vendas
    .filter(v => v.status === 'finalizada' && (v.created_at || '').startsWith(hojeISO.slice(0, 7)))
    .reduce((s, v) => s + Number(v.total || 0), 0);

  const porMetodo: Record<string, number> = {};
  vendas.filter(v => v.status === 'finalizada').forEach(v => {
    porMetodo[v.metodo_pagamento] = (porMetodo[v.metodo_pagamento] || 0) + Number(v.total || 0);
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Financeiro" description="Entradas, saídas e movimento de caixa" />

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground"><Calendar className="w-4 h-4" /> Vendas hoje</div>
          <p className="text-3xl font-extrabold mt-2 text-primary">{formatBRL(totalHoje)}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground"><TrendingUp className="w-4 h-4 text-success" /> Vendas este mês</div>
          <p className="text-3xl font-extrabold mt-2 text-success">{formatBRL(totalMes)}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground"><Wallet className="w-4 h-4" /> Crediário em aberto</div>
          <p className="text-3xl font-extrabold mt-2 text-amber-600">R$ 0,00</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Em construção</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/40">
          <h3 className="font-bold text-sm uppercase tracking-wider">Recebimentos por forma de pagamento</h3>
        </div>
        <div className="p-5 space-y-2">
          {Object.entries(porMetodo).map(([metodo, total]) => (
            <div key={metodo} className="flex justify-between items-center py-2 border-b border-border/40 last:border-b-0">
              <span className="capitalize font-medium">{metodo}</span>
              <span className="font-bold">{formatBRL(total)}</span>
            </div>
          ))}
          {Object.keys(porMetodo).length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-6">Sem vendas finalizadas ainda.</p>
          )}
        </div>
      </div>

      <div className="bg-muted/30 border-2 border-dashed border-border rounded-lg p-8 text-center">
        <TrendingDown className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-2" strokeWidth={1.5} />
        <p className="font-bold text-muted-foreground">Contas a pagar / a receber</p>
        <p className="text-xs text-muted-foreground mt-1">Módulo completo em construção. Em breve: lançamentos manuais, fluxo de caixa diário, DRE.</p>
      </div>
    </div>
  );
}
