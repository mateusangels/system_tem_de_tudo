import { api } from "@/lib/api";

export type ResumoDashboard = {
  clientes_total: number;
  clientes_ativos: number;
  produtos_total: number;
  produtos_estoque_baixo: number;
  vendas_hoje_quantidade: number;
  vendas_hoje_total: number;
  vendas_mes_total: number;
};

export type VendaPorDia = {
  dia: string;
  total_vendas: number;
  valor_total: number;
};

export type DashboardCompleto = {
  totais: {
    vendas_total: number;     // Bruto vendido (independente de quanto foi pago)
    recebido_total: number;   // Caixa real (valor_pago + adiantamento de fiado)
    qtd_vendas: number;
    ticket_medio: number;
    produtos_baixo: number;
    valor_estoque: number;
  };
  vendas_por_funcionario: Array<{ nome: string; total: number; qtd: number }>;
  vendas_por_metodo: Array<{ metodo: string; total: number }>;
  mais_vendidos: Array<{ nome: string; qtd: number; total: number }>;
  evolucao_mensal: Array<{ month: string; vendas: number; qtd: number }>;
  periodo: { start: string; end: string };
};

export const dashboardApi = {
  async resumo(): Promise<ResumoDashboard> {
    const { data } = await api.get<ResumoDashboard>("/dashboard/resumo");
    return data;
  },

  async vendasPorDia(dias = 30): Promise<VendaPorDia[]> {
    const { data } = await api.get<VendaPorDia[]>("/dashboard/vendas-por-dia", { params: { dias } });
    return data;
  },

  async completo(start?: string, end?: string): Promise<DashboardCompleto> {
    const { data } = await api.get<DashboardCompleto>("/dashboard/completo", { params: { start, end } });
    return data;
  },
};
