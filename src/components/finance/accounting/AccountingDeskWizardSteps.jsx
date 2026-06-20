import React from 'react';
import { CheckCircle2 } from 'lucide-react';

/**
 * @param {{ steps: Array<{ id: number | string; label: string }>; currentStep: number | string; onStepChange?: (id: number | string) => void }} props
 */
export function AccountingDeskWizardSteps({ steps, currentStep, onStepChange }) {
  const currentIdx = steps.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Progress" className="rounded-xl border border-slate-200/90 bg-white px-3 py-3 sm:px-4">
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
        {steps.map((step, idx) => {
          const done = currentIdx > idx;
          const active = step.id === currentStep;
          const clickable = Boolean(onStepChange) && (done || active);
          return (
            <li key={step.id} className="flex flex-1 items-center gap-2 sm:min-w-0">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepChange?.(step.id)}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  active ? 'bg-teal-50' : clickable ? 'hover:bg-slate-50' : ''
                } ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                    done
                      ? 'bg-emerald-600 text-white'
                      : active
                        ? 'bg-[#134e4a] text-white'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {done ? <CheckCircle2 size={14} /> : idx + 1}
                </span>
                <span
                  className={`truncate text-[10px] font-bold uppercase tracking-wide ${
                    active ? 'text-[#134e4a]' : 'text-slate-600'
                  }`}
                >
                  {step.label}
                </span>
              </button>
              {idx < steps.length - 1 ? (
                <span className="hidden sm:block h-px flex-1 bg-slate-200 mx-1" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
