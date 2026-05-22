import { api, Paginated } from "@/lib/api";

export type Produto = {
  id: string;
  codigo_barras: string;
  codigo_interno: string | null;
  referencia_fabricante: string | null;
  descricao: string;
  preco_custo: number | string;
  preco_venda: number | string;
  preco_atacado: number | string;
  qtd_minima_atacado: number;
  unidade: string;
  ativo: boolean;
  categoria: string | null;
  marca: string | null;
  localizacao: string | null;
  estoque_minimo: number;
  estoque_atual: number | string;
  movimenta_estoque: boolean;
  observacao: string | null;
  created_at: string;
  updated_at: string;
};

export type ProdutoInput = Partial<Omit<Produto, "id" | "created_at" | "updated_at">>;

export const produtosApi = {
  async list(params: {
    search?: string;
    ativo?: boolean;
    categoria?: string;
    per_page?: number;
    page?: number;
  } = {}): Promise<Paginated<Produto>> {
    const { data } = await api.get<Paginated<Produto>>("/produtos", { params });
    return data;
  },

  async get(id: string): Promise<Produto> {
    const { data } = await api.get<Produto>(`/produtos/${id}`);
    return data;
  },

  async buscarPorCodigo(codigo: string, opts: { incluirInativos?: boolean } = {}): Promise<Produto | null> {
    try {
      const { data } = await api.get<Produto>(`/produtos/buscar/${encodeURIComponent(codigo)}`, {
        params: opts.incluirInativos ? { incluirInativos: 1 } : undefined,
      });
      return data;
    } catch (e: any) {
      if (e?.response?.status === 404) return null;
      throw e;
    }
  },

  async importBulk(produtos: ProdutoInput[]): Promise<{ inseridos: number; atualizados: number; erros: any[] }> {
    const { data } = await api.post<{ inseridos: number; atualizados: number; erros: any[] }>("/produtos/import", { produtos });
    return data;
  },

  async create(input: ProdutoInput): Promise<Produto> {
    const { data } = await api.post<Produto>("/produtos", input);
    return data;
  },

  async update(id: string, input: ProdutoInput): Promise<Produto> {
    const { data } = await api.put<Produto>(`/produtos/${id}`, input);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/produtos/${id}`);
  },
};
