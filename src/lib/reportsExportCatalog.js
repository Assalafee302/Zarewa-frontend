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
