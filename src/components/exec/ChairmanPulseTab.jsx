import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BarChart3, Landmark, Shield, Wallet } from 'lucide-react';
import { CommandMetricCard } from '../layout/CommandMetricCard';
import { COMMAND_METRIC_GRID, COMMAND_SECTION_EYEBROW, COMMAND_SECTION_SUB, COMMAND_SECTION_TITLE } from '../../lib/execPageUi';
import { formatNgn } from '../../shared/lib/formatNgn.js';
import { apiFetch } from '../../lib/apiBase';
import { InlineLoader } from '../ui/PageLoader';

function alertTone(level) {
  if (level === 'critical') return 'border-rose-300 bg-rose-50 text-rose-950';
  if (level === 'warning') return 'border-amber-300 bg-amber-50/90 text-amber-950';
  if (level === 'opportunity') return 'border-emerald-200 bg-emerald-50/80 text-emerald-950';
  return 'border-slate-200 bg-slate-50 text-slate-800';
}

function money(n) {
  return formatNgn(n);
}

/**
 * Read-only company pulse — same exec dashboard KPIs as CEO Review, without MD Decide.
 */
export function ChairmanPulseTab() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    const { ok, data: d } = await apiFetch('/api/exec/dashboard?periodKey=month&branchId=ALL');
    setBusy(false);
    if (!ok || !d?.ok) {
      setData(null);
      setErr(d?.error || 'Could not load company pulse.');
      return;
    }
    setData(d);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = data?.kpis || {};
  const alerts = Array.isArray(data?.decisionAlerts) ? data.decisionAlerts.slice(0, 8) : [];
  const rate = kpis.collectionRatePct;

  if (busy && !data) {
    return <InlineLoader message="Loading company pulse…" />;
  }

  return (
    <div className="space-y-6">
      {err ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{err}</p>
      ) : null}

      <div>
        <p className={COMMAND_SECTION_EYEBROW}>This month · all branches</p>
        <h2 className={COMMAND_SECTION_TITLE}>How the company is doing</h2>
        <p className={COMMAND_SECTION_SUB}>
          Oversight only. MD clears approvals on Command Centre. Sales is produced-quotation estimate, not a signed
          P&amp;L.
        </p>
      </div>

      <div className={COMMAND_METRIC_GRID}>
        <CommandMetricCard
          label="Sales (est.)"
          value={money(kpis.salesNgn)}
          meta={kpis.salesLabel || 'Produced quotations this month'}
          icon={BarChart3}
          badge="Estimated"
        />
        <CommandMetricCard
          label="Collections"
          value={money(kpis.collectionsNgn)}
          meta={
            rate != null && Number.isFinite(Number(rate))
              ? `${Number(rate).toFixed(0)}% of quoted sales collected`
              : 'Receipts posted this month'
          }
          icon={Wallet}
        />
        <CommandMetricCard
          label="Outstanding"
          value={money(kpis.outstandingReceivablesNgn)}
          meta="Customer receivables still open"
          icon={AlertTriangle}
        />
        <CommandMetricCard
          label="Treasury cash"
          value={money(kpis.treasuryCashNgn)}
          meta={`Operating spend this month ${money(kpis.expensesNgn)}`}
          icon={Landmark}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CommandMetricCard
          label="Critical alerts"
          value={String(kpis.criticalAlerts ?? 0)}
          meta="Items that need a management decision"
          icon={Shield}
          warn={Number(kpis.criticalAlerts) > 0}
          iconTone={Number(kpis.criticalAlerts) > 0 ? 'warn' : 'secondary'}
        />
        <CommandMetricCard
          label="Open executive actions"
          value={String(kpis.pendingExecutiveActions ?? 0)}
          meta="Work sitting in the Command Centre tray"
          icon={AlertTriangle}
          iconTone="tertiary"
        />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-[var(--z-text)]">What needs attention</h2>
        <p className="mt-0.5 mb-3 text-sm text-[var(--z-text-muted)]">
          Read-only. MD acts on Command Centre → Approvals.
        </p>
        {!alerts.length ? (
          <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            No active alerts for this month.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {alerts.map((a) => (
              <div key={a.id} className={`rounded-md border p-4 ${alertTone(a.level)}`}>
                <p className="text-ui-xs font-semibold uppercase tracking-wider opacity-70">{a.level}</p>
                <p className="mt-1.5 text-sm font-semibold">{a.title}</p>
                <p className="mt-2 text-sm leading-snug">{a.message}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-sm text-slate-600">
        <Link
          to="/exec?tab=overview"
          className="inline-flex items-center gap-1 font-semibold text-zarewa-teal no-underline hover:underline"
        >
          Open Command Centre → Review <ArrowRight size={14} />
        </Link>
        <span className="mx-2 text-slate-300">·</span>
        <Link to="/exec?tab=finance" className="font-semibold text-zarewa-teal no-underline hover:underline">
          Finance
        </Link>
        <span className="mx-2 text-slate-300">·</span>
        <Link to="/exec?tab=intelligence" className="font-semibold text-zarewa-teal no-underline hover:underline">
          Insights
        </Link>
      </p>
    </div>
  );
}
