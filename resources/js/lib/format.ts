export const formatBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date: string): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
};

/**
 * Formata quantidade em padrão BR mostrando o mínimo de decimais necessário:
 *  - 20      → "20"     (inteiro, sem casas)
 *  - 20.5    → "20,5"
 *  - 2.500   → "2,5"    (zeros à direita removidos)
 *  - 0.125   → "0,125"
 *  - 1500    → "1.500"  (separador de milhar)
 *
 * Útil pra exibir estoque, qtd em vendas, peso, comprimento etc.
 */
export const formatQtd = (value: number | string | null | undefined): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';

  // Inteiro? mostra sem decimais
  if (Number.isInteger(n)) {
    return n.toLocaleString('pt-BR');
  }

  // Tem decimais — mostra até 3 casas mas remove zeros à direita
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};
