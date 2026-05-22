import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { TrialExpirado } from "@/components/TrialExpirado";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Perfil from "./pages/Perfil";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Produtos from "./pages/Produtos";
import PDV from "./pages/PDV";
import Vendas from "./pages/Vendas";
import Estoque from "./pages/Estoque";
import Compras from "./pages/Compras";
import Financeiro from "./pages/Financeiro";
import Mensalidade from "./pages/Mensalidade";
import AdminPagamentos from "./pages/AdminPagamentos";
import AdminConfiguracoes from "./pages/AdminConfiguracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Gate: usuários autenticados. O overlay de trial expirado é tratado no AppLayout
// (TrialExpirado.tsx), então aqui só precisamos garantir que está logado.
const LicencaGate = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Wrap pro PDV (que fica fora do AppLayout): renderiza o PDV + overlay de trial expirado
const PDVComBloqueio = () => {
  const { user } = useAuth();
  const isAdmin = (user as any)?.is_admin;
  const licenca = (user as any)?.licenca;
  const bloqueado = !isAdmin && licenca && !licenca.pode_acessar;
  return (
    <>
      <PDV />
      {bloqueado && <TrialExpirado />}
    </>
  );
};

const AdminOnly = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!(user as any).is_admin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={user && !loading ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* PDV — fora do AppLayout pra ocupar tela inteira; mantém checagem de licença */}
      <Route path="/pdv" element={<LicencaGate><PDVComBloqueio /></LicencaGate>} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        {/* Acessíveis mesmo com licença expirada */}
        <Route path="/mensalidade" element={<Mensalidade />} />
        <Route path="/perfil" element={<Perfil />} />

        {/* Páginas operacionais — bloqueadas se licença expirada */}
        <Route path="/dashboard" element={<LicencaGate><Dashboard /></LicencaGate>} />
        <Route path="/clientes" element={<LicencaGate><Clientes /></LicencaGate>} />
        <Route path="/clientes/:id" element={<LicencaGate><Clientes /></LicencaGate>} />
        <Route path="/produtos" element={<LicencaGate><Produtos /></LicencaGate>} />
        <Route path="/vendas" element={<LicencaGate><Vendas /></LicencaGate>} />
        <Route path="/estoque" element={<LicencaGate><Estoque /></LicencaGate>} />
        <Route path="/compras" element={<LicencaGate><Compras /></LicencaGate>} />
        <Route path="/financeiro" element={<LicencaGate><Financeiro /></LicencaGate>} />
        <Route path="/relatorios" element={<LicencaGate><Relatorios /></LicencaGate>} />
        <Route path="/configuracoes" element={<Configuracoes />} />

        {/* Painel Admin */}
        <Route path="/admin/pagamentos" element={<AdminOnly><AdminPagamentos /></AdminOnly>} />
        <Route path="/admin/configuracoes" element={<AdminOnly><AdminConfiguracoes /></AdminOnly>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
