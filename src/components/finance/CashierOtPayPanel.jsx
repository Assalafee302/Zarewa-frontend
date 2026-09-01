import React, { useCallback, useEffect, useState } from 'react';
import { Banknote, RefreshCw } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { useWorkspace } from '../../context/WorkspaceContext';
import { OT_STATUS } from '../../lib/otConstants';
import { listOtRequests } from '../../lib/otRequestsApi';
import {
  FinanceDeskColoredQueuePanel,
  FinanceDeskColoredQueueRow,
  FinanceDeskQueueActionButton,
} from './FinanceDeskColoredQueuePanel';
import { CashierOtPayModal } from './CashierOtPayModal';

/**
 * Cashier OT pay queue — same coloured payout list + modal pattern as refunds / expenses.
 * @param {{ onPaid?: () => void; embedded?: boolean }} props
 */
export function CashierOtPayPanel({ onPaid, embedded = false }) {
  const ws = useWorkspace();
  const canPay = Boolean(ws?.hasPermission?.('ot.pay') || ws?.hasPermission?.('*'));

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payId, setPayId] = useState('');

  const load = useCallback(async () => {
    if (!canPay) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const res = await listOtRequests({
      status: OT_STATUS.APPROVED,
      limit: 80,
    }).catch(() => ({ ok: false }));
    setLoading(false);
    if (!res.ok || res.data?.ok === false) {
      setRows([]);
      setError(res.data?.error || 'Could not load OT pay queue.');
      return;
    }
    const list = Array.isArray(res.data?.rows) ? res.data.rows : [];
    setRows(list.filter((r) => String(r.status) === OT_STATUS.APPROVED));
  }, [canPay]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canPay) return null;
  if (embedded && !loading && !error && rows.length === 0) return null;

  const body = (
    <>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-ui-xs text-amber-950">
          {error}
        </p>
      ) : null}
      {loading ? <p className="py-4 text-center text-xs text-slate-500">Loading OT pay queue…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">No approved OT pay requests waiting.</p>
      ) : null}
      {!loading && rows.length ? (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <FinanceDeskColoredQueueRow
              key={row.id}
              theme="violet"
              testId={`finance-ot-awaiting-row-${row.id}`}
              title={
                <>
                  <span className="font-mono">{row.id}</span>
                  <span className="font-medium text-slate-600">
                    {' '}
                    · {row.dayIso} · {row.workType}
                  </span>
                </>
              }
              meta={[
                row.createdByName ? `Requested by ${row.createdByName}` : null,
                row.approvedByName ? `Approved by ${row.approvedByName}` : null,
                row.quotationRef || row.poId || null,
                row.reason ? String(row.reason).slice(0, 80) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              amount={formatNgn(row.totalPayableNgn)}
              actions={
                <FinanceDeskQueueActionButton tone="teal" onClick={() => setPayId(row.id)}>
                  Pay
                </FinanceDeskQueueActionButton>
              }
            />
          ))}
        </ul>
      ) : null}
    </>
  );

  return (
    <>
      <FinanceDeskColoredQueuePanel
        sectionId="desk-queue-ot-pay"
        theme="violet"
        title={embedded ? 'Overtime' : 'Overtime pay — approved, awaiting payout'}
        icon={<Banknote size={16} strokeWidth={2} />}
        count={rows.length}
        description={
          embedded
            ? undefined
            : 'Branch manager locks the payable at approval. Post bank/cash payout here the same way as refunds and expenses.'
        }
        testId="cashier-ot-pay-panel"
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1 text-ui-xs font-bold uppercase text-violet-900 hover:underline"
          >
            <RefreshCw size={12} aria-hidden /> Refresh
          </button>
        }
      >
        {body}
      </FinanceDeskColoredQueuePanel>

      <CashierOtPayModal
        open={Boolean(payId)}
        requestId={payId}
        onClose={() => setPayId('')}
        onPaid={async () => {
          setPayId('');
          await load();
          onPaid?.();
        }}
      />
    </>
  );
}

export default CashierOtPayPanel;
