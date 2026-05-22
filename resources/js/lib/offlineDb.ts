/**
 * IndexedDB utility for offline PDV operations.
 * Stores: cached products (for offline search) and pending sales (to sync when online).
 */

const DB_NAME = 'pdv_offline';
const DB_VERSION = 1;
const STORE_PRODUTOS = 'produtos_cache';
const STORE_VENDAS_PENDENTES = 'vendas_pendentes';

export interface VendaPendente {
  id: string; // temporary local UUID
  timestamp: number;
  vendaPayload: {
    cliente_id: string | null;
    operador_id: string | null;
    subtotal: number;
    desconto_total: number;
    total: number;
    valor_pago: number;
    troco: number;
    metodo_pagamento: string;
    status: string;
    tipo: string;
  };
  itensPayload: Array<{
    produto_id: string | null;
    codigo_barras: string;
    descricao: string;
    quantidade: number;
    unidade: string;
    valor_unitario: number;
    desconto: number;
    valor_total: number;
  }>;
  fiadoPayload?: {
    cliente_id: string;
    created_by: string | null;
    descricao: string;
    valor_total: number;
    valor_pago: number;
    status: string;
  };
  estoqueUpdates: Array<{
    produto_id: string;
    quantidade: number;
  }>;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PRODUTOS)) {
        const store = db.createObjectStore(STORE_PRODUTOS, { keyPath: 'id' });
        store.createIndex('codigo_barras', 'codigo_barras', { unique: false });
        store.createIndex('descricao', 'descricao', { unique: false });
        store.createIndex('ativo', 'ativo', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_VENDAS_PENDENTES)) {
        db.createObjectStore(STORE_VENDAS_PENDENTES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Products Cache ──

export async function cacheProdutos(produtos: any[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_PRODUTOS, 'readwrite');
  const store = tx.objectStore(STORE_PRODUTOS);

  // Clear old cache and replace
  store.clear();
  for (const p of produtos) {
    store.put(p);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function buscarProdutosOffline(termo: string): Promise<any[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_PRODUTOS, 'readonly');
  const store = tx.objectStore(STORE_PRODUTOS);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const all: any[] = request.result;
      const lower = termo.toLowerCase();
      const results = all.filter(p =>
        p.ativo &&
        (
          (p.codigo_barras && p.codigo_barras.toLowerCase().includes(lower)) ||
          (p.descricao && p.descricao.toLowerCase().includes(lower)) ||
          (p.marca && p.marca.toLowerCase().includes(lower)) ||
          (p.codigo_interno && p.codigo_interno.toLowerCase().includes(lower))
        )
      ).slice(0, 10);
      db.close();
      resolve(results);
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function buscarProdutoOfflineExato(code: string): Promise<any | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_PRODUTOS, 'readonly');
  const store = tx.objectStore(STORE_PRODUTOS);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const all: any[] = request.result;
      const found = all.find(p =>
        p.ativo &&
        (p.codigo_barras === code || p.codigo_interno === code)
      );
      db.close();
      resolve(found || null);
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function getProdutosCacheCount(): Promise<number> {
  const db = await openDb();
  const tx = db.transaction(STORE_PRODUTOS, 'readonly');
  const store = tx.objectStore(STORE_PRODUTOS);

  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onsuccess = () => { db.close(); resolve(request.result); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

// ── Pending Sales Queue ──

export async function salvarVendaPendente(venda: VendaPendente): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_VENDAS_PENDENTES, 'readwrite');
  tx.objectStore(STORE_VENDAS_PENDENTES).put(venda);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getVendasPendentes(): Promise<VendaPendente[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_VENDAS_PENDENTES, 'readonly');
  const store = tx.objectStore(STORE_VENDAS_PENDENTES);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => { db.close(); resolve(request.result); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function removerVendaPendente(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_VENDAS_PENDENTES, 'readwrite');
  tx.objectStore(STORE_VENDAS_PENDENTES).delete(id);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function countVendasPendentes(): Promise<number> {
  const db = await openDb();
  const tx = db.transaction(STORE_VENDAS_PENDENTES, 'readonly');
  const store = tx.objectStore(STORE_VENDAS_PENDENTES);

  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onsuccess = () => { db.close(); resolve(request.result); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}
