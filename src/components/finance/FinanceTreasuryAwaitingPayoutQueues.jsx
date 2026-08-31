import React, { useMemo } from 'react';
import { Banknote, RotateCcw, Truck, Wallet } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ExpenseCategoryLaneBadge } from '../office/ExpenseCategoryLaneBadge.jsx';
import { isFinanceExceptionExpenseItem } from '../../shared/expenseCategoryPolicy.js';
import {
  FinanceDeskColoredQueuePanel,
  FinanceDeskColoredQueueRow,
  FinanceDeskQueueStatusDot,
} from './FinanceDeskColoredQueuePanel';
import {
  refundPayeePayoutCaution,
  flattenRefundDeskQueue,
  actorMayOverrideRefundUnclearedPayoutHold,
} from '../../lib/refundCashierDetail';
import {
  paymentRequestOutstandingNgn,
  poTransportPayoutMetaLine,
  refundPayeePayoutMetaLine,
  paymentRequestPayoutMetaLine,
  registerSettlementOutstandingNgn,
  registerSettlementPayoutMetaLine,
} from '../../lib/financeTreasuryPayoutQueueMeta';
import { maintenanceCostKindLabel } from '../../shared/lib/maintenanceCostEnvelope';

function PaymentRequestCategoryExtra({ req }) {
  if (!req?.expenseCategory && !req?.expenseCategoryLane) return null;
  const isException = isFinanceExceptionExpenseItem(req.expenseCategory, req.expenseCategoryLane);
  return (
    <div className="flex flex-wrap items-center gap-1 mt-0.5">
      <ExpenseCategoryLaneBadge category={req.expenseCategory} laneKey={req.expenseCategoryLane} />
      {req.expenseCategory ? (
        <span className="text-ui-xs font-semibold text-slate-600">{req.expenseCategory}</span>
      ) : null}
      {isException ? (
        <span className="text-ui-xs font-black uppercase tracking-wide text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
          Review
        </span>
      ) : null}
    </div>
  );
}

function PayeeAccountExtra({ payeeName, payeeBankName, payeeAccountNo }) {
  if (!payeeAccountNo && !payeeName && !payeeBankName) return null;
  const payeeTitle = [payeeName, payeeBankName, payeeAccountNo].filter(Boolean).join(' · ');
  return (
    <p className="text-ui-xs font-semibold text-sky-900/90 mt-0.5 truncate" title={payeeTitle || undefined}>
      Pay to:{' '}
      {payeeAccountNo ? (
        <span className="font-mono tabular-nums">{payeeAccountNo}</span>
      ) : (
        <span className="font-sans">—</span>
      )}
      {payeeName || payeeBankName ? (
        <span className="font-sans text-sky-900/85">
          {' '}
          ({[payeeName, payeeBankName].filter(Boolean).join(' · ')})
        </span>
      ) : null}
    </p>
  );
}

function RefundPayeeExtra({ payeeLine }) {
  return (
    <PayeeAccountExtra
      payeeName={payeeLine?.payeeName}
      payeeBankName={payeeLine?.payeeBankName}
      payeeAccountNo={payeeLine?.payeeAccountNo}
    />
  );
}

function PaymentRequestPayeeExtra({ req }) {
  return (
    <PayeeAccountExtra
      payeeName={req?.payeeName}
      payeeBankName={req?.payeeBankName}
      payeeAccountNo={req?.payeeAccountNo}
    />
  );
}

function PaymentRequestQueueExtra({ req }) {
  return (
    <div className="space-y-0.5">
      <PaymentRequestCategoryExtra req={req} />
      {req?.maintenanceWorkOrderId || String(req?.requestReference || '').startsWith('MWO') ? (
        <p className="text-ui-xs font-semibold text-teal-900">
          Work order {req.maintenanceWorkOrderId || req.requestReference}
          {req.maintenanceCostKind ? ` · ${maintenanceCostKindLabel(req.maintenanceCostKind)}` : ''}
        </p>
      ) : null}
      <PaymentRequestPayeeExtra req={req} />
    </div>
  );
}

function PayoutTypeGroup({
  sectionId,
  theme,
  title,
  icon,
  count,
  testId,
  action,
  children,
}) {
  if (!count) return null;
  return (
    <FinanceDeskColoredQueuePanel
      sectionId={sectionId}
      theme={theme}
      title={title}
      icon={icon}
      count={count}
      testId={testId}
      action={action}
    >
      {children}
    </FinanceDeskColoredQueuePanel>
  );
}

/**
 * Shared treasury payout queues — Desk and Treasury tab use the same panels and row layout.
 * Combined into one pay-expenses container; each type keeps its colour.
 */
export function FinanceTreasuryAwaitingPayoutQueues({
  refunds = [],
  paymentRequests = [],
  registerSettlements = [],
  poTransport = [],
  branchNameById = {},
  poTransportPanelAction = null,
  sectionIdPrefix = '',
  renderRefundActions,
  renderPaymentRequestActions,
  renderRegisterSettlementActions,
  renderPoTransportActions,
  children,
  alwaysShow = false,
}) {
  const ws = useWorkspace();
  const overrideUnclearedHold = actorMayOverrideRefundUnclearedPayoutHold(
    ws?.session?.user,
    ws?.hasPermission
  );
  const id = (suffix) => (sectionIdPrefix ? `${sectionIdPrefix}-${suffix}` : undefined);
  const refundPayeeLines = useMemo(
    () => flattenRefundDeskQueue(refunds, { overrideUnclearedHold }),
    [refunds, overrideUnclearedHold]
  );
  const total =
    refundPayeeLines.length + paymentRequests.length + registerSettlements.length + poTransport.length;
  const hasChildren = Boolean(children);

  if (!alwaysShow && total === 0 && !hasChildren) return null;

  return (
    <section
      id={id('payouts') || 'desk-payout-queue'}
      className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-3 scroll-mt-20 sm:p-4"
      data-testid="finance-payouts-combined"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <h2 className="text-sm font-semibold text-slate-800">Pay out</h2>
        <span className="text-ui-xs font-bold tabular-nums text-slate-500">
          {total}
          {hasChildren ? '+' : ''} open
        </span>
      </div>

      {total === 0 && !hasChildren ? (
        <p className="py-6 text-center text-xs text-slate-500">No expenses waiting to pay.</p>
      ) : null}
      {total === 0 && hasChildren ? (
        <p className="text-ui-xs text-slate-500 px-0.5">
          Classic refund/expense rows are clear — check staff/partner refund payouts below when present.
        </p>
      ) : null}

      <div className="space-y-3">
          <PayoutTypeGroup
            sectionId={id('refunds')}
            theme="rose"
            title="Refunds"
            icon={<RotateCcw size={16} strokeWidth={2} />}
            count={refundPayeeLines.length}
            testId="finance-refunds-awaiting-payout"
          >
            <ul className="space-y-1.5">
              {refundPayeeLines.map((line) => {
                const r = line.parentRefund || {};
                const rowTestId = `finance-refund-awaiting-row-${line.refundID}-${line.queueKey}`;
                const caution = refundPayeePayoutCaution(r, line, {
                  siblingPayeeLines: refundPayeeLines,
                });
                const statusIndicator =
                  caution.level !== 'none' ? (
                    <FinanceDeskQueueStatusDot tone={caution.tone} title={caution.title} />
                  ) : null;
                return (
                <FinanceDeskColoredQueueRow
                  key={`${line.refundID}-${line.queueKey}`}
                  theme="rose"
                  testId={rowTestId}
                  statusIndicator={statusIndicator}
                  title={
                    <>
                      <span className="font-mono">{line.refundID}</span>
                      <span className="font-medium text-slate-600">
                        {' '}
                        · {line.recipientLabel}
                      </span>
                      <span className="text-ui-xs font-bold uppercase text-slate-400">
                        {' '}
                        · {line.recipientKind === 'associated_staff' ? 'Staff' : 'Customer'}
                      </span>
                    </>
                  }
                  meta={refundPayeePayoutMetaLine(r, line, branchNameById)}
                  extra={<RefundPayeeExtra payeeLine={line} />}
                  amount={
                    line.amountDueNgn > 0
                      ? formatNgn(line.amountDueNgn)
                      : line.payoutStatusLabel || formatNgn(0)
                  }
                  actions={renderRefundActions(line)}
                />
                );
              })}
            </ul>
          </PayoutTypeGroup>

          <PayoutTypeGroup
            sectionId={id('expenses')}
            theme="teal"
            title="Expenses"
            icon={<Banknote size={16} strokeWidth={2} />}
            count={paymentRequests.length}
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
                  extra={<PaymentRequestQueueExtra req={req} />}
                  amount={formatNgn(paymentRequestOutstandingNgn(req))}
                  actions={renderPaymentRequestActions(req)}
                />
              ))}
            </ul>
          </PayoutTypeGroup>

          <PayoutTypeGroup
            sectionId={id('withdrawals')}
            theme="teal"
            title="Register withdrawals"
            icon={<Wallet size={16} strokeWidth={2} />}
            count={registerSettlements.length}
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
          </PayoutTypeGroup>

          <PayoutTypeGroup
            sectionId={id('haulage')}
            theme="sky"
            title="Transport / haulage"
            icon={<Truck size={16} strokeWidth={2} />}
            count={poTransport.length}
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
          </PayoutTypeGroup>

          {children}
        </div>
    </section>
  );
}
