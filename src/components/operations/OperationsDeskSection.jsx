import React from 'react';
import { OPS_SECTION_HINT, OPS_SECTION_TITLE } from './operationsDeskUi';

/**
 * Quiet mill-bench panel for Operations desk sections.
 * @param {{ title?: string; hint?: string; icon?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }} props
 */
export function OperationsDeskSection({
  title,
  hint,
  icon,
  actions,
  children,
  className = '',
  bodyClassName = '',
}) {
  return (
    <section className={`z-soft-panel flex flex-col overflow-hidden ${className}`.trim()}>
      {title || actions ? (
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--z-border)] bg-[var(--z-surface-muted)]/40 px-4 py-3">
          <div className="flex min-w-0 items-start gap-2">
            {icon ? (
              <span className="mt-0.5 text-zarewa-teal" aria-hidden>
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? <h3 className={OPS_SECTION_TITLE}>{title}</h3> : null}
              {hint ? <p className={OPS_SECTION_HINT}>{hint}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">{actions}</div> : null}
        </header>
      ) : null}
      <div className={`flex-1 p-4 text-xs text-[var(--z-text)] ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
}
