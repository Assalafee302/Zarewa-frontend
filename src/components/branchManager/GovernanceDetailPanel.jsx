import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Factory,
  FileText,
  ShieldAlert,
  Users,
  UserX,
} from 'lucide-react';
import {
  DecisionActionBar,
  DecisionBand,
  DecisionChip,
  DecisionWhatNext,
} from '../management/DecisionSurface';
import { IntelStat } from '../management/managementIntelUi';
import { formatPersonName } from '../../lib/formatPersonName';

function governanceSubtype(item) {
  const id = String(item?.id || '');
  if (id.startsWith('dual_control:') || item?.refundId || item?.row?.kind?.startsWith('same_')) {
    return 'dual_control';
  }
  if (id.startsWith('payment_gate:') || item?.jobId || item?.row?.paidPct != null) {
    return 'payment_gate';
  }
  if (id.startsWith('missing_bm:') || item?.row?.integrityKind === 'missing_branch_manager') {
    return 'missing_bm';
  }
  return 'general';
}

/**
 * High-clarity governance risk review — explains dual-control, payment-gate breaches, and missing leadership.
 */
export function GovernanceDetailPanel({
  item,
  formatNgn,
  onClose,
  onOpenRefund,
  onOpenQuotation,
  onOpenProductionQc,
  navigate,
}) {
  const subtype = useMemo(() => governanceSubtype(item), [item]);
  const reasons = Array.isArray(item?.reasons) ? item.reasons.filter(Boolean) : [];
  const row = item?.row || {};
  const asMoney = typeof formatNgn === 'function' ? formatNgn : (v) => `₦${Number(v || 0).toLocaleString('en-NG')}`;

  if (!item) return null;

  if (subtype === 'dual_control') {
    const refundId = item.refundId || row.refundId || item.title || 'Refund';
    const quotationRef = item.quotationRef || row.quotationRef || '';
    const customerName = row.customerName || '';
    const amount = Number(row.amountNgn ?? item.amountNgn) || 0;
    const isSameRequesterApprover = row.kind === 'same_requester_approver';
    const isSameApproverPayer = row.kind === 'same_approver_payer';
    const status = row.status || 'Approved';

    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <DecisionBand
          tone="risk"
          eyebrow="Dual-Control Segregation Alert"
          title={refundId}
          subtitle={customerName ? `${customerName}${quotationRef ? ` · Quote ${quotationRef}` : ''}` : (quotationRef ? `Quote ${quotationRef}` : 'Customer refund')}
          aside={
            amount > 0 ? (
              <>
                <p className="text-ui-xs font-bold uppercase text-slate-400">Refund amount</p>
                <p className="text-xl font-black tabular-nums text-rose-700">{asMoney(amount)}</p>
                <p className="text-ui-xs font-semibold text-slate-500 uppercase tracking-wider">{status}</p>
              </>
            ) : null
          }
          meta={
            <>
              <DecisionChip tone="rose">Segregation of duties breach</DecisionChip>
              <DecisionChip tone="amber">
                {isSameRequesterApprover ? 'Requester = Approver' : isSameApproverPayer ? 'Approver = Payer' : 'Role overlap'}
              </DecisionChip>
            </>
          }
        >
          <p className="mt-2 text-xs leading-relaxed text-slate-700">
            Internal financial controls enforce strict three-way segregation across refund lifecycles: a refund cannot be authorized by the person who submitted it, nor disbursed by the person who approved it.
          </p>
        </DecisionBand>

        {reasons.length > 0 ? (
          <div className="rounded-xl border border-rose-200/90 bg-rose-50/70 p-3 space-y-1.5">
            <p className="text-ui-xs font-black uppercase tracking-widest text-rose-900">Control exception flags</p>
            <ul className="space-y-1">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs font-medium text-rose-900">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-600" aria-hidden />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* 3-way segregation role audit */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-sm">
          <p className="text-ui-xs font-black uppercase tracking-widest text-slate-500">
            Lifecycle actor segregation audit
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div
              className={`rounded-lg border p-2.5 ${
                isSameRequesterApprover ? 'border-amber-300 bg-amber-50/80 ring-2 ring-amber-400/40' : 'border-slate-200 bg-slate-50/70'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">1. Initiated by</span>
              <p className="mt-1 font-bold text-xs text-slate-900 truncate">
                {row.requestedBy ? formatPersonName(row.requestedBy) : 'Recorded'}
              </p>
              <p className="text-[11px] text-slate-500">Refund request</p>
            </div>

            <div
              className={`rounded-lg border p-2.5 ${
                isSameRequesterApprover || isSameApproverPayer
                  ? 'border-amber-300 bg-amber-50/80 ring-2 ring-amber-400/40'
                  : 'border-slate-200 bg-slate-50/70'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">2. Authorized by</span>
              <p className="mt-1 font-bold text-xs text-slate-900 truncate">
                {row.approvedBy ? formatPersonName(row.approvedBy) : 'Recorded'}
              </p>
              <p className="text-[11px] text-slate-500">Approval decision</p>
            </div>

            <div
              className={`rounded-lg border p-2.5 ${
                isSameApproverPayer ? 'border-amber-300 bg-amber-50/80 ring-2 ring-amber-400/40' : 'border-slate-200 bg-slate-50/70'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">3. Disbursed by</span>
              <p className="mt-1 font-bold text-xs text-slate-900 truncate">
                {row.paidBy ? formatPersonName(row.paidBy) : 'Pending payout'}
              </p>
              <p className="text-[11px] text-slate-500">Treasury payout</p>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200/90 px-3 py-2 text-xs text-amber-950 leading-relaxed">
            {isSameRequesterApprover ? (
              <p>
                <strong>Self-approval violation:</strong> The user who submitted this refund is also listed as the approving manager. An independent supervisor (Branch Manager, MD, or designated finance officer) must review and authorize the transaction.
              </p>
            ) : isSameApproverPayer ? (
              <p>
                <strong>Self-disbursement violation:</strong> The officer who approved this refund also executed the treasury payout. Custody and authorization duties must remain segregated to safeguard company funds.
              </p>
            ) : (
              <p>
                Two or more critical lifecycle duties were handled by the same individual. Verify underlying quotation receipts and ensure independent counter-signing.
              </p>
            )}
          </div>
        </div>

        <DecisionWhatNext title="Recommended management action">
          Open the refund record to inspect supporting documents, bank receipts, and deduction calculations. If unauthorized, hold payout immediately. If approved in error, reassign the approval to an independent officer.
        </DecisionWhatNext>

        <DecisionActionBar hint="Actions take effect in the live workflow.">
          <div className="flex flex-col gap-2 sm:flex-row">
            {refundId ? (
              <button
                type="button"
                onClick={() => onOpenRefund?.(refundId)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-zarewa-teal px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:brightness-105"
              >
                <ExternalLink size={15} />
                Open refund review
              </button>
            ) : null}
            {quotationRef ? (
              <button
                type="button"
                onClick={() => onOpenQuotation?.(quotationRef)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50"
              >
                <FileText size={15} />
                View quotation
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </DecisionActionBar>
      </div>
    );
  }

  if (subtype === 'payment_gate') {
    const qref = item.quotationRef || row.quotationRef || '';
    const jobId = item.jobId || row.jobId || '';
    const customerName = row.customerName || '';
    const productName = row.productName || '';
    const totalNgn = Number(row.totalNgn ?? item.amountNgn) || 0;
    const paidNgn = Number(row.paidNgn) || 0;
    const outstandingNgn = Number(row.outstandingNgn) || Math.max(0, totalNgn - paidNgn);
    const paidPct = row.paidPct != null ? row.paidPct : (totalNgn > 0 ? Math.round((paidNgn / totalNgn) * 100) : 0);
    const actualMeters = row.actualMeters || null;

    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <DecisionBand
          tone="production"
          eyebrow="Payment Gate Exception · Completed Job"
          title={qref ? `Quotation ${qref}` : (jobId ? `Job ${jobId}` : 'Payment Gate Alert')}
          subtitle={customerName ? `${customerName}${productName ? ` · ${productName}` : ''}` : (productName || 'Production run completed')}
          aside={
            totalNgn > 0 ? (
              <>
                <p className="text-ui-xs font-bold uppercase text-slate-400">Order total</p>
                <p className="text-xl font-black tabular-nums text-slate-900">{asMoney(totalNgn)}</p>
                <p className="text-ui-xs font-semibold text-rose-700">
                  {paidPct}% paid · {asMoney(outstandingNgn)} due
                </p>
              </>
            ) : null
          }
          meta={
            <>
              <DecisionChip tone="amber">Uncollected balance</DecisionChip>
              <DecisionChip tone="rose">Gate breached without override</DecisionChip>
            </>
          }
        >
          <p className="mt-2 text-xs leading-relaxed text-amber-950">
            A production job was completed while the linked quotation remains below the company 70% payment threshold, and without an authorized Branch Manager production override on record.
          </p>
        </DecisionBand>

        {reasons.length > 0 ? (
          <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-3 space-y-1.5">
            <p className="text-ui-xs font-black uppercase tracking-widest text-amber-900">Why this is flagged</p>
            <ul className="space-y-1">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs font-medium text-amber-950">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Fact grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <IntelStat label="Order total" value={asMoney(totalNgn)} />
          <IntelStat label="Paid on file" value={`${asMoney(paidNgn)} (${paidPct}%)`} accent />
          <IntelStat label="Outstanding" value={asMoney(outstandingNgn)} />
          <IntelStat label="Production" value={actualMeters ? `${actualMeters.toLocaleString()} m` : (jobId || 'Completed')} />
        </div>

        {/* Critical risk warning */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-2 text-xs text-rose-950">
          <p className="font-bold text-sm text-rose-900 flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-600" />
            Dispatch Hold: Do not release finished goods
          </p>
          <p className="leading-relaxed">
            Roofing sheets have been rolled, but <strong>{asMoney(outstandingNgn)}</strong> remains unpaid. To prevent bad debt, Store and Dispatch personnel must hold the material until the customer settles the balance or an Executive Delivery Credit Exception is stamped.
          </p>
        </div>

        <DecisionWhatNext title="Required management steps">
          1. Follow up with the sales rep or customer to collect payment before collection/loading.
          <br />
          2. Inspect why the production roll began without prior Branch Manager override.
          <br />
          3. If the customer requested credit terms, record an official Delivery Credit request.
        </DecisionWhatNext>

        <DecisionActionBar hint="Review quotation or QC records to resolve.">
          <div className="flex flex-col gap-2 sm:flex-row">
            {qref ? (
              <button
                type="button"
                onClick={() => onOpenQuotation?.(qref)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-zarewa-teal px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:brightness-105"
              >
                <FileText size={15} />
                Open quotation in Sales
              </button>
            ) : null}
            {jobId ? (
              <button
                type="button"
                onClick={() => onOpenProductionQc?.(jobId)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50"
              >
                <Factory size={15} />
                Inspect production QC
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </DecisionActionBar>
      </div>
    );
  }

  if (subtype === 'missing_bm') {
    const branchName = row.branchName || item.branchName || row.branchId || item.branchId || 'Branch';
    const branchId = row.branchId || item.branchId || '';

    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <DecisionBand
          tone="risk"
          eyebrow="Governance & Branch Leadership"
          title={`No Branch Manager — ${branchName}`}
          subtitle={branchId ? `Branch ID: ${branchId}` : 'Operating without leadership role'}
          aside={
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-right">
              <span className="text-ui-xs font-black uppercase tracking-wide text-rose-800">Unassigned</span>
              <p className="text-xs font-semibold text-rose-900">Leadership gap</p>
            </div>
          }
          meta={
            <>
              <DecisionChip tone="rose">Critical oversight gap</DecisionChip>
              <DecisionChip tone="amber">Approval bottleneck</DecisionChip>
            </>
          }
        >
          <p className="mt-2 text-xs leading-relaxed text-slate-700">
            This branch has active operations, staff, and customer orders, but no user assigned with the Branch Manager role.
          </p>
        </DecisionBand>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-sm">
          <p className="text-ui-xs font-black uppercase tracking-widest text-slate-500">Operational impact</p>
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
            <div className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
              <UserX size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <strong className="text-slate-900">Branch approvals stalled:</strong> Quotation clearance, below-floor price exceptions, and local petty cash requests have no designated authority on site.
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
              <div>
                <strong className="text-slate-900">Customer complaints unowned:</strong> Inquiries, dispute resolutions, and delivery feedback cannot be assigned to branch management.
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
              <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <strong className="text-slate-900">Staff governance bypassed:</strong> Overtime authorizations and attendance exception reviews fall back to central HQ administration.
              </div>
            </div>
          </div>
        </div>

        <DecisionWhatNext title="Resolution">
          Assign a designated user to the <strong>Branch Manager</strong> role (<code className="text-xs font-bold text-slate-900">branch_manager</code> or <code className="text-xs font-bold text-slate-900">sales_manager</code>) for {branchName} in <strong>Settings → Team & access</strong>. This alert will clear automatically.
        </DecisionWhatNext>

        <DecisionActionBar hint="Only administrators or MD can assign branch managers.">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                onClose?.();
                navigate?.('/settings/team');
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-zarewa-teal px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:brightness-105"
            >
              <Users size={15} />
              Open Team & access settings
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </DecisionActionBar>
      </div>
    );
  }

  // General governance alert fallback
  const quoteRef = item.quotationRef || row.quotationRef || '';
  const refundId = item.refundId || row.refundId || '';
  const jobId = item.jobId || row.jobId || '';

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <DecisionBand
        tone="risk"
        eyebrow="Compliance & Governance Alert"
        title={item.title || item.id}
        subtitle={item.subtitle || 'Management review required.'}
        meta={
          <span className="inline-flex items-center gap-1.5 text-rose-800 font-semibold text-xs">
            <ShieldAlert size={16} aria-hidden />
            Requires management attention
          </span>
        }
      />

      {reasons.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5 shadow-sm">
          <p className="text-ui-xs font-black uppercase tracking-widest text-slate-500">Why this is flagged</p>
          <ul className="space-y-1">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <DecisionWhatNext title="Required review">
        Review the flagged record and its operational context to confirm compliance with internal control policies.
      </DecisionWhatNext>

      <DecisionActionBar>
        <div className="flex flex-col gap-2 sm:flex-row">
          {refundId ? (
            <button
              type="button"
              onClick={() => onOpenRefund?.(refundId)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-zarewa-teal px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:brightness-105"
            >
              <ExternalLink size={15} />
              Open refund review
            </button>
          ) : null}
          {quoteRef ? (
            <button
              type="button"
              onClick={() => onOpenQuotation?.(quoteRef)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-zarewa-teal px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:brightness-105"
            >
              <FileText size={15} />
              Open quotation
            </button>
          ) : null}
          {jobId ? (
            <button
              type="button"
              onClick={() => onOpenProductionQc?.(jobId)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-zarewa-teal px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:brightness-105"
            >
              <Factory size={15} />
              Inspect production
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </DecisionActionBar>
    </div>
  );
}
