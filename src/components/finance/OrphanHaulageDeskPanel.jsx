import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { FinanceDeskColoredQueuePanel, FinanceDeskColoredQueueRow } from './FinanceDeskColoredQueuePanel';

/**
 * Finance desk summary for haulage treasury lines not linked to PO transport.
 */
export function OrphanHaulageDeskPanel({ orphanRows = [], canAccessProcurement = false }) {
  if (!orphanRows.length) return null;
  return (
    <FinanceDeskColoredQueuePanel
      theme="rose"
      title="Orphan haulage — not linked to PO transport"
      icon={<AlertTriangle size={16} strokeWidth={2} />}
      count={orphanRows.length}
      description="These treasury outflows look like haulage but are outside the PO transport payment flow. Reconcile in Procurement transport catch-up or confirm as general expense."
      testId="finance-orphan-haulage-panel"
      action={
        canAccessProcurement ? (
          <Link
            to="/procurement"
            state={{ focusTab: 'transport' }}
            className="text-[10px] font-bold uppercase text-rose-900 underline-offset-2 hover:underline"
          >
            Transport catch-up
          </Link>
        ) : null
      }
    >
      <ul className="space-y-1.5">
        {orphanRows.slice(0, 8).map((row) => (
          <FinanceDeskColoredQueueRow
            key={row.movementId}
            theme="rose"
            title={
              <>
                <span className="font-mono">{row.movementId}</span>
                <span className="font-medium text-slate-600">
                  {' '}
                  · {row.counterpartyName || row.type || 'Haulage'}
                </span>
              </>
            }
            meta={`${String(row.postedAtISO || '').slice(0, 10)} · ${row.reason}`}
            amount={formatNgn(row.amountNgn)}
            actions={
              <Link
                to="/accounts"
                state={{ accountsTab: 'movements' }}
                className="text-[9px] font-bold uppercase text-rose-900 hover:underline"
              >
                View
              </Link>
            }
          />
        ))}
      </ul>
      {orphanRows.length > 8 ? (
        <p className="text-[9px] text-rose-900/70 mt-2 px-1">
          +{orphanRows.length - 8} more in Procurement → Transport catch-up
        </p>
      ) : null}
    </FinanceDeskColoredQueuePanel>
  );
}
