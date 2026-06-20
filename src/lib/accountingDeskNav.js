import {
  ArrowRightLeft,
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

/** @typedef {'overview' | 'statements' | 'gl' | 'opening' | 'close' | 'policy' | 'supplierAp' | 'costing' | 'branchPl' | 'creditors' | 'debtors' | 'assets' | 'interBranch' | 'credit' | 'reconciliation' | 'payroll'} AccountingDeskTabId */

export const TAB_LABELS = {
  overview: 'Overview',
  statements: 'Statements',
  gl: 'General ledger',
  opening: 'Opening Pack',
  close: 'Month-end close',
  policy: 'Deposit policy',
  supplierAp: 'Supplier AP',
  costing: 'Production costing',
  branchPl: 'Branch P&L',
  creditors: 'Money owed to us',
  debtors: 'Money we owe',
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
  opening: `Register-first Opening Pack for ${ACCOUNTING_OPENING_DATE_LABEL} — roll up from modules, enter capital, post one journal.`,
  close: 'Checklist before locking the period — receipts, payroll, depreciation, tie-out.',
  policy: 'AP1c dry-run and cutover to deposit-until-produced GL posting.',
  supplierAp: 'AP2 supplier prepayments, GRNI diagnostics, and received-basis cutover.',
  costing: 'Material cost per metre, labour readiness, and data quality for AP3.',
  branchPl: 'Draft branch contribution P&L from production and cost pools.',
  creditors: 'Creditors register · trade receivables, prepayments, and opening balances.',
  debtors: 'Debtors register · supplier AP, deposits, refunds, and suspense.',
  assets: 'Plant, property, and equipment register.',
  interBranch: 'Cross-branch treasury funding — propose, approve, repay, and track balances.',
  credit: 'Approve delivery before full payment is received.',
  reconciliation: 'Bank and cash tie-out for the selected period.',
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
    label: 'Close',
    icon: Lock,
    tabs: ['opening', 'close', 'reconciliation'],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileBarChart,
    tabs: ['statements', 'gl', 'branchPl', 'costing'],
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
    opening: 'Opening Pack',
    close: 'Month-end',
    policy: 'Deposits',
    supplierAp: 'Supplier AP',
    costing: 'Costing',
    branchPl: 'Branch P&L',
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
