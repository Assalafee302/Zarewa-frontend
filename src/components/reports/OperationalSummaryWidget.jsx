import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';

/**
 * Phase 11C — compact operational summary for manager / exec dashboards.
 */
export function OperationalSummaryWidget({ className = '', linkTo = '/reports?tab=operational' }) {
  const [pending, setPending] = useState(null);
  const [production, setProduction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [pRes, sRes] = await Promise.all([
      apiFetch('/api/reports/pending-approvals'),
      apiFetch('/api/reports/production-status'),
    ]);
    if (!pRes.ok || pRes.data?.ok === false) {
      setError(pRes.data?.error || 'Could not load operational summary.');
      setLoading(false);
      return;
    }
    if (!sRes.ok || sRes.data?.ok === false) {
      setError(sRes.data?.error || 'Could not load production summary.');
      setLoading(false);
      return;
    }
    setPending(pRes.data);
    setProduction(sRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dualWarnings = pending?.dualControlWarnings?.length ?? 0;
  const gateExceptions = production?.paymentGateExceptions?.length ?? 0;
  const qcGaps = production?.qcGaps?.length ?? 0;
  const hasAlerts = dualWarnings > 0 || gateExceptions > 0 || qcGaps > 0;

  return (
    <section
      className={`rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden ${className}`.trim()}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck size={16} className="text-teal-600 shrink-0" aria-hidden />
          <div className="min-w-0">
            <h3 className="text-xs font-black uppercase tracking-wide text-[#134e4a]">Operational control</h3>
            <p className="text-[10px] text-slate-500 truncate">Pending approvals, production gates, QC</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:text-[#134e4a] disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="p-4">
        {error ? (
          <p className="text-xs text-rose-700">
            {error}{' '}
            <button type="button" onClick={load} className="font-bold underline">
              Retry
            </button>
          </p>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                ['Pending approvals', pending?.totals?.pendingApprovalCount ?? 0],
                ['Pending payments', pending?.totals?.pendingPaymentCount ?? 0],
                ['QC gaps', qcGaps],
                ['Gate breaches', gateExceptions],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="text-lg font-black tabular-nums text-[#134e4a]">{value}</p>
                </div>
              ))}
            </div>
            {hasAlerts ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-950">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden />
                <p>
                  {dualWarnings > 0 ? `${dualWarnings} dual-control warning(s). ` : ''}
                  {gateExceptions > 0 ? `${gateExceptions} payment gate exception(s). ` : ''}
                  {qcGaps > 0 ? `${qcGaps} conversion QC gap(s).` : ''}
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/40">
        <Link
          to={linkTo}
          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-teal-700 hover:text-teal-900"
        >
          Open operational reports
          <ArrowRight size={12} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
