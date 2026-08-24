import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

/**
 * Searchable payout recipient picker for refund allocation rows.
 * Options use keys like `staff:<id>` or `customer:<id>`.
 * Rows with `needsBank` can still be selected — caller opens bank capture.
 *
 * @param {{
 *   options: Array<{
 *     key: string;
 *     label: string;
 *     group?: string;
 *     searchText?: string;
 *     disabled?: boolean;
 *     needsBank?: boolean;
 *     hint?: string;
 *   }>;
 *   value: string;
 *   onChange: (key: string, opt?: object) => void;
 *   disabled?: boolean;
 *   placeholder?: string;
 *   emptyHint?: string;
 *   loading?: boolean;
 * }} props
 */
export function RefundPayoutRecipientPicker({
  options = [],
  value = '',
  onChange,
  disabled = false,
  placeholder = 'Search staff, driver, or customer…',
  emptyHint = 'No matching recipients with bank on file.',
  loading = false,
}) {
  const rootRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((o) => String(o.key) === String(value) && !o.disabled) || null,
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

  const filtered = useMemo(() => {
    const q = String(query || '')
      .trim()
      .toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = String(o.searchText || o.label || '').toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

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

  const resolvedEmptyHint = (() => {
    if (loading) return 'Loading recipients…';
    if (options.length === 0) return emptyHint;
    if (filtered.length === 0) {
      return `No match for “${String(query || '').trim()}”. Clear the search to see ${selectableCount} recipient${selectableCount === 1 ? '' : 's'}.`;
    }
    return emptyHint;
  })();

  return (
    <div ref={rootRef} className="relative">
      {!open && selected ? (
        <div className="flex items-stretch gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setOpen(true)}
            className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-left text-xs text-white hover:border-slate-500 disabled:opacity-50"
          >
            {selected.group ? (
              <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {selected.group}
              </span>
            ) : null}
            <span className="block truncate font-semibold leading-snug">{selected.label}</span>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              {selected.needsBank ? 'Bank needed — click to change' : 'Click to change'}
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
              className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 pl-8 pr-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30 disabled:opacity-50"
            />
          </div>
          {open && !disabled ? (
            <div className="absolute z-30 mt-1 max-h-[min(16rem,50vh)] w-full overflow-auto rounded-lg border border-slate-600 bg-slate-900 py-1 shadow-xl">
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
                      const active = String(opt.key) === String(value);
                      const rowDisabled = Boolean(opt.disabled);
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          disabled={rowDisabled}
                          className={`w-full px-3 py-2 text-left text-xs ${
                            rowDisabled
                              ? 'cursor-not-allowed text-slate-500'
                              : active
                                ? 'bg-slate-800/80 text-sky-200 hover:bg-slate-800'
                                : 'text-white hover:bg-slate-800'
                          }`}
                          onMouseDown={(ev) => ev.preventDefault()}
                          onClick={() => pick(opt)}
                        >
                          <span className="block truncate font-semibold leading-snug">{opt.label}</span>
                          {opt.hint || opt.needsBank ? (
                            <span className="mt-0.5 block text-[10px] text-amber-300/90">
                              {opt.hint || 'No bank — select to add account number'}
                            </span>
                          ) : null}
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
