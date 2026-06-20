import React from 'react';

/** Profile sub-page body */
export function ProfilePageBody({ children, className = '' }) {
  return <div className={`space-y-6 ${className}`}>{children}</div>;
}

/** In-page title block — omit title when the page shell already shows the section name. */
export function ProfilePageIntro({ title, description, actions, children }) {
  return (
    <header className={`${title ? 'border-b border-slate-200/80 pb-5 mb-6' : 'mb-2'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {title ? <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2> : null}
          {description ? (
            <p className={`${title ? 'mt-1' : ''} text-sm text-slate-600`}>{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}

/** Info banner */
export function ProfileBanner({ tone = 'info', title, children, action, className = '' }) {
  const tones = {
    info: 'border-sky-200 bg-sky-50 text-sky-950',
    warning: 'border-amber-200 bg-amber-50 text-amber-950',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    teal: 'border-teal-200 bg-teal-50 text-teal-950',
  };
  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${tones[tone] || tones.info} ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {title ? <p className="text-sm font-bold">{title}</p> : null}
          {children ? <div className="mt-1 text-sm leading-relaxed opacity-90">{children}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
