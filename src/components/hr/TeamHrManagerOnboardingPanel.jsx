import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { teamHrTimeAbsencePath } from '../../lib/teamHrRoutes';

const STORAGE_KEY = 'zarewa-team-hr-manager-onboarding-dismissed';

const STEPS = [
  {
    id: 'endorse',
    label: 'Review leave & loan endorsements',
    hint: 'Your team’s requests wait here before HQ sees them.',
    href: teamHrTimeAbsencePath('endorsements'),
  },
  {
    id: 'attendance',
    label: 'Mark daily attendance',
    hint: 'Present, late, or absent — from Management → Staff attendance.',
    href: '/manager?inbox=attendance',
  },
  {
    id: 'calendar',
    label: 'Check the leave calendar',
    hint: 'See who is away in the next few weeks.',
    href: teamHrTimeAbsencePath('calendar'),
  },
  {
    id: 'incidents',
    label: 'Know where to log incidents',
    hint: 'Document issues before they escalate to HQ discipline.',
    href: '/team-hr/incidents',
  },
];

/**
 * Dismissible first-run guide for branch managers using Team HR.
 */
export function TeamHrManagerOnboardingPanel({ className = '' }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [checked, setChecked] = useState({});

  const steps = useMemo(() => STEPS, []);
  const doneCount = steps.filter((s) => checked[s.id]).length;

  if (dismissed) return null;

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
      aria-labelledby="team-hr-onboarding-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p id="team-hr-onboarding-heading" className="text-xs font-semibold text-[#134e4a]/70">
            Getting started
          </p>
          <p className="mt-1 text-sm font-bold text-[#134e4a]">Your manager checklist</p>
          <p className="mt-1 text-xs text-slate-600">
            {doneCount} of {steps.length} done — tick items as you explore Team HR.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          aria-label="Dismiss manager checklist"
        >
          <X size={14} aria-hidden />
          Dismiss
        </button>
      </div>
      <ul className="mt-4 space-y-2">
        {steps.map((step) => {
          const done = Boolean(checked[step.id]);
          return (
            <li key={step.id} className="flex items-start gap-2 rounded-xl border border-white/80 bg-white/70 px-3 py-2.5">
              <button
                type="button"
                onClick={() => setChecked((prev) => ({ ...prev, [step.id]: !prev[step.id] }))}
                className="mt-0.5 shrink-0 text-[#134e4a]"
                aria-label={done ? `Mark ${step.label} as not done` : `Mark ${step.label} as done`}
              >
                {done ? <CheckCircle2 size={18} aria-hidden /> : <Circle size={18} className="text-slate-300" aria-hidden />}
              </button>
              <div className="min-w-0 flex-1">
                <Link to={step.href} className="text-sm font-semibold text-[#134e4a] no-underline hover:underline">
                  {step.label}
                </Link>
                <p className="mt-0.5 text-xs text-slate-600">{step.hint}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
