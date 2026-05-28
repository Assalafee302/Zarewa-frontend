import React from 'react';
import { LifeBuoy, Sparkles } from 'lucide-react';
import { useHelpChat } from '../../context/HelpChatContext';
import { HELP_BOT_NAME } from '../../lib/helpBotBrand';

const MEMO_ACTIONS = [
  { id: 'classify', label: 'Classify', prompt: 'Which memo type should this use?' },
  { id: 'make_formal', label: 'Make formal', action: 'make_formal' },
  { id: 'suggest_route', label: 'Route', action: 'suggest_route' },
  { id: 'suggest_expense_category', label: 'Expense category', action: 'suggest_expense_category' },
  { id: 'checklist', label: 'Missing details', action: 'checklist' },
  {
    id: 'conversion',
    label: 'Can this be expense?',
    prompt: 'Can this memo become an expense or procurement request? What is missing?',
  },
];

/**
 * Zare assist strip inside Compose Memo — uses memo-assist API + opens Zare for deeper help.
 */
export function ZareComposeAssistBar({
  subject = '',
  body = '',
  memoType = '',
  onMemoAssist,
  improving = false,
  attachmentCount = 0,
}) {
  const help = useHelpChat();
  const hasText = Boolean(String(subject || '').trim() || String(body || '').trim());

  const openZareMemoHelp = (prompt) => {
    help?.openZare?.({
      mode: 'default',
      prompt,
      pageContext: {
        mode: 'memo_compose',
        memoType,
        subjectLength: String(subject || '').length,
        bodyLength: String(body || '').length,
        attachmentCount,
        hasAttachments: attachmentCount > 0,
      },
      autoSend: Boolean(prompt),
    });
  };

  return (
    <div className="border-b border-teal-100 bg-gradient-to-r from-teal-50/80 to-white px-3 py-2.5 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-teal-900">
          <LifeBuoy size={13} aria-hidden />
          Ask {HELP_BOT_NAME}
          <span className="font-normal normal-case text-teal-800/80">· memo assistant</span>
        </p>
        <button
          type="button"
          disabled={improving}
          onClick={() => openZareMemoHelp('Help me write this memo professionally and choose the right category.')}
          className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-white px-2 py-1 text-[10px] font-semibold text-teal-900 hover:bg-teal-50 disabled:opacity-50"
        >
          <Sparkles size={11} aria-hidden />
          Open {HELP_BOT_NAME}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {MEMO_ACTIONS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            disabled={improving || (chip.action && !hasText)}
            onClick={() => {
              if (chip.action && onMemoAssist) {
                onMemoAssist(chip.action);
                return;
              }
              if (chip.prompt) {
                openZareMemoHelp(chip.prompt);
              }
            }}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:border-teal-300 hover:bg-teal-50 disabled:opacity-50"
          >
            {chip.label}
          </button>
        ))}
        <button
          type="button"
          disabled={improving || !hasText}
          onClick={() => onMemoAssist?.('improve')}
          className="rounded-full border border-teal-300 bg-teal-800 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
        >
          Improve wording
        </button>
      </div>
    </div>
  );
}
