import React from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Truck,
  Banknote,
  AlertTriangle,
  Pencil,
  Trash2,
  Info,
} from 'lucide-react';

import { MainPanel } from '../../components/layout';
import { EditSecondApprovalInline } from '../../components/EditSecondApprovalInline';
import { editMutationNeedsSecondApprovalRole } from '../../lib/editApprovalUi';
import { CONVERSION_FLAG_RATIO, formatNgn } from '../../Data/mockData';
import { purchaseOrderOrderedValueNgn } from '../../lib/liveAnalytics';
import { procurementKindFromPo } from '../../lib/procurementPoKind';
import {
  SalesListSearchInput,
  SalesListSortBar,
  SalesListTableFrame,
} from '../../components/sales/SalesListTableFrame';
import { PROCUREMENT_PO_SORT_FIELDS } from '../../lib/procurementPoListSorting';
import { kgPerMFromStripDensity } from './procurementTabShared.js';
import { TransportCatchUpPanel } from '../../components/procurement/TransportCatchUpPanel';
import { purchaseOrderTransportGapLabel } from '../../lib/purchaseOrderWorkflow';
import { PAYABLES_SORT_FIELDS } from '../../lib/procurementPayablesSorting';
import { AppTablePager } from '../../components/ui/AppDataTable';
import { PoStatusChip } from '../../components/procurement/PoStatusChip';
import { ProcurementFormSection } from '../../components/procurement/ProcurementFormSection';
import { PriceListPanel } from '../../components/procurement/PriceListPanel';
import { useProcurementPage } from './ProcurementPageContext.jsx';
import { ProcurementPayableRow } from './ProcurementPayableRow.jsx';
import { ProcurementTransportAgentsAside } from './ProcurementTransportAgentsAside.jsx';
import {
  TAB_LABELS,
  PROCUREMENT_PURCHASES_COLUMN_PAGE_SIZE,
  PAYABLES_TABLE_PAGE_SIZE,
  PROCUREMENT_COIL_MATERIALS,
  STANDARD_COIL_GAUGES_MM,
  procurementCoilMaterialByKey,
  poLineSummaryLabel,
  PILL,
  CARD_ROW,
} from './procurementTabShared.js';

export function ProcurementTabPanels() {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    canRecordSupplierPayment,
    payablesOutstandingNgn,
    payablesOpenSearchQuery,
    setPayablesOpenSearchQuery,
    payablesSettledSearchQuery,
    setPayablesSettledSearchQuery,
    payablesOpenSort,
    setPayablesOpenSort,
    payablesSettledSort,
    setPayablesSettledSort,
    sortedOpenPayables,
    sortedSettledPayables,
    openPayablesPage,
    settledPayablesPage,
    todayIso,
    branchNameById,
    wsCanMutate,
    setPreviewAp,
    setPreviewPo,
    openApPaymentModal,
    poTransportMissingLinkRows,
    poTransportFilter,
    setPoTransportFilter,
    openPoTransportLink,
    poTransportAwaitingTreasuryRows,
    wsCanAccessFinance,
    wsCanFinancePay,
    wsSessionUserRoleKey,
    procurementPoForApprovalUi,
    procurementPoEditApprovalId,
    setProcurementPoEditApprovalId,
    poListSort,
    setPoListSort,
    coilPOsSorted,
    stonePOsSorted,
    accessoryPOsSorted,
    mixedPOsSorted,
    coilPoPurchasesPage,
    stonePoPurchasesPage,
    accessoryPoPurchasesPage,
    mixedPoPurchasesPage,
    poTransportMissingLinkIds,
    poTransportCatchUpRows,
    orphanHaulageRows,
    canManagePo,
    openPoPreviewById,
    agents,
    openEditAgent,
    removeAgent,
    openAgentModal,
    transitRowsForAside,
    purchaseOrders,
    filteredSuppliers,
    openEditSupplier,
    removeSupplier,
    canAccessPriceList,
    saveStandardConversion,
    standardConversionForm,
    setStandardConversionForm,
    standardConversionSaving,
    standardPhysicsKgPerM,
    standardEffectiveKgPerM,
    stdOverrideKgPerM,
    setShowMaterialPricingWorkbook,
  } = useProcurementPage();

  return (
        <div className="col-span-full min-w-0 order-2">
          {activeTab === 'payables' ? (
            <div className="flex flex-col gap-4 min-w-0 min-h-[min(60vh,520px)]">
              <div className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
                <div className="h-1 bg-zarewa-teal" />
                <div className="px-4 sm:px-5 py-4 sm:py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <h2 className="text-xl font-bold text-zarewa-teal shrink-0">Payments</h2>
                    <p className="w-full sm:max-w-xl text-ui-xs text-slate-500 leading-snug">
                      Use the <span className="font-semibold text-slate-600">search</span> in each payables list below
                      (open vs settled). Each list has its own sort and shows 10 rows per page.
                    </p>
                  </div>
                </div>
              </div>
              {!canRecordSupplierPayment ? (
                <p className="text-ui-xs text-slate-700 bg-white rounded-lg px-3 py-2 border border-slate-200/90 shadow-sm">
                  <span className="font-semibold">View only:</span> recording payments requires{' '}
                  <span className="font-mono text-ui-xs">finance.pay</span>.
                </p>
              ) : null}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch min-w-0">
                  <div className="min-w-0 flex flex-col min-h-0">
                  <SalesListTableFrame
                    toolbar={
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-ui-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                              <Banknote size={12} className="text-zarewa-teal" />
                              Pending &amp; partial payment
                            </h3>
                            <p className="text-xs text-slate-600 mt-1 leading-snug max-w-2xl">
                              Outstanding or partially paid supplier invoices. Post payments here (
                              <span className="font-semibold text-zarewa-teal">finance.pay</span>).
                            </p>
                          </div>
                          {payablesOutstandingNgn > 0 ? (
                            <p className="text-sm font-black text-zarewa-teal tabular-nums shrink-0">
                              {formatNgn(payablesOutstandingNgn)} outstanding
                            </p>
                          ) : null}
                        </div>
                        <SalesListSearchInput
                          value={payablesOpenSearchQuery}
                          onChange={setPayablesOpenSearchQuery}
                          placeholder="Search AP id, supplier, PO, invoice ref…"
                        />
                        <SalesListSortBar
                          fields={PAYABLES_SORT_FIELDS}
                          field={payablesOpenSort.field}
                          dir={payablesOpenSort.dir}
                          onFieldChange={(field) => setPayablesOpenSort((s) => ({ ...s, field }))}
                          onDirToggle={() =>
                            setPayablesOpenSort((s) => ({
                              ...s,
                              dir: s.dir === 'asc' ? 'desc' : 'asc',
                            }))
                          }
                        />
                      </div>
                    }
                  >
                    {sortedOpenPayables.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-14 px-6 text-center">
                        <p className="text-ui-xs font-semibold text-slate-500 uppercase tracking-widest">
                          No open or partial payables match your search
                        </p>
                      </div>
                    ) : (
                      <>
                        <ul className="space-y-1.5 max-h-[min(40vh,360px)] overflow-y-auto custom-scrollbar">
                          {openPayablesPage.slice.map((p) => (
                            <ProcurementPayableRow
                              key={p.apID}
                              p={p}
                              todayIso={todayIso}
                              branchNameById={branchNameById}
                              canRecordSupplierPayment={canRecordSupplierPayment}
                              wsCanMutate={wsCanMutate}
                              onOpenPreview={() => {
                                setPreviewAp(p);
                                setPreviewPo(null);
                              }}
                              onOpenPay={() => {
                                openApPaymentModal(p);
                              }}
                            />
                          ))}
                        </ul>
                        <div className="mt-3 text-ui-xs text-slate-600 [&_button]:rounded-lg [&_button]:px-2 [&_button]:py-1 [&_button]:text-ui-xs [&_p]:text-ui-xs">
                          <AppTablePager
                            showingFrom={openPayablesPage.showingFrom}
                            showingTo={openPayablesPage.showingTo}
                            total={openPayablesPage.total}
                            hasPrev={openPayablesPage.hasPrev}
                            hasNext={openPayablesPage.hasNext}
                            onPrev={openPayablesPage.goPrev}
                            onNext={openPayablesPage.goNext}
                            pageSize={PAYABLES_TABLE_PAGE_SIZE}
                          />
                        </div>
                      </>
                    )}
                  </SalesListTableFrame>
                  </div>

                  <div className="min-w-0 flex flex-col min-h-0">
                  <SalesListTableFrame
                    toolbar={
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-ui-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                              <Banknote size={12} className="text-emerald-700" />
                              Fully paid
                            </h3>
                            <p className="text-xs text-slate-600 mt-1 leading-snug max-w-2xl">
                              Supplier invoices that are paid in full (including when paid equals invoice amount).
                            </p>
                          </div>
                          <p className="text-ui-xs font-bold text-slate-500 tabular-nums shrink-0">
                            {sortedSettledPayables.length} settled
                          </p>
                        </div>
                        <SalesListSearchInput
                          value={payablesSettledSearchQuery}
                          onChange={setPayablesSettledSearchQuery}
                          placeholder="Search AP id, supplier, PO, invoice ref…"
                        />
                        <SalesListSortBar
                          fields={PAYABLES_SORT_FIELDS}
                          field={payablesSettledSort.field}
                          dir={payablesSettledSort.dir}
                          onFieldChange={(field) => setPayablesSettledSort((s) => ({ ...s, field }))}
                          onDirToggle={() =>
                            setPayablesSettledSort((s) => ({
                              ...s,
                              dir: s.dir === 'asc' ? 'desc' : 'asc',
                            }))
                          }
                        />
                      </div>
                    }
                  >
                    {sortedSettledPayables.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-14 px-6 text-center">
                        <p className="text-ui-xs font-semibold text-slate-500 uppercase tracking-widest">
                          No settled payables match your search
                        </p>
                      </div>
                    ) : (
                      <>
                        <ul className="space-y-1.5 max-h-[min(40vh,360px)] overflow-y-auto custom-scrollbar">
                          {settledPayablesPage.slice.map((p) => (
                            <ProcurementPayableRow
                              key={p.apID}
                              p={p}
                              todayIso={todayIso}
                              branchNameById={branchNameById}
                              canRecordSupplierPayment={canRecordSupplierPayment}
                              wsCanMutate={wsCanMutate}
                              onOpenPreview={() => {
                                setPreviewAp(p);
                                setPreviewPo(null);
                              }}
                              onOpenPay={() => {
                                openApPaymentModal(p);
                              }}
                            />
                          ))}
                        </ul>
                        <div className="mt-3 text-ui-xs text-slate-600 [&_button]:rounded-lg [&_button]:px-2 [&_button]:py-1 [&_button]:text-ui-xs [&_p]:text-ui-xs">
                          <AppTablePager
                            showingFrom={settledPayablesPage.showingFrom}
                            showingTo={settledPayablesPage.showingTo}
                            total={settledPayablesPage.total}
                            hasPrev={settledPayablesPage.hasPrev}
                            hasNext={settledPayablesPage.hasNext}
                            onPrev={settledPayablesPage.goPrev}
                            onNext={settledPayablesPage.goNext}
                            pageSize={PAYABLES_TABLE_PAGE_SIZE}
                          />
                        </div>
                      </>
                    )}
                  </SalesListTableFrame>
                  </div>
                  </div>
                </div>
          ) : (
          <MainPanel className="!rounded-xl !border-slate-200/90 !shadow-sm !bg-white !p-0 overflow-hidden !min-h-0 sm:!min-h-[360px]">
            <div className="h-1 bg-zarewa-teal" />
            <div className="p-4 sm:p-5 md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="text-xl font-bold text-zarewa-teal shrink-0">
                  {TAB_LABELS[activeTab] ?? 'Records'}
                </h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end flex-1 w-full min-w-0">
                  <div className="relative flex-1 w-full sm:max-w-xs min-w-0">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      size={16}
                    />
                    <input
                      type="search"
                      placeholder="Search purchase orders & suppliers…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-zarewa-teal/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/25"
                    />
                  </div>
                  {activeTab === 'purchases' || activeTab === 'conversion' ? (
                    <div className="flex justify-end sm:justify-center shrink-0">
                      <details className="relative shrink-0">
                        <summary
                          className="list-none cursor-pointer rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/25 [&::-webkit-details-marker]:hidden"
                          aria-label="About kg per metre conversion and variance flags"
                        >
                          <Info className="size-3.5" strokeWidth={2.25} aria-hidden />
                        </summary>
                        <div
                          role="note"
                          className="absolute right-0 top-full z-20 mt-1.5 w-[min(calc(100vw-2rem),20rem)] rounded-lg border border-slate-200 bg-white p-2.5 text-ui-xs leading-snug text-slate-700 shadow-lg ring-1 ring-black/5"
                        >
                          <strong className="text-slate-800">Conversion</strong> — kg/m = kg ÷ metres. Flag when actual
                          kg/m is above offer or standard by ~{Math.round((CONVERSION_FLAG_RATIO - 1) * 100)}%.
                        </div>
                      </details>
                    </div>
                  ) : null}
                </div>
              </div>

              {activeTab === 'purchases' && (
                <div className="space-y-3">
                  {poTransportMissingLinkRows.length > 0 ? (
                    <div className="rounded-xl border border-amber-200/90 bg-amber-50/95 px-3 py-2.5 sm:px-4 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-ui-xs font-bold uppercase tracking-wide text-amber-950 flex items-center gap-1.5">
                            <AlertTriangle className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                            POs need transport linked
                          </p>
                          <p className="text-ui-xs text-amber-950/85 mt-1 leading-relaxed">
                            {poTransportMissingLinkRows.length} purchase order
                          {poTransportMissingLinkRows.length !== 1 ? 's' : ''} approved or in transit without haulier
                          and/or quoted fee. Link transport before Finance can record haulage payout.
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveTab('transport')}
                          className="text-ui-xs font-bold uppercase text-amber-950 underline-offset-2 hover:underline"
                        >
                          Open catch-up table
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPoTransportFilter((f) => (f === 'needs_transport' ? 'all' : 'needs_transport'))
                          }
                          className="text-ui-xs font-bold uppercase text-amber-950/80 underline-offset-2 hover:underline"
                        >
                          {poTransportFilter === 'needs_transport' ? 'Show all POs' : 'Filter list'}
                        </button>
                      </div>
                      </div>
                      <ul className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                        {poTransportMissingLinkRows.slice(0, 8).map((row) => (
                          <li key={row.poID}>
                            <button
                              type="button"
                              onClick={() => openPoTransportLink(row.poID)}
                              className="w-full text-left rounded-lg border border-amber-200/80 bg-white/80 px-2.5 py-1.5 hover:bg-white transition-colors"
                            >
                              <p className="text-ui-xs font-bold text-amber-950">
                                <span className="font-mono">{row.poID}</span>
                                <span className="font-medium text-amber-900/90"> · {row.supplierName}</span>
                                <span className="font-normal text-amber-900/75"> · {row.status}</span>
                              </p>
                              <p className="text-ui-xs text-amber-900/70 mt-0.5">
                                {row.gapKind === 'fee'
                                  ? 'Fee missing'
                                  : row.gapKind === 'agent'
                                    ? 'Haulier missing'
                                    : 'Haulier and fee missing'}
                                {Number(row.supplierPaidNgn) > 0 ? ' · Supplier already paid' : ''}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                      {poTransportMissingLinkRows.length > 8 ? (
                        <p className="text-ui-xs text-amber-900/70">
                          +{poTransportMissingLinkRows.length - 8} more — use filter to see all in the list below.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {poTransportAwaitingTreasuryRows.length > 0 ? (
                    <div className="rounded-xl border border-sky-200/80 bg-sky-50/90 px-3 py-2.5 sm:px-4 flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-ui-xs font-bold uppercase tracking-wide text-sky-950 flex items-center gap-1.5">
                          <Truck className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                          PO haulage awaiting treasury payout
                        </p>
                        <p className="text-ui-xs text-sky-950/85 mt-1 leading-relaxed">
                          {poTransportAwaitingTreasuryRows.length} open line
                          {poTransportAwaitingTreasuryRows.length !== 1 ? 's' : ''} (quoted transport fee exceeds
                          treasury-paid). Finance records the bank or cash payout so balances stay correct.
                        </p>
                      </div>
                      {wsCanAccessFinance ? (
                        <Link
                          to="/accounts"
                          className="shrink-0 text-ui-xs font-bold uppercase text-sky-900 underline-offset-2 hover:underline"
                        >
                          Open Finance — Treasury
                        </Link>
                      ) : (
                        <span className="shrink-0 text-ui-xs font-semibold text-sky-900/80 max-w-[12rem] text-right leading-snug">
                          Ask Finance to post haulage under Finance → Treasury.
                        </span>
                      )}
                    </div>
                  ) : null}
                  {editMutationNeedsSecondApprovalRole(wsSessionUserRoleKey) && procurementPoForApprovalUi ? (
                    <div className="mb-2">
                      <EditSecondApprovalInline
                        entityKind="purchase_order"
                        changeSummary="Edit purchase order lines, dates, or supplier details"
                        entityId={procurementPoForApprovalUi}
                        value={procurementPoEditApprovalId}
                        onChange={setProcurementPoEditApprovalId}
                      />
                    </div>
                  ) : null}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-3 sm:px-4">
                    <SalesListSortBar
                      fields={PROCUREMENT_PO_SORT_FIELDS}
                      field={poListSort.field}
                      dir={poListSort.dir}
                      onFieldChange={(field) => setPoListSort((s) => ({ ...s, field }))}
                      onDirToggle={() =>
                        setPoListSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))
                      }
                    />
                  </div>
                  <p className="text-ui-xs text-slate-500 leading-snug">
                    Click a PO row to open the side panel — approve, reject, transport, transport fee, and edit
                    actions are there (fewer buttons on each row keeps the list lighter).
                  </p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 min-w-0">
                    {[
                      {
                        title: 'Coil (kg)',
                        list: coilPOsSorted,
                        page: coilPoPurchasesPage,
                        empty: 'No coil purchase orders.',
                      },
                      {
                        title: 'Stone-coated (m)',
                        list: stonePOsSorted,
                        page: stonePoPurchasesPage,
                        empty: 'No stone-coated POs.',
                      },
                      {
                        title: 'Accessories',
                        list: accessoryPOsSorted,
                        page: accessoryPoPurchasesPage,
                        empty: 'No accessory POs.',
                      },
                      {
                        title: 'Mixed',
                        list: mixedPOsSorted,
                        page: mixedPoPurchasesPage,
                        empty: 'No mixed purchase orders.',
                      },
                    ].map((col) => (
                      <div key={col.title} className="min-w-0 flex flex-col">
                        <h3 className="text-ui-xs font-bold uppercase tracking-wide text-slate-600 mb-2 border-b border-slate-200 pb-1">
                          {col.title}
                        </h3>
                        {col.list.length === 0 ? (
                          <p className="text-ui-xs text-slate-400 py-3">{col.empty}</p>
                        ) : (
                          <>
                          <ul className="space-y-1.5 flex-1 min-h-0">
                            {col.page.slice.map((p) => {
                              const pk = procurementKindFromPo(p);
                              const lineCount = Array.isArray(p?.lines) ? p.lines.length : 0;
                              const meta2 = [
                                p.orderDateISO,
                                `${lineCount} ${poLineSummaryLabel(pk)}`,
                                p.transportAgentName,
                                p.transportReference ? `Ref ${p.transportReference}` : null,
                                p.transportTreasuryMovementId ? `Treasury ${p.transportTreasuryMovementId}` : null,
                                p.transportAmountNgn ? `Transport fee ${formatNgn(p.transportAmountNgn)}` : null,
                                p.transportPaid ? 'Transport fee paid' : null,
                                `Supplier paid ${formatNgn(p.supplierPaidNgn || 0)}`,
                                p.transportNote ? `Note: ${p.transportNote}` : null,
                              ]
                                .filter(Boolean)
                                .join(' · ');
                              return (
                        <li
                          key={p.poID}
                          className={`${CARD_ROW} cursor-pointer`}
                          onClick={() => {
                            setPreviewPo(p);
                            setPreviewAp(null);
                          }}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                            <div className="min-w-0 leading-tight flex-1">
                              <div className="flex items-center justify-between gap-2 min-w-0">
                                <p className="text-xs font-bold text-zarewa-teal truncate min-w-0">
                                  <span className="font-mono">{p.poID}</span>
                                  <span className="font-medium text-slate-600"> · {p.supplierName}</span>
                                </p>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {poTransportMissingLinkIds.has(p.poID) ? (
                                    <span
                                      className="text-[7px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-900"
                                      title={purchaseOrderTransportGapLabel(p)}
                                    >
                                      Transport
                                    </span>
                                  ) : null}
                                  <span
                                    className="text-xs font-black text-zarewa-teal tabular-nums"
                                    title="Ordered value: each line uses ₦/m (stone), ₦/unit or ₦/kg (accessory), or ₦/kg (coil), including legacy rows with only per-kg price."
                                  >
                                    {formatNgn(purchaseOrderOrderedValueNgn(p))}
                                  </span>
                                  <PoStatusChip status={p.status} />
                                </div>
                              </div>
                              <p
                                className="text-ui-xs text-slate-500 mt-0.5 leading-snug line-clamp-2"
                                title={meta2}
                              >
                                {meta2}
                              </p>
                            </div>
                          </div>
                                </li>
                              );
                            })}
                          </ul>
                          <div className="mt-2 text-ui-xs text-slate-600 [&_button]:rounded-lg [&_button]:px-2 [&_button]:py-1 [&_button]:text-ui-xs [&_p]:text-ui-xs">
                            <AppTablePager
                              showingFrom={col.page.showingFrom}
                              showingTo={col.page.showingTo}
                              total={col.page.total}
                              hasPrev={col.page.hasPrev}
                              hasNext={col.page.hasNext}
                              onPrev={col.page.goPrev}
                              onNext={col.page.goNext}
                              pageSize={PROCUREMENT_PURCHASES_COLUMN_PAGE_SIZE}
                            />
                          </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'transport' && (
                <TransportCatchUpPanel
                  catchUpRows={poTransportCatchUpRows}
                  orphanRows={orphanHaulageRows}
                  branchNameById={branchNameById}
                  canManagePo={canManagePo}
                  canFinancePay={wsCanFinancePay}
                  onLinkTransport={openPoTransportLink}
                  onOpenPo={openPoPreviewById}
                />
              )}

              {activeTab === 'suppliers' && (
                <div className="flex flex-col lg:flex-row gap-4 items-stretch min-h-[min(52vh,480px)]">
                  <ProcurementTransportAgentsAside
                    agents={agents}
                    onEdit={openEditAgent}
                    onRemove={removeAgent}
                    onRegister={openAgentModal}
                    transitRows={transitRowsForAside}
                    onPreviewTransitPo={(poId) => {
                      const fullPo = purchaseOrders.find((po) => po.poID === poId);
                      if (fullPo) {
                        setPreviewPo(fullPo);
                        setPreviewAp(null);
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                {filteredSuppliers.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
                    No suppliers match this search.
                  </p>
                ) : (
                <ul className="space-y-1.5">
                    {filteredSuppliers.map((s) => (
                      <li
                        key={s.supplierID}
                        className={`${CARD_ROW} flex items-stretch gap-0 !p-0 overflow-hidden`}
                      >
                        <Link
                          to={`/procurement/suppliers/${encodeURIComponent(s.supplierID)}`}
                          className="flex-1 min-w-0 py-1.5 px-2.5 hover:bg-zarewa-teal/[0.04] transition-colors leading-tight"
                        >
                          <p className="text-xs font-bold text-zarewa-teal truncate">
                            <span className="font-mono">{s.supplierID}</span>
                            <span className="font-medium text-slate-600"> · {s.name}</span>
                          </p>
                          <p className="text-ui-xs text-slate-500 mt-0.5">
                            {s.city || '—'} · <span className="font-semibold text-sky-800">Profile →</span>
                          </p>
                        </Link>
                        <div className="flex items-center pr-1 border-l border-slate-200/80 bg-white/60 shrink-0">
                          <button
                            type="button"
                            title="Edit"
                            onClick={(e) => {
                              e.preventDefault();
                              openEditSupplier(s);
                            }}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-zarewa-teal"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={(e) => {
                              e.preventDefault();
                              void removeSupplier(s);
                            }}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </li>
                    ))}
                </ul>
                )}
                  </div>
                </div>
              )}

              {activeTab === 'conversion' && (
                <div
                  className={`grid grid-cols-1 gap-4 min-w-0 items-stretch ${
                    canAccessPriceList ? 'lg:grid-cols-2' : ''
                  }`}
                >
                  <div className="rounded-xl border border-slate-200/90 bg-white/90 shadow-sm p-4 sm:p-5 min-w-0 flex flex-col">
                    <ProcurementFormSection letter="S" title="Standard conversion (density & gauges)" compact>
                    <p className="text-ui-xs text-slate-600 mb-2 leading-relaxed">
                      Theoretical <strong className="text-slate-800">kg/m</strong> for{' '}
                      <strong className="text-slate-800">1.2 m</strong> strip width:{' '}
                      <span className="font-mono">ρ × 1.2 × (gauge_mm ÷ 1000)</span>.
                      Densities (as you specified):{' '}
                      <strong className="text-slate-800">Aluminium 2.7 g/cm³</strong>,{' '}
                      <strong className="text-slate-800">Aluzinc (PPGI) 7.8 g/cm³</strong>.                       Stonecoated is not included
                      here — different material / build-up. Saved rows are matched to coils by stock product and gauge
                      (and colour when listed) and used as the <strong className="text-slate-800">standard kg/m</strong> in
                      production conversion checks.
                    </p>
                    <div className="z-scroll-x mb-3 overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                      <table className="min-w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
                            <th className="py-2.5 px-3">Gauge (mm)</th>
                            <th className="py-2.5 px-3">Aluminium kg/m</th>
                            <th className="py-2.5 px-3">Aluzinc (PPGI) kg/m</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {STANDARD_COIL_GAUGES_MM.map((gLabel) => {
                            const mm = parseFloat(gLabel, 10);
                            const alu = kgPerMFromStripDensity('alu', mm);
                            const az = kgPerMFromStripDensity('aluzinc', mm);
                            return (
                              <tr key={gLabel} className="hover:bg-teal-50/30">
                                <td className="py-2.5 px-3 font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                                  {gLabel}
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-zarewa-teal whitespace-nowrap">
                                  {alu == null ? '—' : alu.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-zarewa-teal whitespace-nowrap">
                                  {az == null ? '—' : az.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <form className="space-y-3" onSubmit={saveStandardConversion}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">Material</label>
                          <select
                            required
                            value={standardConversionForm.materialKey}
                            onChange={(e) => {
                              const key = e.target.value;
                              const opt = procurementCoilMaterialByKey(key);
                              setStandardConversionForm((f) => ({
                                ...f,
                                materialKey: key,
                                color: opt.defaultCatalogLabel,
                              }));
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2.5 text-xs font-semibold"
                          >
                            {PROCUREMENT_COIL_MATERIALS.map((m) => (
                              <option key={m.key} value={m.key}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">Gauge (mm)</label>
                          <select
                            required
                            value={standardConversionForm.gauge}
                            onChange={(e) =>
                              setStandardConversionForm((f) => ({ ...f, gauge: e.target.value }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2.5 text-xs font-semibold"
                          >
                            {STANDARD_COIL_GAUGES_MM.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">
                          Catalogue label (colour / grade)
                        </label>
                        <input
                          value={standardConversionForm.color}
                          onChange={(e) =>
                            setStandardConversionForm((f) => ({ ...f, color: e.target.value }))
                          }
                          placeholder="Defaults from material; override e.g. IV, GB, HMB"
                          className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2.5 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">
                          Override kg/m (optional)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.000001"
                          value={standardConversionForm.conversionKgPerM}
                          onChange={(e) =>
                            setStandardConversionForm((f) => ({ ...f, conversionKgPerM: e.target.value }))
                          }
                          placeholder="Leave empty to use density calculation"
                          className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2.5 text-xs font-semibold tabular-nums"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`${PILL} bg-sky-100 text-sky-900`}>
                          Density kg/m:{' '}
                          {standardPhysicsKgPerM == null ? '—' : standardPhysicsKgPerM.toFixed(2)}
                        </span>
                        <span className={`${PILL} border border-slate-200 bg-white text-slate-700`}>
                          Will save:{' '}
                          {standardEffectiveKgPerM == null ? '—' : standardEffectiveKgPerM.toFixed(2)} kg/m
                        </span>
                        {Number.isFinite(stdOverrideKgPerM) && stdOverrideKgPerM > 0 ? (
                          <span className={`${PILL} bg-amber-100 text-amber-900`}>Using override</span>
                        ) : null}
                      </div>
                      <div>
                        <label className="text-ui-xs font-bold text-slate-400 uppercase block mb-1">Note</label>
                        <input
                          value={standardConversionForm.label}
                          onChange={(e) =>
                            setStandardConversionForm((f) => ({ ...f, label: e.target.value }))
                          }
                          placeholder="Optional (defaults to Standard (density) · material · gauge mm)"
                          className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2.5 text-xs font-semibold"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={standardConversionSaving || !wsCanMutate}
                        className="z-btn-primary w-full sm:w-auto justify-center py-2.5 px-4 text-xs disabled:opacity-50"
                      >
                        {standardConversionSaving ? 'Saving…' : 'Save standard conversion'}
                      </button>
                    </form>
                  </ProcurementFormSection>
                  </div>

                  {canAccessPriceList ? (
                    <div className="rounded-xl border border-slate-200/90 bg-white/90 shadow-sm p-4 sm:p-5 min-w-0 flex flex-col">
                      <ProcurementFormSection letter="P" title="Price list (minimum ₦/m)" compact>
                        <p className="text-ui-xs text-slate-600 mb-2 leading-relaxed">
                          Minimum price per metre by gauge and design. Production can be blocked when a quotation is
                          below list until the MD records a price exception.
                        </p>
                        <div className="flex flex-wrap justify-end gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => setShowMaterialPricingWorkbook(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zarewa-teal/30 bg-zarewa-teal/5 px-3 py-2 text-ui-xs font-black uppercase text-zarewa-teal hover:bg-zarewa-teal/10"
                          >
                            Material pricing workbook
                          </button>
                        </div>
                        <PriceListPanel embedded />
                      </ProcurementFormSection>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </MainPanel>
          )}
        </div>
  );
}
