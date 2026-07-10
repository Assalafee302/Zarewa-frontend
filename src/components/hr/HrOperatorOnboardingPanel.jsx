import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canManageHrStaff, canReviewHrRequests, canViewHrReports } from '../../lib/hrAccess';
import { HR_EMPLOYEES, HR_TIME_ABSENCE, HR_PAYROLL, hrTabPath } from '../../lib/hrRoutes';

const STORAGE_KEY = 'zarewa-hr-operator-onboarding-dismissed';

const STEPS = [
  {
    id: 'inbox',
    label: 'Review pending approvals',
    hint: 'Start with Today on the dashboard, then open the unified inbox.',
    href: HR_TIME_ABSENCE + '?tab=approvals',
    visible: (p) => canReviewHrRequests(p),
  },
  {
    id: 'directory',
    label: 'Check staff directory gaps',
    hint: 'Filter for incomplete profiles and missing documents.',
    href: HR_EMPLOYEES + '?quick=incomplete',
    visible: (p) => canManageHrStaff(p),
  },
  {
    id: 'payroll',
    label: 'Confirm payroll readiness',
    hint: 'Verify the current run before lock and payment.',
    href: hrTabPath(HR_PAYROLL, 'payroll-runs'),
    visible: (p) => canReviewHrRequests(p) || canManageHrStaff(p),
  },
  {
    id: 'reports',
    label: 'Open analytics & reports',
    hint: 'Workforce trends and compliance exports live under Insights.',
    href: '/hr/analytics',
    visible: (p) => canViewHrReports(p),
  },
];

/**
 * Dismissible first-run checklist for HQ HR operators.
 */
export function HrOperatorOnboardingPanel({ className = '' }) {
  const ws = useWorkspace();
  const permissions = ws?.permissions || [];
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [checked, setChecked] = useState({});

  const steps = useMemo(() => STEPS.filter((s) => s.visible(permissions)), [permissions]);
  const doneCount = steps.filter((s) => checked[s.id]).length;

  if (dismissed || steps.length === 0) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  };

  return (
    <section
      className={`rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/90 to-white px-4 py-4 shadow-sm sm:px-5 ${className}`}
      aria-labelledby="hr-onboarding-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p id="hr-onboarding-heading" className="text-xs font-semibold text-zarewa-teal/70">
            Getting started
          </p>
          <p className="mt-1 text-sm font-bold text-zarewa-teal">Your HR operator checklist</p>
          <p className="mt-1 text-xs text-slate-600">
            {doneCount} of {steps.length} completed — tick items as you go, or dismiss when you are comfortable.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <X size={14} aria-hidden />
          Dismiss
        </button>
      </div>
      <ul className="mt-4 space-y-2">
        {steps.map((step) => {
          const done = Boolean(checked[step.id]);
          return (
            <li
              key={step.id}
              className={`rounded-xl border px-3 py-3 ${done ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 bg-white'}`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setChecked((c) => ({ ...c, [step.id]: !c[step.id] }))}
                  className="mt-0.5 shrink-0 text-zarewa-teal"
                  aria-label={done ? `Mark ${step.label} as not done` : `Mark ${step.label} as done`}
                >
                  {done ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Circle size={18} className="text-slate-300" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{step.hint}</p>
                  <Link to={step.href} className="mt-2 inline-block text-xs font-semibold text-zarewa-teal hover:underline">
                    Open →
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
