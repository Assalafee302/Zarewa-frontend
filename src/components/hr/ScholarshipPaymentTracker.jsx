import React from 'react';

/**
 * @param {{ tracker?: { steps: { key: string; label: string }[]; currentIndex: number; terminal?: boolean }; compact?: boolean }} props
 */
export function ScholarshipPaymentTracker({ tracker, compact = false }) {
  if (!tracker?.steps?.length) return null;
  const { steps, currentIndex, terminal } = tracker;

  if (terminal) {
    return (
      <p className="text-xs font-semibold text-rose-700">This payment was not completed. Contact HR if you need help.</p>
    );
  }

  return (
    <ol className={`flex flex-wrap items-center gap-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>
      {steps.map((step, i) => {
        const done = currentIndex > i;
        const active = currentIndex === i;
        return (
          <li key={step.key} className="flex items-center gap-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${
                done
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : active
                    ? 'border-violet-300 bg-violet-100 text-violet-900'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}
            >
              {done ? '✓' : active ? '●' : '○'} {step.label}
            </span>
            {i < steps.length - 1 ? <span className="text-slate-300" aria-hidden>›</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
