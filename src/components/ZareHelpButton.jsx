import React from 'react';
import { LifeBuoy } from 'lucide-react';
import { useHelpChat } from '../context/HelpChatContext';
import { HELP_BOT_NAME } from '../lib/helpBotBrand';
import { TRANSACTION_ISSUE_CHIPS } from '../lib/helpTransactionHelp';

/**
 * Opens Zare in transaction help mode with optional issue chips context.
 */
export function ZareHelpButton({
  transactionContext = {},
  prompt = '',
  className = '',
  compact = false,
  children,
}) {
  const help = useHelpChat();
  if (!help?.openZare) return null;

  const label = children || (compact ? HELP_BOT_NAME : 'Need help with this transaction?');

  return (
    <button
      type="button"
      title={`Ask ${HELP_BOT_NAME} — ERP operations assistant`}
      onClick={() => {
        help.openZare({
          mode: 'transaction_help',
          prompt: prompt || 'I need help with this transaction.',
          transactionContext,
          pageContext: {
            module: transactionContext.module,
            currentPage: transactionContext.currentPage,
            pathname: transactionContext.pathname,
          },
          autoSend: Boolean(prompt),
          resetConversation: true,
        });
      }}
      className={
        className ||
        'inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900 hover:bg-teal-100'
      }
    >
      <LifeBuoy size={14} strokeWidth={2} aria-hidden />
      {label}
    </button>
  );
}

export function ZareTransactionIssueChips({ transactionContext = {}, onSelect }) {
  const help = useHelpChat();
  if (!help?.openZare) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {TRANSACTION_ISSUE_CHIPS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:border-teal-300 hover:bg-teal-50"
          onClick={() => {
            onSelect?.(chip);
            help.openZare({
              mode: 'transaction_help',
              issueType: chip.id,
              prompt: `Help me with: ${chip.label}`,
              transactionContext,
              autoSend: true,
              resetConversation: true,
            });
          }}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
