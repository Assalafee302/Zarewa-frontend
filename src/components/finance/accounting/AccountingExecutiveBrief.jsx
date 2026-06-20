import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../../lib/apiBase';
import { currentAccountingPeriodKey } from '../../../lib/accountingDeskNav';
import { AccountingExecutiveSummary } from './AccountingExecutiveSummary';

/**
 * Compact accounting pack for Executive Command Centre — read-only, links to Accounting Desk.
 * @param {{
 *   branchId?: string | null;
 *   branchScopeLabel?: string;
 *   periodKey?: string;
 * }} props
 */
export function AccountingExecutiveBrief({
  branchId = null,
  branchScopeLabel = '',
  periodKey: periodKeyProp,
}) {
  const periodKey = periodKeyProp || currentAccountingPeriodKey();
  const [loading, setLoading] = useState(false);
  const [openingPosted, setOpeningPosted] = useState(false);
  const [statements, setStatements] = useState(null);
  const [closePack, setClosePack] = useState(null);
  const [exceptionCount, setExceptionCount] = useState(0);

  const branchQ = (() => {
    const p = new URLSearchParams();
    if (branchId === 'ALL') p.set('branchId', 'ALL');
    else if (branchId) p.set('branchId', branchId);
    const s = p.toString();
    return s ? `&${s}` : '';
  })();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const periodSuffix = `period=${encodeURIComponent(periodKey)}${branchQ}`;
      const [obRes, stmtRes, closeRes, exRes] = await Promise.all([
        apiFetch('/api/finance/opening-pack/status'),
        apiFetch(`/api/finance/statements-pack?${periodSuffix}`),
        apiFetch(`/api/finance/month-end-close?${periodSuffix}`),
        apiFetch('/api/finance/trial-exceptions'),
      ]);
      setOpeningPosted(Boolean(obRes.ok && obRes.data?.ok && obRes.data?.posted));
      setStatements(stmtRes.ok && stmtRes.data?.ok ? stmtRes.data : null);
      setClosePack(closeRes.ok && closeRes.data?.ok ? closeRes.data : null);
      if (exRes.ok && exRes.data?.ok) {
        const ex = exRes.data.exceptions || exRes.data;
        const total = [
          ex.pendingReceiptClearance,
          ex.receiptBankAmountMismatch,
          ex.treasuryMovementWithoutFinanceSettlement,
          ex.openDeliveriesWouldBlockOnPayment,
        ].reduce((sum, n) => sum + Number(n || 0), 0);
        setExceptionCount(total);
      } else {
        setExceptionCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, [periodKey, branchQ]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Accounting desk</p>
          <h3 className="mt-1 text-base font-black text-[#134e4a]">GL statements &amp; month-end</h3>
          <p className="mt-1 text-[11px] text-slate-600 max-w-xl">
            Management draft from registers and postings — same pack Head of Accounts uses on Accounting Desk.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a] min-h-9"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link
            to="/accounting?tab=statements"
            className="inline-flex items-center gap-1 rounded-lg bg-[#134e4a] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white hover:brightness-105 min-h-9"
          >
            Open desk
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {loading && !statements ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <AccountingExecutiveSummary
          periodKey={periodKey}
          branchScopeLabel={branchScopeLabel}
          openingPosted={openingPosted}
          statements={statements}
          close={closePack}
          exceptionCount={exceptionCount}
        />
      )}
    </section>
  );
}
