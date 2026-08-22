import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Sales desk tools column. Always visible on lg+; collapsed behind a toggle on smaller screens
 * so stock check, follow-up, deposits, and refunds stay reachable on a phone.
 */
export function SalesDeskAside({ title = 'Desk tools', open, onOpenChange, children }) {
  return (
    <aside className="lg:col-span-1 flex flex-col gap-3 lg:sticky lg:top-6 lg:gap-5">
      <button
        type="button"
        className="lg:hidden inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal shadow-sm"
        aria-expanded={open}
        onClick={() => onOpenChange?.(!open)}
      >
        <span>{title}</span>
        <ChevronDown
          size={16}
          aria-hidden
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`${open ? 'flex' : 'hidden'} lg:flex flex-col gap-5`}>{children}</div>
    </aside>
  );
}
