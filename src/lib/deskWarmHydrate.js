/**
 * After the first desk page is on screen, follow `bootstrapMeta.backgroundHydrate`
 * in small chunks until the warm cap. Older rows stay on the server for search.
 */

export const DESK_WARM_CAP = 500;

const RESPONSE_KEY_ALIASES = {
  ledgerEntries: ['entries'],
};

/** @param {object | null | undefined} row */
export function deskRowId(row) {
  if (!row || typeof row !== 'object') return '';
  return String(
    row.id || row.expenseID || row.refundID || row.poID || row.apID || row.jobID || row.movementId || ''
  ).trim();
}

/**
 * @param {object[]} existing
 * @param {object[]} incoming
 */
/**
 * A later snapshot often repeats the same first page. If the desk has already
 * warmed past that page, keep the longer list instead of jumping back to 150.
 * A changed first row (new save, delete, branch switch) still replaces the list.
 * @param {object[]} prevRows
 * @param {object[]} nextRows
 */
export function preserveWarmWindow(prevRows, nextRows) {
  if (!Array.isArray(prevRows) || !Array.isArray(nextRows)) return nextRows;
  if (prevRows.length <= nextRows.length || nextRows.length === 0) return nextRows;
  for (let i = 0; i < nextRows.length; i += 1) {
    const prevId = deskRowId(prevRows[i]);
    const nextId = deskRowId(nextRows[i]);
    if (!prevId || prevId !== nextId) return nextRows;
  }
  return prevRows;
}

export function mergeDeskRows(existing, incoming) {
  const base = Array.isArray(existing) ? existing : [];
  const seen = new Set(base.map(deskRowId).filter(Boolean));
  const next = base.slice();
  for (const row of incoming || []) {
    const id = deskRowId(row);
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    next.push(row);
  }
  return next;
}

/**
 * @param {object | null | undefined} data
 * @param {string} key
 */
export function rowsFromListPayload(data, key) {
  if (!data || data.ok === false) return [];
  if (Array.isArray(data[key])) return data[key];
  for (const alias of RESPONSE_KEY_ALIASES[key] || []) {
    if (Array.isArray(data[alias])) return data[alias];
  }
  if (Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * @param {object | null | undefined} meta
 * @returns {{ key: string, href: string, limit: number, warmCap: number }[]}
 */
export function flattenWarmPlan(meta) {
  if (!meta?.enabled || !Array.isArray(meta.resources)) return [];
  const warmCap = Math.max(1, Number(meta.warmCap) || DESK_WARM_CAP);
  /** @type {{ key: string, href: string, limit: number, warmCap: number }[]} */
  const pages = [];
  for (const resource of meta.resources) {
    const key = String(resource?.key || '').trim();
    if (!key) continue;
    const resourceCap = Math.max(1, Number(resource.warmCap) || warmCap);
    const planned = Array.isArray(resource.pages) && resource.pages.length
      ? resource.pages
      : resource.href
        ? [{ href: resource.href, limit: resource.limit }]
        : [];
    for (const page of planned) {
      const href = String(page?.href || '').trim();
      if (!href) continue;
      pages.push({
        key,
        href,
        limit: Math.max(0, Number(page.limit) || 0),
        warmCap: resourceCap,
      });
    }
  }
  return pages;
}

/**
 * One in-flight queue. A fresh snapshot for a key drops that key's queued pages
 * so a refresh does not append onto a replaced first page.
 */
export function createDeskWarmController() {
  /** @type {{ key: string, href: string, limit: number, warmCap: number, gen: number }[]} */
  let queue = [];
  /** @type {Map<string, number>} */
  const genByKey = new Map();
  /** @type {Map<string, object[]>} */
  const buffers = new Map();
  /** @type {Set<string>} */
  const stopped = new Set();
  /** @type {Set<string>} */
  const warmed = new Set();
  let running = false;
  let cancelled = false;

  function token(key, href) {
    return `${key}\n${href}`;
  }

  return {
    cancelAll() {
      cancelled = true;
      queue = [];
      buffers.clear();
      stopped.clear();
      for (const key of genByKey.keys()) genByKey.set(key, (genByKey.get(key) || 0) + 1);
    },

    /**
     * @param {object | null | undefined} meta
     * @param {{
     *   fetchPage: (href: string) => Promise<object | null>,
     *   appendRows: (key: string, rows: object[], warmCap: number, merged: object[]) => void,
     *   pause?: (first: boolean) => Promise<void>,
     *   seedRows?: (key: string) => object[],
     * }} handlers
     */
    begin(meta, handlers) {
      cancelled = false;
      const pages = flattenWarmPlan(meta);
      const keys = [...new Set(pages.map((page) => page.key))];
      for (const key of keys) {
        genByKey.set(key, (genByKey.get(key) || 0) + 1);
        buffers.delete(key);
        stopped.delete(key);
        for (const seen of [...warmed]) {
          if (seen.startsWith(`${key}\n`)) warmed.delete(seen);
        }
      }
      queue = queue.filter((page) => !keys.includes(page.key));
      for (const page of pages) {
        const seen = token(page.key, page.href);
        if (warmed.has(seen)) continue;
        queue.push({ ...page, gen: genByKey.get(page.key) || 0 });
      }
      void this.drain(handlers);
    },

    /**
     * @param {{
     *   fetchPage: (href: string) => Promise<object | null>,
     *   appendRows: (key: string, rows: object[], warmCap: number, merged: object[]) => void,
     *   pause?: (first: boolean) => Promise<void>,
     *   seedRows?: (key: string) => object[],
     * }} handlers
     */
    async drain(handlers) {
      if (running) return;
      running = true;
      let first = true;
      try {
        while (queue.length && !cancelled) {
          const page = queue.shift();
          if (!page || stopped.has(page.key) || genByKey.get(page.key) !== page.gen) continue;
          const pause = handlers.pause || ((isFirst) => new Promise((resolve) => setTimeout(resolve, isFirst ? 0 : 40)));
          await pause(first);
          first = false;
          if (cancelled || genByKey.get(page.key) !== page.gen || stopped.has(page.key)) continue;
          if (!buffers.has(page.key)) {
            const seeded = handlers.seedRows?.(page.key);
            buffers.set(page.key, Array.isArray(seeded) ? seeded.slice() : []);
          }
          if ((buffers.get(page.key) || []).length >= page.warmCap) {
            stopped.add(page.key);
            continue;
          }
          let data = null;
          try {
            data = await handlers.fetchPage(page.href);
          } catch {
            stopped.add(page.key);
            continue;
          }
          if (cancelled || genByKey.get(page.key) !== page.gen) continue;
          const rows = rowsFromListPayload(data, page.key);
          const base = buffers.get(page.key) || [];
          if (base.length >= page.warmCap) {
            stopped.add(page.key);
            continue;
          }
          const merged = mergeDeskRows(base, rows);
          const capped = merged.length > page.warmCap ? merged.slice(0, page.warmCap) : merged;
          buffers.set(page.key, capped);
          warmed.add(token(page.key, page.href));
          handlers.appendRows(page.key, rows, page.warmCap, capped);
          const shortPage = page.limit > 0 && rows.length < page.limit;
          if (shortPage || capped.length >= page.warmCap) stopped.add(page.key);
        }
      } finally {
        running = false;
        if (!cancelled && queue.length) void this.drain(handlers);
      }
    },
  };
}
