import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { ModalFrame } from '../layout/ModalFrame';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';

const CATEGORY_LABELS = {
  plant: 'Plant & machinery',
  vehicle: 'Vehicles',
  it: 'IT equipment',
  building: 'Buildings',
  land: 'Land',
  other: 'Other',
};

function DetailField({ label, children }) {
  if (children == null || children === '') return null;
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-slate-800 break-words">{children}</p>
    </div>
  );
}

/**
 * @param {{
 *   asset: object | null;
 *   branchLabel?: string;
 *   canManage?: boolean;
 *   busy?: boolean;
 *   onClose: () => void;
 *   onDispose?: (asset: object, disposalDateIso: string) => void | Promise<void>;
 * }} props
 */
export function AccountingAssetDetailModal({ asset, branchLabel, canManage, busy, onClose, onDispose }) {
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [disposalDate, setDisposalDate] = useState(new Date().toISOString().slice(0, 10));

  if (!asset) return null;

  const categoryLabel = CATEGORY_LABELS[asset.category] || asset.category;

  return (
    <ModalFrame isOpen onClose={onClose} title="Asset detail" surface="plain">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white shadow-xl overflow-hidden">
        <div className="h-1 bg-[#134e4a]" />
        <div className="p-5 sm:p-6 max-h-[min(85dvh,720px)] overflow-y-auto custom-scrollbar">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{categoryLabel}</p>
              <h2 className="text-lg font-bold text-[#134e4a] mt-1 break-words">{asset.name}</h2>
              <span
                className={`inline-block mt-2 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase ${
                  asset.status === 'active' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {asset.status === 'active' ? 'Active' : 'Disposed'}
              </span>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Net book value</p>
              <p className="text-xl font-black text-[#134e4a] tabular-nums">{formatNgn(asset.netBookValueNgn)}</p>
            </div>
          </div>

          <ProcurementFormSection letter="V" title="Valuation" compact>
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Cost">{formatNgn(asset.costNgn)}</DetailField>
              <DetailField label="Accumulated depreciation">{formatNgn(asset.accumulatedDepreciationNgn)}</DetailField>
              <DetailField label="Salvage value">{formatNgn(asset.salvageNgn)}</DetailField>
              <DetailField label="Monthly depreciation">{formatNgn(asset.monthlyDepreciationNgn)}</DetailField>
            </div>
          </ProcurementFormSection>

          <ProcurementFormSection letter="R" title="Register" compact>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailField label="Asset ID">{asset.id}</DetailField>
              <DetailField label="Branch">{branchLabel || asset.branchId}</DetailField>
              <DetailField label="Acquisition date">{String(asset.acquisitionDateIso || '').slice(0, 10)}</DetailField>
              <DetailField label="Useful life">{asset.usefulLifeMonths} months</DetailField>
              <DetailField label="Method">{asset.depreciationMethod === 'straight_line' ? 'Straight line' : asset.depreciationMethod}</DetailField>
              <DetailField label="Treasury reference">{asset.treasuryReference}</DetailField>
              {asset.disposalDateIso ? (
                <DetailField label="Disposal date">{String(asset.disposalDateIso).slice(0, 10)}</DetailField>
              ) : null}
              {asset.notes ? <DetailField label="Notes">{asset.notes}</DetailField> : null}
            </div>
          </ProcurementFormSection>

          {disposeOpen && canManage && asset.status === 'active' ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 mt-3 space-y-2">
              <p className="text-[10px] font-semibold text-amber-950">Mark asset as disposed</p>
              <label className="block text-[10px] font-bold uppercase text-slate-500">
                Disposal date
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px]"
                  value={disposalDate}
                  onChange={(e) => setDisposalDate(e.target.value)}
                />
              </label>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setDisposeOpen(false)} className="text-[9px] font-semibold uppercase text-slate-600">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDispose?.(asset, disposalDate)}
                  className="rounded-lg bg-amber-800 text-white px-3 py-1 text-[9px] font-semibold uppercase disabled:opacity-50"
                >
                  {busy ? 'Saving…' : 'Confirm dispose'}
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-3 mt-2 border-t border-slate-100">
            {canManage && asset.status === 'active' && onDispose && !disposeOpen ? (
              <button
                type="button"
                onClick={() => setDisposeOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[9px] font-semibold uppercase text-amber-950 hover:bg-amber-100"
              >
                <Trash2 size={12} /> Dispose
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
