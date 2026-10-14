import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';

const th = 'px-2 py-1.5 text-left text-ui-xs font-semibold uppercase tracking-wide text-slate-500';
const td = 'px-2 py-1.5 text-xs text-slate-800 align-top';
const tdNum = `${td} text-right tabular-nums`;

/**
 * Phase 3 controls — read-only lists:
 * - Balance due after production (produced jobs under 100% paid: receipts + advance applied − reversals).
 * - Locked-period changes (audit rows flagged "Locked-period change").
 */
export function ControlsPhase3Lists() {
  const [due, setDue] = useState({ rows: [], totalOwedNgn: 0 });
  const [locked, setLocked] = useState({ rows: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [d, l] = await Promise.all([
      apiFetch('/api/controls/balance-due-after-production'),
      apiFetch('/api/controls/locked-period-changes'),
    ]);
    if (d.ok && d.data?.ok) setDue({ rows: d.data.rows || [], totalOwedNgn: d.data.totalOwedNgn || 0 });
    if (l.ok && l.data?.ok) setLocked({ rows: l.data.rows || [] });
    if (!(d.ok && d.data?.ok) || !(l.ok && l.data?.ok)) {
      setError(d.data?.error || l.data?.error || 'Could not load the control lists.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mt-8 space-y-8">
      <div className="flex items-center justify-between gap-2">
        <h3 className="z-section-title">Controls</h3>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>
      {error ? <p className="text-xs font-medium text-rose-700">{error}</p> : null}

      <section aria-labelledby="balance-due-after-production">
        <h4 id="balance-due-after-production" className="text-sm font-semibold text-slate-900">
          Balance due after production
        </h4>
        <p className="mb-2 text-xs text-slate-500">
          Produced jobs whose quotation is under 100% paid (receipts + advance applied − reversals). Total owed{' '}
          <span className="font-semibold text-slate-800">{formatNgn(due.totalOwedNgn)}</span>.
        </p>
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Quotation</th>
                <th className={th}>Customer</th>
                <th className={th}>Job(s)</th>
                <th className={th}>Produced</th>
                <th className={`${th} text-right`}>Quotation ₦</th>
                <th className={`${th} text-right`}>Paid ₦</th>
                <th className={`${th} text-right`}>Paid %</th>
                <th className={`${th} text-right`}>Owed ₦</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {due.rows.length ? (
                due.rows.map((r) => (
                  <tr key={r.quotationRef}>
                    <td className={`${td} font-mono`}>{r.quotationRef}</td>
                    <td className={td}>{r.customerName || '—'}</td>
                    <td className={`${td} font-mono`}>{r.jobIDs.join(', ')}</td>
                    <td className={td}>{r.firstCompletedISO || '—'}</td>
                    <td className={tdNum}>{formatNgn(r.totalNgn)}</td>
                    <td className={tdNum}>{formatNgn(r.paidNgn)}</td>
                    <td className={tdNum}>{r.paidPct}%</td>
                    <td className={`${tdNum} font-semibold`}>{formatNgn(r.owedNgn)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className={td} colSpan={8}>
                    {loading ? 'Loading…' : 'No produced job with a balance due.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="locked-period-changes">
        <h4 id="locked-period-changes" className="text-sm font-semibold text-slate-900">
          Locked-period changes
        </h4>
        <p className="mb-2 text-xs text-slate-500">
          Edits to records dated in a locked month (audit flag “Locked-period change”).
        </p>
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>When</th>
                <th className={th}>By</th>
                <th className={th}>Action</th>
                <th className={th}>Record</th>
                <th className={th}>Record date</th>
                <th className={th}>Locked month</th>
                <th className={th}>Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {locked.rows.length ? (
                locked.rows.map((r) => (
                  <tr key={r.auditId}>
                    <td className={td}>{String(r.occurredAtISO || '').slice(0, 16).replace('T', ' ')}</td>
                    <td className={td}>{r.actorName || '—'}</td>
                    <td className={`${td} font-mono`}>{r.action}</td>
                    <td className={`${td} font-mono`}>
                      {r.entityKind} {r.entityId}
                    </td>
                    <td className={td}>{r.recordDateISO}</td>
                    <td className={td}>{r.periodKey}</td>
                    <td className={td}>{r.note}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className={td} colSpan={7}>
                    {loading ? 'Loading…' : 'No locked-period changes.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default ControlsPhase3Lists;
