import { api } from "@/lib/api";

export type Mensalidade = {
  id: string;
  valor: number;
  referencia: string;
  referencia_label: string;
  vencimento: string;
  paga_em: string | null;
  status: "pendente" | "pago" | "atrasado" | "cancelada";
  forma_pagamento: string | null;
  observacao: string | null;
  atrasada: boolean;
  cliente?: {
    id: string;
    nome: string;
    email: string;
    licenca_ativa: boolean;
    licenca_ate: string | null;
  };
};

export type DadosPagamentoPix = {
  chave: string | null;
  nome_titular: string | null;
  cidade: string | null;
  qr_code_base64: string | null;
  copia_cola: string | null;
  valor_mensal: number;
};

export type MinhaMensalidadeResponse = {
  usuario: {
    nome: string;
    em_trial: boolean;
    dias_restantes: number;
    trial_fim: string | null;
    licenca_ativa: boolean;
    licenca_ate: string | null;
  };
  pix: DadosPagamentoPix;
  mensalidades: Mensalidade[];
};

export const mensalidadesApi = {
  async minha(): Promise<MinhaMensalidadeResponse> {
    const { data } = await api.get<MinhaMensalidadeResponse>("/mensalidades/minha");
    return data;
  },

  async listar(status?: string): Promise<{ mensalidades: Mensalidade[] }> {
    const { data } = await api.get<{ mensalidades: Mensalidade[] }>("/mensalidades", {
      params: status ? { status } : undefined,
    });
    return data;
  },

  async marcarPaga(id: string, payload: { forma_pagamento?: string; observacao?: string; paga_em?: string }): Promise<void> {
    await api.post(`/mensalidades/${id}/marcar-paga`, payload);
  },

  async gerar(payload: { user_id: string; valor?: number; vencimento?: string; referencia?: string }): Promise<{ mensalidade: Mensalidade }> {
    const { data } = await api.post<{ mensalidade: Mensalidade }>("/mensalidades/gerar", payload);
    return data;
  },
};
