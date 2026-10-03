import React, { useMemo, useState } from 'react';
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
  refundCashierCustomerName,
} from '../../lib/refundCashierDetail';
import { refundIsOnPayoutHold, refundPayoutHoldReason } from '../../lib/refundsStore';
import {
  paymentRequestOutstandingNgn,
  poTransportPayoutMetaLine,
  refundPayeePayoutMetaLine,
  paymentRequestPayoutMetaLine,
  registerSettlementOutstandingNgn,
  registerSettlementPayoutMetaLine,
} from '../../lib/financeTreasuryPayoutQueueMeta';
import { maintenanceCostKindLabel } from '../../shared/lib/maintenanceCostEnvelope';
import { matchesPayoutQuery, sortPayoutQueue } from '../../lib/financePayoutDesk';
import { SalesListSearchInput } from '../sales/SalesListTableFrame';

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
  const isStaff = payeeLine?.recipientKind === 'associated_staff';
  const staffName = String(payeeLine?.recipientLabel || payeeLine?.payeeName || '').trim();
  return (
    <>
      {isStaff && staffName ? (
        <p className="text-ui-xs font-semibold text-slate-600 mt-0.5 truncate">
          Staff: <span className="font-sans">{staffName}</span>
        </p>
      ) : null}
      <PayeeAccountExtra
        payeeName={payeeLine?.payeeName}
        payeeBankName={payeeLine?.payeeBankName}
        payeeAccountNo={payeeLine?.payeeAccountNo}
      />
    </>
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
  const refundQueueActor = ws?.session?.user;
  const refundQueueHasPermission = ws?.hasPermission;
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState('date_desc');
  const id = (suffix) => (sectionIdPrefix ? `${sectionIdPrefix}-${suffix}` : undefined);
  const refundPayeeLines = useMemo(
    () =>
      flattenRefundDeskQueue(refunds, {
        actor: refundQueueActor,
        hasPermission: refundQueueHasPermission,
      }),
    [refunds, refundQueueActor, refundQueueHasPermission]
  );

  const visibleRefunds = useMemo(() => {
    const matched = refundPayeeLines.filter((line) => {
      const r = line.parentRefund || {};
      return matchesPayoutQuery(
        [
          line.refundID,
          line.recipientLabel,
          line.payeeName,
          line.payeeBankName,
          line.payeeAccountNo,
          line.payoutStatusLabel,
          r.customerName,
          r.customer,
          r.quotationRef,
        ].join(' '),
        query
      );
    });
    return sortPayoutQueue(
      matched,
      sortMode,
      (line) => Number(line.amountDueNgn) || Number(line.netPayoutNgn) || 0,
      (line) => String(line.parentRefund?.approvedAtISO || line.parentRefund?.approvalDate || line.parentRefund?.dateISO || '')
    );
  }, [refundPayeeLines, query, sortMode]);

  const visibleRequests = useMemo(() => {
    const matched = paymentRequests.filter((req) =>
      matchesPayoutQuery(
        [
          req.requestID,
          req.description,
          req.expenseCategory,
          req.payeeName,
          req.payeeBankName,
          req.payeeAccountNo,
          req.requestedByName,
          req.maintenanceWorkOrderId,
        ].join(' '),
        query
      )
    );
    return sortPayoutQueue(
      matched,
      sortMode,
      (req) => paymentRequestOutstandingNgn(req),
      (req) => String(req.approvedAtISO || req.requestDate || '')
    );
  }, [paymentRequests, query, sortMode]);

  const visibleSettlements = useMemo(() => {
    const matched = registerSettlements.filter((s) =>
      matchesPayoutQuery([s.settlementId, s.partyName, s.payeeName, s.registerName].join(' '), query)
    );
    return sortPayoutQueue(
      matched,
      sortMode,
      (s) => registerSettlementOutstandingNgn(s),
      (s) => String(s.approvedAtISO || s.dateISO || '')
    );
  }, [registerSettlements, query, sortMode]);

  const visibleHaulage = useMemo(() => {
    const matched = poTransport.filter((row) =>
      matchesPayoutQuery(
        [row.poID, row.poId, row.transportAgentName, row.transporterName, row.supplierName].join(' '),
        query
      )
    );
    return sortPayoutQueue(
      matched,
      sortMode,
      (row) => Number(row.outstandingNgn) || 0,
      (row) => String(row.approvedAtISO || row.dateISO || '')
    );
  }, [poTransport, query, sortMode]);

  const openCount =
    refundPayeeLines.length + paymentRequests.length + registerSettlements.length + poTransport.length;
  const visibleCount =
    visibleRefunds.length + visibleRequests.length + visibleSettlements.length + visibleHaulage.length;
  const readyNgn =
    visibleRefunds.reduce((sum, line) => sum + Math.max(0, Math.round(Number(line.amountDueNgn) || 0)), 0) +
    visibleRequests.reduce((sum, req) => sum + paymentRequestOutstandingNgn(req), 0) +
    visibleSettlements.reduce((sum, s) => sum + registerSettlementOutstandingNgn(s), 0) +
    visibleHaulage.reduce((sum, row) => sum + Math.max(0, Math.round(Number(row.outstandingNgn) || 0)), 0);
  const hasChildren = Boolean(children);
  const searching = Boolean(String(query || '').trim());

  if (!alwaysShow && openCount === 0 && !hasChildren) return null;

  return (
    <section
      id={id('payouts') || 'desk-payout-queue'}
      className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-3 scroll-mt-20 sm:p-4"
      data-testid="finance-payouts-combined"
    >
      <div className="flex flex-col gap-2 px-0.5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-800">Pay out</h2>
          <p className="mt-0.5 text-ui-xs tabular-nums text-slate-500">
            {searching ? `${visibleCount} match · ` : `${openCount}${hasChildren ? '+' : ''} open · `}
            Ready {formatNgn(readyNgn)}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="w-full sm:w-64">
            <SalesListSearchInput
              value={query}
              onChange={setQuery}
              label="Search payout queue"
              placeholder="Payee, refund, request, account…"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-ui-xs font-bold uppercase tracking-wider text-slate-500">
            Sort
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              data-testid="finance-payout-queue-sort"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800"
            >
              <option value="date_desc">Newest approved</option>
              <option value="date_asc">Oldest approved</option>
              <option value="amount_desc">Highest amount</option>
              <option value="amount_asc">Lowest amount</option>
            </select>
          </label>
        </div>
      </div>

      {openCount === 0 && !hasChildren ? (
        <p className="py-6 text-center text-xs text-slate-500">Nothing waiting to pay.</p>
      ) : null}
      {openCount === 0 && hasChildren ? (
        <p className="text-ui-xs text-slate-500 px-0.5">
          Refunds and expenses are clear. Partner wallets and other payouts still appear below when due.
        </p>
      ) : null}
      {searching && visibleCount === 0 && openCount > 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">No payouts match this search.</p>
      ) : null}

      <div className="space-y-3">
          <PayoutTypeGroup
            sectionId={id('refunds')}
            theme="rose"
            title="Refunds"
            icon={<RotateCcw size={16} strokeWidth={2} />}
            count={visibleRefunds.length}
            testId="finance-refunds-awaiting-payout"
          >
            <ul className="space-y-1.5">
              {visibleRefunds.map((line) => {
                const r = line.parentRefund || {};
                const rowTestId = `finance-refund-awaiting-row-${line.refundID}-${line.queueKey}`;
                const caution = refundPayeePayoutCaution(r, line, {
                  siblingPayeeLines: refundPayeeLines,
                  actor: ws?.session?.user,
                  hasPermission: ws?.hasPermission,
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
                      {refundIsOnPayoutHold(r) ? (
                        <span className="mr-1 inline-flex rounded-full bg-red-600 px-2 py-0.5 text-ui-xs font-bold text-white" title={refundPayoutHoldReason(r)}>
                          On hold{refundPayoutHoldReason(r) ? ` · ${refundPayoutHoldReason(r)}` : ''}
                        </span>
                      ) : null}
                      <span className="font-mono">{line.refundID}</span>
                      <span className="font-medium text-slate-600">
                        {' '}
                        · {refundCashierCustomerName(r)}
                      </span>
                      {line.recipientKind === 'associated_staff' ? (
                        <span className="font-medium text-slate-500"> → {line.recipientLabel}</span>
                      ) : null}
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
            count={visibleRequests.length}
            testId="finance-payment-requests-awaiting-payout"
          >
            <ul className="space-y-1.5">
              {visibleRequests.map((req) => (
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
            count={visibleSettlements.length}
            testId="finance-register-withdrawals-awaiting-payout"
          >
            <ul className="space-y-1.5">
              {visibleSettlements.map((s) => (
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
            count={visibleHaulage.length}
            testId="finance-po-transport-awaiting-payout"
            action={poTransportPanelAction}
          >
            <ul className="space-y-1.5">
              {visibleHaulage.map((row) => (
                <FinanceDeskColoredQueueRow
                  key={row.poID || row.poId}
                  theme="sky"
                  testId={`finance-po-transport-awaiting-row-${row.poID || row.poId}`}
                  title={
                    <>
                      <span className="font-mono">{row.poID || row.poId}</span>
                      <span className="font-medium text-slate-600">
                        {' '}
                        · {row.transportAgentName || row.transporterName || 'Transporter'}
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
