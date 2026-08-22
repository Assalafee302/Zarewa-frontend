import React from 'react';
import { PlayCircle } from 'lucide-react';
import { PROD_REG } from '../../lib/productionRegisterUi';

/**
 * Floor-friendly next-step guidance after production has started.
 */
export function ProductionRegisterPostStartBanner({
  compact = false,
  isStoneMeterQuote = false,
  isOffcutMode = false,
}) {
  const textClass = compact ? 'text-xs leading-snug' : 'text-sm leading-snug sm:text-xs';

  let next;
  if (isStoneMeterQuote) {
    next = 'Enter metres consumed, then tap Complete.';
  } else if (isOffcutMode) {
    next = 'Enter offcut / accessory metres, then tap Complete.';
  } else {
    next = 'Enter closing kg and metres on each coil, Save, then Complete.';
  }

  return (
    <div className={PROD_REG.bannerRunning} role="status" data-testid="production-post-start-banner">
      <PlayCircle className="size-5 shrink-0 text-zarewa-teal" aria-hidden />
      <div className={`min-w-0 ${textClass}`}>
        <p className="font-bold text-zarewa-teal">Run in progress</p>
        <p className="mt-0.5 font-medium text-[var(--z-text-muted)]">{next}</p>
      </div>
    </div>
  );
}
