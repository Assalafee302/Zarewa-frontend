import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../lib/utils';
import { HrStatusBadge } from './HrStatusBadge';

export {
  HR_BTN_PRIMARY,
  HR_BTN_SECONDARY,
  HR_BTN_ADD,
  HR_BTN_PILL,
  HR_CARD,
  HR_FIELD_CLASS,
  HR_INPUT,
  HR_MUTED,
  HR_SECTION_TITLE,
  HR_TEXTAREA_CLASS,
} from './hrFormStyles';

const hrBtnClass = 'min-h-11 w-full sm:w-auto text-xs font-bold uppercase tracking-wide';

/** HR-styled button — prefer over HR_BTN_* class strings. */
export function HrButton({ variant = 'primary', className, ...props }) {
  const mapped =
    variant === 'secondary' ? 'outline' : variant === 'destructive' ? 'destructive' : 'default';
  return <Button variant={mapped} className={cn(hrBtnClass, className)} {...props} />;
}

/** HR add/create action button. */
export function HrAddButton({ className, ...props }) {
  return (
    <Button
      variant="default"
      className={cn(hrBtnClass, 'inline-flex items-center gap-1.5', className)}
      {...props}
    />
  );
}

export { InlineLoader } from '../ui/PageLoader';
export { EmptyState } from '../ui/EmptyState';

/** Constrains page content width inside HR main panel. */
export function HrPageBody({ children, className = '', compact = false }) {
  return (
    <div className={`mx-auto w-full ${compact ? 'max-w-full space-y-4' : 'max-w-5xl space-y-6'} ${className}`}>
      {children}
    </div>
  );
}

/** Optional page actions row — omit title/description when subnav already names the page. */
export function HrPageIntro({ title, description, actions, children }) {
  const hasCopy = Boolean(title || description || children);
  if (!hasCopy && !actions) return null;

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${
        hasCopy ? 'border-b border-slate-100 pb-4' : ''
      }`}
    >
      {hasCopy ? (
        <div className="min-w-0 flex-1">
          {title ? <h2 className="z-page-title text-zarewa-teal">{title}</h2> : null}
          {description ? <p className="z-page-subtitle">{description}</p> : null}
          {children}
        </div>
      ) : null}
      {actions ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div> : null}
    </div>
  );
}

/** Actions-only toolbar row for pages without a secondary header. */
export function HrPageToolbar({ children, className = '' }) {
  if (!children) return null;
  return <div className={`mb-4 flex flex-wrap items-center justify-end gap-2 ${className}`}>{children}</div>;
}

export function HrCard({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-100 bg-white shadow-sm ${className}`}>
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-50 px-4 py-3 sm:px-5">
          <div>
            {title ? <h3 className="text-sm font-bold text-slate-800">{title}</h3> : null}
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function HrStatusPill({ status, label }) {
  return <HrStatusBadge status={status} variant="workflow" label={label || status} />;
}

export function HrEmptyState({ title, description, action, actionLabel, onAction }) {
  return (
    <EmptyState
      variant="compact"
      title={title}
      description={description}
      action={action}
      actionLabel={actionLabel}
      onAction={onAction}
    />
  );
}

/** Left list + right detail (recruiting, learning, engagement). */
export function HrSplitWorkspace({ sidebar, children, sidebarWidth = 'w-full lg:w-72' }) {
  return (
    <div className={`grid gap-5 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]`}>
      <aside className={`min-w-0 ${sidebarWidth}`}>{sidebar}</aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function HrListItemButton({ active, onClick, title, meta, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
        active
          ? 'border-zarewa-teal/40 bg-teal-50/60 shadow-sm'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/80'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800 line-clamp-2">{title}</span>
        {badge}
      </div>
      {meta ? <p className="mt-1 text-xs text-slate-500 line-clamp-1">{meta}</p> : null}
    </button>
  );
}

export function HrInlineLink({ to, children }) {
  return (
    <Link to={to} className="text-sm font-semibold text-zarewa-teal hover:underline">
      {children}
    </Link>
  );
}

export function HrAlert({ tone = 'error', children }) {
  const tones = {
    error: 'border-red-100 bg-red-50 text-red-800',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-900',
    info: 'border-sky-100 bg-sky-50 text-sky-900',
  };
  return <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone] || tones.error}`}>{children}</div>;
}
