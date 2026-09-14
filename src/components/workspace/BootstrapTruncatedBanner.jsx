import React from 'react';

const FRIENDLY = {
  customers: 'customers',
  quotations: 'quotations',
  receipts: 'receipts',
  cuttingLists: 'cutting lists',
  refunds: 'refunds',
  ledgerEntries: 'ledger rows',
  productionJobs: 'production jobs',
  coilLots: 'coil lots',
  deliveries: 'deliveries',
  expenses: 'expenses',
  paymentRequests: 'payment requests',
  purchaseOrders: 'purchase orders',
  movements: 'stock movements',
  treasuryMovements: 'treasury movements',
};

/**
 * Honest notice when the desk is showing a recent window, not the whole branch database.
 * @param {{ bootstrapMeta?: object | null; registerTotals?: Record<string, number>; className?: string }} props
 */
export function BootstrapTruncatedBanner({ bootstrapMeta, registerTotals = {}, className = '' }) {
  if (bootstrapMeta?.mode === 'shell') {
    return (
      <div
        className={`mb-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-950 ${className}`}
      >
        Fast start — desk registers load when you open Sales, Operations, Account, or Procurement.
      </div>
    );
  }

  const deferred = Array.isArray(bootstrapMeta?.deferredDeskArrays)
    ? bootstrapMeta.deferredDeskArrays.filter(Boolean)
    : [];
  if (deferred.length) {
    const sample = deferred
      .slice(0, 4)
      .map((k) => FRIENDLY[k] || k)
      .join(', ');
    return (
      <div
        className={`mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 ${className}`}
      >
        First load skipped full {sample}. Open the desk for those registers, then search or load more
        for older rows.
      </div>
    );
  }

  const truncated = bootstrapMeta?.truncated || {};
  const keys = Object.keys(truncated).filter((k) => truncated[k]);
  if (!keys.length) return null;

  const sample = keys.slice(0, 4).map((k) => {
    const label = FRIENDLY[k] || k;
    const total = Number(registerTotals[k]);
    return Number.isFinite(total) && total > 0 ? `${label} (${total.toLocaleString('en-NG')} on file)` : label;
  });

  return (
    <div
      className={`mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 ${className}`}
      role="status"
    >
      <p className="font-semibold">This desk shows the latest loaded records, not every row in the database.</p>
      <p className="mt-1">
        Recent window includes {sample.join(', ')}
        {keys.length > 4 ? ', …' : ''}. Type a reference to search the full branch register, or use Load
        older records — do not assume a missing row means it was never saved.
      </p>
    </div>
  );
}

export default BootstrapTruncatedBanner;
