import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, Plus, Printer, Trash2, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/apiBase';
import MaterialIncidentDetailModal from '../material/MaterialIncidentDetailModal';
import MaterialIncidentPrintPortal from '../material/MaterialIncidentPrintPortal';
import {
  coilDamagePreview,
  normalizeDamageLinesForPayload,
  sumDamageLineMeters,
  validateCoilDamagePayload,
} from '../../lib/coilDamageRecordCore';
import { fmtConv2 } from '../../lib/conversionKgPerM';
import { ModalFrame } from '../layout/ModalFrame';

let lineSeq = 0;
const newLineId = () => `dmg-line-${++lineSeq}`;
const emptyLine = () => ({ id: newLineId(), lengthM: '', quantity: '1', conditionNote: '' });

/** kg available on roll: on-hand minus reservations (same as production register). */
function coilFreeKg(lot) {
  if (!lot) return 0;
  return Math.max(0, Number(lot.qtyRemaining || 0) - Number(lot.qtyReserved || 0));
}

/** Default before kg when picking a coil — matches production register (2 decimal places). */
function suggestedOpeningKgFromFree(freeKg) {
  const n = Number(freeKg);
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(Math.round(n * 100) / 100);
}

function parseNum(v) {
  const n = Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

const defaultForm = (defaultDate) => ({
  coilNo: '',
  beforeKg: '',
  afterKg: '',
  returnDisposition: 'offcut_pool',
  note: '',
  date: defaultDate,
  submitForApproval: true,
  lines: [emptyLine()],
});

/**
 * Streamlined coil damage modal: pick coil → spec auto-fills, before kg suggested from free kg,
 * damaged sections as cutting-list-style rows, submit for manager approval.
 */
export default function CoilDamageRecordModal({
  isOpen,
  onClose,
  coilLots = [],
  defaultCoilNo = '',
  onSuccess,
}) {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const defaultDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [form, setForm] = useState(() => defaultForm(defaultDate));
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [savedResult, setSavedResult] = useState(null);
  const [printPayload, setPrintPayload] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const sortedCoils = useMemo(
    () => [...coilLots].sort((a, b) => String(a.coilNo || '').localeCompare(String(b.coilNo || ''))),
    [coilLots]
  );

  const selectedCoil = useMemo(
    () => sortedCoils.find((c) => c.coilNo === form.coilNo) || null,
    [sortedCoils, form.coilNo]
  );

  const freeKg = selectedCoil ? coilFreeKg(selectedCoil) : 0;

  const totalMeters = useMemo(() => sumDamageLineMeters(form.lines), [form.lines]);

  const preview = useMemo(() => {
    if (!selectedCoil) return coilDamagePreview({ beforeKg: form.beforeKg, afterKg: form.afterKg, meters: totalMeters });
    return coilDamagePreview({
      beforeKg: form.beforeKg,
      afterKg: form.afterKg,
      meters: totalMeters,
      supplierConversionKgPerM: selectedCoil.supplierConversionKgPerM,
      maxRemoveKg: freeKg,
    });
  }, [form.beforeKg, form.afterKg, totalMeters, selectedCoil, freeKg]);

  const fillFromCoil = (coilNo) => {
    const c = sortedCoils.find((x) => x.coilNo === coilNo);
    if (!c) {
      setForm((prev) => ({ ...prev, coilNo }));
      return;
    }
    const suggested = suggestedOpeningKgFromFree(coilFreeKg(c));
    setForm((prev) => ({
      ...prev,
      coilNo: c.coilNo,
      beforeKg: suggested || prev.beforeKg,
      afterKg: '',
      lines: [emptyLine()],
    }));
    setFieldError('');
  };

  useEffect(() => {
    if (!isOpen) return;
    setFieldError('');
    setSavedResult(null);
    setPrintPayload(null);
    const base = defaultForm(defaultDate);
    setForm({
      ...base,
      coilNo: defaultCoilNo || '',
      lines: [emptyLine()],
    });
    if (defaultCoilNo) fillFromCoil(defaultCoilNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when modal opens
  }, [isOpen, defaultCoilNo, defaultDate]);

  const openPrint = async (id) => {
    const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(id)}/print-payload`);
    if (!ok || !data?.payload) return showToast(data?.error || 'Print data unavailable', { variant: 'error' });
    setPrintPayload(data.payload);
  };

  const copyIncidentId = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      showToast(`Copied ${id}`);
    } catch {
      showToast(id, { variant: 'info' });
    }
  };

  const handleDone = () => {
    setSavedResult(null);
    onClose();
  };

  const updateLine = (id, patch) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((ln) => (ln.id === id ? { ...ln, ...patch } : ln)),
    }));
  };

  const addLineAfter = (afterId) => {
    setForm((prev) => {
      const idx = prev.lines.findIndex((ln) => ln.id === afterId);
      const next = [...prev.lines];
      next.splice(idx + 1, 0, emptyLine());
      return { ...prev, lines: next };
    });
  };

  const removeLine = (id) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.length <= 1 ? [emptyLine()] : prev.lines.filter((ln) => ln.id !== id),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldError('');
    if (!ws?.canMutate) return showToast('Workspace is read-only.', { variant: 'error' });

    const lines = normalizeDamageLinesForPayload(form.lines);
    const payload = {
      coilNo: form.coilNo.trim(),
      beforeKg: Number(form.beforeKg),
      afterKg: Number(form.afterKg),
      lines,
      note: form.note.trim(),
      returnDisposition: form.returnDisposition,
    };
    const validated = validateCoilDamagePayload(payload, {
      maxRemoveKg: selectedCoil ? freeKg : undefined,
      supplierConversionKgPerM: selectedCoil?.supplierConversionKgPerM,
    });
    if (!validated.ok) {
      setFieldError(validated.error);
      return showToast(validated.error, { variant: 'error' });
    }

    setSaving(true);
    try {
      const { ok, data } = await apiFetch('/api/coil-control/coil-damage', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          storekeeperDisplay: ws?.user?.displayName || ws?.user?.name || undefined,
          dateISO: form.date || defaultDate,
          submit: form.submitForApproval,
        }),
      });
      if (!ok || !data?.ok) {
        const err = data?.error || 'Could not save coil damage record.';
        setFieldError(err);
        showToast(err, { variant: 'error' });
        return;
      }
      await ws.refresh?.();
      onSuccess?.(data);
      setSavedResult({
        id: data.id,
        status: data.status,
        submitError: data.submitError,
        meters: data.meters ?? validated.meters,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <ModalFrame
      isOpen={isOpen}
      onClose={() => !saving && (savedResult ? handleDone() : onClose())}
      title="Record coil damage"
      surface="plain"
      showCloseButton={false}
    >
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[min(90dvh,880px)] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 shrink-0">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Record coil damage</h2>
            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed max-w-xl">
              Select the coil — spec and before kg fill automatically. Weigh before and after cutting out the bad
              section, list each damaged length, then submit for approval.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {savedResult ? (
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <CheckCircle2 size={40} className="text-teal-600" strokeWidth={2.5} />
              <p className="text-sm font-bold text-[#134e4a]">Incident saved</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tracking reference</p>
              <p className="font-mono text-3xl font-black text-[#134e4a] tracking-tight">{savedResult.id}</p>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                  savedResult.status === 'submitted'
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {savedResult.status === 'submitted' ? 'Pending manager approval' : 'Draft'}
              </span>
              {savedResult.submitError ? (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-w-md">
                  Saved as draft — submit failed: {savedResult.submitError}
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 text-[11px] text-slate-700 space-y-2">
              <p className="font-bold text-[#134e4a] uppercase text-[9px] tracking-wide">Use this ID for</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>Production complete</strong> — issue metres from offcut incident{' '}
                  <span className="font-mono">{savedResult.id}</span>
                  {savedResult.status !== 'posted' ? ' (after manager approval posts stock)' : ''}.
                </li>
                <li>
                  <strong>Month-end stock register</strong> — quote this MEX ID when coil count differs from system.
                </li>
                <li>
                  <strong>Physical offcut book</strong> — print and file with the damaged section record.
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-2 sticky bottom-0 bg-white border-t border-slate-100 -mx-5 px-5 py-3">
              <button type="button" className="z-btn-secondary py-3 px-4 text-xs inline-flex items-center gap-1" onClick={() => copyIncidentId(savedResult.id)}>
                <Copy size={14} /> Copy ID
              </button>
              <button type="button" className="z-btn-secondary py-3 px-4 text-xs" onClick={() => setDetailModalOpen(true)}>
                Open full record
              </button>
              <button type="button" className="z-btn-secondary py-3 px-4 text-xs inline-flex items-center gap-1" onClick={() => openPrint(savedResult.id)}>
                <Printer size={14} /> Print
              </button>
              <button type="button" className="z-btn-primary flex-1 justify-center py-3" onClick={handleDone}>
                Done
              </button>
            </div>
          </div>
        ) : (
        <form className="flex-1 overflow-y-auto px-5 py-4 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase">Coil number</label>
            <select
              required
              value={form.coilNo}
              onChange={(e) => fillFromCoil(e.target.value)}
              className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm font-bold text-[#134e4a] outline-none focus:ring-2 focus:ring-teal-500/15"
            >
              <option value="">Select coil…</option>
              {sortedCoils.map((c) => {
                const free = coilFreeKg(c);
                return (
                  <option key={c.coilNo} value={c.coilNo}>
                    {c.coilNo} · {c.colour || '—'} {c.gaugeLabel || ''} · free {free.toFixed(1)} kg
                  </option>
                );
              })}
            </select>

            {selectedCoil ? (
              <div className="rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-teal-800/70 mb-2">From coil register</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    selectedCoil.productID && { label: 'Product', value: selectedCoil.productID },
                    selectedCoil.gaugeLabel && { label: 'Gauge', value: selectedCoil.gaugeLabel },
                    selectedCoil.colour && { label: 'Colour', value: selectedCoil.colour },
                    selectedCoil.supplierConversionKgPerM != null && {
                      label: 'Supplier conv',
                      value: fmtConv2(selectedCoil.supplierConversionKgPerM, { suffix: 'kg/m' }),
                    },
                    { label: 'Free kg', value: `${freeKg.toFixed(2)} kg` },
                  ]
                    .filter(Boolean)
                    .map((chip) => (
                      <span
                        key={chip.label}
                        className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/80 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700"
                      >
                        <span className="text-slate-400 uppercase text-[8px]">{chip.label}</span>
                        {chip.value}
                      </span>
                    ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Before kg (on roll)</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.beforeKg}
                onChange={(e) => setForm((s) => ({ ...s, beforeKg: e.target.value }))}
                className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500/15"
                placeholder="Weigh before cutting"
              />
              {selectedCoil && freeKg > 0 ? (
                <p className="mt-1 text-[10px] text-teal-700">
                  Suggested from free kg on roll — same as production register.
                </p>
              ) : null}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">After kg (good steel left)</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.afterKg}
                onChange={(e) => setForm((s) => ({ ...s, afterKg: e.target.value }))}
                className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500/15"
                placeholder="Weigh after cutting damage out"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
              <h3 className="text-[10px] font-bold text-[#134e4a] uppercase tracking-widest">Damaged sections</h3>
              {totalMeters > 0 ? (
                <span className="text-[11px] font-bold text-orange-600 tabular-nums">{totalMeters.toLocaleString()} m total</span>
              ) : null}
            </div>
            <div className="hidden sm:grid grid-cols-[2rem_4.5rem_3.5rem_1fr_4.5rem] gap-1 px-1 text-[8px] font-semibold text-slate-400 uppercase tracking-wider items-center">
              <div>#</div>
              <div>Length (m)</div>
              <div>Qty</div>
              <div>Note</div>
              <div className="text-center" />
            </div>
            {form.lines.map((line, idx) => {
              const lineM = parseNum(line.lengthM) * parseNum(line.quantity);
              return (
                <div
                  key={line.id}
                  className="grid grid-cols-1 sm:grid-cols-[2rem_4.5rem_3.5rem_1fr_4.5rem] gap-1.5 sm:gap-1 items-center bg-white p-2 rounded-lg border border-slate-200"
                >
                  <div className="flex sm:justify-center text-[10px] font-bold text-slate-300">{idx + 1}</div>
                  <div>
                    <label className="sm:hidden text-[8px] font-semibold text-slate-400 uppercase">Length (m)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="4.5"
                      value={line.lengthM}
                      onChange={(e) => updateLine(line.id, { lengthM: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] font-semibold text-[#134e4a]"
                    />
                  </div>
                  <div>
                    <label className="sm:hidden text-[8px] font-semibold text-slate-400 uppercase">Qty</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] font-semibold text-[#134e4a]"
                    />
                  </div>
                  <div>
                    <label className="sm:hidden text-[8px] font-semibold text-slate-400 uppercase">Note</label>
                    <input
                      placeholder="e.g. rust band"
                      value={line.conditionNote}
                      onChange={(e) => updateLine(line.id, { conditionNote: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] text-slate-700"
                    />
                  </div>
                  <div className="flex items-center justify-between sm:justify-center gap-1">
                    <span className="sm:hidden text-[11px] font-bold text-orange-600 tabular-nums">{lineM > 0 ? `${lineM} m` : ''}</span>
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        title="Add row after"
                        onClick={() => addLineAfter(line.id)}
                        className="p-1.5 rounded-lg text-orange-600 hover:bg-orange-50"
                      >
                        <Plus size={16} strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        title="Remove row"
                        onClick={() => removeLine(line.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase">What happens to the cut-out steel?</p>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
              {[
                { id: 'offcut_pool', label: 'Offcut pool', hint: 'Reusable metres' },
                { id: 'scrap', label: 'Scrap', hint: 'Reject / waste' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, returnDisposition: opt.id }))}
                  className={`rounded-lg px-4 py-2 text-left transition-colors ${
                    form.returnDisposition === opt.id
                      ? 'bg-[#134e4a] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <span className="block text-[11px] font-bold">{opt.label}</span>
                  <span className={`block text-[9px] ${form.returnDisposition === opt.id ? 'text-teal-100' : 'text-slate-400'}`}>
                    {opt.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {preview.kgDeducted != null && totalMeters > 0 ? (
            <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-[11px] text-slate-700 space-y-1">
              <p className="font-bold text-[#134e4a] uppercase text-[9px] tracking-wide">Conversion preview</p>
              <p>
                <span className="font-semibold">Kg removed:</span>{' '}
                <span className="font-mono tabular-nums">{preview.kgDeducted.toFixed(2)} kg</span>
                {preview.maxRemoveKg != null ? (
                  <span className="text-slate-500"> (max {preview.maxRemoveKg.toFixed(2)} kg free)</span>
                ) : null}
              </p>
              <p>
                <span className="font-semibold">Actual conversion:</span>{' '}
                <span className="font-mono tabular-nums">{fmtConv2(preview.actualConversionKgPerM, { suffix: 'kg/m' })}</span>
                {preview.supplierConversionKgPerM != null ? (
                  <>
                    {' '}
                    · supplier {fmtConv2(preview.supplierConversionKgPerM, { suffix: 'kg/m' })}
                    {preview.variancePct != null ? (
                      <span className={Math.abs(preview.variancePct) > 15 ? ' text-amber-800 font-semibold' : ''}>
                        {' '}
                        ({preview.variancePct > 0 ? '+' : ''}
                        {preview.variancePct}%)
                      </span>
                    ) : null}
                  </>
                ) : null}
              </p>
              {preview.impliedMetersFromSupplier != null ? (
                <p className="text-slate-500">
                  Supplier conversion implies ~{preview.impliedMetersFromSupplier.toFixed(1)} m for removed kg
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Damage note</label>
            <textarea
              required
              rows={2}
              minLength={8}
              value={form.note}
              onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
              placeholder="Where on the coil, what damage, and what was cut out — min. 8 characters"
              className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm outline-none resize-none focus:ring-2 focus:ring-teal-500/15"
            />
          </div>

          <label className="flex items-start gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.submitForApproval}
              onChange={(e) => setForm((s) => ({ ...s, submitForApproval: e.target.checked }))}
              className="rounded border-slate-300 mt-0.5"
            />
            <span>
              Submit for branch manager approval
              <span className="block text-[10px] font-normal text-slate-500">
                Coil kg and pool/scrap stock update only after approval.
              </span>
            </span>
          </label>

          {fieldError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{fieldError}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1 pb-1 sticky bottom-0 bg-white border-t border-slate-100 -mx-5 px-5 py-3">
            <button type="button" onClick={() => !saving && onClose()} className="z-btn-secondary py-3 px-4 text-xs">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="z-btn-primary flex-1 justify-center py-3 disabled:opacity-50">
              {saving ? 'Saving…' : form.submitForApproval ? 'Save & submit for approval' : 'Save draft only'}
            </button>
          </div>
        </form>
        )}
      </div>
    </ModalFrame>
    <MaterialIncidentDetailModal
      isOpen={detailModalOpen}
      onClose={() => setDetailModalOpen(false)}
      incidentId={savedResult?.id || ''}
      onPrint={openPrint}
    />
    <MaterialIncidentPrintPortal payload={printPayload} onClose={() => setPrintPayload(null)} />
    </>
  );
}
