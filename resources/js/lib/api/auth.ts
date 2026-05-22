import { api, setToken, clearToken } from "@/lib/api";

export type Licenca = {
  em_trial: boolean;
  trial_expirado: boolean;
  dias_restantes: number;
  trial_fim: string | null;
  licenca_ativa: boolean;
  licenca_ate: string | null;
  pode_acessar: boolean;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  profile: {
    id: string;
    nome: string;
    telefone: string | null;
    cargo: string | null;
    pin: string | null;
    avatar_url: string | null;
  } | null;
  roles: string[];
  is_admin: boolean;
  licenca: Licenca;
};

export const authApi = {
  async login(email: string, password: string): Promise<AuthUser> {
    const { data } = await api.post<{ token: string; user: AuthUser }>("/auth/login", {
      email,
      password,
    });
    setToken(data.token);
    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      clearToken();
    }
  },

  async me(): Promise<AuthUser> {
    const { data } = await api.get<{ user: AuthUser }>("/auth/me");
    return data.user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  async updateProfile(data: { nome?: string; email?: string; telefone?: string; pin?: string }): Promise<AuthUser> {
    const { data: resp } = await api.post<{ user: AuthUser }>("/auth/profile", data);
    return resp.user;
  },

  async listUsers(): Promise<Array<{ id: string; name: string; email: string; nome: string; telefone: string | null; cargo: string; role: string }>> {
    const { data } = await api.get<{ users: any[] }>("/auth/users");
    return data.users;
  },

  async createUser(input: { nome: string; email: string; senha: string; cargo?: string; role?: 'admin' | 'funcionario' }): Promise<AuthUser> {
    const { data } = await api.post<{ user: AuthUser }>("/auth/users", input);
    return data.user;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/auth/users/${id}`);
  },
};
