import React from 'react';
import { ProfileAccentBar } from './profileDesign';

/** Profile sub-page body — consistent vertical rhythm inside MainPanel. */
export function ProfilePageBody({ children, className = '' }) {
  return <div className={`space-y-6 ${className}`}>{children}</div>;
}

/** In-page title block — matches module subtitle pattern (Sales / Procurement). */
export function ProfilePageIntro({ title, description, actions, children }) {
  return (
    <header className="border-b border-slate-100 pb-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {title ? <h2 className="z-page-title text-slate-900">{title}</h2> : null}
          {description ? <p className="z-page-subtitle">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}

/** Compact info / warning banner with teal accent. */
export function ProfileBanner({ tone = 'info', title, children, action, className = '' }) {
  const tones = {
    info: 'border-sky-200 bg-sky-50/80 text-sky-950',
    warning: 'border-amber-200 bg-amber-50/80 text-amber-950',
    success: 'border-emerald-200 bg-emerald-50/80 text-emerald-950',
    teal: 'border-teal-200 bg-teal-50/80 text-teal-950',
  };
  return (
    <div className={`relative overflow-hidden rounded-xl border shadow-sm ${tones[tone] || tones.info} ${className}`}>
      <ProfileAccentBar />
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0 pt-1">
          {title ? <p className="text-sm font-bold text-inherit">{title}</p> : null}
          {children ? <div className="mt-1 text-xs leading-relaxed opacity-90">{children}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
