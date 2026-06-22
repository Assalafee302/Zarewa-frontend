import React from 'react';
import { Banknote, RotateCcw, Truck, Wallet } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { ExpenseCategoryLaneBadge } from '../office/ExpenseCategoryLaneBadge.jsx';
import { isFinanceExceptionExpenseItem } from '../../shared/expenseCategoryPolicy.js';
import {
  FinanceDeskColoredQueuePanel,
  FinanceDeskColoredQueueRow,
} from './FinanceDeskColoredQueuePanel';
import {
  paymentRequestOutstandingNgn,
  poTransportPayoutMetaLine,
  refundOutstandingAmount,
  refundPayoutMetaLine,
  paymentRequestPayoutMetaLine,
  registerSettlementOutstandingNgn,
  registerSettlementPayoutMetaLine,
} from '../../lib/financeTreasuryPayoutQueueMeta';

function PaymentRequestCategoryExtra({ req }) {
  if (!req?.expenseCategory && !req?.expenseCategoryLane) return null;
  const isException = isFinanceExceptionExpenseItem(req.expenseCategory, req.expenseCategoryLane);
  return (
    <div className="flex flex-wrap items-center gap-1 mt-0.5">
      <ExpenseCategoryLaneBadge category={req.expenseCategory} laneKey={req.expenseCategoryLane} />
      {req.expenseCategory ? (
        <span className="text-[8px] font-semibold text-slate-600">{req.expenseCategory}</span>
      ) : null}
      {isException ? (
        <span className="text-[8px] font-black uppercase tracking-wide text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
          Review
        </span>
      ) : null}
    </div>
  );
}

function RefundPayeeExtra({ refund }) {
  if (!refund?.payeeAccountNo) return null;
  const payeeTitle = [refund.payeeName, refund.payeeBankName, refund.payeeAccountNo].filter(Boolean).join(' · ');
  return (
    <p className="text-[8px] font-semibold text-sky-900/90 mt-0.5 truncate" title={payeeTitle || undefined}>
      Pay to: <span className="font-mono tabular-nums">{refund.payeeAccountNo}</span>
      {refund.payeeName || refund.payeeBankName ? (
        <span className="font-sans text-sky-900/85">
          {' '}
          ({[refund.payeeName, refund.payeeBankName].filter(Boolean).join(' · ')})
        </span>
      ) : null}
    </p>
  );
}

/**
 * Shared treasury payout queues — Desk and Treasury tab use the same panels and row layout.
 * @param {{
 *   refunds?: object[];
 *   paymentRequests?: object[];
 *   registerSettlements?: object[];
 *   poTransport?: object[];
 *   branchNameById?: Record<string, string>;
 *   expensePanelDescription?: string;
 *   poTransportPanelAction?: React.ReactNode;
 *   sectionIdPrefix?: string;
 *   renderRefundActions: (refund: object) => React.ReactNode;
 *   renderPaymentRequestActions: (request: object) => React.ReactNode;
 *   renderRegisterSettlementActions: (settlement: object) => React.ReactNode;
 *   renderPoTransportActions: (row: object) => React.ReactNode;
 * }} props
 */
export function FinanceTreasuryAwaitingPayoutQueues({
  refunds = [],
  paymentRequests = [],
  registerSettlements = [],
  poTransport = [],
  branchNameById = {},
  expensePanelDescription = 'Approve elsewhere, then record bank or cash payout here.',
  poTransportPanelAction = null,
  sectionIdPrefix = '',
  renderRefundActions,
  renderPaymentRequestActions,
  renderRegisterSettlementActions,
  renderPoTransportActions,
}) {
  const id = (suffix) => (sectionIdPrefix ? `${sectionIdPrefix}-${suffix}` : undefined);

  return (
    <>
      {refunds.length > 0 ? (
        <FinanceDeskColoredQueuePanel
          sectionId={id('refunds')}
          theme="rose"
          title="Customer refunds — approved, awaiting payout"
          icon={<RotateCcw size={16} strokeWidth={2} />}
          count={refunds.length}
          description="Sales submits refund requests with a breakdown; managers approve. Record bank/cash payment once funds leave the business."
          testId="finance-refunds-awaiting-payout"
        >
          <ul className="space-y-1.5">
            {refunds.map((r) => (
              <FinanceDeskColoredQueueRow
                key={r.refundID}
                theme="rose"
                testId={`finance-refund-awaiting-row-${r.refundID}`}
                title={
                  <>
                    <span className="font-mono">{r.refundID}</span>
                    <span className="font-medium text-slate-600"> · {r.customer}</span>
                  </>
                }
                meta={refundPayoutMetaLine(r, branchNameById)}
                extra={<RefundPayeeExtra refund={r} />}
                amount={formatNgn(refundOutstandingAmount(r))}
                actions={renderRefundActions(r)}
              />
            ))}
          </ul>
        </FinanceDeskColoredQueuePanel>
      ) : null}

      {paymentRequests.length > 0 ? (
        <FinanceDeskColoredQueuePanel
          sectionId={id('expenses')}
          theme="teal"
          title="Expense payment requests — approved, awaiting payout"
          icon={<Banknote size={16} strokeWidth={2} />}
          count={paymentRequests.length}
          description={expensePanelDescription}
          testId="finance-payment-requests-awaiting-payout"
        >
          <ul className="space-y-1.5">
            {paymentRequests.map((req) => (
              <FinanceDeskColoredQueueRow
                key={req.requestID}
                theme="teal"
                testId={`finance-preq-awaiting-row-${req.requestID}`}
                title={
                  <>
                    <span className="font-mono">{req.requestID}</span>
                    <span className="font-medium text-slate-600">
                      {' '}
                      · {req.description || req.expenseCategory || '—'}
                    </span>
                  </>
                }
                meta={paymentRequestPayoutMetaLine(req, branchNameById)}
                extra={<PaymentRequestCategoryExtra req={req} />}
                amount={formatNgn(paymentRequestOutstandingNgn(req))}
                actions={renderPaymentRequestActions(req)}
              />
            ))}
          </ul>
        </FinanceDeskColoredQueuePanel>
      ) : null}

      {registerSettlements.length > 0 ? (
        <FinanceDeskColoredQueuePanel
          sectionId={id('withdrawals')}
          theme="teal"
          title="Register withdrawals — approved, awaiting payout"
          icon={<Wallet size={16} strokeWidth={2} />}
          count={registerSettlements.length}
          description="Accounting requests a debtor-register withdrawal; MD/finance approves. Record bank or cash payout here."
          testId="finance-register-withdrawals-awaiting-payout"
        >
          <ul className="space-y-1.5">
            {registerSettlements.map((s) => (
              <FinanceDeskColoredQueueRow
                key={s.settlementId}
                theme="teal"
                testId={`finance-register-withdrawal-awaiting-row-${s.settlementId}`}
                title={
                  <>
                    <span className="font-mono">{s.settlementId}</span>
                    <span className="font-medium text-slate-600"> · {s.partyName || 'Withdrawal'}</span>
                  </>
                }
                meta={registerSettlementPayoutMetaLine(s, branchNameById)}
                amount={formatNgn(registerSettlementOutstandingNgn(s))}
                actions={renderRegisterSettlementActions(s)}
              />
            ))}
          </ul>
        </FinanceDeskColoredQueuePanel>
      ) : null}

      {poTransport.length > 0 ? (
        <FinanceDeskColoredQueuePanel
          sectionId={id('haulage')}
          theme="sky"
          title="PO transport / haulage — awaiting treasury"
          icon={<Truck size={16} strokeWidth={2} />}
          count={poTransport.length}
          description="Procurement links the transporter and quoted fee on the PO. Record payout so balances and in-transit status stay aligned."
          testId="finance-po-transport-awaiting-payout"
          action={poTransportPanelAction}
        >
          <ul className="space-y-1.5">
            {poTransport.map((row) => (
              <FinanceDeskColoredQueueRow
                key={row.poID}
                theme="sky"
                testId={`finance-po-transport-awaiting-row-${row.poID}`}
                title={
                  <>
                    <span className="font-mono">{row.poID}</span>
                    <span className="font-medium text-slate-600">
                      {' '}
                      · {row.transportAgentName || 'Transporter'}
                    </span>
                  </>
                }
                meta={poTransportPayoutMetaLine(row, branchNameById)}
                amount={formatNgn(row.outstandingNgn)}
                actions={renderPoTransportActions(row)}
              />
            ))}
          </ul>
        </FinanceDeskColoredQueuePanel>
      ) : null}
    </>
  );
}
