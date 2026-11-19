export type LocalOffer = {
  clientOfferId: string;
  productName: string;
  category?: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  currency: string;
  municipality: string;
  description?: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'ERROR';
  serverOfferId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

const DB_NAME = 'campora-db';
const STORE = 'offers_outbox';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'clientOfferId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllLocalOffers(): Promise<LocalOffer[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []).sort((a,b)=> (a.createdAt < b.createdAt ? 1 : -1)));
    req.onerror = () => reject(req.error);
  });
}

export async function putLocalOffer(offer: LocalOffer): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(offer);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingOffers(): Promise<LocalOffer[]> {
  const all = await getAllLocalOffers();
  return all.filter(o => o.status === 'PENDING' || o.status === 'ERROR' || o.status === 'SYNCING');
}
