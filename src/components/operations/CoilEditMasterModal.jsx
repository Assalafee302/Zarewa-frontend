import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Scale, X } from 'lucide-react';
import { ModalFrame } from '../layout';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/apiBase';
import { coilFreeKg, coilKgUsed, coilOnHandKg, coilReceivedKg } from '../../lib/coilStockKg';
import { normalizeGaugeLabelForMasterData } from '../../lib/coilExcelImport';

function asNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatKg(n) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function buildFormFromCoil(coil) {
  const recv = coilReceivedKg(coil);
  const cur = coilOnHandKg(coil);
  const aligned = Math.abs(recv - cur) < 0.02;
  return {
    colour: String(coil?.colour ?? '').trim(),
    gaugeLabel: String(coil?.gaugeLabel ?? coil?.gauge ?? '').trim(),
    materialTypeName: String(coil?.materialTypeName ?? coil?.materialType ?? '').trim(),
    currentKg: cur > 0 ? String(cur) : '',
    receivedKg: recv > 0 ? String(recv) : '',
    stockForm: String(coil?.stockForm || 'coil').toLowerCase() === 'roll' ? 'roll' : 'coil',
    linkOnHandToReceived: aligned,
  };
}

function PreviewTile({ label, value, hint, accent }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        accent ? 'border-zarewa-teal/30 bg-zarewa-teal/5' : 'border-slate-200 bg-slate-50/80'
      }`}
    >
      <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-black tabular-nums ${accent ? 'text-zarewa-teal' : 'text-slate-800'}`}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-ui-xs text-slate-500 leading-snug">{hint}</p> : null}
    </div>
  );
}

/**
 * Branch manager / MD coil master edit — spec, weights, and full book recalc on save.
 */
export default function CoilEditMasterModal({ isOpen, onClose, coil, reservedKg = 0, onSaved }) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(() => buildFormFromCoil(coil));
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

  useEffect(() => {
    if (isOpen && !wasOpenRef.current && coil) {
      setForm(buildFormFromCoil(coil));
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, coil]);

  const draftOnHand = useMemo(() => {
    const cur = Number(String(form.currentKg || '').replace(/,/g, ''));
    if (Number.isFinite(cur) && cur >= 0) return cur;
    return coil ? coilOnHandKg(coil) : 0;
  }, [form.currentKg, coil]);

  const draftReceived = useMemo(() => {
    const r = Number(String(form.receivedKg || '').replace(/,/g, ''));
    return Number.isFinite(r) && r >= 0 ? r : null;
  }, [form.receivedKg]);

  const draftUsed = draftReceived != null ? Math.max(0, draftReceived - draftOnHand) : coil ? coilKgUsed(coil) : 0;
  const draftFree = coilFreeKg({ qtyReserved: reservedKg, currentWeightKg: draftOnHand });

  const canSave = Boolean(ws?.canMutate);

  const setLinkedReceived = (receivedValue) => {
    setForm((f) => {
      const next = { ...f, receivedKg: receivedValue };
      if (f.linkOnHandToReceived && receivedValue.trim() !== '') {
        next.currentKg = receivedValue;
      }
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!coil || !canSave) {
      showToast('Workspace is read-only.', { variant: 'error' });
      return;
    }
    const recvNum = Number(String(form.receivedKg || '').replace(/,/g, ''));
    const curNum = Number(String(form.currentKg || '').replace(/,/g, ''));
    if (!Number.isFinite(recvNum) || recvNum < 0) {
      showToast('Enter a valid received kg (GRN).', { variant: 'error' });
      return;
    }
    if (!Number.isFinite(curNum) || curNum < 0) {
      showToast('Enter a valid current on-hand kg.', { variant: 'error' });
      return;
    }
    if (curNum + 1e-9 < asNum(reservedKg)) {
      showToast(
        `On-hand kg cannot be below reserved kg (${formatKg(reservedKg)} kg on active jobs).`,
        { variant: 'error' }
      );
      return;
    }

    setBusy(true);
    try {
      const body = {
        colour: form.colour.trim(),
        gaugeLabel: normalizeGaugeLabelForMasterData(form.gaugeLabel),
        materialTypeName: form.materialTypeName.trim(),
        stockForm: form.stockForm,
        receivedKg: recvNum,
        currentWeightKg: curNum,
        recalculate: true,
      };
      const { ok, data } = await apiFetch(`/api/coil-lots/${encodeURIComponent(coil.coilNo)}/master-data`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Update failed.', { variant: 'error' });
        return;
      }

      await ws.refresh?.();
      await onSaved?.(data);

      const free =
        data.freeKg != null
          ? Number(data.freeKg)
          : Math.max(0, curNum - asNum(data.qtyReserved ?? reservedKg));
      const parts = [`Coil ${coil.coilNo} updated`];
      parts.push(`on-hand ${formatKg(data.recalc?.qtyRemaining ?? curNum)} kg`);
      parts.push(`free ${formatKg(free)} kg`);
      if (data.reservationReconcile && !data.reservationReconcile.unchanged) {
        parts.push(`reservation reconciled`);
      }
      showToast(parts.join(' · '));
      onClose?.();
    } catch (err) {
      showToast(String(err?.message || err), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (!coil) return null;

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose}>
      <div className="z-modal-panel max-w-xl p-6 sm:p-8 overflow-y-auto max-h-[min(92vh,44rem)]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-ui-xs font-bold uppercase tracking-widest text-slate-500">Coil register correction</p>
            <h3 className="text-xl font-bold text-zarewa-teal font-mono mt-0.5">{coil.coilNo}</h3>
            <p className="text-xs text-slate-600 mt-1">
              {[coil.productID, coil.colour, coil.gaugeLabel].filter(Boolean).join(' · ') || '—'}
              {coil.currentStatus ? ` · ${coil.currentStatus}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 rounded-xl shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 mb-4">
          <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
            <Scale size={14} className="text-zarewa-teal" aria-hidden />
            Live preview (after save)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
            <PreviewTile label="Received (GRN)" value={draftReceived != null ? `${formatKg(draftReceived)} kg` : '—'} />
            <PreviewTile label="Kg used" value={`${formatKg(draftUsed)} kg`} hint="Received − on-hand" />
            <PreviewTile label="On-hand kg" value={`${formatKg(draftOnHand)} kg`} />
            <PreviewTile label="Reserved" value={`${formatKg(reservedKg)} kg`} hint="Active production jobs" />
            <PreviewTile label="Free to use" value={`${formatKg(draftFree)} kg`} accent />
          </div>
          <p className="mt-2 text-ui-xs text-slate-500 leading-snug tabular-nums">
            received {formatKg(draftReceived ?? coilReceivedKg(coil))} − used {formatKg(draftUsed)} = on-hand{' '}
            {formatKg(draftOnHand)} · on-hand {formatKg(draftOnHand)} − reserved {formatKg(reservedKg)} = free{' '}
            {formatKg(draftFree)} kg
          </p>
        </div>

        <form className="space-y-5" onSubmit={submit}>
          <fieldset className="space-y-3">
            <legend className="text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal">Specification</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block sm:col-span-2">
                <span className="text-ui-xs font-bold text-slate-500 uppercase">Colour</span>
                <input
                  className="z-input w-full mt-0.5"
                  list="coil-edit-colours"
                  value={form.colour}
                  onChange={(e) => setForm((f) => ({ ...f, colour: e.target.value }))}
                  placeholder="e.g. IV, Bush green"
                />
                <datalist id="coil-edit-colours">
                  {colourOptions.map((c) => (
                    <option key={c.abbrev || c.name} value={c.abbrev || c.name}>
                      {c.name}
                    </option>
                  ))}
                </datalist>
              </label>
              <label className="block">
                <span className="text-ui-xs font-bold text-slate-500 uppercase">Gauge</span>
                <input
                  className="z-input w-full mt-0.5"
                  list="coil-edit-gauges"
                  value={form.gaugeLabel}
                  onChange={(e) => setForm((f) => ({ ...f, gaugeLabel: e.target.value }))}
                  placeholder="e.g. 0.24mm"
                />
                <datalist id="coil-edit-gauges">
                  {gaugeOptions.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </label>
              <label className="block">
                <span className="text-ui-xs font-bold text-slate-500 uppercase">Material type</span>
                <input
                  className="z-input w-full mt-0.5"
                  value={form.materialTypeName}
                  onChange={(e) => setForm((f) => ({ ...f, materialTypeName: e.target.value }))}
                  placeholder="e.g. Aluminium"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-ui-xs font-bold text-slate-500 uppercase">Stock form</span>
                <select
                  className="z-input w-full mt-0.5"
                  value={form.stockForm}
                  onChange={(e) => setForm((f) => ({ ...f, stockForm: e.target.value }))}
                >
                  <option value="coil">Coil — gross kg (spool deducted in production register)</option>
                  <option value="roll">Roll — net kg (no spool deduction)</option>
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
            <legend className="text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal px-1">
              Weight &amp; stock book
            </legend>
            <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={form.linkOnHandToReceived}
                onChange={(e) => {
                  const linked = e.target.checked;
                  setForm((f) => ({
                    ...f,
                    linkOnHandToReceived: linked,
                    currentKg: linked && f.receivedKg.trim() ? f.receivedKg : f.currentKg,
                  }));
                }}
              />
              <span>
                Keep <strong>on-hand kg</strong> matched to <strong>received kg</strong> (use when correcting a bulk-import
                typo and the full roll is still on the floor).
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-ui-xs font-bold text-slate-500 uppercase">Received kg (GRN)</span>
                <input
                  className="z-input w-full mt-0.5 font-semibold tabular-nums"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.receivedKg}
                  onChange={(e) => setLinkedReceived(e.target.value)}
                  required
                />
                <p className="mt-1 text-ui-xs text-slate-500">Original receipt / import figure.</p>
              </label>
              <label className="block">
                <span className="text-ui-xs font-bold text-slate-500 uppercase">Current on-hand kg</span>
                <input
                  className="z-input w-full mt-0.5 font-semibold tabular-nums"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.currentKg}
                  onChange={(e) => setForm((f) => ({ ...f, currentKg: e.target.value }))}
                  required
                />
                <p className="mt-1 text-ui-xs text-slate-500">Physical kg on the roll today — drives free kg.</p>
              </label>
            </div>
          </fieldset>

          <p className="text-xs text-slate-600 leading-relaxed rounded-lg border border-slate-200 bg-white px-3 py-2">
            <strong>Save</strong> updates this coil, reconciles raw product stock, normalizes status, and aligns reservations
            with active production jobs. Changes are audited.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className="z-btn-secondary flex-1 min-w-[7rem]" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="z-btn-primary flex-1 min-w-[7rem] justify-center" disabled={!canSave || busy}>
              {busy ? 'Saving…' : 'Save & recalculate'}
            </button>
          </div>
        </form>
      </div>
    </ModalFrame>
  );
}
