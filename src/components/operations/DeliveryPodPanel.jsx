import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Truck } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';

/**
 * Proof-of-delivery confirm with optional 1–5 customer satisfaction score.
 */
export function DeliveryPodPanel({ branchId = '' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
    const list = Array.isArray(res.data?.deliveries) ? res.data.deliveries : [];
    setRows(list);
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
      .filter((d) => {
        const st = String(d.status || '').toLowerCase();
        return st === 'delivered' && d.satisfactionScore != null;
      })
      .slice(0, 8);
  }, [rows]);

  const setDraft = (id, patch) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  const confirm = async (delivery) => {
    const id = delivery.id;
    const draft = drafts[id] || {};
    const scoreRaw = draft.satisfactionScore;
    const score = scoreRaw === '' || scoreRaw == null ? null : Number(scoreRaw);
    if (score != null && (!Number.isInteger(score) || score < 1 || score > 5)) {
      setError('Satisfaction score must be 1–5.');
      return;
    }
    setBusyId(id);
    setError('');
    const body = {
      status: 'Delivered',
      deliveredDateISO: new Date().toISOString().slice(0, 10),
      podNotes: String(draft.podNotes || '').trim() || undefined,
      customerSignedPod: Boolean(draft.customerSignedPod),
      courierConfirmed: Boolean(draft.courierConfirmed ?? true),
      ...(score != null ? { satisfactionScore: score } : {}),
    };
    const res = await apiFetch(`/api/deliveries/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
      body: JSON.stringify(body),
    }).catch(() => ({ ok: false }));
    setBusyId('');
    if (!res.ok || res.data?.ok === false) {
      setError(res.data?.error || 'Could not confirm delivery.');
      return;
    }
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await load();
  };

  return (
    <section className="flex flex-col rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <header className="shrink-0 border-b border-slate-100 bg-slate-50/90 px-4 py-3">
        <div className="flex items-start gap-2">
          <Truck size={16} className="mt-0.5 text-zarewa-teal" aria-hidden />
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-zarewa-teal">
              Proof of delivery
            </h3>
            <p className="mt-0.5 text-ui-xs font-medium text-slate-500 leading-snug">
              Confirm delivery and optionally capture customer satisfaction (1–5). Not complaint-biased.
            </p>
          </div>
        </div>
      </header>
      <div className="p-4 space-y-3 text-xs">
        {error ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-950">{error}</p>
        ) : null}
        {loading ? <p className="text-slate-500">Loading deliveries…</p> : null}
        {!loading && pending.length === 0 ? (
          <p className="text-slate-500">No open deliveries awaiting POD.</p>
        ) : null}
        {pending.slice(0, 8).map((d) => {
          const draft = drafts[d.id] || {};
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
              <label className="block text-ui-xs font-bold uppercase text-slate-500">
                Satisfaction (1–5, optional)
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold"
                  value={draft.satisfactionScore ?? ''}
                  onChange={(e) => setDraft(d.id, { satisfactionScore: e.target.value })}
                >
                  <option value="">Skip</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
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
                disabled={busyId === d.id}
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
            <p className="text-ui-xs font-black uppercase tracking-wide text-slate-500">
              Recent satisfaction scores
            </p>
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
                <p className="text-sm font-black tabular-nums text-zarewa-teal">
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
