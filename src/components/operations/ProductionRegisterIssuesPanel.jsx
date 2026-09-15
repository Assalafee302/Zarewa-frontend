import React from 'react';
import { AlertTriangle, CircleAlert, Info, ChevronRight } from 'lucide-react';
import { PROD_REG } from '../../lib/productionRegisterUi';

const SEVERITY_STYLES = {
  error: {
    wrap: 'border-red-200 bg-gradient-to-r from-red-50 to-white text-red-950',
    icon: CircleAlert,
    iconClass: 'text-red-600',
  },
  warning: {
    wrap: 'border-amber-200 bg-gradient-to-r from-amber-50 to-white text-amber-950',
    icon: AlertTriangle,
    iconClass: 'text-amber-700',
  },
  info: {
    wrap: 'border-sky-200 bg-gradient-to-r from-sky-50/80 to-white text-sky-950',
    icon: Info,
    iconClass: 'text-sky-700',
  },
};

const SEVERITY_RANK = { error: 0, warning: 1, info: 2 };

/**
 * Consolidated production issues — shows the top blocker first; rest on demand.
 */
export function ProductionRegisterIssuesPanel({ issues = [], compact = false, onDiscardUnsavedCoils }) {
  const [showAll, setShowAll] = React.useState(false);
  const sorted = React.useMemo(
    () =>
      [...issues].sort(
        (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
      ),
    [issues]
  );

  if (!sorted.length) return null;

  const visible = showAll ? sorted : sorted.slice(0, 1);
  const textClass = compact ? 'text-xs leading-snug' : 'text-sm leading-snug sm:text-xs';

  return (
    <section
      className={compact ? 'space-y-1' : 'space-y-2'}
      role="alert"
      aria-live="polite"
      data-testid="production-register-issues-panel"
    >
      <div className={compact ? 'space-y-1' : 'space-y-2'}>
        {visible.map((issue, idx) => {
          const style = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.info;
          const Icon = style.icon;
          return (
            <div
              key={issue.id}
              className={`${PROD_REG.bannerIssue} ${style.wrap} ${compact ? 'gap-2 rounded-lg px-2.5 py-1.5' : ''}`}
            >
              <Icon className={`mt-0.5 size-4 shrink-0 ${style.iconClass}`} aria-hidden />
              <div className={`min-w-0 flex-1 ${textClass}`}>
                <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                  <p className="font-bold">{issue.title}</p>
                  {idx === 0 && sorted.length > 1 ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-0.5 text-ui-xs font-semibold opacity-80 hover:opacity-100"
                      onClick={() => setShowAll((v) => !v)}
                    >
                      {showAll ? 'Less' : `+${sorted.length - 1}`}
                      <ChevronRight
                        size={14}
                        className={`transition-transform ${showAll ? 'rotate-90' : ''}`}
                        aria-hidden
                      />
                    </button>
                  ) : null}
                </div>
                {issue.actionLabel ? (
                  <p className={`${compact ? 'mt-0.5' : 'mt-1'} font-semibold text-inherit`}>{issue.actionLabel}</p>
                ) : (
                  <p className={`${compact ? 'mt-0.5' : 'mt-1'} opacity-95`}>{issue.detail}</p>
                )}
                {showAll && issue.actionLabel && issue.detail ? (
                  <p className="mt-1 opacity-80">{issue.detail}</p>
                ) : null}
                {issue.id === 'unsaved-coils' && typeof onDiscardUnsavedCoils === 'function' ? (
                  <button
                    type="button"
                    onClick={onDiscardUnsavedCoils}
                    className="mt-2 rounded-lg border border-current/20 bg-white/90 px-3 py-1.5 text-ui-xs font-semibold shadow-sm hover:bg-white"
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
