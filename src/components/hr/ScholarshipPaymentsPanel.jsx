import React from 'react';
import { Link } from 'react-router-dom';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';
import { PAYMENT_KIND_ICON } from '../../lib/scholarshipUi';
import { ScholarshipPaymentTracker } from './ScholarshipPaymentTracker';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';

const STATUS_PILL = {
  paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  approved: 'bg-sky-50 text-sky-800 border-sky-200',
  exported: 'bg-sky-50 text-sky-800 border-sky-200',
  scheduled: 'bg-violet-50 text-violet-800 border-violet-200',
  submitted: 'bg-amber-50 text-amber-900 border-amber-200',
  finance_review: 'bg-amber-50 text-amber-900 border-amber-200',
  md_review: 'bg-amber-50 text-amber-900 border-amber-200',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
};

/**
 * @param {{ payments?: object[]; showBackLink?: boolean; emptyTitle?: string; emptyHint?: string; hubTitle?: string; hubPath?: string }} props
 */
export default function ScholarshipPaymentsPanel({
  payments = [],
  showBackLink = false,
  emptyTitle = FAMILY_BENEFITS.paymentsEmpty,
  emptyHint = FAMILY_BENEFITS.paymentsEmptyHint,
  hubTitle = FAMILY_BENEFITS.hubTitle,
  hubPath = HR_SELF_SERVICE_PATH.school,
}) {
  if (!payments.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-800">{emptyTitle}</p>
        <p className="mt-2 text-sm text-slate-500">{emptyHint}</p>
        {showBackLink ? (
          <Link
            to={hubPath}
            className="mt-4 inline-flex text-sm font-semibold text-violet-700 hover:underline"
          >
            ← Back to {hubTitle}
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showBackLink ? (
        <Link to={hubPath} className="text-sm font-semibold text-violet-700 hover:underline">
          ← {hubTitle}
        </Link>
      ) : null}
      <ul className="space-y-3">
        {payments.map((pmt) => {
          const statusKey = String(pmt.status || 'pending').toLowerCase();
          const pill = STATUS_PILL[statusKey] || 'bg-slate-50 text-slate-700 border-slate-200';
          return (
            <li key={pmt.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-black text-slate-900">
                    <span aria-hidden>{PAYMENT_KIND_ICON[pmt.kind] || '💰'}</span>
                    {pmt.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {pmt.academicSession ? `${pmt.academicSession} · ` : ''}
                    {pmt.periodYyyymm ? formatPeriodYyyymm(pmt.periodYyyymm) : ''}
                    {pmt.paidAtIso ? ` · Paid ${String(pmt.paidAtIso).slice(0, 10)}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black tabular-nums text-slate-900">{formatNgn(pmt.amountNgn)}</p>
                  <span className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${pill}`}>
                    {pmt.statusLabel || statusKey}
                  </span>
                </div>
              </div>
              {pmt.tracker && statusKey !== 'paid' ? (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <ScholarshipPaymentTracker tracker={pmt.tracker} compact />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
