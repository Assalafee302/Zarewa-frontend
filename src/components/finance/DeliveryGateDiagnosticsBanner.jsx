import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

const MODE_META = {
  off: {
    label: 'Off',
    cls: 'border-slate-200 bg-slate-50 text-slate-700',
    detail: 'Deliveries are not blocked by payment status. Recommended production setting: enforce.',
  },
  warn: {
    label: 'Warn',
    cls: 'border-amber-200 bg-amber-50 text-amber-950',
    detail: 'Unpaid deliveries show warnings but are not blocked.',
  },
  enforce: {
    label: 'Enforce',
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    detail: 'Deliveries require payment, approved credit, or MD override.',
  },
};

/**
 * Shows current DELIVERY_PAYMENT_GATE mode from health/capabilities payload.
 * @param {{ deliveryPaymentGate?: string }} props
 */
export default function DeliveryGateDiagnosticsBanner({ deliveryPaymentGate = 'off', compact = false }) {
  const mode = String(deliveryPaymentGate || 'off').trim().toLowerCase();
  const meta = MODE_META[mode] || MODE_META.off;
  const Icon = mode === 'enforce' ? ShieldCheck : AlertTriangle;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${meta.cls}`}
        title={meta.detail}
      >
        <Icon size={11} aria-hidden />
        Delivery gate: {meta.label}
      </span>
    );
  }

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${meta.cls}`}>
      <p className="flex items-center gap-2 font-bold">
        <Icon size={16} aria-hidden />
        Delivery payment gate — <span className="uppercase tracking-wide">{meta.label}</span>
      </p>
      <p className="mt-1 text-xs opacity-90">{meta.detail}</p>
      {mode !== 'enforce' ? (
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide opacity-80">
          Production recommendation: set DELIVERY_PAYMENT_GATE=enforce
        </p>
      ) : null}
    </div>
  );
}
