import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

/**
 * Searchable payout recipient picker for refund allocation rows.
 * Options use keys like `staff:<id>` or `customer:<id>`.
 *
 * @param {{
 *   options: Array<{ key: string; label: string; group?: string; searchText?: string }>;
 *   value: string;
 *   onChange: (key: string) => void;
 *   disabled?: boolean;
 *   placeholder?: string;
 *   emptyHint?: string;
 * }} props
 */
export function RefundPayoutRecipientPicker({
  options = [],
  value = '',
  onChange,
  disabled = false,
  placeholder = 'Search staff, driver, or customer…',
  emptyHint = 'No matching recipients with bank on file.',
}) {
  const rootRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

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

  const filtered = useMemo(() => {
    const q = String(query || '')
      .trim()
      .toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = String(o.searchText || o.label || '')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const opt of filtered) {
      const g = String(opt.group || 'Recipients').trim() || 'Recipients';
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(opt);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const pick = (key) => {
    onChange?.(key);
    setOpen(false);
    setQuery('');
  };

  const clear = () => {
    onChange?.('');
    setQuery('');
    setOpen(false);
  };

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
            <span className="mt-0.5 block text-[10px] text-slate-400">Click to change</span>
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
              {grouped.length === 0 ? (
                <p className="px-3 py-2 text-ui-xs text-slate-400">{emptyHint}</p>
              ) : (
                grouped.map(([group, rows]) => (
                  <div key={group}>
                    <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {group}
                    </p>
                    {rows.map((opt) => {
                      const active = String(opt.key) === String(value);
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-800 ${
                            active ? 'bg-slate-800/80 text-sky-200' : 'text-white'
                          }`}
                          onMouseDown={(ev) => ev.preventDefault()}
                          onClick={() => pick(opt.key)}
                        >
                          <span className="block truncate font-semibold leading-snug">{opt.label}</span>
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
