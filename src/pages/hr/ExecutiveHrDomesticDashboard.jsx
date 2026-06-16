import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchExecutiveDomesticDashboard, downloadDomesticStatementPdfForStaff } from '../../lib/hrDomestic';
import { formatNgn } from '../../lib/hrFormat';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';
import { paymentHealthMeta } from '../../lib/scholarshipUi';

const HEALTH_BORDER = {
  on_track: 'border-emerald-200',
  action_needed: 'border-amber-200',
  overdue: 'border-rose-200',
  setup_incomplete: 'border-slate-200',
};

function KpiCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function StaffCard({ member }) {
  const health = paymentHealthMeta(member.paymentHealth);
  const border = HEALTH_BORDER[member.paymentHealth] || HEALTH_BORDER.on_track;
  const [statementBusy, setStatementBusy] = useState(false);
  const [statementErr, setStatementErr] = useState('');

  const handleStatement = async () => {
    if (!member.domesticProfileId) return;
    setStatementBusy(true);
    setStatementErr('');
    const r = await downloadDomesticStatementPdfForStaff(member.domesticProfileId);
    setStatementBusy(false);
    if (!r.ok) setStatementErr(r.error || 'Download failed.');
  };

  return (
    <article className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${border}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-slate-900">{member.displayName}</h3>
            {!member.hasLogin ? (
              <span
                className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900"
                title={DOMESTIC_BENEFITS.adminManagedHint}
              >
                {DOMESTIC_BENEFITS.adminManagedBadge}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-slate-600">
            {member.designation || 'Role not set'}
            {member.workLocation ? ` · ${member.workLocation}` : ''}
          </p>
          {member.executiveEmployerLine ? (
            <p className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
              {member.executiveEmployerLine}
            </p>
          ) : null}
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${health.className}`}>
          {health.label}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2.5">
          <dt className="text-[10px] font-black uppercase tracking-widest text-amber-800">
            {DOMESTIC_BENEFITS.salaryLabel}
          </dt>
          <dd className="mt-1 text-base font-black tabular-nums text-slate-900">
            {member.salary?.monthlyAmountNgn != null ? formatNgn(member.salary.monthlyAmountNgn) : '—'}
          </dd>
          <dd className="mt-0.5 text-xs text-slate-600">
            {member.salary?.statusLabel || 'Not set up'}
            {member.salary?.lastPaidPeriod ? ` · Last ${member.salary.lastPaidPeriod}` : ''}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
          <dt className="text-[10px] font-black uppercase tracking-widest text-slate-500">In progress</dt>
          {member.pendingPayment ? (
            <>
              <dd className="mt-1 text-sm font-bold text-slate-900">{member.pendingPayment.statusLabel}</dd>
              <dd className="mt-0.5 text-xs text-slate-600">
                {member.pendingPayment.amountNgn != null ? formatNgn(member.pendingPayment.amountNgn) : ''}
              </dd>
            </>
          ) : (
            <dd className="mt-1 text-sm text-slate-500">No pending payment</dd>
          )}
        </div>
      </dl>

      {statementErr ? <p className="mt-3 text-xs text-rose-700">{statementErr}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {member.domesticProfileId ? (
          <Link
            to={`/executive-hr/benefits?tab=domestic&staff=${encodeURIComponent(member.domesticProfileId)}`}
            className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-950 no-underline hover:bg-amber-200"
          >
            {DOMESTIC_BENEFITS.adminManageAction}
          </Link>
        ) : (
          <Link
            to="/executive-hr/benefits?tab=domestic"
            className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-950 no-underline hover:bg-amber-200"
          >
            Add salary record
          </Link>
        )}
        {member.domesticProfileId ? (
          <button
            type="button"
            disabled={statementBusy}
            onClick={() => void handleStatement()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {statementBusy ? 'Downloading…' : DOMESTIC_BENEFITS.adminStatementAction}
          </button>
        ) : null}
        {member.hasLogin && member.staffProfilePath ? (
          <Link
            to={member.staffProfilePath}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 no-underline hover:bg-slate-50"
          >
            ERP profile (optional)
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function ExecutiveHrDomesticDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [executiveFilter, setExecutiveFilter] = useState('');
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters = executiveFilter ? { assignedExecutive: executiveFilter } : {};
      setData(await fetchExecutiveDomesticDashboard(filters));
    } catch (e) {
      setError(e?.message || 'Could not load household staff overview.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [executiveFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary;
  const staff = data?.staff || [];
  const executives = data?.executives || [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-700 via-amber-800 to-orange-950 p-5 text-white shadow-lg">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/90">
          {DOMESTIC_BENEFITS.hubEyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight">{DOMESTIC_BENEFITS.adminDashboardTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm text-amber-100">{DOMESTIC_BENEFITS.adminDashboardSubtitle}</p>
        {data?.periodYyyymm ? (
          <p className="mt-2 text-xs text-amber-200/80">Current period · {data.periodYyyymm}</p>
        ) : null}
        <Link
          to="/executive-hr/benefits?tab=domestic"
          className="mt-4 inline-flex rounded-lg border border-amber-400/50 bg-white/10 px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-white/20"
        >
          Add household staff →
        </Link>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
        <h3 className="text-sm font-black text-amber-950">{DOMESTIC_BENEFITS.adminWorkflowTitle}</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-amber-900/90">
          {DOMESTIC_BENEFITS.adminWorkflowSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      {executives.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by executive">
          <button
            type="button"
            onClick={() => setExecutiveFilter('')}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              !executiveFilter
                ? 'border-amber-300 bg-amber-100 text-amber-900'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            All staff
          </button>
          {executives.map((exec) => (
            <button
              key={exec}
              type="button"
              onClick={() => setExecutiveFilter(exec)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                executiveFilter === exec
                  ? 'border-amber-300 bg-amber-100 text-amber-900'
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
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-amber-50" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Household staff" value={summary.staffCount} />
          <KpiCard
            label="Admin-managed"
            value={summary.adminManagedCount ?? '—'}
            hint={
              summary.withLoginCount
                ? `${summary.withLoginCount} with optional ERP login`
                : DOMESTIC_BENEFITS.adminManagedHint
            }
          />
          <KpiCard
            label="Total monthly salary"
            value={formatNgn(summary.totalMonthlySalaryNgn)}
            hint={`${summary.salaryPaidThisMonth} paid this month`}
          />
          <KpiCard label="Needs attention" value={summary.actionNeededCount} />
        </div>
      ) : null}

      {!loading && !staff.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-800">{DOMESTIC_BENEFITS.adminDashboardEmpty}</p>
          <p className="mt-2 text-sm text-slate-500">{DOMESTIC_BENEFITS.adminDashboardEmptyHint}</p>
          <Link
            to="/executive-hr/benefits?tab=domestic"
            className="mt-4 inline-flex text-sm font-semibold text-amber-800 underline"
          >
            Add household staff in Executive benefits →
          </Link>
        </div>
      ) : null}

      {!loading && staff.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {staff.map((member) => (
            <StaffCard key={member.userId || member.domesticProfileId || member.displayName} member={member} />
          ))}
        </div>
      ) : null}

      <p className="text-center text-xs text-slate-500">
        Register and pay staff in{' '}
        <Link to="/executive-hr/benefits?tab=domestic" className="font-semibold text-amber-800 underline">
          Executive benefits → Household staff
        </Link>
        . ERP login is optional — see{' '}
        <Link to="/hr/employees?tab=domestic" className="font-semibold text-slate-600 underline">
          household staff register
        </Link>{' '}
        only if self-service is needed.
      </p>
    </div>
  );
}
