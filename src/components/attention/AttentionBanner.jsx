import React from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

const TONE = {
  critical: {
    box: 'border-rose-300 bg-rose-50',
    text: 'text-rose-950',
    icon: ShieldAlert,
    iconCls: 'text-rose-700',
  },
  warning: {
    box: 'border-amber-300 bg-amber-50',
    text: 'text-amber-950',
    icon: AlertTriangle,
    iconCls: 'text-amber-700',
  },
  info: {
    box: 'border-slate-200 bg-slate-50',
    text: 'text-slate-900',
    icon: Info,
    iconCls: 'text-slate-600',
  },
};

const EVIDENCE_TONE = {
  bad: 'border-rose-200 bg-white text-rose-900',
  ok: 'border-emerald-200 bg-white text-emerald-900',
  muted: 'border-slate-200 bg-white text-slate-500',
};

/**
 * Top-of-record banner: every flag on this record as a sentence, its evidence side by side, and the actions
 * that clear it. Text comes from the shared rules — identical to the row the user tapped.
 *
 * @param {{
 *   attention: ReturnType<typeof import('../../shared/lib/attentionRules.js').explainAttentionItem> | null;
 *   onAction?: (action: { id: string, label: string, kind: string }) => void;
 *   hideActions?: string[];
 *   readOnly?: boolean;
 *   className?: string;
 * }} props
 */
export function AttentionBanner({ attention, onAction, hideActions = [], readOnly = false, className = '' }) {
  const flags = attention?.flags || [];
  if (flags.length === 0) return null;
  const tone = TONE[flags[0].severity] || TONE.warning;
  const Icon = tone.icon;
  const seen = new Set();
  const actions = [];
  for (const f of flags) {
    for (const a of f.actions || []) {
      if (seen.has(a.id) || hideActions.includes(a.id)) continue;
      if (readOnly && a.kind === 'decide') continue;
      seen.add(a.id);
      actions.push(a);
    }
  }

  return (
    <section
      role="alert"
      aria-label="Why this needs attention"
      data-testid="attention-banner"
      className={`rounded-xl border px-3 py-3 sm:px-4 ${tone.box} ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Icon size={18} className={`mt-0.5 shrink-0 ${tone.iconCls}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-black uppercase tracking-widest ${tone.iconCls}`}>
            {flags.length === 1 ? 'Needs attention' : `${flags.length} problems on this record`}
          </p>
          <ul className="mt-1 space-y-2.5">
            {flags.map((f) => (
              <li key={f.ruleId} data-attention-rule={f.ruleId}>
                <p className={`text-sm font-semibold leading-snug ${tone.text}`}>{f.sentence}</p>
                {f.evidence?.length ? (
                  <dl className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {f.evidence.map((e) => (
                      <div
                        key={`${f.ruleId}:${e.label}`}
                        className={`min-w-0 rounded-md border px-2 py-1 ${EVIDENCE_TONE[e.tone] || 'border-slate-200 bg-white text-slate-800'}`}
                      >
                        <dt className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">{e.label}</dt>
                        <dd className="truncate text-xs font-bold tabular-nums" title={e.value}>
                          {e.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            ))}
          </ul>
          {actions.length > 0 && typeof onAction === 'function' ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {actions.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onAction(a)}
                  data-testid={`attention-banner-action-${a.id}`}
                  className={`inline-flex min-h-9 items-center rounded-lg px-3 py-1.5 text-ui-xs font-black uppercase tracking-widest ${
                    i === 0
                      ? 'bg-zarewa-teal text-white hover:brightness-105'
                      : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
