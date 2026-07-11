import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { STATUS_STEPS } from './stockRegisterConstants';
import {
  stockRegisterStepIndex,
  stockRegisterWaitingLabel,
} from '../../../lib/stockRegisterPeriod';

/**
 * Connected ceremony rail — same visual language as QuotationPipelineStepper.
 */
export function StockRegisterCeremonyRail({ status, className = '' }) {
  const activeIdx = stockRegisterStepIndex(status, STATUS_STEPS);
  const waiting = stockRegisterWaitingLabel(status);
  const locked = String(status) === 'locked';

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-ui-xs font-semibold uppercase tracking-widest text-slate-500">Month-end ceremony</p>
        <span
          className={cn(
            'text-ui-xs font-bold uppercase px-2 py-1 rounded-md border',
            locked
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          )}
        >
          {waiting}
        </span>
      </div>
      <ol className="flex items-center gap-1 sm:gap-2">
        {STATUS_STEPS.map((step, i) => {
          const done = activeIdx > i;
          const current = activeIdx === i;
          return (
            <li key={step.key} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <div className="flex min-w-0 flex-col items-center gap-1 flex-1">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-ui-xs font-bold',
                    done && 'border-zarewa-teal bg-zarewa-teal text-white',
                    current && 'border-zarewa-teal bg-teal-50 text-zarewa-teal',
                    !done && !current && 'border-slate-200 bg-slate-50 text-slate-400'
                  )}
                  aria-current={current ? 'step' : undefined}
                >
                  {done ? <Check size={14} strokeWidth={2.5} aria-hidden /> : i + 1}
                </span>
                <span
                  className={cn(
                    'text-[10px] sm:text-ui-xs font-semibold uppercase tracking-wide truncate w-full text-center',
                    current ? 'text-zarewa-teal' : done ? 'text-slate-600' : 'text-slate-400'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STATUS_STEPS.length - 1 ? (
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
    </div>
  );
}
