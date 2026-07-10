import React from 'react';
import { Check } from 'lucide-react';
import { quotationPipelineStage } from '../../lib/salesStatusUi';
import { cn } from '../../lib/utils';

const STEPS = [
  { id: 'draft', label: 'Draft' },
  { id: 'approved', label: 'Approved' },
  { id: 'payment', label: 'Payment' },
  { id: 'fulfilment', label: 'Ready' },
];

function resolveActiveIndex(status, payStatus, hasId) {
  if (!hasId) return 0;
  const st = String(status || 'Pending').trim();
  if (st === 'Void' || st === 'Expired' || st === 'Rejected') return -1;
  if (st !== 'Approved') return 0;
  if (payStatus === 'Paid') return 3;
  if (payStatus === 'Partial') return 2;
  return 1;
}

/**
 * Visual pipeline for quotation lifecycle in QuotationModal.
 */
export function QuotationPipelineStepper({ status, payStatus, quotationId, className = '' }) {
  const activeIdx = resolveActiveIndex(status, payStatus, Boolean(quotationId));
  const pipeline = quotationPipelineStage(status, payStatus);
  const isTerminal = activeIdx < 0;

  return (
    <div className={cn('mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-ui-xs font-semibold uppercase tracking-widest text-slate-500">Pipeline</p>
        <span
          className={cn(
            'text-ui-xs font-bold uppercase px-2 py-1 rounded-md border',
            pipeline.tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
            pipeline.tone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-800',
            pipeline.tone === 'info' && 'border-sky-200 bg-sky-50 text-sky-900',
            pipeline.tone === 'muted' && 'border-slate-300 bg-slate-100 text-slate-700'
          )}
        >
          {pipeline.stage}
        </span>
      </div>
      {isTerminal ? (
        <p className="text-xs text-slate-500">This quotation is no longer in the active sales pipeline.</p>
      ) : (
        <ol className="flex items-center gap-1 sm:gap-2">
          {STEPS.map((step, i) => {
            const done = i < activeIdx;
            const current = i === activeIdx;
            return (
              <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
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
                      'text-ui-xs font-semibold uppercase tracking-wide truncate w-full text-center',
                      current ? 'text-zarewa-teal' : done ? 'text-slate-600' : 'text-slate-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 ? (
                  <span
                    className={cn('hidden sm:block h-0.5 flex-1 rounded-full mb-4', done ? 'bg-zarewa-teal' : 'bg-slate-200')}
                    aria-hidden
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
