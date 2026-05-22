import { useState, useRef } from 'react';
import { produtosApi } from '@/lib/api/index';
import { lerPlanilhaProdutos, gerarModeloXLSX, type ResultadoParse } from '@/lib/importProdutos';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, X, Info,
} from 'lucide-react';

type Etapa = 'escolher' | 'preview' | 'enviando' | 'concluido';

const LOTE = 200; // produtos por requisição. 200 é seguro pra ~80KB por lote.

interface Props {
  open: boolean;
  onClose: () => void;
  onConcluido: () => void;
}

export const ImportProdutosDialog = ({ open, onClose, onConcluido }: Props) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [etapa, setEtapa] = useState<Etapa>('escolher');
  const [parse, setParse] = useState<ResultadoParse | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [progresso, setProgresso] = useState({ enviados: 0, total: 0, ins: 0, upd: 0 });

  const reset = () => {
    setEtapa('escolher');
    setParse(null);
    setNomeArquivo('');
    setProgresso({ enviados: 0, total: 0, ins: 0, upd: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fechar = () => {
    if (etapa === 'enviando') return;   // não deixa fechar no meio do envio
    reset();
    onClose();
  };

  const escolherArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNomeArquivo(file.name);
    try {
      const r = await lerPlanilhaProdutos(file);
      setParse(r);
      setEtapa('preview');
    } catch (err: any) {
      toast({ title: 'Erro ao ler planilha', description: err?.message, variant: 'destructive' });
    }
  };

  const enviar = async () => {
    if (!parse || parse.produtos.length === 0) return;

    setEtapa('enviando');
    const lista = parse.produtos;
    setProgresso({ enviados: 0, total: lista.length, ins: 0, upd: 0 });

    let ins = 0, upd = 0, enviados = 0;
    for (let i = 0; i < lista.length; i += LOTE) {
      const batch = lista.slice(i, i + LOTE);
      try {
        const r = await produtosApi.importBulk(batch as any);
        ins += r.inseridos;
        upd += r.atualizados;
      } catch (e: any) {
        toast({
          title: `Erro no lote ${i + 1}-${i + batch.length}`,
          description: e?.response?.data?.message || e.message,
          variant: 'destructive',
        });
        // continua o próximo lote — não interrompe a importação inteira
      }
      enviados += batch.length;
      setProgresso({ enviados, total: lista.length, ins, upd });
    }

    setEtapa('concluido');
  };

  const pct = progresso.total > 0 ? Math.round((progresso.enviados / progresso.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) fechar(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" /> Importar produtos via planilha
          </DialogTitle>
        </DialogHeader>

        {/* ── ETAPA 1: escolher arquivo ── */}
        {etapa === 'escolher' && (
          <div className="space-y-4">
            <div className="bg-primary/5 border-2 border-dashed border-primary/40 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-primary mx-auto mb-3" strokeWidth={1.5} />
              <p className="font-bold text-base mb-1">Selecione sua planilha XLSX</p>
              <p className="text-xs text-muted-foreground mb-4">
                Aceita .xlsx, .xls, .csv — não tem limite de tamanho. Em 100 mil produtos, leva uns 2 minutos.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={escolherArquivo}
                className="hidden"
                id="import-file-input"
              />
              <Button asChild className="btn-construction gap-2">
                <label htmlFor="import-file-input" className="cursor-pointer">
                  <Upload className="w-4 h-4" /> ESCOLHER ARQUIVO
                </label>
              </Button>
            </div>

            <div className="bg-muted/40 border border-border rounded-md p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1.5 flex-1">
                <p><strong className="text-foreground">Não sabe o formato?</strong> Baixe a planilha modelo, preencha com seus produtos e importe de volta.</p>
                <p>A planilha precisa ter pelo menos as colunas <strong>Nome do Produto</strong> e <strong>Preço Venda</strong>. As outras são opcionais.</p>
                <p>O sistema reconhece as colunas pelo nome (não importa a ordem), então funciona com planilhas que você já usa hoje.</p>
              </div>
            </div>

            <Button variant="outline" onClick={gerarModeloXLSX} className="w-full gap-2">
              <Download className="w-4 h-4" /> Baixar planilha modelo (.xlsx)
            </Button>
          </div>
        )}

        {/* ── ETAPA 2: preview do que vai ser importado ── */}
        {etapa === 'preview' && parse && (
          <div className="space-y-4">
            <div className="bg-muted/40 rounded-md p-3 text-sm">
              <p className="font-semibold flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                {nomeArquivo}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-md p-3 text-center">
                <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Linhas lidas</p>
                <p className="text-2xl font-extrabold mt-1">{parse.total}</p>
              </div>
              <div className="bg-success/10 border border-success/30 rounded-md p-3 text-center">
                <p className="text-[11px] uppercase tracking-wider font-bold text-success">Prontos pra importar</p>
                <p className="text-2xl font-extrabold text-success mt-1">{parse.produtos.length}</p>
              </div>
              <div className={`rounded-md p-3 text-center border ${parse.erros.length > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/40 border-border'}`}>
                <p className={`text-[11px] uppercase tracking-wider font-bold ${parse.erros.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>Com erro</p>
                <p className={`text-2xl font-extrabold mt-1 ${parse.erros.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{parse.erros.length}</p>
              </div>
            </div>

            {parse.colunasNaoMapeadas.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-md p-3 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-amber-900">Colunas não reconhecidas (vão ser ignoradas):</p>
                  <p className="text-amber-800 mt-0.5">{parse.colunasNaoMapeadas.join(', ')}</p>
                </div>
              </div>
            )}

            {parse.erros.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-xs max-h-32 overflow-y-auto">
                <p className="font-bold text-destructive mb-1">Linhas com problema:</p>
                {parse.erros.slice(0, 10).map((e, i) => (
                  <p key={i} className="text-destructive/90">Linha {e.linha}: {e.motivo}</p>
                ))}
                {parse.erros.length > 10 && <p className="text-destructive/70 italic">… e mais {parse.erros.length - 10}</p>}
              </div>
            )}

            {parse.produtos.length > 0 && (
              <div className="border border-border rounded-md max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="text-left p-2">Cód. barras</th>
                      <th className="text-left p-2">Produto</th>
                      <th className="text-center p-2">Un</th>
                      <th className="text-right p-2">Custo</th>
                      <th className="text-right p-2">Venda</th>
                      <th className="text-right p-2">Estq.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parse.produtos.slice(0, 30).map((p, i) => (
                      <tr key={i} className="border-t border-border/40">
                        <td className="p-2 font-mono text-[10px] text-muted-foreground">{p.codigo_barras || '—'}</td>
                        <td className="p-2">{p.descricao}</td>
                        <td className="p-2 text-center text-muted-foreground">{p.unidade}</td>
                        <td className="p-2 text-right">{p.preco_custo.toFixed(2)}</td>
                        <td className="p-2 text-right font-semibold">{p.preco_venda.toFixed(2)}</td>
                        <td className="p-2 text-right">{p.estoque_atual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parse.produtos.length > 30 && (
                  <p className="text-center text-[11px] text-muted-foreground py-2 bg-muted/30">
                    … e mais {parse.produtos.length - 30} produtos
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                <X className="w-4 h-4 mr-1" /> Trocar planilha
              </Button>
              <Button
                className="btn-construction flex-1 gap-2"
                onClick={enviar}
                disabled={parse.produtos.length === 0}
              >
                <Upload className="w-4 h-4" /> IMPORTAR {parse.produtos.length} PRODUTOS
              </Button>
            </div>
          </div>
        )}

        {/* ── ETAPA 3: enviando (progresso) ── */}
        {etapa === 'enviando' && (
          <div className="space-y-5 py-4">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-primary mx-auto mb-3 animate-spin" />
              <p className="font-bold text-base">Importando produtos...</p>
              <p className="text-xs text-muted-foreground mt-1">Não feche essa janela.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span>{progresso.enviados.toLocaleString('pt-BR')} de {progresso.total.toLocaleString('pt-BR')}</span>
                <span className="text-primary">{pct}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-200" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-success/10 border border-success/30 rounded-md p-3">
                <p className="text-[11px] uppercase tracking-wider font-bold text-success">Novos</p>
                <p className="text-xl font-extrabold text-success mt-1">{progresso.ins.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-md p-3">
                <p className="text-[11px] uppercase tracking-wider font-bold text-primary">Atualizados</p>
                <p className="text-xl font-extrabold text-primary mt-1">{progresso.upd.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── ETAPA 4: concluído ── */}
        {etapa === 'concluido' && (
          <div className="space-y-4 py-2">
            <div className="text-center">
              <CheckCircle2 className="w-14 h-14 text-success mx-auto mb-3" />
              <p className="font-extrabold text-lg">Importação concluída!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {progresso.ins.toLocaleString('pt-BR')} produtos novos · {progresso.upd.toLocaleString('pt-BR')} atualizados
              </p>
            </div>
            <Button
              className="btn-construction w-full"
              onClick={() => { onConcluido(); fechar(); }}
            >
              Ver produtos
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
