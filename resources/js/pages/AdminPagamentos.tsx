import { useEffect, useState } from 'react';
import { mensalidadesApi, type Mensalidade, authApi } from '@/lib/api/index';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/format';
import {
  Check, Calendar, AlertTriangle, FileText, Plus, CheckCircle2,
  Clock, DollarSign, ShieldCheck,
} from 'lucide-react';
import { gerarMensalidadeSchema, marcarPagaSchema, validar } from '@/lib/validators';

const formatDate = (s: string | null) => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('pt-BR');
};

export default function AdminPagamentos() {
  const { toast } = useToast();
  const [list, setList] = useState<Mensalidade[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; nome: string; email: string }>>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [loading, setLoading] = useState(true);

  const [marcarOpen, setMarcarOpen] = useState(false);
  const [marcarTarget, setMarcarTarget] = useState<Mensalidade | null>(null);
  const [formaPag, setFormaPag] = useState('pix');
  const [observacao, setObservacao] = useState('');
  const [pagaEm, setPagaEm] = useState(new Date().toISOString().slice(0, 10));

  const [gerarOpen, setGerarOpen] = useState(false);
  const [gUserId, setGUserId] = useState('');
  const [gValor, setGValor] = useState('180');
  const [gVencimento, setGVencimento] = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const [m, u] = await Promise.all([
        mensalidadesApi.listar(filtroStatus === 'todos' ? undefined : filtroStatus),
        authApi.listUsers(),
      ]);
      setList(m.mensalidades);
      setUsers(u.map(x => ({ id: x.id, nome: x.nome || x.name, email: x.email })));
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, [filtroStatus]);

  const abrirMarcar = (m: Mensalidade) => {
    setMarcarTarget(m);
    setFormaPag(m.forma_pagamento || 'pix');
    setObservacao(m.observacao || '');
    setPagaEm(new Date().toISOString().slice(0, 10));
    setMarcarOpen(true);
  };

  const confirmarPagamento = async () => {
    if (!marcarTarget) return;
    const erro = await validar(marcarPagaSchema, { forma_pagamento: formaPag, paga_em: pagaEm });
    if (erro) {
      toast({ title: 'Confira os campos', description: erro, variant: 'destructive' });
      return;
    }
    try {
      await mensalidadesApi.marcarPaga(marcarTarget.id, { forma_pagamento: formaPag, observacao, paga_em: pagaEm });
      toast({ title: 'Pagamento registrado!', description: `Licença estendida por +30 dias.` });
      setMarcarOpen(false);
      await carregar();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const gerarMensalidade = async () => {
    const valor = parseFloat(gValor);
    const erro = await validar(gerarMensalidadeSchema, { user_id: gUserId, valor });
    if (erro) {
      toast({ title: 'Confira os campos', description: erro, variant: 'destructive' });
      return;
    }
    try {
      await mensalidadesApi.gerar({
        user_id: gUserId,
        valor,
        vencimento: gVencimento || undefined,
      });
      toast({ title: 'Mensalidade gerada!' });
      setGerarOpen(false);
      setGUserId(''); setGValor('180'); setGVencimento('');
      await carregar();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const pendentes = list.filter(m => m.status === 'pendente').length;
  const atrasados = list.filter(m => m.atrasada).length;
  const totalReceber = list.filter(m => m.status === 'pendente').reduce((s, m) => s + m.valor, 0);
  const totalRecebido = list.filter(m => m.status === 'pago').reduce((s, m) => s + m.valor, 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Pagamentos (Admin)" description="Mensalidades dos clientes do TEM DE TUDO">
        <Button onClick={() => setGerarOpen(true)} className="btn-construction gap-2">
          <Plus className="w-4 h-4" /> Gerar mensalidade
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-muted-foreground"><Clock className="w-4 h-4" /> Pendentes</div>
          <p className="text-2xl font-extrabold mt-1">{pendentes}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-destructive"><AlertTriangle className="w-4 h-4" /> Atrasadas</div>
          <p className="text-2xl font-extrabold text-destructive mt-1">{atrasados}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-muted-foreground"><DollarSign className="w-4 h-4" /> A receber</div>
          <p className="text-2xl font-extrabold mt-1">{formatBRL(totalReceber)}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-success"><CheckCircle2 className="w-4 h-4" /> Já recebido</div>
          <p className="text-2xl font-extrabold text-success mt-1">{formatBRL(totalRecebido)}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 flex gap-3 items-center">
        <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Filtrar status:</Label>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <LoadingState /> : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/30 border-b border-border">
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Referência</th>
                <th className="text-left p-3">Vencimento</th>
                <th className="text-right p-3">Valor</th>
                <th className="text-left p-3">Licença até</th>
                <th className="text-center p-3">Status</th>
                <th className="text-center p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map(m => (
                <tr key={m.id} className={`border-b border-border/50 last:border-b-0 ${m.atrasada ? 'bg-destructive/5' : ''}`}>
                  <td className="p-3">
                    <p className="font-semibold">{m.cliente?.nome}</p>
                    <p className="text-[11px] text-muted-foreground">{m.cliente?.email}</p>
                  </td>
                  <td className="p-3 capitalize">{m.referencia_label}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(m.vencimento)}</td>
                  <td className="p-3 text-right font-bold">{formatBRL(m.valor)}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {m.cliente?.licenca_ativa
                      ? <span className="text-success font-semibold">{formatDate(m.cliente.licenca_ate)}</span>
                      : <span className="text-destructive">expirada</span>}
                  </td>
                  <td className="p-3 text-center">
                    {m.status === 'pago' && <span className="text-[10px] bg-success/15 text-success px-2 py-0.5 rounded-full font-bold uppercase inline-flex items-center gap-1"><Check className="w-3 h-3" />Pago</span>}
                    {m.status === 'pendente' && !m.atrasada && <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Pendente</span>}
                    {m.atrasada && <span className="text-[10px] bg-destructive/15 text-destructive px-2 py-0.5 rounded-full font-bold uppercase">Atrasado</span>}
                    {m.status === 'cancelada' && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold uppercase">Cancelada</span>}
                  </td>
                  <td className="p-3 text-center">
                    {m.status === 'pendente' ? (
                      <Button size="sm" onClick={() => abrirMarcar(m)} className="bg-success hover:bg-success/90 text-success-foreground gap-1.5 text-xs h-8">
                        <ShieldCheck className="w-3.5 h-3.5" /> Marcar pago
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground"><FileText className="w-12 h-12 mx-auto opacity-30 mb-2" /><p>Sem mensalidades no filtro atual.</p></td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modal Marcar Pago */}
      <Dialog open={marcarOpen} onOpenChange={setMarcarOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-success" /> Marcar mensalidade como paga</DialogTitle></DialogHeader>
          {marcarTarget && (
            <div className="space-y-3 text-sm">
              <div className="bg-muted/40 rounded p-3 border border-border space-y-1">
                <p><span className="text-muted-foreground">Cliente:</span> <strong>{marcarTarget.cliente?.nome}</strong></p>
                <p><span className="text-muted-foreground">Referência:</span> <strong className="capitalize">{marcarTarget.referencia_label}</strong></p>
                <p><span className="text-muted-foreground">Valor:</span> <strong>{formatBRL(marcarTarget.valor)}</strong></p>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Data do pagamento</Label>
                <Input type="date" value={pagaEm} onChange={e => setPagaEm(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Forma de pagamento</Label>
                <Select value={formaPag} onValueChange={setFormaPag}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Observação</Label>
                <Input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="ex: pago no app do banco, transação X" />
              </div>
              <div className="bg-primary/5 border border-primary/30 rounded p-3 text-xs">
                <p className="font-bold text-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Ao confirmar:</p>
                <p className="text-muted-foreground mt-1">A licença do cliente é estendida por +30 dias e o sistema é desbloqueado para ele imediatamente.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setMarcarOpen(false)}>Cancelar</Button>
                <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground gap-2" onClick={confirmarPagamento}>
                  <Check className="w-4 h-4" /> Confirmar pagamento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Gerar Mensalidade */}
      <Dialog open={gerarOpen} onOpenChange={setGerarOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Gerar mensalidade manualmente</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Cliente</Label>
              <Select value={gUserId} onValueChange={setGUserId}>
                <SelectTrigger><SelectValue placeholder="Escolha um cliente" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.nome} ({u.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Valor</Label>
                <Input type="number" step="0.01" value={gValor} onChange={e => setGValor(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Vencimento</Label>
                <Input type="date" value={gVencimento} onChange={e => setGVencimento(e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Se deixar o vencimento em branco, será 5 dias após o início do mês corrente.</p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setGerarOpen(false)}>Cancelar</Button>
              <Button className="btn-construction flex-1 gap-2" onClick={gerarMensalidade}>
                <Plus className="w-4 h-4" /> Gerar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
