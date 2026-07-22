import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  Scissors,
  Receipt as ReceiptIcon,
  RotateCcw,
  RefreshCw,
  Banknote,
  Wallet,
  Pencil,
  Package,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCircle,
  Printer,
  Bell,
} from 'lucide-react';

import SalesCustomersTab from '../components/sales/SalesCustomersTab';
import { ListEmptyState } from '../components/ui/ListEmptyState';
import SalesCustomerCreateModal from '../components/sales/SalesCustomerCreateModal';
import SalesCuttingListMaterialPanel from '../components/sales/SalesCuttingListMaterialPanel';
import { SalesRowMenu } from '../components/sales/SalesRowMenu';
import {
  ReceiptsTransactionsPanel,
  ReceiptsAdvancesPanel,
  ReceiptsUnlinkedDepositsPanel,
} from '../components/sales/SalesReceiptsSidebar';
import {
  mergeReceiptRowsForSales,
  cuttingListByQuotationRefMap,
  receiptCuttingListLinkMeta,
} from '../lib/salesReceiptsList';
import {
  paymentCountByQuotationRef,
  quotationDisplayPaymentStatus,
  quotationEffectivePaidNgn,
  quotationListPaymentMeta,
} from '../lib/quotationPaymentSummary';
import { loadLedgerEntries } from '../lib/customerLedgerStore';
import { dismissAdvanceEntryId } from '../lib/advanceEntryUiStore';
import LinkAdvanceModal from '../components/sales/LinkAdvanceModal';
import { ModalFrame } from '../components/layout';
import { PrintModalPortal } from '../components/layout/PrintModalPortal';
import { AdvancePaymentPrintView } from '../components/receipt/ReceiptPrintViews';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { humanizeReactError } from '../lib/reactErrorMessage.js';

const QuotationModal = lazyWithRetry(() => import('../components/QuotationModal'), { id: 'QuotationModal' });
const ReceiptModal = lazyWithRetry(() => import('../components/ReceiptModal'), { id: 'ReceiptModal' });
import {
  receiptMatchesSalesPaymentFilter,
  receiptSalesPaymentFilterBucket,
  receiptSalesPaymentStatusChipClass,
  receiptSalesPaymentStatusLabel,
  receiptSalesPaymentStatusTitle,
} from '../lib/receiptClearance.js';
import {
  SalesReceiptAwaitingAlert,
  SalesReceiptPaymentStatusFilter,
  SalesReceiptPaymentStatusLegend,
} from '../components/sales/SalesReceiptPaymentUi';
const AdvancePaymentModal = lazyWithRetry(() => import('../components/AdvancePaymentModal'), {
  id: 'AdvancePaymentModal',
});
const CuttingListModal = lazyWithRetry(() => import('../components/CuttingListModal'), { id: 'CuttingListModal' });
const RefundModal = lazyWithRetry(() => import('../components/RefundModal'), { id: 'RefundModal' });
import { MainPanel, PageHeader, PageShell, PageTabs } from '../components/layout';
import SalesMobileAlertStrip from '../components/sales/SalesMobileAlertStrip';
import SalesKpiStrip from '../components/sales/SalesKpiStrip';
import {
  SALES_STATUS_CHIP,
  quoteApprovalChipClass,
  quotePayChipClass,
  receiptCuttingListChipClass,
  receiptSourceChipClass,
  refundStatusChipClass,
} from '../lib/salesStatusUi';
import { WorkspaceExpenseQuickActions } from '../components/workspace/WorkspaceExpenseQuickActions';
import { AiAskButton } from '../components/AiAskButton';
import { ZareHelpButton } from '../components/ZareHelpButton';
import { formatNgn } from '../Data/mockData';
import { useToast } from '../context/ToastContext';
import { useCustomers } from '../context/CustomersContext';
import { useInventory } from '../context/InventoryContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useWorkspaceDomain } from '../hooks/useWorkspaceDomain';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { spotPricesForSalesSidebar } from '../lib/spotPricesFromMasterData';
import { apiFetch } from '../lib/apiBase';
import { appConfirm } from '../lib/appConfirm';
import {
  fetchEligibleRefundQuotationsCached,
  invalidateEligibleRefundQuotationsCache,
} from '../lib/refundEligibleQuotationsCache';
import { quotationMeetsRefundPickerFloor } from '../shared/refundConstants.js';
import { computeCuttingListMaterialReadiness } from '../lib/salesCuttingListMaterialReadiness';
import {
  SALES_TABLE_SORT_FIELD_OPTIONS,
  sortQuotationsList,
  sortReceiptsList,
  sortCuttingLists,
  sortRefundsList,
} from '../lib/salesListSorting';
import {
  SalesListTableFrame,
  SalesListSearchInput,
  SalesListSortBar,
} from '../components/sales/SalesListTableFrame';
import {
  QUOTATION_FOLLOWUP_START_DAY,
  QUOTATION_VALIDITY_DAYS,
  isQuotationArchivedRow,
  quotationNeedsFollowUpAlert,
} from '../lib/quotationLifecycleUi';
import {
  SALES_ROLE_LABELS,
  loadSalesWorkspaceRole,
  canEditQuotation,
  quotationEditBlockedReason,
  canEditCuttingList,
  cuttingListEditBlockedReason,
} from '../lib/salesWorkspaceAccess';
import {
  normalizeRefund,
  refundApprovedAmount,
  refundOutstandingAmount,
  approvedRefundsAwaitingPayment,
  userMayApproveRefundRequests,
} from '../lib/refundsStore';
import { pickProductionJobForCuttingList } from '../lib/productionJobPick';
import { productionQueueLineStatusPresentation } from '../lib/productionQueueLineStatus';
import { assessCuttingListQuotationConsumption } from '../lib/cuttingListBlankConsumption';
import { quotationIsAccessoriesOnlyForProduction } from '../lib/quotationProductionLines';
import {
  cuttingListMinPaidFractionFromSession,
  meetsCuttingListPayThreshold,
} from '../lib/cuttingListPaymentGate';
import {
  buildStockVerdict,
  coilLotRemainingKg,
  colourShort,
  firstGaugeNumeric,
  isCoilLotUnavailableForPlanning,
  roughMetersFromKg,
} from '../lib/salesStockCore';
import {
  mergeStockColourSelectOptions,
  stockCheckSelectOptionsFromCoilRows,
  stockCheckSelectOptionsFromMasterData,
  stockRowMatchesColourFilter,
  stockRowMatchesMaterialTypeFilter,
} from '../lib/stockCheckMasterOptions';
const TAB_LABELS = {
  quotations: 'Quotations',
  receipts: 'Payments',
  cuttinglist: 'Cutting list',
  refund: 'Refunds',
  customers: 'Customers',
};

const REFUND_POTENTIAL_SIDEBAR_CAP = 18;

/** Compact rows — aligned with Stock / Ops / Finance / Procurement */
const CARD_ROW =
  'rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md py-1.5 px-2.5 shadow-sm transition-colors hover:bg-white/70';

const CHIP = SALES_STATUS_CHIP;

/** Lift row above following siblings so overflow action menus paint on top (stacking order). */
function salesListItemClass(rowKey, openKey) {
  return openKey === rowKey ? `${CARD_ROW} relative z-50` : CARD_ROW;
}

const Sales = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { show: showToast } = useToast();
  const { customers: customerRecords } = useCustomers();
  const { products: invProducts, coilLots } = useInventory();
  const ws = useWorkspace();
  const wsRefresh = ws?.refresh;
  const wsCanMutate = ws?.canMutate;
  const wsHasPermission = ws?.hasPermission;
  useWorkspaceDomain('sales');

  const [activeTab, setActiveTab] = useState('quotations');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCuttingModal, setShowCuttingModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundModalMode, setRefundModalMode] = useState('create');
  const [refundModalKey, setRefundModalKey] = useState(0);

  const [selectedItem, setSelectedItem] = useState(null);
  const [actionMenuKey, setActionMenuKey] = useState(null);
  const [quotationAccessMode, setQuotationAccessMode] = useState('edit');
  const [receiptAccessMode, setReceiptAccessMode] = useState('add');
  const [cuttingAccessMode, setCuttingAccessMode] = useState('edit');
  const [customerAddOpen, setCustomerAddOpen] = useState(false);
  const [customerCreateFromQuotation, setCustomerCreateFromQuotation] = useState(false);
  const [quotationCustomerPick, setQuotationCustomerPick] = useState(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [preselectedBankDepositId, setPreselectedBankDepositId] = useState('');
  const [linkAdvanceEntry, setLinkAdvanceEntry] = useState(null);
  const [advanceViewEntry, setAdvanceViewEntry] = useState(null);
  const [advancePrintEntry, setAdvancePrintEntry] = useState(null);
  const [ledgerNonce, setLedgerNonce] = useState(0);
  const [adminSalesReconcileBusy, setAdminSalesReconcileBusy] = useState(false);
  const [showCount, setShowCount] = useState(20);
  const [showArchivedQuotations, setShowArchivedQuotations] = useState(false);
  const [salesListSort, setSalesListSort] = useState({ field: 'id', dir: 'desc' });
  const [receiptPaymentStatusFilter, setReceiptPaymentStatusFilter] = useState('all');
  const [stockMatType, setStockMatType] = useState('');
  const [stockGaugeFilter, setStockGaugeFilter] = useState('');
  const [stockColourFilter, setStockColourFilter] = useState('');
  const [eligibleRefundQuotations, setEligibleRefundQuotations] = useState([]);
  const salesRole = loadSalesWorkspaceRole(ws?.session?.user?.roleKey);
  const roleKey = String(ws?.session?.user?.roleKey || '').toLowerCase();
  const isAdminRole = roleKey === 'admin';
  const canDeleteSalesRecord = ['admin', 'md', 'sales_manager', 'branch_manager'].includes(roleKey);
  const salesRoleLabel = ws?.session?.user?.roleLabel ?? SALES_ROLE_LABELS[salesRole] ?? salesRole;
  /** Branch manager & MD hold refunds.approve; finance holds finance.approve; admin has *. Cashiers pay only (Phase 11A). */
  const canApproveRefunds = userMayApproveRefundRequests(ws);
  const confirmDangerousDelete = useCallback(async (recordLabel, typedPhrase = 'DELETE') => {
    const proceed = await appConfirm({
      title: 'Delete',
      message: `DANGER: Delete ${recordLabel} permanently?\n\nThis action is irreversible and may remove linked records.`,
      variant: 'danger',
    });
    if (!proceed) return false;
    const typed = window.prompt(`Type "${typedPhrase}" to confirm deleting ${recordLabel}.`, '');
    return String(typed || '').trim().toUpperCase() === String(typedPhrase).trim().toUpperCase();
  }, []);

  const bumpLedger = useCallback(() => setLedgerNonce((n) => n + 1), []);

  const quotations = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.quotations) ? ws.snapshot.quotations : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.quotations]
  );
  const importedReceipts = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.receipts) ? ws.snapshot.receipts : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.receipts]
  );
  const cuttingLists = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.cuttingLists) ? ws.snapshot.cuttingLists : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.cuttingLists]
  );
  const productionJobs = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.productionJobs) ? ws.snapshot.productionJobs : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.productionJobs]
  );
  const yardRegister = useMemo(
    () => (Array.isArray(ws?.snapshot?.yardCoilRegister) ? ws.snapshot.yardCoilRegister : []),
    [ws?.snapshot?.yardCoilRegister]
  );

  const spotPrices = useMemo(
    () =>
      spotPricesForSalesSidebar(ws?.snapshot?.masterData, ws?.snapshot?.priceListItems, ws?.session),
    [ws?.snapshot?.masterData, ws?.snapshot?.priceListItems, ws?.session]
  );

  const refunds = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.refunds)
        ? ws.snapshot.refunds
            .filter((r) => r && typeof r === 'object')
            .map((r) => normalizeRefund(r))
        : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.refunds]
  );

  const salesTab = TAB_LABELS[activeTab] ? activeTab : 'quotations';

  useEffect(() => {
    if (!TAB_LABELS[activeTab]) {
      setActiveTab('quotations');
    }
  }, [activeTab]);

  const ledgerSyncKey = ledgerNonce + (ws?.refreshEpoch ?? 0);

  const onLedgerSynced = useCallback(async () => {
    bumpLedger();
    if (wsCanMutate) await wsRefresh?.();
  }, [bumpLedger, wsCanMutate, wsRefresh]);

  const runAdminSalesDerivedReconcile = useCallback(async () => {
    if (!isAdminRole) return;
    if (!ws?.canMutate) {
      showToast('System offline (read-only). Reconnect and refresh, then try again.', { variant: 'error' });
      return;
    }
    const proceed = await appConfirm({
      message:
        'Administrator maintenance: rebuild every Sales receipt mirror from ledger RECEIPT rows and recalculate paid amounts on all quotations in the current branch filter.\n\nThis does not change the ledger. It may take a while on large databases.\n\nContinue?',
    });
    if (!proceed) return;
    setAdminSalesReconcileBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/admin/reconcile-sales-derived', {
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Reconcile job failed.', { variant: 'error' });
        return;
      }
      const failN = data.failures?.length ?? 0;
      showToast(
        `Rebuilt sales mirrors for ${data.processed ?? 0} quotations (${data.quotationsPaidChanged ?? 0} paid totals changed).${
          failN > 0 ? ` ${failN} quotation(s) reported errors — check server audit log.` : ''
        }`,
        { variant: failN > 0 ? 'warning' : 'success' }
      );
      await onLedgerSynced();
    } finally {
      setAdminSalesReconcileBusy(false);
    }
  }, [isAdminRole, ws?.canMutate, showToast, onLedgerSynced]);

  const consumeQuotationCustomerPick = useCallback(() => setQuotationCustomerPick(null), []);
  const requestNewCustomerFromQuotation = useCallback(() => {
    setCustomerCreateFromQuotation(true);
    setCustomerAddOpen(true);
  }, []);
  const handleCustomerCreateModalClose = useCallback(() => {
    setCustomerAddOpen(false);
    setCustomerCreateFromQuotation(false);
  }, []);
  const handleCustomerCreated = useCallback(
    (p) => {
      if (customerCreateFromQuotation && p?.customerID) {
        setQuotationCustomerPick(p);
      }
      setCustomerCreateFromQuotation(false);
    },
    [customerCreateFromQuotation]
  );

  const coilInventoryRows = useMemo(() => {
    const masterData = ws?.snapshot?.masterData ?? null;
    const seenIds = new Set();
    const rows = [];

    const pushRow = (row) => {
      if (seenIds.has(row.id)) return;
      seenIds.add(row.id);
      rows.push(row);
    };

    if (coilLots.length > 0) {
      coilLots.forEach((lot) => {
        if (isCoilLotUnavailableForPlanning(lot)) return;
        const kgNum = coilLotRemainingKg(lot);
        if (!(kgNum > 0)) return;
        const p = invProducts.find((x) => x.productID === lot.productID);
        const attrs = p?.dashboardAttrs;
        const gaugeLabel = String(lot.gaugeLabel || '').trim() || attrs?.gauge || '—';
        const gNum = firstGaugeNumeric(gaugeLabel);
        const colourRaw = String(lot.colour || '').trim() || String(attrs?.colour || '').trim();
        const materialType =
          String(lot.materialTypeName || '').trim() || attrs?.materialType || p?.name || lot.productID;
        const estM = roughMetersFromKg(kgNum, gNum);
        pushRow({
          id: lot.coilNo,
          colour: colourShort(colourRaw, masterData),
          colourRaw,
          gaugeLabel,
          materialType,
          kg: kgNum,
          kgDisplay: `${kgNum.toLocaleString()} kg`,
          estMeters: estM,
          loc: lot.location?.trim() || null,
          low: p ? p.stockLevel < p.lowStockThreshold : false,
        });
      });
    } else {
      invProducts
        .filter((p) => p.unit === 'kg')
        .forEach((p) => {
          const attrs = p.dashboardAttrs;
          const gaugeLabel = attrs?.gauge ?? '—';
          const gNum = firstGaugeNumeric(attrs?.gauge);
          const kgTotal = Number(p.stockLevel);
          const colourRawAll = String(attrs?.colour ?? '').trim();
          const tokens = colourRawAll
            .split(/[·,]/)
            .map((t) => t.trim())
            .filter(Boolean);
          const low = p.stockLevel < p.lowStockThreshold;
          if (tokens.length === 0) {
            const estM = roughMetersFromKg(kgTotal, gNum);
            pushRow({
              id: p.productID,
              colour: colourShort(colourRawAll, masterData),
              colourRaw: colourRawAll,
              gaugeLabel,
              materialType: attrs?.materialType ?? p.name,
              kg: kgTotal,
              kgDisplay: `${kgTotal.toLocaleString()} kg`,
              estMeters: estM,
              loc: 'Store total',
              low,
            });
            return;
          }
          const n = tokens.length;
          const share = Math.max(0, Math.round(kgTotal / n));
          tokens.forEach((tok, i) => {
            const estM = roughMetersFromKg(share, gNum);
            pushRow({
              id: `${p.productID}-${i + 1}`,
              colour: colourShort(tok, masterData),
              colourRaw: tok,
              gaugeLabel,
              materialType: attrs?.materialType ?? p.name,
              kg: share,
              kgDisplay: `${share.toLocaleString()} kg`,
              estMeters: estM,
              loc: 'Est. by colour split',
              low,
            });
          });
        });
    }

    yardRegister.forEach((y) => {
      if (!y || typeof y !== 'object' || seenIds.has(y.id)) return;
      const kgNum = Number(y.weightKg);
      if (!Number.isFinite(kgNum) || kgNum <= 0) return;
      const gNum = firstGaugeNumeric(y.gaugeLabel);
      const estM = roughMetersFromKg(kgNum, gNum);
      const yColour = String(y.colour || '').trim();
      pushRow({
        id: y.id,
        colour: colourShort(yColour, masterData),
        colourRaw: yColour,
        gaugeLabel: y.gaugeLabel,
        materialType: y.materialType,
        kg: kgNum,
        kgDisplay: `${kgNum.toLocaleString()} kg`,
        estMeters: estM,
        loc: y.loc ?? 'Yard register',
        low: false,
      });
    });

    return rows;
  }, [coilLots, invProducts, yardRegister, ws?.snapshot?.masterData]);

  /** Book-only kg SKU lines are not receipted coils — exclude from cutting-list “coil match” to avoid false positives. */
  const coilInventoryRowsForMaterialReadiness = useMemo(
    () =>
      coilInventoryRows.filter(
        (r) => r.loc !== 'Store total' && r.loc !== 'Est. by colour split'
      ),
    [coilInventoryRows]
  );

  const cuttingListMaterialReadiness = useMemo(
    () =>
      computeCuttingListMaterialReadiness(
        cuttingLists,
        quotations,
        coilInventoryRowsForMaterialReadiness,
        ws?.snapshot?.masterData ?? null
      ),
    [cuttingLists, quotations, coilInventoryRowsForMaterialReadiness, ws?.snapshot?.masterData]
  );

  const openCuttingListFromMaterialAlert = useCallback((cl) => {
    setSelectedItem(cl);
    setCuttingAccessMode('view');
    setShowCuttingModal(true);
  }, []);

  const stockSearchOptions = useMemo(() => {
    const fromMaster = stockCheckSelectOptionsFromMasterData(ws?.snapshot?.masterData);
    const fromCoil = stockCheckSelectOptionsFromCoilRows(coilInventoryRows, ws?.snapshot?.masterData);
    const colours = mergeStockColourSelectOptions(ws?.snapshot?.masterData, coilInventoryRows);
    return {
      types: fromMaster.types.length ? fromMaster.types : fromCoil.types,
      gauges: fromMaster.gauges.length ? fromMaster.gauges : fromCoil.gauges,
      colours,
    };
  }, [ws?.snapshot?.masterData, coilInventoryRows]);

  const stockSearchActive = Boolean(stockMatType || stockGaugeFilter || stockColourFilter);

  const stockSearchMatches = useMemo(() => {
    if (!stockSearchActive) return [];
    const md = ws?.snapshot?.masterData;
    return coilInventoryRows.filter((r) => {
      if (!stockRowMatchesMaterialTypeFilter(md, stockMatType, r.materialType)) return false;
      if (stockGaugeFilter && String(r.gaugeLabel).trim() !== String(stockGaugeFilter).trim()) return false;
      if (!stockRowMatchesColourFilter(md, stockColourFilter, r)) return false;
      return true;
    });
  }, [
    coilInventoryRows,
    stockMatType,
    stockGaugeFilter,
    stockColourFilter,
    stockSearchActive,
    ws?.snapshot?.masterData,
  ]);

  const stockVerdict = useMemo(
    () => buildStockVerdict(stockSearchActive, stockSearchMatches),
    [stockSearchActive, stockSearchMatches]
  );

  const quotationsSearchFiltered = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    return quotations.filter((row) => {
      if (!q) return true;
      const blob = [
        row.id,
        row.customer,
        row.customerID,
        row.date,
        row.total,
        row.status,
        row.paymentStatus,
        row.paidNgn,
        row.totalNgn,
        row.lifecycleNote,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [quotations, debouncedSearchQuery]);

  const quotationFollowUpRows = useMemo(
    () =>
      quotationsSearchFiltered.filter((row) => !isQuotationArchivedRow(row) && quotationNeedsFollowUpAlert(row)),
    [quotationsSearchFiltered]
  );

  const wsHasPermissionRef = useRef(wsHasPermission);
  useEffect(() => {
    wsHasPermissionRef.current = wsHasPermission;
  }, [wsHasPermission]);

  /** Primitive so the effect re-runs when access flips, not when hasPermission identity changes. */
  const mayLoadEligibleRefunds = Boolean(
    wsHasPermission?.('refunds.request') ||
      wsHasPermission?.('refunds.approve') ||
      wsHasPermission?.('finance.approve')
  );

  const fetchEligibleRefundQuotations = useCallback(async (opts = {}) => {
    const hasPerm = wsHasPermissionRef.current;
    const mayLoad =
      hasPerm?.('refunds.request') || hasPerm?.('refunds.approve') || hasPerm?.('finance.approve');
    if (!mayLoad) {
      // Avoid setState([]) every time — a fresh [] always re-renders and can loop if this
      // callback's callers re-fire when parent permission fn identity changes each render.
      setEligibleRefundQuotations((prev) => (prev.length ? [] : prev));
      return;
    }
    const rows = await fetchEligibleRefundQuotationsCached(apiFetch, opts);
    setEligibleRefundQuotations((prev) => (prev === rows ? prev : rows));
  }, []);

  useEffect(() => {
    void fetchEligibleRefundQuotations();
  }, [fetchEligibleRefundQuotations, mayLoadEligibleRefunds]);

  /** Same source as the refund form quotation picker (`GET /api/refunds/eligible-quotations`). */
  const quotationsRefundPotentialRows = useMemo(() => {
    const byId = new Map(quotations.map((q) => [String(q.id).trim(), q]));
    return eligibleRefundQuotations
      .map((eq) => {
        const id = String(eq.id ?? '').trim();
        const full = byId.get(id);
        const remainingNgn = Number(eq.remaining_ngn ?? eq.remainingNgn) || 0;
        return full ? { ...full, ...eq, id, remainingNgn } : { ...eq, id, remainingNgn };
      })
      .filter((row) => String(row.id ?? '').trim() && quotationMeetsRefundPickerFloor(row))
      .sort((a, b) => {
        const ra = Number(a.remainingNgn ?? a.remaining_ngn ?? a.paidNgn ?? a.paid_ngn) || 0;
        const rb = Number(b.remainingNgn ?? b.remaining_ngn ?? b.paidNgn ?? b.paid_ngn) || 0;
        return rb - ra;
      });
  }, [eligibleRefundQuotations, quotations]);

  const filteredQuotations = useMemo(() => {
    const visible = quotationsSearchFiltered.filter(
      (row) => showArchivedQuotations || !isQuotationArchivedRow(row)
    );
    const sorted = sortQuotationsList(visible, salesListSort.field, salesListSort.dir);
    return sorted.slice(0, showCount);
  }, [quotationsSearchFiltered, showArchivedQuotations, showCount, salesListSort]);

  const mergedReceiptRows = useMemo(
    () => mergeReceiptRowsForSales(importedReceipts, quotations, ledgerSyncKey),
    [importedReceipts, quotations, ledgerSyncKey]
  );

  const cuttingListByQuoteRef = useMemo(
    () => cuttingListByQuotationRefMap(cuttingLists),
    [cuttingLists]
  );

  const mergedReceiptRowsWithCuttingMeta = useMemo(
    () =>
      mergedReceiptRows.map((r) => {
        const link = receiptCuttingListLinkMeta(r, cuttingListByQuoteRef);
        return {
          ...r,
          _cuttingListLinkKind: link.kind,
          _cuttingListId: link.cuttingListId || '',
          _cuttingListLabel: link.label,
          _cuttingListTitle: link.title,
        };
      }),
    [mergedReceiptRows, cuttingListByQuoteRef]
  );

  const searchFilteredReceiptRows = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return mergedReceiptRowsWithCuttingMeta;
    return mergedReceiptRowsWithCuttingMeta.filter((row) => {
      const blob = [
        row.id,
        row.customer,
        row.quotationRef,
        row.date,
        row.dateISO,
        row.amount,
        row.source,
        row._payBadge,
        row._subLabel,
        row._detailNote,
        row._cuttingListLabel,
        row._cuttingListId,
        row._cuttingListLinkKind === 'linked' ? 'linked cutting list' : 'no cutting list',
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [mergedReceiptRowsWithCuttingMeta, debouncedSearchQuery]);

  const paymentCountByQuoteRef = useMemo(
    () => paymentCountByQuotationRef(mergedReceiptRowsWithCuttingMeta),
    [mergedReceiptRowsWithCuttingMeta]
  );

  const quotationPayOpts = useMemo(
    () => ({
      salesReceipts: mergedReceiptRowsWithCuttingMeta,
      ledgerEntries: loadLedgerEntries(),
    }),
    [mergedReceiptRowsWithCuttingMeta]
  );

  const quotationsRef = useRef(quotations);
  const mergedReceiptRowsRef = useRef(mergedReceiptRows);
  const refundsRef = useRef(refunds);
  const cuttingListsRef = useRef(cuttingLists);

  useEffect(() => {
    quotationsRef.current = quotations;
    mergedReceiptRowsRef.current = mergedReceiptRows;
    refundsRef.current = refunds;
    cuttingListsRef.current = cuttingLists;
  }, [quotations, mergedReceiptRows, refunds, cuttingLists]);

  const receiptPaymentStatusCounts = useMemo(() => {
    const rows = searchFilteredReceiptRows;
    let awaiting = 0;
    let confirmed = 0;
    let reversed = 0;
    for (const row of rows) {
      const bucket = receiptSalesPaymentFilterBucket(row);
      if (bucket === 'awaiting') awaiting += 1;
      if (bucket === 'confirmed') confirmed += 1;
      if (bucket === 'reversed') reversed += 1;
    }
    return { all: rows.length - reversed, awaiting, confirmed, reversed };
  }, [searchFilteredReceiptRows]);

  const awaitingCashierReceiptCount = receiptPaymentStatusCounts.awaiting;

  const paymentFilteredReceiptRows = useMemo(() => {
    return searchFilteredReceiptRows.filter((row) =>
      receiptMatchesSalesPaymentFilter(row, receiptPaymentStatusFilter)
    );
  }, [searchFilteredReceiptRows, receiptPaymentStatusFilter]);

  const filteredMergedReceipts = useMemo(() => {
    const sorted = sortReceiptsList(paymentFilteredReceiptRows, salesListSort.field, salesListSort.dir);
    return sorted.slice(0, showCount);
  }, [paymentFilteredReceiptRows, showCount, salesListSort]);

  const filteredCuttingLists = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    const filtered = cuttingLists.filter((row) => {
      if (!q) return true;
      const job = pickProductionJobForCuttingList(row.id, productionJobs, cuttingLists);
      const line = productionQueueLineStatusPresentation(row, job);
      const blob = `${row.id} ${row.customer} ${row.customerID || ''} ${row.quotationRef || ''} ${
        row.productID || ''
      } ${row.productName || ''} ${row.date} ${row.total} ${row.status} ${line.label}`.toLowerCase();
      return blob.includes(q);
    });
    const sorted = sortCuttingLists(filtered, salesListSort.field, salesListSort.dir, {
      productionLineStatusKey: (row) => {
        const job = pickProductionJobForCuttingList(row.id, productionJobs, cuttingLists);
        return productionQueueLineStatusPresentation(row, job).label;
      },
    });
    return sorted.slice(0, showCount);
  }, [cuttingLists, productionJobs, debouncedSearchQuery, showCount, salesListSort]);

  const filteredRefunds = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    const filtered = refunds.filter((row) => {
      if (!q) return true;
      const blob = [
        row.refundID, row.customer, row.quotationRef, row.product, row.reason, row.reasonCategory, row.status, row.amountNgn, row.approvedAmountNgn, row.paidAmountNgn, row.paymentNote, row.managerComments,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
    const sorted = sortRefundsList(filtered, salesListSort.field, salesListSort.dir);
    return sorted.slice(0, showCount);
  }, [refunds, debouncedSearchQuery, showCount, salesListSort]);

  const filteredCustomersCount = useMemo(() => {
    const list = Array.isArray(customerRecords) ? customerRecords : [];
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return list.length;
    return list.filter((c) => {
      const blob = [
        c.customerID,
        c.name,
        c.phoneNumber,
        c.email,
        c.tier,
        c.paymentTerms,
        c.addressShipping,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    }).length;
  }, [customerRecords, debouncedSearchQuery]);

  const listStats = useMemo(
    () => ({
      quotations: {
        shown: filteredQuotations.length,
        pendingApproval: filteredQuotations.filter(
          (x) => x.status !== 'Approved' && !isQuotationArchivedRow(x)
        ).length,
      },
      receipts: {
        shown: filteredMergedReceipts.length,
        matching: paymentFilteredReceiptRows.length,
        awaitingCashier: awaitingCashierReceiptCount,
      },
      cuttinglist: { shown: filteredCuttingLists.length },
      refund: {
        shown: filteredRefunds.length,
        pending: filteredRefunds.filter((x) => x.status === 'Pending').length,
        awaitingPay: approvedRefundsAwaitingPayment(filteredRefunds).length,
      },
      customers: {
        shown: filteredCustomersCount,
        total: Array.isArray(customerRecords) ? customerRecords.length : 0,
      },
    }),
    [
      filteredQuotations,
      filteredMergedReceipts,
      paymentFilteredReceiptRows,
      awaitingCashierReceiptCount,
      filteredCuttingLists,
      filteredRefunds,
      filteredCustomersCount,
      customerRecords,
    ]
  );

  const handleTabChange = (id) => {
    setActiveTab(TAB_LABELS[id] ? id : 'quotations');
    setSearchQuery('');
    setCustomerAddOpen(false);
    setShowCount(20);
    setShowArchivedQuotations(false);
    if (id === 'customers') {
      setSalesListSort({ field: 'customerID', dir: 'desc' });
    } else {
      setSalesListSort({ field: 'id', dir: 'desc' });
    }
  };

  /**
   * Command center (Dashboard) sends `navigate('/sales', { state: { openSalesAction } })`.
   * Consume once, then clear router state so back/refresh does not reopen modals.
   */
  const consumedSalesNavKeyRef = useRef('');
  useEffect(() => {
    const st = location.state;
    if (!st || typeof st !== 'object') return;

    const action = st.openSalesAction;
    const tab = st.focusSalesTab;
    const gsq = st.globalSearchQuery;
    const record = st.openSalesRecord;
    const openCustomerCreate = st.openCustomerCreate === true;
    const resolvedTab = tab === 'dashboard' ? 'quotations' : tab;
    const hasTab = resolvedTab && Object.prototype.hasOwnProperty.call(TAB_LABELS, resolvedTab);
    const hasSearch = typeof gsq === 'string' && gsq.trim();
    const recordId = String(record?.id || '').trim();
    const hasRecord = Boolean(record && recordId);
    const hasWork = Boolean(action || hasRecord || openCustomerCreate || hasTab || hasSearch);
    if (!hasWork) return;

    const navKey = JSON.stringify({
      action: action || '',
      tab: resolvedTab || '',
      gsq: hasSearch ? String(gsq).trim() : '',
      recordType: record?.type || '',
      recordId: recordId || '',
      openCustomerCreate,
    });
    if (consumedSalesNavKeyRef.current === navKey) return;
    consumedSalesNavKeyRef.current = navKey;

    if (action) {
      setSelectedItem(null);
      setSearchQuery('');
      if (action === 'quotation') {
        setActiveTab('quotations');
        setQuotationAccessMode('edit');
        setShowQuotationModal(true);
      } else if (action === 'receipt') {
        setActiveTab('receipts');
        setReceiptAccessMode('add');
        setShowReceiptModal(true);
      } else if (action === 'cutting') {
        setActiveTab('cuttinglist');
        setCuttingAccessMode('edit');
        setShowCuttingModal(true);
      }
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    if (hasRecord) {
      if (record.type === 'quotation') {
        const q = quotationsRef.current.find((x) => x.id === recordId);
        setActiveTab('quotations');
        setSearchQuery('');
        if (q) {
          setSelectedItem(q);
          setQuotationAccessMode('view');
          setShowQuotationModal(true);
        } else {
          showToast(`Quotation ${recordId} not found.`, { variant: 'error' });
        }
      } else if (record.type === 'receipt') {
        const r = mergedReceiptRowsRef.current.find((x) => x.id === recordId);
        setActiveTab('receipts');
        setSearchQuery('');
        if (r) {
          setSelectedItem(r);
          setReceiptAccessMode('view');
          setShowReceiptModal(true);
        } else {
          showToast(`Receipt ${recordId} not found.`, { variant: 'error' });
        }
      } else if (record.type === 'refund') {
        const rf = refundsRef.current.find((x) => x.refundID === recordId);
        setActiveTab('refund');
        setSearchQuery('');
        if (rf) {
          setSelectedItem(rf);
          setRefundModalMode('view');
          setRefundModalKey((k) => k + 1);
          setShowRefundModal(true);
        } else {
          showToast(`Refund ${recordId} not found.`, { variant: 'error' });
        }
      } else if (record.type === 'cutting' || record.type === 'cutting_list') {
        const cl = cuttingListsRef.current.find((x) => x.id === recordId);
        setActiveTab('cuttinglist');
        setSearchQuery('');
        if (cl) {
          setSelectedItem(cl);
          setCuttingAccessMode('view');
          setShowCuttingModal(true);
        } else {
          showToast(`Cutting list ${recordId} not found.`, { variant: 'error' });
        }
      }
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    if (openCustomerCreate) {
      setActiveTab('customers');
      setCustomerAddOpen(true);
    } else if (hasTab) {
      setActiveTab(resolvedTab);
    }
    if (hasSearch) setSearchQuery(gsq.trim());
    else if (hasTab || openCustomerCreate) setSearchQuery('');

    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate, showToast]);

  useEffect(() => {
    if (!actionMenuKey) return;
    const onDown = (e) => {
      if (e.target.closest?.('[data-sales-action-menu]')) return;
      setActionMenuKey(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [actionMenuKey]);

  const openRefundModal = (item) => {
    setSelectedItem(item);
    setRefundModalMode(item.status === 'Pending' && canApproveRefunds ? 'approve' : 'view');
    setRefundModalKey((k) => k + 1);
    setShowRefundModal(true);
  };

  const openRefundViewOnly = (item) => {
    setSelectedItem(item);
    setRefundModalMode('view');
    setRefundModalKey((k) => k + 1);
    setShowRefundModal(true);
  };

  /** Sidebar / deep-link: start a new refund request with quotation + customer pre-filled. */
  const openAddPaymentForQuotation = useCallback((q) => {
    if (!ws?.canMutate) {
      showToast('System offline (read-only). Reconnect, refresh, then try again.', { variant: 'error' });
      return;
    }
    setSelectedItem(q);
    setReceiptAccessMode('add');
    setShowReceiptModal(true);
  }, [showToast, ws?.canMutate]);

  const openAddPaymentForReceiptRow = useCallback(
    (r) => {
      const ref = String(r?.quotationRef || '').trim();
      const q = quotationsRef.current.find((x) => String(x.id || '').trim() === ref);
      if (q) {
        openAddPaymentForQuotation(q);
        return;
      }
      if (!ref) {
        showToast('This payment has no quotation link — pick a quote in the payment form.', { variant: 'info' });
      }
      setSelectedItem({ quotationRef: ref, customer: r?.customer, customerID: r?.customerID });
      setReceiptAccessMode('add');
      setShowReceiptModal(true);
    },
    [openAddPaymentForQuotation, showToast]
  );

  const openRefundCreateForQuotation = useCallback(
    (q) => {
      setActiveTab('refund');
      setSearchQuery('');
      if (!wsHasPermission?.('refunds.request')) {
        showToast('Your role cannot submit refund requests.', { variant: 'error' });
        return;
      }
      setSelectedItem({
        quotationRef: String(q.id ?? '').trim(),
        customerID: String(q.customerID ?? q.customer_id ?? '').trim(),
        customerName: String(q.customer ?? q.customer_name ?? '').trim(),
      });
      setRefundModalMode('create');
      setRefundModalKey((k) => k + 1);
      setShowRefundModal(true);
    },
    [showToast, wsHasPermission]
  );

  // Logic to handle opening modals for "New"
  const openNewModal = () => {
    if (!ws?.canMutate) {
      showToast('System offline (read-only). Reconnect, refresh, then try again.', { variant: 'error' });
      return;
    }
    if (salesTab === 'quotations' && ws?.blocksBranchScopedCreate) {
      showToast(ws.branchScopedCreateMessage, { variant: 'error', duration: 12_000 });
      return;
    }
    setSelectedItem(null);
    if (salesTab === 'quotations') {
      setQuotationAccessMode('edit');
      setShowQuotationModal(true);
    }
    if (salesTab === 'receipts') {
      setReceiptAccessMode('add');
      setShowReceiptModal(true);
    }
    if (salesTab === 'cuttinglist') {
      setCuttingAccessMode('edit');
      setShowCuttingModal(true);
    }
    if (salesTab === 'refund') {
      if (!ws?.hasPermission?.('refunds.request')) {
        showToast('Your role cannot submit refund requests.', { variant: 'error' });
        return;
      }
      setRefundModalMode('create');
      setRefundModalKey((k) => k + 1);
      setShowRefundModal(true);
    }
    if (salesTab === 'customers') {
      setCustomerAddOpen(true);
    }
  };

  const persistRefund = async (payload) => {
    const normalized = normalizeRefund(payload);
    if (ws?.canMutate) {
      const isCreate = refundModalMode === 'create';
      const path = isCreate
        ? '/api/refunds'
        : `/api/refunds/${encodeURIComponent(normalized.refundID)}/decision`;
      const body = isCreate
        ? normalized
        : {
            status: normalized.status,
            approvalDate: normalized.approvalDate,
            managerComments: normalized.managerComments,
            approvedAmountNgn:
              normalized.status === 'Approved' ? refundApprovedAmount(normalized) : 0,
            calculationLines: normalized.calculationLines,
            calculationNotes: normalized.calculationNotes,
            suggestedLines: normalized.suggestedLines,
            ...(normalized.status === 'Approved'
              ? {
                  productionAlignmentAcknowledgedCodes:
                    normalized.productionAlignmentAcknowledgedCodes || [],
                  productionAlignmentOverrideNote: normalized.productionAlignmentOverrideNote || '',
                }
              : {}),
          };
      const { ok, data } = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!ok || !data?.ok) {
        const err = data?.error || 'Could not save refund request.';
        showToast(err, { variant: 'error' });
        return { ok: false, error: err };
      }
      await ws.refresh();
      invalidateEligibleRefundQuotationsCache();
      void fetchEligibleRefundQuotations({ force: true });
      showToast(
        isCreate
          ? `Refund request ${data.refundID || normalized.refundID} submitted for approval.`
          : `Refund ${normalized.refundID} marked ${normalized.status}.`
      );
      return { ok: true };
    }
    showToast(
      ws?.usingCachedData
        ? 'Reconnect to save refunds — workspace is read-only.'
        : 'Sign in and connect to the API to save refund requests.',
      { variant: 'info' }
    );
    return { ok: false };
  };

  const persistCuttingList = async (payload) => {
    if (!payload.id && ws?.blocksBranchScopedCreate) {
      return { ok: false, error: ws.branchScopedCreateMessage || 'Select a single branch workspace before creating a cutting list.' };
    }
    if (!ws?.canMutate) {
      return {
        ok: false,
        error: ws?.usingCachedData
          ? 'Reconnect to save — workspace is read-only (cached data).'
          : 'Start the API server to save cutting lists to the database.',
      };
    }
    const isEdit = Boolean(payload.id);
    const path = isEdit
      ? `/api/cutting-lists/${encodeURIComponent(payload.id)}`
      : '/api/cutting-lists';
    const { editApprovalId: cuttingAid, ...cuttingBody } = payload;
    const body =
      isEdit && String(cuttingAid || '').trim()
        ? { ...cuttingBody, editApprovalId: String(cuttingAid).trim() }
        : cuttingBody;
    const { ok, data } = await apiFetch(path, {
      method: isEdit ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    });
    if (!ok || !data?.ok) {
      return { ok: false, error: data?.error || 'Could not save cutting list.' };
    }
    await ws.refresh();
    showToast(`${isEdit ? 'Updated' : 'Created'} cutting list ${data.cuttingList?.id || data.id}.`);
    return { ok: true };
  };

  const deleteQuotation = useCallback(
    async (quotationId) => {
      if (!canDeleteSalesRecord) {
        showToast('Only Admin, MD, or Branch Manager can delete quotations.', { variant: 'error' });
        return;
      }
      if (!(await confirmDangerousDelete(`quotation ${quotationId}`, 'DELETE QUOTATION'))) return;
      const { ok, data } = await apiFetch(`/api/quotations/${encodeURIComponent(quotationId)}`, {
        method: 'DELETE',
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not delete quotation.', { variant: 'error' });
        return;
      }
      if (wsCanMutate) await wsRefresh?.();
      showToast(`Deleted quotation ${quotationId} and linked receipts/cutting lists.`);
    },
    [canDeleteSalesRecord, confirmDangerousDelete, showToast, wsCanMutate, wsRefresh]
  );

  const deleteReceipt = useCallback(
    async (receiptId) => {
      if (!canDeleteSalesRecord) {
        showToast('Only Admin, MD, or Branch Manager can delete payments.', { variant: 'error' });
        return;
      }
      if (!(await confirmDangerousDelete(`payment ${receiptId}`, 'DELETE RECEIPT'))) return;
      const { ok, data } = await apiFetch(`/api/receipts/${encodeURIComponent(receiptId)}`, {
        method: 'DELETE',
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not delete payment.', { variant: 'error' });
        return false;
      }
      await onLedgerSynced();
      showToast(`Deleted payment ${receiptId} and any linked cutting list.`);
      return true;
    },
    [canDeleteSalesRecord, confirmDangerousDelete, onLedgerSynced, showToast]
  );

  const deleteAdvance = useCallback(
    async (entry) => {
      if (!canDeleteSalesRecord) {
        showToast('Only Admin, MD, or Branch Manager can delete advances.', { variant: 'error' });
        return false;
      }
      const entryId = String(entry?.id || '').trim();
      const amountLabel = entry?.remainingNgn ?? entry?.amountNgn;
      const label = `advance ${formatNgn(amountLabel)} for ${entry?.customerName || entry?.customerID || entryId}`;
      if (!(await confirmDangerousDelete(label, 'DELETE ADVANCE'))) return false;
      if (wsCanMutate) {
        const { ok, data } = await apiFetch('/api/ledger/reverse-advance', {
          method: 'POST',
          body: JSON.stringify({
            entryId,
            note: 'Advance removed from Sales — duplicate or correction',
          }),
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not reverse advance on server.', { variant: 'error' });
          return false;
        }
        dismissAdvanceEntryId(entryId);
        await onLedgerSynced();
        showToast('Advance reversed — customer balance and treasury account updated.');
        return true;
      }
      dismissAdvanceEntryId(entryId);
      bumpLedger();
      showToast('Advance removed from list.');
      return true;
    },
    [bumpLedger, canDeleteSalesRecord, confirmDangerousDelete, onLedgerSynced, showToast, wsCanMutate]
  );

  const deleteCuttingList = useCallback(
    async (cuttingListId) => {
      if (!canDeleteSalesRecord) {
        showToast('Only Admin, MD, or Branch Manager can delete cutting lists.', { variant: 'error' });
        return;
      }
      if (!(await confirmDangerousDelete(`cutting list ${cuttingListId}`, 'DELETE CUTTING LIST'))) return;
      const { ok, data } = await apiFetch(`/api/cutting-lists/${encodeURIComponent(cuttingListId)}`, {
        method: 'DELETE',
      });
      if (!ok || !data?.ok) {
        showToast(
          data?.error ||
            'Could not delete cutting list. Cutting lists with production activity cannot be deleted.',
          { variant: 'error' }
        );
        return;
      }
      if (wsCanMutate) await wsRefresh?.();
      showToast(`Deleted cutting list ${cuttingListId}.`);
    },
    [canDeleteSalesRecord, confirmDangerousDelete, showToast, wsCanMutate, wsRefresh]
  );

  const pushCuttingListToProduction = useCallback(
    async (cuttingList) => {
      const id = String(cuttingList?.id || '').trim();
      if (!id) return;
      const canRegisterProduction =
        wsHasPermission?.('sales.manage') ||
        wsHasPermission?.('quotations.manage') ||
        wsHasPermission?.('production.manage') ||
        wsHasPermission?.('operations.manage');
      if (!canRegisterProduction) {
        showToast('Ask an admin for quotation, sales, operations, or production access to push to queue.', {
          variant: 'error',
        });
        return;
      }
      if (!wsCanMutate) {
        showToast('System offline (read-only). Reconnect and refresh before pushing to queue.', {
          variant: 'error',
        });
        return;
      }
      if (cuttingList?.productionRegistered) {
        showToast('This cutting list is already linked to a production job.', { variant: 'error' });
        return;
      }
      if (String(cuttingList?.status || '').trim() === 'Draft') {
        showToast('Finish and save this cutting list before pushing it to production.', {
          variant: 'error',
        });
        return;
      }
      if (cuttingList?.productionReleasePending) {
        showToast('This list is on hold until operations clears the production release.', {
          variant: 'error',
        });
        return;
      }
      const quotation = quotations.find(
        (q) => String(q.id ?? '').trim() === String(cuttingList?.quotationRef ?? '').trim()
      );
      const minPaidFraction = cuttingListMinPaidFractionFromSession(ws?.session);
      const minPaidPercentLabel = Math.round(minPaidFraction * 100);
      if (
        quotation &&
        !meetsCuttingListPayThreshold(
          quotation,
          mergedReceiptRowsWithCuttingMeta,
          loadLedgerEntries(),
          minPaidFraction
        )
      ) {
        showToast(
          `Under ${minPaidPercentLabel}% paid: a manager must approve production on the Manager dashboard before this list can join the queue.`,
          { variant: 'error' }
        );
        return;
      }
      if (quotation && !quotationIsAccessoriesOnlyForProduction(quotation)) {
        const assessment = assessCuttingListQuotationConsumption({
          quotationLinesJson: quotation.quotationLines ?? quotation.linesJson ?? '',
          cuttingListLines: (cuttingList?.lines ?? []).map((line) => ({
            sheets: line.sheets,
            lengthM: line.lengthM,
            totalM: line.totalM,
            lineType: line.lineType ?? line.line_type ?? 'Roof',
          })),
          stoneMeterQuote: quotation.stoneMeterQuote === true,
        });
        if (assessment.trimBlankProductionBlocked) {
          showToast(
            assessment.warnings?.find((w) => String(w).includes('Flatsheet section')) ||
              'Add trim blank metres under Flatsheet before production.',
            { variant: 'error' }
          );
          return;
        }
        if (!assessment.ok && assessment.message) {
          showToast(assessment.message, { variant: 'error' });
          return;
        }
      }
      const { ok, data } = await apiFetch(
        `/api/cutting-lists/${encodeURIComponent(id)}/register-production`,
        {
          method: 'POST',
          body: JSON.stringify({
            machineName: String(cuttingList?.machineName || 'Machine 01 (Longspan)'),
          }),
        }
      );
      if (!ok || !data?.ok) {
        showToast(data?.error || data?.message || 'Could not add to production queue.', { variant: 'error' });
        return;
      }
      if (wsCanMutate) await wsRefresh?.();
      showToast('Cutting list added to the production queue.', { variant: 'success' });
    },
    [showToast, wsCanMutate, wsRefresh, wsHasPermission, quotations, mergedReceiptRowsWithCuttingMeta, ws?.session]
  );

  const isAnyModalOpen =
    showQuotationModal ||
    showReceiptModal ||
    showCuttingModal ||
    showRefundModal ||
    customerAddOpen ||
    showAdvanceModal;

  const salesTabs = useMemo(
    () => [
      { id: 'quotations', icon: <FileText size={16} />, label: 'Quotations' },
      { id: 'receipts', icon: <ReceiptIcon size={16} />, label: 'Payments' },
      { id: 'cuttinglist', icon: <Scissors size={16} />, label: 'Cutting list' },
      { id: 'refund', icon: <RotateCcw size={16} />, label: 'Refunds' },
      { id: 'customers', icon: <UserCircle size={16} />, label: 'Customers' },
    ],
    []
  );

  const primaryActionBtnClass =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-zarewa-teal text-white px-4 py-2 text-ui-xs font-semibold uppercase tracking-wider shadow-sm hover:brightness-105 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30 focus-visible:ring-offset-2 shrink-0';

  return (
    <PageShell blurred={isAnyModalOpen}>
      <PageHeader
        title="Sales"
        subtitle="Quotations, receipts, cutting lists, refunds & customers — yard pricing matches the dashboard spot list; stock check is in the sidebar."
        tabs={
          <div className="flex w-full min-w-0 flex-col items-stretch gap-3 sm:items-end">
            <div className="flex w-full min-w-0 justify-start sm:justify-end">
              <PageTabs tabs={salesTabs} value={salesTab} onChange={handleTabChange} />
            </div>
            <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
              {salesTab === 'receipts' ? (
                <ZareHelpButton
                  transactionContext={{
                    module: 'sales',
                    currentPage: 'receipts',
                    transactionType: 'receipt',
                    pathname: '/sales',
                  }}
                  compact
                />
              ) : null}
              <AiAskButton
                mode="sales"
                prompt={
                  salesTab === 'quotations'
                    ? 'Which quotations need follow-up now, and what should sales do next?'
                    : salesTab === 'receipts'
                      ? 'Summarize the receipt and settlement issues visible on this page.'
                      : salesTab === 'cuttinglist'
                        ? 'Explain cutting-list readiness and the main blockers for production.'
                        : salesTab === 'refund'
                          ? 'Summarize the refund queue and explain what needs action.'
                          : 'Summarize customer activity and tell me who needs attention.'
                }
                pageContext={{
                  source: 'sales-page',
                  salesTab,
                  searchQuery,
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-ui-xs font-semibold uppercase tracking-wide text-zarewa-teal shadow-sm hover:bg-teal-100/70"
              >
                Ask AI
              </AiAskButton>
              {isAdminRole ? (
                <button
                  type="button"
                  disabled={adminSalesReconcileBusy}
                  onClick={() => void runAdminSalesDerivedReconcile()}
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-ui-xs font-semibold uppercase tracking-wide text-violet-950 shadow-sm hover:bg-violet-100/80 disabled:opacity-50"
                  title="Admin only: rebuild sales_receipt rows from the customer ledger and recalculate quotation paid for this branch scope."
                >
                  <RefreshCw size={14} strokeWidth={2} className={adminSalesReconcileBusy ? 'animate-spin' : ''} />
                  {adminSalesReconcileBusy ? 'Recalculating…' : 'Recalculate sales data'}
                </button>
              ) : null}
              {salesTab === 'quotations' && (
                <button
                  type="button"
                  onClick={openNewModal}
                  disabled={ws?.blocksBranchScopedCreate}
                  title={ws?.blocksBranchScopedCreate ? ws.branchScopedCreateMessage : undefined}
                  className={`${primaryActionBtnClass}${ws?.blocksBranchScopedCreate ? ' opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Plus size={16} strokeWidth={2} /> New quotation
                </button>
              )}
              {salesTab === 'receipts' && (
                <>
                  <button type="button" onClick={openNewModal} className={primaryActionBtnClass}>
                    <Plus size={16} strokeWidth={2} /> Record payment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!ws?.canMutate) {
                        showToast('System offline (read-only). Reconnect, refresh, then try again.', { variant: 'error' });
                        return;
                      }
                      setShowAdvanceModal(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-950 px-4 py-2 text-ui-xs font-semibold uppercase tracking-wider shadow-sm hover:bg-amber-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:ring-offset-2 shrink-0"
                    title="Payment before quotation — customer deposit / liability"
                  >
                    <Wallet size={16} strokeWidth={2} /> Advance payment
                  </button>
                </>
              )}
              {salesTab === 'cuttinglist' && (
                <button type="button" onClick={openNewModal} className={primaryActionBtnClass}>
                  <Plus size={16} strokeWidth={2} /> New cutting list
                </button>
              )}
              {salesTab === 'refund' && (
                <button type="button" onClick={openNewModal} className={primaryActionBtnClass}>
                  <Plus size={16} strokeWidth={2} /> New refund
                </button>
              )}
              {salesTab === 'customers' && (
                <button type="button" onClick={openNewModal} className={primaryActionBtnClass}>
                  <Plus size={16} strokeWidth={2} /> Add customer
                </button>
              )}
            </div>
          </div>
        }
      />

      <SalesKpiStrip salesTab={salesTab} listStats={listStats} followUpCount={quotationFollowUpRows.length} />

      <SalesMobileAlertStrip
        salesTab={salesTab}
        pendingApproval={listStats.quotations.pendingApproval}
        pendingRefunds={listStats.refund.pending}
        awaitingPayRefunds={listStats.refund.awaitingPay}
        followUpCount={quotationFollowUpRows.length}
        awaitingCashierReceipts={listStats.receipts.awaitingCashier}
      />

      {salesTab === 'receipts' ? (
        <div className="hidden lg:block">
          <SalesReceiptAwaitingAlert
            count={awaitingCashierReceiptCount}
            onFilterAwaiting={
              receiptPaymentStatusFilter === 'awaiting'
                ? undefined
                : () => setReceiptPaymentStatusFilter('awaiting')
            }
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:gap-8 min-w-0 lg:grid-cols-4">
        {salesTab !== 'customers' && (
          <aside className="lg:col-span-1 hidden lg:flex flex-col gap-5 sticky top-6">
            {salesTab === 'quotations' ? (
              <>
                {/* Spot prices */}
                <section className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
                  <div className="h-1 bg-zarewa-teal" aria-hidden />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="text-ui-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                          <Banknote size={14} className="text-zarewa-teal shrink-0" strokeWidth={2} />
                          Spot price list
                        </p>
                        <p className="text-xs text-slate-500 mt-1 leading-snug">
                          ₦ per metre — same published list as Procurement → material pricing workbook (after sync),
                          plus other Setup price list lines.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-ui-xs font-semibold uppercase tracking-wide text-zarewa-teal hover:bg-white transition-colors"
                      >
                        <Pencil size={12} strokeWidth={2} />
                        Edit
                      </button>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                      {spotPrices.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">No prices found.</p>
                      ) : (
                        spotPrices.map((row) => (
                          <div key={row.id} className="grid grid-cols-[1fr_auto] gap-x-2 items-start border-b border-slate-100 py-2.5 last:border-b-0">
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-800">{row.gaugeLabel}</span>
                              <span className="text-ui-xs text-slate-500 ml-1">{row.productType}</span>
                            </div>
                            <span className="text-xs font-bold text-zarewa-teal tabular-nums text-right whitespace-nowrap pt-0.5">
                              ₦{Number(row.priceNgn || 0).toLocaleString()}/m
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </section>

                {/* Stock check */}
                <section className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
                  <div className="h-1 bg-zarewa-teal" aria-hidden />
                  <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                    <p className="text-ui-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <Package size={14} className="text-zarewa-teal shrink-0" strokeWidth={2} />
                      Stock check
                    </p>
                    <p className="text-ui-xs text-slate-500 mt-1 leading-snug">
                      Material, gauge, and colour lists follow Setup master data (same as new quotations). Any list
                      that is still empty in Setup falls back to values seen on current coil and yard lines.
                    </p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="space-y-2">
                       <label className="block text-ui-xs font-semibold text-slate-400 uppercase tracking-wide">Material</label>
                       <div className="relative">
                         <select 
                           value={stockMatType} 
                           onChange={(e) => setStockMatType(e.target.value)}
                           className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-8 text-base sm:text-xs font-semibold text-zarewa-teal focus:ring-2 focus:ring-zarewa-teal/10 focus:border-zarewa-teal/30 outline-none"
                         >
                           <option value="">Any type</option>
                           {stockSearchOptions.types.map((t) => (
                             <option key={t.value} value={t.value}>
                               {t.label}
                             </option>
                           ))}
                         </select>
                         <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                       </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-ui-xs font-semibold text-slate-400 uppercase tracking-wide">Gauge</label>
                        <div className="relative">
                          <select 
                            value={stockGaugeFilter} 
                            onChange={(e) => setStockGaugeFilter(e.target.value)}
                            className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-xs font-semibold text-zarewa-teal outline-none"
                          >
                            <option value="">Any</option>
                            {stockSearchOptions.gauges.map((g) => (
                              <option key={g.value} value={g.value}>
                                {g.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-ui-xs font-semibold text-slate-400 uppercase tracking-wide">Colour</label>
                        <div className="relative">
                          <select 
                            value={stockColourFilter} 
                            onChange={(e) => setStockColourFilter(e.target.value)}
                            className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-xs font-semibold text-zarewa-teal outline-none"
                          >
                            <option value="">Any</option>
                            {stockSearchOptions.colours.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    {stockSearchActive && stockVerdict && (
                      <div className={`p-3 rounded-lg border ${stockVerdict.kind === 'ok' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                        <p className="text-xs font-bold text-slate-900">{stockVerdict.title}</p>
                        <p className="text-ui-xs text-slate-600 mt-1">{stockVerdict.detail}</p>
                      </div>
                    )}

                    <button 
                      onClick={() => { setStockMatType(''); setStockGaugeFilter(''); setStockColourFilter(''); }}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-ui-xs font-black uppercase tracking-widest transition-all"
                    >
                      Clear filters
                    </button>
                  </div>
                </section>

                <section className="rounded-xl border border-amber-200/90 bg-amber-50/40 shadow-sm overflow-hidden">
                  <div className="h-1 bg-amber-500" aria-hidden />
                  <div className="p-5">
                    <p className="text-ui-xs font-semibold uppercase tracking-widest text-amber-900/80 flex items-center gap-1.5">
                      <Bell size={14} className="shrink-0" strokeWidth={2} />
                      Quote validity
                    </p>
                    <p className="text-xs text-amber-950/80 mt-1 leading-snug">
                      Quotes stay open for <strong>{QUOTATION_VALIDITY_DAYS} days</strong> from the quote date. From day{' '}
                      <strong>{QUOTATION_FOLLOWUP_START_DAY}</strong> we flag follow-up if there is still no payment on
                      the quote. Day {QUOTATION_VALIDITY_DAYS}+ with no commitment auto-archives as{' '}
                      <strong>Expired</strong> (revivable). Master list price changes void quotes under 2 days old with
                      no commitment.
                    </p>
                    <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-amber-200/80 bg-white/70 px-2.5 py-2 text-ui-xs text-amber-950">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5 rounded border-amber-300 text-amber-600"
                        checked={showArchivedQuotations}
                        onChange={(e) => setShowArchivedQuotations(e.target.checked)}
                      />
                      <span>Show expired / void (archived) in the list</span>
                    </label>
                    {quotationFollowUpRows.length > 0 ? (
                      <div className="mt-4 rounded-lg border border-amber-200 bg-white/90 p-2.5">
                        <p className="text-ui-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
                          Follow-up ({quotationFollowUpRows.length})
                        </p>
                        <ul className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1.5">
                          {quotationFollowUpRows.slice(0, 12).map((q) => (
                            <li key={q.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedItem(q);
                                  setQuotationAccessMode('view');
                                  setShowQuotationModal(true);
                                }}
                                className="w-full text-left rounded-md border border-amber-100 bg-amber-50/50 px-2 py-1.5 hover:bg-amber-100/80 transition-colors"
                              >
                                <span className="text-ui-xs font-bold text-zarewa-teal tabular-nums">{q.id}</span>
                                <span className="text-ui-xs text-slate-600 block truncate">{q.customer}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-ui-xs text-amber-800/60 mt-3 italic">No follow-up flags for current search.</p>
                    )}
                  </div>
                </section>
              </>
            ) : salesTab === 'receipts' ? (
              <div className="space-y-3">
                <ReceiptsUnlinkedDepositsPanel
                  className="!h-auto !min-h-0 shadow-sm"
                  snapshot={ws?.snapshot}
                  onUseDeposit={(d) => {
                    setPreselectedBankDepositId(String(d?.id || ''));
                    setShowReceiptModal(true);
                    setReceiptAccessMode('add');
                    setSelectedItem(null);
                  }}
                />
                <ReceiptsAdvancesPanel
                  className="!h-auto !min-h-0 shadow-sm"
                  ledgerNonce={ledgerNonce}
                  onSelectAdvance={setAdvanceViewEntry}
                  onLinkAdvance={setLinkAdvanceEntry}
                  onDeleteAdvance={deleteAdvance}
                />
              </div>
            ) : salesTab === 'cuttinglist' ? (
              <SalesCuttingListMaterialPanel
                ready={cuttingListMaterialReadiness.ready}
                waitingNoMatch={cuttingListMaterialReadiness.waitingNoMatch}
                onOpenCuttingList={openCuttingListFromMaterialAlert}
              />
            ) : salesTab === 'refund' ? (
              <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-5">
                <p className="text-ui-xs font-bold text-zarewa-teal uppercase tracking-wider mb-1.5">
                  Potential refunds ({quotationsRefundPotentialRows.length})
                </p>
                <p className="text-ui-xs text-slate-500 leading-snug mb-3">
                  Matches the refund form picker: fully paid (≥99.5% of total), production{' '}
                  <span className="font-semibold text-slate-600">completed or cancelled</span> (or{' '}
                  <span className="font-semibold text-slate-600">void with payment</span>), refundable headroom and automatic preview above ₦1,000.{' '}
                  <strong>Click a row</strong> to start <strong>New refund</strong>.
                </p>
                {quotationsRefundPotentialRows.length === 0 ? (
                  <p className="text-ui-xs text-slate-400 italic">
                    None right now — no quotation meets the server eligibility rules, or you lack refund permissions.
                  </p>
                ) : (
                  <>
                    <ul className="max-h-[min(280px,42vh)] overflow-y-auto custom-scrollbar space-y-1.5">
                      {quotationsRefundPotentialRows.slice(0, REFUND_POTENTIAL_SIDEBAR_CAP).map((q) => {
                        const paid = quotationEffectivePaidNgn(q, quotationPayOpts);
                        const payStatus = quotationDisplayPaymentStatus(q, quotationPayOpts);
                        return (
                          <li key={q.id}>
                            <button
                              type="button"
                              onClick={() => openRefundCreateForQuotation(q)}
                              className="w-full text-left rounded-md border border-slate-200/80 bg-white/80 px-2 py-1.5 hover:bg-white hover:border-zarewa-teal/25 transition-colors"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-x-1 gap-y-0.5">
                                <span className="text-ui-xs font-bold text-zarewa-teal tabular-nums font-mono">{q.id}</span>
                              </div>
                              <span className="text-ui-xs text-slate-600 block truncate">{q.customer}</span>
                              <span className="text-ui-xs font-semibold text-slate-700 tabular-nums mt-0.5">
                                Paid {formatNgn(paid)}
                                {payStatus ? ` · ${payStatus}` : ''}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {quotationsRefundPotentialRows.length > REFUND_POTENTIAL_SIDEBAR_CAP ? (
                      <p className="text-ui-xs text-slate-400 mt-2">
                        +{quotationsRefundPotentialRows.length - REFUND_POTENTIAL_SIDEBAR_CAP} more — search on{' '}
                        <strong>Quotations</strong>.
                      </p>
                    ) : null}
                  </>
                )}
              </section>
            ) : null}
            <WorkspaceExpenseQuickActions />
          </aside>
        )}

        <div
          className={
            salesTab === 'customers' ? 'lg:col-span-4 min-w-0' : 'lg:col-span-3 min-w-0'
          }
        >
          <MainPanel
            className={`!rounded-xl !border-slate-200/90 !shadow-sm !bg-white !backdrop-blur-none border !border-solid !p-0 overflow-hidden ${
              salesTab === 'receipts'
                ? 'min-h-[min(520px,72vh)]'
                : 'min-h-[min(480px,72vh)] sm:min-h-[560px]'
            }`}
          >
            <div className="h-1 bg-zarewa-teal" aria-hidden />
            <div className="p-5 sm:p-6 md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-4">
                <div className="shrink-0">
                  <h2 className="text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal">
                    {TAB_LABELS[salesTab] ?? 'Records'}
                  </h2>
                  <p className="text-ui-xs font-semibold text-slate-400 mt-1 tabular-nums">
                    {salesTab === 'quotations' && (
                      <>
                        {listStats.quotations.shown} showing
                        {listStats.quotations.pendingApproval > 0
                          ? ` · ${listStats.quotations.pendingApproval} awaiting approval`
                          : ''}
                      </>
                    )}
                    {salesTab === 'receipts' && (
                      <>
                        {filteredMergedReceipts.length} showing
                        {paymentFilteredReceiptRows.length > filteredMergedReceipts.length
                          ? ` · ${paymentFilteredReceiptRows.length} match filter`
                          : ''}
                      </>
                    )}
                    {salesTab === 'cuttinglist' && <>{listStats.cuttinglist.shown} records</>}
                    {salesTab === 'refund' && (
                      <>
                        {listStats.refund.shown} records
                        {listStats.refund.pending > 0 ? ` · ${listStats.refund.pending} pending` : ''}
                        {listStats.refund.awaitingPay > 0
                          ? ` · ${listStats.refund.awaitingPay} approved (awaiting Finance)`
                          : ''}
                      </>
                    )}
                    {salesTab === 'customers' && (
                      <>
                        {listStats.customers.shown} showing · {listStats.customers.total} total
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {salesTab === 'quotations' ? (
                  <SalesListTableFrame
                    toolbar={
                      <>
                        <SalesListSearchInput
                          value={searchQuery}
                          onChange={setSearchQuery}
                          placeholder="Search ID, customer, date, status…"
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
                        icon={FileText}
                        title="No quotations match your search"
                        description="Try clearing filters or create a new quotation."
                      />
                    ) : (
                      <ul className="space-y-1.5">
                        {filteredQuotations.map((q) => {
                          const payCount = paymentCountByQuoteRef.get(String(q.id || '').trim()) || 0;
                          const payStatus = quotationDisplayPaymentStatus(q, quotationPayOpts);
                          const paidForUi = quotationEffectivePaidNgn(q, quotationPayOpts);
                          const meta2 = quotationListPaymentMeta(q, payCount, quotationPayOpts);
                          const qForFollowUp = { ...q, paidNgn: paidForUi, paymentStatus: payStatus };
                          return (
                            <li key={q.id} className={salesListItemClass(`q-${q.id}`, actionMenuKey)}>
                              <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                                <div className="min-w-0 flex-1 leading-tight">
                                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
                                    <p className="text-xs font-bold text-zarewa-teal truncate min-w-0">
                                      <span className="tabular-nums font-mono">{q.id}</span>
                                      <span className="font-medium text-slate-600"> · {q.customer}</span>
                                    </p>
                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                      <span className="text-xs font-black text-zarewa-teal tabular-nums">
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
                                      <SalesRowMenu
                                        rowKey={`q-${q.id}`}
                                        openKey={actionMenuKey}
                                        setOpenKey={setActionMenuKey}
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
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {quotations.length > showCount && (
                      <div className="flex justify-center mt-6">
                        <button
                          type="button"
                          onClick={() => setShowCount((c) => c + 20)}
                          className="px-6 py-2 rounded-lg border border-slate-200 text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal hover:bg-slate-50 transition-colors"
                        >
                          Show more quotations
                        </button>
                      </div>
                    )}
                  </SalesListTableFrame>
                ) : null}

                {salesTab === 'receipts' ? (
                  <SalesListTableFrame
                    toolbar={
                      <>
                        <SalesListSearchInput
                          value={searchQuery}
                          onChange={setSearchQuery}
                          placeholder="Search payment ID, customer, quotation, cutting list…"
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
                        icon={ReceiptIcon}
                        title={
                          receiptPaymentStatusFilter === 'all'
                            ? 'No payments match your search'
                            : 'No payments match this filter'
                        }
                        description="Adjust the status filter or search terms."
                      />
                    ) : (
                      <ul className="space-y-1.5">
                        {filteredMergedReceipts.map((r) => {
                          const meta2 = [r.quotationRef, r.date, r._payBadge].filter(Boolean).join(' · ');
                          const quotePayCount =
                            paymentCountByQuoteRef.get(String(r.quotationRef || '').trim()) || 0;
                          const cuttingChipLabel =
                            r._cuttingListLinkKind === 'linked' && r._cuttingListId
                              ? `CL ${r._cuttingListId}`
                              : r._cuttingListLabel;
                          return (
                            <li key={r.id} className={salesListItemClass(`rc-${r.id}`, actionMenuKey)}>
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
                                      <p className="text-xs font-bold text-zarewa-teal tabular-nums shrink-0">
                                        {r.id}
                                      </p>
                                      <p className="text-xs font-medium text-slate-600 truncate min-w-0">
                                        · {r.customer}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="text-xs font-black text-zarewa-teal tabular-nums">
                                        {r.amount}
                                      </span>
                                      <SalesRowMenu
                                        rowKey={`rc-${r.id}`}
                                        openKey={actionMenuKey}
                                        setOpenKey={setActionMenuKey}
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
                                    </div>
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
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {paymentFilteredReceiptRows.length > showCount && (
                      <div className="flex justify-center mt-6">
                        <button
                          type="button"
                          onClick={() => setShowCount((c) => c + 20)}
                          className="px-6 py-2 rounded-lg border border-slate-200 text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal hover:bg-slate-50 transition-colors"
                        >
                          Show more payments
                        </button>
                      </div>
                    )}
                  </SalesListTableFrame>
                ) : null}

                {salesTab === 'cuttinglist' ? (
                  <SalesListTableFrame
                    toolbar={
                      <>
                        <SalesListSearchInput
                          value={searchQuery}
                          onChange={setSearchQuery}
                          placeholder="Search list ID, customer, date, list status, production line status…"
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
                        icon={Scissors}
                        title="No cutting lists match your search"
                        description="Cutting lists appear here after you create them from quotations."
                      />
                    ) : (
                      <ul className="space-y-1.5">
                        {filteredCuttingLists.map((c) => {
                          const job = pickProductionJobForCuttingList(c.id, productionJobs, cuttingLists);
                          const lineSt = productionQueueLineStatusPresentation(c, job);
                          return (
                          <li key={c.id} className={salesListItemClass(`cl-${c.id}`, actionMenuKey)}>
                            <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 flex-1 leading-tight">
                                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
                                  <p className="text-xs font-bold text-zarewa-teal truncate min-w-0">
                                    <span className="tabular-nums font-mono">{c.id}</span>
                                    <span className="font-medium text-slate-600"> · {c.customer}</span>
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                    <span className="text-xs font-black text-zarewa-teal tabular-nums">
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
                                    <SalesRowMenu
                                      rowKey={`cl-${c.id}`}
                                      openKey={actionMenuKey}
                                      setOpenKey={setActionMenuKey}
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
                                  </div>
                                </div>
                                <p className="text-ui-xs text-slate-500 mt-0.5 tabular-nums">{c.date}</p>
                              </div>
                            </div>
                          </li>
                          );
                        })}
                      </ul>
                    )}
                    {cuttingLists.length > showCount && (
                      <div className="flex justify-center mt-6">
                        <button
                          type="button"
                          onClick={() => setShowCount((c) => c + 20)}
                          className="px-6 py-2 rounded-lg border border-slate-200 text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal hover:bg-slate-50 transition-colors"
                        >
                          Show more cutting lists
                        </button>
                      </div>
                    )}
                  </SalesListTableFrame>
                ) : null}

                {salesTab === 'refund' ? (
                  <SalesListTableFrame
                    toolbar={
                      <>
                        <SalesListSearchInput
                          value={searchQuery}
                          onChange={setSearchQuery}
                          placeholder="Search refund ID, customer, quotation, status…"
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
                        icon={RotateCcw}
                        title="No refunds match your search"
                        description="Refunds are created from settled quotations when returns are approved."
                      />
                    ) : (
                      <ul className="space-y-1.5">
                        {filteredRefunds.map((r) => {
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
                          ]
                            .filter(Boolean)
                            .join(' · ');
                          return (
                            <li
                              key={r.refundID}
                              data-testid={`refund-row-${r.refundID}`}
                              className={salesListItemClass(`rf-${r.refundID}`, actionMenuKey)}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                                <div className="min-w-0 flex-1 leading-tight">
                                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
                                    <p className="text-xs font-bold text-zarewa-teal truncate min-w-0">
                                      <span className="font-mono tabular-nums">{r.refundID}</span>
                                      <span className="font-medium text-slate-600"> · {r.customer}</span>
                                    </p>
                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                      <span className="text-xs font-black text-zarewa-teal tabular-nums">
                                        {formatNgn(r.amountNgn)}
                                      </span>
                                      <span className={`${CHIP} ${refundStatusChipClass(r.status)}`}>
                                        {r.status}
                                      </span>
                                      <SalesRowMenu
                                        rowKey={`rf-${r.refundID}`}
                                        openKey={actionMenuKey}
                                        setOpenKey={setActionMenuKey}
                                        onView={() => openRefundViewOnly(r)}
                                        onEdit={() => openRefundModal(r)}
                                        editDisabled={false}
                                        editTitle=""
                                      />
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
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {refunds.length > showCount && (
                      <div className="flex justify-center mt-6">
                        <button
                          type="button"
                          onClick={() => setShowCount((c) => c + 20)}
                          className="px-6 py-2 rounded-lg border border-slate-200 text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal hover:bg-slate-50 transition-colors"
                        >
                          Show more refunds
                        </button>
                      </div>
                    )}
                  </SalesListTableFrame>
                ) : null}

                {salesTab === 'customers' ? (
                  <SalesCustomersTab
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    createdByLabel={salesRoleLabel}
                    quotations={quotations}
                    receipts={mergedReceiptRows}
                    cuttingLists={cuttingLists}
                  />
                ) : null}
              </div>
            </div>
          </MainPanel>
        </div>
      </div>

      {/* --- MODALS (lazy-loaded on first open) --- */}
      {showQuotationModal ? (
      <Suspense fallback={null}>
      <QuotationModal
        isOpen={showQuotationModal}
        editData={selectedItem}
        accessMode={quotationAccessMode}
        onClose={() => setShowQuotationModal(false)}
        ledgerNonce={ledgerSyncKey}
        onLedgerChange={onLedgerSynced}
        onQuotationRevived={(q) => {
          setSelectedItem(q);
          setQuotationAccessMode('edit');
        }}
        useLedgerApi={Boolean(ws?.canMutate)}
        useQuotationApi={Boolean(ws?.canMutate)}
        quotedByStaff={salesRoleLabel}
        onRequestNewCustomer={requestNewCustomerFromQuotation}
        externalCustomerPick={quotationCustomerPick}
        onConsumeExternalCustomerPick={consumeQuotationCustomerPick}
      />
      </Suspense>
      ) : null}
      {customerAddOpen ? (
        <SalesCustomerCreateModal
          isOpen={customerAddOpen}
          onClose={handleCustomerCreateModalClose}
          createdByLabel={salesRoleLabel}
          onCreated={handleCustomerCreated}
        />
      ) : null}
      {showReceiptModal ? (
      <Suspense fallback={null}>
      <ReceiptModal
        isOpen={showReceiptModal}
        editData={selectedItem}
        accessMode={receiptAccessMode}
        onClose={() => {
          setShowReceiptModal(false);
          setPreselectedBankDepositId('');
        }}
        defaultBankDepositId={preselectedBankDepositId}
        workspaceSnapshot={ws?.snapshot}
        quotations={quotations}
        importedReceiptsForHistory={importedReceipts}
        ledgerNonce={ledgerSyncKey}
        onLedgerChange={onLedgerSynced}
        useLedgerApi={Boolean(ws?.canMutate)}
        handledByLabel={salesRoleLabel}
        onDeleteReceipt={
          canDeleteSalesRecord
            ? async (row) => deleteReceipt(String(row?.id || '').trim())
            : undefined
        }
      />
      </Suspense>
      ) : null}
      {showAdvanceModal ? (
      <Suspense fallback={null}>
      <AdvancePaymentModal
        isOpen={showAdvanceModal}
        onClose={() => {
          setShowAdvanceModal(false);
          setPreselectedBankDepositId('');
        }}
        defaultBankDepositId={preselectedBankDepositId}
        workspaceSnapshot={ws?.snapshot}
        onPosted={onLedgerSynced}
        useLedgerApi={Boolean(ws?.canMutate)}
        handledByLabel={salesRoleLabel}
      />
      </Suspense>
      ) : null}
      {linkAdvanceEntry ? (
        <LinkAdvanceModal
          isOpen={Boolean(linkAdvanceEntry)}
          advanceEntry={linkAdvanceEntry}
          onClose={() => setLinkAdvanceEntry(null)}
          quotations={quotations}
          ledgerNonce={ledgerSyncKey}
          onPosted={onLedgerSynced}
          useLedgerApi={Boolean(ws?.canMutate)}
        />
      ) : null}
      {advanceViewEntry ? (
      <ModalFrame isOpen={Boolean(advanceViewEntry)} onClose={() => setAdvanceViewEntry(null)}>
        <div className="z-modal-panel max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-xl">
          <h3 className="text-base font-bold text-zarewa-teal">Advance payment</h3>
          {advanceViewEntry ? (
            <dl className="mt-4 space-y-2 text-xs text-slate-700">
              <div>
                <dt className="font-semibold text-slate-400 uppercase text-ui-xs">Customer</dt>
                <dd>{advanceViewEntry.customerName || advanceViewEntry.customerID}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-400 uppercase text-ui-xs">Amount</dt>
                <dd className="text-lg font-black text-zarewa-teal tabular-nums">
                  {formatNgn(advanceViewEntry.amountNgn)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-400 uppercase text-ui-xs">Date</dt>
                <dd>{(advanceViewEntry.atISO || '').slice(0, 10)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-400 uppercase text-ui-xs">Method / ref</dt>
                <dd>{advanceViewEntry.paymentMethod || '—'}</dd>
                <dd className="text-slate-500">{advanceViewEntry.bankReference || '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-400 uppercase text-ui-xs">Purpose</dt>
                <dd>{advanceViewEntry.purpose || advanceViewEntry.note || '—'}</dd>
              </div>
            </dl>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={() => setAdvanceViewEntry(null)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-ui-xs font-semibold uppercase text-slate-600"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                if (advanceViewEntry) setAdvancePrintEntry(advanceViewEntry);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-ui-xs font-semibold uppercase"
            >
              <Printer size={14} /> Print voucher
            </button>
          </div>
        </div>
      </ModalFrame>
      ) : null}
      {advancePrintEntry ? (
      <PrintModalPortal open onClose={() => setAdvancePrintEntry(null)}>
              <div className="mx-auto max-w-4xl pb-16">
                <div className="quotation-print-root quotation-print-preview-mode rounded-lg border border-slate-200 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none">
                  <AdvancePaymentPrintView
                    customerName={advancePrintEntry.customerName || advancePrintEntry.customerID}
                    amountNgn={advancePrintEntry.amountNgn}
                    dateStr={(advancePrintEntry.atISO || '').slice(0, 10)}
                    accountLabel={advancePrintEntry.paymentMethod || '—'}
                    reference={advancePrintEntry.bankReference || '—'}
                    purpose={advancePrintEntry.purpose || advancePrintEntry.note || '—'}
                    handledBy={salesRoleLabel}
                  />
                </div>
                <div className="no-print mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-lg bg-amber-700 px-5 py-2.5 text-ui-xs font-semibold uppercase text-white shadow-lg"
                  >
                    Print / Save PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvancePrintEntry(null)}
                    className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-ui-xs font-semibold uppercase text-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
      </PrintModalPortal>
      ) : null}
      {showCuttingModal ? (
      <Suspense fallback={null}>
      <CuttingListModal
        isOpen={showCuttingModal}
        editData={selectedItem}
        accessMode={cuttingAccessMode}
        onClose={() => {
          const needsListRefresh =
            String(selectedItem?.status || '').trim() === 'Draft' || Boolean(selectedItem?.id);
          setShowCuttingModal(false);
          if (needsListRefresh && ws?.canMutate) void ws.refresh();
        }}
        quotations={quotations}
        receipts={mergedReceiptRows}
        cuttingLists={cuttingLists}
        onPersist={persistCuttingList}
        onCuttingListUpdated={(cl) => setSelectedItem(cl)}
        onDraftAutosaved={(cl) => {
          setSelectedItem(cl);
          setCuttingAccessMode('edit');
        }}
        handledByLabel={salesRoleLabel}
        linkedProductionJob={
          selectedItem?.id
            ? pickProductionJobForCuttingList(selectedItem.id, productionJobs, cuttingLists)
            : null
        }
      />
      </Suspense>
      ) : null}
      {showRefundModal ? (
      <Suspense fallback={null}>
      <RefundModal
        key={refundModalKey}
        isOpen={showRefundModal}
        mode={refundModalMode}
        record={selectedItem}
        onPersist={persistRefund}
        onClose={() => {
          setShowRefundModal(false);
          void fetchEligibleRefundQuotations();
        }}
        requesterLabel={salesRoleLabel}
        approverLabel={salesRoleLabel}
        quotations={quotations}
        refunds={refunds}
        productionJobs={ws?.snapshot?.productionJobs ?? []}
        productionJobAccessoryUsage={ws?.snapshot?.productionJobAccessoryUsage ?? []}
        productionJobCoils={ws?.snapshot?.productionJobCoils ?? []}
        receipts={mergedReceiptRows}
        cuttingLists={cuttingLists}
        availableStock={ws?.snapshot?.salesAvailableStock ?? []}
      />
      </Suspense>
      ) : null}
    </PageShell>
  );
};

class SalesRouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: humanizeReactError(error) };
  }

  componentDidCatch(error, info) {
    console.error('Sales route crashed during render.', error, info?.componentStack);
  }

  async hardResetAppShell() {
    try {
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (typeof navigator !== 'undefined' && navigator.serviceWorker?.getRegistrations) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {
      /* ignore */
    }
    const url = new URL(window.location.href);
    url.searchParams.set('_cb', String(Date.now()));
    window.location.replace(url.toString());
  }

  render() {
    if (this.state.hasError) {
      const buildId = typeof __ZAREWA_BUILD_ID__ !== 'undefined' ? __ZAREWA_BUILD_ID__ : '';
      return (
        <PageShell>
          <MainPanel className="!rounded-xl !border-slate-200/90 !shadow-sm !bg-white !p-6">
            <h2 className="text-lg font-bold text-zarewa-teal">Sales temporarily unavailable</h2>
            <p className="mt-2 text-sm text-slate-600">
              A screen error occurred while loading Sales. Use <strong>Clear cache &amp; reload</strong> below (or
              Ctrl+Shift+R). If this persists, share the time and build stamp with support.
            </p>
            {buildId ? (
              <p className="mt-2 text-ui-xs font-mono text-slate-500">
                Build: <code>{buildId}</code> · desk-fix-2026-07-10e
              </p>
            ) : (
              <p className="mt-2 text-ui-xs font-mono text-slate-500">desk-fix-2026-07-10e (build id missing)</p>
            )}
            {this.state.message ? (
              <p className="mt-2 text-ui-xs font-mono text-slate-500 break-all">{this.state.message}</p>
            ) : null}
            <button
              type="button"
              className="mt-4 inline-flex items-center rounded-lg bg-zarewa-teal px-4 py-2 text-ui-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:brightness-105"
              onClick={() => void this.hardResetAppShell()}
            >
              Clear cache &amp; reload
            </button>
          </MainPanel>
        </PageShell>
      );
    }
    return this.props.children;
  }
}

export default function SalesPage() {
  return (
    <SalesRouteErrorBoundary>
      <Sales />
    </SalesRouteErrorBoundary>
  );
}