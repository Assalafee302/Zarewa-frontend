import React, { useMemo, useState } from 'react';
import { AlertTriangle, CircleAlert, Info } from 'lucide-react';

const SEVERITY_STYLES = {
  error: {
    wrap: 'border-red-300 bg-red-50 text-red-950',
    icon: CircleAlert,
    iconClass: 'text-red-600',
  },
  warning: {
    wrap: 'border-amber-300 bg-amber-50 text-amber-950',
    icon: AlertTriangle,
    iconClass: 'text-amber-700',
  },
  info: {
    wrap: 'border-sky-300 bg-sky-50 text-sky-950',
    icon: Info,
    iconClass: 'text-sky-700',
  },
};

const SEVERITY_RANK = { error: 0, warning: 1, info: 2 };

/**
 * Consolidated production issues — shows the top blocker first; rest on demand.
 * @param {{
 *   issues: Array<{ id: string; severity: 'error'|'warning'|'info'; title: string; detail: string; actionLabel?: string }>;
 *   compact?: boolean;
 *   onDiscardUnsavedCoils?: () => void;
 * }} props
 */
export function ProductionRegisterIssuesPanel({ issues = [], compact = false, onDiscardUnsavedCoils }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(
    () =>
      [...issues].sort(
        (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
      ),
    [issues]
  );

  if (!sorted.length) return null;

  const visible = showAll ? sorted : sorted.slice(0, 1);
  const textClass = compact ? 'text-xs leading-snug' : 'text-xs leading-snug';
  const padClass = compact ? 'px-2.5 py-2' : 'px-3 py-2.5';

  return (
    <section
      className="space-y-1.5"
      role="alert"
      aria-live="polite"
      data-testid="production-register-issues-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-ui-xs font-bold uppercase tracking-wider text-slate-600">Next step</p>
        {sorted.length > 1 ? (
          <button
            type="button"
            className="text-ui-xs font-semibold text-slate-500 hover:text-slate-800"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? 'Show less' : `+${sorted.length - 1} more`}
          </button>
        ) : null}
      </div>
      <div className="space-y-1.5">
        {visible.map((issue) => {
          const style = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.info;
          const Icon = style.icon;
          return (
            <div
              key={issue.id}
              className={`flex items-start gap-2 rounded-lg border ${style.wrap} ${padClass}`}
            >
              <Icon className={`mt-0.5 size-4 shrink-0 ${style.iconClass}`} aria-hidden />
              <div className={`min-w-0 ${textClass}`}>
                <p className="font-bold">{issue.title}</p>
                {issue.actionLabel ? (
                  <p className="mt-0.5 font-semibold text-inherit">{issue.actionLabel}</p>
                ) : (
                  <p className="mt-0.5 opacity-95">{issue.detail}</p>
                )}
                {showAll && issue.actionLabel && issue.detail ? (
                  <p className="mt-0.5 opacity-80">{issue.detail}</p>
                ) : null}
                {issue.id === 'unsaved-coils' && typeof onDiscardUnsavedCoils === 'function' ? (
                  <button
                    type="button"
                    onClick={onDiscardUnsavedCoils}
                    className="mt-2 rounded-md border border-current/25 bg-white/80 px-2 py-1 text-ui-xs font-semibold hover:bg-white"
                  >
                    Discard unsaved lines
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
