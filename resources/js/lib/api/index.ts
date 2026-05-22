export { api, getToken, setToken, clearToken } from "@/lib/api";
export type { Paginated } from "@/lib/api";

export { authApi } from "./auth";
export type { AuthUser } from "./auth";

export { clientesApi } from "./clientes";
export type { Cliente, ClienteInput } from "./clientes";

export { produtosApi } from "./produtos";
export type { Produto, ProdutoInput } from "./produtos";

export { vendasApi } from "./vendas";
export type { Venda, VendaItem, VendaInput } from "./vendas";

export { dashboardApi } from "./dashboard";
export type { ResumoDashboard, VendaPorDia, DashboardCompleto } from "./dashboard";

export { relatoriosApi } from "./relatorios";
export type { RelatoriosCompleto } from "./relatorios";

export { fiadosApi } from "./fiados";
export type { Fiado, FiadoItem, FiadoInput } from "./fiados";

export { pagamentosApi } from "./pagamentos";
export type { Pagamento } from "./pagamentos";

export { cobrancasApi } from "./cobrancas";
export type { Cobranca } from "./cobrancas";

export { mensalidadesApi } from "./mensalidades";
export type { Mensalidade, MinhaMensalidadeResponse, DadosPagamentoPix } from "./mensalidades";

export { configuracoesApi } from "./configuracoes";
export type { GrupoConfig } from "./configuracoes";

export { estoqueApi } from "./estoque";
export type { MovimentacaoEstoque, ResumoEstoque } from "./estoque";

export { comprasApi } from "./compras";
export type { Compra, CompraItem, Fornecedor } from "./compras";
