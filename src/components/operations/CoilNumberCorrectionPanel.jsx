import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';

const APPROVER_ROLES = new Set(['admin', 'md', 'ceo', 'chairman', 'sales_manager', 'branch_manager']);

function sessionUser(ws) {
  return ws?.session?.user || ws?.user || null;
}

/**
 * Store asks to replace a mistyped coil number. The number changes only after branch manager approval.
 * `coilNo` set: form on that coil. Empty: pending queue on the stock desk.
 */
export default function CoilNumberCorrectionPanel({ coilNo = '' }) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const navigate = useNavigate();
  const user = sessionUser(ws);
  const roleKey = String(user?.roleKey || user?.role_key || '').trim().toLowerCase();
  const userId = String(user?.id || '').trim();
  const canRequest = Boolean(ws?.hasPermission?.('inventory.receive'));
  const canApprove = Boolean(ws?.hasPermission?.('*')) || APPROVER_ROLES.has(roleKey);
  const focusedCoil = String(coilNo || '').trim();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toCoilNo, setToCoilNo] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!canRequest && !canApprove) return;
    setLoading(true);
    const q = focusedCoil ? `?fromCoilNo=${encodeURIComponent(focusedCoil)}` : '';
    const r = await apiFetch(`/api/coil-number-corrections${q}`);
    setLoading(false);
    if (r.ok && r.data?.ok) setRows(Array.isArray(r.data.corrections) ? r.data.corrections : []);
  }, [canApprove, canRequest, focusedCoil]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingForCoil = useMemo(
    () => rows.find((row) => String(row.fromCoilNo || '') === focusedCoil) || null,
    [focusedCoil, rows]
  );

  async function submitRequest(e) {
    e.preventDefault();
    if (!focusedCoil || busy) return;
    setBusy(true);
    const r = await apiFetch(`/api/coil-lots/${encodeURIComponent(focusedCoil)}/number-correction`, {
      method: 'POST',
      body: JSON.stringify({ toCoilNo, reason }),
    });
    setBusy(false);
    if (!r.ok || !r.data?.ok) {
      showToast(r.data?.error || 'Could not send the correction.', { variant: 'error' });
      return;
    }
    setToCoilNo('');
    setReason('');
    showToast('Sent to the branch manager. The coil number stays as it is until they approve.');
    await load();
  }

  async function decide(id, decision) {
    if (busy) return;
    setBusy(true);
    const r = await apiFetch(`/api/coil-number-corrections/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
    setBusy(false);
    if (!r.ok || !r.data?.ok) {
      showToast(r.data?.error || 'Could not record the decision.', { variant: 'error' });
      return;
    }
    const next = String(r.data?.coilNo || r.data?.correction?.toCoilNo || '').trim();
    showToast(
      decision === 'approve'
        ? `Approved. Coil number is now ${next}.`
        : 'Rejected. The coil number was left unchanged.'
    );
    await ws?.refreshDomain?.('operations');
    await load();
    if (decision === 'approve' && next && focusedCoil && next !== focusedCoil) {
      navigate(`/operations/coils/${encodeURIComponent(next)}`, { replace: true });
    }
  }

  if (!canRequest && !canApprove) return null;
  if (!focusedCoil && rows.length === 0) return null;

  return (
    <section className="mb-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-amber-900">Correct a wrong coil number</h3>
      <p className="mt-1 text-ui-xs text-amber-950/80">
        Store can ask for the number on the mill tag. The register changes only after the branch manager approves.
      </p>

      {focusedCoil && canRequest && !pendingForCoil ? (
        <form onSubmit={submitRequest} className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
          <label className="block text-ui-xs font-semibold text-slate-700">
            Correct number
            <input
              value={toCoilNo}
              onChange={(e) => setToCoilNo(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm"
              placeholder="Number on the coil"
              required
            />
          </label>
          <label className="block text-ui-xs font-semibold text-slate-700">
            Why it is wrong
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              placeholder="Mill tag does not match what was entered"
              required
            />
          </label>
          <button type="submit" className="z-btn-secondary self-end" disabled={busy}>
            {busy ? 'Sending…' : 'Send for approval'}
          </button>
        </form>
      ) : null}

      {loading ? <p className="mt-2 text-ui-xs text-slate-600">Loading corrections…</p> : null}

      {rows.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {rows.map((row) => {
            const own = userId && userId === String(row.requestedByUserId || '');
            return (
              <li key={row.id} className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm">
                <p className="font-mono font-semibold text-slate-900">
                  {row.fromCoilNo} → {row.toCoilNo}
                </p>
                <p className="text-ui-xs text-slate-600">
                  {row.requestedByDisplay || 'Store'} · {row.reason}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {!focusedCoil ? (
                    <button
                      type="button"
                      className="z-btn-secondary"
                      onClick={() => navigate(`/operations/coils/${encodeURIComponent(row.fromCoilNo)}`)}
                    >
                      Open coil
                    </button>
                  ) : null}
                  {canApprove && !own ? (
                    <>
                      <button type="button" className="z-btn-secondary" disabled={busy} onClick={() => decide(row.id, 'approve')}>
                        Approve
                      </button>
                      <button type="button" className="z-btn-secondary" disabled={busy} onClick={() => decide(row.id, 'reject')}>
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-ui-xs font-semibold text-amber-800">Waiting for the branch manager</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
