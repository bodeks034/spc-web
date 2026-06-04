/** IndexedDB skladište za offline red (veći kapacitet od localStorage). */

const DB_NAME = "spc_offline_v1";
const STORE = "jobs";
const DB_VERSION = 1;

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("IDB transaction aborted"));
  });
}

export function idbPodrzan() {
  return typeof indexedDB !== "undefined";
}

export function openOfflineDb() {
  if (!idbPodrzan()) {
    return Promise.reject(new Error("IndexedDB nije podržan"));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("createdAt", "createdAt", { unique: false });
        os.createIndex("type", "type", { unique: false });
      }
    };
  });
}

export async function idbUcitajSve() {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const jobs = req.result || [];
      jobs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      db.close();
      resolve(jobs);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function idbSnimiSve(queue) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  store.clear();
  for (const job of queue) {
    store.put(job);
  }
  await txDone(tx);
  db.close();
}

export async function idbDodajJob(job) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(job);
  await txDone(tx);
  db.close();
}

export async function idbObrisiJob(jobId) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(jobId);
  await txDone(tx);
  db.close();
}

export async function idbBrojPoslova() {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => {
      db.close();
      resolve(req.result || 0);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}
