import React, { useRef, useState } from 'react';
import { Loader2, Save, ShieldCheck, X } from 'lucide-react';
import { ModalFrame } from '../../layout';
import { StockRegisterProcurementCosting } from '../StockRegisterProcurementCosting';
import { postStockRegisterWorkflow } from './stockRegisterApi';

/**
 * Procurement costing entry — saves pricing and notes MD approval is required next.
 */
export function StockRegisterProcurementModal({
  open,
  onClose,
  periodKey,
  periodEnd,
  procurementSummary,
  initialPricing,
  workflow,
  showToast,
  onSaved,
}) {
  const [pricing, setPricing] = useState(initialPricing || null);
  const pricingRef = useRef(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      setPricing(initialPricing || null);
      pricingRef.current = initialPricing || null;
    }
  }, [open, initialPricing]);

  const submit = async () => {
    const p = pricingRef.current ?? pricing;
    if (!p) {
      showToast?.('Enter procurement unit prices.', { variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const { ok, data } = await postStockRegisterWorkflow({
        action: 'procurement_cost',
        periodKey,
        pricing: p,
      });
      if (!ok || !data?.ok) {
        showToast?.(data?.error || 'Could not save costing.', { variant: 'error' });
        return;
      }
      showToast?.('Costing saved — awaiting MD approval.');
      onSaved?.(data);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const status = workflow?.status || 'draft';
  const disabled = status !== 'bm_approved';

  return (
    <ModalFrame isOpen={open} onClose={onClose} showCloseButton={false} surface="plain" title="Procurement costing">
      <div className="z-modal-panel-lg flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Closing valuation</p>
            <h2 className="text-lg font-bold text-[#134e4a]">Procurement costing</h2>
            <p className="text-sm text-slate-600 mt-0.5">Period ending {periodEnd}</p>
          </div>
          <button type="button" onClick={onClose} className="z-btn-secondary p-2" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4 sm:px-5 space-y-3">
          <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3 text-xs text-teal-950 leading-relaxed flex gap-2">
            <ShieldCheck size={16} className="shrink-0 mt-0.5 text-teal-800" />
            <p>
              After you save costing, the <strong>Managing Director</strong> must approve before procurement can{' '}
              <strong>capture closing stock</strong> for next month&apos;s opening balances.
            </p>
          </div>

          <StockRegisterProcurementCosting
            procurementSummary={procurementSummary}
            initialPricing={initialPricing}
            onChange={(p) => {
              pricingRef.current = p;
              setPricing(p);
            }}
          />

          {disabled ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Branch manager must approve the register before procurement costing.
            </p>
          ) : null}
        </div>

        <footer className="shrink-0 flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
          <button type="button" className="z-btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="z-btn-primary inline-flex items-center gap-2" onClick={submit} disabled={disabled || saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save costing
          </button>
        </footer>
      </div>
    </ModalFrame>
  );
}
