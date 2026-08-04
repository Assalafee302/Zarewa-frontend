import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

/**
 * Async typeahead against /api/ot/lookups/* — selection only (no free-text commit).
 * @param {{
 *   label: string;
 *  value: string;
 *  displayValue?: string;
 *  onChange: (id: string, row: object | null) => void;
 *  loadOptions: (query: string) => Promise<{ ok: boolean; data?: { rows?: object[] } }>;
 *  getOptionId: (row: object) => string;
 *  getOptionLabel: (row: object) => string;
 *  getOptionMeta?: (row: object) => string;
 *  placeholder?: string;
 *  disabled?: boolean;
 *  emptyHint?: string;
 * }} props
 */
export function OtAsyncLookup({
  label,
  value,
  displayValue = '',
  onChange,
  loadOptions,
  getOptionId,
  getOptionLabel,
  getOptionMeta,
  placeholder = 'Search…',
  disabled = false,
  emptyHint = 'Type to search — pick a live result (no free text).',
}) {
  const listId = useId();
  const [query, setQuery] = useState(displayValue || value || '');
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const debounceRef = useRef(null);
  const blurTimer = useRef(null);
  const selectedLabel = displayValue || value || '';

  useEffect(() => {
    if (!open) setQuery(selectedLabel);
  }, [selectedLabel, open]);

  const runSearch = useCallback(
    async (q) => {
      setLoading(true);
      setErr('');
      try {
        const res = await loadOptions(q);
        if (!res.ok || res.data?.ok === false) {
          setRows([]);
          setErr(res.data?.error || 'Search failed');
          return;
        }
        setRows(Array.isArray(res.data?.rows) ? res.data.rows : []);
      } catch {
        setRows([]);
        setErr('Search failed');
      } finally {
        setLoading(false);
      }
    },
    [loadOptions]
  );

  useEffect(() => {
    if (!open) return undefined;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, runSearch]);

  const pick = (row) => {
    const id = getOptionId(row);
    onChange(id, row);
    setQuery(getOptionLabel(row));
    setOpen(false);
  };

  const clear = () => {
    onChange('', null);
    setQuery('');
    setRows([]);
  };

  return (
    <div className="relative min-w-0">
      <label className="z-field-label block text-ui-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <div className="relative mt-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled}
          className="z-input w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-9 text-sm font-semibold text-slate-800 outline-none focus:border-zarewa-teal focus:ring-1 focus:ring-zarewa-teal/25 disabled:bg-slate-50 disabled:opacity-60"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange('', null);
          }}
          onFocus={() => {
            setOpen(true);
            void runSearch(query);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 180);
          }}
          autoComplete="off"
        />
        {value || query ? (
          <button
            type="button"
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clear}
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      {!value ? <p className="mt-1 text-[10px] text-slate-400">{emptyHint}</p> : null}
      {value ? (
        <p className="mt-1 truncate text-[10px] font-semibold text-emerald-800">Selected: {selectedLabel}</p>
      ) : null}
      {err ? <p className="mt-1 text-[10px] text-rose-700">{err}</p> : null}
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          {loading ? (
            <li className="px-3 py-2 text-xs text-slate-500">Searching…</li>
          ) : rows.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500">No matches — try another search.</li>
          ) : (
            rows.map((row) => {
              const id = getOptionId(row);
              return (
                <li key={id}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-teal-50"
                    onClick={() => pick(row)}
                  >
                    <span className="text-xs font-bold text-slate-800">{getOptionLabel(row)}</span>
                    {getOptionMeta ? (
                      <span className="text-[10px] text-slate-500">{getOptionMeta(row)}</span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
