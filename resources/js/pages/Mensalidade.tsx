import { useEffect, useState } from 'react';
import { mensalidadesApi, type MinhaMensalidadeResponse, type Mensalidade } from '@/lib/api/index';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard, Copy, Check, QrCode, Calendar, AlertTriangle, CheckCircle2, Clock,
  PhoneCall, Wallet, HardHat,
} from 'lucide-react';
import { formatBRL } from '@/lib/format';

const formatDate = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('pt-BR');
};

const statusBadge = (m: Mensalidade) => {
  if (m.status === 'pago') return <span className="text-[10px] bg-success/15 text-success px-2 py-0.5 rounded-full font-bold uppercase">Pago</span>;
  if (m.atrasada) return <span className="text-[10px] bg-destructive/15 text-destructive px-2 py-0.5 rounded-full font-bold uppercase">Atrasado</span>;
  if (m.status === 'pendente') return <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Pendente</span>;
  return <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold uppercase">{m.status}</span>;
};

export default function Mensalidade() {
  const { toast } = useToast();
  const [data, setData] = useState<MinhaMensalidadeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await mensalidadesApi.minha();
      setData(r);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const copiarPix = async () => {
    if (!data?.pix.copia_cola) return;
    await navigator.clipboard.writeText(data.pix.copia_cola);
    setCopied(true);
    toast({ title: 'Copiado!', description: 'Código PIX copiado pra área de transferência.' });
    setTimeout(() => setCopied(false), 2200);
  };

  if (loading || !data) return <LoadingState />;

  const proxima = data.mensalidades.find(m => m.status === 'pendente');
  const valor = data.pix.valor_mensal || proxima?.valor || 180;
  const { usuario, pix } = data;
  const semQrCode = !pix.qr_code_base64 && !pix.copia_cola;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Mensalidade do sistema" description="Pagamento mensal pelo uso do TEM DE TUDO" />

      {/* Status do trial / licença */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className={`rounded-lg p-5 border-2 ${
          usuario.em_trial ? 'border-primary bg-primary/5' :
          usuario.licenca_ativa ? 'border-success/40 bg-success/5' :
          'border-destructive bg-destructive/5'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {usuario.em_trial ? <Clock className="w-5 h-5 text-primary" /> :
             usuario.licenca_ativa ? <CheckCircle2 className="w-5 h-5 text-success" /> :
             <AlertTriangle className="w-5 h-5 text-destructive" />}
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Status</p>
          </div>
          <p className="text-xl font-extrabold">
            {usuario.em_trial ? 'Em período de teste' :
             usuario.licenca_ativa ? 'Licença ativa' :
             'Expirado'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {usuario.em_trial && `${usuario.dias_restantes} dias restantes`}
            {usuario.licenca_ativa && usuario.licenca_ate && `Válida até ${formatDate(usuario.licenca_ate)}`}
            {!usuario.em_trial && !usuario.licenca_ativa && 'Pague a mensalidade para reativar'}
          </p>
        </div>

        <div className="rounded-lg p-5 border border-border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Próximo vencimento</p>
          </div>
          <p className="text-xl font-extrabold">
            {proxima ? formatDate(proxima.vencimento) : (usuario.licenca_ate ? formatDate(usuario.licenca_ate) : '—')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {proxima ? proxima.referencia_label : 'Sem mensalidade pendente'}
          </p>
        </div>

        <div className="rounded-lg p-5 border border-border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-muted-foreground" />
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Valor mensal</p>
          </div>
          <p className="text-xl font-extrabold text-primary">{formatBRL(valor)}</p>
          <p className="text-xs text-muted-foreground mt-1">Cobrado todo mês</p>
        </div>
      </div>

      {/* Como pagar */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-wider">Como pagar — PIX</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Beneficiário</p>
              <p className="font-bold text-base">{pix.nome_titular || 'Mateus Angels'}</p>
              <p className="text-xs text-muted-foreground">{pix.cidade || 'Goiânia/GO'}</p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Chave PIX</p>
              <p className="font-mono text-sm break-all bg-muted/50 px-3 py-2 rounded border border-border">
                {pix.chave || '— ainda não configurada —'}
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Valor a pagar</p>
              <p className="font-extrabold text-3xl text-primary">{formatBRL(valor)}</p>
            </div>

            {pix.copia_cola && (
              <Button onClick={copiarPix} className="btn-construction w-full gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'COPIADO!' : 'COPIAR PIX (COPIA E COLA)'}
              </Button>
            )}

            <div className="rounded-md bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1.5 font-bold text-foreground"><PhoneCall className="w-3.5 h-3.5" /> Depois de pagar:</p>
              <p>Envie o comprovante no WhatsApp do desenvolvedor. Em até 1 hora útil seu acesso é renovado.</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-border p-6">
            {pix.qr_code_base64 ? (
              <>
                <img
                  src={pix.qr_code_base64.startsWith('data:') ? pix.qr_code_base64 : `data:image/png;base64,${pix.qr_code_base64}`}
                  alt="QR Code PIX"
                  className="w-56 h-56 object-contain bg-white p-2 rounded"
                />
                <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mt-3">Aponte a câmera do banco</p>
              </>
            ) : (
              <div className="text-center text-muted-foreground">
                <QrCode className="w-24 h-24 mx-auto opacity-30 mb-3" strokeWidth={1.2} />
                <p className="text-sm font-bold">QR Code não configurado</p>
                <p className="text-xs mt-1">
                  {semQrCode
                    ? 'O administrador ainda não cadastrou os dados do PIX. Use a chave ou entre em contato.'
                    : 'Use a chave PIX ao lado.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
          <h3 className="font-bold text-sm uppercase tracking-wider">Histórico de mensalidades</h3>
          <span className="text-[11px] text-muted-foreground">{data.mensalidades.length} registro(s)</span>
        </div>
        {data.mensalidades.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <HardHat className="w-16 h-16 mx-auto opacity-30 mb-3" strokeWidth={1.2} />
            <p className="font-bold">Nenhuma mensalidade lançada ainda</p>
            <p className="text-xs mt-1">A primeira será lançada ao fim do período de teste.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-muted/30 border-b border-border">
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left p-3">Referência</th>
                <th className="text-left p-3">Vencimento</th>
                <th className="text-left p-3">Pagamento</th>
                <th className="text-right p-3">Valor</th>
                <th className="text-center p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.mensalidades.map(m => (
                <tr key={m.id} className="border-b border-border/50 last:border-b-0">
                  <td className="p-3 font-medium capitalize">{m.referencia_label}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(m.vencimento)}</td>
                  <td className="p-3 text-muted-foreground">
                    {m.paga_em ? `${formatDate(m.paga_em)} (${m.forma_pagamento || '—'})` : '—'}
                  </td>
                  <td className="p-3 text-right font-bold">{formatBRL(m.valor)}</td>
                  <td className="p-3 text-center">{statusBadge(m)}</td>
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
