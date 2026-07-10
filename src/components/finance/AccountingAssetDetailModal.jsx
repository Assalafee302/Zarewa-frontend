import React, { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { ModalFrame } from '../layout/ModalFrame';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import { treasuryAccountDisplayName } from '../../lib/treasuryAccountsStore';

const CATEGORY_LABELS = {
  plant: 'Plant & machinery',
  vehicle: 'Vehicles',
  it: 'IT equipment',
  building: 'Buildings',
  land: 'Land',
  other: 'Other',
};

const INPUT =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-zarewa-teal/35 focus:ring-2 focus:ring-zarewa-teal/10';

function DetailField({ label, children }) {
  if (children == null || children === '') return null;
  return (
    <div>
      <p className="text-ui-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-800 break-words">{children}</p>
    </div>
  );
}

/**
 * @param {{
 *   asset: object | null;
 *   branchLabel?: string;
 *   treasuryAccounts?: object[];
 *   canManage?: boolean;
 *   busy?: boolean;
 *   onClose: () => void;
 *   onDispose?: (asset: object, payload: object) => void | Promise<void>;
 * }} props
 */
export function AccountingAssetDetailModal({
  asset,
  branchLabel,
  treasuryAccounts = [],
  canManage,
  busy,
  onClose,
  onDispose,
}) {
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [disposalDate, setDisposalDate] = useState(new Date().toISOString().slice(0, 10));
  const [saleProceedsNgn, setSaleProceedsNgn] = useState('');
  const [treasuryAccountId, setTreasuryAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const bankAccounts = useMemo(
    () =>
      treasuryAccounts.filter((a) => {
        const t = String(a.type || '').toLowerCase();
        return t === 'bank' || t === 'cash' || t === 'current' || t === 'savings' || !t;
      }),
    [treasuryAccounts]
  );

  useEffect(() => {
    if (!asset || !disposeOpen) return;
    setDisposalDate(new Date().toISOString().slice(0, 10));
    setSaleProceedsNgn(String(asset.netBookValueNgn || ''));
    setReference(asset.id || '');
    setNote(asset.name ? `Sale — ${asset.name}` : '');
    if (bankAccounts.length) {
      setTreasuryAccountId(String(bankAccounts[0].id));
    }
  }, [asset, disposeOpen, bankAccounts]);

  if (!asset) return null;

  const categoryLabel = CATEGORY_LABELS[asset.category] || asset.category;
  const proceeds = Math.round(Number(saleProceedsNgn) || 0);
  const needsTreasury = proceeds > 0;

  const handleConfirmDispose = () => {
    void onDispose?.(asset, {
      disposalDateIso: disposalDate,
      saleProceedsNgn: proceeds,
      treasuryAccountId: needsTreasury ? Number(treasuryAccountId) : undefined,
      reference: reference.trim() || undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <ModalFrame isOpen onClose={onClose} title="Asset detail" surface="plain">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white shadow-xl overflow-hidden">
        <div className="h-1 bg-zarewa-teal" />
        <div className="p-5 sm:p-6 max-h-[min(85dvh,720px)] overflow-y-auto custom-scrollbar">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <p className="text-ui-xs font-bold uppercase tracking-widest text-slate-500">{categoryLabel}</p>
              <h2 className="text-lg font-bold text-zarewa-teal mt-1 break-words">{asset.name}</h2>
              <span
                className={`inline-block mt-2 rounded-full px-2 py-0.5 text-ui-xs font-bold uppercase ${
                  asset.status === 'active' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {asset.status === 'active' ? 'Active' : 'Disposed'}
              </span>
            </div>
            <div className="text-right shrink-0">
              <p className="text-ui-xs font-bold uppercase tracking-widest text-slate-500">Net book value</p>
              <p className="text-xl font-black text-zarewa-teal tabular-nums">{formatNgn(asset.netBookValueNgn)}</p>
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
              <DetailField label="Source expense">{asset.sourceExpenseId}</DetailField>
              {asset.disposalDateIso ? (
                <DetailField label="Disposal date">{String(asset.disposalDateIso).slice(0, 10)}</DetailField>
              ) : null}
              {asset.disposalProceedsNgn > 0 ? (
                <DetailField label="Sale proceeds">{formatNgn(asset.disposalProceedsNgn)}</DetailField>
              ) : null}
              {asset.notes ? <DetailField label="Notes">{asset.notes}</DetailField> : null}
            </div>
          </ProcurementFormSection>

          {disposeOpen && canManage && asset.status === 'active' ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 mt-3 space-y-3">
              <div>
                <p className="text-ui-xs font-semibold text-amber-950">Sell or dispose asset</p>
                <p className="text-ui-xs text-amber-900/80 mt-1 leading-snug">
                  Records treasury receipt (if sold), clears cost and accumulated depreciation in the GL, and posts any
                  gain or loss on disposal.
                </p>
              </div>
              <label className="block text-ui-xs font-bold uppercase text-slate-500">
                Disposal date
                <input type="date" className={INPUT} value={disposalDate} onChange={(e) => setDisposalDate(e.target.value)} />
              </label>
              <label className="block text-ui-xs font-bold uppercase text-slate-500">
                Sale proceeds (₦)
                <input
                  type="number"
                  min="0"
                  className={INPUT}
                  value={saleProceedsNgn}
                  onChange={(e) => setSaleProceedsNgn(e.target.value)}
                  placeholder="0 for scrap / write-off"
                />
              </label>
              {needsTreasury ? (
                <label className="block text-ui-xs font-bold uppercase text-slate-500">
                  Receive into treasury account *
                  <select
                    className={INPUT}
                    value={treasuryAccountId}
                    onChange={(e) => setTreasuryAccountId(e.target.value)}
                    required
                  >
                    <option value="">Select account…</option>
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {treasuryAccountDisplayName(a)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="block text-ui-xs font-bold uppercase text-slate-500">
                Reference (optional)
                <input className={INPUT} value={reference} onChange={(e) => setReference(e.target.value)} />
              </label>
              <label className="block text-ui-xs font-bold uppercase text-slate-500">
                Note (optional)
                <input className={INPUT} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setDisposeOpen(false)} className="text-ui-xs font-semibold uppercase text-slate-600">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || (needsTreasury && !treasuryAccountId)}
                  onClick={handleConfirmDispose}
                  className="rounded-lg bg-amber-800 text-white px-3 py-1 text-ui-xs font-semibold uppercase disabled:opacity-50"
                >
                  {busy ? 'Saving…' : needsTreasury ? 'Confirm sale' : 'Confirm disposal'}
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-3 mt-2 border-t border-slate-100">
            {canManage && asset.status === 'active' && onDispose && !disposeOpen ? (
              <button
                type="button"
                onClick={() => setDisposeOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-ui-xs font-semibold uppercase text-amber-950 hover:bg-amber-100"
              >
                <Trash2 size={12} /> Sell / dispose
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-lg bg-zarewa-teal text-white px-3 py-1.5 text-ui-xs font-semibold uppercase tracking-wider"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
