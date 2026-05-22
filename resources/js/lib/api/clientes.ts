import { api, Paginated } from "@/lib/api";

export type Cliente = {
  id: string;
  codigo_interno: string | null;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  status: string;
  limite_credito: number | string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ClienteInput = Partial<Omit<Cliente, "id" | "created_at" | "updated_at" | "created_by">>;

export const clientesApi = {
  async list(params: { search?: string; status?: string; per_page?: number; page?: number } = {}): Promise<Paginated<Cliente>> {
    const { data } = await api.get<Paginated<Cliente>>("/clientes", { params });
    return data;
  },

  async get(id: string): Promise<Cliente> {
    const { data } = await api.get<Cliente>(`/clientes/${id}`);
    return data;
  },

  async create(input: ClienteInput): Promise<Cliente> {
    const { data } = await api.post<Cliente>("/clientes", input);
    return data;
  },

  async update(id: string, input: ClienteInput): Promise<Cliente> {
    const { data } = await api.put<Cliente>(`/clientes/${id}`, input);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/clientes/${id}`);
  },
};
