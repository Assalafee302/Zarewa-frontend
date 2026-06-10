import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/apiBase';
import { compareSelectLabels } from '../../lib/selectOptionSort';
import { coilDamagePreview, validateCoilDamagePayload } from '../../lib/coilDamageRecordCore';
import { fmtConv2 } from '../../lib/conversionKgPerM';
import { ModalFrame } from '../layout/ModalFrame';

function liveCoilWeightKg(lot) {
  if (lot.currentWeightKg != null && lot.currentWeightKg !== '') {
    const cw = Number(lot.currentWeightKg);
    if (Number.isFinite(cw)) return Math.max(0, cw);
  }
  if (lot.qtyRemaining != null && lot.qtyRemaining !== '') {
    const qr = Number(lot.qtyRemaining);
    if (Number.isFinite(qr)) return Math.max(0, qr);
  }
  const w = Number(lot.weightKg);
  if (Number.isFinite(w) && w > 0) return w;
  const q = Number(lot.qtyReceived);
  return Number.isFinite(q) ? Math.max(0, q) : 0;
}

function maxUnreservedKg(lot) {
  return Math.max(0, liveCoilWeightKg(lot) - (Number(lot?.qtyReserved) || 0));
}

const defaultForm = (defaultDate) => ({
  coilNo: '',
  beforeKg: '',
  afterKg: '',
  meters: '',
  productionJobId: '',
  returnDisposition: 'offcut_pool',
  bookRef: '',
  cuttingListRef: '',
  quotationRef: '',
  storekeeperDisplay: '',
  operatorDisplay: '',
  note: '',
  date: defaultDate,
  submitForApproval: true,
});

function ModalPanel({ title, children, onClose }) {
  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-base font-black uppercase tracking-wide text-[#134e4a]">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100"
        >
          Close
        </button>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SectionLabel({ n, children }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest text-[#134e4a] flex items-center gap-2">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#134e4a] text-white text-[9px]">
        {n}
      </span>
      {children}
    </p>
  );
}

/**
 * Production-style coil damage: before/after kg, damaged metres, live conversion preview.
 * Creates a material incident and optionally submits for branch manager approval.
 */
export default function CoilDamageRecordModal({
  isOpen,
  onClose,
  coilLots = [],
  cuttingLists = [],
  defaultCoilNo = '',
  onSuccess,
}) {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const defaultDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [form, setForm] = useState(() => defaultForm(defaultDate));
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setFieldError('');
    setForm({
      ...defaultForm(defaultDate),
      coilNo: defaultCoilNo || '',
      storekeeperDisplay: ws?.user?.displayName || ws?.user?.name || '',
    });
  }, [isOpen, defaultCoilNo, defaultDate, ws?.user?.displayName, ws?.user?.name]);

  const sortedCoils = useMemo(
    () => [...coilLots].sort((a, b) => String(a.coilNo || '').localeCompare(String(b.coilNo || ''))),
    [coilLots]
  );

  const sortedCuttingListOptions = useMemo(
    () => [...cuttingLists].sort((a, b) => compareSelectLabels(String(a.id), String(b.id))).slice(0, 200),
    [cuttingLists]
  );

  const selectedCoil = useMemo(
    () => sortedCoils.find((c) => c.coilNo === form.coilNo) || null,
    [sortedCoils, form.coilNo]
  );

  const preview = useMemo(() => {
    if (!selectedCoil) return coilDamagePreview({ beforeKg: form.beforeKg, afterKg: form.afterKg, meters: form.meters });
    return coilDamagePreview({
      beforeKg: form.beforeKg,
      afterKg: form.afterKg,
      meters: form.meters,
      supplierConversionKgPerM: selectedCoil.supplierConversionKgPerM,
      maxRemoveKg: maxUnreservedKg(selectedCoil),
    });
  }, [form.beforeKg, form.afterKg, form.meters, selectedCoil]);

  const fillFromCoil = (coilNo) => {
    const c = sortedCoils.find((x) => x.coilNo === coilNo);
    if (!c) {
      setForm((prev) => ({ ...prev, coilNo }));
      return;
    }
    const live = liveCoilWeightKg(c);
    setForm((prev) => ({
      ...prev,
      coilNo: c.coilNo,
      beforeKg: live > 0 ? String(Math.round(live)) : prev.beforeKg,
    }));
    setFieldError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldError('');
    if (!ws?.canMutate) return showToast('Workspace is read-only.', { variant: 'error' });

    const payload = {
      coilNo: form.coilNo.trim(),
      beforeKg: Number(form.beforeKg),
      afterKg: Number(form.afterKg),
      meters: Number(form.meters),
      note: form.note.trim(),
      returnDisposition: form.returnDisposition,
    };
    const validated = validateCoilDamagePayload(payload, {
      maxRemoveKg: selectedCoil ? maxUnreservedKg(selectedCoil) : undefined,
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
          productionJobId: form.productionJobId.trim() || undefined,
          bookRef: form.bookRef.trim() || undefined,
          cuttingListRef: form.cuttingListRef.trim() || undefined,
          quotationRef: form.quotationRef.trim() || undefined,
          storekeeperDisplay: form.storekeeperDisplay.trim() || undefined,
          operatorDisplay: form.operatorDisplay.trim() || undefined,
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
      if (data.submitError) {
        showToast(`Draft ${data.id} saved but submit failed: ${data.submitError}`, { variant: 'error' });
      } else if (data.status === 'submitted') {
        showToast(`Damage incident ${data.id} submitted — awaiting manager approval.`);
      } else {
        showToast(`Damage incident ${data.id} saved as draft.`);
      }
      await ws.refresh?.();
      onSuccess?.(data);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalFrame isOpen={isOpen} onClose={() => !saving && onClose()} title="Coil damage record">
      <ModalPanel title="Coil damage record" onClose={() => !saving && onClose()}>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Record damaged steel like production: weigh the roll <strong className="font-semibold text-slate-600">before</strong>{' '}
          and <strong className="font-semibold text-slate-600">after</strong> cutting out the bad section, enter the{' '}
          <strong className="font-semibold text-slate-600">metres removed</strong>, then submit for manager approval.
          Stock posts only after approval.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <SectionLabel n={1}>Coil & weights</SectionLabel>
            <label className="block text-[10px] font-bold text-gray-400 uppercase">Coil number</label>
            <select
              required
              value={form.coilNo}
              onChange={(e) => fillFromCoil(e.target.value)}
              className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm font-bold outline-none"
            >
              <option value="">Select coil…</option>
              {sortedCoils.map((c) => (
                <option key={c.coilNo} value={c.coilNo}>
                  {c.coilNo} · {liveCoilWeightKg(c).toFixed(0)} kg on hand · max remove{' '}
                  {maxUnreservedKg(c).toFixed(0)} kg
                </option>
              ))}
            </select>

            {selectedCoil ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 grid grid-cols-2 gap-1">
                <span>
                  SKU: <strong>{selectedCoil.productID || '—'}</strong>
                </span>
                <span>
                  Gauge: <strong>{selectedCoil.gaugeLabel || '—'}</strong>
                </span>
                <span>
                  Colour: <strong>{selectedCoil.colour || '—'}</strong>
                </span>
                <span>
                  Supplier conv: <strong>{fmtConv2(selectedCoil.supplierConversionKgPerM, { suffix: 'kg/m' })}</strong>
                </span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Before kg (on roll)</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.beforeKg}
                  onChange={(e) => setForm((s) => ({ ...s, beforeKg: e.target.value }))}
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm font-bold outline-none"
                  placeholder="Weight before cutting damage"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase">After kg (remaining good)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.afterKg}
                  onChange={(e) => setForm((s) => ({ ...s, afterKg: e.target.value }))}
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm font-bold outline-none"
                  placeholder="Weight left on coil"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <SectionLabel n={2}>Damaged length & outcome</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Damaged metres</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.meters}
                  onChange={(e) => setForm((s) => ({ ...s, meters: e.target.value }))}
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm font-bold outline-none"
                  placeholder="e.g. 150"
                />
                {preview.impliedMetersFromSupplier != null ? (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Supplier conversion implies ~{preview.impliedMetersFromSupplier.toFixed(1)} m for removed kg
                  </p>
                ) : null}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase">What happens to the steel?</label>
                <select
                  value={form.returnDisposition}
                  onChange={(e) => setForm((s) => ({ ...s, returnDisposition: e.target.value }))}
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm font-bold outline-none"
                >
                  <option value="offcut_pool">Offcut pool — reusable metres</option>
                  <option value="scrap">Scrap — reject / waste</option>
                </select>
              </div>
            </div>
          </div>

          {preview.kgDeducted != null ? (
            <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-[11px] text-slate-700 space-y-1">
              <p className="font-bold text-[#134e4a] uppercase text-[9px] tracking-wide">Conversion preview</p>
              <p>
                <span className="font-semibold">Kg removed:</span>{' '}
                <span className="font-mono tabular-nums">{preview.kgDeducted.toFixed(2)} kg</span>
                {preview.maxRemoveKg != null ? (
                  <span className="text-slate-500"> (max {preview.maxRemoveKg.toFixed(0)} kg unreserved)</span>
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
            </div>
          ) : null}

          <div className="space-y-2">
            <SectionLabel n={3}>Links & people</SectionLabel>
            <label className="block text-[10px] font-bold text-gray-400 uppercase">Production job (optional)</label>
            <input
              value={form.productionJobId}
              onChange={(e) => setForm((s) => ({ ...s, productionJobId: e.target.value }))}
              placeholder="Required only if damage happened during an active job"
              className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm outline-none"
            />

            <label className="block text-[10px] font-bold text-gray-400 uppercase">Book / offcut register no.</label>
            <input
              value={form.bookRef}
              onChange={(e) => setForm((s) => ({ ...s, bookRef: e.target.value }))}
              placeholder="Physical offcut book reference"
              className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm outline-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Cutting list</label>
                <select
                  value={form.cuttingListRef}
                  onChange={(e) => setForm((s) => ({ ...s, cuttingListRef: e.target.value }))}
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm outline-none"
                >
                  <option value="">—</option>
                  {sortedCuttingListOptions.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Quotation ref</label>
                <input
                  value={form.quotationRef}
                  onChange={(e) => setForm((s) => ({ ...s, quotationRef: e.target.value }))}
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Storekeeper</label>
                <input
                  required
                  value={form.storekeeperDisplay}
                  onChange={(e) => setForm((s) => ({ ...s, storekeeperDisplay: e.target.value }))}
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Operator</label>
                <input
                  value={form.operatorDisplay}
                  onChange={(e) => setForm((s) => ({ ...s, operatorDisplay: e.target.value }))}
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <SectionLabel n={4}>Audit note</SectionLabel>
            <textarea
              required
              rows={3}
              minLength={8}
              value={form.note}
              onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
              placeholder="Where on the coil, what damage (rust, stain, edge), and what was cut out — min. 8 characters"
              className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm outline-none resize-none"
            />
            <label className="block text-[10px] font-bold text-gray-400 uppercase">Incident date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
              className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm font-bold outline-none"
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
                Recommended — coil kg and pool/scrap stock update only after approval.
              </span>
            </span>
          </label>

          {fieldError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{fieldError}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="submit" disabled={saving} className="z-btn-primary flex-1 justify-center py-3 disabled:opacity-50">
              {saving ? 'Saving…' : form.submitForApproval ? 'Save & submit for approval' : 'Save draft only'}
            </button>
            <Link
              to="/operations/material-exceptions"
              className="z-btn-secondary inline-flex items-center justify-center py-3 px-4 text-xs"
              onClick={onClose}
            >
              Material exceptions
            </Link>
          </div>
        </form>
      </ModalPanel>
    </ModalFrame>
  );
}
