import { formatBRL, formatDate, formatQtd } from './format';

// ── Styles ─────────────────────────────────────────────────────────────────────
const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; background: #fff; padding: 32px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1a237e; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #1a237e; }
  .header .meta { text-align: right; font-size: 11px; color: #666; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 14px; font-weight: 700; color: #1a237e; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #f5f5f5; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; color: #555; border-bottom: 2px solid #ddd; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 12px; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  .badge-pendente { background: #fff3cd; color: #856404; }
  .badge-parcial { background: #cce5ff; color: #004085; }
  .badge-pago { background: #d4edda; color: #155724; }
  .badge-vencido { background: #f8d7da; color: #721c24; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .summary-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; text-align: center; }
  .summary-card .label { font-size: 10px; text-transform: uppercase; color: #666; margin-bottom: 4px; }
  .summary-card .value { font-size: 18px; font-weight: 700; color: #1a237e; }
  .summary-card .value.danger { color: #c62828; }
  .summary-card .value.success { color: #2e7d32; }
  .footer { margin-top: 32px; border-top: 1px solid #e0e0e0; padding-top: 12px; font-size: 10px; color: #999; text-align: center; }
  @media print { body { padding: 16px; } }
`;

function openPrintWindow(title: string, bodyHTML: string) {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${CSS}</style></head><body>${bodyHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

function statusBadge(status: string, vencido?: boolean) {
    if (vencido) return `<span class="badge badge-vencido">VENCIDO</span>`;
    const cls = status === 'pago' ? 'badge-pago' : status === 'parcial' ? 'badge-parcial' : 'badge-pendente';
    return `<span class="badge ${cls}">${status.toUpperCase()}</span>`;
}

function headerHTML(titulo: string, subtitulo?: string) {
    return `
    <div class="header">
      <div style="display:flex;align-items:center;gap:12px">
        <img src="/fundopdv.png" alt="Tem de Tudo" style="width:140px;height:auto" />
        <div>
          <h1>Tem de Tudo</h1>
          <p style="font-size:12px;color:#666;margin-top:2px">${titulo}</p>
          ${subtitulo ? `<p style="font-size:11px;color:#888">${subtitulo}</p>` : ''}
        </div>
      </div>
      <div class="meta">
        <p>Data de emissão</p>
        <p style="font-weight:600;font-size:13px">${new Date().toLocaleDateString('pt-BR')}</p>
      </div>
    </div>`;
}

// ── Relatório de um Fiado ──────────────────────────────────────────────────────
export function gerarRelatorioFiadoPDF(
    fiado: any,
    itens: any[],
    pagamentos: any[],
    cliente: any
) {
    const saldo = Number(fiado.valor_total) - Number(fiado.valor_pago);
    const hoje = new Date().toISOString().slice(0, 10);
    const vencido = fiado.data_vencimento && fiado.data_vencimento < hoje && fiado.status !== 'pago';

    let html = headerHTML(
        `Relatório de Fiado #${fiado.id.slice(0, 8)}`,
        `Cliente: ${cliente?.nome || '—'}`
    );

    // Resumo
    html += `
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Valor Total</div><div class="value">${formatBRL(Number(fiado.valor_total))}</div></div>
      <div class="summary-card"><div class="label">Valor Pago</div><div class="value success">${formatBRL(Number(fiado.valor_pago))}</div></div>
      <div class="summary-card"><div class="label">Saldo Pendente</div><div class="value danger">${formatBRL(saldo)}</div></div>
      <div class="summary-card"><div class="label">Status</div><div class="value">${statusBadge(fiado.status, vencido)}</div></div>
    </div>`;

    // Datas
    html += `
    <div class="section">
      <div class="section-title">Informações</div>
      <table>
        <tr><td style="width:160px;font-weight:600">Descrição</td><td>${fiado.descricao || '—'}</td></tr>
        <tr><td style="font-weight:600">Data da Compra</td><td>${fiado.data_compra ? formatDate(fiado.data_compra) : formatDate(fiado.created_at)}</td></tr>
        <tr><td style="font-weight:600">Data de Vencimento</td><td>${fiado.data_vencimento ? formatDate(fiado.data_vencimento) : 'Não definida'}</td></tr>
        <tr><td style="font-weight:600">Cliente</td><td>${cliente?.nome || '—'} ${cliente?.cpf ? `(CPF: ${cliente.cpf})` : ''}</td></tr>
        <tr><td style="font-weight:600">Telefone</td><td>${cliente?.telefone || '—'}</td></tr>
      </table>
    </div>`;

    // Itens
    if (itens.length > 0) {
        html += `<div class="section"><div class="section-title">Produtos</div><table>
      <thead><tr><th>Produto</th><th class="text-center">Qtd</th><th class="text-right">Unit.</th><th class="text-right">Total</th></tr></thead><tbody>`;
        itens.forEach(i => {
            html += `<tr><td>${i.produto}</td><td class="text-center">${i.quantidade}</td><td class="text-right">${formatBRL(Number(i.valor_unitario))}</td><td class="text-right">${formatBRL(Number(i.valor_total))}</td></tr>`;
        });
        html += `</tbody></table></div>`;
    }

    // Pagamentos
    if (pagamentos.length > 0) {
        html += `<div class="section"><div class="section-title">Pagamentos</div><table>
      <thead><tr><th>Data</th><th>Método</th><th class="text-right">Valor</th><th class="text-center">Status</th></tr></thead><tbody>`;
        pagamentos.forEach(p => {
            html += `<tr class="${p.estornado ? 'style="opacity:0.4;text-decoration:line-through"' : ''}">
        <td>${formatDate(p.created_at)}</td><td style="text-transform:uppercase">${p.metodo}</td>
        <td class="text-right">${formatBRL(Number(p.valor))}</td>
        <td class="text-center">${p.estornado ? '<span class="badge badge-vencido">ESTORNADO</span>' : '<span class="badge badge-pago">OK</span>'}</td></tr>`;
        });
        html += `</tbody></table></div>`;
    }

    html += `<div class="footer">Relatório gerado pelo sistema Tem de Tudo</div>`;
    openPrintWindow(`Fiado #${fiado.id.slice(0, 8)} – ${cliente?.nome || ''}`, html);
}


// ── Relatório do Cliente ────────────────────────────────────────────────────────
/**
 * Gera relatório PDF de um cliente com suas últimas compras (vendas finalizadas).
 * Mostra detalhamento de fiados em aberto: total da venda, quanto já pagou e saldo.
 */
export function gerarRelatorioClientePDF(cliente: any, vendas: any[]) {
    const vendasFinalizadas = vendas.filter(v => v.status === 'finalizada');
    const totalComprado = vendasFinalizadas.reduce((a, v) => a + Number(v.total || 0), 0);
    const ticketMedio = vendasFinalizadas.length > 0 ? totalComprado / vendasFinalizadas.length : 0;
    const ultimaCompra = vendasFinalizadas[0]?.created_at;

    // Sumário de fiados
    const fiados = vendasFinalizadas.filter(v => v.metodo_pagamento === 'fiado');
    const fiadosAbertos = fiados.filter(v => !v.quitado_em);
    const totalFiado = fiados.reduce((a, v) => a + Number(v.total || 0), 0);
    const totalPagoFiado = fiados.reduce((a, v) => a + Number(v.valor_pago_fiado || 0), 0);
    const saldoDevedor = fiadosAbertos.reduce((a, v) => a + (Number(v.total) - Number(v.valor_pago_fiado || 0)), 0);

    let html = headerHTML(
        `Relatório do Cliente`,
        `${cliente.nome} ${cliente.cpf ? `– ${cliente.cpf}` : ''}`
    );

    // Resumo de compras
    html += `
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Total de Compras</div><div class="value">${vendasFinalizadas.length}</div></div>
      <div class="summary-card"><div class="label">Total Comprado</div><div class="value">${formatBRL(totalComprado)}</div></div>
      <div class="summary-card"><div class="label">Ticket Médio</div><div class="value success">${formatBRL(ticketMedio)}</div></div>
      <div class="summary-card"><div class="label">Última Compra</div><div class="value">${ultimaCompra ? formatDate(ultimaCompra) : '—'}</div></div>
    </div>`;

    // Bloco destacado de FIADO (só aparece se houver fiado)
    if (fiados.length > 0) {
        html += `
    <div class="section" style="background:#fff8e1;border:2px solid #fbbf00;border-radius:8px;padding:14px 16px;margin-top:8px">
      <div style="font-size:14px;font-weight:700;color:#8a6600;margin-bottom:8px">💰 Resumo do Crediário (Fiado)</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;font-size:11px">
        <div>
          <div style="color:#666;text-transform:uppercase;font-size:10px;font-weight:700">Vendas no fiado</div>
          <div style="font-size:18px;font-weight:700;color:#0f0f0f">${fiados.length}</div>
          <div style="font-size:10px;color:#888">${fiadosAbertos.length} em aberto</div>
        </div>
        <div>
          <div style="color:#666;text-transform:uppercase;font-size:10px;font-weight:700">Total comprado fiado</div>
          <div style="font-size:18px;font-weight:700;color:#0f0f0f">${formatBRL(totalFiado)}</div>
        </div>
        <div>
          <div style="color:#666;text-transform:uppercase;font-size:10px;font-weight:700">Já pago</div>
          <div style="font-size:18px;font-weight:700;color:#0a8a3e">${formatBRL(totalPagoFiado)}</div>
        </div>
        <div>
          <div style="color:#666;text-transform:uppercase;font-size:10px;font-weight:700">Saldo devedor</div>
          <div style="font-size:20px;font-weight:800;color:${saldoDevedor > 0 ? '#c62828' : '#0a8a3e'}">${formatBRL(saldoDevedor)}</div>
        </div>
      </div>
    </div>`;
    }

    // Info do cliente
    html += `
    <div class="section">
      <div class="section-title">Dados do Cliente</div>
      <table>
        <tr><td style="width:160px;font-weight:600">Nome</td><td>${cliente.nome}</td></tr>
        <tr><td style="font-weight:600">Código Interno</td><td>${cliente.codigo_interno || '—'}</td></tr>
        <tr><td style="font-weight:600">CPF / CNPJ</td><td>${cliente.cpf || '—'}</td></tr>
        <tr><td style="font-weight:600">Telefone</td><td>${cliente.telefone || '—'}</td></tr>
        <tr><td style="font-weight:600">Limite de Crédito</td><td>${formatBRL(Number(cliente.limite_credito || 0))}</td></tr>
        <tr><td style="font-weight:600">Status</td><td>${cliente.status?.toUpperCase() || 'ATIVO'}</td></tr>
      </table>
    </div>`;

    // Histórico de compras (cada venda mostra cabeçalho + tabela de itens)
    html += `<div class="section"><div class="section-title">Histórico de Compras</div>`;

    if (vendasFinalizadas.length === 0) {
        html += `<p style="color:#666;padding:16px 0">Este cliente ainda não tem compras registradas.</p>`;
    } else {
        vendasFinalizadas.forEach(v => {
            const itens = (v.itens || []) as any[];
            const isFiado = v.metodo_pagamento === 'fiado';
            const valorTotal = Number(v.total);
            const jaPago = Number(v.valor_pago_fiado || 0);
            const saldo = valorTotal - jaPago;
            const quitado = !!v.quitado_em;

            // Etiqueta de status pra fiado
            let statusBadge = '';
            if (isFiado) {
                if (quitado) {
                    statusBadge = `<span style="background:#dcfce7;color:#0a8a3e;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;text-transform:uppercase;margin-left:6px">Quitada</span>`;
                } else if (jaPago > 0) {
                    statusBadge = `<span style="background:#fff8e1;color:#8a6600;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;text-transform:uppercase;margin-left:6px">Parcial</span>`;
                } else {
                    statusBadge = `<span style="background:#fee2e2;color:#c62828;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;text-transform:uppercase;margin-left:6px">Em aberto</span>`;
                }
            }

            const borda = isFiado && !quitado ? '#fbbf00' : '#e0e0e0';
            html += `
        <div style="border:1px solid ${borda};border-left:4px solid ${borda};border-radius:8px;padding:12px;margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #f0f0f0">
            <div>
              <strong style="color:#0f0f0f">Venda #${String(v.numero_venda || '').padStart(5, '0')}</strong>
              <span style="margin-left:8px;font-size:11px;color:#666">${formatDate(v.created_at)}</span>
              <span style="margin-left:8px;font-size:11px;color:#666;text-transform:capitalize">· ${v.metodo_pagamento || '—'}</span>
              ${statusBadge}
            </div>
            <strong style="font-size:14px;color:#0f0f0f">${formatBRL(valorTotal)}</strong>
          </div>`;

            // Box de pagamento de fiado
            if (isFiado) {
                html += `
          <div style="background:#fafaf7;border:1px solid #eee;border-radius:6px;padding:8px 12px;margin-bottom:8px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:11px">
            <div>
              <div style="color:#888;font-size:10px;text-transform:uppercase">Total da compra</div>
              <div style="font-weight:700">${formatBRL(valorTotal)}</div>
            </div>
            <div>
              <div style="color:#888;font-size:10px;text-transform:uppercase">${quitado ? 'Total pago' : 'Já pago'}</div>
              <div style="font-weight:700;color:#0a8a3e">${formatBRL(jaPago)}</div>
            </div>
            <div>
              <div style="color:#888;font-size:10px;text-transform:uppercase">${quitado ? 'Quitada em' : 'Saldo devedor'}</div>
              <div style="font-weight:700;color:${quitado ? '#0a8a3e' : '#c62828'}">${quitado ? formatDate(v.quitado_em) : formatBRL(saldo)}</div>
            </div>
            ${v.vencimento_fiado && !quitado ? `
            <div style="grid-column:1/-1;color:#666;font-size:10px;border-top:1px dashed #ddd;padding-top:4px;margin-top:2px">
              📅 Vence em <strong>${formatDate(v.vencimento_fiado)}</strong>
            </div>` : ''}
          </div>`;
            }

            if (itens.length > 0) {
                html += `<table style="width:100%;font-size:11px">
                  <thead>
                    <tr style="background:#fafaf7">
                      <th style="text-align:left;padding:4px 8px">Produto</th>
                      <th style="text-align:center;padding:4px 8px;width:60px">Qtd</th>
                      <th style="text-align:center;padding:4px 8px;width:50px">Un</th>
                      <th style="text-align:right;padding:4px 8px;width:80px">Unitário</th>
                      <th style="text-align:right;padding:4px 8px;width:80px">Total</th>
                    </tr>
                  </thead>
                  <tbody>`;
                itens.forEach(it => {
                    html += `<tr>
                      <td style="padding:3px 8px">${it.descricao || '—'}</td>
                      <td style="text-align:center;padding:3px 8px">${formatQtd(it.quantidade)}</td>
                      <td style="text-align:center;padding:3px 8px;color:#888">${it.unidade || ''}</td>
                      <td style="text-align:right;padding:3px 8px">${formatBRL(Number(it.valor_unitario))}</td>
                      <td style="text-align:right;padding:3px 8px;font-weight:600">${formatBRL(Number(it.valor_total))}</td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            } else {
                html += `<p style="color:#999;font-size:11px;font-style:italic;margin:0">Sem detalhes de itens.</p>`;
            }
            html += `</div>`;
        });
    }

    html += `</div>`;
    html += `<div class="footer">Relatório gerado pelo sistema Tem de Tudo</div>`;
    openPrintWindow(`Cliente – ${cliente.nome}`, html);
}
