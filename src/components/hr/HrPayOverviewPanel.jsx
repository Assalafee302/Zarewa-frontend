import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList, TriangleAlert } from 'lucide-react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { formatPayrollPeriodLabel } from '../../lib/hrPayroll';
import { HR_PAYROLL_TAB_STRUCTURE, hrPayrollRunPath } from '../../lib/hrRoutes';
import { HrKpiCard } from './HrKpiCard';
import { HR_CARD } from './hrPageUi';
import { InlineLoader } from '../ui/PageLoader';

const STEPS = [
  {
    n: '1',
    title: 'Approve the salary',
    body: 'Each job title has one current monthly amount (company-wide or a branch override). HR proposes; GM HR or MD approves. Amounts are never typed over.',
  },
  {
    n: '2',
    title: 'Assign people to the title',
    body: 'Payroll looks up the staff member’s designation and branch. No approved row means they still pay from the old profile figure until you fix coverage.',
  },
  {
    n: '3',
    title: 'Run the month',
    body: 'Net = approved salary − loans − discipline − PAYE − pension. Nobody types a net figure.',
  },
];

export function HrPayOverviewPanel({ onOpenTab }) {
  const [overview, setOverview] = React.useState(null);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/salary-structure/overview');
    if (!ok || !data?.ok) {
      setOverview(null);
      return { error: data?.error || 'Could not load pay overview.', hasData: false };
    }
    setOverview(data.overview || {});
    return { hasData: true };
  }, []);

  if (loading && !overview) return <InlineLoader message="Loading pay overview…" />;
  if (error) {
    return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
  }

  const o = overview || {};
  const missing = o.staffMissingStructure || 0;
  const latest = o.latestRun;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HrKpiCard
          label="Approved salaries"
          value={o.currentCount ?? 0}
          hint="Current designation amounts"
          tone="teal"
          onClick={() => onOpenTab?.(HR_PAYROLL_TAB_STRUCTURE)}
        />
        <HrKpiCard
          label="Awaiting approval"
          value={o.proposedCount ?? 0}
          hint="Proposed versions"
          tone={o.proposedCount ? 'amber' : 'default'}
          onClick={() => onOpenTab?.(HR_PAYROLL_TAB_STRUCTURE)}
        />
        <HrKpiCard
          label="Staff on structure"
          value={o.staffOnStructure ?? 0}
          hint={`${o.staffHeadcount ?? 0} on payroll`}
          tone="emerald"
        />
        <HrKpiCard
          label="Need a salary row"
          value={missing}
          hint="No approved amount for their title"
          tone={missing ? 'amber' : 'emerald'}
          onClick={() => onOpenTab?.(HR_PAYROLL_TAB_STRUCTURE)}
        />
      </div>

      <section className={HR_CARD}>
        <p className="text-ui-xs font-medium text-slate-500">How pay works</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
              <p className="z-stencil text-xs text-slate-500">Step {step.n}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{step.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={HR_CARD}>
          <div className="flex items-start gap-3">
            <ClipboardList className="mt-0.5 h-5 w-5 text-zarewa-teal" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">This month</p>
              {latest ? (
                <>
                  <p className="mt-1 text-sm text-slate-600">
                    Latest run: {formatPayrollPeriodLabel(latest.periodYyyymm)} · {latest.status}
                  </p>
                  <Link
                    to={hrPayrollRunPath(latest.id)}
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-zarewa-teal hover:underline"
                  >
                    Open the run
                  </Link>
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-600">No payroll run yet. Start the month after structure coverage looks right.</p>
              )}
            </div>
          </div>
        </section>

        <section className={HR_CARD}>
          <div className="flex items-start gap-3">
            {missing ? (
              <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-600" aria-hidden />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Coverage</p>
              {missing ? (
                <>
                  <p className="mt-1 text-sm text-slate-600">
                    {missing} payroll staff still have no approved salary for their job title
                    {o.missingStaff?.[0]?.designationTitle ? ` (e.g. ${o.missingStaff[0].designationTitle})` : ''}.
                  </p>
                  <button
                    type="button"
                    className="mt-3 text-sm font-bold text-zarewa-teal hover:underline"
                    onClick={() => onOpenTab?.(HR_PAYROLL_TAB_STRUCTURE)}
                  >
                    Fix salary structure
                  </button>
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-600">
                  Everyone on payroll has an approved structure amount, or a job title still to assign.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
