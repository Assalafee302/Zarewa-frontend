import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { ModalFrame } from '../layout';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/apiBase';
import { materialTextToProductId, normalizeGaugeLabelForMasterData } from '../../lib/coilExcelImport';

const CL_COIL_NO_RE = /^CL-(\d{2})-(\d{1,6})$/i;

function maxClSequenceForYear(coilLots, yy2, extraCoilNos = []) {
  let max = 0;
  for (const lot of coilLots || []) {
    const m = String(lot.coilNo || '').trim().match(CL_COIL_NO_RE);
    if (!m || m[1] !== yy2) continue;
    max = Math.max(max, parseInt(m[2], 10));
  }
  for (const cn of extraCoilNos) {
    const m = String(cn || '').trim().match(CL_COIL_NO_RE);
    if (!m || m[1] !== yy2) continue;
    max = Math.max(max, parseInt(m[2], 10));
  }
  return max;
}

function suggestNextClCoilNo(coilLots) {
  const yy = String(new Date().getFullYear()).slice(-2);
  const next = maxClSequenceForYear(coilLots, yy, []) + 1;
  return `CL-${yy}-${String(next).padStart(4, '0')}`;
}

const MATERIAL_OPTIONS = [
  { id: 'aluminium', label: 'Aluminium', productID: 'COIL-ALU', materialTypeName: 'Aluminium' },
  { id: 'aluzinc', label: 'Aluzinc / PPGI', productID: 'PRD-102', materialTypeName: 'Aluzinc' },
];

const defaultForm = (coilLots) => ({
  coilNo: suggestNextClCoilNo(coilLots),
  materialId: 'aluminium',
  colour: '',
  gauge: '',
  currentKg: '',
  location: '',
  supplierName: '',
  receivedAtISO: new Date().toISOString().slice(0, 10),
  note: '',
});

/**
 * Register one coil directly in stock (no PO / GRN) — for coils missed on bulk import.
 */
export default function RegisterCoilModal({ isOpen, onClose, coilLots = [], onSuccess }) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(() => defaultForm(coilLots));
  const wasOpenRef = useRef(false);

  const masterData = ws?.snapshot?.masterData ?? null;
  const colourOptions = useMemo(() => {
    const rows = Array.isArray(masterData?.colours) ? masterData.colours : [];
    return rows
      .filter((c) => c.active !== false)
      .map((c) => ({
        abbrev: String(c.abbreviation || c.abbrev || '').trim(),
        name: String(c.name || '').trim(),
      }))
      .filter((c) => c.abbrev || c.name);
  }, [masterData?.colours]);
  const gaugeOptions = useMemo(() => {
    const rows = Array.isArray(masterData?.gauges) ? masterData.gauges : [];
    return rows
      .filter((g) => g.active !== false)
      .map((g) => String(g.label || g.name || '').trim())
      .filter(Boolean);
  }, [masterData?.gauges]);

  // Reset only when the modal opens — not when coilLots refreshes in the background.
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setForm(defaultForm(coilLots));
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, coilLots]);

  const canRegister = Boolean(
    ws?.canMutate &&
      (ws?.hasPermission?.('purchase_orders.manage') ||
        ws?.hasPermission?.('inventory.receive') ||
        ws?.hasPermission?.('operations.manage') ||
        ws?.hasPermission?.('production.manage'))
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!canRegister) {
      showToast('You do not have permission to register coils.', { variant: 'error' });
      return;
    }
    const coilNo = String(form.coilNo || '').trim();
    if (!coilNo) {
      showToast('Enter a coil number.', { variant: 'error' });
      return;
    }
    const kg = Number(String(form.currentKg || '').replace(/,/g, ''));
    if (!Number.isFinite(kg) || kg <= 0) {
      showToast('Enter a valid on-hand kg greater than zero.', { variant: 'error' });
      return;
    }
    const mat = MATERIAL_OPTIONS.find((m) => m.id === form.materialId) || MATERIAL_OPTIONS[0];
    const colour = String(form.colour || '').trim();
    const gaugeLabel = normalizeGaugeLabelForMasterData(form.gauge);
    const materialTypeName = mat.materialTypeName;
    const productID =
      materialTextToProductId(materialTypeName) ||
      materialTextToProductId(mat.label) ||
      mat.productID;

    setBusy(true);
    try {
      const row = {
        coilNo,
        productID,
        currentKg: kg,
        qtyReceived: kg,
        weightKg: kg,
        colour: colour || null,
        gaugeLabel: gaugeLabel || null,
        materialTypeName,
        location: String(form.location || '').trim() || null,
        supplierName: String(form.supplierName || '').trim() || null,
        receivedAtISO: String(form.receivedAtISO || '').slice(0, 10) || undefined,
        note: String(form.note || '').trim() || undefined,
      };
      const r = await apiFetch('/api/coil-lots/import', {
        method: 'POST',
        body: JSON.stringify({ rows: [row], insertOnly: true }),
      });
      const data = r.data;
      if (!r.ok || !data?.ok) {
        if (data?.skipped?.length) {
          showToast(data.skipped[0].reason || 'Coil already exists.', { variant: 'error' });
        } else {
          showToast(data?.error || `Registration failed (${r.status}).`, { variant: 'error' });
        }
        return;
      }
      if (!data.imported) {
        showToast(data.skipped?.[0]?.reason || 'Coil was not added.', { variant: 'error' });
        return;
      }
      await ws.refresh?.();
      await onSuccess?.();
      showToast(`Coil ${coilNo} registered — ${kg.toLocaleString()} kg on book.`);
      onClose?.();
    } catch (err) {
      showToast(String(err?.message || err), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose}>
      <div className="z-modal-panel max-w-lg p-6 sm:p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-[#134e4a]">Register coil</h3>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 rounded-xl">
            <X size={20} />
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mb-4 leading-snug">
          Add a coil you forgot during bulk import or yard registration. No purchase order is created — the coil goes
          straight onto the live stock register with the kg you enter.
        </p>
        <form className="space-y-3" onSubmit={submit}>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Coil number</span>
            <div className="mt-0.5 flex gap-2">
              <input
                className="z-input w-full font-mono"
                value={form.coilNo}
                onChange={(e) => setForm((f) => ({ ...f, coilNo: e.target.value }))}
                placeholder="e.g. CL-26-2043 or yard tag"
                required
              />
              <button
                type="button"
                className="z-btn-secondary shrink-0 text-[10px] whitespace-nowrap"
                onClick={() => setForm((f) => ({ ...f, coilNo: suggestNextClCoilNo(coilLots) }))}
              >
                Suggest CL no.
              </button>
            </div>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Material</span>
            <select
              className="z-input w-full mt-0.5"
              value={form.materialId}
              onChange={(e) => setForm((f) => ({ ...f, materialId: e.target.value }))}
            >
              {MATERIAL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Colour</span>
              <input
                className="z-input w-full mt-0.5"
                list="register-coil-colours"
                value={form.colour}
                onChange={(e) => setForm((f) => ({ ...f, colour: e.target.value }))}
                placeholder="e.g. IV, GB"
              />
              <datalist id="register-coil-colours">
                {colourOptions.map((c) => (
                  <option key={c.abbrev || c.name} value={c.abbrev || c.name}>
                    {c.name}
                  </option>
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Gauge</span>
              <input
                className="z-input w-full mt-0.5"
                list="register-coil-gauges"
                value={form.gauge}
                onChange={(e) => setForm((f) => ({ ...f, gauge: e.target.value }))}
                placeholder="e.g. 0.24 or 0.24mm"
              />
              <datalist id="register-coil-gauges">
                {gaugeOptions.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase">On-hand kg</span>
            <input
              className="z-input w-full mt-0.5"
              type="number"
              min="0.01"
              step="0.01"
              value={form.currentKg}
              onChange={(e) => setForm((f) => ({ ...f, currentKg: e.target.value }))}
              placeholder="Gross kg on the roll"
              required
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Location (optional)</span>
              <input
                className="z-input w-full mt-0.5"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Bay / rack"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Received date</span>
              <input
                className="z-input w-full mt-0.5"
                type="date"
                value={form.receivedAtISO}
                onChange={(e) => setForm((f) => ({ ...f, receivedAtISO: e.target.value }))}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Supplier (optional)</span>
            <input
              className="z-input w-full mt-0.5"
              value={form.supplierName}
              onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))}
              placeholder="Supplier name"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Note (optional)</span>
            <input
              className="z-input w-full mt-0.5"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Missed on March import"
            />
          </label>
          <button type="submit" className="z-btn-primary w-full justify-center" disabled={!canRegister || busy}>
            <Plus size={16} />
            {busy ? 'Registering…' : 'Register coil'}
          </button>
        </form>
      </div>
    </ModalFrame>
  );
}
