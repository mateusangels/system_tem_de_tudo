import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { TrialExpirado } from '@/components/TrialExpirado';
import { useAuth } from '@/contexts/AuthContext';

export const AppLayout = () => {
  const { user } = useAuth();
  const isAdmin = (user as any)?.is_admin;
  const licenca = (user as any)?.licenca;

  // Dono com trial expirado e sem licença ativa → overlay bloqueante
  const trialExpiradoBloqueando =
    !isAdmin &&
    licenca &&
    !licenca.pode_acessar;

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="ml-60">
        <AppHeader />
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {trialExpiradoBloqueando && <TrialExpirado />}
    </div>
  );
};
