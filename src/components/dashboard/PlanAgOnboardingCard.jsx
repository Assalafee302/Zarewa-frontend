import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { mergeDashboardPrefs, persistDashboardPrefsToServer } from '../../lib/dashboardPrefs';

/**
 * Dashboard checklist persisted via PATCH /api/session/dashboard-prefs (onboardingPlanAG).
 */
export function PlanAgOnboardingCard({ snapshotPrefs, showToast, onWorkspaceRefresh, hasFinance, hasReports }) {
  const merged = useMemo(() => mergeDashboardPrefs(snapshotPrefs), [snapshotPrefs]);
  const onb = merged.onboardingPlanAG || { dismissed: false, items: {} };
  const items = onb.items || {};
  const [busy, setBusy] = useState(false);

  if (onb.dismissed) return null;

  const persistFull = async (partial) => {
    setBusy(true);
    try {
      const next = {
        ...merged,
        onboardingPlanAG: {
          dismissed: partial.dismissed ?? onb.dismissed,
          items: { ...items, ...(partial.items || {}) },
        },
      };
      await persistDashboardPrefsToServer(next);
      showToast('Checklist saved.', { variant: 'success' });
      onWorkspaceRefresh?.();
    } catch (e) {
      showToast(String(e.message || e), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const row = (key, label) => (
    <li className="flex items-start gap-2">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700"
        checked={Boolean(items[key])}
        disabled={busy}
        onChange={() => persistFull({ items: { [key]: !items[key] } })}
      />
      <span className="text-sm font-medium text-slate-700 leading-snug">{label}</span>
    </li>
  );

  return (
    <div className="rounded-xl border border-teal-100/90 bg-gradient-to-br from-teal-50/40 to-white px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-ui-xs font-black uppercase tracking-wide text-teal-900/80">Tracks A–G checklist</p>
          <h2 className="text-sm font-black text-zarewa-teal">Finance &amp; reporting rollout</h2>
        </div>
        <button
          type="button"
          disabled={busy}
          className="text-ui-xs font-black uppercase tracking-wide text-slate-500 hover:text-slate-800"
          onClick={() => persistFull({ dismissed: true })}
        >
          Dismiss
        </button>
      </div>
      <ul className="space-y-2 mb-4">
        {row('rbacReportsOk', 'RBAC: management reports aligned for finance roles (verify /reports).')}
        {hasFinance ? row('dailyBankQueue', 'Daily bank recon queue reviewed (Accounts → Receipts & recon).') : null}
        {hasFinance
          ? row('glCostCenter', 'GL cost center tag tested (Accounts → Audit manual journal + Reports GL pilot).')
          : null}
      </ul>
      <div className="flex flex-wrap gap-2 text-ui-xs font-bold uppercase tracking-wide">
        {hasReports ? (
          <Link
            to="/reports"
            className="rounded-lg border border-teal-200 bg-white px-2.5 py-1.5 text-teal-900 hover:bg-teal-50"
          >
            Reports
          </Link>
        ) : null}
        {hasFinance ? (
          <Link
            to="/accounts"
            className="rounded-lg border border-teal-200 bg-white px-2.5 py-1.5 text-teal-900 hover:bg-teal-50"
          >
            Accounts
          </Link>
        ) : null}
      </div>
    </div>
  );
}
