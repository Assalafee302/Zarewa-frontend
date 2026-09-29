import React, { useMemo, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatNgn } from '../../Data/mockData';
import { refundsOnFinanceRefundQueue } from '../../lib/refundsStore';
import { flattenRefundDeskQueue } from '../../lib/refundCashierDetail';
import {
  registerSettlementOutstandingNgn,
  registerSettlementsAwaitingPayment,
} from '../../lib/registerSettlementPay';
import { effectiveOutstandingNgn } from '../../lib/paymentOutstandingTolerance.js';
import { paymentRequestPayoutMetaLine } from '../../lib/financeTreasuryPayoutQueueMeta';
import { TREASURY_STATEMENT_TYPE_LABEL } from '../../lib/accountCore';
import {
  filterPayoutDueRows,
  nextPayoutSort,
  payoutAgeDays,
  sortPayoutDueRows,
  summarizePayoutDue,
} from '../../lib/financePayoutDesk';
import { SalesListSearchInput } from '../sales/SalesListTableFrame';
import {
  AppTable,
  AppTableBody,
  AppTablePager,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';
import { useAccountPage } from '../../pages/account/AccountPageContext.jsx';
import { printPayoutVoucher } from '../../lib/payoutVoucherPrint.js';

const KIND_META = {
  expense: { label: 'Expenses', chip: 'border-teal-200 bg-teal-50 text-teal-900' },
  refund: { label: 'Refunds', chip: 'border-rose-200 bg-rose-50 text-rose-900' },
  withdrawal: { label: 'Withdrawals', chip: 'border-slate-200 bg-slate-50 text-slate-800' },
  haulage: { label: 'Haulage', chip: 'border-sky-200 bg-sky-50 text-sky-900' },
};

function ageLabel(days) {
  if (days == null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function ageClass(days) {
  if (days == null) return 'text-slate-400';
  if (days >= 7) return 'font-semibold text-rose-800';
  if (days >= 3) return 'font-semibold text-amber-800';
  return 'text-slate-600';
}

function SortButton({ label, sortKey, activeKey, dir, onSort, align = 'left' }) {
  const active = activeKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-0.5 hover:text-zarewa-teal ${align === 'right' ? 'ml-auto' : ''}`}
    >
      {label}
      <span className="sr-only">
        {active ? (dir === 'asc' ? ', sorted ascending' : ', sorted descending') : ', activate to sort'}
      </span>
      {active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </button>
  );
}

function MetricButton({ label, value, hint, active, onClick, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
        active
          ? 'border-zarewa-teal bg-teal-50/80 shadow-sm'
          : 'border-slate-200 bg-white hover:border-teal-200'
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums text-zarewa-teal">{value}</p>
      <p className="text-[11px] text-slate-500">{hint}</p>
    </button>
  );
}

/**
 * Cashier Payouts: what still needs paying vs what already left treasury.
 */
export function FinanceCashierPayoutsPanel() {
  const {
    handleDeskPayRequest,
    handleDeskPayRefund,
    handleDeskViewRefund,
    handleDeskViewPaymentRequest,
    handleDeskPayRegisterSettlement,
    handleDeskPayPoTransport,
    canPayRequests,
    paymentsListWindow,
    paymentsRegisterTotalNgn,
    setPaymentsTablePage,
    togglePaymentsSort,
    paymentsTableSortKey,
    paymentsTableSortDir,
    disbursementsSearch,
    setDisbursementsSearch,
    ws,
  } = useAccountPage();
  const workspace = useWorkspace();
  const snap = workspace?.snapshot || ws?.snapshot || {};
  const [view, setView] = useState('due');
  const [dueQuery, setDueQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dueSortKey, setDueSortKey] = useState('date');
  const [dueSortDir, setDueSortDir] = useState('desc');
  const [expandedPayoutKey, setExpandedPayoutKey] = useState('');
  const refundQueueActor = workspace?.session?.user || ws?.session?.user;
  const refundQueueHasPermission = workspace?.hasPermission || ws?.hasPermission;
  const today = useMemo(() => new Date(), []);

  const dueRows = useMemo(() => {
    const rows = [];
    for (const pr of Array.isArray(snap.paymentRequests) ? snap.paymentRequests : []) {
      if (String(pr.approvalStatus || '').trim() !== 'Approved') continue;
      const req = Math.round(Number(pr.amountRequestedNgn) || 0);
      const paid = Math.round(Number(pr.paidAmountNgn) || 0);
      const due = effectiveOutstandingNgn(req, paid);
      if (due <= 0) continue;
      const date = String(pr.approvedAtISO || pr.requestDate || '').slice(0, 10);
      rows.push({
        id: String(pr.requestID || pr.id || ''),
        kindKey: 'expense',
        kind: 'Expense request',
        party: pr.payeeName || pr.requestedByName || pr.category || '—',
        ref: paymentRequestPayoutMetaLine(pr) || String(pr.requestID || pr.id || ''),
        date,
        ageDays: payoutAgeDays(date, today),
        amount: due,
        payable: true,
        statusLabel: 'Ready',
        pay: () => handleDeskPayRequest(String(pr.requestID || pr.id || '')),
        view: () => handleDeskViewPaymentRequest?.(String(pr.requestID || pr.id || '')),
        payeeBankName: pr.payeeBankName || '',
        payeeAccountNo: pr.payeeAccountNo || '',
        approvedBy: pr.approvedByName || pr.approvedBy || '',
        note: pr.purpose || pr.notes || pr.description || '',
      });
    }
    for (const line of flattenRefundDeskQueue(refundsOnFinanceRefundQueue(snap.refunds || []), {
      actor: refundQueueActor,
      hasPermission: refundQueueHasPermission,
    })) {
      const r = line.parentRefund || {};
      const due = Math.round(Number(line.amountDueNgn) || 0);
      const canPay = due > 0 || line.payoutStatus === 'admin_override_uncleared';
      const date = String(r.approvedAtISO || r.approvalDate || r.dateISO || '').slice(0, 10);
      rows.push({
        id: `${line.refundID}-${line.queueKey}`,
        kindKey: 'refund',
        kind: canPay ? 'Customer refund' : line.payoutStatusLabel || 'Refund pending',
        party: line.recipientLabel || r.customerName || r.customerID || '—',
        ref: line.refundID,
        date,
        ageDays: payoutAgeDays(date, today),
        // Only a payable row's amount belongs in "Due" — for a held/referral row this is the
        // refund's full net payout, not money that's actually outstanding right now.
        amount: due,
        heldAmount: canPay ? 0 : Math.round(Number(line.netPayoutNgn) || 0),
        payable: Boolean(canPay),
        statusLabel: canPay ? 'Ready' : 'Held',
        pay: canPay ? () => handleDeskPayRefund(String(line.refundID || ''), line.queueKey) : null,
        view: () => handleDeskViewRefund?.(String(line.refundID || '')),
        payeeBankName: line.payeeBankName || r.payeeBankName || '',
        payeeAccountNo: line.payeeAccountNo || r.payeeAccountNo || '',
        approvedBy: r.approvedByName || r.approvedBy || '',
        note: r.reason || r.notes || '',
      });
    }
    for (const s of registerSettlementsAwaitingPayment(snap.registerSettlementsAwaitingPayment || [])) {
      const due = Math.max(0, Number(s.outstandingNgn) || registerSettlementOutstandingNgn(s) || 0);
      if (due <= 0) continue;
      const date = String(s.approvedAtISO || s.dateISO || '').slice(0, 10);
      rows.push({
        id: String(s.settlementId || s.id || ''),
        kindKey: 'withdrawal',
        kind: 'Register withdrawal',
        party: s.payeeName || s.registerName || '—',
        ref: String(s.settlementId || s.id || ''),
        date,
        ageDays: payoutAgeDays(date, today),
        amount: due,
        payable: true,
        statusLabel: 'Ready',
        pay: () => handleDeskPayRegisterSettlement(String(s.settlementId || '')),
        payeeBankName: s.payeeBankName || '',
        payeeAccountNo: s.payeeAccountNo || '',
        note: s.notes || '',
      });
    }
    for (const row of Array.isArray(snap.poTransportAwaitingTreasury) ? snap.poTransportAwaitingTreasury : []) {
      const due = Math.max(0, Number(row.outstandingNgn) || 0);
      if (due <= 0) continue;
      const date = String(row.approvedAtISO || row.dateISO || '').slice(0, 10);
      const id = String(row.poID || row.poId || row.id || '');
      rows.push({
        id,
        kindKey: 'haulage',
        kind: 'PO haulage',
        party: row.transportAgentName || row.transporterName || row.supplierName || '—',
        ref: id,
        date,
        ageDays: payoutAgeDays(date, today),
        amount: due,
        payable: true,
        statusLabel: 'Ready',
        pay: () => handleDeskPayPoTransport(row),
      });
    }
    return rows;
  }, [
    snap.paymentRequests,
    snap.refunds,
    snap.registerSettlementsAwaitingPayment,
    snap.poTransportAwaitingTreasury,
    handleDeskPayRequest,
    handleDeskPayRefund,
    handleDeskViewRefund,
    handleDeskViewPaymentRequest,
    handleDeskPayRegisterSettlement,
    handleDeskPayPoTransport,
    refundQueueActor,
    refundQueueHasPermission,
    today,
  ]);

  const summary = useMemo(() => summarizePayoutDue(dueRows), [dueRows]);
  const visibleDue = useMemo(
    () =>
      sortPayoutDueRows(
        filterPayoutDueRows(dueRows, { query: dueQuery, kind: kindFilter, status: statusFilter }),
        dueSortKey,
        dueSortDir
      ),
    [dueRows, dueQuery, kindFilter, statusFilter, dueSortKey, dueSortDir]
  );
  const visibleReadyNgn = useMemo(
    () => visibleDue.reduce((sum, row) => sum + (row.payable ? Math.round(Number(row.amount) || 0) : 0), 0),
    [visibleDue]
  );
  const filtersActive = Boolean(dueQuery.trim()) || kindFilter !== 'all' || statusFilter !== 'all';

  const paidSlice = paymentsListWindow?.slice || [];

  function onDueSort(key) {
    const next = nextPayoutSort(dueSortKey, dueSortDir, key);
    setDueSortKey(next.key);
    setDueSortDir(next.dir);
  }

  function focusStatus(status) {
    setView('due');
    setStatusFilter(status);
  }

  return (
    <div className="space-y-4" data-testid="finance-cashier-payouts">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MetricButton
          testId="finance-payout-metric-ready"
          label="Ready to pay"
          value={formatNgn(summary.payableNgn)}
          hint={`${summary.payableCount} item${summary.payableCount === 1 ? '' : 's'}`}
          active={view === 'due' && statusFilter === 'ready'}
          onClick={() => focusStatus('ready')}
        />
        <MetricButton
          testId="finance-payout-metric-held"
          label="Held"
          value={summary.heldCount ? formatNgn(summary.heldNgn) : '—'}
          hint={
            summary.heldCount
              ? `${summary.heldCount} not payable yet`
              : 'No uncleared or referral holds'
          }
          active={view === 'due' && statusFilter === 'held'}
          onClick={() => focusStatus(summary.heldCount ? 'held' : 'all')}
        />
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Oldest ready</p>
          <p className={`mt-1 text-base font-bold tabular-nums ${ageClass(summary.oldestReadyDays)}`}>
            {summary.payableCount ? ageLabel(summary.oldestReadyDays) : '—'}
          </p>
          <p className="text-[11px] text-slate-500">Since approval. 7+ days is late.</p>
        </div>
        <button
          type="button"
          onClick={() => setView('paid')}
          className={`rounded-xl border px-3 py-2.5 text-left ${
            view === 'paid' ? 'border-zarewa-teal bg-teal-50/80' : 'border-slate-200 bg-white hover:border-teal-200'
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Already posted</p>
          <p className="mt-1 text-base font-bold tabular-nums text-zarewa-teal">
            {formatNgn(paymentsRegisterTotalNgn || 0)}
          </p>
          <p className="text-[11px] text-slate-500">{paymentsListWindow?.total || 0} treasury lines</p>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Payout queue">
        {[
          ['due', `To pay (${summary.payableCount})`],
          ['paid', `Paid (${paymentsListWindow?.total || 0})`],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ${
              view === id ? 'bg-zarewa-teal text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-teal-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'due' ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full max-w-md">
              <SalesListSearchInput
                value={dueQuery}
                onChange={setDueQuery}
                label="Search payouts to pay"
                placeholder="Search payee, reference, type…"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                ['all', 'All'],
                ['ready', 'Ready'],
                ['held', 'Held'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    statusFilter === id
                      ? 'bg-slate-800 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setKindFilter('all')}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                kindFilter === 'all' ? 'border-zarewa-teal bg-teal-50 text-teal-950' : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              All types ({dueRows.length})
            </button>
            {Object.entries(KIND_META).map(([key, meta]) => {
              const count = summary.byKind[key] || 0;
              if (!count) return null;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setKindFilter(key)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    kindFilter === key ? meta.chip : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {meta.label} ({count})
                </button>
              );
            })}
            {filtersActive ? (
              <button
                type="button"
                onClick={() => {
                  setDueQuery('');
                  setKindFilter('all');
                  setStatusFilter('all');
                }}
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-500 underline-offset-2 hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>

          {summary.heldCount > 0 && statusFilter !== 'held' ? (
            <p className="text-[12px] text-slate-500">
              {summary.heldCount} approved line{summary.heldCount === 1 ? '' : 's'}{' '}
              {summary.heldCount === 1 ? 'is' : 'are'} held (uncleared receipts or wallet release) and{' '}
              {summary.heldCount === 1 ? 'is' : 'are'} not in the ready total.
            </p>
          ) : null}

          <AppTableWrap>
            <AppTable role="numeric">
              <AppTableThead>
                <AppTableTh>
                  <SortButton label="Date" sortKey="date" activeKey={dueSortKey} dir={dueSortDir} onSort={onDueSort} />
                </AppTableTh>
                <AppTableTh>
                  <SortButton label="Age" sortKey="age" activeKey={dueSortKey} dir={dueSortDir} onSort={onDueSort} />
                </AppTableTh>
                <AppTableTh>
                  <SortButton label="Type" sortKey="type" activeKey={dueSortKey} dir={dueSortDir} onSort={onDueSort} />
                </AppTableTh>
                <AppTableTh>
                  <SortButton label="Payee" sortKey="payee" activeKey={dueSortKey} dir={dueSortDir} onSort={onDueSort} />
                </AppTableTh>
                <AppTableTh>Ref</AppTableTh>
                <AppTableTh>Status</AppTableTh>
                <AppTableTh align="right">
                  <SortButton
                    label="Due"
                    sortKey="amount"
                    activeKey={dueSortKey}
                    dir={dueSortDir}
                    onSort={onDueSort}
                    align="right"
                  />
                </AppTableTh>
                <AppTableTh align="right"> </AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {visibleDue.length === 0 ? (
                  <AppTableTr>
                    <AppTableTd colSpan={8} truncate={false} className="py-8 text-center text-slate-500">
                      {dueRows.length === 0
                        ? 'Nothing waiting to be paid.'
                        : 'No payouts match this filter.'}
                    </AppTableTd>
                  </AppTableTr>
                ) : (
                  visibleDue.map((row) => {
                    const rowKey = `${row.kindKey}-${row.id}`;
                    const expanded = expandedPayoutKey === rowKey;
                    const bankLine = [row.payeeBankName, row.payeeAccountNo].filter(Boolean).join(' · ');
                    return (
                    <React.Fragment key={rowKey}>
                    <AppTableTr
                      className={row.payable ? '' : 'bg-amber-50/50'}
                      onClick={() => setExpandedPayoutKey(expanded ? '' : rowKey)}
                    >
                      <AppTableTd>{row.date || '—'}</AppTableTd>
                      <AppTableTd>
                        <span className={ageClass(row.ageDays)}>{ageLabel(row.ageDays)}</span>
                      </AppTableTd>
                      <AppTableTd>
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            KIND_META[row.kindKey]?.chip || 'border-slate-200 bg-slate-50 text-slate-700'
                          }`}
                        >
                          {row.kind}
                        </span>
                      </AppTableTd>
                      <AppTableTd title={row.party}>{row.party}</AppTableTd>
                      <AppTableTd monospace title={row.ref || row.id}>
                        {row.ref || row.id || '—'}
                      </AppTableTd>
                      <AppTableTd>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            row.payable ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-100 text-amber-950'
                          }`}
                        >
                          {row.statusLabel}
                        </span>
                      </AppTableTd>
                      <AppTableTd align="right">
                        {row.payable ? (
                          formatNgn(row.amount)
                        ) : row.heldAmount > 0 ? (
                          <span className="text-slate-500" title="Not payable from till yet">
                            {formatNgn(row.heldAmount)} held
                          </span>
                        ) : (
                          formatNgn(row.amount)
                        )}
                      </AppTableTd>
                      <AppTableTd align="right" truncate={false}>
                        <div className="inline-flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {row.view ? (
                            <button
                              type="button"
                              onClick={row.view}
                              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              View
                            </button>
                          ) : null}
                          {canPayRequests && row.pay ? (
                            <button
                              type="button"
                              onClick={row.pay}
                              className="rounded-md bg-zarewa-teal px-2 py-1 text-[11px] font-semibold text-white hover:brightness-110"
                            >
                              Pay
                            </button>
                          ) : !row.view && !row.pay ? (
                            <span className="text-[11px] text-slate-400">View only</span>
                          ) : null}
                        </div>
                      </AppTableTd>
                    </AppTableTr>
                    {expanded ? (
                      <AppTableTr className="bg-slate-50/90">
                        <AppTableTd colSpan={8} truncate={false}>
                          <div className="flex flex-wrap items-start justify-between gap-3 py-1 text-[12px] text-slate-700">
                            <div className="space-y-1 min-w-0">
                              {bankLine ? (
                                <p>
                                  <span className="font-semibold text-slate-500">Payee account</span>{' '}
                                  <span className="font-mono font-bold tabular-nums">{bankLine}</span>
                                </p>
                              ) : (
                                <p className="text-slate-500">No bank account on this line — open View if you need details.</p>
                              )}
                              {row.approvedBy ? (
                                <p>
                                  <span className="font-semibold text-slate-500">Approved by</span> {row.approvedBy}
                                </p>
                              ) : null}
                              {row.note ? (
                                <p className="text-slate-600 leading-snug">{row.note}</p>
                              ) : null}
                            </div>
                            {canPayRequests && row.pay ? (
                              <button
                                type="button"
                                onClick={row.pay}
                                className="rounded-md bg-zarewa-teal px-3 py-1.5 text-[11px] font-semibold text-white hover:brightness-110 shrink-0"
                              >
                                Execute payout
                              </button>
                            ) : null}
                          </div>
                        </AppTableTd>
                      </AppTableTr>
                    ) : null}
                    </React.Fragment>
                    );
                  })
                )}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
          {visibleDue.length > 0 ? (
            <p className="text-xs font-medium tabular-nums text-slate-600">
              Showing {visibleDue.length} of {dueRows.length}
              {' · '}
              Ready in view {formatNgn(visibleReadyNgn)}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full max-w-md">
              <SalesListSearchInput
                value={disbursementsSearch}
                onChange={setDisbursementsSearch}
                label="Search paid payouts"
                placeholder="Search payee, account, description, date…"
              />
            </div>
            <p className="text-xs font-semibold tabular-nums text-slate-600">
              Posted in this filter{' '}
              <span className="text-sm font-bold text-zarewa-teal">{formatNgn(paymentsRegisterTotalNgn || 0)}</span>
            </p>
          </div>
          <AppTableWrap>
            <AppTable role="numeric">
              <AppTableThead>
                <AppTableTh>
                  <SortButton
                    label="Date"
                    sortKey="date"
                    activeKey={paymentsTableSortKey}
                    dir={paymentsTableSortDir}
                    onSort={togglePaymentsSort}
                  />
                </AppTableTh>
                <AppTableTh>
                  <SortButton
                    label="Type"
                    sortKey="type"
                    activeKey={paymentsTableSortKey}
                    dir={paymentsTableSortDir}
                    onSort={togglePaymentsSort}
                  />
                </AppTableTh>
                <AppTableTh>
                  <SortButton
                    label="Payee"
                    sortKey="payee"
                    activeKey={paymentsTableSortKey}
                    dir={paymentsTableSortDir}
                    onSort={togglePaymentsSort}
                  />
                </AppTableTh>
                <AppTableTh>
                  <SortButton
                    label="Description"
                    sortKey="description"
                    activeKey={paymentsTableSortKey}
                    dir={paymentsTableSortDir}
                    onSort={togglePaymentsSort}
                  />
                </AppTableTh>
                <AppTableTh>
                  <SortButton
                    label="Paid from"
                    sortKey="account"
                    activeKey={paymentsTableSortKey}
                    dir={paymentsTableSortDir}
                    onSort={togglePaymentsSort}
                  />
                </AppTableTh>
                <AppTableTh align="right">
                  <SortButton
                    label="Amount"
                    sortKey="amount"
                    activeKey={paymentsTableSortKey}
                    dir={paymentsTableSortDir}
                    onSort={togglePaymentsSort}
                    align="right"
                  />
                </AppTableTh>
                <AppTableTh align="right"> </AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {paidSlice.length === 0 ? (
                  <AppTableTr>
                    <AppTableTd colSpan={7} truncate={false} className="py-8 text-center text-slate-500">
                      No paid lines in this view.
                    </AppTableTd>
                  </AppTableTr>
                ) : (
                  paidSlice.map((row, idx) => {
                    const canViewExpense = row.sourceKind === 'PAYMENT_REQUEST' || row.sourceKind === 'EXPENSE';
                    return (
                      <AppTableTr key={row.movementId || `paid-${idx}`}>
                        <AppTableTd>{String(row.postedAtISO || '').slice(0, 10) || '—'}</AppTableTd>
                        <AppTableTd>{TREASURY_STATEMENT_TYPE_LABEL[row.type] || row.type}</AppTableTd>
                        <AppTableTd title={row.counterpartyName}>{row.counterpartyName || '—'}</AppTableTd>
                        <AppTableTd title={row.description}>{row.description || '—'}</AppTableTd>
                        <AppTableTd title={row.accountName}>{row.accountName || '—'}</AppTableTd>
                        <AppTableTd align="right">{formatNgn(row.amountAbs)}</AppTableTd>
                        <AppTableTd align="right" truncate={false}>
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title="Print payout voucher"
                              onClick={() =>
                                printPayoutVoucher({
                                  voucherId: row.movementId || row.sourceId,
                                  dateISO: row.postedAtISO,
                                  kind: TREASURY_STATEMENT_TYPE_LABEL[row.type] || row.type,
                                  payeeName: row.counterpartyName,
                                  amountNgn: row.amountAbs,
                                  description: row.description,
                                  accountName: row.accountName,
                                  postedBy:
                                    workspace?.session?.user?.name ||
                                    workspace?.session?.user?.email ||
                                    'Cashier',
                                  branchLabel:
                                    snap?.branch?.name || workspace?.workspaceBranchId || '',
                                })
                              }
                              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Print
                            </button>
                            {canViewExpense ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeskViewPaymentRequest?.(
                                    row.sourceKind === 'PAYMENT_REQUEST' ? row.sourceId : '',
                                    { expenseId: row.sourceKind === 'EXPENSE' ? row.sourceId : '' }
                                  )
                                }
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                View
                              </button>
                            ) : null}
                          </div>
                        </AppTableTd>
                      </AppTableTr>
                    );
                  })
                )}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
          <AppTablePager
            showingFrom={paymentsListWindow?.from || 0}
            showingTo={paymentsListWindow?.to || 0}
            total={paymentsListWindow?.total || 0}
            hasPrev={(paymentsListWindow?.safePage || 0) > 0}
            hasNext={(paymentsListWindow?.safePage || 0) < (paymentsListWindow?.pageCount || 1) - 1}
            onPrev={() => setPaymentsTablePage((p) => Math.max(0, p - 1))}
            onNext={() => setPaymentsTablePage((p) => p + 1)}
          />
        </div>
      )}
    </div>
  );
}
