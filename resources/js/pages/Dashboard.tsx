import { useEffect, useState, useMemo } from 'react';
import {
  DollarSign, TrendingUp, ShoppingCart, AlertTriangle, Calendar,
  Package, User, Wallet, Boxes, HandCoins,
} from 'lucide-react';
import { dashboardApi, type DashboardCompleto } from '@/lib/api/index';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { formatBRL, formatQtd } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CORES = ['#fbbf00', '#0f0f0f', '#dc2626', '#0ea5e9', '#10b981', '#8b5cf6'];
const tooltipStyle = { borderRadius: '6px', border: '1px solid hsl(var(--border))', fontSize: '12px', background: 'hsl(var(--card))' };

type Periodo = 'hoje' | 'mes_atual' | 'mes_passado' | 'ultimos_3' | 'ultimos_6' | 'ano_atual' | 'custom';

const periodoLabels: Record<Periodo, string> = {
  hoje: 'Hoje',
  mes_atual: 'Mês Atual',
  mes_passado: 'Mês Passado',
  ultimos_3: 'Últimos 3 meses',
  ultimos_6: 'Últimos 6 meses',
  ano_atual: 'Ano Atual',
  custom: 'Personalizado',
};

function periodoRange(periodo: Periodo, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (periodo) {
    case 'hoje': return { start: new Date(y, m, now.getDate()), end: new Date(y, m, now.getDate(), 23, 59, 59) };
    case 'mes_atual': return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59) };
    case 'mes_passado': return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59) };
    case 'ultimos_3': return { start: new Date(y, m - 2, 1), end: new Date(y, m + 1, 0, 23, 59, 59) };
    case 'ultimos_6': return { start: new Date(y, m - 5, 1), end: new Date(y, m + 1, 0, 23, 59, 59) };
    case 'ano_atual': return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59) };
    case 'custom': return {
      start: customStart ? new Date(customStart) : new Date(y, m, 1),
      end: customEnd ? new Date(customEnd + 'T23:59:59') : new Date(y, m + 1, 0, 23, 59, 59),
    };
  }
}

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

const Dashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>('mes_atual');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<DashboardCompleto | null>(null);

  const customInvalido = periodo === 'custom' && customStart && customEnd && customEnd < customStart;

  const range = useMemo(() => periodoRange(periodo, customStart, customEnd), [periodo, customStart, customEnd]);

  useEffect(() => {
    if (customInvalido) {
      toast({
        title: 'Período inválido',
        description: 'A data final precisa ser maior ou igual à data inicial.',
        variant: 'destructive',
      });
      return;
    }
    let alive = true;
    setLoading(true);
    dashboardApi.completo(toIsoDate(range.start), toIsoDate(range.end))
      .then(d => { if (alive) setData(d); })
      .catch(console.error)
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [range.start.getTime(), range.end.getTime(), customInvalido]);

  if (loading || !data) return <LoadingState />;

  const { totais, vendas_por_funcionario, vendas_por_metodo, mais_vendidos, evolucao_mensal } = data;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Dashboard" description="Visão geral da loja" />

      {/* Filtro de período */}
      <div className="bg-card rounded-lg border border-border p-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-foreground">
          <Calendar className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Período</span>
        </div>
        <div className="min-w-[180px]">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(periodoLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {periodo === 'custom' && (
          <>
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase">De</Label>
              <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-9 w-40" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase">Até</Label>
              <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-9 w-40" />
            </div>
          </>
        )}
        <span className="text-xs text-muted-foreground ml-auto font-mono">
          {range.start.toLocaleDateString('pt-BR')} – {range.end.toLocaleDateString('pt-BR')}
        </span>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="card-industrial p-4 pl-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground"><ShoppingCart className="w-4 h-4" /> Vendido</div>
          <p className="text-2xl font-extrabold mt-1">{formatBRL(totais.vendas_total)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{totais.qtd_vendas} vendas (bruto)</p>
        </div>
        <div className="card-industrial p-4 pl-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-success"><HandCoins className="w-4 h-4" /> Recebido</div>
          <p className="text-2xl font-extrabold mt-1 text-success">{formatBRL(totais.recebido_total ?? 0)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">caixa real (sem fiado em aberto)</p>
        </div>
        <div className="card-industrial p-4 pl-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground"><DollarSign className="w-4 h-4" /> Ticket médio</div>
          <p className="text-2xl font-extrabold mt-1">{formatBRL(totais.ticket_medio)}</p>
        </div>
        <div className="card-industrial p-4 pl-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-destructive"><AlertTriangle className="w-4 h-4" /> Estoque baixo</div>
          <p className="text-2xl font-extrabold text-destructive mt-1">{totais.produtos_baixo}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">produtos abaixo do mínimo</p>
        </div>
        <div className="card-industrial p-4 pl-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground"><Boxes className="w-4 h-4" /> Valor em estoque</div>
          <p className="text-2xl font-extrabold mt-1">{formatBRL(totais.valor_estoque)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">a custo</p>
        </div>
        <div className="card-industrial p-4 pl-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-success"><TrendingUp className="w-4 h-4" /> Operadores</div>
          <p className="text-2xl font-extrabold mt-1">{vendas_por_funcionario.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">ativos no período</p>
        </div>
      </div>

      {/* Evolução */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-extrabold">Evolução mensal</h3>
            <p className="text-xs text-muted-foreground">Faturamento nos últimos 6 meses</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolucao_mensal} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${v}`} width={70} />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
              <Bar dataKey="vendas" fill="#fbbf00" radius={[4, 4, 0, 0]} name="Faturamento" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-extrabold uppercase tracking-wider mb-3 flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Vendas por operador</h3>
          {vendas_por_funcionario.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda</p>
          ) : (
            <div className="space-y-2">
              {vendas_por_funcionario.map((f, i) => (
                <div key={f.nome} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <div>
                      <p className="font-medium">{f.nome}</p>
                      <p className="text-[10px] text-muted-foreground">{f.qtd} vendas</p>
                    </div>
                  </div>
                  <span className="font-bold">{formatBRL(f.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-extrabold uppercase tracking-wider mb-3 flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Por forma de pagamento</h3>
          {vendas_por_metodo.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda</p>
          ) : (
            <>
              <div className="h-40 mb-3">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={vendas_por_metodo} dataKey="total" nameKey="metodo" cx="50%" cy="50%" outerRadius={70} labelLine={false}>
                      {vendas_por_metodo.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {vendas_por_metodo.map((mp, i) => (
                  <div key={mp.metodo} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: CORES[i % CORES.length] }} />
                      <span className="font-medium">{mp.metodo}</span>
                    </div>
                    <span className="font-bold">{formatBRL(mp.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-extrabold uppercase tracking-wider mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Mais vendidos</h3>
          {mais_vendidos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda</p>
          ) : (
            <div className="space-y-1.5 text-sm">
              {mais_vendidos.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-b-0">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-medium truncate">{p.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{formatQtd(p.qtd)} un.</p>
                  </div>
                  <span className="font-bold text-xs whitespace-nowrap">{formatBRL(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
