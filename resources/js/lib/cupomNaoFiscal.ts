// Gerador de Cupom Não Fiscal para impressora térmica 58mm
// ~32 caracteres por linha

const LARGURA = 32;

// Dados padrão da loja — sobrescritos pelas configurações
// (grupo "loja" na tabela configuracoes) quando carregadas
const LOJA = {
  nome: 'TEM DE TUDO',
  endereco: 'Material de Construcao Hidraulica e Eletrica',
  cidade: '',
  telefone: '',
  cnpj: '',
  ie: '',
};

// Permite a aplicação sobrescrever os dados da loja (lido da tabela configuracoes)
export function setDadosLoja(dados: Partial<typeof LOJA>) {
  Object.assign(LOJA, dados);
}

function centralizar(texto: string): string {
  const pad = Math.max(0, Math.floor((LARGURA - texto.length) / 2));
  return ' '.repeat(pad) + texto;
}

function linha(): string {
  return '-'.repeat(LARGURA);
}

function duasColunas(esq: string, dir: string): string {
  const espacos = Math.max(1, LARGURA - esq.length - dir.length);
  return esq + ' '.repeat(espacos) + dir;
}

function quebrarTexto(texto: string): string[] {
  const linhas: string[] = [];
  for (let i = 0; i < texto.length; i += LARGURA) {
    linhas.push(texto.substring(i, i + LARGURA));
  }
  return linhas;
}

export interface ItemCupom {
  codigo_barras: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
}

export interface DadosCupomVenda {
  id: string;
  data: Date;
  itens: ItemCupom[];
  subtotal: number;
  desconto: number;
  total: number;
  metodo_pagamento: string;
  valor_pago: number;
  troco: number;
  cliente_nome?: string;
  cliente_cpf?: string;
  operador_nome: string;
}

export interface DadosCupomAbertura {
  data: Date;
  operador_nome: string;
  pdv: string;
  operacao_id: string;
  valor_dinheiro: number;
  total: number;
}

export interface DadosCupomFechamento {
  data: Date;
  operador_nome: string;
  pdv: string;
  operacao_id: string;
  total_vendas: number;
  total_dinheiro: number;
  total_debito: number;
  total_credito: number;
  total_pix: number;
  total_fiado: number;
  total_geral: number;
  qtd_vendas: number;
}

export interface DadosCupomFiado {
  id: string;
  data: Date;
  cliente_nome: string;
  operador_nome: string;
  itens: ItemCupom[];
  subtotal: number;
  total: number;
}

function cabecalho(): string[] {
  return [
    centralizar(LOJA.nome),
    centralizar(LOJA.endereco),
    centralizar(LOJA.cidade),
    centralizar(`TELEFONE: ${LOJA.telefone}`),
    centralizar(`CNPJ: ${LOJA.cnpj}`),
    centralizar(`IE: ${LOJA.ie || ''}`),
    linha(),
  ];
}

function formatarData(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatarValor(v: number): string {
  return v.toFixed(2).replace('.', ',');
}

export function gerarCupomVenda(dados: DadosCupomVenda): string {
  const linhas: string[] = [
    ...cabecalho(),
    duasColunas('DATA:', formatarData(dados.data)),
    duasColunas('COD.:', dados.id.substring(0, 36).toUpperCase()),
    '',
    centralizar('CUPOM NAO FISCAL'),
    '',
    duasColunas('CPF:', dados.cliente_cpf || ''),
    duasColunas('CLIENTE:', dados.cliente_nome || 'AO CONSUMIDOR'),
    duasColunas('ATENDENTE:', dados.operador_nome),
    linha(),
    'DESCRICAO',
    '  QTD  UN  UNIT(R$)  TOTAL(R$)',
    linha(),
  ];

  for (const item of dados.itens) {
    linhas.push(item.codigo_barras || '');
    linhas.push(
      `  ${item.quantidade}  ${item.unidade}  ${formatarValor(item.valor_unitario)}  ${formatarValor(item.valor_total)}`
    );
    const descLinhas = quebrarTexto(item.descricao);
    linhas.push(...descLinhas);
  }

  linhas.push(linha());
  linhas.push(duasColunas('SUBTOTAL:', `R$ ${formatarValor(dados.subtotal)}`));
  linhas.push(linha());

  if (dados.desconto > 0) {
    linhas.push(duasColunas('DESCONTO:', `R$ ${formatarValor(dados.desconto)}`));
    linhas.push(linha());
  }

  linhas.push(duasColunas('TOTAL:', `R$ ${formatarValor(dados.total)}`));
  linhas.push(linha());

  const metodoLabel = dados.metodo_pagamento.toUpperCase();
  linhas.push(duasColunas(`PAGAMENTO ${metodoLabel}:`, `R$ ${formatarValor(dados.valor_pago)}`));

  if (dados.troco > 0) {
    linhas.push(duasColunas('TROCO:', `R$ ${formatarValor(dados.troco)}`));
  }

  linhas.push(linha());
  linhas.push(linha());
  linhas.push('');
  linhas.push(centralizar('OBRIGADO, VOLTE SEMPRE!'));
  linhas.push('');
  linhas.push('');

  return linhas.join('\n');
}

export function gerarCupomAbertura(dados: DadosCupomAbertura): string {
  const linhas: string[] = [
    ...cabecalho(),
    duasColunas('DATA:', formatarData(dados.data)),
    duasColunas('ABERTURA PDV:', dados.pdv),
    duasColunas('OPERADOR:', dados.operador_nome),
    duasColunas('OPERACAO:', dados.operacao_id.substring(0, 36).toUpperCase()),
    '',
    duasColunas('DINHEIRO:', `R$ ${formatarValor(dados.valor_dinheiro)}`),
    duasColunas('TOTAL:', `R$ ${formatarValor(dados.total)}`),
    linha(),
    '',
    '',
    centralizar('ASSINATURA DO OPERADOR'),
    '',
    '',
    linha(),
    '',
  ];
  return linhas.join('\n');
}

export function gerarCupomFechamento(dados: DadosCupomFechamento): string {
  const linhas: string[] = [
    ...cabecalho(),
    duasColunas('DATA:', formatarData(dados.data)),
    duasColunas('FECHAMENTO PDV:', dados.pdv),
    duasColunas('OPERADOR:', dados.operador_nome),
    duasColunas('OPERACAO:', dados.operacao_id.substring(0, 36).toUpperCase()),
    '',
    linha(),
    centralizar('RESUMO DO CAIXA'),
    linha(),
    '',
    duasColunas('QTD VENDAS:', String(dados.qtd_vendas)),
    '',
    duasColunas('DINHEIRO:', `R$ ${formatarValor(dados.total_dinheiro)}`),
    duasColunas('DEBITO:', `R$ ${formatarValor(dados.total_debito)}`),
    duasColunas('CREDITO:', `R$ ${formatarValor(dados.total_credito)}`),
    duasColunas('PIX:', `R$ ${formatarValor(dados.total_pix)}`),
    duasColunas('FIADO:', `R$ ${formatarValor(dados.total_fiado)}`),
    '',
    linha(),
    duasColunas('TOTAL GERAL:', `R$ ${formatarValor(dados.total_geral)}`),
    linha(),
    '',
    '',
    centralizar('ASSINATURA DO OPERADOR'),
    '',
    '',
    linha(),
    '',
  ];
  return linhas.join('\n');
}

export function gerarCupomFiado(dados: DadosCupomFiado): string {
  const linhas: string[] = [
    ...cabecalho(),
    duasColunas('DATA:', formatarData(dados.data)),
    duasColunas('COD.:', dados.id.substring(0, 36).toUpperCase()),
    '',
    centralizar('VENDA FIADO'),
    '',
    duasColunas('CLIENTE:', dados.cliente_nome),
    duasColunas('VENDEDOR:', dados.operador_nome),
    linha(),
    'DESCRICAO',
    '  QTD  UN  UNIT(R$)  TOTAL(R$)',
    linha(),
  ];

  for (const item of dados.itens) {
    linhas.push(item.codigo_barras || '');
    linhas.push(
      `  ${item.quantidade}  ${item.unidade}  ${formatarValor(item.valor_unitario)}  ${formatarValor(item.valor_total)}`
    );
    const descLinhas = quebrarTexto(item.descricao);
    linhas.push(...descLinhas);
  }

  linhas.push(linha());
  linhas.push(duasColunas('SUBTOTAL:', `R$ ${formatarValor(dados.subtotal)}`));
  linhas.push(linha());
  linhas.push(duasColunas('TOTAL:', `R$ ${formatarValor(dados.total)}`));
  linhas.push(linha());
  linhas.push('');
  linhas.push(centralizar('** VENDA A PRAZO **'));
  linhas.push('');
  linhas.push(linha());
  linhas.push('');
  linhas.push('');
  linhas.push(centralizar('ASSINATURA DO CLIENTE'));
  linhas.push('');
  linhas.push('');
  linhas.push(linha());
  linhas.push('');
  linhas.push(centralizar('OBRIGADO, VOLTE SEMPRE!'));
  linhas.push('');

  return linhas.join('\n');
}

export function imprimirCupom(conteudo: string): void {
  // Usa iframe oculto para não bloquear a tela do PDV
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    alert('Não foi possível preparar a impressão.');
    return;
  }

  doc.open();
  // Conta as linhas para calcular o meio do cupom
  const linhas = conteudo.split('\n');
  const meioIdx = Math.floor(linhas.length / 2);
  const antes = linhas.slice(0, meioIdx).join('\n');
  const depois = linhas.slice(meioIdx).join('\n');

  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cupom</title>
  <style>
    @page {
      size: 58mm auto;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      line-height: 1.3;
      width: 58mm;
      padding: 2mm 1mm 2mm 4mm;
      color: #000;
    }
    .cupom {
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 54mm;
      opacity: 0.08;
      pointer-events: none;
      z-index: 0;
    }
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: inherit;
      font-size: inherit;
      position: relative;
      z-index: 1;
    }
  </style>
</head>
<body>
  <div class="cupom">
    <img src="/fundopdv.png" alt="" class="watermark" />
    <pre>${conteudo}</pre>
  </div>
</body>
</html>`);
  doc.close();

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  };
}
