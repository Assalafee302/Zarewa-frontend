import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Circle, RefreshCw, Flag } from 'lucide-react';
import { apiFetch } from '../../../lib/apiBase';
import { ACCOUNTING_CARD_ROW } from './AccountingDeskUi';

const STATUS_ICON = {
  ok: <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />,
  warn: <AlertTriangle size={16} className="text-amber-600 shrink-0" />,
  fail: <XCircle size={16} className="text-rose-600 shrink-0" />,
  pending: <Circle size={16} className="text-slate-400 shrink-0" />,
};

/**
 * @param {{
 *   onFocusTab?: (tabId: string) => void;
 *   deskRefresh?: number;
 *   plan?: object | null;
 * }} props
 */
export function AccountingCutoverActionPlan({ onFocusTab, deskRefresh = 0, plan = null }) {
  const [localPlan, setLocalPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/finance/cutover-plan');
      if (res.ok && res.data?.ok) setLocalPlan(res.data);
      else setLocalPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (plan) return;
    load();
  }, [load, deskRefresh, plan]);

  const data = plan || localPlan;

  if (loading && !data) {
    return <div className="h-24 animate-pulse rounded-xl bg-slate-100" />;
  }
  if (!data) return null;

  return (
    <section className="rounded-xl border border-zarewa-teal/15 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-teal-50/50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Flag size={14} className="text-zarewa-teal" />
          <div>
            <h3 className="text-ui-xs font-black uppercase tracking-wide text-zarewa-teal">Cutover action plan</h3>
            <p className="text-ui-xs text-slate-600">{data.summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-black tabular-nums text-zarewa-teal">{data.progressPct}%</span>
          {!plan ? (
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-ui-xs font-bold uppercase text-zarewa-teal"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-4 py-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-zarewa-teal transition-all"
            style={{ width: `${data.progressPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-ui-xs text-slate-500">{data.disclaimer}</p>
      </div>

      <div className="divide-y divide-slate-100">
        {(data.phases || []).map((phase) => (
          <div key={phase.id} className="px-4 py-3">
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-500 mb-2">{phase.title}</p>
            <ul className="space-y-1.5">
              {(phase.items || []).map((item) => (
                <li key={item.id} className={`${ACCOUNTING_CARD_ROW} flex items-start gap-2 py-2`}>
                  {STATUS_ICON[item.status] || STATUS_ICON.pending}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800">{item.label}</p>
                    <p className="text-ui-xs text-slate-600 mt-0.5 leading-snug">{item.detail}</p>
                  </div>
                  {item.focusTab && onFocusTab ? (
                    <button
                      type="button"
                      onClick={() => onFocusTab(item.focusTab)}
                      className="shrink-0 text-ui-xs font-bold uppercase text-teal-800 hover:underline"
                    >
                      Open →
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
