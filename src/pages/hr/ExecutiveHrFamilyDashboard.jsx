import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPayrollPeriodLabel } from '../../lib/hrPayroll';
import { fetchExecutiveFamilyDashboard } from '../../lib/hrExecutiveBenefits';
import { formatNgn } from '../../lib/hrFormat';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { HR_EMPLOYEE_REGISTERS } from '../../lib/hrRoutes';
import { chairmanOfficeHref } from '../../lib/chairmanOfficeHrefs.js';
import { paymentHealthMeta } from '../../lib/scholarshipUi';

const HEALTH_BORDER = {
  on_track: 'border-emerald-200',
  action_needed: 'border-amber-200',
  overdue: 'border-rose-200',
  setup_incomplete: 'border-slate-200',
};

function KpiCard({ label, value, hint }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-ui-xs font-medium text-slate-500">{label}</p>
      <p className="z-stencil mt-1 text-2xl text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function benefitsHref(officeManagePath, tab, extra = {}) {
  if (officeManagePath) {
    const u = new URL(officeManagePath, 'https://zarewa.local');
    u.searchParams.set('benefitsTab', tab);
    for (const [k, v] of Object.entries(extra)) {
      if (v) u.searchParams.set(k, String(v));
    }
    const q = u.searchParams.toString();
    return q ? `${u.pathname}?${q}` : u.pathname;
  }
  return chairmanOfficeHref('scholarships', { benefitsTab: tab, ...extra });
}

function ChildCard({ child, officeManagePath = '' }) {
  const health = paymentHealthMeta(child.paymentHealth);
  const border = HEALTH_BORDER[child.paymentHealth] || HEALTH_BORDER.on_track;

  return (
    <article className={`rounded-md border bg-white p-4 ${border}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">{child.displayName}</h3>
          <p className="mt-0.5 text-sm text-slate-600">
            {child.schoolName || 'School not set'}
            {child.classLevel ? ` · ${child.classLevel}` : ''}
          </p>
          {child.linkedExecutiveLabel && !officeManagePath ? (
            <p className="mt-1 text-xs text-slate-500">
              {child.linkedExecutiveLabel}
              {child.beneficiaryTypeLabel ? ` · ${child.beneficiaryTypeLabel}` : ''}
            </p>
          ) : null}
        </div>
        <span className={`shrink-0 rounded-sm border px-2 py-0.5 text-xs font-medium ${health.className}`}>
          {health.label}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
          <dt className="text-ui-xs font-medium text-slate-500">
            {FAMILY_BENEFITS.stipendLabel}
          </dt>
          <dd className="z-stencil mt-1 text-base text-slate-900">
            {child.allowance?.monthlyAmountNgn != null ? formatNgn(child.allowance.monthlyAmountNgn) : '—'}
          </dd>
          <dd className="mt-0.5 text-xs text-slate-600">
            {child.allowance?.statusLabel || 'Not set up'}
            {child.allowance?.lastPaidPeriod ? ` · Last ${child.allowance.lastPaidPeriod}` : ''}
          </dd>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
          <dt className="text-ui-xs font-medium text-slate-500">
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
        {child.staffProfilePath && !officeManagePath ? (
          <Link
            to={child.staffProfilePath}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 no-underline hover:bg-slate-50"
          >
            Staff profile
          </Link>
        ) : null}
        {child.beneficiaryId ? (
          <Link
            to={benefitsHref(officeManagePath, 'stipends', officeManagePath ? {} : { beneficiary: child.beneficiaryId })}
            className="rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 no-underline hover:bg-slate-50"
          >
            Allowance record
          </Link>
        ) : null}
        {child.beneficiaryId ? (
          <Link
            to={benefitsHref(officeManagePath, 'school-fees', officeManagePath ? {} : { beneficiary: child.beneficiaryId })}
            className="rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 no-underline hover:bg-slate-50"
          >
            School fees
          </Link>
        ) : null}
        {!child.hasLogin && !officeManagePath ? (
          <Link
            to="/chairman?tab=scholarships"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 no-underline"
          >
            No login — register in Chairman Office
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function ExecutiveHrFamilyDashboard({
  defaultExecutiveFilter = '',
  lockFilter = false,
  reloadToken = 0,
  officeManagePath = '',
} = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [executiveFilter, setExecutiveFilter] = useState(defaultExecutiveFilter);
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
    void load();
  }, [load, reloadToken]);

  const summary = data?.summary;
  const children = data?.children || [];
  const executives = data?.executives || [];

  return (
    <div className="space-y-6">
      {data?.periodYyyymm && !officeManagePath ? (
        <p className="text-xs text-slate-500">Current period · {formatPayrollPeriodLabel(data.periodYyyymm)}</p>
      ) : null}

      {!lockFilter && executives.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by executive">
          <button
            type="button"
            onClick={() => setExecutiveFilter('')}
            className={`rounded-sm border px-3 py-1.5 text-xs font-medium ${
              !executiveFilter
                ? 'border-slate-800 bg-slate-800 text-white'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            All children
          </button>
          {executives.map((exec) => (
            <button
              key={exec}
              type="button"
              onClick={() => setExecutiveFilter(exec)}
              className={`rounded-sm border px-3 py-1.5 text-xs font-medium ${
                executiveFilter === exec
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 bg-white text-slate-700'
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

      {loading && !officeManagePath ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : !officeManagePath && summary ? (
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
        <div className="rounded-md border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-slate-800">
            {officeManagePath ? 'No Chairman family beneficiaries yet.' : FAMILY_BENEFITS.familyDashboardEmpty}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {officeManagePath
              ? 'Use Add beneficiary in the register below to add a child, then request school fees or a monthly allowance.'
              : FAMILY_BENEFITS.familyDashboardEmptyHint}
          </p>
          {officeManagePath ? null : (
            <Link
              to="/chairman?tab=scholarships"
              className="mt-4 inline-flex text-sm font-medium text-slate-800 underline underline-offset-2"
            >
              Open Chairman Office scholarships →
            </Link>
          )}
        </div>
      ) : null}

      {!loading && children.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {children.map((child) => (
            <ChildCard
              key={child.userId || child.beneficiaryId || child.displayName}
              child={child}
              officeManagePath={officeManagePath}
            />
          ))}
        </div>
      ) : null}

      {officeManagePath ? null : (
        <p className="text-center text-xs text-slate-500">
          Manage payments in{' '}
          <Link to={chairmanOfficeHref('scholarships')} className="font-medium text-slate-800 underline underline-offset-2">
            Chairman Office → Scholarships
          </Link>
          {' · '}
          Review requests in{' '}
          <Link to={chairmanOfficeHref('scholarships')} className="font-medium text-slate-800 underline underline-offset-2">
            School-fee requests
          </Link>
        </p>
      )}
    </div>
  );
}
