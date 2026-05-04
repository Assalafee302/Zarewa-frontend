import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/apiBase';
import { useWorkspace } from '../context/WorkspaceContext';
import { editMutationNeedsSecondApprovalRole } from '../lib/editApprovalUi';

/** @param {string} raw */
export function normalizeEditApprovalInput(raw) {
  const t = String(raw ?? '').trim();
  if (/^EA-/i.test(t)) return t.slice(0, 120);
  return t.replace(/\D/g, '').slice(0, 6);
}

/**
 * Shown when the signed-in role must obtain a manager/admin approval before PATCHing this entity.
 * @param {{ entityKind: string; entityId: string; value: string; onChange: (v: string) => void; className?: string }} props
 */
export function EditSecondApprovalInline({ entityKind, entityId, value, onChange, className = '' }) {
  const ws = useWorkspace();
  const roleKey = ws?.session?.user?.roleKey;
  const needs = editMutationNeedsSecondApprovalRole(roleKey);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saveHint, setSaveHint] = useState('');
  const [hintTone, setHintTone] = useState('neutral');
  const pollRef = useRef(null);
  const lookupTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!needs || !String(entityId || '').trim()) return;
    const v = normalizeEditApprovalInput(value);
    if (!v) {
      setSaveHint('');
      setHintTone('neutral');
      return;
    }
    const looksLegacy = /^EA-/i.test(v);
    const ready = looksLegacy || v.length === 6;
    if (!ready) {
      setSaveHint(v.length > 0 ? 'Enter all 6 digits (or paste a legacy EA-… id).' : '');
      setHintTone('neutral');
      return;
    }
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    lookupTimerRef.current = setTimeout(async () => {
      lookupTimerRef.current = null;
      setSaveHint('Checking code…');
      setHintTone('neutral');
      const r = await apiFetch(`/api/edit-approvals/${encodeURIComponent(v)}`);
      if (!r.ok) {
        if (r.status === 403) {
          setSaveHint('This code is not linked to your login or you cannot view it.');
          setHintTone('bad');
          return;
        }
        setSaveHint('No approval found for this code.');
        setHintTone('bad');
        return;
      }
      if (!r.data?.ok || !r.data.approval) {
        setSaveHint('Could not verify this code.');
        setHintTone('bad');
        return;
      }
      const st = String(r.data.approval.status || '').toLowerCase();
      if (st === 'approved') {
        setSaveHint('Save endpoint ready — your next successful save will use this token once.');
        setHintTone('good');
      } else if (st === 'pending') {
        setSaveHint('Still pending — ask an approver to grant it in Edit approvals.');
        setHintTone('neutral');
      } else if (st === 'used') {
        setSaveHint('This code was already used. Request a new approval.');
        setHintTone('bad');
      } else {
        setSaveHint(`Status: ${r.data.approval.status || 'unknown'}.`);
        setHintTone('neutral');
      }
    }, 400);
    return () => {
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    };
  }, [value, needs, entityId]);

  if (!needs || !String(entityId || '').trim()) return null;

  const startPoll = (approvalId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const r = await apiFetch(`/api/edit-approvals/${encodeURIComponent(approvalId)}`);
      if (r.ok && r.data?.ok && r.data.approval?.status === 'approved') {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setSaveHint('Save endpoint ready — your next successful save will use this token once.');
        setHintTone('good');
        onChange(approvalId);
      }
    }, 2000);
  };

  const request = async () => {
    setBusy(true);
    setErr('');
    const { ok, data } = await apiFetch('/api/edit-approvals/request', {
      method: 'POST',
      body: JSON.stringify({ entityKind, entityId: String(entityId).trim() }),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not create approval request.');
      return;
    }
    const id = data.approvalId;
    if (!id) {
      setErr('Unexpected response.');
      return;
    }
    onChange('');
    setSaveHint('Waiting for approver…');
    setHintTone('neutral');
    startPoll(id);
  };

  const hintClass =
    hintTone === 'good'
      ? 'text-emerald-800'
      : hintTone === 'bad'
        ? 'text-rose-800'
        : 'text-amber-900/90';

  return (
    <div
      className={`rounded-lg border border-amber-200/90 bg-amber-50/95 p-3 text-[11px] text-amber-950 ${className}`}
    >
      <p className="font-bold text-amber-900 mb-1">Second approval for this change</p>
      <p className="text-amber-800/95 mb-2 leading-snug">
        Use <strong className="font-semibold">Request approval</strong>, then ask an approver to open{' '}
        <strong className="font-semibold">Edit approvals</strong> in the sidebar (badge when something is waiting) or{' '}
        <strong className="font-semibold">Management → Edit OKs</strong>. You can stay on this screen — the 6-digit code
        fills in when ready. Each token works for one successful save only.
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          disabled={busy}
          onClick={() => void request()}
          className="shrink-0 rounded-lg bg-amber-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {busy ? 'Requesting…' : 'Request approval'}
        </button>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={120}
          value={value || ''}
          onChange={(e) => onChange(normalizeEditApprovalInput(e.target.value))}
          placeholder="6-digit code"
          className="min-w-[8.5rem] w-[9.5rem] rounded-lg border border-amber-300/80 bg-white px-2 py-1.5 text-[13px] font-mono tracking-widest text-slate-800 text-center"
        />
      </div>
      {saveHint ? <p className={`mt-2 text-[10px] font-semibold leading-snug ${hintClass}`}>{saveHint}</p> : null}
      {err ? <p className="text-rose-700 font-semibold mt-2 text-[10px]">{err}</p> : null}
    </div>
  );
}
