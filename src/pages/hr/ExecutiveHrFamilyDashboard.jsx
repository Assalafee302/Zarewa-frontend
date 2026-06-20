import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchExecutiveFamilyDashboard } from '../../lib/hrExecutiveBenefits';
import { formatNgn } from '../../lib/hrFormat';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { HR_EMPLOYEE_REGISTERS } from '../../lib/hrRoutes';
import { paymentHealthMeta } from '../../lib/scholarshipUi';

const HEALTH_BORDER = {
  on_track: 'border-emerald-200',
  action_needed: 'border-amber-200',
  overdue: 'border-rose-200',
  setup_incomplete: 'border-slate-200',
};

function KpiCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function ChildCard({ child }) {
  const health = paymentHealthMeta(child.paymentHealth);
  const border = HEALTH_BORDER[child.paymentHealth] || HEALTH_BORDER.on_track;

  return (
    <article className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${border}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-black text-slate-900">{child.displayName}</h3>
          <p className="mt-0.5 text-sm text-slate-600">
            {child.schoolName || 'School not set'}
            {child.classLevel ? ` · ${child.classLevel}` : ''}
          </p>
          {child.linkedExecutiveLabel ? (
            <p className="mt-1 inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800">
              {child.linkedExecutiveLabel}
              {child.beneficiaryTypeLabel ? ` · ${child.beneficiaryTypeLabel}` : ''}
            </p>
          ) : null}
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${health.className}`}>
          {health.label}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-sky-100 bg-sky-50/50 px-3 py-2.5">
          <dt className="text-xs font-black uppercase tracking-widest text-sky-700">
            {FAMILY_BENEFITS.stipendLabel}
          </dt>
          <dd className="mt-1 text-base font-black tabular-nums text-slate-900">
            {child.allowance?.monthlyAmountNgn != null ? formatNgn(child.allowance.monthlyAmountNgn) : '—'}
          </dd>
          <dd className="mt-0.5 text-xs text-slate-600">
            {child.allowance?.statusLabel || 'Not set up'}
            {child.allowance?.lastPaidPeriod ? ` · Last ${child.allowance.lastPaidPeriod}` : ''}
          </dd>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2.5">
          <dt className="text-xs font-black uppercase tracking-widest text-violet-700">
            {FAMILY_BENEFITS.schoolFeesLabel}
          </dt>
          {child.schoolFees?.pending ? (
            <>
              <dd className="mt-1 text-sm font-bold text-slate-900">
                {child.schoolFees.pending.term || 'Fee'} · {child.schoolFees.pending.statusLabel}
              </dd>
              <dd className="mt-0.5 text-xs text-slate-600">
                {child.schoolFees.pending.amountNgn != null
                  ? formatNgn(child.schoolFees.pending.amountNgn)
                  : 'Amount TBC'}
                {child.schoolFees.pending.dueDateIso
                  ? ` · Due ${String(child.schoolFees.pending.dueDateIso).slice(0, 10)}`
                  : ''}
              </dd>
            </>
          ) : child.schoolFees?.lastPaid ? (
            <>
              <dd className="mt-1 text-sm font-bold text-emerald-900">
                Last paid · {child.schoolFees.lastPaid.term || '—'}
              </dd>
              <dd className="mt-0.5 text-xs text-slate-600">
                {child.schoolFees.lastPaid.amountNgn != null
                  ? formatNgn(child.schoolFees.lastPaid.amountNgn)
                  : ''}
                {child.schoolFees.lastPaid.paidAtIso
                  ? ` · ${String(child.schoolFees.lastPaid.paidAtIso).slice(0, 10)}`
                  : ''}
              </dd>
            </>
          ) : (
            <dd className="mt-1 text-sm text-slate-500">No fee on record</dd>
          )}
        </div>
      </dl>

      {child.pendingRequestsCount > 0 ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">
          {child.pendingRequestsCount} open request{child.pendingRequestsCount === 1 ? '' : 's'} awaiting review
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {child.staffProfilePath ? (
          <Link
            to={child.staffProfilePath}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 no-underline hover:bg-slate-50"
          >
            Staff profile
          </Link>
        ) : null}
        {child.beneficiaryId ? (
          <Link
            to={`/executive-hr/benefits?tab=stipends&beneficiary=${encodeURIComponent(child.beneficiaryId)}`}
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-900 no-underline hover:bg-violet-100"
          >
            Allowance record
          </Link>
        ) : null}
        {child.beneficiaryId ? (
          <Link
            to={`/executive-hr/benefits?tab=school-fees&beneficiary=${encodeURIComponent(child.beneficiaryId)}`}
            className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 no-underline hover:bg-violet-50"
          >
            School fees
          </Link>
        ) : null}
        {!child.hasLogin ? (
          <Link
            to={`${HR_EMPLOYEE_REGISTERS}?tab=scholarship`}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 no-underline"
          >
            No login — register in Executive family
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function ExecutiveHrFamilyDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [executiveFilter, setExecutiveFilter] = useState('');
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters = executiveFilter ? { linkedExecutive: executiveFilter } : {};
      setData(await fetchExecutiveFamilyDashboard(filters));
    } catch (e) {
      setError(e?.message || 'Could not load family overview.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [executiveFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary;
  const children = data?.children || [];
  const executives = data?.executives || [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-700 via-violet-800 to-indigo-950 p-5 text-white shadow-lg">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-200/90">
          {FAMILY_BENEFITS.hubEyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight">{FAMILY_BENEFITS.familyDashboardTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm text-violet-100">{FAMILY_BENEFITS.familyDashboardSubtitle}</p>
        {data?.periodYyyymm ? (
          <p className="mt-2 text-xs text-violet-200/80">Current period · {data.periodYyyymm}</p>
        ) : null}
      </div>

      {executives.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by executive">
          <button
            type="button"
            onClick={() => setExecutiveFilter('')}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              !executiveFilter
                ? 'border-violet-300 bg-violet-100 text-violet-900'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            All children
          </button>
          {executives.map((exec) => (
            <button
              key={exec}
              type="button"
              onClick={() => setExecutiveFilter(exec)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                executiveFilter === exec
                  ? 'border-violet-300 bg-violet-100 text-violet-900'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {exec}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-violet-50" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Children" value={summary.childCount} />
          <KpiCard
            label="Total monthly allowance"
            value={formatNgn(summary.totalMonthlyAllowanceNgn)}
            hint={`${summary.allowancePaidThisMonth} paid this month`}
          />
          <KpiCard label="Pending school fees" value={summary.pendingFeeCount} />
          <KpiCard
            label="Needs attention"
            value={summary.actionNeededCount}
            hint={
              summary.pendingRequestsCount > 0
                ? `${summary.pendingRequestsCount} open request${summary.pendingRequestsCount === 1 ? '' : 's'}`
                : undefined
            }
          />
        </div>
      ) : null}

      {!loading && !children.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-800">{FAMILY_BENEFITS.familyDashboardEmpty}</p>
          <p className="mt-2 text-sm text-slate-500">{FAMILY_BENEFITS.familyDashboardEmptyHint}</p>
          <Link
            to={`${HR_EMPLOYEE_REGISTERS}?tab=scholarship`}
            className="mt-4 inline-flex text-sm font-semibold text-violet-700 underline"
          >
            Open Executive family register →
          </Link>
        </div>
      ) : null}

      {!loading && children.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {children.map((child) => (
            <ChildCard key={child.userId || child.beneficiaryId || child.displayName} child={child} />
          ))}
        </div>
      ) : null}

      <p className="text-center text-xs text-slate-500">
        Manage payments in{' '}
        <Link to="/executive-hr/benefits" className="font-semibold text-violet-700 underline">
          Executive benefits
        </Link>
        {' · '}
        Review requests in{' '}
        <Link to="/executive-hr/scholarship-requests" className="font-semibold text-violet-700 underline">
          Family benefit requests
        </Link>
      </p>
    </div>
  );
}
