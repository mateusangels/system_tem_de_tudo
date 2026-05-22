import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { HardHat, Loader2, Eye, EyeOff, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loginSchema, validar } from '@/lib/validators';
import { maskEmail } from '@/lib/masks';

const Login = () => {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const erro = await validar(loginSchema, form);
    if (erro) {
      toast({ title: 'Confira os campos', description: erro, variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await signIn(form.email, form.password);
      toast({ title: 'Bem-vindo de volta!', description: 'Login realizado com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro ao entrar', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col gradient-login relative overflow-hidden text-white">
      {/* Faixa de obra no topo */}
      <div className="h-2 stripe-construction" />

      {/* Decoração: chaves, ferramentas, parafusos discretos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 opacity-[0.04]">
          <Wrench className="w-72 h-72 text-primary" strokeWidth={1} />
        </div>
        <div className="absolute bottom-20 left-10 opacity-[0.04]">
          <HardHat className="w-80 h-80 text-primary" strokeWidth={1} />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="/fundopdv.png"
              alt="Tem de Tudo — Material de Construção"
              className="w-full max-w-md mx-auto drop-shadow-2xl"
            />
          </div>

          {/* Card de login */}
          <div className="bg-card rounded-lg p-8 shadow-elevated border border-border text-foreground">
            <h2 className="text-lg font-bold mb-1">Acessar sistema</h2>
            <p className="text-xs text-muted-foreground mb-6">Use suas credenciais pra entrar.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: maskEmail(e.target.value) })}
                  placeholder="seu@email.com"
                  required
                  className="h-11 input-glow"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Senha</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="h-11 pr-10 input-glow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="btn-construction w-full h-11 text-sm"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ENTRAR'}
              </Button>
            </form>

            <p className="text-[11px] text-muted-foreground text-center mt-6 leading-relaxed">
              Não tem cadastro? Fale com o suporte pra criar sua conta.
            </p>
          </div>

          <p className="text-center text-[10px] text-white/40 mt-6 font-mono">
            v1.0.0 · Sistema desenvolvido por Mateus Angels
          </p>
        </div>
      </div>

      <div className="h-2 stripe-construction" />
    </div>
  );
};

export default Login;
