const DB_NAME = "fretwork";
const DB_VERSION = 1;
const STORE_NAME = "files";
const META_KEY = "fretwork:files-meta";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME, { keyPath: "id" }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbTx(mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const req = fn(store);
    if (req) {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } else {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }
  }));
}

function loadMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY) || "[]"); } catch { return []; }
}

function saveMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

export function loadFiles() { return loadMeta(); }

export async function addFile(name, bytes) {
  const id = crypto.randomUUID();
  const size = bytes.length;
  await dbTx("readwrite", store => store.put({ id, bytes }));
  const meta = loadMeta();
  const entry = { id, name, size, addedAt: Date.now() };
  meta.push(entry);
  saveMeta(meta);
  return entry;
}

export async function deleteFile(id) {
  await dbTx("readwrite", store => store.delete(id));
  saveMeta(loadMeta().filter(f => f.id !== id));
}

export function renameFile(id, name) {
  saveMeta(loadMeta().map(f => f.id === id ? { ...f, name } : f));
}

export async function getFileBytes(id) {
  const rec = await dbTx("readonly", store => store.get(id));
  return rec?.bytes ?? null;
}

export function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}
