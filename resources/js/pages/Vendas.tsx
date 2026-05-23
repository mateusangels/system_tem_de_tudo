import { useEffect, useState } from 'react';
import { vendasApi } from '@/lib/api/index';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { formatBRL, formatDateTime, formatQtd } from '@/lib/format';
import { gerarCupomVenda, imprimirCupom, DadosCupomVenda } from '@/lib/cupomNaoFiscal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Printer, Eye, ChevronLeft, ChevronRight, Calendar,
  ShoppingCart, Receipt, Trash2, MessageCircle, DollarSign, CheckCircle2,
} from 'lucide-react';

const PAGE_SIZE = 20;

const metodoLabel: Record<string, string> = {
  dinheiro: 'Dinheiro',
  debito: 'Débito',
  credito: 'Crédito',
  pix: 'PIX',
  fiado: 'Fiado',
};

const metodoColor: Record<string, string> = {
  dinheiro: 'bg-green-100 text-green-700 border-green-200',
  debito: 'bg-blue-100 text-blue-700 border-blue-200',
  credito: 'bg-purple-100 text-purple-700 border-purple-200',
  pix: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  fiado: 'bg-orange-100 text-orange-700 border-orange-200',
};

export default function Vendas() {
  const { toast } = useToast();
  const [vendas, setVendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingDups, setRemovingDups] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [metodoFiltro, setMetodoFiltro] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedVenda, setSelectedVenda] = useState<any>(null);
  const [vendaItens, setVendaItens] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchVendas = async () => {
    setLoading(true);
    try {
      const params: any = { status: 'finalizada', per_page: PAGE_SIZE, page };
      if (metodoFiltro !== 'todos') params.metodo_pagamento = metodoFiltro;
      if (dataInicio) params.from = dataInicio + 'T00:00:00';
      if (dataFim) params.to = dataFim + 'T23:59:59';

      const resp = await vendasApi.list(params);
      let filtered = resp.data as any[];
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        filtered = filtered.filter(v =>
          String(v.numero_venda).includes(s) ||
          (v.cliente?.nome || '').toLowerCase().includes(s) ||
          v.id.toLowerCase().includes(s)
        );
      }
      setVendas(filtered);
      setTotal(resp.total);
      setLastPage(resp.last_page);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchVendas(); }, [page, metodoFiltro, dataInicio, dataFim]);

  const openDetail = async (venda: any) => {
    setSelectedVenda(venda);
    setDetailOpen(true);
    setLoadingDetail(true);
    try {
      const detalhe = await vendasApi.get(venda.id);
      setVendaItens((detalhe.itens || []) as any[]);
    } catch {
      setVendaItens([]);
    }
    setLoadingDetail(false);
  };

  // ─── Modal de pagamento de fiado ───────────────────────────────
  const [pagModalOpen, setPagModalOpen] = useState(false);
  const [pagVenda, setPagVenda] = useState<any>(null);
  const [pagValor, setPagValor] = useState('');
  const [pagForma, setPagForma] = useState('dinheiro');
  const [pagSalvando, setPagSalvando] = useState(false);

  const abrirPagamento = (venda: any) => {
    const restante = Number(venda.total) - Number(venda.valor_pago_fiado || 0);
    setPagVenda(venda);
    setPagValor(restante.toFixed(2));
    setPagForma('dinheiro');
    setPagModalOpen(true);
  };

  const registrarPagamento = async () => {
    if (!pagVenda) return;
    const valorNum = parseFloat(String(pagValor).replace(',', '.'));
    if (!valorNum || valorNum <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }
    setPagSalvando(true);
    try {
      const r = await vendasApi.quitarFiado(pagVenda.id, { valor: valorNum, forma_quitacao: pagForma });
      if (r.quitada) {
        toast({ title: '✓ Fiado quitado!', description: `Venda #${String(pagVenda.numero_venda).padStart(5, '0')} totalmente paga.` });
      } else {
        toast({
          title: 'Pagamento registrado',
          description: `Pago R$ ${valorNum.toFixed(2).replace('.', ',')} — saldo: R$ ${r.saldo_restante.toFixed(2).replace('.', ',')}`,
        });
      }
      setPagModalOpen(false);
      fetchVendas();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.response?.data?.message || e.message, variant: 'destructive' });
    } finally {
      setPagSalvando(false);
    }
  };

  // ─── WhatsApp ──────────────────────────────────────────────────
  const enviarWhatsApp = async (venda: any) => {
    const tel = (venda.cliente?.telefone || '').replace(/\D/g, '');
    if (!tel || tel.length < 10) {
      toast({
        title: 'Cliente sem telefone',
        description: 'Cadastre o telefone do cliente em /clientes para usar o WhatsApp.',
        variant: 'destructive',
      });
      return;
    }
    // Garantir DDD 55
    const telE164 = tel.length === 11 || tel.length === 10 ? `55${tel}` : tel;

    // Busca itens completos se ainda não veio
    let itens = venda.itens || [];
    if (!itens.length) {
      try {
        const detalhe = await vendasApi.get(venda.id);
        itens = detalhe.itens || [];
      } catch {}
    }

    const total = Number(venda.total);
    const pago = Number(venda.valor_pago_fiado || 0);
    const saldo = total - pago;
    const numero = String(venda.numero_venda).padStart(5, '0');
    const data = new Date(venda.created_at).toLocaleDateString('pt-BR');
    const venc = venda.vencimento_fiado
      ? new Date(venda.vencimento_fiado).toLocaleDateString('pt-BR')
      : null;

    let msg = `Olá, ${venda.cliente?.nome}! Mensagem da *TEM DE TUDO*.\n\n`;
    msg += `Você tem um fiado em aberto:\n\n`;
    msg += `📋 Venda #${numero} - ${data}\n`;
    itens.forEach((i: any) => {
      msg += `• ${formatQtd(i.quantidade)}${i.unidade ? i.unidade : ''} ${i.descricao} — ${formatBRL(Number(i.valor_total))}\n`;
    });
    msg += `\n💰 Total da compra: *${formatBRL(total)}*\n`;
    if (pago > 0) msg += `💵 Já pago: ${formatBRL(pago)}\n`;
    msg += `🟠 *Saldo devedor: ${formatBRL(saldo)}*\n`;
    if (venc) msg += `📅 Vencimento: ${venc}\n`;
    msg += `\nQualquer dúvida é só responder aqui. Obrigado!`;

    const url = `https://wa.me/${telE164}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const reimprimirCupom = async (venda: any) => {
    try {
      const detalhe = await vendasApi.get(venda.id);
      const itens = (detalhe.itens || []) as any[];
      const cupomData: DadosCupomVenda = {
        id: venda.id,
        data: new Date(venda.created_at),
        itens: itens.map((i: any) => ({
          codigo_barras: i.codigo_barras || '',
          descricao: i.descricao,
          quantidade: Number(i.quantidade),
          unidade: i.unidade,
          valor_unitario: Number(i.valor_unitario),
          valor_total: Number(i.valor_total),
        })),
        subtotal: Number(venda.subtotal),
        desconto: Number(venda.desconto_total),
        total: Number(venda.total),
        metodo_pagamento: venda.metodo_pagamento,
        valor_pago: Number(venda.valor_pago),
        troco: Number(venda.troco),
        cliente_nome: venda.cliente?.nome,
        cliente_cpf: (venda as any).cliente?.cpf,
        operador_nome: (venda as any).operador?.name || 'OPERADOR',
      };
      imprimirCupom(gerarCupomVenda(cupomData));
    } catch (e: any) {
      toast({ title: 'Erro ao reimprimir', description: e?.response?.data?.message || e.message, variant: 'destructive' });
    }
  };

  const removerDuplicatas = async () => {
    if (!confirm('Tem certeza que deseja remover vendas duplicadas? Essa acao nao pode ser desfeita.')) return;
    setRemovingDups(true);
    try {
      const r = await vendasApi.removerDuplicatas();
      if (r.removidas === 0) {
        toast({ title: 'Nenhuma duplicata encontrada', description: 'Todas as vendas parecem unicas.' });
      } else {
        toast({ title: `${r.removidas} vendas duplicadas removidas`, description: 'O historico foi limpo.' });
        fetchVendas();
      }
    } catch (e: any) {
      toast({ title: 'Erro ao remover duplicatas', description: e?.response?.data?.message || e.message, variant: 'destructive' });
    }
    setRemovingDups(false);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      <PageHeader title="Histórico de Vendas" description="Consulte todas as vendas realizadas">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Receipt className="w-4 h-4" />
          <span>{total} vendas encontradas</span>
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por numero, cliente ou ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              onKeyDown={e => { if (e.key === 'Enter') fetchVendas(); }}
              className="pl-9"
            />
          </div>
        </div>

        <Select value={metodoFiltro} onValueChange={v => { setMetodoFiltro(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="dinheiro">Dinheiro</SelectItem>
            <SelectItem value="debito">Debito</SelectItem>
            <SelectItem value="credito">Credito</SelectItem>
            <SelectItem value="pix">PIX</SelectItem>
            <SelectItem value="fiado">Fiado</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setPage(1); }} className="w-[150px]" />
          </div>
          <span className="text-muted-foreground text-sm">ate</span>
          <Input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setPage(1); }} className="w-[150px]" />
        </div>

        <Button variant="outline" size="sm" onClick={() => { setSearch(''); setMetodoFiltro('todos'); setDataInicio(''); setDataFim(''); setPage(1); }}>
          Limpar
        </Button>

        <Button variant="destructive" size="sm" className="gap-1" onClick={removerDuplicatas} disabled={removingDups}>
          <Trash2 className="w-3.5 h-3.5" /> {removingDups ? 'Removendo...' : 'Remover Duplicatas'}
        </Button>
      </div>

      {loading ? (
        <LoadingState />
      ) : vendas.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nenhuma venda encontrada</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px]">#</TableHead>
                <TableHead className="w-[140px]">Data / Hora</TableHead>
                <TableHead className="w-[160px]">Cliente</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead className="text-center w-[100px]">Pagamento</TableHead>
                <TableHead className="text-right w-[90px]">Subtotal</TableHead>
                <TableHead className="text-right w-[80px]">Desconto</TableHead>
                <TableHead className="text-right w-[100px]">Total</TableHead>
                <TableHead className="text-center w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.map(v => {
                const itens = (v.itens || []) as any[];
                const resumo = itens.slice(0, 2).map(i => i.descricao).join(' · ');
                const sobrando = itens.length > 2 ? ` · +${itens.length - 2}` : '';
                return (
                <TableRow key={v.id} className="hover:bg-accent/50">
                  <TableCell className="font-mono font-bold text-primary">
                    {String(v.numero_venda).padStart(5, '0')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDateTime(v.created_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {v.cliente?.nome || <span className="text-muted-foreground italic">Consumidor</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[300px]" title={itens.map((i: any) => `${formatQtd(i.quantidade)}× ${i.descricao}`).join('\n')}>
                    {itens.length === 0
                      ? <span className="italic">—</span>
                      : (
                        <div className="truncate">
                          <span className="font-semibold text-foreground">{itens.length} item{itens.length === 1 ? '' : 'ns'}:</span>{' '}
                          <span>{resumo}{sobrando}</span>
                        </div>
                      )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <Badge variant="outline" className={`text-[10px] font-semibold ${metodoColor[v.metodo_pagamento] || ''}`}>
                        {metodoLabel[v.metodo_pagamento] || v.metodo_pagamento}
                      </Badge>
                      {v.metodo_pagamento === 'fiado' && !v.quitado_em && (
                        <span className="text-[9px] uppercase tracking-wider font-bold text-orange-600">
                          {Number(v.valor_pago_fiado || 0) > 0
                            ? `Parcial · ${formatBRL(Number(v.total) - Number(v.valor_pago_fiado))}`
                            : 'Em aberto'}
                        </span>
                      )}
                      {v.metodo_pagamento === 'fiado' && v.quitado_em && (
                        <span className="text-[9px] uppercase tracking-wider font-bold text-success">Quitada</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm">{formatBRL(Number(v.subtotal))}</TableCell>
                  <TableCell className={`text-right text-sm ${Number(v.desconto_total) > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {Number(v.desconto_total) > 0 ? `- ${formatBRL(Number(v.desconto_total))}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm">{formatBRL(Number(v.total))}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {v.metodo_pagamento === 'fiado' && !v.quitado_em && (
                        <>
                          <button
                            onClick={() => abrirPagamento(v)}
                            className="px-2 py-1 rounded-md bg-success/15 hover:bg-success/25 text-success text-[10px] font-bold uppercase transition-colors"
                            title="Registrar pagamento (parcial ou total)"
                          >
                            <DollarSign className="w-3 h-3 inline -mt-0.5" /> Pagar
                          </button>
                          <button
                            onClick={() => enviarWhatsApp(v)}
                            className="p-1.5 rounded-md hover:bg-green-500/15 text-green-600 transition-colors"
                            title="Mandar mensagem no WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => openDetail(v)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => reimprimirCupom(v)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                        title="Imprimir cupom"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} de {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {page} / {lastPage}
            </span>
            <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>
              Proximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Venda #{selectedVenda && String(selectedVenda.numero_venda).padStart(5, '0')}
            </DialogTitle>
          </DialogHeader>
          {selectedVenda && (
            <div className="flex flex-col flex-1 min-h-0 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm flex-shrink-0">
                <div>
                  <p className="text-muted-foreground text-xs">Data</p>
                  <p className="font-medium">{formatDateTime(selectedVenda.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cliente</p>
                  <p className="font-medium">{selectedVenda.cliente?.nome || 'Consumidor'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Pagamento</p>
                  <Badge variant="outline" className={`text-[10px] font-semibold ${metodoColor[selectedVenda.metodo_pagamento] || ''}`}>
                    {metodoLabel[selectedVenda.metodo_pagamento] || selectedVenda.metodo_pagamento}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor Pago</p>
                  <p className="font-medium">{formatBRL(Number(selectedVenda.valor_pago))}</p>
                </div>
                {Number(selectedVenda.troco) > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs">Troco</p>
                    <p className="font-medium text-green-600">{formatBRL(Number(selectedVenda.troco))}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3 flex flex-col min-h-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex-shrink-0">ITENS DA VENDA</p>
                {loadingDetail ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">Carregando...</p>
                ) : (
                  <div className="flex-1 overflow-auto space-y-1 min-h-0">
                    {vendaItens.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{item.descricao}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.codigo_barras || 'S/C'} · {Number(item.quantidade)} {item.unidade} x {formatBRL(Number(item.valor_unitario))}
                          </p>
                        </div>
                        <span className="font-bold ml-2 whitespace-nowrap">{formatBRL(Number(item.valor_total))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3 space-y-1 flex-shrink-0">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatBRL(Number(selectedVenda.subtotal))}</span>
                </div>
                {Number(selectedVenda.desconto_total) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-destructive">Desconto</span>
                    <span className="text-destructive">- {formatBRL(Number(selectedVenda.desconto_total))}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatBRL(Number(selectedVenda.total))}</span>
                </div>
              </div>

              <Button className="w-full gap-2 flex-shrink-0" onClick={() => reimprimirCupom(selectedVenda)}>
                <Printer className="w-4 h-4" /> Imprimir Cupom
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Pagamento de Fiado (parcial ou total) */}
      <Dialog open={pagModalOpen} onOpenChange={setPagModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-success" /> Registrar pagamento
            </DialogTitle>
          </DialogHeader>
          {pagVenda && (() => {
            const total = Number(pagVenda.total);
            const jaPago = Number(pagVenda.valor_pago_fiado || 0);
            const restante = total - jaPago;
            const valorAgora = parseFloat(String(pagValor).replace(',', '.')) || 0;
            const quitaTudo = valorAgora >= restante - 0.01;
            return (
              <div className="space-y-3 text-sm">
                <div className="bg-muted/40 rounded p-3 border border-border space-y-1.5">
                  <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                    Venda #{String(pagVenda.numero_venda).padStart(5, '0')}
                  </p>
                  <p><strong>{pagVenda.cliente?.nome}</strong></p>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total da compra:</span><strong>{formatBRL(total)}</strong></div>
                  {jaPago > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Já pago:</span><span className="text-success font-semibold">{formatBRL(jaPago)}</span></div>}
                  <div className="flex justify-between border-t border-border pt-1.5"><span className="font-bold">Saldo devedor:</span><strong className="text-orange-600 text-base">{formatBRL(restante)}</strong></div>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Valor recebido agora</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={pagValor}
                    onChange={e => setPagValor(e.target.value)}
                    className="text-right text-lg font-bold mt-1"
                    autoFocus
                  />
                  <div className="flex gap-1 mt-1.5">
                    <button onClick={() => setPagValor((restante / 2).toFixed(2))} className="text-[10px] text-primary hover:underline">½</button>
                    <span className="text-muted-foreground">·</span>
                    <button onClick={() => setPagValor(restante.toFixed(2))} className="text-[10px] text-primary hover:underline">tudo ({formatBRL(restante)})</button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Forma de pagamento</Label>
                  <Select value={pagForma} onValueChange={setPagForma}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className={`rounded-md p-3 text-xs border ${quitaTudo ? 'bg-success/10 border-success/30' : 'bg-primary/10 border-primary/30'}`}>
                  {quitaTudo ? (
                    <p className="flex items-center gap-1.5 font-bold text-success">
                      <CheckCircle2 className="w-4 h-4" /> Esse pagamento quita o fiado completamente.
                    </p>
                  ) : (
                    <p className="font-semibold">
                      Após esse pagamento, ainda fica devendo <strong>{formatBRL(Math.max(0, restante - valorAgora))}</strong>.
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setPagModalOpen(false)} disabled={pagSalvando}>Cancelar</Button>
                  <Button className="btn-construction flex-1" onClick={registrarPagamento} disabled={pagSalvando || !valorAgora}>
                    {pagSalvando ? 'Salvando...' : 'Confirmar'}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
