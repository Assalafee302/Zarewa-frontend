/**
 * Display helpers for branch-manager / exec conversion-check review.
 */
import {
  conversionVariancePct,
  formatConversionVariancePct,
  roundConv2,
} from './conversionKgPerM.js';

export function numOrNull(raw) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function pickJobId(row) {
  return String(row?.job_id || row?.jobId || row?.jobID || '').trim();
}

export function pickCoilNo(row) {
  return String(row?.coil_no || row?.coilNo || '').trim();
}

export function pickKgPerM(row, snake, camel) {
  if (!row) return null;
  const v = row[snake] ?? row[camel];
  return roundConv2(v);
}

export function pickConversionVariances(check) {
  const summary = check?.variance_summary || check?.varianceSummary || {};
  const nested = summary.variances && typeof summary.variances === 'object' ? summary.variances : summary;
  return nested && typeof nested === 'object' ? nested : {};
}

export function conversionAlertKey(raw) {
  return String(raw || '').trim();
}

/**
 * Plain-language verdict for High / Low / Watch / OK conversion alerts.
 * @param {string | null | undefined} alert
 */
export function conversionAlertCopy(alert) {
  const k = conversionAlertKey(alert).toLowerCase();
  if (k === 'high') {
    return {
      key: 'High',
      tone: 'rose',
      headline: 'High conversion',
      meaning: 'This run used more kg per metre than the expected band.',
      next: 'Check weighbridge kg, logged metres, and whether the right coil was used.',
    };
  }
  if (k === 'low') {
    return {
      key: 'Low',
      tone: 'amber',
      headline: 'Low conversion',
      meaning: 'This run used less kg per metre than the expected band.',
      next: 'Check logged metres, leftover coil, and opening weight.',
    };
  }
  if (k === 'watch') {
    return {
      key: 'Watch',
      tone: 'amber',
      headline: 'Near the alert band',
      meaning: 'Conversion is close to the High/Low threshold.',
      next: 'Review the record, then confirm if it is acceptable to close.',
    };
  }
  if (k === 'ok') {
    return {
      key: 'OK',
      tone: 'emerald',
      headline: 'Within expected band',
      meaning: 'Conversion sits inside the standard band.',
      next: 'Confirm you have reviewed the coil record before closing.',
    };
  }
  return {
    key: conversionAlertKey(alert) || 'Review',
    tone: 'slate',
    headline: 'Production conversion check',
    meaning: 'Review coil kg used against metres produced, then confirm.',
    next: 'A remark is required to close this check.',
  };
}

export function conversionAlertChipClass(tone) {
  if (tone === 'rose') return 'bg-rose-100 text-rose-900 border-rose-200';
  if (tone === 'amber') return 'bg-amber-100 text-amber-950 border-amber-200';
  if (tone === 'emerald') return 'bg-emerald-100 text-emerald-900 border-emerald-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export function conversionAlertBandClass(tone) {
  if (tone === 'rose') return 'border-rose-200 border-l-rose-500 bg-rose-50/70';
  if (tone === 'amber') return 'border-amber-200 border-l-amber-500 bg-amber-50/70';
  if (tone === 'emerald') return 'border-emerald-200 border-l-emerald-500 bg-emerald-50/50';
  return 'border-slate-200 border-l-teal-600 bg-white';
}

/**
 * @param {object|null} check
 * @param {object|null} [coil]
 */
export function conversionReferenceRows(check, coil = null) {
  const actual = pickKgPerM(check, 'actual_conversion_kg_per_m', 'actualConversionKgPerM')
    ?? pickKgPerM(coil, 'actual_conversion_kg_per_m', 'actualConversionKgPerM');
  const stored = pickConversionVariances(check);
  const rows = [
    {
      key: 'standard',
      label: 'Standard',
      hint: 'Workbook / density table',
      value: pickKgPerM(check, 'standard_conversion_kg_per_m', 'standardConversionKgPerM'),
      storedPct: stored.standardPct,
      primary: true,
    },
    {
      key: 'supplier',
      label: 'Supplier PO',
      hint: 'Purchase conversion',
      value:
        pickKgPerM(coil, 'coil_supplier_conversion_kg_per_m', 'coilSupplierConversionKgPerM')
        ?? pickKgPerM(check, 'supplier_conversion_kg_per_m', 'supplierConversionKgPerM'),
      storedPct: stored.supplierPct,
    },
    {
      key: 'gauge',
      label: 'Same gauge',
      hint: 'History for this gauge',
      value: pickKgPerM(check, 'gauge_history_avg_kg_per_m', 'gaugeHistoryAvgKgPerM'),
      storedPct: stored.gaugeHistoryPct,
    },
    {
      key: 'coil',
      label: 'This coil',
      hint: 'Prior runs on this coil',
      value: pickKgPerM(check, 'coil_history_avg_kg_per_m', 'coilHistoryAvgKgPerM'),
      storedPct: stored.coilHistoryPct,
    },
  ];
  return rows.map((row) => {
    const computed = conversionVariancePct(actual, row.value);
    const pct = computed != null ? computed : numOrNull(row.storedPct);
    return {
      ...row,
      actual,
      pct,
      pctLabel: formatConversionVariancePct(pct),
    };
  });
}

export function conversionPrimaryDelta(check, coil = null) {
  const refs = conversionReferenceRows(check, coil);
  return refs.find((r) => r.primary) || refs[0] || null;
}

export { formatConversionVariancePct };
