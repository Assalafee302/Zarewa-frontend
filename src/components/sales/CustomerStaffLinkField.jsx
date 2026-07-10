import React, { useEffect, useMemo, useState } from 'react';
import { fetchStaffLinkOptions } from '../../lib/customerStaffLink';
import { CUSTOMER_FIELD, CUSTOMER_LABEL } from '../customers/customerUi';

/**
 * Pick an HR staff member to link to a sales customer (staff purchase credit).
 * @param {{
 *   value?: string;
 *   onChange: (staffUserId: string) => void;
 *   disabled?: boolean;
 *   customerId?: string;
 *   onStaffPick?: (staff: object | null) => void;
 * }} props
 */
export function CustomerStaffLinkField({ value = '', onChange, disabled = false, customerId = '', onStaffPick }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (disabled || !open) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const { ok, data } = await fetchStaffLinkOptions(query);
        if (cancelled) return;
        if (ok && data?.ok) setOptions(Array.isArray(data.items) ? data.items : []);
        else setOptions([]);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query.trim() ? 200 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, disabled, open]);

  const selected = useMemo(
    () => options.find((o) => o.userId === value) || null,
    [options, value]
  );

  const displayValue = useMemo(() => {
    if (selected) return selected.label || `${selected.displayName} · ${selected.employeeNo || ''}`.trim();
    if (value) return value;
    return '';
  }, [selected, value]);

  const pick = (staff) => {
    if (!staff?.userId) return;
    onChange(staff.userId);
    onStaffPick?.(staff);
    setQuery(staff.label || staff.displayName || '');
    setOpen(false);
  };

  const clear = () => {
    onChange('');
    onStaffPick?.(null);
    setQuery('');
  };

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-teal-200/80 bg-teal-50/30 p-3">
      <label className={CUSTOMER_LABEL}>Link to staff (optional)</label>
      <p className="text-ui-xs text-slate-500 leading-relaxed">
        Only for employees buying on purchase credit. Regular customers do not need this.
      </p>
      <div className="relative">
        <input
          type="search"
          value={open ? query : displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value.trim()) clear();
          }}
          onFocus={() => !disabled && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
          disabled={disabled}
          placeholder="Search staff name or ID…"
          autoComplete="off"
          className={CUSTOMER_FIELD}
        />
        {!disabled && value ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ui-xs font-bold uppercase text-rose-600 hover:text-rose-700"
          >
            Clear
          </button>
        ) : null}
        {!disabled && open ? (
          <ul
            className="absolute left-0 right-0 top-full z-[70] mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
            onMouseDown={(e) => e.preventDefault()}
          >
            {loading ? (
              <li className="px-3 py-2 text-xs text-slate-500">Loading staff…</li>
            ) : options.length ? (
              options.map((staff) => {
                const taken =
                  staff.salesCustomerId &&
                  staff.salesCustomerId !== customerId &&
                  staff.userId !== value;
                return (
                  <li key={staff.userId}>
                    <button
                      type="button"
                      disabled={Boolean(taken)}
                      onClick={() => pick(staff)}
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-xs hover:bg-teal-50 disabled:opacity-50"
                    >
                      <span className="font-semibold text-zarewa-teal">
                        {staff.label || staff.displayName}
                      </span>
                      <span className="text-ui-xs text-slate-500">
                        {staff.employeeNo ? `${staff.employeeNo} · ` : ''}
                        {staff.branchId || '—'}
                        {taken ? ` · linked to ${staff.salesCustomerId}` : ''}
                      </span>
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-2 text-xs text-slate-500">No staff match — try employee ID or name.</li>
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
