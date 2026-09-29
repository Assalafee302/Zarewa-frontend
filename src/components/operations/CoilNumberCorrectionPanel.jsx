import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  OPS_GHOST_BTN,
  OPS_SECTION_HINT,
  OPS_SECTION_TITLE,
  OPS_TOOL_BTN,
  OPS_TOOL_BTN_PRIMARY,
} from './operationsDeskUi';

const APPROVER_ROLES = new Set(['admin', 'md', 'ceo', 'chairman', 'sales_manager', 'branch_manager']);
const REQUEST_ROLES = new Set(['operations_officer', 'storekeeper', 'store_keeper']);

function sessionUser(ws) {
  return ws?.session?.user || ws?.user || null;
}

function kgText(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg on hand`;
}

function impactSummary(impact) {
  if (!impact) return '';
  const facts = [kgText(impact.onHandKg), impact.status, impact.gaugeLabel, impact.colour].filter(Boolean);
  const links = [];
  if (impact.jobCount) links.push(`${impact.jobCount} production job${impact.jobCount === 1 ? '' : 's'}`);
  if (impact.movementCount) links.push(`${impact.movementCount} stock movement${impact.movementCount === 1 ? '' : 's'}`);
  if (impact.controlEventCount) links.push(`${impact.controlEventCount} control record${impact.controlEventCount === 1 ? '' : 's'}`);
  const moved = links.length
    ? `The number change also updates ${links.join(', ')}.`
    : 'Weight, cost, and any jobs stay on this coil.';
  return [facts.join(' · '), moved].filter(Boolean).join('. ');
}

function previewHint(preview) {
  if (!preview?.toCoilNo) return '';
  if (preview.sameNumber) return 'That is already the number on this coil.';
  if (preview.taken) return `${preview.toCoilNo} is already in the register.`;
  if (preview.reservedByPending) return `${preview.toCoilNo} is already waiting on another correction.`;
  if (preview.pendingOnCoil) return 'A correction for this coil is already with the branch manager.';
  if (preview.available) return `${preview.toCoilNo} is free. It will not change until the branch manager approves.`;
  return '';
}

/**
 * Store asks to replace a mistyped coil number. The register changes only after a branch manager approves.
 * `coilNo` set: action on that coil. Empty: pending queue on the stock desk.
 */
export default function CoilNumberCorrectionPanel({ coilNo = '' }) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const navigate = useNavigate();
  const user = sessionUser(ws);
  const roleKey = String(user?.roleKey || user?.role_key || '').trim().toLowerCase();
  const department = String(user?.department || '').trim().toLowerCase().replace(/\s+/g, '_');
  const userId = String(user?.id || '').trim();
  const canRequest =
    Boolean(ws?.hasPermission?.('inventory.receive')) ||
    Boolean(ws?.hasPermission?.('*')) ||
    REQUEST_ROLES.has(roleKey) ||
    REQUEST_ROLES.has(department);
  const canApprove = Boolean(ws?.hasPermission?.('*')) || APPROVER_ROLES.has(roleKey);
  const focusedCoil = String(coilNo || '').trim();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [step, setStep] = useState('edit');
  const [fromDraft, setFromDraft] = useState('');
  const [toCoilNo, setToCoilNo] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmById, setConfirmById] = useState({});
  const [rejectNoteById, setRejectNoteById] = useState({});

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

  const sourceCoil = focusedCoil || fromDraft.trim();
  const pendingForCoil = useMemo(
    () =>
      sourceCoil
        ? rows.find((row) => String(row.fromCoilNo || '').toLowerCase() === sourceCoil.toLowerCase()) || null
        : null,
    [rows, sourceCoil]
  );

  useEffect(() => {
    if (!composerOpen || !sourceCoil) {
      setPreview(null);
      setPreviewError('');
      setChecking(false);
      return undefined;
    }
    const typed = toCoilNo.trim();
    if (typed.length < 2) {
      setPreview(null);
      setPreviewError('');
      setChecking(false);
      return undefined;
    }
    let cancelled = false;
    setChecking(true);
    const timer = setTimeout(async () => {
      const r = await apiFetch(
        `/api/coil-lots/${encodeURIComponent(sourceCoil)}/number-correction/preview?toCoilNo=${encodeURIComponent(typed)}`
      );
      if (cancelled) return;
      setChecking(false);
      if (r.ok && r.data?.ok) {
        setPreview(r.data);
        setPreviewError('');
      } else {
        setPreview(null);
        setPreviewError(r.data?.error || 'Could not check that number.');
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [composerOpen, sourceCoil, toCoilNo]);

  function resetComposer() {
    setComposerOpen(false);
    setStep('edit');
    setFromDraft('');
    setToCoilNo('');
    setReason('');
    setPreview(null);
    setPreviewError('');
  }

  async function submitRequest() {
    if (!sourceCoil || busy || !preview?.available) return;
    setBusy(true);
    const r = await apiFetch(`/api/coil-lots/${encodeURIComponent(sourceCoil)}/number-correction`, {
      method: 'POST',
      body: JSON.stringify({ toCoilNo: preview.toCoilNo || toCoilNo, reason }),
    });
    setBusy(false);
    if (!r.ok || !r.data?.ok) {
      showToast(r.data?.error || 'Could not send the correction.', { variant: 'error' });
      return;
    }
    resetComposer();
    showToast('Sent to the branch manager. The coil number stays as it is until they approve.');
    await load();
  }

  async function decide(row, decision) {
    if (busy) return;
    const note = String(rejectNoteById[row.id] || '').trim();
    const confirmCoilNo = String(confirmById[row.id] || '').trim();
    if (decision === 'approve' && confirmCoilNo.toLowerCase() !== String(row.toCoilNo || '').toLowerCase()) {
      showToast('Type the new coil number to confirm the approval.', { variant: 'error' });
      return;
    }
    if (decision === 'reject' && note.length < 3) {
      showToast('Write a short reason for rejecting this correction.', { variant: 'error' });
      return;
    }
    setBusy(true);
    const r = await apiFetch(`/api/coil-number-corrections/${encodeURIComponent(row.id)}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, note, confirmCoilNo }),
    });
    setBusy(false);
    if (!r.ok || !r.data?.ok) {
      showToast(r.data?.error || 'Could not record the decision.', { variant: 'error' });
      return;
    }
    const next = String(r.data?.coilNo || r.data?.correction?.toCoilNo || '').trim();
    showToast(
      decision === 'approve'
        ? `Approved. The coil number is now ${next}. Weight and jobs moved with it.`
        : 'Rejected. The coil number was left unchanged.'
    );
    await ws?.refreshDomain?.('operations');
    await load();
    if (decision === 'approve' && next && focusedCoil && next.toLowerCase() !== focusedCoil.toLowerCase()) {
      navigate(`/operations/coils/${encodeURIComponent(next)}`, { replace: true });
    }
  }

  async function withdraw(row) {
    if (busy) return;
    setBusy(true);
    const r = await apiFetch(`/api/coil-number-corrections/${encodeURIComponent(row.id)}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    setBusy(false);
    if (!r.ok || !r.data?.ok) {
      showToast(r.data?.error || 'Could not withdraw the correction.', { variant: 'error' });
      return;
    }
    showToast('Withdrawn. The coil number was left unchanged.');
    await load();
  }

  if (!canRequest && !canApprove) return null;
  // The stock desk is where store starts a correction. Hide it there only for approvers with an empty queue.
  if (!focusedCoil && !canRequest && rows.length === 0) return null;
  if (focusedCoil && !canRequest && !pendingForCoil) return null;

  const hint = previewHint(preview);
  const hintTone = preview?.available ? 'text-emerald-800' : 'text-rose-800';

  return (
    <section className="mb-3 rounded-lg border border-[var(--z-border)] bg-[var(--z-surface)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={OPS_SECTION_TITLE}>
            {focusedCoil || canRequest ? 'Coil number' : 'Coil numbers waiting for approval'}
          </h3>
          <p className={OPS_SECTION_HINT}>
            {focusedCoil || canRequest
              ? 'A wrong number stays on the coil until a branch manager approves the correction.'
              : 'Check the mill tag, then confirm the new number before you approve.'}
          </p>
        </div>
        {canRequest && !composerOpen && !(focusedCoil && pendingForCoil) ? (
          <button type="button" className={OPS_TOOL_BTN} onClick={() => setComposerOpen(true)}>
            Correct number
          </button>
        ) : null}
      </div>

      {composerOpen && !(focusedCoil && pendingForCoil) ? (
        <div className="mt-3 rounded-md border border-[var(--z-border)] bg-[var(--z-surface-muted)]/40 p-3">
          {step === 'edit' ? (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-ui-xs font-semibold text-[var(--z-text)]">
                  Number on the coil now
                  <input
                    value={focusedCoil || fromDraft}
                    readOnly={Boolean(focusedCoil)}
                    onChange={(e) => {
                      if (focusedCoil) return;
                      setFromDraft(e.target.value);
                      setStep('edit');
                    }}
                    className={`mt-1 w-full rounded-md border border-[var(--z-border)] bg-white px-2.5 py-2 font-mono text-sm ${focusedCoil ? 'text-[var(--z-text-muted)]' : 'text-[var(--z-text)]'}`}
                    placeholder="As it was entered at receipt"
                    autoFocus={!focusedCoil}
                  />
                </label>
                <label className="block text-ui-xs font-semibold text-[var(--z-text)]">
                  Correct number
                  <input
                    value={toCoilNo}
                    onChange={(e) => {
                      setToCoilNo(e.target.value);
                      setStep('edit');
                    }}
                    className="mt-1 w-full rounded-md border border-[var(--z-border)] bg-white px-2.5 py-2 font-mono text-sm"
                    placeholder="As printed on the mill tag"
                    autoFocus={Boolean(focusedCoil)}
                  />
                </label>
              </div>
              <label className="block text-ui-xs font-semibold text-[var(--z-text)]">
                Why it is wrong
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-[var(--z-border)] bg-white px-2.5 py-2 text-sm"
                  placeholder="The mill tag does not match what was entered at receipt"
                />
              </label>
              {!sourceCoil && (toCoilNo.trim() || reason.trim()) ? (
                <p className="text-ui-xs font-medium text-rose-800">Enter the number that is on the coil now.</p>
              ) : null}
              {checking ? <p className="text-ui-xs text-[var(--z-text-muted)]">Checking the register…</p> : null}
              {!checking && previewError ? <p className="text-ui-xs font-medium text-rose-800">{previewError}</p> : null}
              {!checking && hint ? <p className={`text-ui-xs font-medium ${hintTone}`}>{hint}</p> : null}
              {preview?.impact ? <p className="text-ui-xs text-[var(--z-text-muted)]">{impactSummary(preview.impact)}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={OPS_TOOL_BTN_PRIMARY}
                  disabled={!preview?.available || reason.trim().length < 3 || checking}
                  onClick={() => setStep('review')}
                >
                  Review
                </button>
                <button type="button" className={OPS_GHOST_BTN} onClick={resetComposer}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <p className="font-mono text-sm font-semibold text-[var(--z-text)]">
                {sourceCoil} → {preview?.toCoilNo || toCoilNo}
              </p>
              <p className="text-ui-xs text-[var(--z-text-muted)]">{reason.trim()}</p>
              <p className="text-ui-xs text-[var(--z-text-muted)]">{impactSummary(preview?.impact)}</p>
              <p className="text-ui-xs font-medium text-[var(--z-text)]">
                Sending this does not change the coil. A branch manager still has to approve it.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={OPS_TOOL_BTN_PRIMARY} disabled={busy} onClick={submitRequest}>
                  {busy ? 'Sending…' : 'Send for approval'}
                </button>
                <button type="button" className={OPS_GHOST_BTN} onClick={() => setStep('edit')}>
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {loading && rows.length === 0 ? <p className="mt-2 text-ui-xs text-[var(--z-text-muted)]">Loading corrections…</p> : null}

      {rows.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => {
            const own = Boolean(row.canWithdraw) || (userId && userId === String(row.requestedByUserId || ''));
            const allowDecision = row.canApprove != null ? Boolean(row.canApprove) : canApprove && !own;
            const typedConfirm = String(confirmById[row.id] || '');
            const confirmMatches = typedConfirm.trim().toLowerCase() === String(row.toCoilNo || '').toLowerCase();
            const rejectNote = String(rejectNoteById[row.id] || '');
            return (
              <li key={row.id} className="rounded-md border border-[var(--z-border)] bg-white px-3 py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-mono text-sm font-semibold text-[var(--z-text)]">
                    {row.fromCoilNo} → {row.toCoilNo}
                  </p>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                    Waiting for branch manager
                  </span>
                </div>
                <p className="mt-1 text-ui-xs text-[var(--z-text-muted)]">
                  {row.requestedByDisplay || 'Store'} · {row.reason}
                </p>
                {row.impact ? <p className="mt-1 text-ui-xs text-[var(--z-text-muted)]">{impactSummary(row.impact)}</p> : null}
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  {!focusedCoil ? (
                    <button
                      type="button"
                      className={OPS_TOOL_BTN}
                      onClick={() => navigate(`/operations/coils/${encodeURIComponent(row.fromCoilNo)}`)}
                    >
                      Open coil
                    </button>
                  ) : null}
                  {own ? (
                    <button type="button" className={OPS_GHOST_BTN} disabled={busy} onClick={() => withdraw(row)}>
                      Withdraw
                    </button>
                  ) : null}
                </div>
                {allowDecision ? (
                  <div className="mt-3 grid gap-2 border-t border-[var(--z-border)] pt-3 sm:grid-cols-2">
                    <label className="block text-ui-xs font-semibold text-[var(--z-text)]">
                      Type {row.toCoilNo} to approve
                      <input
                        value={typedConfirm}
                        onChange={(e) => setConfirmById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-[var(--z-border)] bg-white px-2.5 py-2 font-mono text-sm"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        className={`${OPS_TOOL_BTN_PRIMARY} mt-2`}
                        disabled={busy || !confirmMatches}
                        onClick={() => decide(row, 'approve')}
                      >
                        Approve correction
                      </button>
                    </label>
                    <label className="block text-ui-xs font-semibold text-[var(--z-text)]">
                      Reason if you reject
                      <input
                        value={rejectNote}
                        onChange={(e) => setRejectNoteById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-[var(--z-border)] bg-white px-2.5 py-2 text-sm"
                        placeholder="The mill tag does not match"
                      />
                      <button
                        type="button"
                        className={`${OPS_TOOL_BTN} mt-2`}
                        disabled={busy || rejectNote.trim().length < 3}
                        onClick={() => decide(row, 'reject')}
                      >
                        Reject
                      </button>
                    </label>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
