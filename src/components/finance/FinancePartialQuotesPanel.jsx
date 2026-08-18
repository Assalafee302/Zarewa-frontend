import React, { useMemo } from 'react';
import { formatNgn } from '../../Data/mockData';
import {
  quotationDisplayPaymentStatus,
  quotationEffectivePaidNgn,
} from '../../lib/quotationPaymentSummary.js';
import { quotationColourGaugeLabel } from '../../lib/quotationColourGauge.js';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';
import { useAccountPage } from '../../pages/account/AccountPageContext.jsx';

const SKIP_STATUSES = new Set(['cancelled', 'rejected', 'void']);

/**
 * Quotations with a remaining balance so cashiers can see who still needs to pay.
 */
export function FinancePartialQuotesPanel() {
  const { liveQuotations, liveReceipts, liveLedgerEntries } = useAccountPage();
  const payOpts = useMemo(
    () => ({ salesReceipts: liveReceipts, ledgerEntries: liveLedgerEntries }),
    [liveReceipts, liveLedgerEntries]
  );

  const rows = useMemo(() => {
    return (liveQuotations || [])
      .filter((q) => {
        const status = String(q?.status || '').trim().toLowerCase();
        if (SKIP_STATUSES.has(status)) return false;
        return quotationDisplayPaymentStatus(q, payOpts) === 'Partial';
      })
      .map((q) => {
        const paid = quotationEffectivePaidNgn(q, payOpts);
        const total = Math.round(Number(q?.totalNgn ?? q?.total_ngn) || 0);
        return {
          id: String(q.id || q.quotationID || ''),
          date: String(q.dateISO || q.date || '').slice(0, 10),
          customer: q.customer || q.customerName || q.customerID || '—',
          spec: quotationColourGaugeLabel(q) || '—',
          paid,
          total,
          balance: Math.max(0, total - paid),
        };
      })
      .sort((a, b) => b.balance - a.balance);
  }, [liveQuotations, payOpts]);

  if (rows.length === 0) return null;

  return (
    <section className="space-y-2" data-testid="finance-partial-quotes">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-900">
          Quotations still to balance
        </h3>
        <p className="text-ui-xs text-slate-600 mt-0.5">
          Partial payments — remaining balance the customer still needs to settle.
        </p>
      </div>
      <AppTableWrap>
        <AppTable role="numeric">
          <AppTableThead>
            <AppTableTh>Date</AppTableTh>
            <AppTableTh>Quote</AppTableTh>
            <AppTableTh>Customer</AppTableTh>
            <AppTableTh>Colour / gauge</AppTableTh>
            <AppTableTh align="right">Paid</AppTableTh>
            <AppTableTh align="right">Total</AppTableTh>
            <AppTableTh align="right">Balance</AppTableTh>
          </AppTableThead>
          <AppTableBody>
            {rows.map((row) => (
              <AppTableTr key={row.id}>
                <AppTableTd>{row.date || '—'}</AppTableTd>
                <AppTableTd monospace title={row.id}>
                  {row.id}
                </AppTableTd>
                <AppTableTd title={row.customer}>{row.customer}</AppTableTd>
                <AppTableTd title={row.spec}>{row.spec}</AppTableTd>
                <AppTableTd align="right">{formatNgn(row.paid)}</AppTableTd>
                <AppTableTd align="right">{formatNgn(row.total)}</AppTableTd>
                <AppTableTd align="right" className="font-semibold text-amber-900">
                  {formatNgn(row.balance)}
                </AppTableTd>
              </AppTableTr>
            ))}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
    </section>
  );
}
