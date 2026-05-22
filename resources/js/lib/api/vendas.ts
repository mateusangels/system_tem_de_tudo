import { api, Paginated } from "@/lib/api";

export type VendaItem = {
  id?: string;
  venda_id?: string;
  produto_id: string | null;
  codigo_barras: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  desconto: number;
  valor_total: number;
};

export type Venda = {
  id: string;
  numero_venda: number;
  cliente_id: string | null;
  operador_id: string | null;
  subtotal: number | string;
  desconto_total: number | string;
  total: number | string;
  valor_pago: number | string;
  troco: number | string;
  metodo_pagamento: string;
  status: string;
  tipo: string;
  created_at: string;
  vencimento_fiado?: string | null;
  quitado_em?: string | null;
  forma_quitacao?: string | null;
  valor_pago_fiado?: number | string;
  cliente?: { id: string; nome: string; telefone?: string | null; cpf?: string | null };
  operador?: { id: string; name: string };
  itens?: VendaItem[];
};

export type VendaInput = {
  cliente_id?: string | null;
  subtotal: number;
  desconto_total?: number;
  total: number;
  valor_pago: number;
  troco?: number;
  metodo_pagamento: string;
  tipo?: string;
  vencimento_fiado?: string;
  valor_pago_fiado?: number;    // adiantamento na hora (só pra fiado)
  itens: VendaItem[];
};

export const vendasApi = {
  async list(params: {
    from?: string;
    to?: string;
    cliente_id?: string;
    operador_id?: string;
    metodo_pagamento?: string;
    status?: string;
    per_page?: number;
    page?: number;
  } = {}): Promise<Paginated<Venda>> {
    const { data } = await api.get<Paginated<Venda>>("/vendas", { params });
    return data;
  },

  async get(id: string): Promise<Venda> {
    const { data } = await api.get<Venda>(`/vendas/${id}`);
    return data;
  },

  async create(input: VendaInput): Promise<Venda> {
    const { data } = await api.post<Venda>("/vendas", input);
    return data;
  },

  async cancelar(id: string): Promise<void> {
    await api.delete(`/vendas/${id}`);
  },

  async quitarFiado(
    id: string,
    payload: { valor?: number; forma_quitacao?: string; quitado_em?: string } = {}
  ): Promise<{ ok: boolean; quitada: boolean; valor_pago_fiado: number; saldo_restante: number; venda: Venda }> {
    const { data } = await api.post(`/vendas/${id}/quitar-fiado`, payload);
    return data;
  },

  async removerDuplicatas(): Promise<{ removidas: number }> {
    const { data } = await api.post<{ removidas: number }>("/vendas/remover-duplicatas");
    return data;
  },

  async proximoNumero(): Promise<number> {
    const { data } = await api.get<{ numero: number }>("/vendas/proximo-numero");
    return data.numero;
  },
};
