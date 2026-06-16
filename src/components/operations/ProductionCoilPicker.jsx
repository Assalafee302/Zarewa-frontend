import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const MAX_VISIBLE = 48;
const EMPTY_COIL_SET = new Set();

function filterOptions(options, query, value, disabledCoils) {
  const q = query.trim().toLowerCase();
  const selected = String(value || '').trim();
  const out = [];
  const seen = new Set();

  const add = (opt) => {
    if (!opt || seen.has(opt.coilNo)) return;
    if (disabledCoils.has(opt.coilNo) && opt.coilNo !== selected) return;
    seen.add(opt.coilNo);
    out.push(opt);
  };

  if (selected) {
    const sel = options.find((o) => o.coilNo === selected);
    if (sel) add(sel);
  }

  const pool = q
    ? options.filter(
        (o) => o.label.toLowerCase().includes(q) || String(o.coilNo).toLowerCase().includes(q)
      )
    : options;

  for (const opt of pool) {
    if (out.length >= MAX_VISIBLE) break;
    add(opt);
  }
  return out;
}

/**
 * Searchable coil picker — avoids rendering hundreds of native &lt;option&gt; nodes per allocation row.
 */
function ProductionCoilPicker({
  value,
  onChange,
  disabled = false,
  title = '',
  options = [],
  disabledCoils = null,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const disabledSet = disabledCoils ?? EMPTY_COIL_SET;

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    return options.find((o) => o.coilNo === value)?.label || value;
  }, [options, value]);

  const visible = useMemo(
    () => filterOptions(options, query, value, disabledSet),
    [options, query, value, disabledSet]
  );

  const recommendedVisible = useMemo(
    () => visible.filter((o) => o.group === 'recommended'),
    [visible]
  );
  const otherVisible = useMemo(
    () => visible.filter((o) => o.group !== 'recommended'),
    [visible]
  );

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const pick = (coilNo) => {
    onChange(coilNo);
    setOpen(false);
    setQuery('');
  };

  const fieldClass =
    'min-h-11 w-full min-w-0 max-w-full rounded-md border border-slate-200 bg-white py-2 px-2 text-left text-[11px] font-bold text-[#134e4a] outline-none transition-all focus:border-[#134e4a]/40 focus:ring-1 focus:ring-[#134e4a]/20 disabled:opacity-60 lg:min-h-0 lg:py-1.5';

  if (disabled) {
    return (
      <div className={`${fieldClass} cursor-default bg-slate-50 truncate ${className}`} title={title}>
        {selectedLabel || value || '—'}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        title={title}
        onClick={() => setOpen((v) => !v)}
        className={`${fieldClass} flex items-center justify-between gap-1 pr-1`}
      >
        <span className="min-w-0 truncate">{selectedLabel || 'Select coil...'}</span>
        <ChevronDown size={14} className="shrink-0 text-slate-400" aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-black/5">
          <div className="border-b border-slate-100 p-1.5">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search coil no., colour, gauge…"
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-medium text-slate-800 outline-none focus:border-[#134e4a]/40 focus:ring-1 focus:ring-[#134e4a]/20"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1 text-[11px]">
            {recommendedVisible.length > 0 ? (
              <li className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-teal-800/80">
                Recommended
              </li>
            ) : null}
            {recommendedVisible.map((opt) => (
              <li key={opt.coilNo}>
                <button
                  type="button"
                  disabled={disabledSet.has(opt.coilNo) && opt.coilNo !== value}
                  onClick={() => pick(opt.coilNo)}
                  className={`w-full px-2 py-1.5 text-left font-semibold hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40 ${
                    opt.coilNo === value ? 'bg-teal-50/80 text-[#134e4a]' : 'text-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
            {otherVisible.length > 0 ? (
              <li className="mt-1 border-t border-slate-100 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">
                {recommendedVisible.length > 0 ? 'Other coils' : 'Available coils'}
              </li>
            ) : null}
            {otherVisible.map((opt) => (
              <li key={opt.coilNo}>
                <button
                  type="button"
                  disabled={disabledSet.has(opt.coilNo) && opt.coilNo !== value}
                  onClick={() => pick(opt.coilNo)}
                  className={`w-full px-2 py-1.5 text-left font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${
                    opt.coilNo === value ? 'bg-slate-100 text-[#134e4a]' : 'text-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
            {visible.length === 0 ? (
              <li className="px-2 py-2 text-slate-500">No matching coils.</li>
            ) : null}
            {!query && options.length > MAX_VISIBLE ? (
              <li className="border-t border-slate-100 px-2 py-1.5 text-[9px] text-slate-500">
                Type to search {options.length - MAX_VISIBLE}+ more coils.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default memo(ProductionCoilPicker);
