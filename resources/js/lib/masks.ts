/**
 * Máscaras de formatação aplicadas em tempo real (onChange).
 *
 * Padrão de uso:
 *
 *   <Input
 *     value={form.telefone}
 *     onChange={e => setForm({ ...form, telefone: maskTelefone(e.target.value) })}
 *   />
 *
 * Todas as funções:
 *   1. Recebem string crua (pode ter dígitos, separadores, lixo)
 *   2. Removem o que não interessa
 *   3. Aplicam a formatação correta progressivamente, conforme o usuário digita
 *   4. Limitam o tamanho ao máximo do formato
 */

/** Mantém só dígitos */
const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');

/**
 * CPF: 000.000.000-00 (11 dígitos)
 * Vai formatando enquanto digita: "1" → "1", "1234" → "123.4", "12345678901" → "123.456.789-01"
 */
export function maskCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * CNPJ: 00.000.000/0000-00 (14 dígitos)
 */
export function maskCNPJ(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * CPF ou CNPJ: detecta pelo número de dígitos.
 * Útil pra campo "documento" do cliente, que aceita os dois.
 *  - até 11 dígitos → formata como CPF
 *  - 12+ dígitos    → formata como CNPJ
 */
export function maskCpfOuCnpj(value: string): string {
  const d = onlyDigits(value);
  if (d.length <= 11) return maskCPF(value);
  return maskCNPJ(value);
}

/**
 * Telefone BR — 10 dígitos (fixo) ou 11 dígitos (celular).
 *   10 dígitos → (00) 0000-0000
 *   11 dígitos → (00) 00000-0000
 */
export function maskTelefone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * E-mail: aplica lowercase e remove espaços.
 * Não restringe caracteres porque o usuário ainda pode estar digitando.
 */
export function maskEmail(value: string): string {
  return (value || '').toLowerCase().replace(/\s+/g, '');
}

/**
 * CEP: 00000-000 (8 dígitos)
 */
export function maskCEP(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/**
 * Dinheiro (R$ 0,00) - formato BR.
 * Aceita o valor digitado e mostra como moeda. Use somente quando quiser
 * mostrar o valor formatado em tempo real (pra preço, geralmente é melhor
 * deixar o input livre e formatar só no submit).
 */
export function maskDinheiro(value: string): string {
  const d = onlyDigits(value);
  if (!d) return '';
  const num = parseFloat(d) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
