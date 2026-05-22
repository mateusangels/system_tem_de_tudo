import { useState, useEffect, useCallback, useRef } from 'react';
import { produtosApi, vendasApi, fiadosApi } from '@/lib/api/index';
import {
  cacheProdutos,
  getVendasPendentes,
  removerVendaPendente,
  countVendasPendentes,
  type VendaPendente,
} from '@/lib/offlineDb';

interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  produtosCached: boolean;
  syncNow: () => Promise<void>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [produtosCached, setProdutosCached] = useState(false);
  const syncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await countVendasPendentes();
      setPendingCount(count);
    } catch {
      // IndexedDB error, ignore
    }
  }, []);

  const cacheAllProducts = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const resp = await produtosApi.list({ ativo: true, per_page: 5000 });
      await cacheProdutos(resp.data as any);
      setProdutosCached(true);
    } catch {
      // Failed to cache, will retry later
    }
  }, []);

  const syncVenda = async (venda: VendaPendente): Promise<boolean> => {
    try {
      // Cria venda + itens (transactional, decrementa estoque automaticamente).
      // Fiado vive direto na venda (metodo_pagamento='fiado' + vencimento_fiado),
      // não tem registro separado.
      await vendasApi.create({
        cliente_id: venda.vendaPayload.cliente_id || undefined,
        subtotal: venda.vendaPayload.subtotal,
        desconto_total: venda.vendaPayload.desconto_total,
        total: venda.vendaPayload.total,
        valor_pago: venda.vendaPayload.valor_pago,
        troco: venda.vendaPayload.troco,
        metodo_pagamento: venda.vendaPayload.metodo_pagamento,
        tipo: venda.vendaPayload.tipo,
        vencimento_fiado: (venda.vendaPayload as any).vencimento_fiado,
        itens: venda.itensPayload as any,
      } as any);

      // Remove da fila
      await removerVendaPendente(venda.id);
      return true;
    } catch (err) {
      console.error('[OfflineSync] Falha ao sincronizar venda:', venda.id, err);
      return false;
    }
  };

  const syncNow = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const pendentes = await getVendasPendentes();
      pendentes.sort((a, b) => a.timestamp - b.timestamp);

      let syncedCount = 0;
      for (const venda of pendentes) {
        const ok = await syncVenda(venda);
        if (ok) {
          syncedCount++;
        } else {
          break;
        }
      }

      if (syncedCount > 0) {
        console.log(`[OfflineSync] ${syncedCount} venda(s) sincronizada(s)`);
      }
    } catch (err) {
      console.error('[OfflineSync] Erro na sincronização:', err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshPendingCount();
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncNow();
      cacheAllProducts();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow, cacheAllProducts]);

  useEffect(() => {
    cacheAllProducts();
    refreshPendingCount();
    if (navigator.onLine) {
      syncNow();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      await refreshPendingCount();
      if (navigator.onLine && !syncingRef.current) {
        const count = await countVendasPendentes();
        if (count > 0) {
          syncNow();
        }
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [syncNow, refreshPendingCount]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        cacheAllProducts();
      }
    }, 5 * 60_000);

    return () => clearInterval(interval);
  }, [cacheAllProducts]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    produtosCached,
    syncNow,
  };
}
