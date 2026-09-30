import React from 'react';
import { DecisionBand, DecisionWhatNext } from './DecisionSurface';
import { ManagerPoAuditSections } from './ManagerPoAuditSections';

/**
 * Floor-tab purchase order review — context here; approve/reject on Procurement.
 */
export function PurchaseOrderApprovalPreview({
  row = null,
  poId = '',
  formatNgn,
  auditData = null,
  loadingAudit = false,
}) {
  const r = row && typeof row === 'object' ? row : {};
  const id = poId || r.po_id || r.poID || '—';
  const supplier = r.supplier_name || r.vendor_name || r.supplierName;
  const total = r.amount_ngn ?? r.total_ngn ?? r.totalNgn;
  const status = r.status || auditData?.purchaseOrder?.status;

  return (
    <div className="animate-in fade-in space-y-3 duration-200 text-slate-700">
      <DecisionBand
        tone="po"
        eyebrow="Purchase order"
        title={id}
        subtitle={supplier || r.description || null}
        aside={
          total != null ? (
            <>
              <p className="text-ui-xs font-bold uppercase text-slate-400">Total</p>
              <p className="text-xl font-black tabular-nums text-slate-900">{formatNgn(total)}</p>
              {status ? <p className="mt-0.5 text-ui-xs uppercase tracking-wide text-slate-500">{status}</p> : null}
            </>
          ) : null
        }
      />

      <DecisionWhatNext title="Next step">
        Approve, reject, or amend this order on the Procurement desk so buyers and store stay on one record. Opening
        Procurement focuses this PO.
      </DecisionWhatNext>

      <ManagerPoAuditSections auditData={auditData} loadingAudit={loadingAudit} formatNgn={formatNgn} appearance="light" />
    </div>
  );
}
