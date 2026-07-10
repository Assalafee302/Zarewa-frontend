import React from 'react';
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

/**
 * Consolidated, prioritized production issues — clearer than scattered chips.
 * @param {{
 *   issues: Array<{ id: string; severity: 'error'|'warning'|'info'; title: string; detail: string; actionLabel?: string }>;
 *   compact?: boolean;
 *   onDiscardUnsavedCoils?: () => void;
 * }} props
 */
export function ProductionRegisterIssuesPanel({ issues = [], compact = false, onDiscardUnsavedCoils }) {
  if (!issues.length) return null;

  const textClass = compact ? 'text-xs leading-snug' : 'text-xs leading-snug';
  const padClass = compact ? 'px-2.5 py-2' : 'px-3 py-2.5';

  return (
    <section
      className="space-y-1.5"
      role="alert"
      aria-live="polite"
      data-testid="production-register-issues-panel"
    >
      <p className="text-ui-xs font-bold uppercase tracking-wider text-slate-600">Needs attention</p>
      <div className="space-y-1.5">
        {issues.map((issue) => {
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
                <p className="mt-0.5 opacity-95">{issue.detail}</p>
                {issue.actionLabel ? (
                  <p className="mt-1 font-semibold text-inherit">Next: {issue.actionLabel}</p>
                ) : null}
                {issue.id === 'unsaved-coils' && typeof onDiscardUnsavedCoils === 'function' ? (
                  <button
                    type="button"
                    onClick={onDiscardUnsavedCoils}
                    className="mt-2 rounded-md border border-current/25 bg-white/80 px-2 py-1 text-ui-xs font-semibold hover:bg-white"
                  >
                    Remove unsaved lines from this device
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
