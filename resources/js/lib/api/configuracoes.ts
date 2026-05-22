import { api } from "@/lib/api";

export type GrupoConfig = "loja" | "pix_dev" | "sistema";

export const configuracoesApi = {
  async get(grupo: GrupoConfig): Promise<Record<string, string | null>> {
    const { data } = await api.get<{ grupo: string; config: Record<string, string | null> }>(`/configuracoes/${grupo}`);
    return data.config || {};
  },

  async salvar(grupo: GrupoConfig, config: Record<string, string | null>): Promise<Record<string, string | null>> {
    const { data } = await api.post<{ grupo: string; config: Record<string, string | null> }>(`/configuracoes/${grupo}`, { config });
    return data.config || {};
  },
};
