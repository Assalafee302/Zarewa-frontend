import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiFetch, apiUrl } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';

async function downloadGovernancePackCsv() {
  const r = await fetch(apiUrl('/api/reports/governance-pack?format=csv'), { credentials: 'include' });
  if (!r.ok) return false;
  const text = await r.text();
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `governance-pack-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

function Section({ title, children, count }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-black text-slate-900">
        {title}
        {count != null ? <span className="ml-2 text-xs font-bold text-slate-500">({count})</span> : null}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function RowList({ rows, render }) {
  if (!rows?.length) {
    return <p className="text-xs text-slate-500">None</p>;
  }
  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
      {rows.map((row) => (
        <li key={render.key(row)} className="px-3 py-2 text-[11px]">
          {render.body(row)}
        </li>
      ))}
    </ul>
  );
}

/**
 * Phase 11B operational reports — pending approvals & production status.
 */
export function OperationalReportsPanel() {
  const [pending, setPending] = useState(null);
  const [production, setProduction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [packDownloading, setPackDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [pRes, sRes] = await Promise.all([
      apiFetch('/api/reports/pending-approvals'),
      apiFetch('/api/reports/production-status'),
    ]);
    if (!pRes.ok || pRes.data?.ok === false) {
      setError(pRes.data?.error || 'Could not load pending approvals.');
      setLoading(false);
      return;
    }
    if (!sRes.ok || sRes.data?.ok === false) {
      setError(sRes.data?.error || 'Could not load production status.');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <RefreshCw className="animate-spin" size={20} />
        Loading operational reports…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        {error}
        <button type="button" onClick={load} className="ml-3 font-bold underline">
          Retry
        </button>
      </div>
    );
  }

  const mix = production?.statusMix || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-slate-500">
          Phase 11B operational reports · Phase 11C governance pack export
        </p>
        <button
          type="button"
          disabled={packDownloading}
          onClick={async () => {
            setPackDownloading(true);
            await downloadGovernancePackCsv();
            setPackDownloading(false);
          }}
          className="inline-flex items-center rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-teal-900 hover:bg-teal-100 disabled:opacity-50"
        >
          {packDownloading ? 'Preparing…' : 'Download governance pack (CSV)'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Pending approvals', pending?.totals?.pendingApprovalCount ?? 0],
          ['Pending payments', pending?.totals?.pendingPaymentCount ?? 0],
          ['Production jobs', production?.totalJobs ?? 0],
          ['QC gaps', production?.qcGaps?.length ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
            <p className="text-2xl font-black tabular-nums text-[#134e4a]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Pending refund approvals" count={pending?.refunds?.pending?.length}>
          <RowList
            rows={pending?.refunds?.pending}
            render={{
              key: (r) => r.refund_id,
              body: (r) => (
                <>
                  <span className="font-mono font-bold">{r.refund_id}</span>
                  <span className="ml-2">{formatNgn(r.amount_ngn)}</span>
                  <p className="text-slate-500">{r.customer_name} · {r.quotation_ref}</p>
                </>
              ),
            }}
          />
        </Section>

        <Section title="Approved refunds awaiting payment" count={pending?.refunds?.approvedUnpaid?.length}>
          <RowList
            rows={pending?.refunds?.approvedUnpaid}
            render={{
              key: (r) => r.refund_id,
              body: (r) => (
                <>
                  <span className="font-mono font-bold">{r.refund_id}</span>
                  <span className="ml-2">{formatNgn(r.approved_amount_ngn ?? r.amount_ngn)}</span>
                  <p className="text-slate-500">Approved by {r.approved_by || '—'}</p>
                </>
              ),
            }}
          />
        </Section>

        <Section title="Production gate — awaiting BM override" count={pending?.productionGate?.awaitingBmOverride?.length}>
          <RowList
            rows={pending?.productionGate?.awaitingBmOverride}
            render={{
              key: (r) => r.id,
              body: (r) => (
                <>
                  <span className="font-mono font-bold">{r.quotation_ref}</span>
                  <p className="text-slate-500">
                    {r.customer_name} · paid {formatNgn(r.paid_ngn)} / {formatNgn(r.total_ngn)}
                  </p>
                </>
              ),
            }}
          />
        </Section>

        <Section title="Conversion reviews" count={pending?.conversionReviews?.unsignedHighLow?.length}>
          <RowList
            rows={pending?.conversionReviews?.unsignedHighLow}
            render={{
              key: (r) => r.job_id,
              body: (r) => (
                <>
                  <span className="font-mono font-bold">{r.job_id}</span>
                  <span className="ml-2">{r.conversion_alert_state}</span>
                  <p className="text-slate-500">{r.quotation_ref}</p>
                </>
              ),
            }}
          />
        </Section>
      </div>

      <Section title="Production status mix">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {['Planned', 'Running', 'Completed', 'Cancelled'].map((st) => (
            <div key={st} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase text-slate-500">{st}</p>
              <p className="text-lg font-black text-slate-900">{mix[st] ?? 0}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase text-slate-500">Metre outliers (&gt;5%)</p>
            <RowList
              rows={production?.plannedActualOutliers}
              render={{
                key: (r) => r.jobId,
                body: (r) => (
                  <span>
                    {r.jobId}: {r.plannedMeters}m plan · {r.actualMeters}m actual
                  </span>
                ),
              }}
            />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase text-slate-500">Payment gate breaches</p>
            <RowList
              rows={production?.paymentGateExceptions}
              render={{
                key: (r) => r.jobId,
                body: (r) => (
                  <span>
                    {r.jobId} · {r.quotationRef} · {r.paidPct}% paid
                  </span>
                ),
              }}
            />
          </div>
        </div>
      </Section>

      {pending?.dualControlWarnings?.length ? (
        <Section title="Dual-control warnings" count={pending.dualControlWarnings.length}>
          <RowList
            rows={pending.dualControlWarnings}
            render={{
              key: (r) => `${r.kind}-${r.refundId}`,
              body: (r) => (
                <>
                  <span className="font-mono font-bold">{r.refundId}</span>
                  <p className="text-slate-600">{r.message}</p>
                </>
              ),
            }}
          />
        </Section>
      ) : null}
    </div>
  );
}
