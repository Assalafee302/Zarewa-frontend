import React, { useMemo } from 'react';
import { explainApprovalBlock } from '../lib/zareApprovalHints.js';

/**
 * Inline SOP hint when approval is blocked — explains rules; does not approve for the user.
 */
export function ZareApprovalHint({ context = {}, className = '', compact = false }) {
  const explained = useMemo(() => explainApprovalBlock(context), [context]);

  if (!explained.show) return null;

  return (
    <div
      className={`rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-950 ${className}`.trim()}
      role="status"
    >
      <p className="font-bold text-amber-900">{explained.summary}</p>
      {!compact && explained.reasons.length ? (
        <ul className="mt-1.5 list-disc space-y-1 pl-4 leading-snug">
          {explained.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
