import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AiAskButton } from '../AiAskButton';
import { ZareHelpButton } from '../ZareHelpButton';

const STORAGE_KEY = 'zarewa-hr-hub-tools-expanded';

const AI_BTN_CLASS =
  'inline-flex min-h-10 items-center gap-2 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-semibold text-zarewa-teal shadow-sm hover:bg-teal-100/70';

/**
 * Standard HR hub toolbar — AI + Zare help alongside page actions (collapsed by default).
 */
export function HrHubToolbar({ hub = 'hr', prompt = '', pageContext = {}, children }) {
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const ctx = { source: 'hr-hub', hub, ...pageContext };

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
      {children}
      {expanded ? (
        <>
          <AiAskButton mode="hr" prompt={prompt} pageContext={ctx} className={AI_BTN_CLASS}>
            Ask AI
          </AiAskButton>
          <ZareHelpButton
            transactionContext={{
              module: 'hr',
              currentPage: hub,
              pathname: typeof window !== 'undefined' ? window.location.pathname : '',
            }}
            prompt={prompt || `I need help with ${hub.replace(/-/g, ' ')} in HR.`}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            compact
          />
          <button
            type="button"
            onClick={toggle}
            className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
          >
            Hide
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={toggle}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          aria-expanded={false}
        >
          <Sparkles size={14} aria-hidden className="text-zarewa-teal" />
          Help & AI
        </button>
      )}
    </div>
  );
}
