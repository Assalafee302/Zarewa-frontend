import React, { useEffect, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { ModalFrame } from '../../layout';
import { validateStoreChecklist } from '../../../lib/stockRegisterLineClearance.js';
import { STORE_CHECKLIST_ITEMS } from './stockRegisterConstants';
import { postStockRegisterWorkflow, postStoreChecklist } from './stockRegisterApi';

function defaultCutoffIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Store physical count confirmation — checklist, notes, send to branch manager.
 */
export function StockRegisterStoreConfirmModal({
  open,
  onClose,
  periodKey,
  periodEnd,
  workflow,
  initialCountNotes = '',
  initialChecklist = null,
  showToast,
  onSaved,
}) {
  const [countNotes, setCountNotes] = useState('');
  const [countCutoffIso, setCountCutoffIso] = useState(defaultCutoffIso);
  const [checklist, setChecklist] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCountNotes(initialCountNotes || workflow?.countNotes || '');
    setCountCutoffIso(
      String(workflow?.countCutoffIso || initialChecklist?.countCutoffIso || defaultCutoffIso()).slice(0, 16)
    );
    const base = initialChecklist || workflow?.storeChecklist || {};
    setChecklist({
      coilsCounted: Boolean(base.coilsCounted),
      finishedVerified: Boolean(base.finishedVerified),
      stoneCounted: Boolean(base.stoneCounted),
      accessoriesCounted: Boolean(base.accessoriesCounted),
      inTransitReviewed: Boolean(base.inTransitReviewed),
    });
  }, [open, initialCountNotes, initialChecklist, workflow]);

  const toggleCheck = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const submit = async () => {
    const payload = { ...checklist, countCutoffIso };
    const check = validateStoreChecklist(payload);
    if (!check.ok) {
      showToast?.(check.error, { variant: 'error' });
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
        showToast?.(data?.error || 'Could not send to branch manager.', { variant: 'error' });
        return;
      }
      showToast?.('Register sent to branch manager.');
      onSaved?.(data);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const status = workflow?.status || 'draft';
  const disabled = !['printed', 'draft'].includes(status);

  return (
    <ModalFrame isOpen={open} onClose={onClose} showCloseButton={false} surface="plain" title="Store count confirmation">
      <div className="z-modal-panel-lg flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div>
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Physical count</p>
            <h2 className="text-lg font-bold text-zarewa-teal">Confirm store count</h2>
            <p className="text-sm text-slate-600 mt-0.5">Period ending {periodEnd}</p>
          </div>
          <button type="button" onClick={onClose} className="z-btn-secondary p-2" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4 sm:px-5 space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-800 mb-2">Count checklist</legend>
            {STORE_CHECKLIST_ITEMS.map(({ key, label }) => (
              <label key={key} className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                  checked={Boolean(checklist[key])}
                  onChange={() => toggleCheck(key)}
                  disabled={disabled}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Count cutoff (datetime)</span>
            <input
              type="datetime-local"
              className="z-input w-full mt-1"
              value={countCutoffIso}
              onChange={(e) => setCountCutoffIso(e.target.value)}
              disabled={disabled}
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Count notes</span>
            <textarea
              className="z-input w-full mt-1 min-h-[4rem]"
              value={countNotes}
              onChange={(e) => setCountNotes(e.target.value)}
              disabled={disabled}
              placeholder="Floor count observations, missing tags, etc."
            />
          </label>

          {disabled ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Register must be printed before store confirmation.
            </p>
          ) : null}
        </div>

        <footer className="shrink-0 flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
          <button type="button" className="z-btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="z-btn-primary inline-flex items-center gap-2" onClick={submit} disabled={disabled || saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send to branch manager
          </button>
        </footer>
      </div>
    </ModalFrame>
  );
}
