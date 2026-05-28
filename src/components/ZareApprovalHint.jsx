import React, { useMemo } from 'react';
import { LifeBuoy } from 'lucide-react';
import { explainApprovalBlock } from '../lib/zareApprovalHints.js';
import { useHelpChat } from '../context/HelpChatContext';
import { HELP_BOT_NAME } from '../lib/helpBotBrand';

/**
 * Inline hint when approval is blocked or likely to fail.
 */
export function ZareApprovalHint({ context = {}, className = '', compact = false }) {
  const help = useHelpChat();
  const explained = useMemo(() => explainApprovalBlock(context), [context]);

  if (!explained.show) return null;

  return (
    <div
      className={`rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-[11px] text-amber-950 ${className}`.trim()}
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
      {help?.openZare ? (
        <button
          type="button"
          onClick={() =>
            help.openZare({
              prompt: explained.zareQuery,
              mode: 'default',
              pageContext: {
                mode: 'approval_help',
                issueType: 'cannot_approve',
                referenceNo: context.referenceNo,
                documentType: context.documentType,
              },
              autoSend: true,
            })
          }
          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-teal-200 bg-white px-2 py-1 text-[10px] font-bold text-teal-900 hover:bg-teal-50"
        >
          <LifeBuoy size={12} aria-hidden />
          Ask {HELP_BOT_NAME} what to do
        </button>
      ) : null}
    </div>
  );
}
