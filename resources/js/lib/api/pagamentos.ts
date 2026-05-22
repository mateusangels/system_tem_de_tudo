/**
 * Stub do antigo módulo de Pagamentos (era pagamentos de fiado).
 * Mantido vazio até reativar o módulo de crediário no TEM DE TUDO.
 */
import { Paginated } from "@/lib/api";

export type Pagamento = {
  id: string;
  fiado_id: string;
  cliente_id: string;
  valor: number;
  forma_pagamento: string;
  data: string;
  estornado: boolean;
};

const empty: Paginated<Pagamento> = {
  data: [],
  total: 0,
  per_page: 0,
  current_page: 1,
  last_page: 1,
};

export const pagamentosApi = {
  async list(_params?: any): Promise<Paginated<Pagamento>> { return empty; },
  async estornar(_id: string): Promise<void> {},
};
