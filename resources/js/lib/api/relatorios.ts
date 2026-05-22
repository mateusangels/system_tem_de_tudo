import { api } from "@/lib/api";

export type RelatoriosCompleto = {
  totais: {
    vendas_total: number;
    vendas_count: number;
    ticket_medio: number;
  };
  vendas_por_funcionario: Array<{ nome: string; total: number; qtd: number }>;
  vendas_por_metodo: Array<{ metodo: string; total: number }>;
  vendas_por_dia: Array<{ dia: string; vendas: number; qtd: number }>;
  top_produtos: Array<{ descricao: string; qtd: number; total: number }>;
  evolucao_mensal: Array<{ month: string; vendas: number; qtd: number }>;
  clientes: { total: number; ativos: number };
  produtos: { total: number; estoque_baixo: number };
  periodo: { start: string; end: string };
};

export const relatoriosApi = {
  async completo(start?: string, end?: string): Promise<RelatoriosCompleto> {
    const { data } = await api.get<RelatoriosCompleto>("/relatorios/completo", { params: { start, end } });
    return data;
  },
};
