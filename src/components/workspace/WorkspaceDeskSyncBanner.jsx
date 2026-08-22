import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Subtle desk-level sync strip — only while domain snapshot is still loading
 * and the page has no usable cached rows yet.
 */
export function WorkspaceDeskSyncBanner({ loading, label = 'desk data', className = '' }) {
  if (!loading) return null;
  return (
    <div
      className={cn(
        'mb-3 flex items-center gap-2.5 rounded-xl border border-teal-200/90 bg-gradient-to-r from-teal-50/95 to-white px-4 py-2.5 text-xs font-medium text-teal-950 shadow-sm',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-zarewa-teal" aria-hidden />
      <span>Loading {label}…</span>
    </div>
  );
}
