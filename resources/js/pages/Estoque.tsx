import { useEffect, useState } from 'react';
import { estoqueApi, produtosApi, type ResumoEstoque, type MovimentacaoEstoque } from '@/lib/api/index';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatBRL, formatQtd } from '@/lib/format';
import {
  Boxes, AlertTriangle, TrendingUp, Package, Plus, ArrowUpRight, ArrowDownRight,
  RefreshCw, MapPin, Wrench,
} from 'lucide-react';
import { movimentacaoEstoqueSchema, validar } from '@/lib/validators';

export default function Estoque() {
  const { toast } = useToast();
  const [resumo, setResumo] = useState<ResumoEstoque | null>(null);
  const [ruptura, setRuptura] = useState<any[]>([]);
  const [movs, setMovs] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [form, setForm] = useState({
    produto_id: '',
    tipo: 'entrada' as 'entrada' | 'saida' | 'ajuste',
    motivo: 'ajuste_manual',
    quantidade: '',
    observacao: '',
  });

  const carregar = async () => {
    setLoading(true);
    try {
      const [r, rup, m, prods] = await Promise.all([
        estoqueApi.resumo(),
        estoqueApi.ruptura(),
        estoqueApi.movimentacoes({ per_page: 30 }),
        produtosApi.list({ per_page: 200 }),
      ]);
      setResumo(r);
      setRuptura(rup.produtos);
      setMovs(m.data || []);
      setProdutos(prods.data || []);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    const quantidadeNum = parseFloat(String(form.quantidade).replace(',', '.'));
    const erro = await validar(movimentacaoEstoqueSchema, { ...form, quantidade: quantidadeNum });
    if (erro) {
      toast({ title: 'Confira os campos', description: erro, variant: 'destructive' });
      return;
    }
    try {
      await estoqueApi.ajustar({
        produto_id: form.produto_id,
        tipo: form.tipo,
        motivo: form.motivo,
        quantidade: quantidadeNum,
        observacao: form.observacao || undefined,
      });
      toast({ title: 'Movimentação registrada' });
      setModalOpen(false);
      setForm({ produto_id: '', tipo: 'entrada', motivo: 'ajuste_manual', quantidade: '', observacao: '' });
      await carregar();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  if (loading || !resumo) return <LoadingState />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Estoque" description="Movimentações, ruptura e ajustes manuais">
        <Button onClick={() => setModalOpen(true)} className="btn-construction gap-2">
          <Plus className="w-4 h-4" /> Nova movimentação
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground"><Package className="w-4 h-4" /> Produtos ativos</div>
          <p className="text-2xl font-extrabold mt-1">{resumo.total_produtos}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-destructive"><AlertTriangle className="w-4 h-4" /> Abaixo do mínimo</div>
          <p className="text-2xl font-extrabold text-destructive mt-1">{resumo.abaixo_minimo}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground"><Boxes className="w-4 h-4" /> Estoque a custo</div>
          <p className="text-2xl font-extrabold mt-1">{formatBRL(resumo.valor_em_estoque_custo)}</p>
          <p className="text-[11px] text-muted-foreground">Quanto você investiu</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-success"><TrendingUp className="w-4 h-4" /> Lucro se vender tudo</div>
          <p className="text-2xl font-extrabold text-success mt-1">{formatBRL(resumo.margem_potencial)}</p>
          <p className="text-[11px] text-muted-foreground">
            Venda {formatBRL(resumo.valor_em_estoque_venda)}
            {resumo.valor_em_estoque_custo > 0 && (
              <> · margem <strong className="text-success">{((resumo.margem_potencial / resumo.valor_em_estoque_custo) * 100).toFixed(0)}%</strong></>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Ruptura */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" /> Repor urgente
            </h3>
            <span className="text-[11px] text-muted-foreground">{ruptura.length} produtos</span>
          </div>
          <div className="max-h-[480px] overflow-auto">
            {ruptura.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <Wrench className="w-12 h-12 mx-auto opacity-30 mb-2" strokeWidth={1.2} />
                Tudo em ordem. Nenhum produto abaixo do mínimo.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/20 sticky top-0">
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left p-2">Produto</th>
                    <th className="text-left p-2">Local</th>
                    <th className="text-right p-2">Atual</th>
                    <th className="text-right p-2">Mín</th>
                  </tr>
                </thead>
                <tbody>
                  {ruptura.map((p: any) => (
                    <tr key={p.id} className="border-t border-border/40 hover:bg-destructive/5">
                      <td className="p-2">
                        <p className="font-medium text-xs">{p.descricao}</p>
                        <p className="text-[10px] text-muted-foreground">{p.marca || '—'}</p>
                      </td>
                      <td className="p-2 text-[10px] text-muted-foreground"><MapPin className="w-3 h-3 inline mr-0.5" />{p.localizacao || '—'}</td>
                      <td className="p-2 text-right font-bold text-destructive text-xs">{formatQtd(p.estoque_atual)} {p.unidade}</td>
                      <td className="p-2 text-right text-xs text-muted-foreground">{p.estoque_minimo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Movimentações */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Últimas movimentações
            </h3>
            <span className="text-[11px] text-muted-foreground">{movs.length}</span>
          </div>
          <div className="max-h-[480px] overflow-auto">
            {movs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma movimentação registrada.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/20 sticky top-0">
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left p-2">Produto</th>
                    <th className="text-center p-2">Tipo</th>
                    <th className="text-left p-2">Motivo</th>
                    <th className="text-right p-2">Qtd</th>
                    <th className="text-right p-2">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {movs.map(m => (
                    <tr key={m.id} className="border-t border-border/40">
                      <td className="p-2 font-medium text-xs">{m.produto?.descricao || '—'}</td>
                      <td className="p-2 text-center">
                        {m.tipo === 'entrada' && <ArrowUpRight className="w-4 h-4 text-success mx-auto" />}
                        {m.tipo === 'saida' && <ArrowDownRight className="w-4 h-4 text-destructive mx-auto" />}
                        {m.tipo === 'ajuste' && <RefreshCw className="w-4 h-4 text-primary mx-auto" />}
                      </td>
                      <td className="p-2 text-[10px] capitalize text-muted-foreground">{m.motivo.replace('_', ' ')}</td>
                      <td className="p-2 text-right font-mono text-xs">{formatQtd(m.quantidade)}</td>
                      <td className="p-2 text-right font-mono text-xs text-muted-foreground">{formatQtd(m.estoque_depois)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><RefreshCw className="w-5 h-5 text-primary" /> Movimentação de estoque</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Produto</Label>
              <Select value={form.produto_id} onValueChange={v => setForm({ ...form, produto_id: v })}>
                <SelectTrigger><SelectValue placeholder="Buscar..." /></SelectTrigger>
                <SelectContent>
                  {produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.descricao}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v: any) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="ajuste">Ajuste (define valor exato)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Motivo</Label>
                <Select value={form.motivo} onValueChange={v => setForm({ ...form, motivo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ajuste_manual">Ajuste manual</SelectItem>
                    <SelectItem value="inventario">Inventário</SelectItem>
                    <SelectItem value="perda">Perda / Quebra</SelectItem>
                    <SelectItem value="devolucao">Devolução de cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Quantidade</Label>
              <Input type="text" inputMode="decimal" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Observação</Label>
              <Input value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} placeholder="ex: contagem corredor B" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button className="btn-construction flex-1" onClick={salvar}>Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
