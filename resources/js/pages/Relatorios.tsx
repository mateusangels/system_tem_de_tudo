import { useEffect, useState, useMemo } from 'react';
import {
  DollarSign, ShoppingCart, Users, Package, Calendar, User, CreditCard, TrendingUp,
} from 'lucide-react';
import { relatoriosApi, type RelatoriosCompleto } from '@/lib/api/index';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { formatBRL, formatQtd } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';

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

export default function Relatorios() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RelatoriosCompleto | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>('mes_atual');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const range = useMemo(() => periodoRange(periodo, customStart, customEnd), [periodo, customStart, customEnd]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    relatoriosApi.completo(toIsoDate(range.start), toIsoDate(range.end))
      .then(d => { if (alive) setData(d); })
      .catch(console.error)
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [range.start.getTime(), range.end.getTime()]);

  if (loading || !data) return <LoadingState />;

  const { totais, vendas_por_funcionario, vendas_por_metodo, top_produtos, evolucao_mensal, vendas_por_dia, clientes, produtos } = data;

  // Formata data 2026-05-22 → "22/05"
  const vendasPorDiaFmt = (vendas_por_dia || []).map(d => ({
    ...d,
    diaLabel: d.dia ? `${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}` : '',
  }));

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Relatórios" description="Análise completa do período" />

      {/* Filtro */}
      <div className="bg-card rounded-lg border border-border p-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wider">Período</span></div>
        <div className="min-w-[180px]">
          <Select value={periodo} onValueChange={v => setPeriodo(v as Periodo)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(periodoLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {periodo === 'custom' && (
          <>
            <div><Label className="text-[11px] uppercase">De</Label><Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-9 w-40" /></div>
            <div><Label className="text-[11px] uppercase">Até</Label><Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-9 w-40" /></div>
          </>
        )}
        <span className="text-xs text-muted-foreground ml-auto font-mono">
          {range.start.toLocaleDateString('pt-BR')} – {range.end.toLocaleDateString('pt-BR')}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="card-industrial p-4 pl-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground"><ShoppingCart className="w-4 h-4" /> Vendido</div>
          <p className="text-2xl font-extrabold mt-1">{formatBRL(totais.vendas_total)}</p>
        </div>
        <div className="card-industrial p-4 pl-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground"><DollarSign className="w-4 h-4" /> Ticket médio</div>
          <p className="text-2xl font-extrabold mt-1">{formatBRL(totais.ticket_medio)}</p>
        </div>
        <div className="card-industrial p-4 pl-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground"><TrendingUp className="w-4 h-4" /> Nº vendas</div>
          <p className="text-2xl font-extrabold mt-1">{totais.vendas_count}</p>
        </div>
        <div className="card-industrial p-4 pl-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground"><Users className="w-4 h-4" /> Clientes</div>
          <p className="text-2xl font-extrabold mt-1">{clientes.total}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{clientes.ativos} ativos</p>
        </div>
        <div className="card-industrial p-4 pl-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground"><Package className="w-4 h-4" /> Produtos</div>
          <p className="text-2xl font-extrabold mt-1">{produtos.total}</p>
          <p className="text-[11px] text-destructive mt-0.5">{produtos.estoque_baixo} c/ estoque baixo</p>
        </div>
      </div>

      {/* Vendas por Período (linha do tempo dia a dia) */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="mb-1">
          <h3 className="text-base font-extrabold">Vendas por Período</h3>
          <p className="text-xs text-muted-foreground">Faturamento diário no período selecionado</p>
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={vendasPorDiaFmt} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf00" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#fbbf00" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="diaLabel"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(1).replace('.', ',') + 'k' : v}`}
                width={55}
              />
              <Tooltip
                formatter={(v: number) => [formatBRL(v), 'Vendas']}
                labelFormatter={(label) => `Dia ${label}`}
                contentStyle={tooltipStyle}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Area
                type="monotone"
                dataKey="vendas"
                name="Vendas PDV"
                stroke="#fbbf00"
                strokeWidth={2.5}
                fill="url(#gradVendas)"
                dot={{ r: 3, fill: '#fbbf00', stroke: '#fff', strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: '#fbbf00', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vendas por operador */}
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-extrabold uppercase tracking-wider mb-3 flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Vendas por operador</h3>
          {vendas_por_funcionario.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Sem dados</p> : (
            <div className="space-y-2">
              {vendas_por_funcionario.map((f, i) => (
                <div key={f.nome} className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-b-0">
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

        {/* Forma de pagamento */}
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-extrabold uppercase tracking-wider mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Por forma de pagamento</h3>
          {vendas_por_metodo.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Sem dados</p> : (
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
      </div>

      {/* Top produtos */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/40">
          <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Top 15 produtos mais vendidos</h3>
        </div>
        {top_produtos.length === 0 ? <p className="p-6 text-sm text-muted-foreground text-center">Sem dados</p> : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="bg-muted/20 border-b border-border">
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Produto</th>
                <th className="text-right p-3">Qtd vendida</th>
                <th className="text-right p-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {top_produtos.map((p, i) => (
                <tr key={i} className="border-b border-border/40 last:border-b-0 hover:bg-muted/20">
                  <td className="p-3 font-bold text-primary">{i + 1}</td>
                  <td className="p-3 font-medium">{p.descricao}</td>
                  <td className="p-3 text-right font-mono">{formatQtd(p.qtd)}</td>
                  <td className="p-3 text-right font-bold">{formatBRL(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
