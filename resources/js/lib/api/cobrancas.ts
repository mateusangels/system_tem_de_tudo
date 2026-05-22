/**
 * Stub do antigo módulo de Cobranças (envio via WhatsApp).
 * Mantido vazio — o sistema TEM DE TUDO ainda não tem cobrança integrada.
 */
export type Cobranca = {
  id: string;
  cliente_id: string;
  fiado_id: string | null;
  mensagem: string;
  data: string;
  canal: string;
};

export const cobrancasApi = {
  async list(_params?: any): Promise<Cobranca[]> { return []; },
  async create(_payload: any): Promise<Cobranca> {
    throw new Error("Cobrança via WhatsApp ainda não disponível");
  },
};
