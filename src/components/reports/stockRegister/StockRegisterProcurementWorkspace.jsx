import React, { useRef, useState } from 'react';
import { Loader2, Lock, Save, ShieldCheck } from 'lucide-react';
import { isCaptureReadyStatus } from '../../../lib/stockRegisterPeriod';
import {
  getProcurementPricingGaps,
  StockRegisterProcurementCosting,
} from '../StockRegisterProcurementCosting';
import { postStockRegisterWorkflow } from './stockRegisterApi';

/** Inline procurement costing + capture CTA for the month-end desk. */
export function StockRegisterProcurementWorkspace({
  periodKey,
  procurementSummary,
  accessoryBalance = 0,
  initialPricing,
  workflow,
  showToast,
  onSaved,
  onCapture,
}) {
  const [pricing, setPricing] = useState(initialPricing || null);
  const pricingRef = useRef(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setPricing(initialPricing || null);
    pricingRef.current = initialPricing || null;
  }, [initialPricing, periodKey]);

  const status = workflow?.status || 'draft';
  const canEdit = status === 'bm_approved';
  const viewAfterCosted = ['procurement_costed', 'md_approved', 'locked'].includes(status);
  const readOnly = !canEdit && viewAfterCosted;
  const gaps = canEdit
    ? getProcurementPricingGaps(procurementSummary, pricing, accessoryBalance)
    : [];
  const canSave = canEdit && gaps.length === 0 && Boolean(pricing);
  const canCapture = isCaptureReadyStatus(status);

  const submit = async () => {
    const p = pricingRef.current ?? pricing;
    if (!p) {
      showToast?.('Enter procurement unit prices.', { variant: 'error' });
      return;
    }
    const missing = getProcurementPricingGaps(procurementSummary, p, accessoryBalance);
    if (missing.length) {
      showToast?.(`Price required: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`, {
        variant: 'error',
      });
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
      showToast?.('Costing saved — next: Capture & lock.');
      onSaved?.(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-bold text-zarewa-teal">
          {readOnly ? 'Costing (saved)' : 'Enter closing costs'}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">Net kg × purchase cost → closing value</p>

        {canCapture ? (
          <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/70 p-3 text-xs text-teal-950">
            <p className="font-bold">Next: Capture &amp; lock</p>
            <p className="mt-0.5">Costing is saved — freeze opening balances for next month.</p>
          </div>
        ) : canEdit ? (
          <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/50 p-3 text-xs text-teal-950 flex gap-2">
            <ShieldCheck size={16} className="shrink-0 mt-0.5 text-teal-800" />
            <p>Enter ₦ prices for every line with quantity, then save. Capture follows immediately after.</p>
          </div>
        ) : !viewAfterCosted ? (
          <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
            Branch manager must approve the register before procurement costing.
          </p>
        ) : null}
      </div>

      {(canEdit || viewAfterCosted) && (
        <StockRegisterProcurementCosting
          procurementSummary={procurementSummary}
          initialPricing={initialPricing}
          accessoryBalance={accessoryBalance}
          readOnly={readOnly}
          onChange={(p) => {
            pricingRef.current = p;
            setPricing(p);
          }}
        />
      )}

      {canEdit && gaps.length > 0 ? (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2">
          Enter ₦ prices for every line with quantity: {gaps.slice(0, 4).join(', ')}
          {gaps.length > 4 ? ` (+${gaps.length - 4} more)` : ''}.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canEdit ? (
          <button
            type="button"
            className="z-btn-primary inline-flex items-center gap-2"
            onClick={submit}
            disabled={!canSave || saving}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save costing
          </button>
        ) : null}
        {canCapture ? (
          <button type="button" className="z-btn-primary inline-flex items-center gap-2" onClick={() => onCapture?.()}>
            <Lock size={14} />
            Capture &amp; lock
          </button>
        ) : null}
      </div>
    </div>
  );
}
