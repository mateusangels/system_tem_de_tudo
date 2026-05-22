/**
 * Leitor de planilha XLSX/CSV de produtos pro TEM DE TUDO.
 *
 * Aceita colunas por NOME (não por posição) — assim funciona com qualquer planilha
 * do cliente desde que as colunas estejam nomeadas com algum dos sinônimos abaixo.
 *
 * Também exporta um gerador de planilha-modelo pro botão "Baixar modelo".
 */

import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────────────
// Mapeamento de sinônimos: nome do campo no nosso sistema → variações
// possíveis no XLSX do cliente. Tudo comparado case-insensitive e sem acento.
// ─────────────────────────────────────────────────────────────────
const SINONIMOS: Record<string, string[]> = {
  codigo_barras: ['codigo barras', 'codigo de barras', 'codigobarras', 'ean', 'gtin', 'cod barras', 'cod. barras', 'codigo'],
  codigo_interno: ['codigo interno', 'sku', 'cod interno', 'cod. interno', 'referencia interna'],
  referencia_fabricante: ['referencia fabricante', 'ref fabricante', 'ref. fabricante', 'ref fabricante', 'referencia do fabricante', 'ref'],
  descricao: ['descricao', 'descrição', 'nome', 'nome do produto', 'produto', 'titulo'],
  preco_custo: ['preco custo', 'preço custo', 'custo', 'valor custo', 'preco de custo'],
  preco_venda: ['preco venda', 'preço venda', 'venda', 'valor venda', 'preco de venda', 'valor'],
  preco_atacado: ['preco atacado', 'preço atacado', 'atacado', 'valor atacado'],
  qtd_minima_atacado: ['qtd minima atacado', 'quantidade minima atacado', 'qtd min atacado', 'qtd atacado'],
  unidade: ['unidade', 'un', 'medida', 'unid'],
  categoria: ['categoria', 'grupo', 'familia', 'departamento'],
  marca: ['marca', 'fabricante', 'fornecedor'],
  localizacao: ['localizacao', 'localização', 'local', 'corredor', 'prateleira', 'posicao'],
  estoque_atual: ['estoque atual', 'estoque', 'qtd estoque', 'quantidade', 'qtd', 'saldo'],
  estoque_minimo: ['estoque minimo', 'estoque mínimo', 'minimo', 'minimo estoque'],
  ativo: ['ativo', 'status', 'situacao'],
  movimenta_estoque: ['movimenta estoque', 'mov estoque', 'controla estoque'],
  observacao: ['observacao', 'observação', 'obs', 'descricao adicional', 'nota'],
};

// Unidades aceitas no sistema (com sinônimos comuns)
const UNIDADES_VALIDAS = new Set([
  'UN', 'M', 'M2', 'M3', 'KG', 'BARRA', 'ROLO', 'SC', 'CX', 'LATA', 'GL', 'L', 'PCT',
]);
const NORMALIZA_UNIDADE: Record<string, string> = {
  'UNIDADE': 'UN', 'UNID': 'UN', 'UND': 'UN', 'UNI': 'UN', 'PC': 'UN', 'PEÇA': 'UN', 'PECA': 'UN',
  'METRO': 'M', 'MT': 'M',
  'METRO QUADRADO': 'M2', 'M²': 'M2',
  'METRO CUBICO': 'M3', 'METRO CÚBICO': 'M3', 'M³': 'M3',
  'QUILOGRAMA': 'KG', 'QUILO': 'KG', 'KILO': 'KG',
  'SACO': 'SC', 'SACA': 'SC',
  'CAIXA': 'CX',
  'GALAO': 'GL', 'GALÃO': 'GL',
  'LITRO': 'L', 'LT': 'L',
  'PACOTE': 'PCT', 'PCT.': 'PCT',
};

function normalizarTexto(s: any): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizarUnidade(u: any): string {
  const upper = String(u || '').trim().toUpperCase();
  if (!upper) return 'UN';
  if (UNIDADES_VALIDAS.has(upper)) return upper;
  return NORMALIZA_UNIDADE[upper] || 'UN';
}

function normalizarBool(v: any, padrao = true): boolean {
  if (v === true || v === 1 || v === '1') return true;
  if (v === false || v === 0 || v === '0') return false;
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return padrao;
  if (['sim', 's', 'yes', 'y', 'true', 'ativo', 'a'].includes(s)) return true;
  if (['nao', 'não', 'n', 'no', 'false', 'inativo', 'i'].includes(s)) return false;
  return padrao;
}

function normalizarNumero(v: any, padrao = 0): number {
  if (v == null || v === '') return padrao;
  if (typeof v === 'number') return v;
  // Aceita "12,50" e "1.234,50"
  const s = String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = parseFloat(s);
  return Number.isNaN(n) ? padrao : n;
}

/**
 * Resultado do parser: produtos válidos + linhas que falharam (com motivo)
 */
export type LinhaErro = { linha: number; motivo: string; dados?: any };
export type ResultadoParse = {
  produtos: ProdutoImport[];
  erros: LinhaErro[];
  colunasNaoMapeadas: string[];
  total: number;
};

export type ProdutoImport = {
  codigo_barras: string;
  codigo_interno: string;
  referencia_fabricante: string;
  descricao: string;
  preco_custo: number;
  preco_venda: number;
  preco_atacado: number;
  qtd_minima_atacado: number;
  unidade: string;
  categoria: string;
  marca: string;
  localizacao: string;
  estoque_atual: number;
  estoque_minimo: number;
  ativo: boolean;
  movimenta_estoque: boolean;
  observacao: string;
};

/**
 * Lê o arquivo XLSX/CSV e devolve produtos prontos pro endpoint /produtos/import.
 *
 * Estratégia:
 *  1. Lê a primeira planilha
 *  2. Detecta a linha de cabeçalho (procura por palavra "descricao"/"nome"/etc)
 *  3. Mapeia cada coluna do XLSX → campo do nosso sistema usando SINONIMOS
 *  4. Itera nas linhas, monta o objeto produto, valida o mínimo (nome obrigatório)
 *  5. Devolve produtos válidos + erros + colunas que não foram mapeadas
 */
export async function lerPlanilhaProdutos(file: File): Promise<ResultadoParse> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

  if (rows.length < 2) {
    return { produtos: [], erros: [{ linha: 0, motivo: 'Planilha vazia' }], colunasNaoMapeadas: [], total: 0 };
  }

  // 1. Detectar a linha de cabeçalho
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i].map(normalizarTexto);
    const temNome = row.some(c => SINONIMOS.descricao.includes(c));
    const temPreco = row.some(c => SINONIMOS.preco_venda.includes(c) || SINONIMOS.preco_custo.includes(c));
    if (temNome && temPreco) { headerIdx = i; break; }
  }
  const headerRow = rows[headerIdx].map(normalizarTexto);

  // 2. Mapear índices das colunas → campos do nosso sistema
  const mapaColunas: Record<string, number> = {};
  const colunasNaoMapeadas: string[] = [];
  headerRow.forEach((colName, idx) => {
    if (!colName) return;
    let achou = false;
    for (const [campo, sinonimos] of Object.entries(SINONIMOS)) {
      if (sinonimos.includes(colName) || sinonimos.some(s => colName.startsWith(s))) {
        if (!(campo in mapaColunas)) mapaColunas[campo] = idx;
        achou = true;
        break;
      }
    }
    if (!achou) colunasNaoMapeadas.push(String(rows[headerIdx][idx]));
  });

  if (!('descricao' in mapaColunas)) {
    return {
      produtos: [],
      erros: [{ linha: headerIdx + 1, motivo: 'Não achei a coluna "Nome do Produto" (ou "Descrição"). Verifique se o cabeçalho está na primeira linha.' }],
      colunasNaoMapeadas,
      total: rows.length - 1,
    };
  }

  // 3. Processar linhas de dados
  const produtos: ProdutoImport[] = [];
  const erros: LinhaErro[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const get = (campo: string): any => {
      const idx = mapaColunas[campo];
      return idx === undefined ? '' : row[idx];
    };
    const descricao = String(get('descricao') || '').trim();
    if (!descricao) continue; // ignora linhas vazias

    try {
      produtos.push({
        codigo_barras: String(get('codigo_barras') || '').trim(),
        codigo_interno: String(get('codigo_interno') || '').trim(),
        referencia_fabricante: String(get('referencia_fabricante') || '').trim(),
        descricao: descricao.toUpperCase(),
        preco_custo: normalizarNumero(get('preco_custo')),
        preco_venda: normalizarNumero(get('preco_venda')),
        preco_atacado: normalizarNumero(get('preco_atacado')),
        qtd_minima_atacado: Math.floor(normalizarNumero(get('qtd_minima_atacado'))),
        unidade: normalizarUnidade(get('unidade')),
        categoria: String(get('categoria') || '').trim(),
        marca: String(get('marca') || '').trim().toUpperCase(),
        localizacao: String(get('localizacao') || '').trim(),
        estoque_atual: normalizarNumero(get('estoque_atual')),
        estoque_minimo: Math.floor(normalizarNumero(get('estoque_minimo'))),
        ativo: normalizarBool(get('ativo'), true),
        movimenta_estoque: normalizarBool(get('movimenta_estoque'), true),
        observacao: String(get('observacao') || '').trim(),
      });
    } catch (e: any) {
      erros.push({ linha: i + 1, motivo: e.message || 'Erro ao processar linha', dados: row });
    }
  }

  return { produtos, erros, colunasNaoMapeadas, total: rows.length - headerIdx - 1 };
}

/**
 * Gera planilha XLSX-modelo com cabeçalho + 3 linhas de exemplo.
 * Usuário baixa, preenche e importa de volta.
 */
export function gerarModeloXLSX() {
  const dados = [
    [
      'Código de Barras', 'Código Interno', 'Ref. Fabricante', 'Nome do Produto',
      'Preço Custo', 'Preço Venda', 'Preço Atacado', 'Qtd Mín. Atacado',
      'Unidade', 'Categoria', 'Marca', 'Localização',
      'Estoque Atual', 'Estoque Mínimo', 'Ativo', 'Movimenta Estoque', 'Observação',
    ],
    [
      '7891234567890', 'HID-CAN-25', 'T-PVC25', 'CANO PVC SOLDÁVEL 25MM',
      24.50, 38.90, 34.90, 10,
      'BARRA', 'Hidráulica', 'TIGRE', 'Corredor B / Prat. 3',
      187, 30, 'sim', 'sim', 'Barra de 6 metros',
    ],
    [
      '7891234599912', 'ELE-FIO-25', 'SIL-2.5N', 'FIO FLEXÍVEL 2,5MM² PRETO',
      2.80, 4.20, 3.80, 50,
      'M', 'Elétrica', 'SIL', 'Corredor C / Prat. 1',
      120, 50, 'sim', 'sim', 'Vendido por metro',
    ],
    [
      '7891125671000', 'CIM-50KG', '', 'CIMENTO CP-II 50KG',
      22.80, 32.90, 28.90, 20,
      'SC', 'Cimentos e Argamassa', 'VOTORAN', 'Depósito externo',
      412, 100, 'sim', 'sim', '',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(dados);
  // Larguras de coluna confortáveis
  ws['!cols'] = [
    { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 40 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 },
    { wch: 10 }, { wch: 18 }, { wch: 14 }, { wch: 22 },
    { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 28 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
  XLSX.writeFile(wb, 'modelo-produtos-tem-de-tudo.xlsx');
}
