import { useState, useEffect, useRef, useCallback } from 'react';
import { produtosApi } from '@/lib/api/index';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { formatBRL, formatQtd } from '@/lib/format';
import { Plus, Search, Package, Edit2, Trash2, Barcode, Upload } from 'lucide-react';
import { produtoSchema, validar } from '@/lib/validators';
import { ImportProdutosDialog } from '@/components/ImportProdutosDialog';

interface Produto {
  id: string;
  codigo_barras: string;
  codigo_interno: string | null;
  descricao: string;
  preco_custo: number | string;
  preco_venda: number | string;
  preco_atacado: number | string;
  qtd_minima_atacado: number;
  unidade: string;
  ativo: boolean;
  categoria: string | null;
  marca: string | null;
  estoque_minimo: number;
  estoque_atual: number | string;
  movimenta_estoque: boolean;
}

const ITEMS_PER_PAGE = 20;

const Produtos = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<string>('todos');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const [form, setForm] = useState({
    codigo_barras: '',
    codigo_interno: '',
    referencia_fabricante: '',
    descricao: '',
    preco_custo: '',
    preco_venda: '',
    preco_atacado: '',
    qtd_minima_atacado: '0',
    unidade: 'UN',
    ativo: true,
    categoria: '',
    marca: '',
    localizacao: '',
    estoque_minimo: '0',
    estoque_atual: '0',
    movimenta_estoque: true,
    observacao: '',
  });

  const fetchProdutos = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { per_page: ITEMS_PER_PAGE, page };
      if (search) params.search = search;
      if (filtroAtivo === 'ativo') params.ativo = true;
      if (filtroAtivo === 'inativo') params.ativo = false;

      const resp = await produtosApi.list(params);
      setProdutos(resp.data as Produto[]);
      setTotal(resp.total);
      setLastPage(resp.last_page);
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProdutos(); }, [page, search, filtroAtivo]);

  const openNew = () => {
    setEditingProduto(null);
    ultimoCodigoBuscado.current = '';
    setForm({
      codigo_barras: '', codigo_interno: '', referencia_fabricante: '', descricao: '',
      preco_custo: '', preco_venda: '', preco_atacado: '', qtd_minima_atacado: '0',
      unidade: 'UN', ativo: true, categoria: '', marca: '', localizacao: '',
      estoque_minimo: '0', estoque_atual: '0', movimenta_estoque: true, observacao: '',
    });
    setModalOpen(true);
  };

  const openEdit = (p: Produto) => {
    setEditingProduto(p);
    setForm({
      codigo_barras: p.codigo_barras || '',
      codigo_interno: p.codigo_interno || '',
      referencia_fabricante: (p as any).referencia_fabricante || '',
      descricao: p.descricao,
      preco_custo: String(p.preco_custo),
      preco_venda: String(p.preco_venda),
      preco_atacado: String(p.preco_atacado || 0),
      qtd_minima_atacado: String(p.qtd_minima_atacado || 0),
      unidade: p.unidade,
      ativo: p.ativo,
      categoria: p.categoria || '',
      marca: p.marca || '',
      localizacao: (p as any).localizacao || '',
      estoque_minimo: String(p.estoque_minimo || 0),
      estoque_atual: String(Number(p.estoque_atual) || 0),
      movimenta_estoque: p.movimenta_estoque,
      observacao: (p as any).observacao || '',
    });
    setModalOpen(true);
  };

  const buscaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimoCodigoBuscado = useRef('');

  const buscarPorCodigoBarras = useCallback((codigo: string) => {
    if (buscaTimerRef.current) clearTimeout(buscaTimerRef.current);
    const cod = codigo.trim();
    if (!cod || cod.length < 3 || cod === ultimoCodigoBuscado.current) return;
    buscaTimerRef.current = setTimeout(async () => {
      const data = await produtosApi.buscarPorCodigo(cod, { incluirInativos: true });
      if (data) {
        ultimoCodigoBuscado.current = cod;
        setForm(f => ({
          ...f,
          codigo_barras: f.codigo_barras,
          codigo_interno: data.codigo_interno || '',
          descricao: data.descricao,
          preco_custo: String(data.preco_custo),
          preco_venda: String(data.preco_venda),
          preco_atacado: String(data.preco_atacado || 0),
          qtd_minima_atacado: String(data.qtd_minima_atacado || 0),
          unidade: data.unidade,
          ativo: data.ativo,
          categoria: data.categoria || '',
          marca: data.marca || '',
          estoque_minimo: String(data.estoque_minimo || 0),
          estoque_atual: String(Number(data.estoque_atual) || 0),
          movimenta_estoque: data.movimenta_estoque,
        }));
        toast({ title: 'Dados preenchidos!', description: `Baseado em: ${data.descricao}. Altere o que precisar.` });
      }
    }, 400);
  }, []);

  const handleSave = async () => {
    const erro = await validar(produtoSchema, form);
    if (erro) {
      toast({ title: 'Confira os campos', description: erro, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        codigo_barras: form.codigo_barras.trim(),
        codigo_interno: form.codigo_interno.trim(),
        referencia_fabricante: form.referencia_fabricante.trim().toUpperCase() || null,
        descricao: form.descricao.trim().toUpperCase(),
        preco_custo: parseFloat(form.preco_custo) || 0,
        preco_venda: parseFloat(form.preco_venda) || 0,
        preco_atacado: parseFloat(form.preco_atacado) || 0,
        qtd_minima_atacado: parseInt(form.qtd_minima_atacado) || 0,
        unidade: form.unidade,
        ativo: form.ativo,
        categoria: form.categoria.trim(),
        marca: form.marca.trim().toUpperCase(),
        localizacao: form.localizacao.trim() || null,
        estoque_minimo: parseInt(form.estoque_minimo) || 0,
        estoque_atual: parseFloat(form.estoque_atual) || 0,
        movimenta_estoque: form.movimenta_estoque,
        observacao: form.observacao.trim() || null,
      };

      if (editingProduto) {
        await produtosApi.update(editingProduto.id, payload);
        toast({ title: 'Produto atualizado com sucesso!' });
      } else {
        await produtosApi.create(payload);
        toast({ title: 'Produto cadastrado com sucesso!' });
        // Alerta se cadastrou com estoque zero e o produto movimenta estoque —
        // erro comum: esquecer de informar o estoque inicial e depois não conseguir vender.
        if (payload.movimenta_estoque && payload.estoque_atual <= 0) {
          toast({
            title: '⚠️ Estoque inicial não informado',
            description: 'Este produto foi cadastrado com estoque 0. Lembre de adicionar a quantidade em /estoque → "Nova movimentação" antes de tentar vender.',
            duration: 8000,
          });
        }
      }
      setModalOpen(false);
      fetchProdutos();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.response?.data?.message || e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await produtosApi.remove(deleteId);
      toast({ title: 'Produto excluído!' });
      setDeleteId(null);
      fetchProdutos();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.response?.data?.message || e.message, variant: 'destructive' });
    }
  };

  // Importação foi extraída pro componente <ImportProdutosDialog />.
  // Suporta planilha XLSX com colunas reconhecidas por NOME (não posição),
  // mostra preview antes de enviar, e processa em lotes com barra de progresso.

  if (error) return <ErrorState message={error} onRetry={fetchProdutos} />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Produtos" description={`${total} produtos cadastrados`}>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4" /> Importar planilha
          </Button>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Produto
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição, código ou marca..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 input-glow"
          />
        </div>
        <Select value={filtroAtivo} onValueChange={v => { setFiltroAtivo(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <LoadingState /> : produtos.length === 0 ? (
        <EmptyState icon={Package} title="Nenhum produto encontrado" description="Cadastre um novo produto para começar." />
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[110px]">Cód. Barras</TableHead>
                  <TableHead className="w-[100px]">Ref. Fab.</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="w-[110px]">Marca</TableHead>
                  <TableHead className="w-[120px]">Localização</TableHead>
                  <TableHead className="w-[60px]">UN</TableHead>
                  <TableHead className="text-right w-[90px]">Custo</TableHead>
                  <TableHead className="text-right w-[90px]">Venda</TableHead>
                  <TableHead className="text-right w-[80px]">Estoque</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[100px] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map(p => (
                  <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{p.codigo_barras?.slice(-13) || '—'}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{(p as any).referencia_fabricante || '—'}</TableCell>
                    <TableCell className="font-medium text-sm">{p.descricao}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.marca || '—'}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">{(p as any).localizacao || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{p.unidade}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{formatBRL(Number(p.preco_custo))}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatBRL(Number(p.preco_venda))}</TableCell>
                    <TableCell className={`text-right text-sm font-medium ${Number(p.estoque_atual) <= Number(p.estoque_minimo) ? 'text-destructive' : ''}`}>
                      {formatQtd(p.estoque_atual)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.ativo ? 'default' : 'secondary'} className="text-[10px]">
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {lastPage > 1 && (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Página {page} de {lastPage} ({total} produtos)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Cadastro/Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="w-5 h-5 text-primary" />
              {editingProduto ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 mt-2">

            {/* ── COLUNA ESQUERDA: dados principais (com destaque amarelo) ── */}
            <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 space-y-3">
              <div>
                <Label className="text-xs font-bold text-primary uppercase tracking-wider">Código de Barras</Label>
                <Input
                  value={form.codigo_barras}
                  onChange={e => {
                    const val = e.target.value;
                    setForm(f => ({ ...f, codigo_barras: val }));
                    buscarPorCodigoBarras(val);
                  }}
                  className="mt-1 font-semibold border-primary/30 focus:border-primary font-mono text-sm"
                  placeholder="Escaneie ou digite o código"
                  autoFocus
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-primary uppercase tracking-wider">Nome do Produto *</Label>
                <Input
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="mt-1 font-semibold border-primary/30 focus:border-primary"
                  placeholder="Ex: CANO PVC SOLDÁVEL 25MM"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-primary uppercase tracking-wider">Preço Custo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.preco_custo}
                    onChange={e => setForm(f => ({ ...f, preco_custo: e.target.value }))}
                    className="mt-1 text-base font-bold border-primary/30 focus:border-primary"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-primary uppercase tracking-wider">Preço Venda *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.preco_venda}
                    onChange={e => setForm(f => ({ ...f, preco_venda: e.target.value }))}
                    className="mt-1 text-base font-bold border-primary/30 focus:border-primary"
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preço Atacado</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.preco_atacado}
                    onChange={e => setForm(f => ({ ...f, preco_atacado: e.target.value }))}
                    className="mt-1"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Qtd mín. atacado</Label>
                  <Input
                    type="number"
                    value={form.qtd_minima_atacado}
                    onChange={e => setForm(f => ({ ...f, qtd_minima_atacado: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              {(() => {
                const custo = parseFloat(form.preco_custo) || 0;
                const venda = parseFloat(form.preco_venda) || 0;
                if (custo > 0 && venda > 0) {
                  const lucroR$ = venda - custo;
                  const lucroPct = ((lucroR$ / custo) * 100);
                  const positivo = lucroR$ >= 0;
                  return (
                    <div className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-bold ${
                      positivo ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'
                    } text-black dark:text-white`}>
                      <span>Lucro: R$ {lucroR$.toFixed(2).replace('.', ',')}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        positivo ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        {positivo ? '+' : ''}{lucroPct.toFixed(1).replace('.', ',')}%
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="flex items-center gap-5 pt-1">
                <label className="flex items-center gap-2 text-xs cursor-pointer font-semibold">
                  <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="rounded" />
                  Ativo
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer font-semibold">
                  <input type="checkbox" checked={form.movimenta_estoque} onChange={e => setForm(f => ({ ...f, movimenta_estoque: e.target.checked }))} className="rounded" />
                  Movimenta estoque
                </label>
              </div>
            </div>

            {/* ── COLUNA DIREITA: classificação e estoque ── */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">SKU interno</Label>
                  <Input value={form.codigo_interno} onChange={e => setForm(f => ({ ...f, codigo_interno: e.target.value }))} className="mt-1 font-mono text-xs" placeholder="HID-CAN-25" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Ref. fabricante</Label>
                  <Input value={form.referencia_fabricante} onChange={e => setForm(f => ({ ...f, referencia_fabricante: e.target.value }))} className="mt-1 font-mono text-xs" placeholder="T-PVC25" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Unidade</Label>
                  <Select value={form.unidade} onValueChange={v => setForm(f => ({ ...f, unidade: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UN">UN — Unidade</SelectItem>
                      <SelectItem value="M">M — Metro</SelectItem>
                      <SelectItem value="M2">M² — Metro²</SelectItem>
                      <SelectItem value="M3">M³ — Metro³</SelectItem>
                      <SelectItem value="KG">KG — Quilo</SelectItem>
                      <SelectItem value="BARRA">BARRA</SelectItem>
                      <SelectItem value="ROLO">ROLO</SelectItem>
                      <SelectItem value="SC">SC — Saco</SelectItem>
                      <SelectItem value="CX">CX — Caixa</SelectItem>
                      <SelectItem value="LATA">LATA</SelectItem>
                      <SelectItem value="GL">GL — Galão</SelectItem>
                      <SelectItem value="L">L — Litro</SelectItem>
                      <SelectItem value="PCT">PCT — Pacote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Categoria</Label>
                  <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Escolha..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hidráulica">Hidráulica</SelectItem>
                      <SelectItem value="Elétrica">Elétrica</SelectItem>
                      <SelectItem value="Ferramentas">Ferramentas</SelectItem>
                      <SelectItem value="Tintas">Tintas</SelectItem>
                      <SelectItem value="Cimentos e Argamassa">Cimentos e Argamassa</SelectItem>
                      <SelectItem value="Agregados">Agregados</SelectItem>
                      <SelectItem value="Pisos e Revestimentos">Pisos e Revestimentos</SelectItem>
                      <SelectItem value="Madeiras">Madeiras</SelectItem>
                      <SelectItem value="Ferro e Aço">Ferro e Aço</SelectItem>
                      <SelectItem value="Telhas">Telhas</SelectItem>
                      <SelectItem value="Acessórios">Acessórios</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Marca</Label>
                  <Input value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} className="mt-1" placeholder="Tigre, Tramontina..." />
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Localização na loja</Label>
                <Input value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))} className="mt-1" placeholder="Ex: Corredor B / Prateleira 3" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Estoque atual</Label>
                  <Input type="number" step="0.001" value={form.estoque_atual} onChange={e => setForm(f => ({ ...f, estoque_atual: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Estoque mínimo</Label>
                  <Input type="number" value={form.estoque_minimo} onChange={e => setForm(f => ({ ...f, estoque_minimo: e.target.value }))} className="mt-1" />
                </div>
              </div>
              {/* Alerta inline: estoque inicial não informado */}
              {form.movimenta_estoque && (parseFloat(String(form.estoque_atual)) || 0) <= 0 && !editingProduto && (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-md p-2 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">⚠️</span>
                  <span>
                    <strong>Atenção:</strong> estoque inicial está zerado. Sem estoque, o PDV não vai deixar vender este produto.
                    Informe a quantidade aqui ou faça uma entrada em /estoque depois.
                  </span>
                </div>
              )}

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Observação (opcional)</Label>
                <Input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} className="mt-1" placeholder="Ex: vendido avulso ou caixa 24un" />
              </div>
            </div>
          </div>

          {/* Botões em largura total */}
          <div className="flex gap-3 pt-3 border-t border-border mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="btn-construction flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingProduto ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Excluir */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Importação de planilha XLSX/CSV em massa (até 100k+ produtos) */}
      <ImportProdutosDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onConcluido={() => fetchProdutos()}
      />
    </div>
  );
};

export default Produtos;
