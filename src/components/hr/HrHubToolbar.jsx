import React from 'react';
import { AiAskButton } from '../AiAskButton';
import { ZareHelpButton } from '../ZareHelpButton';

const AI_BTN_CLASS =
  'inline-flex items-center gap-2 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-semibold text-[#134e4a] shadow-sm hover:bg-teal-100/70';

/**
 * Standard HR hub toolbar — AI + Zare help alongside page actions.
 */
export function HrHubToolbar({ hub = 'hr', prompt = '', pageContext = {}, children }) {
  const ctx = { source: 'hr-hub', hub, ...pageContext };
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
      {children}
      <AiAskButton mode="hr" prompt={prompt} pageContext={ctx} className={AI_BTN_CLASS}>
        Ask AI
      </AiAskButton>
      <ZareHelpButton
        transactionContext={{ module: 'hr', currentPage: hub, pathname: typeof window !== 'undefined' ? window.location.pathname : '' }}
        prompt={prompt || `I need help with ${hub.replace(/-/g, ' ')} in HR.`}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        compact
      />
    </div>
  );
}
