import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Scissors,
  Plus,
  AlertTriangle,
  LayoutDashboard,
  Package,
  X,
} from 'lucide-react';

import { metreVarianceExceedsThreshold } from '../../lib/productionMetreVariance';
import { PageHeader, PageShell, PageTabs, ModalFrame, ModalScrollShell, ModalScrollHeader, ModalScrollBody, ModalScrollFooter } from '../../components/layout';
import { ProductionRegisterEditModal } from '../../components/operations/ProductionRegisterEditModal';
import RegisterCoilModal from '../../components/operations/RegisterCoilModal';
import { OperationsProductionOverview } from '../../components/operations/OperationsProductionOverview';
import { OperationsDeskToolbar } from '../../components/operations/OperationsDeskToolbar';
import { OperationsInventoryDesk } from '../../components/operations/OperationsInventoryDesk';
import {
  OPS_FILTER_CHIP,
  OPS_FILTER_CHIP_OFF,
  OPS_FILTER_CHIP_ON,
  OPS_FILTER_GROUP,
  OPS_NOTICE_WARN,
  OPS_SECTION_HINT,
  OPS_SECTION_TITLE,
} from '../../components/operations/operationsDeskUi';
import {
  liveJobCoilDetail,
  ProductionQueueRecords,
} from '../../components/operations/ProductionQueueRecords';
import { ProductionRowMenu } from '../../components/operations/ProductionRowMenu';
import {
  matchesProductionActiveFilter,
  PRODUCTION_ACTIVE_FILTERS,
} from '../../components/operations/productionQueueFilters';
import { normalizeOpsFocusTab } from '../../lib/storeClearanceRank';
import {
  buildCoilSpecBoardRows,
  buildTransitKgBySpec,
} from '../../lib/storeSpecAggregate';
import {
  buildStoneSpecBoardRows,
  buildTransitMByStoneSpec,
} from '../../lib/storeStoneSpecAggregate';
import { normalizeOrgStoreRestock } from '../../lib/orgStoreRestock';
import { STORE_STOCK_BUY_PATH } from '../../lib/coilRequestStatus';
import {
  ProductionListTableFrame,
  ProductionListSearchInput,
  ProductionListSortBar,
} from '../../components/operations/ProductionListTableFrame';
import { StockRegisterMonthEndModal } from '../../components/reports/StockRegisterMonthEndModal';
import MaterialExceptions from './MaterialExceptions';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useWorkspaceDomain } from '../../hooks/useWorkspaceDomain';
import { WorkspaceDeskSyncBanner } from '../../components/workspace/WorkspaceDeskSyncBanner';
import { apiFetch } from '../../lib/apiBase';
import { APP_DATA_TABLE_PAGE_SIZE, useAppTablePaging } from '../../lib/appDataTable';
import { AppTablePager, AppTableWrap } from '../../components/ui/AppDataTable';
import { ListEmptyState } from '../../components/ui/ListEmptyState';
import { pickProductionJobForCuttingList } from '../../lib/productionJobPick';
import { productionQueueLineStatusPresentation } from '../../lib/productionQueueLineStatus';
import { shouldShowPoInTransit } from '../../lib/inTransitVisibility.js';
import { rollupSkuStockDisplayRows } from '../../lib/operationsProductionOverviewCore.js';
import {
  grnKindForPoLine,
  isCoilMeterBasisLine,
  poLineIsOpenForReceiving,
  poLineOpenQtyForReceiving,
} from '../../lib/poLineTypes.js';
import {
  liveJobMaterialPresentation,
  normQuoteKeyForLiveJob,
  resolveLiveJobMaterialKind,
} from '../../lib/productionLiveJobMaterialKind';
import { compareSelectLabels } from '../../lib/selectOptionSort';
import { canonicalColourName } from '../../lib/colourCanonicalization.js';
import { printProductionFollowUpList } from '../../lib/productionFollowUpPrint.js';
import { isStoneFlatsheetQuotationLine } from '../../lib/stoneCoatedQuotationPolicy.js';

function quotedStoneFlatsheetOnQuote(quotation) {
  const products = quotation?.quotationLines?.products;
  if (!Array.isArray(products)) return false;
  return products.some((row) => {
    const qty = Number(String(row?.qty ?? '').replace(/,/g, '')) || 0;
    return qty > 0 && isStoneFlatsheetQuotationLine(row?.name);
  });
}

/** Current kg on the coil (after production use); uses API fields when present. */
function liveCoilWeightKg(lot) {
  if (lot.currentWeightKg != null && lot.currentWeightKg !== '') {
    const cw = Number(lot.currentWeightKg);
    if (Number.isFinite(cw)) return Math.max(0, cw);
  }
  if (lot.qtyRemaining != null && lot.qtyRemaining !== '') {
    const qr = Number(lot.qtyRemaining);
    if (Number.isFinite(qr)) return Math.max(0, qr);
  }
  const w = Number(lot.weightKg);
  if (Number.isFinite(w) && w > 0) return w;
  const q = Number(lot.qtyReceived);
  return Number.isFinite(q) ? Math.max(0, q) : 0;
}

/** Rough family for book stock adjustment picker (product name / type / id text). */
function productMaterialFamily(row) {
  const blob = [row?.name, row?.materialType, row?.material_type, row?.productID]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (blob.includes('aluzinc')) return 'aluzinc';
  if (blob.includes('alumin')) return 'aluminium';
  if (blob.includes('galvan')) return 'aluzinc';
  return 'other';
}

/** Roll up conversion checks for one cutting list (multiple coils → one summary line). */
function summarizeConversionChecksForCuttingList(checks, formatPct) {
  if (!Array.isArray(checks) || !checks.length) return null;
  const alertSeverityRank = (s) => {
    const t = String(s || 'OK').toLowerCase();
    if (t === 'high') return 4;
    if (t === 'low') return 3;
    if (t === 'watch') return 2;
    return 1;
  };
  let worst = 'OK';
  let worstR = 0;
  for (const c of checks) {
    const s = String(c.alertState || 'OK');
    const r = alertSeverityRank(s);
    if (r > worstR) {
      worstR = r;
      worst = String(c.alertState || 'OK');
    }
  }
  const sorted = [...checks].sort((a, b) =>
    String(b.checkedAtISO || '').localeCompare(String(a.checkedAtISO || ''))
  );
  const latest = sorted[0];
  const v = latest.varianceSummary?.variances ?? {};
  return {
    count: checks.length,
    worst,
    deltaLabel: `Δ Std ${formatPct(v.standardPct)}`,
  };
}

/** Trailing number from cutting list id for numeric sort (larger suffix ≈ newer list). */
function cuttingListIdNumericRank(id) {
  const s = String(id ?? '').trim();
  const m = s.match(/(\d+)\s*$/);
  if (m) return Number(m[1]) || 0;
  const digits = s.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

/** Lexical ISO datetime, newest first; rows without a timestamp sort last. */
function compareIsoNewestFirst(isoA, isoB) {
  const a = String(isoA ?? '').trim();
  const b = String(isoB ?? '').trim();
  const aEmpty = !a;
  const bEmpty = !b;
  if (aEmpty && bEmpty) return 0;
  if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
  return b.localeCompare(a);
}

/** Lower score = needs attention first (active + closed production lists). */
function productionAttentionScore(row) {
  const completed = Boolean(row?.completed);
  const pr = String(row?.priority || '');
  if (completed || pr === 'Done' || pr === 'Cancelled') return 9;
  if (row?.needsCoil) return 0;
  if (row?.managerReviewRequired) return 1;
  if (row?.overdue) return 2;
  if (pr === 'High') return 3;
  if (pr === 'Waiting' || pr === 'Wait') return 4;
  return 5;
}

/**
 * Ascending baseline for production queue sort fields (dir applied by caller).
 * @param {'attention'|'id'|'registered'|'customer'|'status'} field
 */
function compareProductionQueueRows(a, b, field) {
  if (field === 'attention') {
    const pa = productionAttentionScore(a);
    const pb = productionAttentionScore(b);
    if (pa !== pb) return pa - pb;
    const ra = cuttingListIdNumericRank(a.id);
    const rb = cuttingListIdNumericRank(b.id);
    if (ra !== rb) return ra - rb;
    return String(a.id || '').localeCompare(String(b.id || ''));
  }
  if (field === 'customer') {
    const c = String(a.customer || '').localeCompare(String(b.customer || ''), undefined, { sensitivity: 'base' });
    if (c !== 0) return c;
    const ra = cuttingListIdNumericRank(a.id);
    const rb = cuttingListIdNumericRank(b.id);
    if (ra !== rb) return ra - rb;
    return String(a.id || '').localeCompare(String(b.id || ''));
  }
  if (field === 'status') {
    const s = String(a.status || '').localeCompare(String(b.status || ''));
    if (s !== 0) return s;
    const ra = cuttingListIdNumericRank(a.id);
    const rb = cuttingListIdNumericRank(b.id);
    if (ra !== rb) return ra - rb;
    return String(a.id || '').localeCompare(String(b.id || ''));
  }
  if (field === 'registered') {
    /* Asc = oldest first (invert newest-first helper). */
    const tc = compareIsoNewestFirst(a.queueRegisteredAtISO, b.queueRegisteredAtISO);
    if (tc !== 0) return -tc;
    const na = cuttingListIdNumericRank(a.id);
    const nb = cuttingListIdNumericRank(b.id);
    if (na !== nb) return na - nb;
    return String(a.id || '').localeCompare(String(b.id || ''));
  }
  /* id — oldest first (lowest trailing # / stable id) */
  const na = cuttingListIdNumericRank(a.id);
  const nb = cuttingListIdNumericRank(b.id);
  if (na !== nb) return na - nb;
  return String(a.id || '').localeCompare(String(b.id || ''));
}

function sortProductionQueueRows(rows, field, dir) {
  return [...rows].sort((a, b) => {
    const c = compareProductionQueueRows(a, b, field);
    return dir === 'desc' ? -c : c;
  });
}

/** Rows per page for production line lists (live jobs, closed queue, manager review). */
const PRODUCTION_TABLE_PAGE_SIZE = 10;

const PRODUCTION_SORT_FIELDS = [
  { id: 'registered', label: 'Registered' },
  { id: 'id', label: 'Cutting list #' },
  { id: 'attention', label: 'Attention' },
  { id: 'customer', label: 'Customer' },
  { id: 'status', label: 'Status' },
];

function isStoneFlatsheetSku(productID) {
  return /^STONE-FS-/i.test(String(productID || ''));
}

function isStoneMetreSku(productID) {
  const pid = String(productID || '');
  return /^STONE-/i.test(pid) && !/^STONE-FS-/i.test(pid);
}

/** @param {string | undefined} kind */
function normalizeStockReceiveKind(kind) {
  if (kind === 'stone_meter' || kind === 'stone_flatsheet' || kind === 'accessory' || kind === 'coil') {
    return kind;
  }
  if (kind === 'stone') return 'stone_meter';
  return 'coil';
}

/** Matches `confirmStoreReceipt` — POs store can post GRN against */
const PO_RECEIVABLE_STATUSES = ['Approved', 'On loading', 'In Transit'];

/** Default rows shown; search or sort surfaces older items. */
const STOCK_SIDE_LIST_LIMIT = 15;
/** Cap unfiltered coil live list to keep Stock tab responsive. */
const COIL_SIDE_LIST_LIMIT = 40;

function sortTransitPurchaseOrders(rows, sortKey) {
  const poCmp = (a, b) => String(a.poID || '').localeCompare(String(b.poID || ''));
  return [...rows].sort((a, b) => {
    switch (sortKey) {
      case 'orderAsc': {
        const c = String(a.orderDateISO || '').localeCompare(String(b.orderDateISO || ''));
        return c !== 0 ? c : poCmp(a, b);
      }
      case 'etaAsc': {
        const emptyA = !String(a.expectedDeliveryISO || '').trim();
        const emptyB = !String(b.expectedDeliveryISO || '').trim();
        if (emptyA !== emptyB) return emptyA ? 1 : -1;
        const c = String(a.expectedDeliveryISO || '').localeCompare(String(b.expectedDeliveryISO || ''));
        return c !== 0 ? c : poCmp(a, b);
      }
      case 'etaDesc': {
        const emptyA = !String(a.expectedDeliveryISO || '').trim();
        const emptyB = !String(b.expectedDeliveryISO || '').trim();
        if (emptyA !== emptyB) return emptyA ? 1 : -1;
        const c = String(b.expectedDeliveryISO || '').localeCompare(String(a.expectedDeliveryISO || ''));
        return c !== 0 ? c : poCmp(a, b);
      }
      case 'supplierAsc': {
        const c = String(a.supplierName || '').localeCompare(String(b.supplierName || ''));
        return c !== 0 ? c : poCmp(a, b);
      }
      case 'poAsc':
        return poCmp(a, b);
      case 'statusAsc': {
        const c = String(a.status || '').localeCompare(String(b.status || ''));
        return c !== 0 ? c : String(b.orderDateISO || '').localeCompare(String(a.orderDateISO || ''));
      }
      case 'orderDesc':
      default: {
        const c = String(b.orderDateISO || '').localeCompare(String(a.orderDateISO || ''));
        return c !== 0 ? c : poCmp(a, b);
      }
    }
  });
}

function transitPoSearchBlob(p) {
  const lines = Array.isArray(p.lines) ? p.lines : [];
  const lineBits = lines
    .map((l) => [l.productName, l.productID, l.color, l.gauge].filter(Boolean).join(' '))
    .join(' ');
  return [
    p.poID,
    p.supplierName,
    p.status,
    p.transportAgentName,
    p.expectedDeliveryISO,
    p.orderDateISO,
    lineBits,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** Matches server GRN default `CL-YY-####` (writeOps.postPurchaseOrderGrn). */
const CL_COIL_NO_RE = /^CL-(\d{2})-(\d{1,6})$/i;

function maxClSequenceForYear(coilLots, yy2, extraCoilNos = []) {
  let max = 0;
  for (const lot of coilLots || []) {
    const m = String(lot.coilNo || '').trim().match(CL_COIL_NO_RE);
    if (!m || m[1] !== yy2) continue;
    max = Math.max(max, parseInt(m[2], 10));
  }
  for (const cn of extraCoilNos) {
    const m = String(cn || '').trim().match(CL_COIL_NO_RE);
    if (!m || m[1] !== yy2) continue;
    max = Math.max(max, parseInt(m[2], 10));
  }
  return max;
}

function coilReceiptSearchBlob(c) {
  const live = liveCoilWeightKg(c);
  return [
    c.coilNo,
    c.colour,
    c.gaugeLabel,
    c.materialTypeName,
    c.productID,
    c.poID,
    c.supplierName,
    c.location,
    c.currentStatus,
    c.parentCoilNo,
    c.materialOriginNote,
    c.supplierID,
    Number.isFinite(live) ? String(live) : '',
    Number.isFinite(live) ? live.toFixed(2) : '',
    Number.isFinite(live) ? live.toFixed(0) : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** Map user `key:` prefix → internal field id for targeted search. */
const COIL_RECEIPT_SEARCH_FIELD_KEYS = {
  coil: 'coilNo',
  coilno: 'coilNo',
  no: 'coilNo',
  colour: 'colour',
  color: 'colour',
  gauge: 'gauge',
  g: 'gauge',
  material: 'material',
  mat: 'material',
  type: 'material',
  po: 'poID',
  supplier: 'supplier',
  loc: 'location',
  location: 'location',
  status: 'status',
  product: 'product',
  id: 'product',
  kg: 'kg',
  weight: 'kg',
};

/**
 * @param {Record<string, unknown>} c
 * @param {string} fieldKey
 */
function coilReceiptFieldHaystack(c, fieldKey) {
  switch (fieldKey) {
    case 'coilNo':
      return String(c.coilNo || '');
    case 'colour':
      return String(c.colour || '');
    case 'gauge':
      return String(c.gaugeLabel || '');
    case 'material':
      return [c.materialTypeName, c.productID].filter(Boolean).join(' ');
    case 'poID':
      return String(c.poID || '');
    case 'supplier':
      return String(c.supplierName || '');
    case 'location':
      return String(c.location || '');
    case 'status':
      return String(c.currentStatus || '');
    case 'product':
      return String(c.productID || '');
    case 'kg':
      return String(liveCoilWeightKg(c));
    default:
      return '';
  }
}

function normalizeCoilSearchChunk(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Split query into `field:value` filters and free-text tokens (space = AND).
 * @param {string} raw
 * @returns {{ pairs: { field: string; value: string }[]; tokens: string[] }}
 */
function parseCoilReceiptSearchQuery(raw) {
  const q = String(raw || '').trim();
  if (!q) return { pairs: [], tokens: [] };
  const segments = q.split(/\s+/).filter(Boolean);
  const pairs = [];
  const tokens = [];
  for (const seg of segments) {
    const idx = seg.indexOf(':');
    if (idx > 0 && idx < seg.length - 1) {
      const kRaw = seg.slice(0, idx).toLowerCase();
      let vRaw = seg.slice(idx + 1);
      if (
        (vRaw.startsWith('"') && vRaw.endsWith('"') && vRaw.length > 1) ||
        (vRaw.startsWith("'") && vRaw.endsWith("'") && vRaw.length > 1)
      ) {
        vRaw = vRaw.slice(1, -1);
      }
      const field = COIL_RECEIPT_SEARCH_FIELD_KEYS[kRaw];
      const v = normalizeCoilSearchChunk(vRaw);
      if (field && v) pairs.push({ field, value: v });
      else tokens.push(normalizeCoilSearchChunk(seg));
    } else {
      tokens.push(normalizeCoilSearchChunk(seg));
    }
  }
  return { pairs, tokens };
}

/**
 * @param {Record<string, unknown>} c
 * @param {{ pairs: { field: string; value: string }[]; tokens: string[] }} parsed
 */
function coilReceiptRowMatchesSearch(c, parsed) {
  for (const { field, value } of parsed.pairs) {
    if (field === 'kg') {
      const target = Number(value.replace(/,/g, '.'));
      const live = liveCoilWeightKg(c);
      if (Number.isFinite(target)) {
        const near = Math.abs(live - target) <= 0.51;
        const strHay = normalizeCoilSearchChunk(`${live} ${live.toFixed(2)}`);
        if (!near && !strHay.includes(value)) return false;
      } else if (!normalizeCoilSearchChunk(coilReceiptFieldHaystack(c, 'kg')).includes(value)) {
        return false;
      }
      continue;
    }
    const hay = normalizeCoilSearchChunk(coilReceiptFieldHaystack(c, field));
    if (!hay.includes(value)) return false;
  }
  const blob = coilReceiptSearchBlob(c);
  for (const tok of parsed.tokens) {
    if (!tok) continue;
    if (blob.includes(tok)) continue;
    if (/\d/.test(tok)) {
      const digitsTok = tok.replace(/[^\d.]/g, '');
      const gNorm = String(c.gaugeLabel || '')
        .toLowerCase()
        .replace(/[^\d.]/g, '');
      if (digitsTok && gNorm.includes(digitsTok)) continue;
      const live = liveCoilWeightKg(c);
      const liveStr = Number.isFinite(live) ? live.toFixed(2) : '';
      if (digitsTok && liveStr.replace(/[^\d.]/g, '').includes(digitsTok)) continue;
    }
    return false;
  }
  return true;
}

/**
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 * @param {'received' | 'coilNo' | 'colour' | 'gauge' | 'material' | 'kg'} key
 * @param {'asc' | 'desc'} dir
 */
function compareCoilReceiptRows(a, b, key, dir) {
  const tieCoil = () => String(a.coilNo || '').localeCompare(String(b.coilNo || ''), undefined, { numeric: true });
  const flip = dir === 'desc' ? -1 : 1;
  const cmpNum = (va, vb) => {
    if (va < vb) return -1 * flip;
    if (va > vb) return 1 * flip;
    return 0;
  };
  const cmpStr = (sa, sb) => {
    const c = String(sa || '').localeCompare(String(sb || ''), undefined, { numeric: true, sensitivity: 'base' });
    if (c !== 0) return c * flip;
    return 0;
  };
  switch (key) {
    case 'kg': {
      const d = cmpNum(liveCoilWeightKg(a), liveCoilWeightKg(b));
      return d || tieCoil();
    }
    case 'coilNo': {
      const d = cmpStr(a.coilNo, b.coilNo);
      return d || tieCoil();
    }
    case 'colour': {
      const d = cmpStr(a.colour, b.colour);
      return d || tieCoil();
    }
    case 'gauge': {
      const d = cmpStr(a.gaugeLabel, b.gaugeLabel);
      return d || tieCoil();
    }
    case 'material': {
      const d = cmpStr(
        `${a.materialTypeName || ''} ${a.productID || ''}`.trim(),
        `${b.materialTypeName || ''} ${b.productID || ''}`.trim()
      );
      return d || tieCoil();
    }
    case 'received':
    default: {
      const da = String(a.receivedAtISO || '');
      const db = String(b.receivedAtISO || '');
      const dateCmp = da.localeCompare(db);
      if (dateCmp !== 0) return dateCmp * flip;
      return tieCoil();
    }
  }
}

const ADJUST_REASONS = [
  'Damage',
  'Overstock',
  'Count correction',
  'Loss / shrinkage',
  'Other',
];

const Operations = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { show: showToast } = useToast();
  const {
    products: inventoryRows,
    purchaseOrders,
    inTransitLoads,
    confirmStoreReceipt,
    adjustStock,
    coilLots,
    materialIncidents,
    movements,
  } = useInventory();
  const ws = useWorkspace();
  const wsRefresh = ws?.refresh;
  const { domainLoading, domainReady } = useWorkspaceDomain('operations');
  const canReceiveInventory = Boolean(ws?.hasPermission?.('inventory.receive'));
  const canAdjustInventory = Boolean(ws?.hasPermission?.('inventory.adjust'));
  const canAcknowledgeCoilSkuDrift = Boolean(
    ws?.hasPermission?.('material_incidents.approve') || ws?.hasPermission?.('*')
  );
  const canRegisterCoil = Boolean(
    ws?.hasPermission?.('purchase_orders.manage') ||
      ws?.hasPermission?.('inventory.receive') ||
      ws?.hasPermission?.('operations.manage') ||
      ws?.hasPermission?.('production.manage')
  );
  const canOtRequest = Boolean(ws?.hasPermission?.('ot.request') || ws?.hasPermission?.('*'));

  const [activeTab, setActiveTab] = useState('overview');
  const [materialIncidentFocusId, setMaterialIncidentFocusId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  /** Closed-record list: all | completed | cancelled | coils_allocated (in-progress jobs are above). */
  const [productionFilter, setProductionFilter] = useState('all');
  /** In-progress panel: all | coils_allocated | no_coil | running | planned | attention */
  const [productionActiveFilter, setProductionActiveFilter] = useState('all');
  const [productionActiveSort, setProductionActiveSort] = useState({ field: 'registered', dir: 'desc' });
  const [productionClosedSort, setProductionClosedSort] = useState({ field: 'registered', dir: 'desc' });
  const [actionMenuKey, setActionMenuKey] = useState(null);
  useEffect(() => {
    if (!ws?.hasWorkspaceData) return;
    const onlineFilters = new Set(['all', 'completed', 'cancelled', 'coils_allocated']);
    if (onlineFilters.has(productionFilter)) return;
    setProductionFilter('all');
  }, [ws?.hasWorkspaceData, productionFilter]);
  useEffect(() => {
    if (!ws?.hasWorkspaceData) return;
    const activeFilters = new Set(PRODUCTION_ACTIVE_FILTERS);
    if (activeFilters.has(productionActiveFilter)) return;
    setProductionActiveFilter('all');
  }, [ws?.hasWorkspaceData, productionActiveFilter]);
  useEffect(() => {
    if (!actionMenuKey) return;
    const onDown = (e) => {
      if (e.target.closest?.('[data-production-action-menu]')) return;
      setActionMenuKey(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [actionMenuKey]);
  const [showStockAdjust, setShowStockAdjust] = useState(false);
  const [showCoilRequest, setShowCoilRequest] = useState(false);
  const [showRegisterCoil, setShowRegisterCoil] = useState(false);
  /** `job` = live API job row; `pending` = offline cutting list queue (no traceability). */
  const [productionTraceModal, setProductionTraceModal] = useState(null);
  const [monthEndStockOpen, setMonthEndStockOpen] = useState(false);
  const opsBranchId = ws.viewAllBranches ? '' : ws.branchScope || ws.session?.currentBranchId || '';
  const opsBranchLabel = useMemo(() => {
    if (!opsBranchId) return '';
    return (
      (ws.snapshot?.branches || []).find((b) => String(b.id || b.branchId) === String(opsBranchId))?.name ||
      opsBranchId
    );
  }, [opsBranchId, ws.snapshot?.branches]);
  const [completeChecklistModal, setCompleteChecklistModal] = useState(null);
  const [completeChecklist, setCompleteChecklist] = useState({
    transferPosted: false,
    runLogPosted: false,
    conversionChecked: false,
  });

  const [receiveDraft, setReceiveDraft] = useState({ poID: '', location: '' });
  const [expandedReceivePoId, setExpandedReceivePoId] = useState(null);
  const [grnLines, setGrnLines] = useState([]);
  const [grnConversionOverride, setGrnConversionOverride] = useState(false);
  const [grnSubmitting, setGrnSubmitting] = useState(false);
  const [stockAdjustSubmitting, setStockAdjustSubmitting] = useState(false);
  const grnReceivePoIdRef = useRef('');

  const [coilRequestForm, setCoilRequestForm] = useState({
    unit: 'kg',
    rows: [{ gauge: '', colour: '', materialType: '', requestedKg: '', unit: 'kg' }],
    note: '',
  });
  const [coilRequestSubmitting, setCoilRequestSubmitting] = useState(false);

  const [stockAdjust, setStockAdjust] = useState({
    productID: '',
    type: 'Increase',
    qty: '',
    reasonCode: 'Count correction',
    reasonNote: '',
    date: '',
  });
  /** After 409 COIL_SKU_DRIFT: show acknowledgement before retry. */
  const [stockAdjustCoilPrompt, setStockAdjustCoilPrompt] = useState(false);
  const [stockAdjustCoilAck, setStockAdjustCoilAck] = useState(false);
  const [stockAdjustCoilCount, setStockAdjustCoilCount] = useState(null);
  const [stockAdjustLargePrompt, setStockAdjustLargePrompt] = useState(false);
  const [stockAdjustLargeAck, setStockAdjustLargeAck] = useState(false);
  const [stockAdjustLargeMeta, setStockAdjustLargeMeta] = useState(/** @type {{ qty?: number, valueNgn?: number } | null} */ (null));
  const [stockAdjustConfirmText, setStockAdjustConfirmText] = useState('');
  const [stockAdjustMaterialFamily, setStockAdjustMaterialFamily] = useState(
    /** @type {null | 'aluminium' | 'aluzinc'} */ (null)
  );
  useEffect(() => {
    if (showStockAdjust) {
      setStockAdjustCoilPrompt(false);
      setStockAdjustCoilAck(false);
      setStockAdjustCoilCount(null);
      setStockAdjustLargePrompt(false);
      setStockAdjustLargeAck(false);
      setStockAdjustLargeMeta(null);
      setStockAdjustConfirmText('');
    }
  }, [showStockAdjust]);

  const stockAdjustProductOptions = useMemo(() => {
    const base =
      !stockAdjustMaterialFamily
        ? inventoryRows
        : (() => {
            const filtered = inventoryRows.filter((r) => productMaterialFamily(r) === stockAdjustMaterialFamily);
            return filtered.length ? filtered : inventoryRows;
          })();
    return [...base].sort((a, b) =>
      compareSelectLabels(`${a.name || ''} ${a.productID || ''}`, `${b.name || ''} ${b.productID || ''}`)
    );
  }, [inventoryRows, stockAdjustMaterialFamily]);

  const closeStockAdjustModal = useCallback(() => {
    setShowStockAdjust(false);
    setStockAdjustMaterialFamily(null);
    setStockAdjustCoilPrompt(false);
    setStockAdjustCoilAck(false);
    setStockAdjustCoilCount(null);
  }, []);

  const [transitSearch, setTransitSearch] = useState('');
  const [transitSort, setTransitSort] = useState('orderDesc');

  const [coilReceiptSort, setCoilReceiptSort] = useState(() =>
    /** @type {{ key: 'received' | 'coilNo' | 'colour' | 'gauge' | 'material' | 'kg'; dir: 'asc' | 'desc' }} */ ({
      key: 'received',
      dir: 'desc',
    })
  );
  const [coilLiveSearch, setCoilLiveSearch] = useState('');
  const [coilSearchRemoteRows, setCoilSearchRemoteRows] = useState([]);
  const [coilSearchRemoteLoading, setCoilSearchRemoteLoading] = useState(false);
  /** Stock management: filter in-transit POs and received stock panel (coil lots vs metre/unit SKUs). */
  const [stockReceiveKind, setStockReceiveKind] = useState(
    () => /** @type {'coil'|'stone_meter'|'stone_flatsheet'|'accessory'} */ ('coil')
  );
  const [specBoardFilter, setSpecBoardFilter] = useState(
    () => /** @type {'all'|'below_min'|'thin'|'idle'|'heroes'} */ ('all')
  );
  const [productMovementModal, setProductMovementModal] = useState(null);
  const [productMovementsLoading, setProductMovementsLoading] = useState(false);
  const [productMovementsRows, setProductMovementsRows] = useState([]);
  const productMovementsPage = useAppTablePaging(
    productMovementsRows,
    APP_DATA_TABLE_PAGE_SIZE,
    productMovementModal?.productID
  );

  const setupMasterData = ws?.snapshot?.masterData ?? null;

  const coilColourLabel = useCallback(
    (raw) => canonicalColourName(setupMasterData, raw) || String(raw ?? '').trim() || '—',
    [setupMasterData]
  );

  const inventoryStats = useMemo(() => {
    const masterData = setupMasterData;
    const activeCoils = coilLots.filter(
      (c) => c.currentStatus !== 'Consumed' && c.currentStatus !== 'Finished'
    );
    let aluzincKg = 0;
    let aluminiumKg = 0;
    let lowStock = 0;
    const buckets = new Map();

    for (const c of activeCoils) {
      const live = liveCoilWeightKg(c);
      if (live > 0 && live < 85) lowStock += 1;
      const mt = String(c.materialTypeName || '').toLowerCase();
      if (mt.includes('alumin')) aluminiumKg += live;
      else aluzincKg += live;

      const gauge = c.gaugeLabel || '—';
      const colour = canonicalColourName(masterData, c.colour || '') || c.colour || '—';
      const material = c.materialTypeName || c.productID || '—';
      const key = `${gauge}|${colour}|${material}`;
      buckets.set(key, {
        gauge,
        colour,
        material,
        kg: (buckets.get(key)?.kg || 0) + live,
      });
    }

    const topMaterials = [...buckets.values()].sort((a, b) => b.kg - a.kg).slice(0, 3);
    return {
      totalKg: aluminiumKg + aluzincKg,
      aluzincKg,
      aluminiumKg,
      lowStock,
      topMaterials,
    };
  }, [coilLots, setupMasterData]);
  const productionJobs = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.productionJobs) ? ws.snapshot.productionJobs : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.productionJobs]
  );
  const productionJobCoils = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.productionJobCoils) ? ws.snapshot.productionJobCoils : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.productionJobCoils]
  );
  const productionConversionChecks = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.productionConversionChecks)
        ? ws.snapshot.productionConversionChecks
        : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.productionConversionChecks]
  );
  const cuttingLists = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.cuttingLists) ? ws.snapshot.cuttingLists : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.cuttingLists]
  );
  const workspaceQuotations = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.quotations) ? ws.snapshot.quotations : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.quotations]
  );
  const workspaceMaterialTypes = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.masterData?.materialTypes)
        ? ws.snapshot.masterData.materialTypes
        : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.masterData?.materialTypes]
  );
  const productionQueueModel = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matches = (item) => {
      if (!q) return true;
      const coilBlob = Array.isArray(item.reservedCoilNos) ? item.reservedCoilNos.join(' ') : '';
      const blob = `${item.id} ${item.customer} ${item.spec} ${item.quotationRef || ''} ${item.cuttingListId || ''} ${
        item.lineStatusLabel || ''
      } ${item.status || ''} ${item.coilLabel || ''} ${coilBlob}`.toLowerCase();
      return blob.includes(q);
    };

    if (!ws?.hasWorkspaceData) {
      const rows = cuttingLists
        .filter((cl) => !cl.productionRegistered)
        .map((cl) => ({
          queueKind: 'cuttingList',
          id: cl.id,
          customer: cl.customer || '—',
          spec: cl.quotationRef ? `Quote ${cl.quotationRef}` : 'Cutting list',
          quantity: typeof cl.total === 'string' ? cl.total : `${cl.total ?? '—'}`,
          priority:
            String(cl.status || '').toLowerCase().includes('draft') ||
            String(cl.status || '').toLowerCase().includes('pending')
              ? 'High'
              : 'Normal',
          completed: false,
          quotationRef: cl.quotationRef || '',
          cuttingListId: cl.id,
          status: '',
          coilCount: 0,
          coilLabel: null,
          lineStatusLabel: 'Waiting',
          lineStatusChipClass: 'border-orange-500 bg-orange-50 text-orange-950',
          queueRegisteredAtISO: cl.dateISO || '',
        }));
      return {
        mode: 'offline',
        sections: [{ key: 'pending', title: null, rows: rows.filter(matches) }],
      };
    }

    const coilsForJob = (jobID) =>
      jobID ? productionJobCoils.filter((c) => c.jobID === jobID) : [];

    const registered = cuttingLists.filter((cl) => cl.productionRegistered);

    const mapRegistered = (cl) => {
      const job = pickProductionJobForCuttingList(cl.id, productionJobs, cuttingLists);
      const status = job?.status ?? 'Planned';
      const isCompleted = status === 'Completed';
      const isCancelled = status === 'Cancelled';
      const closedRecord = isCompleted || isCancelled;
      const jobID = job?.jobID;
      const jobCoils = coilsForJob(jobID);
      const nCoils = jobCoils.length;
      const reservedCoilNos = jobCoils.map((c) => String(c.coilNo || '').trim()).filter(Boolean);
      const reservedKg = jobCoils.reduce((s, c) => s + (Number(c.openingWeightKg) || 0), 0);
      const hasCoilsAllocated = nCoils > 0;
      const lineStatus = productionQueueLineStatusPresentation(cl, job);
      const qMat =
        workspaceQuotations.find(
          (row) => row?.id && normQuoteKeyForLiveJob(row.id) === normQuoteKeyForLiveJob(cl.quotationRef)
        ) || null;
      const liveMatKind = resolveLiveJobMaterialKind({
        quotation: qMat,
        cuttingList: cl,
        materialTypes: workspaceMaterialTypes,
      });
      const liveMatBase = liveJobMaterialPresentation(liveMatKind);
      const liveMatUi =
        status === 'Planned'
          ? liveMatBase
          : { ...liveMatBase, cardClass: 'border-sky-100 bg-white/90' };
      const specParts = [
        cl.quotationRef ? `Quote ${cl.quotationRef}` : null,
        cl.productName || cl.productID || null,
      ].filter(Boolean);
      const plannedM = Number(cl.totalMeters ?? job?.plannedMeters ?? 0);
      const actualM = Number(job?.actualMeters ?? 0);
      const metreVarianceAttention =
        isCompleted && metreVarianceExceedsThreshold(plannedM, actualM);
      const conversionHighLow = ['High', 'Low'].includes(String(job?.conversionAlertState || ''));
      return {
        queueKind: 'registered',
        id: cl.id,
        customer: cl.customer || '—',
        spec: specParts.length ? specParts.join(' · ') : '—',
        quantity: isCompleted
          ? `${actualM.toLocaleString()}m posted`
          : isCancelled
            ? 'Cancelled'
            : `${plannedM.toLocaleString()}m planned`,
        status,
        coilCount: nCoils,
        hasCoilsAllocated,
        reservedCoilNos,
        reservedKg,
        coilLabel: !job
          ? 'Syncing production data…'
          : closedRecord
            ? nCoils > 0
              ? `${nCoils} coil(s) on record`
              : liveMatKind === 'stone' && quotedStoneFlatsheetOnQuote(qMat)
                ? 'Stone flatsheet m² — use correction if missing'
                : null
            : status === 'Planned'
              ? liveMatKind === 'stone'
                ? nCoils === 0
                  ? 'Stone job — no coil needed'
                  : `Coils: ${nCoils} allocated`
                : nCoils === 0
                  ? 'Coils: none (allocate before start)'
                  : `Coils: ${nCoils} allocated`
              : status === 'Running'
                ? liveMatKind === 'stone' && nCoils === 0
                  ? 'Stone run — record flatsheet m² below'
                  : `Coils: ${nCoils} on line`
                : null,
        priority: closedRecord
          ? isCancelled
            ? 'Cancelled'
            : 'Done'
          : !job
            ? 'Wait'
            : nCoils === 0 && status === 'Planned' && liveMatKind !== 'stone'
              ? 'High'
              : job.managerReviewRequired ||
                  conversionHighLow ||
                  metreVarianceAttention ||
                  (job.endDateISO && job.endDateISO <= new Date().toISOString().slice(0, 10))
                ? 'High'
                : 'Normal',
        managerReviewRequired: Boolean(job?.managerReviewRequired),
        metreVarianceAttention,
        conversionHighLow,
        needsCoil: !closedRecord && status === 'Planned' && nCoils === 0 && liveMatKind !== 'stone',
        dueDateISO: job?.endDateISO || null,
        overdue:
          !closedRecord &&
          Boolean(job?.endDateISO) &&
          String(job.endDateISO) < new Date().toISOString().slice(0, 10),
        completed: closedRecord,
        quotationRef: cl.quotationRef || '',
        cuttingListId: cl.id,
        cuttingListStatus: cl.status || '',
        lineStatusLabel: lineStatus.label,
        lineStatusChipClass: lineStatus.chipClass,
        queueRegisteredAtISO: job?.createdAtISO || cl.dateISO || '',
        liveJobCardClass: liveMatUi.cardClass,
        liveJobMaterialChipLabel: liveMatUi.chipLabel,
        liveJobMaterialChipClass: liveMatUi.chipClass,
      };
    };

    const rows = registered.map(mapRegistered);
    const active = rows.filter((r) => !r.completed);
    const closed = rows.filter((r) => r.completed);

    return {
      mode: 'online',
      sections: [
        { key: 'active', title: 'In progress', rows: active.filter(matches) },
        { key: 'closed', title: 'Completed or cancelled', rows: closed.filter(matches) },
      ],
    };
  }, [
    cuttingLists,
    productionJobCoils,
    productionJobs,
    searchQuery,
    workspaceMaterialTypes,
    workspaceQuotations,
    ws?.hasWorkspaceData,
  ]);
  const conversionStats = useMemo(() => {
    if (!productionConversionChecks.length) {
      return { efficiencyPct: null, flagged: 0, watch: 0, total: 0 };
    }
    const flagged = productionConversionChecks.filter((row) => row.managerReviewRequired).length;
    const watch = productionConversionChecks.filter((row) => row.alertState === 'Watch').length;
    const withinBand = productionConversionChecks.filter(
      (row) => row.alertState === 'OK' || row.alertState === 'Watch'
    ).length;
    return {
      efficiencyPct: Math.round((withinBand / productionConversionChecks.length) * 100),
      flagged,
      watch,
      total: productionConversionChecks.length,
    };
  }, [productionConversionChecks]);

  const conversionChecksByCuttingListId = useMemo(() => {
    const m = new Map();
    for (const c of productionConversionChecks) {
      const id = String(c.cuttingListId || '').trim();
      if (!id) continue;
      const arr = m.get(id);
      if (arr) arr.push(c);
      else m.set(id, [c]);
    }
    return m;
  }, [productionConversionChecks]);

  const productionActiveRows = useMemo(() => {
    if (productionQueueModel.mode !== 'online') return [];
    return productionQueueModel.sections.find((s) => s.key === 'active')?.rows || [];
  }, [productionQueueModel]);

  const productionActiveFiltered = useMemo(() => {
    return productionActiveRows.filter((row) => matchesProductionActiveFilter(row, productionActiveFilter));
  }, [productionActiveRows, productionActiveFilter]);

  const productionActiveSorted = useMemo(
    () => sortProductionQueueRows(productionActiveFiltered, productionActiveSort.field, productionActiveSort.dir),
    [productionActiveFiltered, productionActiveSort.field, productionActiveSort.dir]
  );

  /** Main table: closed jobs only (completed or cancelled). In-progress appears in the panel above. */
  const productionClosedFiltered = useMemo(() => {
    const rows =
      productionQueueModel.mode === 'online'
        ? productionQueueModel.sections.find((s) => s.key === 'closed')?.rows || []
        : productionQueueModel.sections.flatMap((s) => s.rows || []);
    return rows.filter((row) => {
      if (productionQueueModel.mode !== 'online') {
        if (productionFilter === 'waiting') {
          return row.priority === 'Waiting' || row.priority === 'Wait' || row.status === 'Planned';
        }
        if (productionFilter === 'running') return row.status === 'Running';
        if (productionFilter === 'needs_review') return Boolean(row.managerReviewRequired);
        if (productionFilter === 'done') return Boolean(row.completed);
        return true;
      }
      if (productionFilter === 'completed') return row.status === 'Completed';
      if (productionFilter === 'cancelled') return row.status === 'Cancelled';
      if (productionFilter === 'done') return row.status === 'Completed';
      if (productionFilter === 'coils_allocated') return Boolean(row.hasCoilsAllocated);
      return true;
    });
  }, [productionQueueModel, productionFilter]);

  const productionQueueRows = useMemo(
    () => sortProductionQueueRows(productionClosedFiltered, productionClosedSort.field, productionClosedSort.dir),
    [productionClosedFiltered, productionClosedSort.field, productionClosedSort.dir]
  );

  const productionActivePage = useAppTablePaging(
    productionActiveSorted,
    PRODUCTION_TABLE_PAGE_SIZE,
    productionActiveSort.field,
    productionActiveSort.dir,
    productionActiveFilter,
    searchQuery,
    ws?.hasWorkspaceData
  );

  const productionClosedPage = useAppTablePaging(
    productionQueueRows,
    PRODUCTION_TABLE_PAGE_SIZE,
    productionClosedSort.field,
    productionClosedSort.dir,
    productionFilter,
    searchQuery,
    ws?.hasWorkspaceData
  );

  const productionQueueStats = useMemo(() => {
    const rows = productionQueueModel.sections.flatMap((s) => s.rows || []);
    const active = rows.filter((r) => !r.completed);
    const waiting = active.filter(
      (r) => r.priority === 'Waiting' || r.priority === 'Wait' || r.status === 'Planned'
    ).length;
    const noCoil = active.filter((r) => r.needsCoil).length;
    const coilsAllocated = active.filter((r) => r.hasCoilsAllocated).length;
    const needsReview = active.filter((r) => r.managerReviewRequired).length;
    const overdue = active.filter((r) => r.overdue).length;
    const attention = active.filter((r) => r.managerReviewRequired || r.overdue).length;
    return {
      waiting,
      noCoil,
      coilsAllocated,
      needsReview,
      overdue,
      onFloor: waiting + coilsAllocated,
      attention,
    };
  }, [productionQueueModel]);

  const productionFollowUpPrintRows = useMemo(() => {
    if (productionQueueModel.mode === 'offline') {
      return productionQueueModel.sections.flatMap((s) => s.rows || []);
    }
    return productionActiveSorted;
  }, [productionQueueModel, productionActiveSorted]);

  const handlePrintProductionFollowUp = useCallback(() => {
    if (!productionFollowUpPrintRows.length) {
      showToast('No waiting or in-production jobs to print.', { variant: 'info' });
      return;
    }
    const ok = printProductionFollowUpList({
      rows: productionFollowUpPrintRows,
      quotations: workspaceQuotations,
      title: 'Production follow-up — waiting & in progress',
    });
    if (!ok) {
      showToast('Allow pop-ups to print the follow-up list.', { variant: 'warning' });
    }
  }, [productionFollowUpPrintRows, showToast, workspaceQuotations]);

  const goOverviewInventory = useCallback((kindOrOpts) => {
    setActiveTab('inventory');
    if (kindOrOpts && typeof kindOrOpts === 'object') {
      const kind = kindOrOpts.kind || kindOrOpts.stockReceiveKind || 'coil';
      setStockReceiveKind(normalizeStockReceiveKind(kind));
      return;
    }
    setStockReceiveKind(normalizeStockReceiveKind(kindOrOpts));
  }, []);

  const openRequestStock = useCallback((prefill) => {
    if (!ws?.canMutate) {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to request stock — this workspace is on a read-only cached snapshot.'
          : 'Connect to the API to request stock.',
        { variant: 'error' }
      );
      return;
    }
    if (prefill && typeof prefill === 'object') {
      const qty = Math.max(1, Number(prefill.requestedKg) || 0);
      const unit = prefill.unit === 'm' || prefill.family === 'stone' ? 'm' : 'kg';
      const label = [prefill.design, prefill.colour, prefill.gauge].filter(Boolean).join(' ');
      setCoilRequestForm({
        unit,
        note: `Restock ${label} — shortfall ${qty} ${unit}. ${STORE_STOCK_BUY_PATH}.`,
        rows: [
          {
            gauge: String(prefill.gauge || ''),
            colour: String(prefill.colour || ''),
            materialType: String(prefill.materialType || ''),
            requestedKg: String(qty),
            unit,
          },
        ],
      });
    } else {
      setCoilRequestForm({
        unit: 'kg',
        note: '',
        rows: [{ gauge: '', colour: '', materialType: '', requestedKg: '', unit: 'kg' }],
      });
    }
    setShowCoilRequest(true);
  }, [showToast, ws?.canMutate, ws?.usingCachedData]);

  const toggleCoilReceiptSort = useCallback((key) => {
    setCoilReceiptSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      const defaultDir = key === 'received' || key === 'kg' ? 'desc' : 'asc';
      return { key, dir: defaultDir };
    });
  }, []);

  const formatVariancePct = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(1)}%`;
  };

  const handleOpsTab = (id) => {
    setActiveTab(id);
    setSearchQuery('');
    setProductionFilter('all');
  };

  useEffect(() => {
    const st = location.state || {};
    const t = st.focusOpsTab;
    if (t == null || t === '') return;

    const invSku = String(st.opsInventorySkuQuery || '').trim();
    const notice = String(st.opsNotice || '').trim();
    if (notice) {
      showToast(notice, { variant: 'info' });
    }

    const normalized = normalizeOpsFocusTab(t);
    if (!normalized) {
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }

    if (normalized.navigateTo) {
      navigate(normalized.navigateTo, { replace: true });
      return;
    }

    if (normalized.notice) {
      showToast(normalized.notice, { variant: 'info' });
    }

    setActiveTab(normalized.tab);

    if (normalized.tab === 'inventory') {
      if (invSku) {
        const p = invSku.toUpperCase();
        if (isStoneFlatsheetSku(p)) setStockReceiveKind('stone_flatsheet');
        else if (p.startsWith('STONE-')) setStockReceiveKind('stone_meter');
        else if (p.startsWith('ACC-')) setStockReceiveKind('accessory');
        else setStockReceiveKind('coil');
        setCoilLiveSearch(invSku);
      }
      const boardFilter = String(st.specBoardFilter || '').trim().toLowerCase();
      const kindHint = String(st.stockReceiveKind || st.opsStockKind || '').trim();
      if (kindHint) {
        setStockReceiveKind(normalizeStockReceiveKind(kindHint));
      } else if (!invSku && ['idle', 'thin', 'heroes'].includes(boardFilter)) {
        setStockReceiveKind('coil');
      } else if (!invSku && boardFilter === 'below_min' && st.opsFamily === 'stone') {
        setStockReceiveKind('stone_meter');
      }
      if (['all', 'below_min', 'thin', 'idle', 'heroes'].includes(boardFilter)) {
        setSpecBoardFilter(boardFilter);
      }
      if (st.openStockAdjust && canAdjustInventory) {
        setStockAdjustMaterialFamily(null);
        setShowStockAdjust(true);
      }
    }

    if (normalized.tab === 'materialExceptions') {
      const mexId = String(st.materialIncidentId || '').trim();
      setMaterialIncidentFocusId(mexId);
    }

    if (normalized.tab === 'production') {
      const highlightId = String(st.highlightCuttingListId || st.openProductionTraceCuttingListId || '').trim();
      if (highlightId) setSearchQuery(highlightId);
      if (st.openProductionTraceCuttingListId && ws?.canMutate) {
        setProductionTraceModal({
          type: 'trace',
          cuttingListId: String(st.openProductionTraceCuttingListId).trim(),
          subtitle: String(st.openProductionTraceSubtitle || '').trim() || undefined,
        });
      }
      if (st.productionActiveFilter) {
        setProductionActiveFilter(String(st.productionActiveFilter));
      }
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate, canAdjustInventory, ws?.canMutate]);

  const transitOrdersAll = useMemo(
    () => purchaseOrders.filter((p) => shouldShowPoInTransit(p)),
    [purchaseOrders]
  );

  const pendingMexCount = useMemo(
    () =>
      (Array.isArray(materialIncidents) ? materialIncidents : []).filter(
        (row) => String(row?.status || '').trim().toLowerCase() === 'submitted'
      ).length,
    [materialIncidents]
  );

  const opsTabs = useMemo(() => {
    const registerBadge =
      (Number(productionQueueStats.noCoil) || 0) + (Number(productionQueueStats.overdue) || 0);
    return [
      { id: 'overview', icon: <LayoutDashboard size={16} />, label: 'Overview' },
      {
        id: 'inventory',
        icon: <Box size={16} />,
        label: 'On hand',
        badge: transitOrdersAll.length,
      },
      {
        id: 'materialExceptions',
        icon: <Package size={16} />,
        label: 'Exceptions',
        badge: pendingMexCount,
      },
      {
        id: 'production',
        icon: <Scissors size={16} />,
        label: 'Register',
        badge: registerBadge,
      },
    ];
  }, [transitOrdersAll.length, pendingMexCount, productionQueueStats.noCoil, productionQueueStats.overdue]);

  const storeRestockSettings = useMemo(
    () => normalizeOrgStoreRestock(ws?.snapshot?.orgStoreRestock),
    [ws?.snapshot?.orgStoreRestock]
  );

  const coilRestockMinKg = storeRestockSettings.coilRestockMinKg;
  const stoneRestockMinM = storeRestockSettings.stoneRestockMinM;
  const specMinOverrides = storeRestockSettings.specMinOverrides;

  const coilSpecBelowMinCount = useMemo(() => {
    const transitBySpec = buildTransitKgBySpec(transitOrdersAll, setupMasterData, shouldShowPoInTransit);
    return buildCoilSpecBoardRows(coilLots, setupMasterData, {
      restockMinKg: coilRestockMinKg,
      specMinOverrides,
      transitBySpec,
    }).filter((r) => r.belowMin).length;
  }, [coilLots, setupMasterData, transitOrdersAll, coilRestockMinKg, specMinOverrides]);

  const stoneSpecBelowMinCount = useMemo(() => {
    const stoneTransit = buildTransitMByStoneSpec(transitOrdersAll, setupMasterData, shouldShowPoInTransit);
    return buildStoneSpecBoardRows(inventoryRows, setupMasterData, {
      restockMinM: stoneRestockMinM,
      transitBySpec: stoneTransit,
    }).filter((r) => r.belowMin).length;
  }, [inventoryRows, setupMasterData, transitOrdersAll, stoneRestockMinM]);

  const transitSearchNorm = transitSearch.trim().toLowerCase();
  const transitOrdersSortedFiltered = useMemo(() => {
    const sorted = sortTransitPurchaseOrders(transitOrdersAll, transitSort);
    if (!transitSearchNorm) return sorted;
    return sorted.filter((p) => transitPoSearchBlob(p).includes(transitSearchNorm));
  }, [transitOrdersAll, transitSort, transitSearchNorm]);

  /** Receivable POs must all be visible — do not cap like coil/SKU side lists. */
  const transitOrders = transitOrdersSortedFiltered;

  const coilLotsReceiptSorted = useMemo(() => {
    const finishedCoils = new Set(
      (ws?.snapshot?.movements || [])
        .filter((m) => m?.type === 'FINISHED_GOODS' && m?.ref)
        .map((m) => String(m.ref))
    );
    const rows = coilLots.filter(
      (c) => c.currentStatus !== 'Consumed' && c.currentStatus !== 'Finished' && !finishedCoils.has(String(c.coilNo))
    );
    const { key, dir } = coilReceiptSort;
    rows.sort((a, b) => compareCoilReceiptRows(a, b, key, dir));
    return rows;
  }, [coilLots, coilReceiptSort, ws?.snapshot?.movements]);

  const coilReceiptSearchParsed = useMemo(() => parseCoilReceiptSearchQuery(coilLiveSearch), [coilLiveSearch]);

  const hasCoilReceiptSearch =
    coilReceiptSearchParsed.pairs.length > 0 || coilReceiptSearchParsed.tokens.some(Boolean);

  const coilLotsReceiptFiltered = useMemo(() => {
    if (!hasCoilReceiptSearch) return coilLotsReceiptSorted;
    return coilLotsReceiptSorted.filter((c) => coilReceiptRowMatchesSearch(c, coilReceiptSearchParsed));
  }, [coilLotsReceiptSorted, coilReceiptSearchParsed, hasCoilReceiptSearch]);

  useEffect(() => {
    if (!hasCoilReceiptSearch || stockReceiveKind !== 'coil') {
      setCoilSearchRemoteRows([]);
      setCoilSearchRemoteLoading(false);
      return undefined;
    }
    const q = coilLiveSearch.trim();
    if (q.length < 2) {
      setCoilSearchRemoteRows([]);
      setCoilSearchRemoteLoading(false);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setCoilSearchRemoteLoading(true);
        const r = await apiFetch(`/api/coil-lots/search?q=${encodeURIComponent(q)}&limit=80`);
        if (cancelled) return;
        setCoilSearchRemoteLoading(false);
        if (r.ok && r.data?.ok && Array.isArray(r.data.coilLots)) {
          setCoilSearchRemoteRows(r.data.coilLots);
        } else {
          setCoilSearchRemoteRows([]);
        }
      })();
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [coilLiveSearch, hasCoilReceiptSearch, stockReceiveKind]);

  const coilLotsByReceipt = useMemo(() => {
    if (!hasCoilReceiptSearch) return coilLotsReceiptFiltered;
    const byNo = new Map();
    for (const c of coilLots) {
      if (coilReceiptRowMatchesSearch(c, coilReceiptSearchParsed)) byNo.set(c.coilNo, c);
    }
    for (const c of coilSearchRemoteRows) {
      if (!byNo.has(c.coilNo) && coilReceiptRowMatchesSearch(c, coilReceiptSearchParsed)) {
        byNo.set(c.coilNo, c);
      }
    }
    const rows = [...byNo.values()];
    const { key, dir } = coilReceiptSort;
    rows.sort((a, b) => compareCoilReceiptRows(a, b, key, dir));
    return rows;
  }, [
    hasCoilReceiptSearch,
    coilLots,
    coilSearchRemoteRows,
    coilReceiptSearchParsed,
    coilReceiptSort,
    coilLotsReceiptFiltered,
  ]);

  const coilLotsByReceiptCapped = useMemo(() => {
    if (hasCoilReceiptSearch) return coilLotsByReceipt;
    if (coilLotsByReceipt.length <= COIL_SIDE_LIST_LIMIT) return coilLotsByReceipt;
    return coilLotsByReceipt.slice(0, COIL_SIDE_LIST_LIMIT);
  }, [coilLotsByReceipt, hasCoilReceiptSearch]);

  const coilReceiptListTruncated =
    !hasCoilReceiptSearch && coilLotsByReceipt.length > COIL_SIDE_LIST_LIMIT;

  const coilReceiptIncludesArchived = useMemo(
    () =>
      hasCoilReceiptSearch &&
      coilLotsByReceipt.some(
        (c) => c.currentStatus === 'Consumed' || c.currentStatus === 'Finished'
      ),
    [hasCoilReceiptSearch, coilLotsByReceipt]
  );

  const anyReceivablePo = useMemo(
    () => purchaseOrders.some((p) => shouldShowPoInTransit(p)),
    [purchaseOrders]
  );

  const skuProductsLiveSorted = useMemo(() => {
    if (stockReceiveKind === 'coil') return [];
    const pred =
      stockReceiveKind === 'stone_meter'
        ? (p) => isStoneMetreSku(p.productID)
        : stockReceiveKind === 'stone_flatsheet'
          ? (p) => isStoneFlatsheetSku(p.productID)
          : (p) => /^ACC-/i.test(String(p.productID || ''));
    return rollupSkuStockDisplayRows(inventoryRows, pred);
  }, [inventoryRows, stockReceiveKind]);

  const skuLiveSearchNorm = coilLiveSearch.trim().toLowerCase();
  const skuProductsReceiptFiltered = useMemo(() => {
    if (!skuLiveSearchNorm) return skuProductsLiveSorted;
    return skuProductsLiveSorted.filter((p) => {
      const blob = [p.productID, p.name, p.unit].filter(Boolean).join(' ').toLowerCase();
      return blob.includes(skuLiveSearchNorm);
    });
  }, [skuProductsLiveSorted, skuLiveSearchNorm]);

  const skuReceiptTruncated =
    stockReceiveKind !== 'coil' && !skuLiveSearchNorm && skuProductsReceiptFiltered.length > STOCK_SIDE_LIST_LIMIT;
  const skuProductsByReceipt = useMemo(() => {
    if (stockReceiveKind === 'coil') return [];
    if (skuLiveSearchNorm) return skuProductsReceiptFiltered;
    return skuProductsReceiptFiltered.slice(0, STOCK_SIDE_LIST_LIMIT);
  }, [stockReceiveKind, skuProductsReceiptFiltered, skuLiveSearchNorm]);

  useEffect(() => {
    const pid = productMovementModal?.productID;
    if (!pid) {
      setProductMovementsRows([]);
      return undefined;
    }
    let cancelled = false;
    setProductMovementsLoading(true);
    void (async () => {
      const r = await apiFetch(
        `/api/inventory/product-movements/${encodeURIComponent(pid)}?limit=500`
      );
      if (cancelled) return;
      setProductMovementsLoading(false);
      if (r.ok && r.data?.ok) setProductMovementsRows(Array.isArray(r.data.movements) ? r.data.movements : []);
      else setProductMovementsRows([]);
    })();
    return () => {
      cancelled = true;
    };
  }, [productMovementModal?.productID]);

  useEffect(() => {
    const poId = receiveDraft.poID;
    if (grnReceivePoIdRef.current !== poId) {
      grnReceivePoIdRef.current = poId;
      setGrnConversionOverride(false);
    }

    const po = purchaseOrders.find((p) => p.poID === poId);
    if (!po) {
      setGrnLines([]);
      return;
    }

    const yy = String(new Date().getFullYear()).slice(-2);
    const todayISO = new Date().toISOString().slice(0, 10);
    setGrnLines((prev) => {
      const openLines = po.lines.filter((l) => poLineIsOpenForReceiving(l));
      const prevByKey = new Map(prev.map((r) => [r.lineKey, r]));
      const numsInForm = prev.map((r) => r.coilNo).filter(Boolean);
      let nextSeq = maxClSequenceForYear(coilLots, yy, numsInForm);

      return openLines.map((l) => {
        const remaining = poLineOpenQtyForReceiving(l);
        const old = prevByKey.get(l.lineKey);
        const grnKind = grnKindForPoLine(l);
        const meterBasis = grnKind === 'coil' && isCoilMeterBasisLine(l);
        const receivedAtISO = String(old?.receivedAtISO || '').slice(0, 10) || todayISO;
        if (grnKind === 'coil') {
          if (old) {
            return {
              lineKey: l.lineKey,
              productID: l.productID,
              productName: l.productName,
              color: l.color,
              gauge: l.gauge,
              remaining,
              qtyReceived: old.qtyReceived,
              coilNo: old.coilNo,
              weightKg: old.weightKg ?? '',
              receivedAtISO,
              meterBasis,
              grnKind,
            };
          }
          nextSeq += 1;
          return {
            lineKey: l.lineKey,
            productID: l.productID,
            productName: l.productName,
            color: l.color,
            gauge: l.gauge,
            remaining,
            qtyReceived: '',
            coilNo: `CL-${yy}-${String(nextSeq).padStart(4, '0')}`,
            weightKg: '',
            receivedAtISO: todayISO,
            meterBasis,
            grnKind,
          };
        }
        return {
          lineKey: l.lineKey,
          productID: l.productID,
          productName: l.productName,
          color: l.color,
          gauge: l.gauge,
          remaining,
          qtyReceived: old?.qtyReceived ?? '',
          coilNo: '',
          weightKg: '',
          receivedAtISO,
          meterBasis: false,
          grnKind,
        };
      });
    });
  }, [receiveDraft.poID, purchaseOrders, coilLots]);

  const applyTransitReceipt = async (e) => {
    e.preventDefault();
    if (!canReceiveInventory) {
      showToast('You need inventory.receive permission to post goods into inventory.', { variant: 'error' });
      return;
    }
    if (grnSubmitting) return;
    if (!receiveDraft.poID) {
      showToast('Select an incoming order.', { variant: 'error' });
      return;
    }
    const entries = [];
    const todayISO = new Date().toISOString().slice(0, 10);
    for (const row of grnLines) {
      const qtyReceived = Number(row.qtyReceived);
      if (!(qtyReceived > 0) || Number.isNaN(qtyReceived)) continue;
      const receivedAtISO = String(row.receivedAtISO || '').slice(0, 10) || todayISO;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedAtISO)) {
        showToast('Enter a valid date of receival for each line you are receiving.', { variant: 'error' });
        return;
      }
      if (row.grnKind === 'coil') {
        const coilNo = String(row.coilNo || '').trim();
        const weightKg = Number(row.weightKg);
        if (!coilNo) {
          showToast('Enter a coil number for every coil line you are receiving.', { variant: 'error' });
          return;
        }
        if (!Number.isFinite(weightKg) || weightKg <= 0) {
          showToast(`Enter a positive weight (kg) for coil ${coilNo || 'line'}.`, { variant: 'error' });
          return;
        }
        entries.push({
          lineKey: row.lineKey,
          productID: row.productID,
          qtyReceived,
          coilNo,
          weightKg,
          location: receiveDraft.location,
          receivedAtISO,
        });
      } else {
        entries.push({
          lineKey: row.lineKey,
          productID: row.productID,
          qtyReceived,
          coilNo: '',
          location: receiveDraft.location,
          receivedAtISO,
        });
      }
    }
    if (!entries.length) {
      showToast('Enter receive quantity for at least one open line.', { variant: 'error' });
      return;
    }
    setGrnSubmitting(true);
    try {
      const res = await confirmStoreReceipt(
        receiveDraft.poID,
        entries,
        {},
        { allowConversionMismatch: grnConversionOverride }
      );
      if (!res.ok) {
        showToast(res.error, { variant: 'error' });
        return;
      }
      const coils = res.coilNos?.filter(Boolean).join(', ') || '';
      const shortAlerts = Array.isArray(res.mdShortReceiptAlerts) ? res.mdShortReceiptAlerts : [];
      if (shortAlerts.length > 0) {
        const first = shortAlerts[0];
        const shortKg = Number(first?.shortKg) || 0;
        showToast(
          `Receipt posted${coils ? ` · ${coils}` : ''}. Received ${Number(first?.receivedKg || 0).toLocaleString()} kg vs ${Number(first?.orderedKg || 0).toLocaleString()} kg ordered (${shortKg.toLocaleString()} kg short) — PO line closed; no further receipt on this line.`,
          { variant: 'warning' }
        );
      } else {
        showToast(`Receipt posted — stock updated${coils ? ` · ${coils}` : ''}.`);
      }
      setReceiveDraft({ poID: '', location: '' });
      setGrnLines([]);
      setGrnConversionOverride(false);
      setExpandedReceivePoId(null);
    } finally {
      setGrnSubmitting(false);
    }
  };

  const applyStockAdjust = async (e) => {
    e.preventDefault();
    if (!canAdjustInventory) {
      showToast('You need inventory.adjust permission to post stock adjustments.', { variant: 'error' });
      return;
    }
    if (stockAdjustSubmitting) return;
    const { productID, type, qty, reasonCode, reasonNote, date } = stockAdjust;
    if (!productID || !qty) {
      showToast('Select a product and enter a quantity.', { variant: 'error' });
      return;
    }
    if (!String(date || '').trim()) {
      showToast('Adjustment date is required.', { variant: 'error' });
      return;
    }
    if (reasonCode === 'Other' && !reasonNote.trim()) {
      showToast('Describe the reason for “Other”.', { variant: 'error' });
      return;
    }
    const q = Number(qty);
    if (Number.isNaN(q) || q <= 0) {
      showToast('Enter a valid positive quantity.', { variant: 'error' });
      return;
    }
    if (type === 'Decrease' && stockAdjustCoilAck && !canAcknowledgeCoilSkuDrift) {
      showToast('Book-only coil SKU decreases require branch manager approval.', { variant: 'error' });
      return;
    }
    if (type === 'Decrease' && q >= 50 && stockAdjustConfirmText.trim().toUpperCase() !== 'CONFIRM') {
      showToast('Type CONFIRM to post a decrease of 50 or more.', { variant: 'error' });
      return;
    }
    if (stockAdjustLargeAck && !canAcknowledgeCoilSkuDrift) {
      showToast('Large adjustments require branch manager acknowledgement.', { variant: 'error' });
      return;
    }
    setStockAdjustSubmitting(true);
    try {
      const res = await adjustStock(productID, type, q, reasonCode, reasonNote.trim(), date, {
        acknowledgeCoilSkuDrift: type === 'Decrease' && stockAdjustCoilAck,
        acknowledgeLargeAdjust: stockAdjustLargeAck,
      });
      if (!res.ok) {
        if (res.code === 'COIL_SKU_DRIFT') {
          setStockAdjustCoilPrompt(true);
          setStockAdjustCoilCount(
            typeof res.coilLotCount === 'number' ? res.coilLotCount : null
          );
          showToast(res.error, { variant: 'error' });
          return;
        }
        if (res.code === 'LARGE_ADJUST_CONFIRM') {
          setStockAdjustLargePrompt(true);
          setStockAdjustLargeMeta({ qty: res.qty, valueNgn: res.valueNgn });
          showToast(res.error, { variant: 'error' });
          return;
        }
        showToast(res.error, { variant: 'error' });
        return;
      }
      setStockAdjust({
        productID: '',
        type: 'Increase',
        qty: '',
        reasonCode: 'Count correction',
        reasonNote: '',
        date: date || '',
      });
      setStockAdjustCoilAck(false);
      setStockAdjustCoilPrompt(false);
      setStockAdjustLargeAck(false);
      setStockAdjustLargePrompt(false);
      setStockAdjustLargeMeta(null);
      setStockAdjustConfirmText('');
      setShowStockAdjust(false);
      if (res.glWarning) {
        showToast(`Stock adjustment posted. GL note: ${res.glWarning}`, { variant: 'warning' });
      } else {
        showToast('Stock adjustment posted (GL variance when cost is known).');
      }
    } finally {
      setStockAdjustSubmitting(false);
    }
  };

  const submitCoilRequest = async (e) => {
    e.preventDefault();
    const formUnit = coilRequestForm.unit === 'm' ? 'm' : 'kg';
    const rows = (coilRequestForm.rows || [])
      .map((r) => ({
        gauge: String(r.gauge || '').trim(),
        colour: String(r.colour || '').trim(),
        materialType: String(r.materialType || '').trim(),
        requestedKg: String(r.requestedKg || '').trim(),
        unit: r.unit === 'm' || formUnit === 'm' ? 'm' : 'kg',
      }))
      .filter((r) => r.gauge || r.colour || r.materialType || r.requestedKg);
    if (!rows.length) {
      showToast('Add at least one request line.', { variant: 'error' });
      return;
    }
    for (const r of rows) {
      const qty = Number(r.requestedKg);
      if (!Number.isFinite(qty) || qty <= 0) {
        showToast(`Each request line needs a positive approx ${r.unit}.`, { variant: 'error' });
        return;
      }
      if (!r.gauge && !r.colour && !r.materialType) {
        showToast('Each line needs gauge, colour, or material type.', { variant: 'error' });
        return;
      }
    }
    if (!ws?.canMutate) {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to submit stock requests — read-only cached workspace.'
          : 'Sign in with a live server connection to submit stock requests.',
        { variant: 'info' }
      );
      return;
    }
    setCoilRequestSubmitting(true);
    let saved = 0;
    try {
      for (const row of rows) {
        const body = {
          gauge: row.gauge,
          colour: row.colour,
          materialType: row.materialType,
          requestedKg: row.requestedKg ? Number(row.requestedKg) || 0 : 0,
          unit: row.unit === 'm' ? 'm' : 'kg',
          note: coilRequestForm.note.trim(),
        };
        const { ok, data } = await apiFetch('/api/coil-requests', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        if (!ok || !data?.ok) {
          const base = data?.error || 'Could not save this request line.';
          showToast(
            saved > 0
              ? `${base} ${saved} of ${rows.length} line(s) already saved — refresh and check pending requests.`
              : base,
            { variant: 'error' }
          );
          if (saved > 0) await ws.refresh();
          return;
        }
        saved += 1;
      }
      await ws.refresh();
      setCoilRequestForm({
        unit: 'kg',
        rows: [{ gauge: '', colour: '', materialType: '', requestedKg: '', unit: 'kg' }],
        note: '',
      });
      setShowCoilRequest(false);
      showToast(`${rows.length} stock request line(s) sent — awaiting branch manager approval.`);
    } finally {
      setCoilRequestSubmitting(false);
    }
  };

  const isAnyModalOpen =
    showStockAdjust ||
    showCoilRequest ||
    showRegisterCoil ||
    completeChecklistModal != null ||
    productionTraceModal != null ||
    productMovementModal != null;

  useEffect(() => {
    if (activeTab !== 'inventory') return undefined;
    if (!ws?.hasWorkspaceData) return undefined;
    if (isAnyModalOpen) return undefined;
    if (receiveDraft.poID || grnLines.length > 0) return undefined;
    const t = window.setInterval(() => {
      void wsRefresh?.();
    }, 15000);
    return () => window.clearInterval(t);
  }, [activeTab, ws?.hasWorkspaceData, wsRefresh, isAnyModalOpen, receiveDraft.poID, grnLines.length]);

  const openProductionQueueRow = (item, { recallIntent = false } = {}) => {
    if (ws?.canMutate) {
      setProductionTraceModal({
        type: 'trace',
        cuttingListId: item.id,
        subtitle: [item.customer, item.spec].filter(Boolean).join(' · ') || undefined,
        recallIntent: Boolean(recallIntent),
      });
      return;
    }
    setProductionTraceModal({
      type: 'pending',
      id: item.id,
      customer: item.customer,
      spec: item.spec,
      quantity: item.quantity,
      priority: item.priority,
    });
  };

  const openTraceWithHint = (item, hint, { recallIntent = false } = {}) => {
    if (!ws?.canMutate) {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to edit the production register — this workspace is on a read-only cached snapshot.'
          : 'Connect to the API to manage production actions.',
        { variant: 'error' }
      );
      return;
    }
    openProductionQueueRow(item, { recallIntent });
    if (hint) showToast(hint, { variant: 'info' });
  };

  const requestMarkComplete = (item) => {
    setCompleteChecklistModal(item);
    setCompleteChecklist({
      transferPosted: false,
      runLogPosted: false,
      conversionChecked: false,
    });
  };

  const confirmMarkCompleteChecklist = () => {
    if (!completeChecklistModal) return;
    const allChecked =
      completeChecklist.transferPosted &&
      completeChecklist.runLogPosted &&
      completeChecklist.conversionChecked;
    if (!allChecked) {
      showToast('Tick all checklist items before opening the register.', { variant: 'error' });
      return;
    }
    const item = completeChecklistModal;
    setCompleteChecklistModal(null);
    openTraceWithHint(
      item,
      `Checklist noted for ${item.id}. Complete the job in the production register (this checklist does not post completion by itself).`
    );
  };

  return (
    <PageShell blurred={isAnyModalOpen}>
      <WorkspaceDeskSyncBanner loading={domainLoading && !domainReady} label="operations & stock" />
      <PageHeader
        eyebrow="Store & plant"
        title="Operations"
        tabs={
          <PageTabs
            tabs={opsTabs}
            value={activeTab}
            onChange={handleOpsTab}
            panelId="ops-records-panel"
          />
        }
        toolbar={
          <OperationsDeskToolbar
            activeTab={activeTab}
            searchQuery={searchQuery}
            onPrintFollowUp={handlePrintProductionFollowUp}
            printDisabled={productionFollowUpPrintRows.length === 0}
            canOtRequest={canOtRequest}
          />
        }
      />

      {activeTab === 'inventory' && (!canReceiveInventory || !canAdjustInventory) ? (
        <div className={`mb-4 ${OPS_NOTICE_WARN}`} role="status">
          <p>
            {!canReceiveInventory && !canAdjustInventory
              ? 'Receiving into stock and stock adjustments need a store, operations, or branch manager role.'
              : !canReceiveInventory
                ? 'Receiving into stock (goods in transit) needs a store, operations, or branch manager role.'
                : 'Stock adjustments need a store, operations, or branch manager role.'}
          </p>
        </div>
      ) : null}

      <div
        id="ops-records-panel"
        role="tabpanel"
        aria-labelledby={`ops-records-panel-tab-${activeTab}`}
        className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 min-w-0"
      >
        {activeTab === 'overview' ? (
          <div className="col-span-full order-1">
            <OperationsProductionOverview
              coilLots={coilLots}
              inventoryRows={inventoryRows}
              cuttingLists={cuttingLists}
              productionQueueModel={productionQueueModel}
              conversionStats={conversionStats}
              productionQueueStats={productionQueueStats}
              hasWorkspaceData={Boolean(ws?.hasWorkspaceData)}
              masterData={setupMasterData}
              onGoProduction={(filter) => {
                setActiveTab('production');
                if (filter) setProductionActiveFilter(filter);
              }}
              onGoInventory={(kind) => goOverviewInventory(kind)}
              onRequestCoils={() => openRequestStock()}
              onMonthEndStock={() => setMonthEndStockOpen(true)}
              onOpenProductionTrace={(cuttingListId) => {
                const id = String(cuttingListId || '').trim();
                if (!id) return;
                openProductionQueueRow({ id });
              }}
              onGoProcurement={() => navigate('/procurement')}
              inventoryAttention={ws?.snapshot?.operationsInventoryAttention}
              roleKey={ws?.session?.user?.roleKey || ''}
              branchId={opsBranchId}
              canMutate={Boolean(ws?.canMutate)}
            />
          </div>
        ) : null}

        {activeTab === 'inventory' ? (
          <OperationsInventoryDesk
            stockReceiveKind={stockReceiveKind}
            setStockReceiveKind={setStockReceiveKind}
            coilLots={coilLots}
            setupMasterData={setupMasterData}
            movements={movements}
            productionJobs={productionJobs}
            workspaceQuotations={workspaceQuotations}
            transitOrdersAll={transitOrdersAll}
            coilRestockMinKg={coilRestockMinKg}
            specMinOverrides={specMinOverrides}
            specBoardFilter={specBoardFilter}
            navigate={navigate}
            openRequestStock={openRequestStock}
            inventoryRows={inventoryRows}
            stoneRestockMinM={stoneRestockMinM}
            anyReceivablePo={anyReceivablePo}
            inTransitLoads={inTransitLoads}
            transitOrdersSortedFiltered={transitOrdersSortedFiltered}
            transitSearch={transitSearch}
            setTransitSearch={setTransitSearch}
            transitSort={transitSort}
            setTransitSort={setTransitSort}
            transitOrders={transitOrders}
            expandedReceivePoId={expandedReceivePoId}
            setExpandedReceivePoId={setExpandedReceivePoId}
            setReceiveDraft={setReceiveDraft}
            receiveDraft={receiveDraft}
            canReceiveInventory={canReceiveInventory}
            setGrnLines={setGrnLines}
            grnLines={grnLines}
            applyTransitReceipt={applyTransitReceipt}
            grnSubmitting={grnSubmitting}
            grnConversionOverride={grnConversionOverride}
            setGrnConversionOverride={setGrnConversionOverride}
            ws={ws}
            coilLiveSearch={coilLiveSearch}
            setCoilLiveSearch={setCoilLiveSearch}
            coilLotsReceiptSorted={coilLotsReceiptSorted}
            hasCoilReceiptSearch={hasCoilReceiptSearch}
            canRegisterCoil={canRegisterCoil}
            setShowRegisterCoil={setShowRegisterCoil}
            coilLotsByReceipt={coilLotsByReceipt}
            coilSearchRemoteLoading={coilSearchRemoteLoading}
            coilReceiptIncludesArchived={coilReceiptIncludesArchived}
            coilReceiptSort={coilReceiptSort}
            toggleCoilReceiptSort={toggleCoilReceiptSort}
            coilLotsByReceiptCapped={coilLotsByReceiptCapped}
            coilReceiptListTruncated={coilReceiptListTruncated}
            coilListLimit={COIL_SIDE_LIST_LIMIT}
            coilColourLabel={coilColourLabel}
            skuProductsLiveSorted={skuProductsLiveSorted}
            skuProductsReceiptFiltered={skuProductsReceiptFiltered}
            skuReceiptTruncated={skuReceiptTruncated}
            skuListLimit={STOCK_SIDE_LIST_LIMIT}
            skuProductsByReceipt={skuProductsByReceipt}
            setProductMovementModal={setProductMovementModal}
            canAdjustInventory={canAdjustInventory}
            setStockAdjustMaterialFamily={setStockAdjustMaterialFamily}
            setShowStockAdjust={setShowStockAdjust}
            coilSpecBelowMinCount={coilSpecBelowMinCount}
            stoneSpecBelowMinCount={stoneSpecBelowMinCount}
            inventoryStats={inventoryStats}
          />
        ) : null}

        {activeTab === 'materialExceptions' ? (
          <div className="col-span-full order-2">
            <MaterialExceptions embedded initialView="register" focusIncidentId={materialIncidentFocusId} />
          </div>
        ) : null}

        {activeTab === 'production' ? (
        <div className="lg:col-span-4 order-1 lg:order-2">
          <div className="z-soft-panel overflow-hidden">
            <div className="space-y-4 p-4 sm:p-5">
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 lg:gap-6 items-start">
                  {/* Left — in progress / need action */}
                  <section className="space-y-3 min-w-0 flex flex-col xl:col-span-3">
                      <div className="min-w-0">
                        <h2 className={OPS_SECTION_TITLE}>In progress</h2>
                        <p className={`${OPS_SECTION_HINT} tabular-nums`}>
                          {productionActiveFiltered.length} live
                        </p>
                      </div>
                      <ProductionListTableFrame
                        toolbar={
                          <>
                            <ProductionListSearchInput
                              label="Search in-progress production jobs"
                              value={searchQuery}
                              onChange={setSearchQuery}
                              placeholder="Search lists, customers, coil no., status…"
                            />
                            <ProductionListSortBar
                              fields={PRODUCTION_SORT_FIELDS}
                              field={productionActiveSort.field}
                              dir={productionActiveSort.dir}
                              onFieldChange={(field) =>
                                setProductionActiveSort((s) => ({ ...s, field }))
                              }
                              onDirToggle={() =>
                                setProductionActiveSort((s) => ({
                                  ...s,
                                  dir: s.dir === 'asc' ? 'desc' : 'asc',
                                }))
                              }
                            />
                            {ws?.hasWorkspaceData ? (
                              <div
                                className={OPS_FILTER_GROUP}
                                role="group"
                                aria-label="Filter in-progress production jobs"
                              >
                                {[
                                  { id: 'all', label: 'All in progress' },
                                  { id: 'coils_allocated', label: 'Coils reserved' },
                                  { id: 'no_coil', label: 'No coil yet' },
                                  { id: 'attention', label: 'Attention' },
                                  { id: 'running', label: 'Running' },
                                  { id: 'planned', label: 'Planned' },
                                ].map((f) => (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setProductionActiveFilter(f.id)}
                                    className={`${OPS_FILTER_CHIP} ${
                                      productionActiveFilter === f.id
                                        ? OPS_FILTER_CHIP_ON
                                        : OPS_FILTER_CHIP_OFF
                                    }`}
                                    aria-pressed={productionActiveFilter === f.id}
                                  >
                                    {f.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </>
                        }
                      >
                        {!ws?.hasWorkspaceData ? (
                          <ListEmptyState
                            icon={Scissors}
                            title="Connect to live workspace"
                            description="Connect to the live workspace to see in-progress production jobs."
                          />
                        ) : productionActiveFiltered.length === 0 ? (
                          <ListEmptyState
                            icon={Scissors}
                            kind={productionActiveRows.length > 0 ? 'search' : 'empty'}
                            title={
                              productionActiveRows.length > 0
                                ? 'No in-progress jobs match this filter'
                                : 'No in-progress jobs'
                            }
                            description={
                              productionActiveRows.length > 0
                                ? 'Try All in progress or search by coil number.'
                                : 'Closed and finished records are on the right.'
                            }
                          />
                        ) : (
                          <>
                            <ProductionQueueRecords
                              kind="live"
                              caption="In-progress production jobs"
                              items={productionActivePage.slice}
                              itemKey={(item) => `live-${item.id}`}
                              openKey={actionMenuKey}
                              onView={openProductionQueueRow}
                              viewLabel={(item) => `View production job ${item.id}`}
                              detailOf={liveJobCoilDetail}
                              renderMenu={(item) => (
                                <ProductionRowMenu
                                  rowKey={`live-${item.id}`}
                                  openKey={actionMenuKey}
                                  setOpenKey={setActionMenuKey}
                                  label={`job ${item.id}`}
                                  onView={() => openProductionQueueRow(item)}
                                  onEditRegister={() =>
                                    openTraceWithHint(
                                      item,
                                      'Production register: enter closing kg & metres, Save while running, then Complete.'
                                    )
                                  }
                                  onRecall={() =>
                                    openTraceWithHint(
                                      item,
                                      item.status === 'Running'
                                        ? 'Recall entry: confirm return to plan, then re-enter coils and start again.'
                                        : 'Recall entry: confirm cancel to release the cutting list to Waiting, then fix and re-register if needed.',
                                      { recallIntent: true }
                                    )
                                  }
                                />
                              )}
                            />
                            <AppTablePager
                              showingFrom={productionActivePage.showingFrom}
                              showingTo={productionActivePage.showingTo}
                              total={productionActivePage.total}
                              hasPrev={productionActivePage.hasPrev}
                              hasNext={productionActivePage.hasNext}
                              onPrev={productionActivePage.goPrev}
                              onNext={productionActivePage.goNext}
                              pageSize={PRODUCTION_TABLE_PAGE_SIZE}
                            />
                          </>
                        )}
                      </ProductionListTableFrame>
                  </section>

                  {/* Right — closed / finished / complete */}
                  <section className="space-y-3 min-w-0 flex min-h-0 flex-col xl:col-span-2">
                    <div className="min-w-0">
                      <h2 className={OPS_SECTION_TITLE}>Closed</h2>
                      <p className={`${OPS_SECTION_HINT} tabular-nums`}>
                        {productionClosedPage.total} showing
                        {productionFilter !== 'all' ? ' · filtered' : ''}
                      </p>
                    </div>
                    <ProductionListTableFrame
                      toolbar={
                        <>
                          <ProductionListSearchInput
                            label="Search closed production jobs"
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search lists, customers, coil no., status…"
                          />
                          <ProductionListSortBar
                            fields={PRODUCTION_SORT_FIELDS}
                            field={productionClosedSort.field}
                            dir={productionClosedSort.dir}
                            onFieldChange={(field) =>
                              setProductionClosedSort((s) => ({ ...s, field }))
                            }
                            onDirToggle={() =>
                              setProductionClosedSort((s) => ({
                                ...s,
                                dir: s.dir === 'asc' ? 'desc' : 'asc',
                              }))
                            }
                          />
                          <div
                            className={OPS_FILTER_GROUP}
                            role="group"
                            aria-label="Filter closed production records"
                          >
                            {(ws?.hasWorkspaceData
                              ? [
                                  { id: 'all', label: 'All closed' },
                                  { id: 'coils_allocated', label: 'Coils on record' },
                                  { id: 'completed', label: 'Completed' },
                                  { id: 'cancelled', label: 'Cancelled' },
                                ]
                              : [
                                  { id: 'all', label: 'All' },
                                  { id: 'waiting', label: 'Waiting' },
                                  { id: 'running', label: 'In progress' },
                                  { id: 'needs_review', label: 'Needs review' },
                                  { id: 'done', label: 'Done' },
                                ]
                            ).map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => setProductionFilter(f.id)}
                                className={`${OPS_FILTER_CHIP} ${
                                  productionFilter === f.id
                                    ? OPS_FILTER_CHIP_ON
                                    : OPS_FILTER_CHIP_OFF
                                }`}
                                aria-pressed={productionFilter === f.id}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </>
                      }
                    >
                      {productionQueueRows.length === 0 ? (
                        <ListEmptyState
                          icon={Scissors}
                          kind={productionQueueModel.mode === 'offline' ? 'empty' : 'search'}
                          title={
                            productionQueueModel.mode === 'offline'
                              ? 'No lists in queue yet'
                              : 'No rows match this search or filter'
                          }
                          description={
                            productionQueueModel.mode === 'offline'
                              ? 'Create a quotation, post a receipt (50%+ paid), then add a cutting list in Sales.'
                              : productionActiveRows.length > 0
                                ? 'No cancelled or completed jobs match this filter — try another chip or clear search.'
                                : 'No cancelled or completed jobs yet.'
                          }
                        />
                      ) : (
                        <div className="flex flex-col w-full">
                          <ProductionQueueRecords
                            kind="closed"
                            caption="Closed production jobs"
                            items={productionClosedPage.slice}
                            itemKey={(item) => `closed-${item.queueKind}-${item.id}`}
                            openKey={actionMenuKey}
                            onView={openProductionQueueRow}
                            viewLabel={(item) => `View production job ${item.id}`}
                            detailOf={(item) => {
                              const clIdForConv = String(item.cuttingListId || item.id || '').trim();
                              const convChecks =
                                ws?.hasWorkspaceData && clIdForConv
                                  ? conversionChecksByCuttingListId.get(clIdForConv)
                                  : null;
                              const convSum = convChecks?.length
                                ? summarizeConversionChecksForCuttingList(convChecks, formatVariancePct)
                                : null;
                              return [
                                item.spec,
                                item.quantity,
                                ws?.hasWorkspaceData && item.coilLabel ? item.coilLabel : null,
                                convSum
                                  ? `4-ref ${convSum.worst}${convSum.deltaLabel ? ` ${convSum.deltaLabel}` : ''}`
                                  : null,
                                item.conversionHighLow ? 'Conversion flag' : null,
                                item.metreVarianceAttention ? 'Metre variance' : null,
                              ]
                                .filter(Boolean)
                                .join(' · ');
                            }}
                            renderMenu={(item) => (
                              <ProductionRowMenu
                                rowKey={`closed-${item.queueKind}-${item.id}`}
                                openKey={actionMenuKey}
                                setOpenKey={setActionMenuKey}
                                label={`job ${item.id}`}
                                onView={() => openProductionQueueRow(item)}
                                onEditRegister={() =>
                                  openTraceWithHint(
                                    item,
                                    'Production register: coil allocation, run log, and completion.'
                                  )
                                }
                                onAssignCoil={
                                  !item.completed
                                    ? () =>
                                        openTraceWithHint(
                                          item,
                                          'Opens production register — coil assignment.'
                                        )
                                    : undefined
                                }
                                onOpenRegister={
                                  !item.completed
                                    ? () =>
                                        openTraceWithHint(
                                          item,
                                          'Opens production register — use Start run in the register after coils are allocated.'
                                        )
                                    : undefined
                                }
                                onPrepareComplete={
                                  !item.completed ? () => requestMarkComplete(item) : undefined
                                }
                              />
                            )}
                          />
                          <AppTablePager
                            showingFrom={productionClosedPage.showingFrom}
                            showingTo={productionClosedPage.showingTo}
                            total={productionClosedPage.total}
                            hasPrev={productionClosedPage.hasPrev}
                            hasNext={productionClosedPage.hasNext}
                            onPrev={productionClosedPage.goPrev}
                            onNext={productionClosedPage.goNext}
                            pageSize={PRODUCTION_TABLE_PAGE_SIZE}
                          />
                        </div>
                      )}
                    </ProductionListTableFrame>
                  </section>
              </div>
            </div>
          </div>
        </div>
        ) : null}
      </div>

      <ModalFrame isOpen={showStockAdjust} onClose={closeStockAdjustModal} showCloseButton={false}>
        <div className="z-modal-panel max-w-lg p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-zarewa-teal">
              {stockAdjustMaterialFamily === 'aluminium'
                ? 'Adjust stock — aluminium'
                : stockAdjustMaterialFamily === 'aluzinc'
                  ? 'Adjust stock — aluzinc'
                  : 'Adjust stock'}
            </h3>
              <button
                type="button"
                onClick={closeStockAdjustModal}
                className="p-2 text-gray-400 hover:text-red-500 rounded-xl"
              >
                <X size={22} />
              </button>
            </div>
            <form className="space-y-4" onSubmit={applyStockAdjust}>
              {stockAdjustMaterialFamily ? (
                <p className="text-ui-xs text-slate-600 leading-snug">
                  SKU list prefers {stockAdjustMaterialFamily} products (matched from product name / type). You can
                  still pick another SKU from the dropdown.
                </p>
              ) : null}
              <div>
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Item
                </label>
                <select
                  required
                  value={stockAdjust.productID}
                  onChange={(e) => {
                    setStockAdjustCoilPrompt(false);
                    setStockAdjustCoilAck(false);
                    setStockAdjustCoilCount(null);
                    setStockAdjust((s) => ({ ...s, productID: e.target.value }));
                  }}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                >
                  <option value="">Select item…</option>
                  {stockAdjustProductOptions.map((r) => (
                    <option key={r.productID} value={r.productID}>
                      {r.name} ({r.productID})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                    Adjustment type
                  </label>
                  <select
                    value={stockAdjust.type}
                    onChange={(e) => {
                      setStockAdjustCoilPrompt(false);
                      setStockAdjustCoilAck(false);
                      setStockAdjustCoilCount(null);
                      setStockAdjust((s) => ({ ...s, type: e.target.value }));
                    }}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                  >
                    <option value="Increase">Increase</option>
                    <option value="Decrease">Decrease</option>
                  </select>
                </div>
                <div>
                  <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                    Quantity
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={stockAdjust.qty}
                    onChange={(e) =>
                      setStockAdjust((s) => ({ ...s, qty: e.target.value }))
                    }
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Reason code
                </label>
                <select
                  value={stockAdjust.reasonCode}
                  onChange={(e) =>
                    setStockAdjust((s) => ({ ...s, reasonCode: e.target.value }))
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                >
                  {ADJUST_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Notes {stockAdjust.reasonCode === 'Other' ? '(required)' : '(optional)'}
                </label>
                <textarea
                  rows={2}
                  value={stockAdjust.reasonNote}
                  onChange={(e) =>
                    setStockAdjust((s) => ({ ...s, reasonNote: e.target.value }))
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-medium outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={stockAdjust.date}
                  onChange={(e) =>
                    setStockAdjust((s) => ({ ...s, date: e.target.value }))
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                />
              </div>
              {stockAdjustCoilPrompt && stockAdjust.type === 'Decrease' ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3 text-sm text-amber-950">
                  <p className="font-medium flex gap-2 items-start">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <span>
                      This SKU has{' '}
                      {stockAdjustCoilCount != null
                        ? `${stockAdjustCoilCount} coil lot(s)`
                        : 'coil lot(s)'}{' '}
                      in this branch. Prefer <strong>Coil control</strong> (split / scrap / return) so tags match the
                      floor.
                    </span>
                  </p>
                  {canAcknowledgeCoilSkuDrift ? (
                    <label className="flex items-start gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-amber-300"
                        checked={stockAdjustCoilAck}
                        onChange={(e) => setStockAdjustCoilAck(e.target.checked)}
                      />
                      <span>I need a book-only decrease anyway (SKU only; coil rows stay unchanged). Manager approval.</span>
                    </label>
                  ) : (
                    <p className="text-ui-xs font-semibold text-amber-900">
                      Book-only decreases require a branch manager. Ask BM to post, or use Coil control.
                    </p>
                  )}
                </div>
              ) : null}
              {stockAdjustLargePrompt ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3 text-sm text-rose-950">
                  <p className="font-medium">
                    Large adjustment
                    {stockAdjustLargeMeta?.qty != null ? ` · qty ${stockAdjustLargeMeta.qty}` : ''}
                    {stockAdjustLargeMeta?.valueNgn != null
                      ? ` · est. ₦${Number(stockAdjustLargeMeta.valueNgn).toLocaleString()}`
                      : ''}
                    . Branch manager must acknowledge before posting.
                  </p>
                  {canAcknowledgeCoilSkuDrift ? (
                    <label className="flex items-start gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-rose-300"
                        checked={stockAdjustLargeAck}
                        onChange={(e) => setStockAdjustLargeAck(e.target.checked)}
                      />
                      <span>I acknowledge this large stock adjustment (posts inventory variance GL when cost is known).</span>
                    </label>
                  ) : (
                    <p className="text-ui-xs font-semibold">Ask a branch manager to acknowledge and post.</p>
                  )}
                </div>
              ) : null}
              {stockAdjust.type === 'Decrease' && Number(stockAdjust.qty) >= 50 ? (
                <div className="space-y-1">
                  <label className="text-ui-xs font-bold uppercase text-slate-500">
                    Type CONFIRM to post this decrease
                  </label>
                  <input
                    value={stockAdjustConfirmText}
                    onChange={(e) => setStockAdjustConfirmText(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                    placeholder="CONFIRM"
                    autoComplete="off"
                  />
                </div>
              ) : null}
              <button
                type="submit"
                disabled={stockAdjustSubmitting}
                className="z-btn-primary w-full justify-center py-3 disabled:opacity-40"
              >
                {stockAdjustSubmitting ? 'Posting…' : 'Post adjustment'}
              </button>
            </form>
        </div>
      </ModalFrame>

      <RegisterCoilModal
        isOpen={showRegisterCoil}
        onClose={() => setShowRegisterCoil(false)}
        coilLots={coilLots}
      />

      <ModalFrame isOpen={showCoilRequest} onClose={() => !coilRequestSubmitting && setShowCoilRequest(false)} showCloseButton={false}>
        <div className="z-modal-panel max-w-lg p-6 sm:p-8 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-zarewa-teal">Request stock</h3>
            <button
              type="button"
              onClick={() => setShowCoilRequest(false)}
              disabled={coilRequestSubmitting}
              className="p-2 text-slate-400 hover:text-rose-600 rounded-xl disabled:opacity-50"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Request coils, stone, or accessories for procurement. {STORE_STOCK_BUY_PATH}.
          </p>
          <form className="space-y-4" onSubmit={submitCoilRequest}>
            <div className="space-y-3">
              {coilRequestForm.rows.map((row, idx) => {
                const lineUnit = row.unit === 'm' || coilRequestForm.unit === 'm' ? 'm' : 'kg';
                return (
                  <div key={`rq-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                    <p className="text-ui-xs font-bold text-slate-500 uppercase tracking-wide">
                      Request line {idx + 1}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        value={row.gauge}
                        onChange={(e) =>
                          setCoilRequestForm((f) => ({
                            ...f,
                            rows: f.rows.map((x, i) => (i === idx ? { ...x, gauge: e.target.value } : x)),
                          }))
                        }
                        placeholder="Gauge (mm)"
                        className="z-input w-full"
                      />
                      <input
                        value={row.colour}
                        onChange={(e) =>
                          setCoilRequestForm((f) => ({
                            ...f,
                            rows: f.rows.map((x, i) => (i === idx ? { ...x, colour: e.target.value } : x)),
                          }))
                        }
                        placeholder="Colour / finish"
                        className="z-input w-full"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        value={row.materialType}
                        onChange={(e) =>
                          setCoilRequestForm((f) => ({
                            ...f,
                            rows: f.rows.map((x, i) => (i === idx ? { ...x, materialType: e.target.value } : x)),
                          }))
                        }
                        placeholder={lineUnit === 'm' ? 'Stone · Design' : 'Material type'}
                        className="z-input w-full"
                      />
                      <input
                        value={row.requestedKg}
                        onChange={(e) =>
                          setCoilRequestForm((f) => ({
                            ...f,
                            rows: f.rows.map((x, i) => (i === idx ? { ...x, requestedKg: e.target.value } : x)),
                          }))
                        }
                        placeholder={lineUnit === 'm' ? 'Approx m (required)' : 'Approx kg (required)'}
                        className="z-input w-full tabular-nums"
                        inputMode="decimal"
                        required
                      />
                    </div>
                    <div className="flex justify-end">
                      {coilRequestForm.rows.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setCoilRequestForm((f) => ({ ...f, rows: f.rows.filter((_, i) => i !== idx) }))
                          }
                          className="text-ui-xs font-semibold text-rose-700 hover:text-rose-900"
                        >
                          Remove line
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() =>
                setCoilRequestForm((f) => ({
                  ...f,
                  rows: [
                    ...f.rows,
                    {
                      gauge: '',
                      colour: '',
                      materialType: '',
                      requestedKg: '',
                      unit: f.unit === 'm' ? 'm' : 'kg',
                    },
                  ],
                }))
              }
              className="z-btn-secondary w-full justify-center"
            >
              <Plus size={14} /> Add another line
            </button>
            <div>
              <label className="text-ui-xs font-bold text-slate-500 uppercase tracking-wide ml-0.5 block mb-1">
                Note (optional)
              </label>
              <textarea
                rows={2}
                value={coilRequestForm.note}
                onChange={(e) => setCoilRequestForm((f) => ({ ...f, note: e.target.value }))}
                className="z-input w-full resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={coilRequestSubmitting}
              className="z-btn-primary w-full justify-center py-3 disabled:opacity-50"
            >
              {coilRequestSubmitting ? 'Submitting…' : 'Submit for BM approval'}
            </button>
          </form>
        </div>
      </ModalFrame>

      <ModalFrame
        isOpen={completeChecklistModal != null}
        onClose={() => setCompleteChecklistModal(null)}
        showCloseButton={false}>
        <ModalScrollShell size="md">
          <ModalScrollHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-zarewa-teal">Complete job checklist</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Confirm all production postings before completion.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompleteChecklistModal(null)}
                className="p-2 min-h-11 min-w-11 text-gray-400 hover:text-red-500 rounded-xl"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
          </ModalScrollHeader>
          <ModalScrollBody className="space-y-3">
            <p className="rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 text-ui-xs text-sky-950 leading-snug">
              This checklist is a floor reminder only. It does <strong>not</strong> complete the job — after you continue,
              use <strong>Complete</strong> in the production register.
            </p>
            {[
              { key: 'transferPosted', label: 'Material transfer to production is posted' },
              { key: 'runLogPosted', label: 'Run log / output meters are recorded' },
              { key: 'conversionChecked', label: 'Conversion check reviewed (including variance)' },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-700 min-h-11"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 rounded border-slate-300 text-zarewa-teal focus:ring-zarewa-teal/20"
                  checked={completeChecklist[item.key]}
                  onChange={(e) =>
                    setCompleteChecklist((s) => ({ ...s, [item.key]: e.target.checked }))
                  }
                />
                <span>{item.label}</span>
              </label>
            ))}
          </ModalScrollBody>
          <ModalScrollFooter className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={confirmMarkCompleteChecklist}
              className="z-btn-primary flex-1 justify-center min-h-11"
            >
              Open register to complete
            </button>
            <button
              type="button"
              onClick={() => setCompleteChecklistModal(null)}
              className="z-btn-secondary flex-1 justify-center min-h-11"
            >
              Cancel
            </button>
          </ModalScrollFooter>
        </ModalScrollShell>
      </ModalFrame>

      <StockRegisterMonthEndModal
        isOpen={monthEndStockOpen}
        onClose={() => setMonthEndStockOpen(false)}
        roleMode="store"
        branchId={opsBranchId}
        branchLabel={opsBranchLabel}
        showToast={showToast}
        roleKey={ws.session?.user?.roleKey}
      />

      <ProductionRegisterEditModal
        isOpen={productionTraceModal?.type === 'trace'}
        onClose={() => setProductionTraceModal(null)}
        cuttingListId={productionTraceModal?.cuttingListId}
        subtitle={productionTraceModal?.subtitle}
        initialRecallIntent={Boolean(productionTraceModal?.recallIntent)}
      />

      <ModalFrame
        isOpen={productionTraceModal?.type === 'pending'}
        onClose={() => setProductionTraceModal(null)}
        surface="plain"
        showCloseButton={false}>
        <div className="z-modal-panel w-full min-w-0 max-w-[min(36rem,calc(100dvw-1.25rem))] sm:max-w-[min(40rem,calc(100dvw-2rem))] max-h-[min(92dvh,900px)] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:rounded-[28px]">
          <>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 shrink-0">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-zarewa-teal">Queued cutting list</h3>
                {productionTraceModal?.type === 'pending' ? (
                  <p className="mt-1 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-700">{productionTraceModal.id}</span> — connect
                    the API to send this list to the production line from Sales.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setProductionTraceModal(null)}
                className="p-2 text-gray-400 hover:text-red-500 rounded-xl shrink-0"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:px-6">
              {productionTraceModal?.type === 'pending' ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-6 text-sm text-slate-600 space-y-3">
                  <p>
                    <span className="font-semibold text-slate-800">Customer:</span> {productionTraceModal.customer}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Spec / ref:</span> {productionTraceModal.spec}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Quantity:</span> {productionTraceModal.quantity}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Priority:</span> {productionTraceModal.priority}
                  </p>
                  <p className="text-xs text-slate-500 pt-2 border-t border-slate-200">
                    Connect the API server to register this list for production and use full coil allocation, run logging,
                    and conversion checks in traceability.
                  </p>
                </div>
              ) : null}
            </div>
          </>
        </div>
      </ModalFrame>

      <ModalFrame
        isOpen={productMovementModal != null}
        onClose={() => setProductMovementModal(null)}
        showCloseButton={false}>
        <div className="z-modal-panel max-w-lg w-full max-h-[85vh] flex flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zarewa-teal">Stock movements</h3>
              <p className="text-ui-xs text-slate-500 mt-1 font-mono break-all">
                {productMovementModal?.productID}
              </p>
              <p className="text-xs text-slate-700 mt-0.5 line-clamp-2">{productMovementModal?.name}</p>
            </div>
            <button
              type="button"
              onClick={() => setProductMovementModal(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-lg">
            {productMovementsLoading ? (
              <p className="text-xs text-slate-500 p-4">Loading…</p>
            ) : productMovementsRows.length === 0 ? (
              <p className="text-xs text-slate-500 p-4">No movements recorded for this SKU.</p>
            ) : (
              <div className="flex flex-col min-h-0">
                <AppTableWrap className="shadow-none rounded-none border-0">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3">When</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productMovementsPage.slice.map((m) => {
                        const typeTitle = [m.type, m.ref, m.detail].filter(Boolean).join(' · ');
                        return (
                          <tr key={m.id} className="hover:bg-teal-50/30">
                            <td className="py-2 px-3 text-slate-700 whitespace-nowrap font-mono text-[13px]">
                              {m.dateISO || m.atISO?.slice(0, 10) || '—'}
                            </td>
                            <td className="max-w-0 py-2 px-3 text-slate-600 whitespace-nowrap truncate" title={typeTitle}>
                              <span className="font-semibold">{m.type}</span>
                              {m.ref ? <span className="text-slate-500"> · {m.ref}</span> : null}
                            </td>
                            <td className="py-2 px-3 text-right font-bold tabular-nums text-zarewa-teal">
                              {m.qty != null ? Number(m.qty).toLocaleString() : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </AppTableWrap>
                <div className="shrink-0 border-t border-slate-100 bg-white px-2 py-2">
                  <AppTablePager
                    showingFrom={productMovementsPage.showingFrom}
                    showingTo={productMovementsPage.showingTo}
                    total={productMovementsPage.total}
                    hasPrev={productMovementsPage.hasPrev}
                    hasNext={productMovementsPage.hasNext}
                    onPrev={productMovementsPage.goPrev}
                    onNext={productMovementsPage.goNext}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </ModalFrame>
    </PageShell>
  );
};

export default Operations;
