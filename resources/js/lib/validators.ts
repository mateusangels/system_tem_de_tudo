/**
 * Schemas Yup centralizados pros formulários do TEM DE TUDO.
 *
 * Uso típico em um form:
 *
 *   import { produtoSchema, validar } from '@/lib/validators';
 *   const erro = await validar(produtoSchema, form);
 *   if (erro) { toast({ title: 'Atenção', description: erro, variant: 'destructive' }); return; }
 *   // ...chamar API
 */

import * as yup from 'yup';

// ─────────────────────────────────────────
// Mensagens padrão (em pt-BR)
// ─────────────────────────────────────────
yup.setLocale({
  mixed: {
    required: ({ path }) => `${labelize(path)} é obrigatório.`,
    notType: ({ path, type }) => `${labelize(path)} precisa ser ${typeLabel(type)}.`,
  },
  string: {
    email: 'E-mail inválido.',
    min: ({ path, min }) => `${labelize(path)} precisa ter pelo menos ${min} caracteres.`,
    max: ({ path, max }) => `${labelize(path)} pode ter no máximo ${max} caracteres.`,
    matches: ({ path }) => `${labelize(path)} está em formato inválido.`,
  },
  number: {
    min: ({ path, min }) => `${labelize(path)} precisa ser ${min} ou mais.`,
    positive: ({ path }) => `${labelize(path)} precisa ser positivo.`,
  },
});

function labelize(path?: string): string {
  if (!path) return 'Campo';
  const map: Record<string, string> = {
    nome: 'Nome',
    descricao: 'Nome do produto',
    email: 'E-mail',
    password: 'Senha',
    senha: 'Senha',
    current_password: 'Senha atual',
    new_password: 'Senha nova',
    preco_venda: 'Preço de venda',
    preco_custo: 'Preço de custo',
    preco_atacado: 'Preço de atacado',
    unidade: 'Unidade',
    codigo_barras: 'Código de barras',
    estoque_atual: 'Estoque atual',
    estoque_minimo: 'Estoque mínimo',
    cpf: 'CPF',
    cnpj: 'CNPJ',
    telefone: 'Telefone',
    limite_credito: 'Limite de crédito',
    valor: 'Valor',
    quantidade: 'Quantidade',
    tipo: 'Tipo',
    motivo: 'Motivo',
    produto_id: 'Produto',
    user_id: 'Cliente',
    vencimento: 'Vencimento',
    pix_chave: 'Chave PIX',
    pix_titular: 'Titular do PIX',
    pix_cidade: 'Cidade',
    valor_mensalidade: 'Valor da mensalidade',
    cargo: 'Cargo',
    role: 'Perfil',
    pin: 'PIN',
    forma_pagamento: 'Forma de pagamento',
  };
  return map[path] ?? path.charAt(0).toUpperCase() + path.slice(1).replace(/_/g, ' ');
}

function typeLabel(type: string): string {
  return { number: 'um número', string: 'um texto', date: 'uma data' }[type] ?? type;
}

/**
 * Valida um objeto contra um schema. Retorna mensagem de erro (com TODOS os erros
 * em lista) ou null se válido.
 *
 * Quando há múltiplos erros, retorna formato:
 *   "• Erro 1\n• Erro 2\n• Erro 3"
 * Assim o toast/alerta mostra TODOS os problemas, não "(+N outros)".
 *
 * Uso:
 *   const erro = await validar(schema, dados);
 *   if (erro) { toast(erro); return; }
 */
export async function validar<T extends yup.AnySchema>(
  schema: T,
  data: any
): Promise<string | null> {
  try {
    await schema.validate(data, { abortEarly: false });
    return null;
  } catch (err: any) {
    if (!(err instanceof yup.ValidationError)) {
      return err?.message || 'Erro de validação';
    }
    const erros = err.inner.length > 0 ? err.inner : [err];
    if (erros.length === 1) return erros[0].message;
    return erros.map(e => `• ${e.message}`).join('\n');
  }
}

// ─────────────────────────────────────────
// Validação de CPF e CNPJ (dígitos verificadores)
// ─────────────────────────────────────────
export function validarCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, '');
  if (c.length !== 11) return false;
  // Rejeita sequências repetidas (111.111.111-11 etc)
  if (/^(\d)\1{10}$/.test(c)) return false;

  for (let t = 9; t < 11; t++) {
    let d = 0;
    for (let i = 0; i < t; i++) d += parseInt(c[i]) * (t + 1 - i);
    d = ((10 * d) % 11) % 10;
    if (parseInt(c[t]) !== d) return false;
  }
  return true;
}

export function validarCNPJ(cnpj: string): boolean {
  const c = cnpj.replace(/\D/g, '');
  if (c.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(c)) return false;

  const calcDV = (tamanho: number, multiplicadores: number[]): number => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += parseInt(c[i]) * multiplicadores[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const dv1 = calcDV(12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (parseInt(c[12]) !== dv1) return false;
  const dv2 = calcDV(13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (parseInt(c[13]) !== dv2) return false;
  return true;
}

// Aceita "12,50" (vírgula) e converte pra 12.50
const numeroBR = (original: any) => {
  if (original === '' || original == null) return undefined;
  if (typeof original === 'number') return original;
  const s = String(original).replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isNaN(n) ? original : n;
};
const numeroBROptional = (original: any) => {
  const v = numeroBR(original);
  return v === undefined ? 0 : v;
};

// ─────────────────────────────────────────
// PRODUTOS
// ─────────────────────────────────────────
export const produtoSchema = yup.object({
  descricao: yup
    .string()
    .trim()
    .required('Informe o nome do produto.')
    .min(3, 'Nome do produto precisa ter pelo menos 3 caracteres.')
    .max(255),
  unidade: yup.string().required('Escolha a unidade.').max(10),
  preco_venda: yup
    .number()
    .transform((_, o) => numeroBR(o))
    .typeError('Preço de venda inválido.')
    .required('Informe o preço de venda.')
    .min(0.01, 'Preço de venda precisa ser maior que zero.'),
  preco_custo: yup
    .number()
    .transform((_, o) => numeroBROptional(o))
    .typeError('Preço de custo inválido.')
    .min(0),
  preco_atacado: yup
    .number()
    .transform((_, o) => numeroBROptional(o))
    .typeError('Preço de atacado inválido.')
    .min(0),
  estoque_atual: yup
    .number()
    .transform((_, o) => numeroBROptional(o))
    .typeError('Estoque atual inválido.')
    .min(0),
  estoque_minimo: yup
    .number()
    .transform((_, o) => numeroBROptional(o))
    .typeError('Estoque mínimo inválido.')
    .min(0),
});

// ─────────────────────────────────────────
// CLIENTES
// ─────────────────────────────────────────
const cpfRegex = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
const cnpjRegex = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;

export const clienteSchema = yup.object({
  nome: yup.string().trim().required().min(2).max(150),
  cpf: yup
    .string()
    .nullable()
    .transform((v) => (v && String(v).trim() ? String(v).trim() : null))
    .test('cpf-cnpj', 'CPF ou CNPJ inválido (verifique os dígitos).', (v) => {
      if (!v) return true; // opcional
      const onlyDigits = v.replace(/\D/g, '');
      // Formato aceito
      if (!cpfRegex.test(v) && !cnpjRegex.test(v) && onlyDigits.length !== 11 && onlyDigits.length !== 14) return false;
      // DV check
      if (onlyDigits.length === 11) return validarCPF(onlyDigits);
      if (onlyDigits.length === 14) return validarCNPJ(onlyDigits);
      return false;
    }),
  telefone: yup
    .string()
    .nullable()
    .transform((v) => (v ? String(v).trim() : null))
    .test('tel', 'Telefone precisa ter 10 ou 11 dígitos.', (v) => {
      if (!v) return true;
      const d = v.replace(/\D/g, '');
      return d.length === 0 || d.length === 10 || d.length === 11;
    }),
  limite_credito: yup
    .number()
    .transform((_, o) => numeroBROptional(o))
    .typeError('Limite de crédito inválido.')
    .min(0),
});

// ─────────────────────────────────────────
// FORNECEDOR
// ─────────────────────────────────────────
export const fornecedorSchema = yup.object({
  nome: yup.string().trim().required().min(2).max(150),
  cnpj: yup
    .string()
    .nullable()
    .transform((v) => (v ? String(v).trim() : null))
    .test('cnpj', 'CNPJ inválido (verifique os dígitos).', (v) => {
      if (!v) return true;
      const d = v.replace(/\D/g, '');
      if (d.length === 0) return true;
      if (d.length !== 14) return false;
      return validarCNPJ(d);
    }),
  email: yup
    .string()
    .nullable()
    .transform((v) => (v ? String(v).trim() : null))
    .test('email-opt', 'E-mail inválido.', (v) => {
      if (!v) return true;
      return yup.string().email().isValidSync(v);
    }),
});

// ─────────────────────────────────────────
// ESTOQUE — ajuste / movimentação
// ─────────────────────────────────────────
export const movimentacaoEstoqueSchema = yup.object({
  produto_id: yup.string().required('Escolha um produto.'),
  tipo: yup.string().required().oneOf(['entrada', 'saida', 'ajuste']),
  motivo: yup.string().required(),
  quantidade: yup
    .number()
    .transform((_, o) => numeroBR(o))
    .typeError('Quantidade inválida.')
    .required('Informe a quantidade.')
    .min(0.001, 'Quantidade precisa ser maior que zero.'),
});

// ─────────────────────────────────────────
// MENSALIDADE — admin gera
// ─────────────────────────────────────────
export const gerarMensalidadeSchema = yup.object({
  user_id: yup.string().required('Escolha um cliente.'),
  valor: yup
    .number()
    .transform((_, o) => numeroBR(o))
    .typeError('Valor inválido.')
    .required('Informe o valor.')
    .min(0.01, 'Valor precisa ser maior que zero.'),
});

export const marcarPagaSchema = yup.object({
  forma_pagamento: yup.string().required('Escolha a forma de pagamento.'),
  paga_em: yup.string().required('Informe a data do pagamento.'),
});

// ─────────────────────────────────────────
// CONFIG PIX — admin
// ─────────────────────────────────────────
export const configPixSchema = yup.object({
  pix_chave: yup.string().trim().required('Chave PIX é obrigatória.').min(3),
  pix_titular: yup.string().trim().required('Nome do titular é obrigatório.').min(3),
  valor_mensalidade: yup
    .number()
    .transform((_, o) => numeroBR(o))
    .typeError('Valor da mensalidade inválido.')
    .required('Informe o valor da mensalidade.')
    .min(1, 'Valor da mensalidade precisa ser maior que zero.'),
});

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────
export const loginSchema = yup.object({
  email: yup.string().trim().required('Informe seu e-mail.').email(),
  password: yup.string().required('Informe sua senha.').min(6),
});

export const criarUsuarioSchema = yup.object({
  nome: yup.string().trim().required().min(2).max(150),
  email: yup.string().trim().required().email(),
  senha: yup.string().required('Informe uma senha.').min(6, 'Senha precisa ter no mínimo 6 caracteres.'),
});

export const alterarSenhaSchema = yup.object({
  current_password: yup.string().required('Informe sua senha atual.'),
  new_password: yup
    .string()
    .required('Informe a nova senha.')
    .min(6, 'Senha nova precisa ter no mínimo 6 caracteres.')
    .notOneOf([yup.ref('current_password')], 'A nova senha precisa ser diferente da atual.'),
});

export const perfilSchema = yup.object({
  nome: yup.string().trim().required().min(2).max(150),
  email: yup.string().trim().required().email(),
  telefone: yup
    .string()
    .nullable()
    .transform((v) => (v ? String(v).trim() : null))
    .test('tel', 'Telefone precisa ter 10 ou 11 dígitos.', (v) => {
      if (!v) return true;
      const d = v.replace(/\D/g, '');
      return d.length === 0 || d.length === 10 || d.length === 11;
    }),
  pin: yup
    .string()
    .nullable()
    .transform((v) => (v ? String(v).trim() : null))
    .test('pin', 'PIN precisa ter 4 a 6 dígitos.', (v) => {
      if (!v) return true;
      return /^\d{4,6}$/.test(v);
    }),
});
