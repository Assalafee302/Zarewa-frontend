import React from 'react';
import { Loader2 } from 'lucide-react';
import { ZAREWA_LOGO_SRC } from '../../Data/companyQuotation';
import { RADIUS } from '../../lib/designTokens';
import { cn } from '../../lib/utils';

/**
 * Branded loading indicator.
 *
 * @param {'fullscreen'|'inline'|'compact'|'panel'} variant
 *   - fullscreen: auth/bootstrap gate
 *   - inline: page-level (default, min 40vh)
 *   - compact: panel/section loading
 *   - panel: alias for compact
 * @param {boolean} skeleton — show shimmer skeleton instead of spinner
 */
export function PageLoader({
  message = 'Loading…',
  variant = 'inline',
  skeleton = false,
  skeletonRows = 4,
  className = '',
}) {
  if (variant === 'fullscreen') {
    return (
      <div
        className={cn('min-h-screen z-app-bg flex items-center justify-center px-6', className)}
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <div
          className={cn(
            RADIUS.xl,
            'border border-white/70 bg-white/90 px-8 py-7 text-center shadow-xl backdrop-blur-xl'
          )}
        >
          <img
            src={ZAREWA_LOGO_SRC}
            alt=""
            className="mx-auto h-12 w-auto object-contain object-center"
            width={120}
            height={48}
          />
          <p className="mt-3 text-ui-xs font-black uppercase tracking-[0.18em] text-slate-400">Zarewa</p>
          <p className="mt-3 text-xl font-black text-zarewa-teal">{message}</p>
          <Loader2
            className="mx-auto mt-4 h-5 w-5 animate-spin text-zarewa-teal/60"
            aria-hidden
          />
          <span className="sr-only">{message}</span>
        </div>
      </div>
    );
  }

  if (variant === 'compact' || variant === 'panel') {
    return (
      <div
        className={cn('flex items-center justify-center gap-2.5 py-8 px-4', className)}
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zarewa-teal/70" aria-hidden />
        <p className="text-sm font-medium text-slate-600">{message}</p>
        <span className="sr-only">{message}</span>
      </div>
    );
  }

  if (skeleton) {
    return (
      <div
        className={cn('animate-pulse space-y-3 p-4', className)}
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div key={i} className={cn(RADIUS.sm, 'h-10 bg-slate-100')} />
        ))}
        <span className="sr-only">{message}</span>
      </div>
    );
  }

  return (
    <div
      className={cn('flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6', className)}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2 className="h-6 w-6 animate-spin text-zarewa-teal/70" aria-hidden />
      <p className="text-sm font-semibold text-slate-600">{message}</p>
      <span className="sr-only">{message}</span>
    </div>
  );
}

/** Compact panel/section loader — alias for PageLoader variant="compact". */
export function InlineLoader(props) {
  return <PageLoader variant="compact" {...props} />;
}
