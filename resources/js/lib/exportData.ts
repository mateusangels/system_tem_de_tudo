import { api } from '@/lib/api';

export const TABELAS_EXPORT = [
  'profiles',
  'user_roles',
  'clientes',
  'produtos',
  'assinatura',
  'assinatura_pagamentos',
  'fiados',
  'fiado_itens',
  'pagamentos',
  'cobrancas',
  'vendas',
  'venda_itens',
] as const;

export type TabelaNome = typeof TABELAS_EXPORT[number];

export type TabelaStatus = 'pendente' | 'contando' | 'baixando' | 'ok' | 'erro';

export interface TabelaProgresso {
  nome: TabelaNome;
  status: TabelaStatus;
  total: number;
  baixados: number;
  erro?: string;
}

export interface ResultadoExport {
  metadata: {
    exported_at: string;
    source: 'laravel' | 'supabase';
    system: 'tem-de-tudo';
    version: '1.0';
    total_records: number;
    table_order: TabelaNome[];
  };
  stats: Record<TabelaNome, number>;
  tables: Record<TabelaNome, any[]>;
}

/**
 * Exporta tudo via endpoint Laravel /api/backup/export.
 * onUpdate é chamado com progresso simulado (uma chamada só, mas mantemos a UI antiga).
 */
export async function exportarTudo(
  onUpdate: (progresso: TabelaProgresso[]) => void
): Promise<ResultadoExport> {
  const progresso: TabelaProgresso[] = TABELAS_EXPORT.map(nome => ({
    nome,
    status: 'pendente',
    total: 0,
    baixados: 0,
  }));

  const emit = () => onUpdate(progresso.map(p => ({ ...p })));
  emit();

  try {
    progresso.forEach(p => { p.status = 'baixando'; });
    emit();

    const { data } = await api.get<ResultadoExport>('/backup/export');

    // Atualiza progresso pra "ok" com counts reais
    for (const nome of TABELAS_EXPORT) {
      const item = progresso.find(p => p.nome === nome)!;
      const count = data.stats?.[nome] ?? 0;
      item.total = count;
      item.baixados = count;
      item.status = 'ok';
    }
    emit();

    return data;
  } catch (e: any) {
    progresso.forEach(p => {
      if (p.status !== 'ok') {
        p.status = 'erro';
        p.erro = e?.response?.data?.message || e.message || 'Falha ao exportar';
      }
    });
    emit();
    throw new Error(`Falha no backup: ${e?.message || e}`);
  }
}

export function baixarComoArquivo(resultado: ResultadoExport) {
  const json = JSON.stringify(resultado, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.href = url;
  a.download = `backup-tem-de-tudo-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { filename: a.download, size: blob.size };
}
