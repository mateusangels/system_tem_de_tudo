import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Box, Boxes, Receipt, Truck, Users,
  Wallet, FileText, Settings, LogOut, Shield, CreditCard,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type NavItem = { icon: any; label: string; path: string };

const navDono: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ShoppingCart, label: 'PDV',          path: '/pdv' },
  { icon: Receipt,       label: 'Vendas',      path: '/vendas' },
  { icon: Box,           label: 'Produtos',    path: '/produtos' },
  { icon: Boxes,         label: 'Estoque',     path: '/estoque' },
  { icon: Truck,         label: 'Compras',     path: '/compras' },
  { icon: Users,         label: 'Clientes',    path: '/clientes' },
  { icon: Wallet,        label: 'Financeiro',  path: '/financeiro' },
  { icon: FileText,      label: 'Relatórios',  path: '/relatorios' },
  { icon: CreditCard,    label: 'Mensalidade', path: '/mensalidade' },
];

const navAdmin: NavItem[] = [
  { icon: Shield,        label: 'Pagamentos',  path: '/admin/pagamentos' },
  { icon: Settings,      label: 'Config. PIX', path: '/admin/configuracoes' },
];

export const AppSidebar = () => {
  const location = useLocation();
  const { signOut, profile, user } = useAuth();

  const isAdmin = (user as any)?.is_admin === true;
  const items: NavItem[] = isAdmin ? navAdmin : navDono;

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white text-zinc-900 flex flex-col z-50 border-r border-zinc-200 shadow-sm">
      {/* Faixa de obra no topo */}
      <div className="h-1.5 stripe-construction" />

      <div className="px-3 py-3 border-b border-zinc-200">
        <Link to="/dashboard" className="block">
          <img
            src="/fundopdv.png"
            alt="Tem de Tudo"
            className="w-full max-h-20 object-contain"
          />
          {isAdmin && (
            <p className="text-[9px] text-center uppercase tracking-[0.2em] font-extrabold mt-1" style={{ color: 'hsl(45 95% 38%)' }}>
              Painel Admin
            </p>
          )}
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground font-extrabold shadow-yellow'
                  : 'text-zinc-700 font-medium hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-zinc-200">
        <div className="flex items-center gap-2 p-2 rounded-md bg-zinc-50">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0" style={{ color: '#0f0f0f' }}>
            {(profile?.nome || user?.name || 'U').slice(0, 2).toUpperCase()}
          </div>
          <Link to="/perfil" className="flex-1 min-w-0 hover:text-zinc-700 transition-colors">
            <p className="text-xs font-semibold text-zinc-900 truncate">{profile?.nome || user?.name || 'Usuário'}</p>
            <p className="text-[10px] text-zinc-500 truncate">
              {isAdmin ? 'Administrador' : 'Dono da loja'}
            </p>
          </Link>
          <button onClick={signOut} className="text-zinc-400 hover:text-destructive transition-colors p-1.5" title="Sair">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
