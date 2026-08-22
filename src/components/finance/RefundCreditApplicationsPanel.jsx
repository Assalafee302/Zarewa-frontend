/**
 * Finance desk: refund fund already applied onto a receipt/quote — reverse mistaken applies.
 */
import React from 'react';
import { RotateCcw } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { refundCreditApplicationIsActive } from '../../lib/refundFundApply.js';
import {
  FinanceDeskColoredQueuePanel,
  FinanceDeskColoredQueueRow,
  FinanceDeskQueueActionButton,
} from './FinanceDeskColoredQueuePanel';

export function RefundCreditApplicationsPanel({
  applications = [],
  canReverse = false,
  onReverse,
}) {
  const active = (Array.isArray(applications) ? applications : []).filter(refundCreditApplicationIsActive);
  if (!active.length) return null;

  return (
    <FinanceDeskColoredQueuePanel
      theme="amber"
      icon={<RotateCcw size={14} aria-hidden />}
      title="Refund fund on receipts"
      count={active.length}
      description="Applied to another quotation. Reverse puts the amount back on the refund."
    >
      <ul className="space-y-1.5">
        {active.slice(0, 20).map((a) => {
          const id = String(a.applicationId || a.application_id || '');
          const target = a.targetQuotationRef || a.target_quotation_ref || '—';
          const refundId = a.refundId || a.refund_id;
          const source = a.sourceQuotationRef || a.source_quotation_ref;
          return (
            <FinanceDeskColoredQueueRow
              key={id}
              theme="amber"
              title={target}
              amount={formatNgn(a.amountNgn ?? a.amount_ngn)}
              meta={
                refundId
                  ? `${refundId}${source ? ` · from ${source}` : ''}`
                  : source || 'Overpayment pool'
              }
              actions={
                canReverse && onReverse ? (
                  <FinanceDeskQueueActionButton tone="rose" onClick={() => onReverse(id)}>
                    Reverse
                  </FinanceDeskQueueActionButton>
                ) : null
              }
            />
          );
        })}
      </ul>
    </FinanceDeskColoredQueuePanel>
  );
}
