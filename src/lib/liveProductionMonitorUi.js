import { fmtConv2 } from './conversionKgPerM.js';

/** Matches server: closing below this (kg) may use “Finish roll” on completion to clear the tail from stock. */
export const COIL_TAIL_FINISH_MAX_KG = 85;

export function formatKg(value) {
  const next = Number(value);
  return Number.isFinite(next) ? `${Math.round(next)} kg` : '—';
}

export function formatMeters(value) {
  const next = Number(value);
  return Number.isFinite(next) ? `${next.toFixed(2)} m` : '—';
}

export function stockRecalcSuffix(stockRecalc) {
  if (!stockRecalc?.ok) return '';
  const n = Number(stockRecalc.recalculatedCount ?? stockRecalc.coils?.length ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '';
  return ` Stock recalculated for ${n} coil(s).`;
}

export function savedCoilCountFromAllocPayload(body, data) {
  const fromResponse = Array.isArray(data?.allocations) ? data.allocations.length : 0;
  if (fromResponse > 0) return fromResponse;
  const fromRequest = Array.isArray(body?.allocations) ? body.allocations.length : 0;
  return fromRequest;
}

export function coilAllocSavedToastMessage({ body, data, isRunning, listLabel, stockRecalc, started = false }) {
  const count = savedCoilCountFromAllocPayload(body, data);
  const countPhrase = count > 0 ? `${count} coil(s) ` : '';
  const suffix = stockRecalcSuffix(stockRecalc);
  if (started) {
    return `${countPhrase}saved to server and production started for ${listLabel} — visible to all users.${suffix}`;
  }
  if (isRunning) {
    return `${countPhrase}saved to server on ${listLabel} — admin and manager can see them now.${suffix}`;
  }
  return `${countPhrase}saved to server for ${listLabel} — visible to admin and manager.${suffix}`;
}

/** In compact views, omit “Design” when it matches or nests inside the FG product line label. */
export function designRedundantVersusProductLine(design, productName, productID) {
  const d = String(design || '').trim().toLowerCase();
  if (!d) return true;
  const p = String(productName || productID || '').trim().toLowerCase();
  if (!p) return false;
  if (d === p) return true;
  if (d.length >= 4 && p.includes(d)) return true;
  if (p.length >= 4 && d.includes(p)) return true;
  return false;
}

export function formatKgPerM(value) {
  return fmtConv2(value, { suffix: 'kg/m' });
}

/** Table cells for posted conversion. */
export function formatKgPerMCompact(value) {
  return fmtConv2(value);
}

/** Default opening kg when picking a coil — whole kg, same as free kg shown in the picker. */
export function suggestedOpeningKgFromFree(freeKg) {
  const n = Number(freeKg);
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(Math.round(n));
}

/** Metres implied by free kg using supplier conversion, else scaled from supplier nominal length vs received kg. */
export function estimatedMetresFromFreeKg(coil, freeKg) {
  const kg = Number(freeKg);
  if (!Number.isFinite(kg) || kg <= 0) return null;
  const conv = Number(coil?.supplierConversionKgPerM);
  if (Number.isFinite(conv) && conv > 0) {
    const m = kg / conv;
    return Number.isFinite(m) && m > 0 ? m : null;
  }
  const sem = Number(coil?.supplierExpectedMeters);
  const recv = Number(coil?.qtyReceived);
  if (Number.isFinite(sem) && sem > 0 && Number.isFinite(recv) && recv > 0) {
    const m = sem * (kg / recv);
    return Number.isFinite(m) && m > 0 ? m : null;
  }
  return null;
}

export function supplierNominalMetres(coil) {
  const sem = Number(coil?.supplierExpectedMeters);
  return Number.isFinite(sem) && sem > 0 ? sem : null;
}

/** Lower sorts earlier: best match to planned metres when estimate exists. */
export function coilMetresPickSortKey(estimatedM, plannedM) {
  if (estimatedM == null || !Number.isFinite(estimatedM)) return 3000;
  if (!Number.isFinite(plannedM) || plannedM <= 0) return 1000;
  const diff = estimatedM - plannedM;
  if (diff >= 0) return 1000 + diff;
  return 2000 - diff;
}

/** One-line label for coil `<option>`s: material, spec, estimated metres vs free kg, optional job plan hint. */
export function coilPickerOptionText(coil, freeKg, plannedJobM) {
  const mat = String(coil?.materialTypeName || '').trim();
  const matPrefix = mat ? `${mat} · ` : '';
  const colour = coil?.colour || '—';
  const gauge = coil?.gaugeLabel || '—';
  const est = estimatedMetresFromFreeKg(coil, freeKg);
  const nominal = supplierNominalMetres(coil);
  let metresPart = '';
  if (est != null) {
    metresPart = `≈${est.toFixed(1)} m est`;
    if (Number.isFinite(plannedJobM) && plannedJobM > 0) {
      metresPart += ` · plan ${plannedJobM.toFixed(1)} m`;
    }
  } else if (nominal != null) {
    metresPart = `supplier ~${nominal.toFixed(0)} m roll`;
    if (Number.isFinite(plannedJobM) && plannedJobM > 0) {
      metresPart += ` · plan ${plannedJobM.toFixed(1)} m`;
    }
  } else {
    metresPart = 'm est n/a';
  }
  return `${coil.coilNo} — ${matPrefix}${colour} ${gauge} · ${metresPart} · free ${freeKg.toFixed(1)} kg`;
}

export function formatPct(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return '—';
  const sign = next > 0 ? '+' : '';
  return `${sign}${next.toFixed(1)}%`;
}

export function alertTone(alertState) {
  switch (alertState) {
    case 'High':
      return 'border-red-200 bg-red-50 text-red-900';
    case 'Low':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'Watch':
      return 'border-sky-200 bg-sky-50 text-sky-900';
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }
}

/** Table row background only (posted conversion). */
export function postedCheckRowClass(alertState) {
  switch (alertState) {
    case 'High':
      return 'bg-red-50/85 text-red-950';
    case 'Low':
      return 'bg-amber-50/85 text-amber-950';
    case 'Watch':
      return 'bg-sky-50/85 text-sky-950';
    default:
      return 'bg-emerald-50/50 text-emerald-950';
  }
}

export function statusTone(status) {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-100 text-emerald-800';
    case 'Cancelled':
      return 'bg-slate-200 text-slate-700';
    case 'Running':
      return 'bg-sky-100 text-sky-800';
    default:
      return 'bg-amber-100 text-amber-900';
  }
}
