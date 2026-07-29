import React from 'react';
import { refundPayeeDedupeKey } from '../../lib/refundPayeeRecentAccounts.js';

/**
 * Shared recent-payee chips (same data shape as refund create).
 * Light theme for expense / office forms; dark for refund intel modal.
 *
 * @param {{
 *   suggestions: Array<{ payeeName: string; payeeAccountNo: string; payeeBankName: string; source?: string }>;
 *   onSelect: (s: { payeeName: string; payeeAccountNo: string; payeeBankName: string }) => void;
 *   variant?: 'light' | 'dark';
 *   heading?: string;
 * }} props
 */
export function RecentPayeeSuggestionChips({
  suggestions = [],
  onSelect,
  variant = 'light',
  heading = 'Frequent accounts (this device)',
}) {
  if (!suggestions.length) return null;

  const isDark = variant === 'dark';
  return (
    <div className="space-y-1.5">
      <p
        className={`text-ui-xs font-semibold uppercase tracking-wide ${
          isDark ? 'text-slate-500' : 'text-slate-500'
        }`}
      >
        {heading}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s, idx) => (
          <button
            key={`payee-sug-${idx}-${refundPayeeDedupeKey(s)}`}
            type="button"
            onClick={() =>
              onSelect?.({
                payeeName: s.payeeName,
                payeeAccountNo: s.payeeAccountNo,
                payeeBankName: s.payeeBankName,
              })
            }
            className={
              isDark
                ? 'max-w-full rounded-lg border border-slate-600/90 bg-slate-900/50 px-2 py-1 text-left text-ui-xs font-medium text-slate-200 hover:border-sky-500/50 hover:bg-slate-900 transition-colors'
                : 'max-w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-left text-ui-xs font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50/60 transition-colors'
            }
            title={`${s.payeeName} · ${s.payeeBankName} · ${s.payeeAccountNo}`}
          >
            <span className={isDark ? 'font-bold text-slate-100' : 'font-bold text-slate-900'}>
              {s.payeeName}
            </span>
            <span className="text-slate-500"> · </span>
            <span className="text-slate-500">{s.payeeBankName}</span>
            <span className="text-slate-500"> · </span>
            <span
              className={`font-mono tabular-nums ${isDark ? 'text-sky-300/95' : 'text-zarewa-teal'}`}
            >
              {s.payeeAccountNo}
            </span>
            {s.source === 'recent' ? (
              <span
                className={`ml-1 text-ui-xs font-bold uppercase ${
                  isDark ? 'text-emerald-400/90' : 'text-emerald-700'
                }`}
              >
                saved
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
