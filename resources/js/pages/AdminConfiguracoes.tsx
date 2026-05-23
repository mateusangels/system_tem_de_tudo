import { useEffect, useState } from 'react';
import { configuracoesApi } from '@/lib/api/index';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, QrCode, Upload, Image as ImageIcon } from 'lucide-react';
import { configPixSchema, validar } from '@/lib/validators';

export default function AdminConfiguracoes() {
  const { toast } = useToast();
  const [config, setConfig] = useState<Record<string, string>>({
    pix_chave: '',
    pix_titular: '',
    pix_cidade: '',
    pix_copia_cola: '',
    pix_qr_base64: '',
    valor_mensalidade: '180',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const c = await configuracoesApi.get('pix_dev');
      setConfig(prev => ({ ...prev, ...(c as Record<string, string>) }));
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleSubir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1024 * 1024) {
      toast({ title: 'Imagem muito grande', description: 'Use uma imagem com menos de 1MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setConfig(prev => ({ ...prev, pix_qr_base64: String(reader.result) }));
    reader.readAsDataURL(f);
  };

  const salvar = async () => {
    const erro = await validar(configPixSchema, {
      ...config,
      valor_mensalidade: parseFloat(String(config.valor_mensalidade || '0')),
    });
    if (erro) {
      toast({ title: 'Confira os campos', description: erro, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await configuracoesApi.salvar('pix_dev', config);
      toast({ title: 'Salvo!', description: 'Dados do PIX atualizados.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6 animate-fade-up max-w-4xl">
      <PageHeader title="Configurações do PIX" description="Dados de cobrança usados para a mensalidade do sistema" />

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/40">
          <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" /> Dados do PIX (mostrados para clientes na tela "Mensalidade")
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Chave PIX</Label>
              <Input value={config.pix_chave || ''} onChange={e => setConfig({ ...config, pix_chave: e.target.value })} placeholder="CPF, e-mail, celular ou chave aleatória" className="font-mono" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Valor da mensalidade (R$)</Label>
              <Input value={config.valor_mensalidade || ''} onChange={e => setConfig({ ...config, valor_mensalidade: e.target.value })} type="number" step="0.01" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Nome do titular</Label>
              <Input value={config.pix_titular || ''} onChange={e => setConfig({ ...config, pix_titular: e.target.value })} placeholder="Ex: Mateus Angels" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Cidade</Label>
              <Input value={config.pix_cidade || ''} onChange={e => setConfig({ ...config, pix_cidade: e.target.value })} placeholder="Ex: Goiânia/GO" />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">PIX "copia e cola" (BRCode)</Label>
            <Input value={config.pix_copia_cola || ''} onChange={e => setConfig({ ...config, pix_copia_cola: e.target.value })} placeholder="00020126360014BR.GOV.BCB.PIX..." className="font-mono text-xs" />
            <p className="text-[11px] text-muted-foreground mt-1">Gera no app do seu banco com valor R$ {config.valor_mensalidade || '180'},00 e cola aqui.</p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">QR Code (imagem)</Label>
            <div className="grid grid-cols-[1fr_auto] gap-4 items-start mt-1">
              <div className="space-y-2">
                <label className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border-2 border-dashed border-border cursor-pointer hover:bg-muted transition-colors text-sm">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{config.pix_qr_base64 ? 'Trocar imagem do QR Code' : 'Subir imagem do QR Code (PNG, JPG)'}</span>
                  <input type="file" accept="image/*" onChange={handleSubir} className="hidden" />
                </label>
                {config.pix_qr_base64 && (
                  <button onClick={() => setConfig({ ...config, pix_qr_base64: '' })} className="text-xs text-destructive hover:underline">Remover imagem</button>
                )}
                <p className="text-[11px] text-muted-foreground">A imagem é salva em base64 no banco. Use até 1MB.</p>
              </div>
              <div className="w-32 h-32 bg-muted/50 border border-border rounded flex items-center justify-center overflow-hidden">
                {config.pix_qr_base64 ? (
                  <img src={config.pix_qr_base64} alt="Preview QR Code" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-muted-foreground/30" strokeWidth={1.2} />
                )}
              </div>
            </div>
          </div>

          <Button onClick={salvar} disabled={saving} className="btn-construction gap-2">
            <Save className="w-4 h-4" /> {saving ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES'}
          </Button>
        </div>
      </div>
    </div>
  );
}
