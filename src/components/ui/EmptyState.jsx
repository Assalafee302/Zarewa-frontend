import React from 'react';
import { Inbox, SearchX } from 'lucide-react';
import { Button } from './button';
import { RADIUS, SURFACE } from '../../lib/designTokens';
import { cn } from '../../lib/utils';

/**
 * Unified empty state for lists, tables, desks, and search results.
 *
 * @param {'panel'|'inline'|'compact'} variant
 *   - panel: dashed bordered card (default)
 *   - inline: no border, for table cells / split panes
 *   - compact: smaller padding for sidebars
 * @param {'empty'|'search'} kind — search shows SearchX icon + different default copy
 */
export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  actionLabel,
  onAction,
  variant = 'panel',
  kind = 'empty',
  className = '',
}) {
  const isSearch = kind === 'search';
  const ResolvedIcon = Icon ?? (isSearch ? SearchX : Inbox);
  const resolvedTitle = title ?? (isSearch ? 'No results found' : 'Nothing here yet');

  const resolvedAction =
    action ??
    (actionLabel && onAction ? (
      <Button type="button" size="default" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null);

  const variantClasses = {
    panel: `${SURFACE.muted} px-6 py-10 text-center`,
    inline: 'flex flex-col items-center justify-center px-4 py-12 text-center',
    compact: `${RADIUS.md} border border-dashed border-slate-200/80 bg-slate-50/60 px-4 py-6 text-center`,
  };

  const iconWrapClasses = {
    panel: `${RADIUS.md} bg-white text-slate-400 shadow-sm ring-1 ring-slate-200/80`,
    inline: `${RADIUS.md} bg-slate-100 text-zarewa-teal`,
    compact: `${RADIUS.sm} bg-white text-slate-400 ring-1 ring-slate-200/70`,
  };

  return (
    <div
      className={cn(variantClasses[variant] ?? variantClasses.panel, className)}
      role="status"
      aria-label={resolvedTitle}
    >
      {ResolvedIcon ? (
        <div
          className={cn(
            'mx-auto mb-3 flex h-12 w-12 items-center justify-center',
            iconWrapClasses[variant] ?? iconWrapClasses.panel
          )}
        >
          <ResolvedIcon size={variant === 'compact' ? 20 : 22} strokeWidth={1.75} aria-hidden />
        </div>
      ) : null}
      <p className="text-sm font-bold text-slate-800">{resolvedTitle}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">{description}</p>
      ) : null}
      {resolvedAction ? <div className="mt-5 flex justify-center">{resolvedAction}</div> : null}
    </div>
  );
}
