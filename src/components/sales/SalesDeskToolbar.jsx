import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Plus, RefreshCw, Wallet } from 'lucide-react';
import { AiAskButton } from '../AiAskButton';

const ASK_PROMPTS = {
  quotations: 'Which quotations need follow-up now, and what should sales do next?',
  receipts: 'Summarize the receipt and settlement issues visible on this page.',
  cuttinglist: 'Explain cutting-list readiness and the main blockers for production.',
  refund: 'Summarize the refund queue and explain what needs action.',
  customers: 'Summarize customer activity and tell me who needs attention.',
};

const CREATE_LABELS = {
  quotations: 'New quotation',
  receipts: 'Record payment',
  cuttinglist: 'New cutting list',
  refund: 'New refund',
  customers: 'Add customer',
};

const PRIMARY_BTN =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-zarewa-teal text-white px-4 py-2 text-ui-xs font-semibold uppercase tracking-wider shadow-sm hover:brightness-105 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30 focus-visible:ring-offset-2 shrink-0';

const GHOST_BTN =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-ui-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-50 hover:text-zarewa-teal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30';

const SECONDARY_BTN =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-ui-xs font-semibold uppercase tracking-wider text-slate-700 shadow-sm hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30 focus-visible:ring-offset-2 shrink-0';

/**
 * Sales header tools: one filled create, ghost Ask AI, receipts Advance as
 * secondary, admin Recalculate behind More.
 */
export function SalesDeskToolbar({
  salesTab,
  searchQuery,
  createDisabled = false,
  createTitle,
  onCreate,
  onAdvance,
  isAdmin = false,
  reconcileBusy = false,
  onReconcile,
}) {
  const [adminOpen, setAdminOpen] = useState(false);
  const adminRef = useRef(null);

  useEffect(() => {
    if (!adminOpen) return undefined;
    const onDoc = (e) => {
      if (!adminRef.current?.contains(e.target)) setAdminOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setAdminOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [adminOpen]);

  const createLabel = CREATE_LABELS[salesTab];

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
      <AiAskButton
        mode="sales"
        prompt={ASK_PROMPTS[salesTab] || ASK_PROMPTS.quotations}
        pageContext={{
          source: 'sales-page',
          salesTab,
          searchQuery,
        }}
        className={GHOST_BTN}
        title="Ask AI about this sales desk"
      >
        Ask AI
      </AiAskButton>

      {isAdmin ? (
        <div className="relative" ref={adminRef}>
          <button
            type="button"
            className={`${GHOST_BTN} min-w-11`}
            aria-label="Admin tools"
            aria-haspopup="menu"
            aria-expanded={adminOpen}
            onClick={() => setAdminOpen((open) => !open)}
          >
            <MoreHorizontal size={16} strokeWidth={2} aria-hidden />
          </button>
          {adminOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-40 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                disabled={reconcileBusy}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                title="Admin only: rebuild sales_receipt rows from the customer ledger and recalculate quotation paid for this branch scope."
                onClick={() => {
                  setAdminOpen(false);
                  void onReconcile?.();
                }}
              >
                <RefreshCw
                  size={14}
                  strokeWidth={2}
                  className={reconcileBusy ? 'animate-spin shrink-0' : 'shrink-0 text-slate-400'}
                  aria-hidden
                />
                {reconcileBusy ? 'Recalculating…' : 'Recalculate sales data'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {salesTab === 'receipts' ? (
        <button
          type="button"
          onClick={onAdvance}
          className={SECONDARY_BTN}
          title="Payment before quotation — customer deposit / liability"
        >
          <Wallet size={16} strokeWidth={2} aria-hidden />
          Advance
        </button>
      ) : null}

      {createLabel ? (
        <button
          type="button"
          onClick={onCreate}
          disabled={createDisabled}
          title={createTitle}
          className={`${PRIMARY_BTN}${createDisabled ? ' opacity-50 cursor-not-allowed' : ''}`}
        >
          <Plus size={16} strokeWidth={2} aria-hidden /> {createLabel}
        </button>
      ) : null}
    </div>
  );
}
