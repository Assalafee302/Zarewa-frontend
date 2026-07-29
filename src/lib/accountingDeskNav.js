import {
  ArrowRightLeft,
  Activity,
  BookOpen,
  Building2,
  CreditCard,
  Factory,
  FileBarChart,
  Flag,
  Landmark,
  LayoutDashboard,
  Lock,
  Scale,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import { ACCOUNTING_OPENING_DATE_LABEL } from '../shared/accountingCutover';

/** @typedef {'overview' | 'statements' | 'gl' | 'opening' | 'close' | 'policy' | 'supplierAp' | 'costing' | 'branchPl' | 'pricingGov' | 'opsHealth' | 'creditors' | 'debtors' | 'assets' | 'interBranch' | 'credit' | 'reconciliation' | 'payroll'} AccountingDeskTabId */

export const TAB_LABELS = {
  overview: 'Overview',
  statements: 'Statements',
  gl: 'General ledger',
  opening: 'Opening balances',
  close: 'Month-end close',
  policy: 'Customer deposit policy',
  supplierAp: 'Supplier payables',
  costing: 'Production costing',
  branchPl: 'Branch P&L',
  pricingGov: 'Pricing governance',
  opsHealth: 'Operations health',
  creditors: 'Receivables',
  debtors: 'Payables',
  assets: 'Fixed assets',
  interBranch: 'Inter-branch',
  credit: 'Credit approval',
  reconciliation: 'Reconciliation',
  payroll: 'Payroll',
};

export const TAB_HINTS = {
  overview: 'Exceptions, cutover readiness, and your next action.',
  statements: 'Profit & Loss and Statement of Financial Position from GL.',
  gl: 'Trial balance and journal activity for the period.',
  opening: `Register-first opening balances for ${ACCOUNTING_OPENING_DATE_LABEL} — roll up from modules, enter capital, post one journal.`,
  close: 'Checklist before locking the period — receipts, payroll, depreciation, reconciliation check.',
  policy: 'Deposit policy preview and cutover to post customer receipts as deposits until production.',
  supplierAp: 'Supplier prepayments, goods-received-not-invoiced checks, and received-basis cutover.',
  costing: 'Material cost per metre, labour readiness, and production costing data quality.',
  branchPl: 'Draft branch contribution P&L from production and cost pools.',
  pricingGov: 'Workbook cost vs GRN, floor-exception log, and margin consistency.',
  opsHealth: 'Operations scorecard, customer satisfaction, and data-quality checks.',
  creditors: 'Receivables register · trade receivables, prepayments, and opening balances.',
  debtors: 'Payables register · supplier payables, deposits, refunds, and suspense.',
  assets: 'Plant, property, and equipment register.',
  interBranch: 'Cross-branch treasury funding — propose, approve, repay, and track balances.',
  credit: 'Approve delivery before full payment is received.',
  reconciliation: 'Bank and cash reconciliation check for the selected period.',
  payroll: 'Bulk bank file and treasury posting after HR locks the run.',
};

/** @type {Array<{ id: string; label: string; icon: import('react').ReactNode; tabs: AccountingDeskTabId[] }>} */
export const ACCOUNTING_ZONES = [
  {
    id: 'home',
    label: 'Home',
    icon: LayoutDashboard,
    tabs: ['overview'],
  },
  {
    id: 'close',
    label: 'Month-end',
    icon: Lock,
    tabs: ['opening', 'close', 'reconciliation'],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileBarChart,
    tabs: ['statements', 'gl', 'branchPl', 'costing', 'pricingGov', 'opsHealth'],
  },
  {
    id: 'registers',
    label: 'Registers',
    icon: Users,
    tabs: ['creditors', 'debtors', 'assets', 'interBranch'],
  },
  {
    id: 'policy',
    label: 'Policy',
    icon: ShieldCheck,
    tabs: ['policy', 'supplierAp'],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: CreditCard,
    tabs: ['credit', 'payroll'],
  },
];

const TAB_ICONS = {
  overview: LayoutDashboard,
  statements: FileBarChart,
  gl: BookOpen,
  opening: Flag,
  close: Lock,
  policy: ShieldCheck,
  supplierAp: Truck,
  costing: Factory,
  branchPl: FileBarChart,
  pricingGov: Scale,
  opsHealth: Activity,
  creditors: Users,
  debtors: Wallet,
  assets: Building2,
  interBranch: ArrowRightLeft,
  credit: CreditCard,
  reconciliation: Scale,
  payroll: Landmark,
};

/** @param {AccountingDeskTabId} tabId */
export function zoneForTab(tabId) {
  const found = ACCOUNTING_ZONES.find((z) => z.tabs.includes(tabId));
  return found?.id || 'home';
}

/** @param {string} zoneId */
export function defaultTabForZone(zoneId) {
  const zone = ACCOUNTING_ZONES.find((z) => z.id === zoneId);
  return zone?.tabs[0] || 'overview';
}

/** @param {AccountingDeskTabId} tabId */
export function tabIconComponent(tabId) {
  return TAB_ICONS[tabId] || LayoutDashboard;
}

/** @param {string} zoneId */
export function secondaryTabsForZone(zoneId) {
  const zone = ACCOUNTING_ZONES.find((z) => z.id === zoneId);
  if (!zone || zone.tabs.length <= 1) return [];
  return zone.tabs.map((id) => ({
    id,
    label: secondaryTabLabel(id),
  }));
}

/** @param {AccountingDeskTabId} tabId */
function secondaryTabLabel(tabId) {
  const short = {
    overview: 'Overview',
    statements: 'Statements',
    gl: 'GL',
    opening: 'Opening balances',
    close: 'Month-end',
    policy: 'Deposits',
    supplierAp: 'Supplier payables',
    costing: 'Costing',
    branchPl: 'Branch P&L',
    pricingGov: 'Pricing governance',
    opsHealth: 'Ops health',
    creditors: 'Receivables',
    debtors: 'Payables',
    assets: 'Fixed assets',
    interBranch: 'Inter-branch',
    credit: 'Credit',
    reconciliation: 'Reconciliation',
    payroll: 'Payroll',
  };
  return short[tabId] || TAB_LABELS[tabId] || tabId;
}

/** @param {string | null | undefined} focus */
export function resolveFocusTab(focus, queryTab) {
  if (queryTab && TAB_LABELS[queryTab]) return queryTab;
  if (focus && TAB_LABELS[focus]) return focus;
  if (focus === 'supplier-ap') return 'supplierAp';
  if (focus === 'costing' || focus === 'production-cost') return 'costing';
  if (focus === 'branch-pl' || focus === 'branchPl') return 'branchPl';
  if (focus === 'pricing-gov' || focus === 'pricingGov' || focus === 'pricing-governance') return 'pricingGov';
  if (focus === 'policy' || focus === 'ap1c') return 'policy';
  if (focus === 'inter-branch' || focus === 'interBranch') return 'interBranch';
  if (focus === 'opening' || focus === 'opening-pack') return 'opening';
  return focus ? 'overview' : null;
}

export function currentAccountingPeriodKey() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Desk zones visible in executive read-only mode (MD oversight — no posting or policy cutover).
 * @param {{ readOnlyExecutive?: boolean }} opts
 */
export function accountingZonesForActor({ readOnlyExecutive = false } = {}) {
  if (!readOnlyExecutive) return ACCOUNTING_ZONES;
  return ACCOUNTING_ZONES.filter((z) => z.id !== 'policy' && z.id !== 'operations').map((z) => {
    if (z.id === 'close') {
      return { ...z, tabs: z.tabs.filter((t) => t !== 'opening') };
    }
    return z;
  });
}

/** @param {string} zoneId @param {{ readOnlyExecutive?: boolean }} opts */
export function defaultTabForZoneWithMode(zoneId, opts = {}) {
  const zone = accountingZonesForActor(opts).find((z) => z.id === zoneId);
  return zone?.tabs[0] || 'overview';
}

/** @param {AccountingDeskTabId} tabId @param {{ readOnlyExecutive?: boolean }} opts */
export function zoneForTabWithMode(tabId, opts = {}) {
  const found = accountingZonesForActor(opts).find((z) => z.tabs.includes(tabId));
  return found?.id || 'home';
}

/** @param {string} zoneId @param {{ readOnlyExecutive?: boolean }} opts */
export function secondaryTabsForZoneWithMode(zoneId, opts = {}) {
  const zone = accountingZonesForActor(opts).find((z) => z.id === zoneId);
  if (!zone || zone.tabs.length <= 1) return [];
  return zone.tabs.map((id) => ({
    id,
    label: secondaryTabLabel(id),
  }));
}

/** Tabs hidden from executive read-only actors. */
export const EXECUTIVE_READONLY_HIDDEN_TABS = new Set(['opening', 'policy', 'supplierAp', 'credit', 'payroll']);
