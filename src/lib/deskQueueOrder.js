/**
 * Ordering for cashier work queues.
 *
 * These lists are truncated for display and have no "show more", so order decides what
 * is reachable. Sorted newest-first — the default the list endpoints use for browsing
 * history — the rows that fall off the bottom are always the ones that have waited
 * longest, and every new arrival pushes them further out of sight.
 *
 * A queue of people owed money drains oldest-first. That is what fairness means when the
 * thing queued is a customer waiting on a refund, and it makes the cap harmless: the work
 * always leaves from the correct end.
 */

/**
 * Date fields in age order — when the wait started, not when it was approved. A refund
 * requested two months ago and approved yesterday has kept someone waiting two months.
 */
const AGE_FIELDS = [
  'requestedAtISO',
  'requestDate',
  'dateISO',
  'date',
  'createdAtISO',
  'approvalDate',
  'approvedAtISO',
];

/**
 * The timestamp a queue row should be aged by, or '' when it carries none.
 * @param {Record<string, unknown>} row
 * @returns {string}
 */
export function queueAgeKey(row) {
  if (!row || typeof row !== 'object') return '';
  for (const field of AGE_FIELDS) {
    const v = String(row[field] ?? '').trim();
    if (v) return v;
  }
  return '';
}

/**
 * Oldest first. Rows carrying no date at all sort to the very top rather than the bottom:
 * an undated row in a money queue is an anomaly, and the whole point of this ordering is
 * that nothing needing attention hides below the cut.
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 */
export function compareQueueOldestFirst(a, b) {
  const ka = queueAgeKey(a);
  const kb = queueAgeKey(b);
  if (!ka && !kb) return 0;
  if (!ka) return -1;
  if (!kb) return 1;
  return ka.localeCompare(kb);
}

/**
 * Copy of `rows` ordered oldest-first, optionally behind a priority group that still
 * comes first (receipts put those missing a cutting list at the top, for example).
 * @template T
 * @param {T[]} rows
 * @param {{ priority?: (row: T) => boolean }} [opts]
 * @returns {T[]}
 */
export function sortQueueOldestFirst(rows, opts = {}) {
  const list = Array.isArray(rows) ? rows.slice() : [];
  const priority = typeof opts.priority === 'function' ? opts.priority : null;
  return list.sort((a, b) => {
    if (priority) {
      const pa = priority(a) ? 0 : 1;
      const pb = priority(b) ? 0 : 1;
      if (pa !== pb) return pa - pb;
    }
    return compareQueueOldestFirst(a, b);
  });
}
