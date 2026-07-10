import React from 'react';
import { HR_REQUEST_SCOPE_COUNT_KEY } from '../../lib/hrDashboardCounts';

const SCOPE_LABELS = {
  mine: 'My requests',
  hr_queue: 'HR review',
  endorse_queue: 'Branch endorsements',
  gm_queue: 'GM HR final',
  all: 'All requests',
};

/**
 * Segmented scope filter with queue counts — mirrors Sales payment-status filter.
 */
export function HrRequestScopeFilter({ allowedScopes = [], scope, onChange, counts = {}, loading = false }) {
  if (!allowedScopes.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Request queue">
      {allowedScopes.map((s) => {
        const countKey = HR_REQUEST_SCOPE_COUNT_KEY[s];
        const count = countKey ? counts[countKey] : null;
        const active = scope === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-ui-xs font-bold uppercase tracking-wide transition-colors ${
              active
                ? 'border-zarewa-teal/30 bg-zarewa-teal text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {SCOPE_LABELS[s] || s}
            {count != null && count > 0 ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-ui-xs tabular-nums ${
                  active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                }`}
              >
                {loading ? '…' : count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
