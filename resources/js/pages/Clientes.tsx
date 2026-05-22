import { useEffect, useState } from 'react';
import { clientesApi, fiadosApi } from '@/lib/api/index';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FileText, Pencil, Trash2, Users } from 'lucide-react';
import { formatCPF, formatPhone } from '@/lib/format';
import { gerarRelatorioClientePDF } from '@/lib/gerarRelatorioPDF';
import { useToast } from '@/hooks/use-toast';
import { clienteSchema, validar } from '@/lib/validators';
import { maskCpfOuCnpj, maskTelefone } from '@/lib/masks';

interface Cliente {
  id: string;
  codigo_interno: string | null;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  status: string;
  limite_credito: number | string;
  created_at: string;
}

const emptyCliente = { nome: '', codigo_interno: '', cpf: '', telefone: '', status: 'ativo', limite_credito: 0 };

const Clientes = () => {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCliente);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 10;

  const fetchClientes = async () => {
    setLoading(true);
    setError(false);
    try {
      const resp = await clientesApi.list({ per_page: 1000 });
      setClientes(resp.data as Cliente[]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClientes(); }, []);

  const filtered = clientes.filter(c => {
    const term = search.toLowerCase();
    const matchSearch = c.nome.toLowerCase().includes(term) ||
      (c.cpf || '').includes(search) || (c.codigo_interno || '').includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const handleSave = async () => {
    const erro = await validar(clienteSchema, form);
    if (erro) {
      toast({ title: 'Confira os campos', description: erro, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await clientesApi.update(editingId, form);
        toast({ title: 'Cliente atualizado!' });
      } else {
        await clientesApi.create(form);
        toast({ title: 'Cliente cadastrado!' });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyCliente);
      fetchClientes();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Erro ao salvar';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await clientesApi.remove(deleteId);
      toast({ title: 'Cliente excluído!' });
      fetchClientes();
    } catch (e: any) {
      toast({ title: e?.response?.data?.message || 'Erro ao excluir', variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const openEdit = (c: Cliente) => {
    setForm({
      nome: c.nome,
      codigo_interno: c.codigo_interno || '',
      cpf: c.cpf || '',
      telefone: c.telefone || '',
      status: c.status,
      limite_credito: Number(c.limite_credito) || 0,
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handlePDF = async (c: Cliente) => {
    toast({ title: 'Gerando relatório...' });
    try {
      // GET /clientes/{id} traz as últimas vendas via relacionamento
      const detalhe = await clientesApi.get(c.id);
      const vendas = ((detalhe as any).vendas || []) as any[];
      gerarRelatorioClientePDF(c, vendas);
    } catch (e: any) {
      toast({ title: 'Erro ao gerar relatório', description: e?.message, variant: 'destructive' });
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={fetchClientes} />;

  return (
    <div>
      <PageHeader title="Clientes" description="Gerencie os clientes da loja">
        <Button onClick={() => { setForm(emptyCliente); setEditingId(null); setShowForm(true); }} className="gap-2 gradient-accent text-primary-foreground">
          <Plus className="w-4 h-4" /> Novo Cliente
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl shadow-card border border-border/50 animate-fade-up">
        <div className="p-4 border-b border-border flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, CPF ou código..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9 text-sm" />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inadimplente">Inadimplente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum cliente" description="Cadastre o primeiro cliente para começar." action={<Button onClick={() => setShowForm(true)}>Cadastrar</Button>} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">NOME</TableHead>
                  <TableHead className="text-xs">CÓDIGO</TableHead>
                  <TableHead className="text-xs">CPF</TableHead>
                  <TableHead className="text-xs">TELEFONE</TableHead>
                  <TableHead className="text-xs">STATUS</TableHead>
                  <TableHead className="text-xs text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(c => (
                  <TableRow key={c.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium text-sm">{c.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.codigo_interno || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.cpf ? formatCPF(c.cpf) : '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.telefone ? formatPhone(c.telefone) : '-'}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary" onClick={() => handlePDF(c)} title="Gerar PDF do Cliente">
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-border text-sm text-muted-foreground">
                <span>{filtered.length} cliente(s)</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                  <span className="flex items-center px-2">{page + 1} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próximo</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs uppercase text-muted-foreground">Nome Completo</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs uppercase text-muted-foreground">Código Interno</Label><Input value={form.codigo_interno} onChange={e => setForm({ ...form, codigo_interno: e.target.value })} /></div>
              <div><Label className="text-xs uppercase text-muted-foreground">CPF / CNPJ</Label><Input value={form.cpf} onChange={e => setForm({ ...form, cpf: maskCpfOuCnpj(e.target.value) })} maxLength={18} placeholder="000.000.000-00" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs uppercase text-muted-foreground">Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: maskTelefone(e.target.value) })} maxLength={15} placeholder="(00) 00000-0000" /></div>
              <div><Label className="text-xs uppercase text-muted-foreground">Limite de Crédito</Label><Input type="number" value={form.limite_credito} onChange={e => setForm({ ...form, limite_credito: Number(e.target.value) })} /></div>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inadimplente">Inadimplente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.nome} className="gradient-accent text-primary-foreground">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O cliente e todos os fiados associados serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clientes;
