/**
 * Stub vazio do antigo módulo de Fiados.
 *
 * No sistema TEM DE TUDO o crediário ainda não foi reativado.
 * Esses tipos e métodos existem só pra manter compatibilidade com a tela
 * de PDV até ela ser totalmente refatorada — todas as operações são no-op.
 */

import { Paginated } from "@/lib/api";

export type FiadoItem = {
  id: string;
  fiado_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
};

export type Fiado = {
  id: string;
  cliente_id: string;
  descricao: string;
  valor_total: number;
  valor_pago: number;
  status: string;
  itens?: FiadoItem[];
};

export type FiadoInput = {
  cliente_id: string;
  descricao?: string;
  valor_total: number;
  itens?: any[];
};

const empty: Paginated<Fiado> = {
  data: [],
  total: 0,
  per_page: 0,
  current_page: 1,
  last_page: 1,
};

export const fiadosApi = {
  async list(_params?: any): Promise<Paginated<Fiado>> { return empty; },
  async get(_id: string): Promise<Fiado | null> { return null; },
  async create(_input: FiadoInput): Promise<Fiado> { throw new Error("Crediário ainda não disponível"); },
  async registrarPagamento(_id: string, _payload: any): Promise<void> {},
  async adicionarItem(_id: string, _payload: any): Promise<void> {},
  async removerItem(_id: string, _itemId: string): Promise<void> {},
};
