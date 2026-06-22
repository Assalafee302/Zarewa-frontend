import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { fetchStaffPurchaseCredits } from '../../lib/hrStaffPurchaseCredit';
import { HR_STAFF_CREDIT_SECTION } from '../../lib/hrRoutes';

const LOAN_REVIEW_STATUSES = new Set(['submitted', 'branch_manager_review', 'hr_review', 'gm_hr_review']);

function SummaryChip({ label, count, active, onClick }) {
  if (!count && !active) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-left text-xs font-semibold transition-colors ${
        active
          ? 'border-[#134e4a] bg-[#134e4a] text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-700 hover:border-[#134e4a]/30 hover:bg-teal-50/60'
      }`}
    >
      <span className="tabular-nums">{count}</span> {label}
    </button>
  );
}

/**
 * At-a-glance workload for the staff loans & credit hub.
 */
export function HrStaffCreditSummaryStrip() {
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get('section') || HR_STAFF_CREDIT_SECTION.LOAN_REQUESTS;
  const [loanPending, setLoanPending] = useState(0);
  const [purchasePending, setPurchasePending] = useState(0);
  const [loading, setLoading] = useState(true);

  const goSection = useCallback(
    (next) => {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set('section', next);
        return p;
      });
    },
    [setSearchParams]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [loanRes, purchaseRes] = await Promise.all([
      apiFetch('/api/hr/requests?scope=all&kind=loan'),
      fetchStaffPurchaseCredits({ status: 'pending_approval' }),
    ]);
    setLoading(false);
    if (loanRes.ok && loanRes.data?.ok) {
      const pending = (loanRes.data.requests || []).filter((r) => LOAN_REVIEW_STATUSES.has(r.status)).length;
      setLoanPending(pending);
    } else {
      setLoanPending(0);
    }
    if (purchaseRes.ok && purchaseRes.data?.ok) {
      setPurchasePending((purchaseRes.data.items || []).length);
    } else {
      setPurchasePending(0);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !loanPending && !purchasePending) {
    return <p className="text-xs text-slate-500">Loading workload summary…</p>;
  }

  if (!loanPending && !purchasePending) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 w-full sm:w-auto sm:mr-1">Pending</p>
      <SummaryChip
        label="loan applications"
        count={loanPending}
        active={section === HR_STAFF_CREDIT_SECTION.LOAN_REQUESTS}
        onClick={() => goSection(HR_STAFF_CREDIT_SECTION.LOAN_REQUESTS)}
      />
      <SummaryChip
        label="purchase credits (MD)"
        count={purchasePending}
        active={section === HR_STAFF_CREDIT_SECTION.PURCHASE_CREDIT}
        onClick={() => goSection(HR_STAFF_CREDIT_SECTION.PURCHASE_CREDIT)}
      />
    </div>
  );
}
