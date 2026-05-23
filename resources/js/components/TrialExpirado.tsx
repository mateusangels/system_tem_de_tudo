import { useEffect, useState } from 'react';
import { mensalidadesApi, type DadosPagamentoPix } from '@/lib/api/index';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, Copy, Check, MessageCircle, LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/**
 * Overlay bloqueante mostrado quando o trial expirou e o cliente ainda não pagou.
 * Não permite fechar — só pagar, abrir WhatsApp ou sair.
 */
export const TrialExpirado = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [pix, setPix] = useState<DadosPagamentoPix | null>(null);
  const [valor, setValor] = useState(180);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    mensalidadesApi.minha()
      .then(r => {
        setPix(r.pix);
        setValor(r.pix.valor_mensal || 180);
      })
      .catch(() => { /* silencia: usa default */ });
  }, []);

  const whatsapp = (pix as any)?.whatsapp_suporte || '5561998221210';
  const devNome = (pix as any)?.dev_nome || 'Mateus dos Anjos';
  const whatsappFormatado = whatsapp.replace(/^55/, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');

  const copiarPix = async () => {
    if (!pix?.copia_cola && !pix?.chave) {
      toast({ title: 'Sem chave PIX configurada', variant: 'destructive' });
      return;
    }
    await navigator.clipboard.writeText(pix.copia_cola || pix.chave || '');
    setCopied(true);
    toast({ title: 'Copiado!', description: 'Cole no app do banco para pagar.' });
    setTimeout(() => setCopied(false), 2500);
  };

  const abrirWhats = () => {
    const msg = encodeURIComponent(
      `Olá ${devNome}! Sou cliente do sistema TEM DE TUDO e meu período de teste acabou. Quero renovar a mensalidade.`
    );
    window.open(`https://wa.me/${whatsapp}?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden border-4 border-destructive my-8">
        {/* Faixa de obra no topo */}
        <div className="h-2 stripe-construction" />

        {/* Cabeçalho vermelho */}
        <div className="bg-destructive text-white px-6 py-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight leading-tight">
              SEU PRAZO DE TESTE ACABOU
            </h2>
            <p className="text-sm text-white/90 mt-1 font-medium">
              Pra continuar usando o TEM DE TUDO, contrate a mensalidade.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Mensagem principal */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Você usou os <strong className="text-foreground">7 dias gratuitos</strong> de avaliação do sistema.
              Pra liberar o acesso novamente, faça o pagamento da mensalidade e
              <strong className="text-foreground"> envie o comprovante</strong> pelo WhatsApp do desenvolvedor.
            </p>
          </div>

          {/* Card valor + PIX */}
          <div className="bg-muted/40 border-2 border-border rounded-lg p-5 grid grid-cols-2 gap-5">
            <div className="space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                  Mensalidade
                </p>
                <p className="text-4xl font-black text-primary leading-none mt-1">
                  {formatBRL(valor)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">por mês · pagamento via PIX</p>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                  Chave PIX
                </p>
                <p className="font-mono text-sm font-bold">{pix?.chave || '61998221210'}</p>
                <p className="text-[11px] text-muted-foreground">{pix?.nome_titular || devNome}</p>
              </div>

              <Button onClick={copiarPix} className="btn-construction w-full gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'COPIADO!' : 'COPIAR PIX'}
              </Button>
            </div>

            <div className="flex flex-col items-center justify-center bg-white rounded p-3 border-2 border-dashed border-border">
              {pix?.qr_code_base64 ? (
                <>
                  <img
                    src={pix.qr_code_base64.startsWith('data:') ? pix.qr_code_base64 : `data:image/png;base64,${pix.qr_code_base64}`}
                    alt="QR Code PIX"
                    className="w-full max-w-[180px] aspect-square object-contain"
                  />
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-2">
                    Escaneie no app
                  </p>
                </>
              ) : (
                <div className="text-center text-muted-foreground text-xs py-12">
                  QR Code não configurado.<br />Use a chave PIX.
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp do dev */}
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-green-900">
                  Depois de pagar, envie o comprovante pelo WhatsApp:
                </p>
                <p className="text-base font-black text-green-900">
                  {devNome} — <span className="font-mono">{whatsappFormatado}</span>
                </p>
              </div>
            </div>
            <Button
              onClick={abrirWhats}
              className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 font-bold"
            >
              <MessageCircle className="w-4 h-4" />
              ABRIR CONVERSA NO WHATSAPP
            </Button>
          </div>

          {/* Logout */}
          <div className="text-center pt-2">
            <button
              onClick={signOut}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair do sistema
            </button>
          </div>
        </div>

        <div className="bg-zinc-100 border-t border-border px-5 py-3 flex items-center justify-center">
          <img src="/fundopdv.png" alt="Tem de Tudo" className="h-10 w-auto object-contain" />
        </div>
      </div>
    </div>
  );
};
