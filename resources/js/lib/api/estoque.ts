import { api, Paginated } from "@/lib/api";

export type MovimentacaoEstoque = {
  id: string;
  produto_id: string;
  tipo: "entrada" | "saida" | "ajuste";
  motivo: string;
  quantidade: number;
  estoque_antes: number;
  estoque_depois: number;
  custo_unitario: number | null;
  referencia_id: string | null;
  referencia_tipo: string | null;
  user_id: string | null;
  observacao: string | null;
  created_at: string;
  produto?: {
    id: string;
    descricao: string;
    codigo_barras: string;
    unidade: string;
  };
};

export type ResumoEstoque = {
  total_produtos: number;
  abaixo_minimo: number;
  valor_em_estoque_custo: number;
  valor_em_estoque_venda: number;
  margem_potencial: number;
};

export const estoqueApi = {
  async movimentacoes(params: { produto_id?: string; tipo?: string; de?: string; ate?: string; per_page?: number; page?: number } = {}): Promise<Paginated<MovimentacaoEstoque>> {
    const { data } = await api.get<Paginated<MovimentacaoEstoque>>("/estoque/movimentacoes", { params });
    return data;
  },

  async ajustar(payload: { produto_id: string; tipo: "entrada" | "saida" | "ajuste"; motivo: string; quantidade: number; observacao?: string }): Promise<{ movimentacao: MovimentacaoEstoque }> {
    const { data } = await api.post<{ movimentacao: MovimentacaoEstoque }>("/estoque/ajustar", payload);
    return data;
  },

  async resumo(): Promise<ResumoEstoque> {
    const { data } = await api.get<ResumoEstoque>("/estoque/resumo");
    return data;
  },

  async ruptura(): Promise<{ produtos: any[] }> {
    const { data } = await api.get<{ produtos: any[] }>("/estoque/ruptura");
    return data;
  },
};
