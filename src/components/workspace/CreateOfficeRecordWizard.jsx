import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/apiBase';
import {
  OFFICE_RECORD_TYPES,
  OFFICE_RECORD_TYPE_ORDER,
  OFFICE_RECORD_GUIDED_FIELDS,
  detectOfficeRecordType,
  buildOfficeRecordSuggestions,
} from '../../lib/officeRecordTypes';
import { buildSmartMemoPayload, improveMemoRuleBased } from '../../lib/smartMemoComposer';
import ZareWritingAssistCard from './ZareWritingAssistCard';

/**
 * Guided Create Office Record wizard (mobile-friendly steps).
 */
export default function CreateOfficeRecordWizard({ open, onClose, onCreated, initialPrefill = null }) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const blocksCreate = Boolean(ws?.blocksBranchScopedCreate);
  const [step, setStep] = useState(0);
  const [freeText, setFreeText] = useState('');
  const [recordType, setRecordType] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [guidedFields, setGuidedFields] = useState({});
  const [sending, setSending] = useState(false);
  const [zareDismissed, setZareDismissed] = useState(false);

  const typeMeta = recordType ? OFFICE_RECORD_TYPES[recordType] : null;
  const fieldDefs = recordType ? OFFICE_RECORD_GUIDED_FIELDS[recordType] || [] : [];

  const zareSuggestion = useMemo(() => {
    if (zareDismissed || step < 1) return null;
    const sug = buildOfficeRecordSuggestions({
      subject,
      body: body || freeText,
      memoType: recordType || detectOfficeRecordType(subject, body || freeText),
      guidedFields,
    });
    const improved = improveMemoRuleBased(subject, body || freeText, sug.memoType);
    return {
      recordTypeLabel: sug.memoTypeLabel || typeMeta?.label,
      suggestedTitle: improved.subject || subject,
      improvedBody: improved.body,
      missingFields: (sug.checklist?.items || sug.checklist?.missingRequired || [])
        .filter((c) => c.required && !c.satisfied)
        .map((c) => c.label),
    };
  }, [subject, body, freeText, recordType, guidedFields, zareDismissed, step, typeMeta?.label]);

  const reset = useCallback(() => {
    setStep(0);
    setFreeText('');
    setRecordType('');
    setSubject('');
    setBody('');
    setGuidedFields({});
    setZareDismissed(false);
  }, []);

  const applyPrefill = useCallback((prefill) => {
    if (!prefill) return;
    const detected = prefill.recordType || detectOfficeRecordType(prefill.subject || '', prefill.body || prefill.freeText || '');
    if (prefill.freeText) setFreeText(prefill.freeText);
    if (prefill.body) setBody(prefill.body);
    if (prefill.subject) setSubject(prefill.subject);
    if (prefill.guidedFields) setGuidedFields(prefill.guidedFields);
    setRecordType(detected);
    setStep(2);
    setZareDismissed(false);
  }, []);

  useEffect(() => {
    if (open && initialPrefill) applyPrefill(initialPrefill);
  }, [open, initialPrefill, applyPrefill]);

  const onOpenChange = (v) => {
    if (!v) {
      reset();
      onClose?.();
    }
  };

  const startFromFreeText = () => {
    const detected = detectOfficeRecordType('', freeText);
    setRecordType(detected);
    setBody(freeText);
    const meta = OFFICE_RECORD_TYPES[detected];
    setSubject(meta?.label ? `${meta.label} — ${new Date().toLocaleDateString()}` : 'Office record');
    setStep(2);
  };

  const submit = async () => {
    if (blocksCreate) {
      showToast(ws?.branchScopedCreateMessage || 'Select a single branch workspace before creating records.', {
        variant: 'warning',
      });
      return;
    }
    if (!ws?.canMutate) {
      showToast('Reconnect to submit office records.', { variant: 'warning' });
      return;
    }
    setSending(true);
    try {
      const payload = buildSmartMemoPayload({
        memoType: recordType || 'general_internal',
        guidedFields,
        priority: typeMeta?.defaultPriority || 'normal',
        filingCategory: typeMeta?.filingCategory,
        expenseCategory: typeMeta?.expenseCategory,
      });
      const { ok, data } = await apiFetch('/api/office/threads', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject.trim() || typeMeta?.label || 'Office record',
          body: body.trim() || freeText.trim(),
          kind: 'office_record',
          documentClass: 'correspondence',
          officeKey: typeMeta?.defaultOfficeKey || 'branch_manager',
          requiresApproval: true,
          payload: {
            ...payload,
            recordType: recordType || 'general_internal',
            guidedForm: guidedFields,
          },
        }),
      });
      if (!ok || !data?.ok) throw new Error(data?.error || 'Submit failed');
      showToast('Office record submitted.', { variant: 'success' });
      await ws.refresh?.();
      onCreated?.(data.thread?.id);
      reset();
      onClose?.();
    } catch (e) {
      showToast(String(e.message || e), { variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-slate-900/40" />
        <Dialog.Content
          aria-label="Create Office Record"
          className="fixed inset-x-0 bottom-0 z-[201] max-h-[92vh] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-xl sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        >
          <div className="flex items-center justify-between gap-2">
            <Dialog.Title className="text-lg font-bold text-slate-900">Create Office Record</Dialog.Title>
            <Dialog.Close className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </div>

          {blocksCreate ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {ws?.branchScopedCreateMessage ||
                'Cannot create while “All branches” is on. Select a single branch in the workspace bar.'}
            </p>
          ) : null}

          {step === 0 && !blocksCreate ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-slate-600">Tell Zare what happened, or choose a record type.</p>
              <textarea
                className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                rows={4}
                placeholder="What happened? e.g. Gen no diesel since morning"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
              />
              <button
                type="button"
                disabled={!freeText.trim()}
                onClick={startFromFreeText}
                className="w-full rounded-xl bg-teal-800 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Continue with Zare
              </button>
              <p className="text-center text-xs text-slate-500">or choose type</p>
              <div className="grid grid-cols-2 gap-2">
                {OFFICE_RECORD_TYPE_ORDER.slice(0, 8).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setRecordType(key);
                      setSubject(OFFICE_RECORD_TYPES[key]?.label || key);
                      setStep(2);
                    }}
                    className="rounded-lg border border-slate-200 px-2 py-2 text-left text-xs font-semibold text-slate-800 hover:border-teal-300 hover:bg-teal-50"
                  >
                    {OFFICE_RECORD_TYPES[key]?.label || key}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 2 && !blocksCreate ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold uppercase text-teal-800">{typeMeta?.label || 'Office record'}</p>
              {!zareDismissed && zareSuggestion ? (
                <ZareWritingAssistCard
                  suggestion={zareSuggestion}
                  onApplyWording={() => {
                    if (zareSuggestion.suggestedTitle) setSubject(zareSuggestion.suggestedTitle);
                    if (zareSuggestion.improvedBody) setBody(zareSuggestion.improvedBody);
                  }}
                  onAddMissingFields={() => setStep(2)}
                  onChangeCategory={() => setStep(0)}
                  onIgnore={() => setZareDismissed(true)}
                />
              ) : null}
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <textarea
                className="w-full rounded-lg border border-slate-200 p-3 text-sm"
                rows={3}
                placeholder="Details"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              {fieldDefs.map((f) => (
                <label key={f.key} className="block text-xs font-medium text-slate-700">
                  {f.label}
                  {f.required ? ' *' : ''}
                  {f.type === 'textarea' ? (
                    <textarea
                      className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm"
                      rows={2}
                      value={guidedFields[f.key] ?? ''}
                      onChange={(e) => setGuidedFields((g) => ({ ...g, [f.key]: e.target.value }))}
                    />
                  ) : f.type === 'select' ? (
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm"
                      value={guidedFields[f.key] ?? ''}
                      onChange={(e) => setGuidedFields((g) => ({ ...g, [f.key]: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      {(f.options || []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === 'number' ? 'number' : 'text'}
                      className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm"
                      value={guidedFields[f.key] ?? ''}
                      onChange={(e) => setGuidedFields((g) => ({ ...g, [f.key]: e.target.value }))}
                    />
                  )}
                </label>
              ))}
            </div>
          ) : null}

          <div className="sticky bottom-0 mt-4 flex gap-2 border-t border-slate-100 bg-white pt-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700"
              >
                Back
              </button>
            ) : null}
            {blocksCreate ? null : step < 2 ? (
              <button
                type="button"
                disabled={step === 0 && !freeText.trim()}
                onClick={() => (step === 0 ? startFromFreeText() : setStep(2))}
                className="flex-1 rounded-xl bg-teal-800 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={sending || !subject.trim()}
                onClick={() => void submit()}
                className="flex-1 rounded-xl bg-teal-800 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sending ? 'Submitting…' : 'Submit record'}
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
