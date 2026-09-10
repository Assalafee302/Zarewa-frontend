/**
 * Persist desk domain snapshots in IndexedDB so return visits paint instantly.
 * Revalidate via ensureDomainLoaded / network as usual.
 */

const DB_NAME = 'zarewa-desk-cache-v1';
const STORE = 'domains';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('indexedDB open failed'));
  });
}

function deskKey(userId, branchScope, domain) {
  return `${String(userId || '')}:${String(branchScope || '')}:${String(domain || '')}`;
}

/**
 * @param {string|number} userId
 * @param {string} branchScope
 * @param {string} domain
 * @param {object} payload
 */
export async function writeDeskDomainCache(userId, branchScope, domain, payload) {
  try {
    if (!payload?.ok) return;
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put({
        key: deskKey(userId, branchScope, domain),
        savedAtIso: new Date().toISOString(),
        payload,
      });
    });
    db.close();
  } catch {
    /* ignore */
  }
}

/**
 * @param {string|number} userId
 * @param {string} branchScope
 * @param {string} domain
 * @returns {Promise<object|null>}
 */
export async function readDeskDomainCache(userId, branchScope, domain) {
  try {
    const db = await openDb();
    const row = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(deskKey(userId, branchScope, domain));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return row?.payload?.ok ? row.payload : null;
  } catch {
    return null;
  }
}
