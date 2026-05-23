import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Clock, AlertTriangle, CheckCircle2, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificacoesModal, useNotifCount } from './NotificacoesModal';

type Props = { onToggleSidebar: () => void };

export const AppHeader = ({ onToggleSidebar }: Props) => {
  const { profile, role, user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifCount = useNotifCount();

  const initials = profile?.nome
    ? profile.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const licenca = (user as any)?.licenca;
  const isAdmin = (user as any)?.is_admin;

  // Banner de trial só pra dono (não admin)
  const banner: { tipo: 'trial' | 'expirado' | 'licenca'; texto: string; cor: string; icone: any } | null =
    !isAdmin && licenca
      ? licenca.trial_expirado && !licenca.licenca_ativa
        ? { tipo: 'expirado', texto: 'Teste expirado. Acesse Mensalidade pra pagar e liberar o sistema.', cor: 'bg-destructive text-white', icone: AlertTriangle }
        : licenca.em_trial
          ? {
              tipo: 'trial',
              texto: `Período de teste — ${licenca.dias_restantes} ${licenca.dias_restantes === 1 ? 'dia restante' : 'dias restantes'}`,
              cor: 'bg-primary text-primary-foreground',
              icone: Clock,
            }
          : licenca.licenca_ativa
            ? null
            : { tipo: 'expirado', texto: 'Licença expirada. Pague a mensalidade pra continuar.', cor: 'bg-destructive text-white', icone: AlertTriangle }
      : null;

  return (
    <>
      {banner && (
        <Link to="/mensalidade" className={`block w-full ${banner.cor} px-3 sm:px-6 py-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity text-center`}>
          <banner.icone className="w-4 h-4 shrink-0" />
          <span className="truncate">{banner.texto}</span>
          <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs underline decoration-dashed shrink-0 hidden sm:inline">ver mensalidade →</span>
        </Link>
      )}

      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-3 sm:px-6 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Botão hambúrguer — visível só no mobile */}
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 -ml-1 rounded-md text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold truncate">
            {isAdmin ? 'Painel Admin' : 'Tem de Tudo'}
          </div>
          {!isAdmin && licenca?.licenca_ativa && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-success/15 text-success px-2 py-1 rounded">
              <CheckCircle2 className="w-3 h-3" /> Licença ativa
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            id="btn-notificacoes"
            onClick={() => setNotifOpen(true)}
            className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Abrir notificações"
          >
            <Bell className="w-[18px] h-[18px]" />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-none truncate max-w-[120px]">{profile?.nome || 'Usuário'}</p>
              <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{role || 'usuário'}</p>
            </div>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <NotificacoesModal open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
};
