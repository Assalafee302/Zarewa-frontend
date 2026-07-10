import { Factory, Landmark, Receipt, Scale, Table2 } from 'lucide-react';

export const PACK_PERIOD_COSTS_INVENTORY = 'Period costs & inventory (pack)';
export const PACK_CASH_BANK_AR = 'Cash, bank & AR reconciliation (pack)';
export const PACK_GL_AUDIT = 'General ledger audit (period)';
export const PACK_SALES_CUSTOMER = 'Sales report';
export const PACK_REFUND_PERIOD = 'Refund report';
export const PACK_OPS_PROCUREMENT = 'Operations & procurement (pack)';
export const PACK_MATERIAL_TRANSACTION = 'Material transaction register';
export const PACK_PURCHASE_REGISTER = 'Purchase register';
export const PACK_MATERIAL_EXCEPTIONS = 'Material exceptions (offcut)';

/** Jobs on /reports — URL ?job= */
export const REPORT_JOBS = {
  close: 'close',
  export: 'export',
  stock: 'stock',
  exceptions: 'exceptions',
};

/** Recommended shortlist for month-end close (catalog item ids). */
export const MONTH_END_RECOMMENDED_IDS = ['std-sales', 'std-finance', 'std-purchases', 'std-stock'];

export const PERIOD_PRESETS = [
  { id: 'mtd', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'last_7', label: 'Last 7 days' },
  { id: 'custom', label: 'Custom' },
];

export function startOfMonthYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function endOfMonthYmd(d = new Date()) {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return ymdLocal(last);
}

export function addDaysYmd(ymd, deltaDays) {
  const [y, m, day] = String(ymd).split('-').map(Number);
  const dt = new Date(y, m - 1, day);
  dt.setDate(dt.getDate() + deltaDays);
  return ymdLocal(dt);
}

/** Resolve a period preset to { startDate, endDate }. */
export function periodRangeForPreset(presetId, today = new Date()) {
  const end = ymdLocal(today);
  if (presetId === 'mtd') {
    return { startDate: startOfMonthYmd(today), endDate: end };
  }
  if (presetId === 'last_month') {
    const firstThis = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastPrev = new Date(firstThis.getTime() - 86400000);
    return { startDate: startOfMonthYmd(lastPrev), endDate: ymdLocal(lastPrev) };
  }
  if (presetId === 'last_7') {
    return { startDate: addDaysYmd(end, -6), endDate: end };
  }
  return null;
}

/** Detect which preset matches the current range (or custom). */
export function detectPeriodPreset(startDate, endDate, today = new Date()) {
  for (const id of ['mtd', 'last_month', 'last_7']) {
    const range = periodRangeForPreset(id, today);
    if (range && range.startDate === startDate && range.endDate === endDate) return id;
  }
  return 'custom';
}

/** Human period label e.g. "1–10 Jul 2026". */
export function formatPeriodLabel(startDate, endDate) {
  const fmt = (ymd) => {
    const [y, m, d] = String(ymd).split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return { y, m, d, mon: months[m - 1] || '' };
  };
  const a = fmt(startDate);
  const b = fmt(endDate);
  if (!a.y || !b.y) return `Period ${startDate} → ${endDate}`;
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${a.mon} ${a.y}`;
  if (a.y === b.y) return `${a.d} ${a.mon} – ${b.d} ${b.mon} ${a.y}`;
  return `${a.d} ${a.mon} ${a.y} – ${b.d} ${b.mon} ${b.y}`;
}

export function flattenExportCatalog(sections) {
  const list = sections || EXPORT_SECTIONS;
  return list.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      sectionId: section.id,
      sectionTitle: section.title,
      monthEndRecommended: MONTH_END_RECOMMENDED_IDS.includes(item.id),
      includedInMonthEndBundle:
        MONTH_END_RECOMMENDED_IDS.includes(item.id) || section.id === 'finance' || section.id === 'audit',
      badge: item.kind === 'api-workbook' ? 'Official workbook' : 'Quick pack',
    }))
  );
}

export function filterExportCatalog(items, { query = '', sectionId = 'all', hasFinanceView = true } = {}) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  return items.filter((item) => {
    if (sectionId && sectionId !== 'all' && item.sectionId !== sectionId) return false;
    if (!hasFinanceView && item.requiresFinanceView) return false;
    if (!q) return true;
    const hay = `${item.title} ${item.desc} ${item.sectionTitle} ${item.workbook || ''} ${item.pack || ''}`.toLowerCase();
    return hay.includes(q);
  });
}

/**
 * Default /reports job by role — finance → close, ops-ish → stock, else export.
 */
export function defaultReportsJob(roleKey, { openExceptionCount = 0 } = {}) {
  if (openExceptionCount > 0) return REPORT_JOBS.exceptions;
  const rk = String(roleKey || '')
    .trim()
    .toLowerCase();
  if (rk === 'finance_manager' || rk === 'accountant' || rk === 'cashier') return REPORT_JOBS.close;
  if (rk === 'md' || rk === 'ceo' || rk === 'admin') return REPORT_JOBS.close;
  if (rk === 'operations' || rk === 'store_keeper' || rk === 'procurement' || rk === 'procurement_officer') {
    return REPORT_JOBS.stock;
  }
  return REPORT_JOBS.export;
}

const PERIOD_STORAGE_KEY = 'reports.periodRange';
const RECENT_EXPORTS_KEY = 'reports.recentExportIds';
const LAST_DOWNLOADS_KEY = 'reports.lastDownloadAt';
const STOCK_BRANCH_KEY = 'reports.stockBranchId';

/** KPI tile → catalog item id for click-through export. */
export const KPI_EXPORT_MAP = {
  pipeline: 'std-sales',
  produced: 'std-sales',
  cash: 'cash-bank-ar',
  ar: 'cash-bank-ar',
};

export function loadLastDownloadMap() {
  try {
    const raw = window.localStorage.getItem(LAST_DOWNLOADS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function markDownloadAt(id, at = new Date().toISOString()) {
  const map = { ...loadLastDownloadMap(), [id]: at };
  try {
    window.localStorage.setItem(LAST_DOWNLOADS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
  return map;
}

/** Relative time for "Downloaded 2m ago". */
export function formatDownloadedAgo(iso, now = Date.now()) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const sec = Math.max(0, Math.floor((now - t) / 1000));
  if (sec < 8) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function loadStoredStockBranchId() {
  try {
    return window.localStorage.getItem(STOCK_BRANCH_KEY) || '';
  } catch {
    return '';
  }
}

export function saveStoredStockBranchId(id) {
  try {
    if (id) window.localStorage.setItem(STOCK_BRANCH_KEY, id);
    else window.localStorage.removeItem(STOCK_BRANCH_KEY);
  } catch {
    /* ignore */
  }
}

export function loadStoredPeriodRange() {
  try {
    const raw = window.localStorage.getItem(PERIOD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.startDate && parsed?.endDate) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveStoredPeriodRange(startDate, endDate) {
  try {
    window.localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify({ startDate, endDate }));
  } catch {
    /* ignore */
  }
}

export function loadRecentExportIds() {
  try {
    const raw = window.localStorage.getItem(RECENT_EXPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function pushRecentExportId(id) {
  const next = [id, ...loadRecentExportIds().filter((x) => x !== id)].slice(0, 5);
  try {
    window.localStorage.setItem(RECENT_EXPORTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Unified export catalog — audit workbooks (API) + workspace packs, grouped by domain. */
export const EXPORT_SECTIONS = [
  {
    id: 'audit',
    title: 'Audit workbooks',
    subtitle:
      'Server-generated Excel files for formal period review. Each workbook uses API definitions with compact document IDs.',
    items: [
      {
        id: 'std-sales',
        kind: 'api-workbook',
        workbook: 'sales',
        title: 'Sales',
        desc: 'Production revenue, receipts register, AR as-at, and sales bridge checks.',
        printPack: PACK_SALES_CUSTOMER,
        icon: Table2,
      },
      {
        id: 'std-finance',
        kind: 'api-workbook',
        workbook: 'finance',
        title: 'Expenses & refunds',
        desc: 'Expense detail and summary by category, plus paid refunds and pipeline.',
        printPack: PACK_PERIOD_COSTS_INVENTORY,
        icon: Receipt,
      },
      {
        id: 'std-purchases',
        kind: 'api-workbook',
        workbook: 'purchases',
        title: 'Purchases',
        desc: 'Ordered, received, and paid purchase views for audit reconciliation.',
        printPack: PACK_OPS_PROCUREMENT,
        icon: Factory,
      },
      {
        id: 'std-stock',
        kind: 'api-workbook',
        workbook: 'stock',
        title: 'Coil stock as-at',
        desc: 'Inventory position snapshot using the selected end date.',
        excelOnly: true,
        icon: Table2,
      },
    ],
  },
  {
    id: 'finance',
    title: 'Finance & ledger',
    subtitle: 'Consolidated workspace exports for management accounts, cash control, and GL activity.',
    items: [
      {
        id: 'period-costs-inventory',
        kind: 'pack',
        pack: PACK_PERIOD_COSTS_INVENTORY,
        title: 'Period costs & inventory',
        desc: 'Expenses, unpaid accruals, coil/stone valuation, and COGS movements (one sheet per section).',
        icon: Receipt,
        formats: ['Excel', 'CSV'],
      },
      {
        id: 'cash-bank-ar',
        kind: 'pack',
        pack: PACK_CASH_BANK_AR,
        title: 'Cash, bank & AR',
        desc: 'Bank lines, receipt/treasury exceptions, AR control list, and treasury movements.',
        icon: Landmark,
        formats: ['Excel', 'CSV'],
      },
      {
        id: 'gl-audit-pack',
        kind: 'pack',
        pack: PACK_GL_AUDIT,
        title: 'General ledger audit',
        desc: 'Trial balance, journal register, and line-level activity. Print preview shows trial balance only.',
        icon: Scale,
        formats: ['Excel', 'CSV'],
        requiresFinanceView: true,
      },
    ],
  },
  {
    id: 'sales',
    title: 'Sales & customer',
    subtitle: 'Customer cash and refund analysis for the selected period.',
    items: [
      {
        id: 'sales-customer-pack',
        kind: 'pack',
        pack: PACK_SALES_CUSTOMER,
        title: 'Customer payments',
        desc: 'Payments received in period, grouped by materials produced vs not produced.',
        icon: Table2,
        formats: ['Excel', 'CSV'],
      },
      {
        id: 'refund-period-report',
        kind: 'pack',
        pack: PACK_REFUND_PERIOD,
        title: 'Refund overview',
        desc: 'Refund paid and unpaid analysis with quotation and customer detail.',
        icon: Table2,
        formats: ['Excel', 'CSV'],
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operations & materials',
    subtitle: 'Procurement, inventory movement, and production material registers.',
    items: [
      {
        id: 'ops-procurement-pack',
        kind: 'pack',
        pack: PACK_OPS_PROCUREMENT,
        title: 'Operations & procurement',
        desc: 'SKU stock, POs with procurement kind, GRN/lot register, accrual bridge, and accessory usage.',
        icon: Factory,
        formats: ['Excel', 'CSV'],
      },
      {
        id: 'material-transaction-register',
        kind: 'pack',
        pack: PACK_MATERIAL_TRANSACTION,
        title: 'Material transaction register',
        desc: 'Alu/aluzinc by gauge, stone coated, accessories, cancelled coils, and listed-not-produced.',
        icon: Table2,
        formats: ['Excel', 'CSV'],
      },
      {
        id: 'purchase-register',
        kind: 'pack',
        pack: PACK_PURCHASE_REGISTER,
        title: 'Purchase register',
        desc: 'GRN purchases by material and gauge with supplier payments and PO outstanding.',
        icon: Table2,
        formats: ['Excel', 'CSV'],
      },
      {
        id: 'material-exceptions-pack',
        kind: 'pack',
        pack: PACK_MATERIAL_EXCEPTIONS,
        title: 'Material exceptions',
        desc: 'Loss by type, offcut aging, and pool reconciliation (incident and legacy buckets).',
        icon: Table2,
        formats: ['Excel', 'CSV'],
      },
    ],
  },
];
