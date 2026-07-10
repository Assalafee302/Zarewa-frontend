import React from 'react';

/**
 * Step pills for multi-step Work & Pay modals (leave application, etc.).
 */
export function WorkPayStepPills({ steps, currentStep }) {
  if (!steps?.length) return null;
  return (
    <nav aria-label="Form steps" className="flex shrink-0 gap-1.5 overflow-x-auto custom-scrollbar px-4 py-2.5 sm:px-6 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
      {steps.map((label, i) => {
        const active = i === currentStep;
        const done = i < currentStep;
        return (
          <span
            key={label}
            className={`flex shrink-0 snap-start items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              active
                ? 'border-zarewa-teal bg-zarewa-teal text-white shadow-sm'
                : done
                  ? 'border-teal-100 bg-teal-50/80 text-zarewa-teal'
                  : 'border-slate-200 bg-white text-slate-500'
            }`}
            aria-current={active ? 'step' : undefined}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-md text-ui-xs font-bold ${
                active ? 'bg-white/20 text-white' : done ? 'bg-zarewa-teal text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className="whitespace-nowrap">{label}</span>
          </span>
        );
      })}
    </nav>
  );
}

/**
 * Inline alert inside Work & Pay modals.
 */
export function WorkPayFormAlert({ variant = 'error', children, className = '' }) {
  const styles = {
    error: 'border-red-100 bg-red-50 text-red-800',
    warning: 'border-amber-100 bg-amber-50 text-amber-950',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-950',
    info: 'border-sky-100 bg-sky-50 text-sky-950',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles[variant] || styles.error} ${className}`} role="alert">
      {children}
    </div>
  );
}

/**
 * Primary CTA on teal WorkPayHero backgrounds.
 */
export function WorkPayHeroButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-zarewa-teal shadow-sm ring-1 ring-white/40 transition hover:bg-teal-50 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/**
 * Shared month / year filter chip row for attendance & payslips.
 */
export function WorkPayFilterBar({ children, className = '' }) {
  return (
    <div
      className={`flex flex-wrap items-end gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm sm:px-5 ${className}`}
    >
      {children}
    </div>
  );
}
