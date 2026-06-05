import React, { useMemo, useState } from 'react';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import { isReceiptCleared, isReceiptPendingClearance } from '../../lib/receiptClearance';
import { approvedRefundsAwaitingPayment } from '../../lib/refundsStore';
import { effectiveOutstandingNgn } from '../../lib/paymentOutstandingTolerance';
import { FinanceReportPanel } from './FinanceReportPanel';
import { FinanceDataTable } from './FinanceDataTable';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * @param {{ receipts: object[]; paymentRequests: object[]; refunds: object[]; trialData?: object | null }} props
 */
export function CashierDeskReports({ receipts, paymentRequests, refunds, trialData }) {
  const [loaded, setLoaded] = useState(false);
  const [period, setPeriod] = useState(todayIso().slice(0, 7));

  const receiptRows = useMemo(() => {
    if (!loaded) return [];
    return receipts
      .filter((r) => String(r.dateISO || '').slice(0, 7) === period || period === 'ALL')
      .map((r) => ({
        _key: r.id,
        id: r.id,
        status: isReceiptPendingClearance(r) ? 'Pending confirmation' : isReceiptCleared(r) ? 'Confirmed' : 'Other',
        amount: formatNgn(r.amountNgn),
        customer: r.customer || r.customerID || '—',
        quote: r.quotationRef || r.quotationID || '—',
      }));
  }, [loaded, receipts, period]);

  const payoutRows = useMemo(() => {
    if (!loaded) return [];
    const pays = paymentRequests.filter((pr) => {
      const st = String(pr.approvalStatus || '').trim();
      if (st !== 'Approved') return false;
      const req = Math.round(Number(pr.amountRequestedNgn) || 0);
      const paid = Math.round(Number(pr.paidAmountNgn) || 0);
      return effectiveOutstandingNgn(req, paid) > 0;
    });
    const refs = approvedRefundsAwaitingPayment(refunds);
    return [
      ...pays.map((pr) => ({
        _key: pr.requestID,
        type: 'Payment',
        ref: pr.requestID,
        amount: formatNgn(pr.amountRequestedNgn),
        status: 'Approved — to pay',
      })),
      ...refs.map((r) => ({
        _key: r.refundID,
        type: 'Refund',
        ref: r.refundID,
        amount: formatNgn(r.approvedAmountNgn ?? r.amountNgn),
        status: 'Approved payout',
      })),
    ];
  }, [loaded, paymentRequests, refunds]);

  const activitySummary = useMemo(() => {
    if (!loaded) return null;
    const today = todayIso();
    const confirmedToday = receipts.filter(
      (r) => isReceiptCleared(r) && String(r.dateISO || '').slice(0, 10) === today
    ).length;
    const pending = receipts.filter((r) => isReceiptPendingClearance(r)).length;
    return { confirmedToday, pending, treasuryUnsettled: trialData?.exceptions?.treasuryMovementWithoutFinanceSettlement ?? 0 };
  }, [loaded, receipts, trialData]);

  return (
    <div className="space-y-6">
      <FinanceReportPanel
        title="Receipt confirmation summary"
        description="Counts and lines for cashier confirmation — opens full workflow on Finance → Receipts."
        loading={false}
        onLoad={() => setLoaded(true)}
        onExport={() =>
          downloadFinanceCsv('receipt-confirmation', ['id', 'status', 'amount', 'customer', 'quote'], receiptRows)
        }
        exportDisabled={!receiptRows.length}
        filters={
          <label className="text-xs font-bold text-slate-600">
            Period (YYYY-MM)
            <input
              type="month"
              className="ml-2 rounded-lg border border-slate-200 px-2 py-1 text-sm"
              value={period === 'ALL' ? todayIso().slice(0, 7) : period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </label>
        }
        emptyTitle={loaded ? 'No receipts in period' : 'Load report to view'}
        emptyDescription="Click Load report after choosing period."
      >
        {loaded && receiptRows.length ? (
          <FinanceDataTable
            columns={[
              { key: 'id', label: 'Receipt' },
              { key: 'status', label: 'Status' },
              { key: 'amount', label: 'Amount', align: 'right' },
              { key: 'customer', label: 'Customer' },
              { key: 'quote', label: 'Quotation' },
            ]}
            rows={receiptRows.slice(0, 50)}
          />
        ) : null}
      </FinanceReportPanel>

      <FinanceReportPanel
        title="Daily cashier activity"
        description="Snapshot for the current day — not a statutory cashbook."
        onLoad={() => setLoaded(true)}
        emptyTitle={loaded ? undefined : 'Load report first'}
      >
        {loaded && activitySummary ? (
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm font-semibold text-slate-800">
            <li className="rounded-lg bg-slate-50 px-3 py-2">Confirmed today: {activitySummary.confirmedToday}</li>
            <li className="rounded-lg bg-amber-50 px-3 py-2">Pending confirmation: {activitySummary.pending}</li>
            <li className="rounded-lg bg-amber-50 px-3 py-2">
              Treasury not settled: {activitySummary.treasuryUnsettled}
            </li>
          </ul>
        ) : null}
      </FinanceReportPanel>

      <FinanceReportPanel
        title="Approved payout queue"
        description="Payments and refunds approved but not yet paid from treasury."
        onLoad={() => setLoaded(true)}
        onExport={() => downloadFinanceCsv('approved-payout-queue', ['type', 'ref', 'amount', 'status'], payoutRows)}
        exportDisabled={!payoutRows.length}
        emptyTitle={loaded && !payoutRows.length ? 'Queue empty' : undefined}
      >
        {loaded && payoutRows.length ? (
          <FinanceDataTable
            columns={[
              { key: 'type', label: 'Type' },
              { key: 'ref', label: 'Reference' },
              { key: 'amount', label: 'Amount', align: 'right' },
              { key: 'status', label: 'Status' },
            ]}
            rows={payoutRows}
          />
        ) : null}
      </FinanceReportPanel>
    </div>
  );
}
