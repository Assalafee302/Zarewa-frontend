import React from 'react';
import { CheckCircle2 } from 'lucide-react';

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
  const padClass = compact ? 'px-2.5 py-1.5' : 'px-3 py-2 sm:px-2.5 sm:py-1.5';

  let next;
  if (isStoneMeterQuote) {
    next = 'Enter metres, then Complete.';
  } else if (isOffcutMode) {
    next = 'Enter offcut / accessory metres, then Complete.';
  } else {
    next = 'Enter closing kg & metres, then Complete.';
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 ${padClass}`}
      role="status"
      data-testid="production-post-start-banner"
    >
      <CheckCircle2 className="size-3.5 shrink-0 text-sky-700" aria-hidden />
      <p className={`min-w-0 font-medium text-sky-950 ${textClass}`}>
        <strong className="font-bold">Running.</strong> {next}
      </p>
    </div>
  );
}
