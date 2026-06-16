/**
 * Branch manager workstation — health signals, open-action counts, target metadata.
 */

/** @typedef {'green' | 'amber' | 'red'} HealthTone */

/**
 * @param {number} count
 * @returns {HealthTone}
 */
export function healthToneFromCount(count) {
  const n = Number(count) || 0;
  if (n <= 0) return 'green';
  if (n <= 3) return 'amber';
  return 'red';
}

/**
 * Deduplicated open-action count across command queues (not Everything tab merge).
 */
export function computeBranchOpenActionCount({
  ordersCount = 0,
  cashOutCount = 0,
  qcCount = 0,
  materialCount = 0,
  governanceCount = 0,
  editsCount = 0,
  procurementCount = 0,
  creditPendingCount = 0,
  stockRegisterCount = 0,
} = {}) {
  return (
    ordersCount +
    cashOutCount +
    qcCount +
    materialCount +
    governanceCount +
    editsCount +
    procurementCount +
    creditPendingCount +
    stockRegisterCount
  );
}

/**
 * @param {object} params
 * @returns {Array<{ key: string; label: string; tone: HealthTone; count: number; hint: string }>}
 */
export function buildBranchHealthSignals({
  ordersCount = 0,
  cashOutCount = 0,
  qcCount = 0,
  materialCount = 0,
  governanceCount = 0,
  editsCount = 0,
  creditPendingCount = 0,
  stockRegisterCount = 0,
  procurementCount = 0,
  lowStockCount = 0,
  attendancePendingCount = 0,
} = {}) {
  return [
    {
      key: 'orders',
      label: 'Orders',
      tone: healthToneFromCount(ordersCount),
      count: ordersCount,
      hint: 'Sign-off, flags, production gate',
    },
    {
      key: 'procurement',
      label: 'POs',
      tone: healthToneFromCount(procurementCount),
      count: procurementCount,
      hint: 'Purchase orders awaiting approval',
    },
    {
      key: 'cash',
      label: 'Cash',
      tone: healthToneFromCount(cashOutCount),
      count: cashOutCount,
      hint: 'Refunds and payment requests',
    },
    {
      key: 'production',
      label: 'Production',
      tone: healthToneFromCount(qcCount),
      count: qcCount,
      hint: 'Conversion QC reviews',
    },
    {
      key: 'material',
      label: 'Material',
      tone: healthToneFromCount(materialCount),
      count: materialCount,
      hint: 'Stock exceptions awaiting approval',
    },
    {
      key: 'governance',
      label: 'Governance',
      tone: governanceCount > 0 ? 'red' : 'green',
      count: governanceCount,
      hint: 'Dual-control and payment-gate risks',
    },
    {
      key: 'stock',
      label: 'Stock register',
      tone: healthToneFromCount(stockRegisterCount),
      count: stockRegisterCount,
      hint: 'Month-end count alignment',
    },
    {
      key: 'inventory',
      label: 'Low stock',
      tone: lowStockCount > 5 ? 'red' : lowStockCount > 0 ? 'amber' : 'green',
      count: lowStockCount,
      hint: 'SKUs below threshold',
    },
    {
      key: 'staff',
      label: 'Attendance',
      tone: attendancePendingCount > 0 ? 'amber' : 'green',
      count: attendancePendingCount,
      hint: 'Staff not marked today',
    },
  ];
}

/**
 * @param {{ managerTargetsPersonalOverride?: boolean }} mergedPrefs
 * @param {{ nairaTargetPerMonth?: number; meterTargetPerMonth?: number } | null | undefined} orgTargets
 */
export function buildManagerTargetSourceMeta(mergedPrefs, orgTargets) {
  const orgN = Number(orgTargets?.nairaTargetPerMonth);
  const orgM = Number(orgTargets?.meterTargetPerMonth);
  const hasOrg = (Number.isFinite(orgN) && orgN > 0) || (Number.isFinite(orgM) && orgM > 0);

  if (mergedPrefs?.managerTargetsPersonalOverride) {
    return {
      shortLabel: 'Personal',
      line: 'Personal monthly targets from Settings → Preferences.',
      title:
        'Active targets: personal override. Progress bars use your own monthly baselines from Settings → Preferences. Company defaults are ignored.',
      chipClass: 'bg-violet-500/20 border-violet-400/35 text-violet-100',
    };
  }
  if (hasOrg) {
    return {
      shortLabel: 'Company',
      line: 'Company monthly targets set by admin in Settings → Preferences.',
      title:
        'Active targets: company. Progress bars prefer company monthly baselines set by an admin in Settings → Preferences. If only one leg is set at company level, the other uses your saved baseline or the app default.',
      chipClass: 'bg-sky-500/20 border-sky-400/35 text-sky-100',
    };
  }
  return {
    shortLabel: 'Account',
    line: 'Your account targets from Settings → Preferences (or app defaults).',
    title:
      'Active targets: your account. No company targets are set; progress bars use the values saved on your account in Settings → Preferences, or built-in defaults.',
    chipClass: 'bg-white/10 border-white/20 text-teal-100/95',
  };
}
