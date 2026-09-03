import React from 'react';
import { FileText, Scissors, Receipt as ReceiptIcon, RotateCcw } from 'lucide-react';
import { ListEmptyState } from '../ui/ListEmptyState';
import { SalesRowMenu } from './SalesRowMenu';
import {
  SalesListTableFrame,
  SalesListSearchInput,
  SalesListSortBar,
  SalesWorkFilterChip,
} from './SalesListTableFrame';
import { SalesRecordsView, SALES_ROW_ID, SALES_ROW_CUSTOMER, SALES_ROW_AMOUNT } from './SalesListRow';
import { SalesShowMoreButton } from './SalesShowMoreButton';
import {
  SalesReceiptPaymentStatusFilter,
  SalesReceiptPaymentStatusLegend,
} from './SalesReceiptPaymentUi';
import {
  SALES_STATUS_CHIP,
  quoteApprovalChipClass,
  quotePayChipClass,
  receiptCuttingListChipClass,
  receiptSourceChipClass,
  refundStatusChipClass,
} from '../../lib/salesStatusUi';
import { SALES_TABLE_SORT_FIELD_OPTIONS } from '../../lib/salesListSorting';
import {
  quotationDisplayPaymentStatus,
  quotationEffectivePaidNgn,
  quotationListPaymentMeta,
} from '../../lib/quotationPaymentSummary';
import {
  QUOTATION_FOLLOWUP_START_DAY,
  QUOTATION_VALIDITY_DAYS,
  quotationNeedsFollowUpAlert,
} from '../../lib/quotationLifecycleUi';
import { canEditQuotation, quotationEditBlockedReason, canEditCuttingList, cuttingListEditBlockedReason } from '../../lib/salesWorkspaceAccess';
import {
  receiptSalesPaymentStatusChipClass,
  receiptSalesPaymentStatusLabel,
  receiptSalesPaymentStatusTitle,
} from '../../lib/receiptClearance.js';
import { pickProductionJobForCuttingList } from '../../lib/productionJobPick';
import { productionQueueLineStatusPresentation } from '../../lib/productionQueueLineStatus';
import { refundApprovedAmount, refundOutstandingAmount, refundHasCreditConfirmation, refundPublicStatusLabel } from '../../lib/refundsStore';
import { MillSpecMark } from '../ui/MillColourChip.jsx';
import { quotationListColour, quotationListGauge } from '../../lib/quotationListSpec.js';
import { formatNgn } from '../../Data/mockData';

const CHIP = SALES_STATUS_CHIP;

const QUOTE_TABLE_HEADERS = [
  { key: 'id', label: 'ID' },
  { key: 'spec', label: 'Spec' },
  { key: 'customer', label: 'Customer' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'approval', label: 'Approval' },
  { key: 'payment', label: 'Payment' },
  { key: 'notes', label: 'Notes' },
  { key: 'actions', label: 'Actions' },
];
const RECEIPT_TABLE_HEADERS = [
  { key: 'id', label: 'ID' },
  { key: 'customer', label: 'Customer' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'notes', label: 'Notes' },
  { key: 'actions', label: 'Actions' },
];
const CUTTING_TABLE_HEADERS = [
  { key: 'id', label: 'ID' },
  { key: 'customer', label: 'Customer' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'line', label: 'Line' },
  { key: 'date', label: 'Date' },
  { key: 'actions', label: 'Actions' },
];
const REFUND_TABLE_HEADERS = [
  { key: 'id', label: 'ID' },
  { key: 'customer', label: 'Customer' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'notes', label: 'Notes' },
  { key: 'actions', label: 'Actions' },
];

/** Quotation / receipt / cutting-list / refund record lists for the Sales desk. */

export function SalesQuotationsList({
  searchQuery,
  setSearchQuery,
  quoteWorkFilter,
  setQuoteWorkFilter,
  salesListSort,
  setSalesListSort,
  filteredQuotations,
  quotationWorkRows,
  showCount,
  setShowCount,
  debouncedSearchQuery,
  openNewModal,
  actionMenuKey,
  setActionMenuKey,
  paymentCountByQuoteRef,
  quotationPayOpts,
  salesRole,
  canDeleteSalesRecord,
  ws,
  navigate,
  openAddPaymentForQuotation,
  deleteQuotation,
  setSelectedItem,
  setQuotationAccessMode,
  setShowQuotationModal,
}) {
  return (
                  <SalesListTableFrame
                    toolbar={
                      <>
                        <SalesListSearchInput
                          value={searchQuery}
                          onChange={setSearchQuery}
                          placeholder="Search ID, customer, date, status…"
                          label="Search quotations"
                        />
                        <SalesWorkFilterChip
                          label={
                            quoteWorkFilter === 'followUp'
                              ? 'Showing follow-up quotes'
                              : quoteWorkFilter === 'pendingApproval'
                                ? 'Showing quotes awaiting approval'
                                : ''
                          }
                          onClear={() => setQuoteWorkFilter('all')}
                        />
                        <SalesListSortBar
                          fields={SALES_TABLE_SORT_FIELD_OPTIONS.quotations}
                          field={salesListSort.field}
                          dir={salesListSort.dir}
                          onFieldChange={(field) => setSalesListSort((s) => ({ ...s, field }))}
                          onDirToggle={() =>
                            setSalesListSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))
                          }
                        />
                      </>
                    }
                  >
                    {filteredQuotations.length === 0 ? (
                      <ListEmptyState
                        kind={
                          debouncedSearchQuery.trim() || quoteWorkFilter !== 'all' ? 'search' : 'empty'
                        }
                        icon={FileText}
                        title={
                          debouncedSearchQuery.trim() || quoteWorkFilter !== 'all'
                            ? 'No quotations match'
                            : 'No quotations yet'
                        }
                        description={
                          debouncedSearchQuery.trim() || quoteWorkFilter !== 'all'
                            ? 'Clear the search or work filter, or create a new quotation.'
                            : 'Create a quotation to start a sale.'
                        }
                        actionLabel={
                          debouncedSearchQuery.trim() || quoteWorkFilter !== 'all'
                            ? 'Clear filters'
                            : 'New quotation'
                        }
                        onAction={
                          debouncedSearchQuery.trim() || quoteWorkFilter !== 'all'
                            ? () => {
                                setSearchQuery('');
                                setQuoteWorkFilter('all');
                              }
                            : openNewModal
                        }
                      />
                    ) : (
                      <SalesRecordsView
                        caption="Quotations"
                        headers={QUOTE_TABLE_HEADERS}
                        items={filteredQuotations}
                        itemKey={(q) => `q-${q.id}`}
                        openKey={actionMenuKey}
                        onView={(q) => {
                          setSelectedItem(q);
                          setQuotationAccessMode('view');
                          setShowQuotationModal(true);
                        }}
                        viewLabel={(q) => `View quotation ${q.id}`}
                        renderMenu={(q) => (
                          <SalesRowMenu
                            rowKey={`q-${q.id}`}
                            openKey={actionMenuKey}
                            setOpenKey={setActionMenuKey}
                            label={`quotation ${q.id}`}
                            onView={() => {
                              setSelectedItem(q);
                              setQuotationAccessMode('view');
                              setShowQuotationModal(true);
                            }}
                            onEdit={() => {
                              setSelectedItem(q);
                              setQuotationAccessMode('edit');
                              setShowQuotationModal(true);
                            }}
                            editDisabled={!canEditQuotation(q, salesRole)}
                            editTitle={quotationEditBlockedReason(q, salesRole) ?? ''}
                            onAddPayment={() => openAddPaymentForQuotation(q)}
                            onReviewAudit={
                              ws?.hasPermission?.('manager.audit') ||
                              ['admin', 'md', 'ceo'].includes(ws?.session?.user?.roleKey)
                                ? () => {
                                    navigate(`/manager?quoteRef=${encodeURIComponent(q.id)}`);
                                  }
                                : undefined
                            }
                            onDelete={
                              canDeleteSalesRecord ? () => deleteQuotation(String(q.id || '').trim()) : undefined
                            }
                            deleteLabel="Delete"
                          />
                        )}
                        renderCard={(q) => {
                          const payCount = paymentCountByQuoteRef.get(String(q.id || '').trim()) || 0;
                          const payStatus = quotationDisplayPaymentStatus(q, quotationPayOpts);
                          const paidForUi = quotationEffectivePaidNgn(q, quotationPayOpts);
                          const meta2 = quotationListPaymentMeta(q, payCount, quotationPayOpts);
                          const qForFollowUp = { ...q, paidNgn: paidForUi, paymentStatus: payStatus };
                          return (
                            <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                              <MillSpecMark
                                colour={quotationListColour(q)}
                                gauge={quotationListGauge(q)}
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1 leading-tight">
                                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
                                  <p className="truncate min-w-0">
                                    <span className={SALES_ROW_ID}>{q.id}</span>
                                    <span className={SALES_ROW_CUSTOMER}> · {q.customer}</span>
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                    <span className={SALES_ROW_AMOUNT}>
                                      {q.total}
                                    </span>
                                    <span className={`${CHIP} ${quoteApprovalChipClass(q.status)}`}>
                                      {q.status}
                                    </span>
                                    <span className={`${CHIP} ${quotePayChipClass(payStatus)}`}>
                                      {payStatus}
                                    </span>
                                    {quotationNeedsFollowUpAlert(qForFollowUp) ? (
                                      <span
                                        className={`${CHIP} border-amber-300 bg-amber-100 text-amber-950`}
                                        title={`Day ${QUOTATION_FOLLOWUP_START_DAY}–${QUOTATION_VALIDITY_DAYS - 1} follow-up — still unpaid on quote`}
                                      >
                                        Follow up
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <p
                                  className="text-ui-xs text-slate-500 mt-0.5 leading-snug line-clamp-2 tabular-nums"
                                  title={meta2}
                                >
                                  {meta2}
                                </p>
                              </div>
                            </div>
                          );
                        }}
                        renderCells={(q) => {
                          const payCount = paymentCountByQuoteRef.get(String(q.id || '').trim()) || 0;
                          const payStatus = quotationDisplayPaymentStatus(q, quotationPayOpts);
                          const paidForUi = quotationEffectivePaidNgn(q, quotationPayOpts);
                          const meta2 = quotationListPaymentMeta(q, payCount, quotationPayOpts);
                          const qForFollowUp = { ...q, paidNgn: paidForUi, paymentStatus: payStatus };
                          return {
                            id: <span className={SALES_ROW_ID}>{q.id}</span>,
                            spec: (
                              <MillSpecMark colour={quotationListColour(q)} gauge={quotationListGauge(q)} />
                            ),
                            customer: <span className={`${SALES_ROW_CUSTOMER} truncate block max-w-[14rem]`}>{q.customer}</span>,
                            amount: <span className={SALES_ROW_AMOUNT}>{q.total}</span>,
                            approval: (
                              <span className={`${CHIP} ${quoteApprovalChipClass(q.status)}`}>{q.status}</span>
                            ),
                            payment: (
                              <span className="inline-flex flex-wrap gap-1 justify-end">
                                <span className={`${CHIP} ${quotePayChipClass(payStatus)}`}>{payStatus}</span>
                                {quotationNeedsFollowUpAlert(qForFollowUp) ? (
                                  <span className={`${CHIP} border-amber-300 bg-amber-100 text-amber-950`}>
                                    Follow up
                                  </span>
                                ) : null}
                              </span>
                            ),
                            notes: (
                              <span className="text-ui-xs text-slate-500 line-clamp-2" title={meta2}>
                                {meta2}
                              </span>
                            ),
                          };
                        }}
                      />
                    )}
                    {quotationWorkRows.length > showCount ? (
                      <SalesShowMoreButton label="Show more quotations" onClick={() => setShowCount((c) => c + 20)} />
                    ) : null}
                  </SalesListTableFrame>
  );
}

export function SalesReceiptsList({
  searchQuery,
  setSearchQuery,
  receiptPaymentStatusFilter,
  setReceiptPaymentStatusFilter,
  receiptPaymentStatusCounts,
  salesListSort,
  setSalesListSort,
  filteredMergedReceipts,
  paymentFilteredReceiptRows,
  showCount,
  setShowCount,
  debouncedSearchQuery,
  openNewModal,
  actionMenuKey,
  setActionMenuKey,
  paymentCountByQuoteRef,
  canDeleteSalesRecord,
  openAddPaymentForReceiptRow,
  deleteReceipt,
  setSelectedItem,
  setReceiptAccessMode,
  setShowReceiptModal,
}) {
  return (
                  <SalesListTableFrame
                    toolbar={
                      <>
                        <SalesListSearchInput
                          value={searchQuery}
                          onChange={setSearchQuery}
                          placeholder="Search payment ID, customer, quotation, cutting list…"
                          label="Search payments"
                        />
                        <SalesReceiptPaymentStatusFilter
                          value={receiptPaymentStatusFilter}
                          onChange={setReceiptPaymentStatusFilter}
                          counts={receiptPaymentStatusCounts}
                        />
                        <SalesReceiptPaymentStatusLegend />
                        <SalesListSortBar
                          fields={SALES_TABLE_SORT_FIELD_OPTIONS.receipts}
                          field={salesListSort.field}
                          dir={salesListSort.dir}
                          onFieldChange={(field) => setSalesListSort((s) => ({ ...s, field }))}
                          onDirToggle={() =>
                            setSalesListSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))
                          }
                        />
                      </>
                    }
                  >
                    {filteredMergedReceipts.length === 0 ? (
                      <ListEmptyState
                        kind={
                          debouncedSearchQuery.trim() || receiptPaymentStatusFilter !== 'all'
                            ? 'search'
                            : 'empty'
                        }
                        icon={ReceiptIcon}
                        title={
                          receiptPaymentStatusFilter === 'no_cutting'
                            ? 'No payments without a cutting list'
                            : receiptPaymentStatusFilter !== 'all' || debouncedSearchQuery.trim()
                              ? 'No payments match'
                              : 'No payments yet'
                        }
                        description={
                          receiptPaymentStatusFilter !== 'all' || debouncedSearchQuery.trim()
                            ? 'Adjust the status filter or search terms.'
                            : 'Record a payment against a quotation, or take an advance.'
                        }
                        actionLabel={
                          receiptPaymentStatusFilter !== 'all' || debouncedSearchQuery.trim()
                            ? 'Clear filters'
                            : 'Record payment'
                        }
                        onAction={
                          receiptPaymentStatusFilter !== 'all' || debouncedSearchQuery.trim()
                            ? () => {
                                setSearchQuery('');
                                setReceiptPaymentStatusFilter('all');
                              }
                            : openNewModal
                        }
                      />
                    ) : (
                      <SalesRecordsView
                        caption="Payments"
                        headers={RECEIPT_TABLE_HEADERS}
                        items={filteredMergedReceipts}
                        itemKey={(r) => `rc-${r.id}`}
                        openKey={actionMenuKey}
                        onView={(r) => {
                          setSelectedItem(r);
                          setReceiptAccessMode('view');
                          setShowReceiptModal(true);
                        }}
                        viewLabel={(r) => `View payment ${r.id}`}
                        renderMenu={(r) => (
                          <SalesRowMenu
                            rowKey={`rc-${r.id}`}
                            openKey={actionMenuKey}
                            setOpenKey={setActionMenuKey}
                            label={`payment ${r.id}`}
                            onView={() => {
                              setSelectedItem(r);
                              setReceiptAccessMode('view');
                              setShowReceiptModal(true);
                            }}
                            showEdit={false}
                            onAddPayment={() => openAddPaymentForReceiptRow(r)}
                            onDelete={
                              canDeleteSalesRecord ? () => deleteReceipt(String(r.id || '').trim()) : undefined
                            }
                            deleteLabel="Delete"
                          />
                        )}
                        renderCard={(r) => {
                          const meta2 = [r.quotationRef, r.date, r._payBadge].filter(Boolean).join(' · ');
                          const quotePayCount =
                            paymentCountByQuoteRef.get(String(r.quotationRef || '').trim()) || 0;
                          const cuttingChipLabel =
                            r._cuttingListLinkKind === 'linked' && r._cuttingListId
                              ? `CL ${r._cuttingListId}`
                              : r._cuttingListLabel;
                          return (
                            <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 flex-1 leading-tight">
                                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                    <span
                                      className={`${CHIP} whitespace-nowrap ${receiptSourceChipClass(r.source)}`}
                                      title={r._subLabel || ''}
                                    >
                                      {r.source === 'ledger' ? 'Ledger' : 'Imported'}
                                    </span>
                                    <p className={`${SALES_ROW_ID} shrink-0`}>
                                      {r.id}
                                    </p>
                                    <p className={`${SALES_ROW_CUSTOMER} truncate min-w-0`}>
                                      · {r.customer}
                                    </p>
                                  </div>
                                  <span className={SALES_ROW_AMOUNT}>
                                    {r.amount}
                                  </span>
                                </div>
                                <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
                                  {meta2 ? (
                                    <p
                                      className="text-ui-xs text-slate-500 leading-snug truncate min-w-0 flex-1 basis-full sm:basis-auto"
                                      title={meta2}
                                    >
                                      {meta2}
                                    </p>
                                  ) : null}
                                  <span
                                    className={`${CHIP} ${receiptCuttingListChipClass(r._cuttingListLinkKind)} whitespace-nowrap`}
                                    title={r._cuttingListTitle}
                                  >
                                    {cuttingChipLabel}
                                  </span>
                                  {quotePayCount > 1 ? (
                                    <span
                                      className={`${CHIP} border-violet-200 bg-violet-50 text-violet-900 whitespace-nowrap`}
                                      title={`${quotePayCount} payments recorded on quotation ${r.quotationRef} — review for duplicates.`}
                                    >
                                      {quotePayCount}× on quote
                                    </span>
                                  ) : null}
                                  <span
                                    className={`${CHIP} ${receiptSalesPaymentStatusChipClass(r)} shrink-0 whitespace-nowrap`}
                                    title={receiptSalesPaymentStatusTitle(r)}
                                  >
                                    {receiptSalesPaymentStatusLabel(r)}
                                  </span>
                                  {r.financeDeliveryClearedAtISO ? (
                                    <span
                                      className={`${CHIP} border-emerald-200/70 bg-emerald-50/80 text-emerald-800 shrink-0 whitespace-nowrap`}
                                      title={r.financeDeliveryClearedAtISO}
                                    >
                                      Delivery OK
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        }}
                        renderCells={(r) => {
                          const meta2 = [r.quotationRef, r.date, r._payBadge].filter(Boolean).join(' · ');
                          const quotePayCount =
                            paymentCountByQuoteRef.get(String(r.quotationRef || '').trim()) || 0;
                          const cuttingChipLabel =
                            r._cuttingListLinkKind === 'linked' && r._cuttingListId
                              ? `CL ${r._cuttingListId}`
                              : r._cuttingListLabel;
                          return {
                            id: (
                              <span className="inline-flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`${CHIP} whitespace-nowrap ${receiptSourceChipClass(r.source)}`}
                                  title={r._subLabel || ''}
                                >
                                  {r.source === 'ledger' ? 'Ledger' : 'Imported'}
                                </span>
                                <span className={SALES_ROW_ID}>{r.id}</span>
                              </span>
                            ),
                            customer: (
                              <span className={`${SALES_ROW_CUSTOMER} truncate block max-w-[14rem]`}>
                                {r.customer}
                              </span>
                            ),
                            amount: <span className={SALES_ROW_AMOUNT}>{r.amount}</span>,
                            status: (
                              <span className="inline-flex flex-wrap gap-1">
                                <span
                                  className={`${CHIP} ${receiptCuttingListChipClass(r._cuttingListLinkKind)} whitespace-nowrap`}
                                  title={r._cuttingListTitle}
                                >
                                  {cuttingChipLabel}
                                </span>
                                {quotePayCount > 1 ? (
                                  <span className={`${CHIP} border-violet-200 bg-violet-50 text-violet-900 whitespace-nowrap`}>
                                    {quotePayCount}× on quote
                                  </span>
                                ) : null}
                                <span
                                  className={`${CHIP} ${receiptSalesPaymentStatusChipClass(r)} whitespace-nowrap`}
                                  title={receiptSalesPaymentStatusTitle(r)}
                                >
                                  {receiptSalesPaymentStatusLabel(r)}
                                </span>
                                {r.financeDeliveryClearedAtISO ? (
                                  <span
                                    className={`${CHIP} border-emerald-200/70 bg-emerald-50/80 text-emerald-800 whitespace-nowrap`}
                                    title={r.financeDeliveryClearedAtISO}
                                  >
                                    Delivery OK
                                  </span>
                                ) : null}
                              </span>
                            ),
                            notes: meta2 ? (
                              <span className="text-ui-xs text-slate-500 line-clamp-2" title={meta2}>
                                {meta2}
                              </span>
                            ) : null,
                          };
                        }}
                      />
                    )}
                    {paymentFilteredReceiptRows.length > showCount ? (
                      <SalesShowMoreButton label="Show more payments" onClick={() => setShowCount((c) => c + 20)} />
                    ) : null}
                  </SalesListTableFrame>
  );
}

export function SalesCuttingListsList({
  searchQuery,
  setSearchQuery,
  salesListSort,
  setSalesListSort,
  filteredCuttingLists,
  cuttingLists,
  productionJobs,
  showCount,
  setShowCount,
  debouncedSearchQuery,
  openNewModal,
  actionMenuKey,
  setActionMenuKey,
  roleKey,
  canDeleteSalesRecord,
  pushCuttingListToProduction,
  deleteCuttingList,
  setSelectedItem,
  setCuttingAccessMode,
  setShowCuttingModal,
}) {
  return (
                  <SalesListTableFrame
                    toolbar={
                      <>
                        <SalesListSearchInput
                          value={searchQuery}
                          onChange={setSearchQuery}
                          placeholder="Search list ID, customer, date, list status, production line status…"
                          label="Search cutting lists"
                        />
                        <SalesListSortBar
                          fields={SALES_TABLE_SORT_FIELD_OPTIONS.cuttinglist}
                          field={salesListSort.field}
                          dir={salesListSort.dir}
                          onFieldChange={(field) => setSalesListSort((s) => ({ ...s, field }))}
                          onDirToggle={() =>
                            setSalesListSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))
                          }
                        />
                      </>
                    }
                  >
                    {filteredCuttingLists.length === 0 ? (
                      <ListEmptyState
                        kind={debouncedSearchQuery.trim() ? 'search' : 'empty'}
                        icon={Scissors}
                        title={debouncedSearchQuery.trim() ? 'No cutting lists match' : 'No cutting lists yet'}
                        description={
                          debouncedSearchQuery.trim()
                            ? 'Try a different search, or clear it to see every list.'
                            : 'Cutting lists appear here after you create them from quotations.'
                        }
                        actionLabel={debouncedSearchQuery.trim() ? 'Clear search' : 'New cutting list'}
                        onAction={debouncedSearchQuery.trim() ? () => setSearchQuery('') : openNewModal}
                      />
                    ) : (
                      <SalesRecordsView
                        caption="Cutting lists"
                        headers={CUTTING_TABLE_HEADERS}
                        items={filteredCuttingLists}
                        itemKey={(c) => `cl-${c.id}`}
                        openKey={actionMenuKey}
                        onView={(c) => {
                          setSelectedItem(c);
                          setCuttingAccessMode('view');
                          setShowCuttingModal(true);
                        }}
                        viewLabel={(c) => `View cutting list ${c.id}`}
                        renderMenu={(c) => {
                          const job = pickProductionJobForCuttingList(c.id, productionJobs, cuttingLists);
                          return (
                            <SalesRowMenu
                              rowKey={`cl-${c.id}`}
                              openKey={actionMenuKey}
                              setOpenKey={setActionMenuKey}
                              label={`cutting list ${c.id}`}
                              onView={() => {
                                setSelectedItem(c);
                                setCuttingAccessMode('view');
                                setShowCuttingModal(true);
                              }}
                              onEdit={() => {
                                setSelectedItem(c);
                                setCuttingAccessMode('edit');
                                setShowCuttingModal(true);
                              }}
                              editDisabled={!canEditCuttingList(c, job, roleKey)}
                              editTitle={cuttingListEditBlockedReason(c, job, roleKey) ?? ''}
                              onPush={
                                !c.productionRegistered &&
                                !c.productionEditLocked &&
                                String(c.status || '').trim() !== 'Draft'
                                  ? () => pushCuttingListToProduction(c)
                                  : undefined
                              }
                              onDelete={
                                canDeleteSalesRecord ? () => deleteCuttingList(String(c.id || '').trim()) : undefined
                              }
                              deleteLabel="Delete"
                            />
                          );
                        }}
                        renderCard={(c) => {
                          const job = pickProductionJobForCuttingList(c.id, productionJobs, cuttingLists);
                          const lineSt = productionQueueLineStatusPresentation(c, job);
                          return (
                            <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 flex-1 leading-tight">
                                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
                                  <p className="truncate min-w-0">
                                    <span className={SALES_ROW_ID}>{c.id}</span>
                                    <span className={SALES_ROW_CUSTOMER}> · {c.customer}</span>
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                    <span className={SALES_ROW_AMOUNT}>
                                      {c.total}
                                    </span>
                                    <span
                                      className={`${CHIP} ${lineSt.chipClass}`}
                                      title={
                                        c.status
                                          ? `List status: ${c.status} · Line: ${lineSt.label}`
                                          : `Production line: ${lineSt.label}`
                                      }
                                    >
                                      {lineSt.label}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-ui-xs text-slate-500 mt-0.5 tabular-nums">{c.date}</p>
                              </div>
                            </div>
                          );
                        }}
                        renderCells={(c) => {
                          const job = pickProductionJobForCuttingList(c.id, productionJobs, cuttingLists);
                          const lineSt = productionQueueLineStatusPresentation(c, job);
                          return {
                            id: <span className={SALES_ROW_ID}>{c.id}</span>,
                            customer: (
                              <span className={`${SALES_ROW_CUSTOMER} truncate block max-w-[14rem]`}>
                                {c.customer}
                              </span>
                            ),
                            amount: <span className={SALES_ROW_AMOUNT}>{c.total}</span>,
                            line: (
                              <span
                                className={`${CHIP} ${lineSt.chipClass}`}
                                title={
                                  c.status
                                    ? `List status: ${c.status} · Line: ${lineSt.label}`
                                    : `Production line: ${lineSt.label}`
                                }
                              >
                                {lineSt.label}
                              </span>
                            ),
                            date: <span className="text-ui-xs text-slate-500 tabular-nums">{c.date}</span>,
                          };
                        }}
                      />
                    )}
                    {cuttingLists.length > showCount ? (
                      <SalesShowMoreButton label="Show more cutting lists" onClick={() => setShowCount((c) => c + 20)} />
                    ) : null}
                  </SalesListTableFrame>
  );
}

export function SalesRefundsList({
  searchQuery,
  setSearchQuery,
  refundWorkFilter,
  setRefundWorkFilter,
  salesListSort,
  setSalesListSort,
  filteredRefunds,
  refundWorkRows,
  showCount,
  setShowCount,
  debouncedSearchQuery,
  openNewModal,
  actionMenuKey,
  setActionMenuKey,
  openRefundViewOnly,
  openRefundModal,
}) {
  return (
                  <SalesListTableFrame
                    toolbar={
                      <>
                        <SalesListSearchInput
                          value={searchQuery}
                          onChange={setSearchQuery}
                          placeholder="Search refund ID, customer, quotation, status…"
                          label="Search refunds"
                        />
                        <SalesWorkFilterChip
                          label={
                            refundWorkFilter === 'pending'
                              ? 'Showing pending refunds'
                              : refundWorkFilter === 'awaitingPay'
                                ? 'Showing refunds awaiting Finance payout'
                                : ''
                          }
                          onClear={() => setRefundWorkFilter('all')}
                        />
                        <SalesListSortBar
                          fields={SALES_TABLE_SORT_FIELD_OPTIONS.refund}
                          field={salesListSort.field}
                          dir={salesListSort.dir}
                          onFieldChange={(field) => setSalesListSort((s) => ({ ...s, field }))}
                          onDirToggle={() =>
                            setSalesListSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))
                          }
                        />
                      </>
                    }
                  >
                    {filteredRefunds.length === 0 ? (
                      <ListEmptyState
                        kind={
                          debouncedSearchQuery.trim() || refundWorkFilter !== 'all' ? 'search' : 'empty'
                        }
                        icon={RotateCcw}
                        title={
                          debouncedSearchQuery.trim() || refundWorkFilter !== 'all'
                            ? 'No refunds match'
                            : 'No refunds yet'
                        }
                        description={
                          debouncedSearchQuery.trim() || refundWorkFilter !== 'all'
                            ? 'Clear the search or work filter to see more records.'
                            : 'Refunds are created from settled quotations when returns are approved.'
                        }
                        actionLabel={
                          debouncedSearchQuery.trim() || refundWorkFilter !== 'all'
                            ? 'Clear filters'
                            : 'New refund'
                        }
                        onAction={
                          debouncedSearchQuery.trim() || refundWorkFilter !== 'all'
                            ? () => {
                                setSearchQuery('');
                                setRefundWorkFilter('all');
                              }
                            : openNewModal
                        }
                      />
                    ) : (
                      <SalesRecordsView
                        caption="Refunds"
                        headers={REFUND_TABLE_HEADERS}
                        items={filteredRefunds}
                        itemKey={(r) => `rf-${r.refundID}`}
                        openKey={actionMenuKey}
                        onView={(r) => openRefundViewOnly(r)}
                        viewLabel={(r) => `View refund ${r.refundID}`}
                        testId={(r) => `refund-row-${r.refundID}`}
                        renderMenu={(r) => (
                          <SalesRowMenu
                            rowKey={`rf-${r.refundID}`}
                            openKey={actionMenuKey}
                            setOpenKey={setActionMenuKey}
                            label={`refund ${r.refundID}`}
                            onView={() => openRefundViewOnly(r)}
                            onEdit={() => openRefundModal(r)}
                            editDisabled={false}
                            editTitle=""
                          />
                        )}
                        renderCard={(r) => {
                          const approvedAmountNgn = refundApprovedAmount(r);
                          const paidAmountNgn = Number(r.paidAmountNgn) || 0;
                          const outstandingAmountNgn = refundOutstandingAmount(r);
                          const meta2 = [
                            r.quotationRef || '—',
                            r.approvalDate,
                            approvedAmountNgn > 0 ? `Apvd ${formatNgn(approvedAmountNgn)}` : null,
                            paidAmountNgn > 0 ? `Paid ${formatNgn(paidAmountNgn)}` : null,
                            r.status === 'Approved' && outstandingAmountNgn > 0
                              ? `Bal ${formatNgn(outstandingAmountNgn)}`
                              : null,
                            refundHasCreditConfirmation(r)
                              ? `Refund fund used ${formatNgn(r.creditAppliedNgn || 0)}${
                                  r.creditAppliedToQuotationRef ? ` → ${r.creditAppliedToQuotationRef}` : ''
                                }`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ');
                          return (
                            <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 flex-1 leading-tight">
                                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
                                  <p className="truncate min-w-0">
                                    <span className={SALES_ROW_ID}>{r.refundID}</span>
                                    <span className={SALES_ROW_CUSTOMER}> · {r.customer}</span>
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                    <span className={SALES_ROW_AMOUNT}>
                                      {formatNgn(r.amountNgn)}
                                    </span>
                                    <span className={`${CHIP} ${refundStatusChipClass(refundPublicStatusLabel(r))}`}>
                                      {refundPublicStatusLabel(r)}
                                    </span>
                                    {refundHasCreditConfirmation(r) ? (
                                      <span
                                        className={`${CHIP} bg-sky-100 text-sky-800`}
                                        title="Deducted from refund fund onto another quotation — not refundable again"
                                      >
                                        Refund fund used
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <p
                                  className="text-ui-xs text-slate-500 mt-0.5 leading-snug line-clamp-2 tabular-nums"
                                  title={meta2}
                                >
                                  {meta2}
                                </p>
                              </div>
                            </div>
                          );
                        }}
                        renderCells={(r) => {
                          const approvedAmountNgn = refundApprovedAmount(r);
                          const paidAmountNgn = Number(r.paidAmountNgn) || 0;
                          const outstandingAmountNgn = refundOutstandingAmount(r);
                          const meta2 = [
                            r.quotationRef || '—',
                            r.approvalDate,
                            approvedAmountNgn > 0 ? `Apvd ${formatNgn(approvedAmountNgn)}` : null,
                            paidAmountNgn > 0 ? `Paid ${formatNgn(paidAmountNgn)}` : null,
                            r.status === 'Approved' && outstandingAmountNgn > 0
                              ? `Bal ${formatNgn(outstandingAmountNgn)}`
                              : null,
                            refundHasCreditConfirmation(r)
                              ? `Refund fund used ${formatNgn(r.creditAppliedNgn || 0)}${
                                  r.creditAppliedToQuotationRef ? ` → ${r.creditAppliedToQuotationRef}` : ''
                                }`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ');
                          return {
                            id: (
                              <span className={SALES_ROW_ID}>{r.refundID}</span>
                            ),
                            customer: (
                              <span className={`${SALES_ROW_CUSTOMER} truncate block max-w-[14rem]`}>
                                {r.customer}
                              </span>
                            ),
                            amount: <span className={SALES_ROW_AMOUNT}>{formatNgn(r.amountNgn)}</span>,
                            status: (
                              <span className="inline-flex flex-wrap gap-1">
                                <span className={`${CHIP} ${refundStatusChipClass(refundPublicStatusLabel(r))}`}>
                                  {refundPublicStatusLabel(r)}
                                </span>
                                {refundHasCreditConfirmation(r) ? (
                                  <span
                                    className={`${CHIP} bg-sky-100 text-sky-800`}
                                    title="Deducted from refund fund onto another quotation — not refundable again"
                                  >
                                    Refund fund used
                                  </span>
                                ) : null}
                              </span>
                            ),
                            notes: (
                              <span className="text-ui-xs text-slate-500 line-clamp-2" title={meta2}>
                                {meta2}
                              </span>
                            ),
                          };
                        }}
                      />
                    )}
                    {refundWorkRows.length > showCount ? (
                      <SalesShowMoreButton label="Show more refunds" onClick={() => setShowCount((c) => c + 20)} />
                    ) : null}
                  </SalesListTableFrame>
  );
}
