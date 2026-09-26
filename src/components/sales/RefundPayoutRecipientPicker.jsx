import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

function scoreOption(opt, q) {
  if (!q) return 0;
  const label = String(opt.label || '').toLowerCase();
  const hay = String(opt.searchText || opt.label || '').toLowerCase();
  if (label === q) return 400;
  if (label.startsWith(q)) return 300;
  if (hay.startsWith(q)) return 220;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => hay.includes(t))) return 180;
  if (hay.includes(q)) return 100;
  return 0;
}

export function rankRefundPayoutOptions(options, query, recentKeys = []) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  const recentRank = new Map(recentKeys.map((k, i) => [String(k), i]));
  const list = Array.isArray(options) ? options : [];
  const scored = q
    ? list
        .map((o) => ({ o, s: scoreOption(o, q) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s || String(a.o.label).localeCompare(String(b.o.label)))
        .map((x) => x.o)
    : [...list];
  if (!recentKeys.length) return scored;
  const head = [];
  const tail = [];
  const seen = new Set();
  for (const key of recentKeys) {
    const hit = scored.find((o) => String(o.key) === String(key));
    if (hit && !seen.has(hit.key)) {
      seen.add(hit.key);
      head.push({ ...hit, recent: true });
    }
  }
  for (const o of scored) {
    if (seen.has(o.key)) continue;
    tail.push(o);
  }
  if (!q && head.length) {
    return [
      ...head.map((o) => ({ ...o, group: o.recent && !q ? 'Recent on this desk' : o.group })),
      ...tail,
    ];
  }
  return [...head, ...tail].sort((a, b) => {
    if (q) return 0;
    const ar = recentRank.has(String(a.key)) ? 0 : 1;
    const br = recentRank.has(String(b.key)) ? 0 : 1;
    return ar - br;
  });
}

/**
 * Searchable payout recipient picker for refund allocation rows.
 * Options use keys like `staff:<id>` or `customer:<id>`.
 * Rows with `needsBank` can still be selected — caller opens bank capture.
 */
export function RefundPayoutRecipientPicker({
  options = [],
  value = '',
  onChange,
  disabled = false,
  placeholder = 'Search staff, driver, or customer…',
  emptyHint = 'No matching recipients with bank on file.',
  loading = false,
  recentKeys = [],
}) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const selected = useMemo(
    () => options.find((o) => String(o.key) === String(value)) || null,
    [options, value]
  );

  useEffect(() => {
    if (!open) setQuery('');
  }, [open, value]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(
    () => rankRefundPayoutOptions(options, query, recentKeys),
    [options, query, recentKeys]
  );

  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  const selectableCount = useMemo(
    () => options.filter((o) => !o.disabled).length,
    [options]
  );

  const grouped = useMemo(() => {
    const map = new Map();
    for (const opt of filtered) {
      const g = String(opt.group || 'Recipients').trim() || 'Recipients';
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(opt);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const pick = (opt) => {
    if (opt?.disabled) return;
    onChange?.(opt.key, opt);
    setOpen(false);
    setQuery('');
  };

  const clear = () => {
    onChange?.('');
    setQuery('');
    setOpen(false);
  };

  const moveActive = (delta) => {
    const enabled = filtered.filter((o) => !o.disabled);
    if (!enabled.length) return;
    const cur = filtered[activeIdx];
    let pos = Math.max(0, enabled.findIndex((o) => o.key === cur?.key));
    pos = (pos + delta + enabled.length) % enabled.length;
    const next = enabled[pos];
    setActiveIdx(Math.max(0, filtered.findIndex((o) => o.key === next.key)));
  };

  const resolvedEmptyHint = (() => {
    if (loading) return 'Loading recipients…';
    if (options.length === 0) return emptyHint;
    if (filtered.length === 0) {
      return `No match for “${String(query || '').trim()}”. Clear the search to see ${selectableCount} recipient${selectableCount === 1 ? '' : 's'}.`;
    }
    return emptyHint;
  })();

  const bankHint = selected
    ? selected.needsBank
      ? 'Bank needed — click to change'
      : selected.hint || 'Click to change'
    : '';

  return (
    <div ref={rootRef} className="relative">
      {!open && selected ? (
        <div className="flex items-stretch gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              setOpen(true);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-2 text-left text-xs text-white hover:border-sky-500/50 disabled:opacity-50"
          >
            {selected.group ? (
              <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {selected.group}
              </span>
            ) : null}
            <span className="block truncate font-semibold leading-snug">{selected.label}</span>
            <span
              className={`mt-0.5 block text-[10px] ${
                selected.needsBank ? 'text-amber-300' : 'text-slate-400'
              }`}
            >
              {bankHint}
            </span>
          </button>
          {!disabled ? (
            <button
              type="button"
              aria-label="Clear recipient"
              onClick={clear}
              className="shrink-0 rounded-lg border border-slate-600 bg-slate-800 px-2 text-slate-400 hover:border-rose-500/60 hover:text-rose-300"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              disabled={disabled}
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setOpen(true);
                  moveActive(1);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setOpen(true);
                  moveActive(-1);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const opt = filtered[activeIdx] || filtered.find((o) => !o.disabled);
                  if (opt && !opt.disabled) pick(opt);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setOpen(false);
                  setQuery('');
                }
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 pl-8 pr-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30 disabled:opacity-50"
            />
          </div>
          {open && !disabled ? (
            <div
              role="listbox"
              className="absolute z-30 mt-1 max-h-[min(16rem,50vh)] w-full overflow-auto rounded-lg border border-slate-600 bg-slate-900 py-1 shadow-xl"
            >
              {loading && options.length === 0 ? (
                <p className="px-3 py-2 text-ui-xs text-slate-400">Loading recipients…</p>
              ) : grouped.length === 0 ? (
                <p className="px-3 py-2 text-ui-xs text-slate-400">{resolvedEmptyHint}</p>
              ) : (
                grouped.map(([group, rows]) => (
                  <div key={group}>
                    <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {group}
                    </p>
                    {rows.map((opt) => {
                      const idx = filtered.findIndex((o) => o.key === opt.key);
                      const active = idx === activeIdx;
                      const chosen = String(opt.key) === String(value);
                      const rowDisabled = Boolean(opt.disabled);
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          role="option"
                          aria-selected={chosen}
                          disabled={rowDisabled}
                          className={`w-full px-3 py-2 text-left text-xs ${
                            rowDisabled
                              ? 'cursor-not-allowed text-slate-500'
                              : active
                                ? 'bg-sky-900/40 text-sky-100'
                                : chosen
                                  ? 'bg-slate-800/80 text-sky-200 hover:bg-slate-800'
                                  : 'text-white hover:bg-slate-800'
                          }`}
                          onMouseDown={(ev) => ev.preventDefault()}
                          onMouseEnter={() => setActiveIdx(idx)}
                          onClick={() => pick(opt)}
                        >
                          <span className="flex items-start justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block truncate font-semibold leading-snug">{opt.label}</span>
                              {opt.hint || opt.needsBank ? (
                                <span
                                  className={`mt-0.5 block text-[10px] ${
                                    opt.needsBank ? 'text-amber-300/90' : 'text-slate-400'
                                  }`}
                                >
                                  {opt.hint || 'No bank — select to add account number'}
                                </span>
                              ) : null}
                            </span>
                            {opt.needsBank && !rowDisabled ? (
                              <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200">
                                Bank
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
