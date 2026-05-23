import { useEffect, useState } from 'react';
import { comprasApi, produtosApi, type Compra, type Fornecedor, type Produto } from '@/lib/api/index';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/format';
import { Truck, Plus, CheckCircle2, FileText, Building2, Trash2 } from 'lucide-react';
import { fornecedorSchema, validar } from '@/lib/validators';
import { maskCNPJ, maskTelefone, maskEmail } from '@/lib/masks';

const formatDate = (s: string | null) => s ? new Date(s).toLocaleDateString('pt-BR') : '—';

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    rascunho: 'bg-muted text-muted-foreground',
    pedido_enviado: 'bg-primary/15 text-primary',
    recebida: 'bg-success/15 text-success',
    cancelada: 'bg-destructive/15 text-destructive',
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${map[status] || 'bg-muted'}`}>{status.replace('_', ' ')}</span>;
};

export default function Compras() {
  const { toast } = useToast();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);

  const [fornModal, setFornModal] = useState(false);
  const [fornForm, setFornForm] = useState({ nome: '', cnpj: '', telefone: '', email: '', contato: '' });

  // Modal de Nova Compra
  const [compraModal, setCompraModal] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  // Cada item pode ser:
  //  - modo 'existente': escolhe produto já cadastrado (usa produto_id)
  //  - modo 'novo':      cadastra produto inline (usa nome + unidade + cod_barras)
  type CompraItemForm = {
    modo: 'existente' | 'novo';
    produto_id: string;
    nome_novo: string;
    cod_barras_novo: string;
    unidade_nova: string;
    quantidade: string;
    custo_unitario: string;
  };
  const itemVazio = (): CompraItemForm => ({
    modo: 'existente',
    produto_id: '',
    nome_novo: '',
    cod_barras_novo: '',
    unidade_nova: 'UN',
    quantidade: '1',
    custo_unitario: '0',
  });

  const [compraForm, setCompraForm] = useState<{
    fornecedor_id: string;
    data_pedido: string;
    observacao: string;
    frete: string;
    itens: CompraItemForm[];
  }>({
    fornecedor_id: '',
    data_pedido: new Date().toISOString().slice(0, 10),
    observacao: '',
    frete: '0',
    itens: [itemVazio()],
  });
  const [savingCompra, setSavingCompra] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [c, f, p] = await Promise.all([
        comprasApi.list({ per_page: 50 }),
        comprasApi.fornecedores(),
        produtosApi.list({ per_page: 500, ativo: true }),
      ]);
      setCompras((c.data as Compra[]) || []);
      setFornecedores(f);
      setProdutos((p.data as Produto[]) || []);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Modal Nova Compra ────────────────────────────────────────
  const abrirNovaCompra = () => {
    setCompraForm({
      fornecedor_id: '',
      data_pedido: new Date().toISOString().slice(0, 10),
      observacao: '',
      frete: '0',
      itens: [itemVazio()],
    });
    setCompraModal(true);
  };

  const addItem = () => {
    setCompraForm(f => ({ ...f, itens: [...f.itens, itemVazio()] }));
  };
  const removeItem = (idx: number) => {
    setCompraForm(f => ({ ...f, itens: f.itens.length > 1 ? f.itens.filter((_, i) => i !== idx) : f.itens }));
  };
  const updateItem = (idx: number, patch: Partial<CompraItemForm>) => {
    setCompraForm(f => ({
      ...f,
      itens: f.itens.map((it, i) => {
        if (i !== idx) return it;
        const novo = { ...it, ...patch };
        // Se selecionou um produto existente, pré-preenche o custo com o cadastro
        if (patch.produto_id && patch.produto_id !== it.produto_id) {
          const prod = produtos.find(p => p.id === patch.produto_id);
          if (prod) novo.custo_unitario = String(Number(prod.preco_custo) || 0);
        }
        return novo;
      }),
    }));
  };
  const alternarModoItem = (idx: number) => {
    setCompraForm(f => ({
      ...f,
      itens: f.itens.map((it, i) =>
        i === idx
          ? { ...it, modo: it.modo === 'existente' ? 'novo' : 'existente', produto_id: '', nome_novo: '', cod_barras_novo: '' }
          : it
      ),
    }));
  };

  const totalItens = compraForm.itens.reduce((s, it) => {
    const q = parseFloat(it.quantidade.replace(',', '.')) || 0;
    const c = parseFloat(it.custo_unitario.replace(',', '.')) || 0;
    return s + q * c;
  }, 0);
  const totalCompra = totalItens + (parseFloat(compraForm.frete.replace(',', '.')) || 0);

  const salvarCompra = async () => {
    // Valida cada item
    const itensProcessar = compraForm.itens.filter(it => {
      const q = parseFloat(String(it.quantidade).replace(',', '.'));
      if (!q || q <= 0) return false;
      if (it.modo === 'existente') return !!it.produto_id;
      return !!it.nome_novo.trim();
    });

    if (itensProcessar.length === 0) {
      toast({
        title: 'Adicione pelo menos um produto',
        description: 'Escolha um produto cadastrado ou cadastre um novo, e informe a quantidade.',
        variant: 'destructive',
      });
      return;
    }

    setSavingCompra(true);
    try {
      // 1) Cria os produtos novos primeiro (e pega os IDs gerados)
      const itensFinal = await Promise.all(
        itensProcessar.map(async it => {
          const quantidade = parseFloat(String(it.quantidade).replace(',', '.'));
          const custo = parseFloat(String(it.custo_unitario).replace(',', '.')) || 0;

          let produto_id = it.produto_id;
          if (it.modo === 'novo') {
            const novo = await produtosApi.create({
              descricao: it.nome_novo.trim().toUpperCase(),
              codigo_barras: it.cod_barras_novo.trim() || '',
              unidade: it.unidade_nova || 'UN',
              preco_custo: custo,
              preco_venda: +(custo * 1.4).toFixed(2),    // margem 40% sugerida
              preco_atacado: 0,
              categoria: '',
              marca: '',
              estoque_atual: 0,    // será incrementado quando a compra for recebida
              estoque_minimo: 0,
              movimenta_estoque: true,
              ativo: true,
            });
            produto_id = novo.id;
          }
          return { produto_id, quantidade, custo_unitario: custo };
        })
      );

      // 2) Cria a compra
      await comprasApi.create({
        fornecedor_id: compraForm.fornecedor_id || null,
        data_pedido: compraForm.data_pedido,
        observacao: compraForm.observacao || null,
        frete: parseFloat(compraForm.frete.replace(',', '.')) || 0,
        itens: itensFinal,
      });

      const qtdNovos = itensProcessar.filter(it => it.modo === 'novo').length;
      toast({
        title: 'Compra criada!',
        description: qtdNovos > 0
          ? `${qtdNovos} produto(s) cadastrado(s). Confira os preços de venda em /produtos. Clique "Receber" pra entrar no estoque.`
          : 'Status: rascunho. Clique "Receber" pra entrar no estoque.',
      });
      setCompraModal(false);
      await carregar();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.response?.data?.message || e.message, variant: 'destructive' });
    } finally {
      setSavingCompra(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const receber = async (c: Compra) => {
    if (!confirm(`Confirmar recebimento da compra ${c.numero}? Isso vai entrar no estoque.`)) return;
    try {
      await comprasApi.receber(c.id, { atualizar_custo: true });
      toast({ title: 'Compra recebida', description: 'Estoque atualizado.' });
      await carregar();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const salvarFornecedor = async () => {
    const erro = await validar(fornecedorSchema, fornForm);
    if (erro) {
      toast({ title: 'Confira os campos', description: erro, variant: 'destructive' });
      return;
    }
    try {
      await comprasApi.storeFornecedor(fornForm);
      toast({ title: 'Fornecedor cadastrado!' });
      setFornModal(false);
      setFornForm({ nome: '', cnpj: '', telefone: '', email: '', contato: '' });
      await carregar();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) return <LoadingState />;

  const totalPedido = compras.reduce((s, c) => s + (Number(c.total) || 0), 0);
  const recebidas = compras.filter(c => c.status === 'recebida').length;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Compras" description="Pedidos a fornecedores e entrada de mercadoria">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFornModal(true)} className="gap-2">
            <Building2 className="w-4 h-4" /> Novo fornecedor
          </Button>
          <Button onClick={abrirNovaCompra} className="btn-construction gap-2">
            <Plus className="w-4 h-4" /> Nova compra
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Total pedido</p>
          <p className="text-2xl font-extrabold mt-1">{formatBRL(totalPedido)}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-[11px] uppercase tracking-wider font-bold text-success">Compras recebidas</p>
          <p className="text-2xl font-extrabold text-success mt-1">{recebidas}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Fornecedores</p>
          <p className="text-2xl font-extrabold mt-1">{fornecedores.length}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
          <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2"><Truck className="w-4 h-4" /> Histórico de compras</h3>
          <span className="text-[11px] text-muted-foreground">{compras.length}</span>
        </div>
        {compras.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <Truck className="w-16 h-16 mx-auto opacity-30 mb-2" strokeWidth={1.2} />
            <p className="font-bold">Nenhuma compra cadastrada ainda</p>
            <p className="text-xs mt-1">Cadastre o primeiro fornecedor pra começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/20 border-b border-border">
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left p-3">Número</th>
                <th className="text-left p-3">Fornecedor</th>
                <th className="text-left p-3">Data pedido</th>
                <th className="text-left p-3">Recebido em</th>
                <th className="text-right p-3">Total</th>
                <th className="text-center p-3">Status</th>
                <th className="text-center p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {compras.map(c => (
                <tr key={c.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/20">
                  <td className="p-3 font-mono font-bold text-primary">{c.numero}</td>
                  <td className="p-3">{c.fornecedor?.nome || <span className="text-muted-foreground italic">—</span>}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(c.data_pedido)}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(c.data_recebimento)}</td>
                  <td className="p-3 text-right font-bold">{formatBRL(c.total)}</td>
                  <td className="p-3 text-center">{statusBadge(c.status)}</td>
                  <td className="p-3 text-center">
                    {c.status !== 'recebida' && c.status !== 'cancelada' ? (
                      <Button size="sm" onClick={() => receber(c)} className="bg-success hover:bg-success/90 text-success-foreground h-8 gap-1 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Receber
                      </Button>
                    ) : <span className="text-[11px] text-muted-foreground italic">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Lista de fornecedores */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/40">
          <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2"><Building2 className="w-4 h-4" /> Fornecedores</h3>
        </div>
        {fornecedores.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Cadastre o primeiro fornecedor pra começar.</div>
        ) : (
          <div className="divide-y divide-border">
            {fornecedores.map(f => (
              <div key={f.id} className="px-5 py-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{f.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.cnpj && <span>CNPJ {f.cnpj} · </span>}
                    {f.telefone && <span>{f.telefone}</span>}
                    {f.contato && <span> · {f.contato}</span>}
                  </p>
                </div>
                <span className="text-[10px] bg-success/15 text-success px-2 py-0.5 rounded-full font-bold uppercase">Ativo</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={fornModal} onOpenChange={setFornModal}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Novo fornecedor</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Nome / Razão social *</Label>
              <Input value={fornForm.nome} onChange={e => setFornForm({ ...fornForm, nome: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">CNPJ</Label>
                <Input value={fornForm.cnpj} onChange={e => setFornForm({ ...fornForm, cnpj: maskCNPJ(e.target.value) })} maxLength={18} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Telefone</Label>
                <Input value={fornForm.telefone} onChange={e => setFornForm({ ...fornForm, telefone: maskTelefone(e.target.value) })} maxLength={15} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">E-mail</Label>
                <Input type="email" value={fornForm.email} onChange={e => setFornForm({ ...fornForm, email: maskEmail(e.target.value) })} placeholder="contato@fornecedor.com" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Contato</Label>
                <Input value={fornForm.contato} onChange={e => setFornForm({ ...fornForm, contato: e.target.value })} placeholder="Nome do vendedor" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setFornModal(false)}>Cancelar</Button>
              <Button className="btn-construction flex-1" onClick={salvarFornecedor}>Cadastrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Compra */}
      <Dialog open={compraModal} onOpenChange={setCompraModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Truck className="w-5 h-5 text-primary" /> Nova compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Fornecedor</Label>
                <Select value={compraForm.fornecedor_id} onValueChange={v => setCompraForm({ ...compraForm, fornecedor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sem fornecedor (avulsa)" /></SelectTrigger>
                  <SelectContent>
                    {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Data do pedido</Label>
                <Input type="date" value={compraForm.data_pedido} onChange={e => setCompraForm({ ...compraForm, data_pedido: e.target.value })} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Produtos da compra</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-7 gap-1 text-xs">
                  <Plus className="w-3 h-3" /> Adicionar item
                </Button>
              </div>
              <div className="space-y-3 border border-border rounded-md p-3 bg-muted/30">
                {compraForm.itens.map((item, idx) => (
                  <div key={idx} className={`p-2 rounded ${item.modo === 'novo' ? 'bg-success/10 border border-success/30' : ''}`}>
                    {/* Linha principal: produto + qtd + custo + subtotal + ações */}
                    <div className="grid grid-cols-[1fr_90px_120px_100px_32px] gap-2 items-end">
                      <div>
                        {idx === 0 && <Label className="text-[10px] uppercase text-muted-foreground">Produto</Label>}
                        {item.modo === 'existente' ? (
                          <Select value={item.produto_id} onValueChange={v => updateItem(idx, { produto_id: v })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Escolha um produto cadastrado..." /></SelectTrigger>
                            <SelectContent>
                              {produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.descricao}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="h-9 px-3 flex items-center bg-success/15 border border-success rounded text-xs font-semibold text-success">
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo produto — preencha abaixo
                          </div>
                        )}
                      </div>
                      <div>
                        {idx === 0 && <Label className="text-[10px] uppercase text-muted-foreground">Qtd</Label>}
                        <Input type="text" inputMode="decimal" value={item.quantidade} onChange={e => updateItem(idx, { quantidade: e.target.value })} className="h-9 text-right" />
                      </div>
                      <div>
                        {idx === 0 && <Label className="text-[10px] uppercase text-muted-foreground">Custo unit. (R$)</Label>}
                        <Input type="text" inputMode="decimal" value={item.custo_unitario} onChange={e => updateItem(idx, { custo_unitario: e.target.value })} className="h-9 text-right" />
                      </div>
                      <div>
                        {idx === 0 && <Label className="text-[10px] uppercase text-muted-foreground">Subtotal</Label>}
                        <div className="h-9 px-2 flex items-center justify-end font-semibold text-sm bg-background border border-border rounded">
                          {formatBRL((parseFloat(item.quantidade.replace(',', '.')) || 0) * (parseFloat(item.custo_unitario.replace(',', '.')) || 0))}
                        </div>
                      </div>
                      <div>
                        {idx === 0 && <Label className="text-[10px] text-muted-foreground">&nbsp;</Label>}
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors rounded"
                          title="Remover linha"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Toggle: cadastrar como novo / voltar pra existente */}
                    <div className="flex items-center justify-between mt-1.5 px-1">
                      <button
                        type="button"
                        onClick={() => alternarModoItem(idx)}
                        className="text-[11px] text-primary hover:underline font-semibold"
                      >
                        {item.modo === 'existente' ? '+ Produto ainda não cadastrado? Cadastrar agora' : '← Voltar a escolher um produto existente'}
                      </button>
                    </div>

                    {/* Campos extras quando é NOVO produto */}
                    {item.modo === 'novo' && (
                      <div className="grid grid-cols-[140px_1fr_90px] gap-2 mt-2">
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">Cód. barras (opc.)</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={item.cod_barras_novo}
                            onChange={e => {
                              const v = e.target.value.replace(/\D/g, '');
                              // se bater EXATO com algum produto cadastrado, troca pra modo existente
                              const match = produtos.find(p => p.codigo_barras === v && v.length >= 6);
                              if (match) {
                                updateItem(idx, {
                                  modo: 'existente',
                                  produto_id: match.id,
                                  cod_barras_novo: '',
                                  nome_novo: '',
                                });
                                toast({ title: 'Produto encontrado!', description: match.descricao });
                              } else {
                                updateItem(idx, { cod_barras_novo: v });
                              }
                            }}
                            className="h-9 font-mono text-xs"
                            placeholder="7891234567890"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">Nome do produto *</Label>
                          <Input
                            value={item.nome_novo}
                            onChange={e => updateItem(idx, { nome_novo: e.target.value })}
                            className="h-9"
                            placeholder="Ex: CIMENTO CP-II 50KG"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">Unidade</Label>
                          <Select value={item.unidade_nova} onValueChange={v => updateItem(idx, { unidade_nova: v })}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UN">UN</SelectItem>
                              <SelectItem value="M">M</SelectItem>
                              <SelectItem value="M2">M²</SelectItem>
                              <SelectItem value="KG">KG</SelectItem>
                              <SelectItem value="SC">SC</SelectItem>
                              <SelectItem value="CX">CX</SelectItem>
                              <SelectItem value="BARRA">BARRA</SelectItem>
                              <SelectItem value="ROLO">ROLO</SelectItem>
                              <SelectItem value="LATA">LATA</SelectItem>
                              <SelectItem value="GL">GL</SelectItem>
                              <SelectItem value="L">L</SelectItem>
                              <SelectItem value="PCT">PCT</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Frete (R$)</Label>
                <Input type="text" inputMode="decimal" value={compraForm.frete} onChange={e => setCompraForm({ ...compraForm, frete: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Observação</Label>
                <Input value={compraForm.observacao} onChange={e => setCompraForm({ ...compraForm, observacao: e.target.value })} placeholder="ex: Pedido pra reposição mensal" />
              </div>
            </div>

            <div className="bg-primary/10 border-2 border-primary rounded-md p-3 flex justify-between items-center">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Total da compra</p>
                <p className="text-xs text-muted-foreground">Itens: {formatBRL(totalItens)} + Frete: {formatBRL(parseFloat(compraForm.frete.replace(',', '.')) || 0)}</p>
              </div>
              <p className="text-2xl font-extrabold text-primary">{formatBRL(totalCompra)}</p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setCompraModal(false)} disabled={savingCompra}>Cancelar</Button>
              <Button className="btn-construction flex-1" onClick={salvarCompra} disabled={savingCompra}>
                {savingCompra ? 'Salvando...' : 'Salvar como rascunho'}
              </Button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              A compra é salva como <strong>rascunho</strong>. Pra dar entrada no estoque, clique em "Receber" na lista.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
