import React, { useMemo, useState } from 'react';
import { ExecWorkTrayPanel } from '../../components/exec/ExecWorkTrayPanel';
import { ExecAttentionList } from '../../components/exec/ExecAttentionList';
import { ExecutiveWorkItemReviewModal } from '../../components/exec/ExecutiveWorkItemReviewModal';
import { explainAttentionItem } from '../../shared/lib/attentionRules.js';
import { formatNgn } from '../../Data/mockData';

/**
 * DEV-only gallery (/preview/attention): the MD "Needs your attention" list and the opened record,
 * before (?legacy view) and after. Sample records only — no API.
 */

const DAY = 86400000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString();

const RAW = [
  {
    id: 'refund:RF-KD-26-9612',
    kind: 'refunds',
    priority: 'high',
    approvalTier: 'md_only',
    approvalTierLabel: 'MD only',
    title: 'RF-KD-26-9612',
    branchName: 'Kaduna (HQ)',
    amountNgn: 1_408_453,
    atIso: iso(3),
    ageLabel: '3d',
    refundId: 'RF-KD-26-9612',
    quotationRef: 'QT-KD-26-1702',
    canAct: true,
    reviewContext: {
      refundId: 'RF-KD-26-9612',
      quotationRef: 'QT-KD-26-1702',
      reasons: ['Pending refund approval', 'Above executive refund threshold'],
      row: {
        refund_id: 'RF-KD-26-9612',
        customer_name: 'Musa Bello (sample)',
        quotation_ref: 'QT-KD-26-1702',
        amount_ngn: 1_408_453,
        reason_category: '["Unproduced meterage"]',
        requested_at_iso: iso(3),
        status: 'Pending',
      },
    },
  },
  {
    id: 'clearance:QT-KD-26-1688',
    kind: 'clearance',
    priority: 'medium',
    approvalTier: 'shared',
    approvalTierLabel: 'BM / Finance',
    title: 'QT-KD-26-1688',
    branchName: 'Kaduna (HQ)',
    amountNgn: 100_000,
    atIso: iso(11),
    ageLabel: '11d',
    quotationRef: 'QT-KD-26-1688',
    canAct: true,
    reviewContext: {
      quotationRef: 'QT-KD-26-1688',
      reasons: ['Paid quotation not manager-cleared', 'Aging 7+ days'],
      row: { id: 'QT-KD-26-1688', customer_name: 'Grace Okafor (sample)', total_ngn: 100_000, paid_ngn: 140_000, date_iso: iso(11).slice(0, 10) },
    },
  },
  {
    id: 'dual_control:RF-KD-26-9590:same_approver_payer',
    kind: 'governance',
    priority: 'high',
    approvalTier: 'md_only',
    approvalTierLabel: 'MD only',
    title: 'RF-KD-26-9590',
    branchName: 'Kaduna (HQ)',
    amountNgn: 52_000,
    ageLabel: '—',
    refundId: 'RF-KD-26-9590',
    canAct: true,
    reviewContext: {
      refundId: 'RF-KD-26-9590',
      reasons: ['Dual-control segregation', 'Approver = payer'],
      row: {
        kind: 'same_approver_payer',
        refundId: 'RF-KD-26-9590',
        amountNgn: 52_000,
        requestedBy: 'Sales desk',
        approvedBy: 'Abdulrahman',
        paidBy: 'Abdulrahman',
        customerName: 'Ibrahim Sani (sample)',
      },
    },
  },
  {
    id: 'payment:PR-KD-26-0412',
    kind: 'payments',
    priority: 'high',
    approvalTier: 'md_only',
    approvalTierLabel: 'MD only',
    title: 'PR-KD-26-0412',
    branchName: 'Kaduna (HQ)',
    amountNgn: 750_000,
    atIso: iso(2),
    ageLabel: '2d',
    requestId: 'PR-KD-26-0412',
    canAct: true,
    reviewContext: {
      requestId: 'PR-KD-26-0412',
      reasons: ['Pending payment approval', 'Large payment'],
      row: {
        request_id: 'PR-KD-26-0412',
        amount_requested_ngn: 750_000,
        description: 'Transformer repair',
        expense_category: 'Maintenance',
        request_date: iso(2).slice(0, 10),
        attachment_present: false,
        payee_name: 'Sample Electrical Ltd',
      },
    },
  },
  {
    id: 'payment_gate:PRO-KD-26-1401',
    kind: 'governance',
    priority: 'high',
    approvalTier: 'shared',
    approvalTierLabel: 'BM / Finance',
    title: 'QT-KD-26-1650',
    branchName: 'Kaduna (HQ)',
    amountNgn: 600_000,
    atIso: iso(7),
    ageLabel: '7d',
    quotationRef: 'QT-KD-26-1650',
    jobId: 'PRO-KD-26-1401',
    canAct: true,
    reviewContext: {
      quotationRef: 'QT-KD-26-1650',
      jobId: 'PRO-KD-26-1401',
      reasons: ['Payment gate breach on completed production', 'Only 40% paid (70% required)'],
      row: { jobId: 'PRO-KD-26-1401', quotationRef: 'QT-KD-26-1650', totalNgn: 600_000, paidNgn: 240_000, paidPct: 40, outstandingNgn: 360_000, completedAtIso: iso(7), total_ngn: 600_000, paid_ngn: 240_000 },
    },
  },
  {
    id: 'conversion:PRO-KD-26-1422',
    kind: 'conversions',
    priority: 'medium',
    approvalTier: 'shared',
    approvalTierLabel: 'BM / Finance',
    title: 'PRO-KD-26-1422',
    branchName: 'Yola',
    amountNgn: null,
    atIso: iso(4),
    ageLabel: '4d',
    jobId: 'PRO-KD-26-1422',
    canAct: true,
    reviewContext: {
      jobId: 'PRO-KD-26-1422',
      quotationRef: 'QT-YL-26-0311',
      reasons: ['Conversion review required', 'Conversion HIGH'],
      row: { job_id: 'PRO-KD-26-1422', quotation_ref: 'QT-YL-26-0311', actual_meters: 120, actual_weight_kg: 450, conversion_alert_state: 'High' },
    },
  },
  {
    id: 'missing_bm:BR-YL',
    kind: 'governance',
    priority: 'high',
    approvalTier: 'md_only',
    approvalTierLabel: 'MD only',
    title: 'No Branch Manager — Yola',
    branchName: 'Yola',
    amountNgn: null,
    ageLabel: '—',
    integrityKind: 'missing_branch_manager',
    canAct: true,
    reviewContext: {
      integrityKind: 'missing_branch_manager',
      reasons: ['Data integrity — missing key role', 'Complaints and other branch workflows fall back without a BM owner'],
      row: { integrityKind: 'missing_branch_manager', branchId: 'BR-YL', branchName: 'Yola' } },
  },
];

export default function AttentionGallery() {
  const [mode, setMode] = useState(() =>
    new URLSearchParams(window.location.search).get('legacy') === '1' ? 'before' : 'after'
  );
  const [open, setOpen] = useState(null);
  const legacy = mode === 'before';
  const items = useMemo(() => RAW.map((it) => ({ ...it, attention: explainAttentionItem(it) })), []);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-slate-900">MD — Needs your attention</h1>
            <p className="text-xs text-slate-500">Dev preview · sample records, no live data</p>
          </div>
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white" role="group">
            {['before', 'after'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs font-semibold ${mode === m ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
              >
                {m === 'before' ? 'Before' : 'After'}
              </button>
            ))}
          </div>
        </header>

        {legacy ? (
          <ExecWorkTrayPanel
            compact
            title="Needs your attention"
            subtitle="Top priority items — review and approve here without opening Sales, Finance, or HR."
            items={items}
            mdOnlyCount={4}
            sharedCount={3}
            onReview={setOpen}
            formatNgn={formatNgn}
            legacy
          />
        ) : (
          <ExecAttentionList items={items} onOpen={setOpen} formatNgn={formatNgn} />
        )}
      </div>

      <ExecutiveWorkItemReviewModal
        item={open}
        isOpen={Boolean(open)}
        onClose={() => setOpen(null)}
        legacy={legacy}
        relatedItems={items}
      />
    </div>
  );
}
