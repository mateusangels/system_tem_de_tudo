import { api, Paginated } from "@/lib/api";

export type Fornecedor = {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  contato: string | null;
  endereco: string | null;
  observacao: string | null;
  ativo: boolean;
};

export type CompraItem = {
  id: string;
  compra_id: string;
  produto_id: string;
  quantidade: number;
  custo_unitario: number;
  total: number;
  produto?: {
    id: string;
    descricao: string;
    codigo_barras: string;
    unidade: string;
  };
};

export type Compra = {
  id: string;
  numero: string;
  fornecedor_id: string | null;
  status: "rascunho" | "pedido_enviado" | "recebida" | "cancelada";
  data_pedido: string;
  data_recebimento: string | null;
  subtotal: number;
  frete: number;
  outros: number;
  desconto: number;
  total: number;
  observacao: string | null;
  fornecedor?: Fornecedor;
  itens?: CompraItem[];
};

export const comprasApi = {
  async list(params: { status?: string; per_page?: number; page?: number } = {}): Promise<Paginated<Compra>> {
    const { data } = await api.get<Paginated<Compra>>("/compras", { params });
    return data;
  },

  async get(id: string): Promise<Compra> {
    const { data } = await api.get<{ compra: Compra }>(`/compras/${id}`);
    return data.compra;
  },

  async create(payload: any): Promise<{ compra: Compra }> {
    const { data } = await api.post<{ compra: Compra }>("/compras", payload);
    return data;
  },

  async receber(id: string, payload: { atualizar_custo?: boolean; data_recebimento?: string } = {}): Promise<void> {
    await api.post(`/compras/${id}/receber`, payload);
  },

  async fornecedores(): Promise<Fornecedor[]> {
    const { data } = await api.get<{ fornecedores: Fornecedor[] }>("/compras/fornecedores");
    return data.fornecedores;
  },

  async storeFornecedor(payload: Partial<Fornecedor>): Promise<Fornecedor> {
    const { data } = await api.post<{ fornecedor: Fornecedor }>("/compras/fornecedores", payload);
    return data.fornecedor;
  },
};
