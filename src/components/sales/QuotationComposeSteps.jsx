/* eslint-disable react-refresh/only-export-components -- step ids colocated with the wizard */
import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export const QUOTATION_COMPOSE_STEPS = [
  { id: 'customer', label: 'Customer' },
  { id: 'lines', label: 'Lines' },
  { id: 'pay', label: 'Pay' },
];

/**
 * Compose wizard for new/edit quotations: Customer → Lines → Pay.
 * Lifecycle pipeline (draft/approved/paid) stays in QuotationPipelineStepper.
 */
export function QuotationComposeSteps({ step, onStep, customerReady, linesReady }) {
  const idx = Math.max(
    0,
    QUOTATION_COMPOSE_STEPS.findIndex((s) => s.id === step)
  );

  return (
    <nav className="mb-5" aria-label="Quotation steps">
      <ol className="flex items-center gap-1 sm:gap-2">
        {QUOTATION_COMPOSE_STEPS.map((s, i) => {
          const done = i < idx;
          const current = i === idx;
          const unlocked = i === 0 || (i === 1 && customerReady) || (i === 2 && customerReady && linesReady) || done;
          return (
            <li key={s.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <button
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && onStep(s.id)}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30 disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-ui-xs font-bold',
                    done && 'border-zarewa-teal bg-zarewa-teal text-white',
                    current && 'border-zarewa-teal bg-teal-50 text-zarewa-teal',
                    !done && !current && 'border-slate-200 bg-slate-50 text-slate-400'
                  )}
                >
                  {done ? <Check size={14} strokeWidth={2.5} aria-hidden /> : i + 1}
                </span>
                <span
                  className={cn(
                    'w-full truncate text-center text-ui-xs font-semibold uppercase tracking-wide',
                    current ? 'text-zarewa-teal' : done ? 'text-slate-600' : 'text-slate-400'
                  )}
                >
                  {s.label}
                </span>
              </button>
              {i < QUOTATION_COMPOSE_STEPS.length - 1 ? (
                <span
                  className={cn(
                    'hidden sm:block h-0.5 flex-1 rounded-full mb-4',
                    done ? 'bg-zarewa-teal' : 'bg-slate-200'
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
