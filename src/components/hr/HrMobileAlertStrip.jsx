import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';

const TONE_CLS = {
  amber: 'border-amber-200 bg-amber-50/90 text-amber-950',
  teal: 'border-teal-200 bg-teal-50/90 text-teal-950',
  red: 'border-red-200 bg-red-50/90 text-red-950',
  slate: 'border-slate-200 bg-slate-50/90 text-slate-800',
};

/**
 * Mobile-only HR queue badges — mirrors SalesMobileAlertStrip.
 */
export default function HrMobileAlertStrip({ items = [] }) {
  const visible = items.filter((item) => Number(item.count) > 0 || item.always);
  if (!visible.length) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2 lg:hidden" role="status" aria-label="HR alerts">
      <span className="inline-flex w-full items-center gap-1 text-ui-xs font-bold uppercase tracking-wider text-slate-500">
        <Bell size={12} aria-hidden /> Queues
      </span>
      {visible.map((item) => {
        const cls = `inline-flex rounded-lg border px-2.5 py-1.5 text-ui-xs font-semibold ${TONE_CLS[item.tone] || TONE_CLS.slate}`;
        const label = item.count != null ? `${item.count} ${item.label}` : item.label;
        if (item.href) {
          return (
            <Link key={item.key || label} to={item.href} className={`${cls} no-underline`}>
              {label}
            </Link>
          );
        }
        return (
          <span key={item.key || label} className={cls}>
            {label}
          </span>
        );
      })}
    </div>
  );
}
