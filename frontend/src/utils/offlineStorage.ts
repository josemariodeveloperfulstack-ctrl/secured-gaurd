const DB_NAME = 'secured-guard-offline';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível neste navegador.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir IndexedDB'));
  });

  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Falha na operação IndexedDB'));
  });
}

export async function offlineStorageGet<T>(key: string): Promise<T | null> {
  try {
    const value = await withStore<T | undefined>('readonly', (store) => store.get(key));
    return value ?? null;
  } catch {
    return null;
  }
}

export async function offlineStorageSet<T>(key: string, value: T): Promise<void> {
  await withStore('readwrite', (store) => store.put(value, key));
}

export async function offlineStorageRemove(key: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(key));
}

export async function migrateLocalStorageToIndexedDB<T>(key: string): Promise<T | null> {
  try {
    const existing = await offlineStorageGet<T>(key);
    if (existing != null) {
      return existing;
    }

    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as T;
    await offlineStorageSet(key, parsed);
    localStorage.removeItem(key);
    return parsed;
  } catch {
    return null;
  }
}
