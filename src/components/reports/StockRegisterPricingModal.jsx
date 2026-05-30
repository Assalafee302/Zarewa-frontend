import React, { useEffect, useState } from 'react';
import { Calculator, Loader2, RotateCcw, Save, X } from 'lucide-react';
import { ModalFrame } from '../layout';
import { formatNgn } from '../../Data/mockData';
import { apiFetch } from '../../lib/apiBase';

function numOrEmpty(v) {
  if (v == null || v === '') return '';
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : '';
}

function PriceField({ label, suggested, value, onChange, suffix, disabled }) {
  return (
    <label className="block text-sm">
      <span className="font-semibold text-slate-800">{label}</span>
      {suggested != null && suggested > 0 ? (
        <p className="text-[11px] text-slate-500 mt-0.5">Suggested avg: {formatNgn(suggested)}{suffix}</p>
      ) : (
        <p className="text-[11px] text-slate-400 mt-0.5">No suggested price on file</p>
      )}
      <input
        type="number"
        min={0}
        step={1}
        className="z-input w-full mt-1 tabular-nums"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={suggested ? String(suggested) : 'Enter price'}
        disabled={disabled}
      />
    </label>
  );
}

export function StockRegisterPricingModal({
  open,
  onClose,
  pricingForm,
  periodEnd,
  branchLabel,
  status,
  showToast,
  onSaved,
}) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const locked = status === 'locked';

  useEffect(() => {
    if (!open || !pricingForm) return;
    setForm({
      aluminiumNgnPerKg: numOrEmpty(pricingForm.aluminium?.appliedNgnPerKg ?? pricingForm.aluminium?.suggestedNgnPerKg),
      aluzincNgnPerKg: numOrEmpty(pricingForm.aluzinc?.appliedNgnPerKg ?? pricingForm.aluzinc?.suggestedNgnPerKg),
      stoneLines: (pricingForm.stoneLines || []).map((l) => ({
        ...l,
        appliedNgnPerM: numOrEmpty(l.unitPriceNgnPerM ?? l.suggestedUnitPriceNgnPerM),
      })),
      accessoryLines: (pricingForm.accessoryLines || []).map((l) => ({
        ...l,
        appliedNgnPerUnit: numOrEmpty(l.unitPriceNgn ?? l.suggestedUnitPriceNgn),
      })),
    });
  }, [open, pricingForm]);

  const resetToSuggested = () => {
    if (!pricingForm) return;
    setForm({
      aluminiumNgnPerKg: numOrEmpty(pricingForm.aluminium?.suggestedNgnPerKg),
      aluzincNgnPerKg: numOrEmpty(pricingForm.aluzinc?.suggestedNgnPerKg),
      stoneLines: (pricingForm.stoneLines || []).map((l) => ({
        ...l,
        appliedNgnPerM: numOrEmpty(l.suggestedUnitPriceNgnPerM),
      })),
      accessoryLines: (pricingForm.accessoryLines || []).map((l) => ({
        ...l,
        appliedNgnPerUnit: numOrEmpty(l.suggestedUnitPriceNgn),
      })),
    });
  };

  const save = async () => {
    if (!form || locked) return;
    setSaving(true);
    try {
      const { ok, data } = await apiFetch('/api/stock-register/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodEnd,
          pricing: {
            aluminiumNgnPerKg: form.aluminiumNgnPerKg,
            aluzincNgnPerKg: form.aluzincNgnPerKg,
            stoneLines: form.stoneLines.map((l) => ({
              productID: l.productID,
              appliedNgnPerM: l.appliedNgnPerM,
            })),
            accessoryLines: form.accessoryLines.map((l) => ({
              productID: l.productID,
              appliedNgnPerUnit: l.appliedNgnPerUnit,
            })),
          },
        }),
      });
      if (!ok || !data?.ok) {
        showToast?.(data?.error || 'Could not save valuation prices.', { variant: 'error' });
        return;
      }
      showToast?.('Valuation prices saved.');
      onSaved?.(data);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <ModalFrame isOpen={open} onClose={onClose} title="Stock valuation prices" surface="plain">
      <div className="z-modal-panel-lg w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Closing stock valuation</p>
            <h3 className="text-lg font-black text-[#134e4a]">Edit prices for register</h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {branchLabel} · period ending {periodEnd}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Suggested averages come from purchases (kg or metre PO converted to ₦/kg for coils). Edit the amount used
              for closing value — saved prices apply to preview and print.
            </p>
          </div>
          <button type="button" onClick={onClose} className="z-btn-secondary p-2 shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">
          {!form ? (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <PriceField
                  label="Aluminium — ₦/kg used"
                  suggested={pricingForm?.aluminium?.suggestedNgnPerKg}
                  suffix="/kg"
                  value={form.aluminiumNgnPerKg}
                  onChange={(v) => setForm((f) => ({ ...f, aluminiumNgnPerKg: v }))}
                  disabled={locked}
                />
                <PriceField
                  label="Aluzinc — ₦/kg used"
                  suggested={pricingForm?.aluzinc?.suggestedNgnPerKg}
                  suffix="/kg"
                  value={form.aluzincNgnPerKg}
                  onChange={(v) => setForm((f) => ({ ...f, aluzincNgnPerKg: v }))}
                  disabled={locked}
                />
              </div>

              {form.stoneLines.length ? (
                <section>
                  <h4 className="text-sm font-bold text-slate-800 mb-2">Stone-coated — ₦/metre by colour</h4>
                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-xs border-collapse min-w-[520px]">
                      <thead>
                        <tr className="bg-slate-50 text-left">
                          <th className="px-2 py-2 font-bold text-slate-600">Colour / gauge</th>
                          <th className="px-2 py-2 font-bold text-slate-600 text-right">Remain m</th>
                          <th className="px-2 py-2 font-bold text-slate-600 text-right">Suggested ₦/m</th>
                          <th className="px-2 py-2 font-bold text-slate-600 text-right">Used ₦/m</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.stoneLines.map((line) => (
                          <tr key={line.productID} className="border-t border-slate-100">
                            <td className="px-2 py-2">
                              {line.colourDisplay}
                              <span className="text-slate-500"> · {line.gaugeLabel}</span>
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums">{Number(line.remainingM || 0).toLocaleString()}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-500">
                              {line.suggestedUnitPriceNgnPerM ? formatNgn(line.suggestedUnitPriceNgnPerM) : '—'}
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                min={0}
                                className="z-input w-full text-right tabular-nums py-1.5"
                                value={line.appliedNgnPerM}
                                onChange={(e) =>
                                  setForm((f) => ({
                                    ...f,
                                    stoneLines: f.stoneLines.map((r) =>
                                      r.productID === line.productID ? { ...r, appliedNgnPerM: e.target.value } : r
                                    ),
                                  }))
                                }
                                disabled={locked}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {form.accessoryLines.length ? (
                <section>
                  <h4 className="text-sm font-bold text-slate-800 mb-2">Accessories — ₦/unit by item</h4>
                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[min(40vh,320px)] overflow-y-auto">
                    <table className="w-full text-xs border-collapse min-w-[520px]">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr className="text-left">
                          <th className="px-2 py-2 font-bold text-slate-600">Item (PO name)</th>
                          <th className="px-2 py-2 font-bold text-slate-600">Unit</th>
                          <th className="px-2 py-2 font-bold text-slate-600 text-right">Balance</th>
                          <th className="px-2 py-2 font-bold text-slate-600 text-right">Suggested</th>
                          <th className="px-2 py-2 font-bold text-slate-600 text-right">Used</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.accessoryLines.map((line) => (
                          <tr key={line.productID} className="border-t border-slate-100">
                            <td className="px-2 py-2">{line.itemName}</td>
                            <td className="px-2 py-2 text-slate-600">{line.unit}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{Number(line.balance || 0).toLocaleString()}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-500">
                              {line.suggestedUnitPriceNgn ? formatNgn(line.suggestedUnitPriceNgn) : '—'}
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                min={0}
                                className="z-input w-full text-right tabular-nums py-1.5"
                                value={line.appliedNgnPerUnit}
                                onChange={(e) =>
                                  setForm((f) => ({
                                    ...f,
                                    accessoryLines: f.accessoryLines.map((r) =>
                                      r.productID === line.productID ? { ...r, appliedNgnPerUnit: e.target.value } : r
                                    ),
                                  }))
                                }
                                disabled={locked}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-4 flex flex-wrap gap-2 justify-end shrink-0 bg-slate-50/80">
          <button type="button" className="z-btn-secondary" onClick={resetToSuggested} disabled={locked || !form}>
            <RotateCcw size={14} />
            Reset to suggested
          </button>
          <button type="button" className="z-btn-primary" onClick={save} disabled={locked || saving || !form}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save prices
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
