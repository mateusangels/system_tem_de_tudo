import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi, AuthUser, Licenca } from "@/lib/api/auth";
import { getToken, clearToken } from "@/lib/api";

export interface AuthUserShape {
  id: string;
  email: string;
  is_admin?: boolean;
  name?: string;
  licenca?: Licenca;
}

export interface SessionShape {
  access_token: string;
  user: AuthUserShape;
}

export interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  pin: string;
  avatar_url: string;
}

interface AuthContextType {
  user: AuthUserShape | null;
  session: SessionShape | null;
  profile: Profile | null;
  role: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toAuthShape = (u: AuthUser): { user: AuthUserShape; profile: Profile | null; role: string | null } => ({
  user: {
    id: u.id,
    email: u.email,
    name: u.name,
    is_admin: u.is_admin,
    licenca: u.licenca,
  },
  profile: u.profile
    ? {
        id: u.profile.id,
        user_id: u.id,
        nome: u.profile.nome ?? "",
        email: u.email,
        telefone: u.profile.telefone ?? "",
        cargo: u.profile.cargo ?? "",
        pin: u.profile.pin ?? "",
        avatar_url: u.profile.avatar_url ?? "",
      }
    : null,
  role: u.is_admin ? "admin" : (u.roles[0] ?? null),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUserShape | null>(null);
  const [session, setSession] = useState<SessionShape | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuthUser = (raw: AuthUser, token: string) => {
    const { user: u, profile: p, role: r } = toAuthShape(raw);
    setUser(u);
    setProfile(p);
    setRole(r);
    setSession({ access_token: token, user: u });
  };

  const refreshProfile = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const me = await authApi.me();
      applyAuthUser(me, token);
    } catch {
      // silencioso — interceptor já redireciona em 401
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((me) => applyAuthUser(me, token))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    const me = await authApi.login(email, password);
    const token = getToken() ?? "";
    applyAuthUser(me, token);
  };

  const signUp = async (_email: string, _password: string, _nome: string) => {
    throw new Error(
      "Cadastro público desabilitado. Peça para um admin criar a conta na tela de Configurações."
    );
  };

  const signOut = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
