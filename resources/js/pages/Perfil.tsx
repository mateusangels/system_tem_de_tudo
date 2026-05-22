import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api/index';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const Perfil = () => {
  const { profile, role, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    nome: profile?.nome || '',
    email: profile?.email || '',
    telefone: profile?.telefone || '',
    pin: '',
    pinConfirm: '',
  });
  const [saving, setSaving] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const initials = form.nome ? form.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U';

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = { nome: form.nome, email: form.email, telefone: form.telefone };
      if (form.pin) {
        if (form.pin !== form.pinConfirm) {
          toast({ title: 'PINs não conferem', variant: 'destructive' });
          setSaving(false);
          return;
        }
        updates.pin = form.pin;
      }
      await authApi.updateProfile(updates);
      toast({ title: 'Perfil atualizado!' });
      await refreshProfile();
    } catch (e: any) {
      toast({ title: e?.response?.data?.message || 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Meu Perfil" description="Gerencie suas informações pessoais" />

      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 animate-fade-up">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{profile?.nome}</h2>
            <p className="text-sm text-muted-foreground capitalize">{role || 'Usuário'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div><Label className="text-xs uppercase text-muted-foreground">Nome Completo</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label className="text-xs uppercase text-muted-foreground">E-mail</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label className="text-xs uppercase text-muted-foreground">Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} /></div>

          <div className="border-t border-border pt-4 mt-4">
            <button onClick={() => setShowPin(!showPin)} className="text-sm text-primary font-medium hover:underline">
              {showPin ? 'Ocultar PIN' : 'Alterar PIN de Segurança'}
            </button>
            {showPin && (
              <div className="grid grid-cols-2 gap-3 mt-3 animate-slide-up">
                <div><Label className="text-xs uppercase text-muted-foreground">Novo PIN</Label><Input type="password" maxLength={6} value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} placeholder="••••••" /></div>
                <div><Label className="text-xs uppercase text-muted-foreground">Confirmar PIN</Label><Input type="password" maxLength={6} value={form.pinConfirm} onChange={e => setForm({ ...form, pinConfirm: e.target.value })} placeholder="••••••" /></div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gradient-accent text-primary-foreground">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar Alterações
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
