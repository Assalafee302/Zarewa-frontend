import React, { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { validateStoreChecklist } from '../../../lib/stockRegisterLineClearance.js';
import { STORE_CHECKLIST_ITEMS } from './stockRegisterConstants';
import { postStockRegisterWorkflow, postStoreChecklist } from './stockRegisterApi';

function defaultCutoffFromPeriodEnd(periodEnd) {
  const pe = String(periodEnd || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(pe)) return `${pe}T23:59`;
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function disabledMessage(status) {
  const st = String(status || 'draft');
  if (st === 'draft') return 'Print the count sheet first, then complete this checklist.';
  if (st === 'store_confirmed') return 'Already sent to the branch manager.';
  if (st === 'bm_approved' || st === 'procurement_costed' || st === 'md_approved') {
    return 'Store confirmation is complete for this period.';
  }
  if (st === 'locked') return 'This register is locked.';
  if (st !== 'printed') return `Cannot confirm from status “${st.replace(/_/g, ' ')}”.`;
  return '';
}

/** Inline store confirm workspace for the month-end desk. */
export function StockRegisterStoreConfirmWorkspace({
  periodKey,
  periodEnd,
  workflow,
  initialCountNotes = '',
  initialChecklist = null,
  showToast,
  onSaved,
}) {
  const [countNotes, setCountNotes] = useState('');
  const [countCutoffIso, setCountCutoffIso] = useState(() => defaultCutoffFromPeriodEnd(periodEnd));
  const [checklist, setChecklist] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [inlineError, setInlineError] = useState('');

  useEffect(() => {
    setConfirmSend(false);
    setInlineError('');
    setCountNotes(initialCountNotes || workflow?.countNotes || '');
    setCountCutoffIso(
      String(
        workflow?.countCutoffIso ||
          initialChecklist?.countCutoffIso ||
          defaultCutoffFromPeriodEnd(periodEnd)
      ).slice(0, 16)
    );
    const base = initialChecklist || workflow?.storeChecklist || {};
    setChecklist({
      coilsCounted: Boolean(base.coilsCounted),
      finishedVerified: Boolean(base.finishedVerified),
      stoneCounted: Boolean(base.stoneCounted),
      accessoriesCounted: Boolean(base.accessoriesCounted),
      inTransitReviewed: Boolean(base.inTransitReviewed),
    });
  }, [initialCountNotes, initialChecklist, workflow, periodEnd, periodKey]);

  const toggleCheck = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
    setInlineError('');
  };

  const checkedCount = STORE_CHECKLIST_ITEMS.filter(({ key }) => checklist[key]).length;
  const status = workflow?.status || 'draft';
  const canSend = status === 'printed';
  const disabled = !canSend;
  const ban = disabledMessage(status);

  const submit = async () => {
    const payload = { ...checklist, countCutoffIso };
    const check = validateStoreChecklist(payload);
    if (!check.ok) {
      setInlineError(check.error || 'Complete the checklist.');
      showToast?.(check.error, { variant: 'error' });
      return;
    }
    if (!confirmSend) {
      setConfirmSend(true);
      return;
    }
    setSaving(true);
    try {
      await postStoreChecklist(periodKey, payload);
      const { ok, data } = await postStockRegisterWorkflow({
        action: 'forward_to_manager',
        periodKey,
        countNotes,
        storeChecklist: payload,
        countCutoffIso,
      });
      if (!ok || !data?.ok) {
        showToast?.(
          data?.error || 'Checklist may be saved but forward failed — try Send again.',
          { variant: 'error' }
        );
        return;
      }
      showToast?.('Register sent to branch manager.');
      onSaved?.(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div>
        <h3 className="text-base font-bold text-zarewa-teal">Confirm store count</h3>
        <p className="text-xs text-slate-500 mt-0.5">Checklist and send to branch manager</p>
      </div>

      {saving ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900 font-medium flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Sending to manager…
        </div>
      ) : null}

      <fieldset className="space-y-2" disabled={disabled || saving}>
        <legend className="text-sm font-semibold text-slate-800 mb-1 flex items-center justify-between gap-2 w-full">
          <span>Count checklist</span>
          <span className="text-ui-xs font-bold text-slate-500 normal-case tracking-normal">
            {checkedCount} of {STORE_CHECKLIST_ITEMS.length} checked
          </span>
        </legend>
        {STORE_CHECKLIST_ITEMS.map(({ key, label }) => (
          <label key={key} className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              checked={Boolean(checklist[key])}
              onChange={() => toggleCheck(key)}
            />
            <span>{label}</span>
          </label>
        ))}
        {inlineError ? <p className="text-xs text-rose-700 font-medium">{inlineError}</p> : null}
      </fieldset>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Count cutoff</span>
        <span className="block text-ui-xs text-slate-500 mt-0.5">Defaults to month-end evening.</span>
        <input
          type="datetime-local"
          className="z-input w-full mt-1"
          value={countCutoffIso}
          onChange={(e) => setCountCutoffIso(e.target.value)}
          disabled={disabled || saving}
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Count notes</span>
        <textarea
          className="z-input w-full mt-1 min-h-[4rem]"
          value={countNotes}
          onChange={(e) => setCountNotes(e.target.value)}
          disabled={disabled || saving}
          placeholder="Floor observations, missing tags, variances…"
        />
      </label>

      {disabled && ban ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">{ban}</p>
      ) : null}

      {confirmSend && canSend ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50/80 p-3 text-sm text-teal-950 space-y-1">
          <p className="font-semibold">Send this count to the branch manager?</p>
          <p className="text-xs">
            {checkedCount}/{STORE_CHECKLIST_ITEMS.length} checklist · cutoff{' '}
            {String(countCutoffIso).replace('T', ' ')}
          </p>
          <p className="text-xs text-teal-800">Click send again to confirm.</p>
        </div>
      ) : null}

      <button
        type="button"
        className="z-btn-primary inline-flex items-center gap-2 w-full sm:w-auto"
        onClick={submit}
        disabled={disabled || saving}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        {confirmSend ? 'Confirm send to manager' : 'Send to branch manager'}
      </button>
    </div>
  );
}
