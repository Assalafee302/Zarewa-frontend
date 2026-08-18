import React from 'react';
import { Sparkles } from 'lucide-react';

const MEMO_ACTIONS = [
  { id: 'make_formal', label: 'Make formal', action: 'make_formal' },
  { id: 'suggest_route', label: 'Route', action: 'suggest_route' },
  { id: 'suggest_expense_category', label: 'Expense category', action: 'suggest_expense_category' },
  { id: 'checklist', label: 'Missing details', action: 'checklist' },
];

/**
 * Writing assist strip inside Compose Memo — local suggestions only; Zare lives in the FAB.
 */
export function ZareComposeAssistBar({
  subject = '',
  body = '',
  onMemoAssist,
  improving = false,
}) {
  const hasText = Boolean(String(subject || '').trim() || String(body || '').trim());

  return (
    <div className="border-b border-teal-100 bg-gradient-to-r from-teal-50/80 to-white px-3 py-2.5 sm:px-4">
      <p className="flex items-center gap-1.5 text-ui-xs font-bold uppercase tracking-wide text-teal-900">
        <Sparkles size={13} aria-hidden />
        Writing assist
        <span className="font-normal normal-case text-teal-800/80">· you still submit</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {MEMO_ACTIONS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            disabled={improving || !hasText}
            onClick={() => onMemoAssist?.(chip.action)}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-ui-xs font-semibold text-slate-700 hover:border-teal-300 hover:bg-teal-50 disabled:opacity-50"
          >
            {chip.label}
          </button>
        ))}
        <button
          type="button"
          disabled={improving || !hasText}
          onClick={() => onMemoAssist?.('improve')}
          className="rounded-full border border-teal-300 bg-teal-800 px-2.5 py-1 text-ui-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
        >
          Improve wording
        </button>
      </div>
    </div>
  );
}
