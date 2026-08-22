import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import {
  CSAT_LABELS,
  CSAT_REQUIRED_ABOVE_NGN,
  csatStarString,
  deliveryNeedsCsat,
} from '../../lib/opsUiChrome';

const ROLE_OPTIONS = [
  { id: 'driver', label: 'Driver' },
  { id: 'store', label: 'Store' },
  { id: 'sales', label: 'Sales' },
];

/**
 * Proof-of-delivery confirm with 1–5 CSAT (stars), optional below threshold / required above.
 */
export function DeliveryPodPanel({ branchId = '', showSalesLink = true }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState('');
  const [drafts, setDrafts] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await apiFetch('/api/deliveries').catch(() => ({ ok: false }));
    setLoading(false);
    if (!res.ok) {
      setError(res.data?.error || 'Could not load deliveries.');
      setRows([]);
      return;
    }
    setRows(Array.isArray(res.data?.deliveries) ? res.data.deliveries : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load, branchId]);

  const pending = useMemo(
    () =>
      rows.filter((d) => {
        const st = String(d.status || '').toLowerCase();
        return st && st !== 'delivered' && st !== 'cancelled';
      }),
    [rows]
  );

  const scoredRecent = useMemo(() => {
    return rows
      .filter((d) => String(d.status || '').toLowerCase() === 'delivered' && d.satisfactionScore != null)
      .slice(0, 10);
  }, [rows]);

  const avgRecent = useMemo(() => {
    if (!scoredRecent.length) return null;
    const sum = scoredRecent.reduce((s, d) => s + Number(d.satisfactionScore), 0);
    return Math.round((sum / scoredRecent.length) * 10) / 10;
  }, [scoredRecent]);

  const skippedToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return rows.filter((d) => {
      const st = String(d.status || '').toLowerCase();
      const day = String(d.deliveredDateISO || d.deliveredDate || '').slice(0, 10);
      return st === 'delivered' && day === today && d.satisfactionScore == null;
    }).length;
  }, [rows]);

  const setDraft = (id, patch) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  const confirm = async (delivery) => {
    if (busyId) return;
    const id = delivery.id;
    const draft = drafts[id] || {};
    const scoreRaw = draft.satisfactionScore;
    const score = scoreRaw === '' || scoreRaw == null ? null : Number(scoreRaw);
    const need = deliveryNeedsCsat(delivery);
    if (need && score == null) {
      setError(`Satisfaction is required for deliveries ≥ ₦${CSAT_REQUIRED_ABOVE_NGN.toLocaleString()}.`);
      return;
    }
    if (score != null && (!Number.isInteger(score) || score < 1 || score > 5)) {
      setError('Satisfaction score must be 1–5.');
      return;
    }
    setBusyId(id);
    setError('');
    setSuccess('');
    const body = {
      status: 'Delivered',
      deliveredDateISO: new Date().toISOString().slice(0, 10),
      podNotes: String(draft.podNotes || '').trim() || undefined,
      customerSignedPod: Boolean(draft.customerSignedPod),
      courierConfirmed: Boolean(draft.courierConfirmed ?? true),
      podCollectedByRole: draft.podCollectedByRole || 'store',
      ...(score != null ? { satisfactionScore: score } : {}),
    };
    const res = await apiFetch(`/api/deliveries/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
      body: JSON.stringify(body),
    }).catch(() => ({ ok: false }));
    setBusyId('');
    if (!res.ok || res.data?.ok === false) {
      const gate = res.data?.deliveryGate?.message || res.data?.code;
      setError(
        res.data?.error ||
          (gate ? `Delivery blocked: ${gate}` : 'Could not confirm delivery.')
      );
      return;
    }
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    const complaint = res.data?.lowCsatComplaint;
    setSuccess(
      complaint?.id
        ? `Delivered. Low CSAT opened complaint ${complaint.id}.`
        : 'Delivery confirmed.'
    );
    await load();
  };

  return (
    <section className="z-soft-panel overflow-hidden">
      <header className="shrink-0 border-b border-[var(--z-border)] bg-[var(--z-surface-muted)]/40 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Truck size={16} className="mt-0.5 text-zarewa-teal" aria-hidden />
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-[var(--z-text)]">
                Proof of delivery
              </h3>
              <p className="mt-0.5 text-ui-xs font-medium text-slate-500 leading-snug">
                Ask the customer at handover. Scores ≤2 open a complaint. Required above ₦
                {CSAT_REQUIRED_ABOVE_NGN.toLocaleString()}.
              </p>
            </div>
          </div>
          {showSalesLink ? (
            <Link to="/sales" className="text-ui-xs font-bold text-zarewa-teal hover:underline shrink-0">
              Sales
            </Link>
          ) : null}
        </div>
      </header>
      <div className="p-4 space-y-3 text-xs">
        {error ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-950" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-emerald-950">{success}</p>
        ) : null}
        {!loading && skippedToday > 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-600">
            {skippedToday} delivery{skippedToday === 1 ? '' : 'ies'} confirmed today without a CSAT score —
            sampling may be biased.
          </p>
        ) : null}
        {loading ? <p className="text-slate-500">Loading deliveries…</p> : null}
        {!loading && pending.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center">
            <p className="font-semibold text-slate-700">No open deliveries awaiting POD</p>
            <p className="mt-1 text-ui-xs text-slate-500">When loads go out, confirm them here with a score.</p>
          </div>
        ) : null}
        {pending.slice(0, 8).map((d) => {
          const draft = drafts[d.id] || {};
          const need = deliveryNeedsCsat(d);
          return (
            <div key={d.id} className="rounded-lg border border-slate-100 px-3 py-2.5 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono font-bold text-zarewa-teal">{d.id}</p>
                <p className="text-ui-xs text-slate-500">{d.status}</p>
              </div>
              <p className="font-semibold text-slate-800">
                {d.customer || d.customerID || 'Customer'}
                {d.quotationRef ? ` · ${d.quotationRef}` : ''}
              </p>
              <fieldset className="space-y-1">
                <legend className="text-ui-xs font-bold uppercase text-slate-500">
                  Satisfaction {need ? '(required)' : '(optional)'}
                </legend>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Customer satisfaction">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = Number(draft.satisfactionScore) === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setDraft(d.id, { satisfactionScore: String(n) })}
                        className={`rounded-lg border px-2 py-1.5 text-ui-xs font-bold focus:outline-none focus:ring-2 focus:ring-zarewa-teal/40 ${
                          active
                            ? 'border-zarewa-teal bg-teal-50 text-zarewa-teal'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                        title={`${n} — ${CSAT_LABELS[n]}`}
                      >
                        {n} · {CSAT_LABELS[n]}
                      </button>
                    );
                  })}
                  {!need ? (
                    <button
                      type="button"
                      onClick={() => setDraft(d.id, { satisfactionScore: '' })}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-ui-xs font-semibold text-slate-500"
                    >
                      Skip
                    </button>
                  ) : null}
                </div>
              </fieldset>
              <label className="block text-ui-xs font-bold uppercase text-slate-500">
                Collected by
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold"
                  value={draft.podCollectedByRole || 'store'}
                  onChange={(e) => setDraft(d.id, { podCollectedByRole: e.target.value })}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-ui-xs font-bold uppercase text-slate-500">
                POD notes
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                  value={draft.podNotes || ''}
                  onChange={(e) => setDraft(d.id, { podNotes: e.target.value })}
                  placeholder="Optional"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-ui-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(draft.customerSignedPod)}
                  onChange={(e) => setDraft(d.id, { customerSignedPod: e.target.checked })}
                />
                Customer signed POD
              </label>
              <button
                type="button"
                disabled={busyId === d.id || Boolean(busyId)}
                onClick={() => void confirm(d)}
                className="z-btn-primary text-ui-xs disabled:opacity-50"
              >
                {busyId === d.id ? 'Confirming…' : 'Confirm delivered'}
              </button>
            </div>
          );
        })}
        {scoredRecent.length > 0 ? (
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-ui-xs font-black uppercase tracking-wide text-slate-500">
                Recent satisfaction
              </p>
              {avgRecent != null ? (
                <p className="text-ui-xs font-bold text-zarewa-teal">Avg {avgRecent}/5</p>
              ) : null}
            </div>
            <div className="flex gap-0.5 h-2 rounded overflow-hidden" aria-hidden>
              {scoredRecent.map((d) => (
                <div
                  key={`bar-${d.id}`}
                  className="flex-1 bg-teal-200"
                  style={{ opacity: 0.35 + (Number(d.satisfactionScore) / 5) * 0.65 }}
                  title={`${d.id}: ${d.satisfactionScore}`}
                />
              ))}
            </div>
            {scoredRecent.map((d) => (
              <div
                key={`scored-${d.id}`}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2"
              >
                <div>
                  <p className="font-mono text-ui-xs font-bold text-zarewa-teal">{d.id}</p>
                  <p className="text-ui-xs font-semibold text-slate-700">
                    {d.customer || d.customerID || 'Customer'}
                  </p>
                </div>
                <p className="text-sm font-black tabular-nums text-zarewa-teal" title={CSAT_LABELS[d.satisfactionScore]}>
                  <span className="text-amber-500" aria-hidden>
                    {csatStarString(d.satisfactionScore)}
                  </span>{' '}
                  {d.satisfactionScore}
                  <span className="text-ui-xs font-bold text-slate-400"> / 5</span>
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
