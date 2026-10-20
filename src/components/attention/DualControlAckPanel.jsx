import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { DUAL_CONTROL_ACK_NOTE_MIN_LEN } from '../../lib/dualControlAck';

const KIND_LABEL = {
  same_requester_approver: 'Requested and approved by the same person',
  same_approver_payer: 'Approved and paid by the same person',
};

function fmtWhen(iso) {
  const t = Date.parse(String(iso || ''));
  if (!Number.isFinite(t)) return '';
  return new Date(t).toLocaleString('en-GB', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Same-person refund warnings on a refund record: who acknowledged, when, and the note — plus, for MD/CEO,
 * the "Acknowledge with note" form for a warning that is still open.
 *
 * @param {{
 *   refundId: string;
 *   openKinds?: string[];
 *   canAcknowledge?: boolean;
 *   onAcknowledged?: () => void | Promise<void>;
 *   fetchImpl?: typeof apiFetch;
 * }} props
 */
export function DualControlAckPanel({ refundId, openKinds = [], canAcknowledge = false, onAcknowledged, fetchImpl = apiFetch }) {
  const rid = String(refundId || '').trim();
  const [acks, setAcks] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!rid) return;
    const { ok, data } = await fetchImpl(`/api/management/dual-control/acknowledgements?refundId=${encodeURIComponent(rid)}`);
    if (ok && data?.ok) setAcks(Array.isArray(data.items) ? data.items : []);
  }, [rid, fetchImpl]);

  useEffect(() => {
    void load();
  }, [load]);

  const ackedKinds = new Set(acks.map((a) => a.kind));
  const pending = openKinds.filter((k) => KIND_LABEL[k] && !ackedKinds.has(k));
  if (!rid || (acks.length === 0 && pending.length === 0)) return null;

  const submit = async () => {
    const text = note.trim();
    if (text.length < DUAL_CONTROL_ACK_NOTE_MIN_LEN) {
      setError(`Write at least ${DUAL_CONTROL_ACK_NOTE_MIN_LEN} characters saying why this is accepted.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      for (const kind of pending) {
        const { ok, data } = await fetchImpl('/api/management/dual-control/acknowledge', {
          method: 'POST',
          body: JSON.stringify({ refundId: rid, kind, note: text }),
        });
        if (!ok || !data?.ok) {
          setError(data?.error || 'Could not record the acknowledgement.');
          return;
        }
      }
      setNote('');
      await load();
      await onAcknowledged?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
      aria-label="Same-person warnings on this refund"
      data-testid="dual-control-ack-panel"
    >
      <p className="text-ui-xs font-black uppercase tracking-widest text-slate-500">Same-person warnings</p>
      {acks.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {acks.map((a) => (
            <li key={`${a.kind}:${a.auditId}`} className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
              <p className="flex items-center gap-1.5 font-semibold text-emerald-900">
                <ShieldCheck size={14} aria-hidden /> {KIND_LABEL[a.kind] || a.kind} — acknowledged
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                by <strong>{a.acknowledgedBy || '—'}</strong>
                {a.acknowledgedAtIso ? ` on ${fmtWhen(a.acknowledgedAtIso)}` : ''}
              </p>
              <p className="mt-1 text-xs text-slate-800">“{a.note}”</p>
            </li>
          ))}
        </ul>
      ) : null}
      {pending.length > 0 ? (
        canAcknowledge ? (
          <div className="mt-2 space-y-2">
            <label htmlFor={`dual-ack-note-${rid}`} className="block text-xs font-semibold text-slate-700">
              Acknowledge with note — why is this accepted? (MD/CEO, recorded in the audit log)
            </label>
            <textarea
              id={`dual-ack-note-${rid}`}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError('');
              }}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-zarewa-teal/20"
              placeholder="e.g. Only cashier on duty that day; payout checked against the bank alert."
            />
            {error ? (
              <p role="alert" className="text-xs font-semibold text-rose-800">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              data-attention-action="acknowledge"
              disabled={busy}
              onClick={() => void submit()}
              className="inline-flex min-h-9 items-center rounded-lg bg-zarewa-teal px-3 py-1.5 text-ui-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            >
              {busy ? 'Recording…' : 'Acknowledge with note'}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-600">
            {pending.map((k) => KIND_LABEL[k]).join('; ')} — open. Only the MD or CEO can acknowledge it.
          </p>
        )
      ) : null}
    </section>
  );
}
