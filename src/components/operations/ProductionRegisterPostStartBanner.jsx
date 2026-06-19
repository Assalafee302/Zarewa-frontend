import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

/**
 * Floor-friendly next-step guidance after production has started.
 * @param {{ compact?: boolean; isStoneMeterQuote?: boolean; isOffcutMode?: boolean }} props
 */
export function ProductionRegisterPostStartBanner({
  compact = false,
  isStoneMeterQuote = false,
  isOffcutMode = false,
}) {
  const textClass = compact ? 'text-xs leading-snug' : 'text-sm leading-snug sm:text-xs';
  const padClass = compact ? 'px-2.5 py-2' : 'px-3 py-2.5 sm:px-2.5 sm:py-2';

  let steps;
  if (isStoneMeterQuote) {
    steps = ['Enter metres consumed', 'Save if needed', 'Complete'];
  } else if (isOffcutMode) {
    steps = ['Enter offcut / accessory metres', 'Complete'];
  } else {
    steps = ['Enter closing kg & metres on each coil', 'Save while running', 'Complete'];
  }

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-sky-300 bg-sky-50 ${padClass}`}
      role="status"
      data-testid="production-post-start-banner"
    >
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-sky-700 sm:size-3.5" aria-hidden />
      <div className={`min-w-0 font-medium text-sky-950 ${textClass}`}>
        <strong className="font-bold">Production started.</strong>{' '}
        <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
          {steps.map((step, i) => (
            <span key={step} className="inline-flex items-center gap-1">
              {i > 0 ? <ArrowRight className="size-3 shrink-0 opacity-60" aria-hidden /> : null}
              <span>{step}</span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
