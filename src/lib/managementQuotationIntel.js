/** Helpers for Management clearance / refund intel panels. */

import { fmtConv2 } from './conversionKgPerM.js';

export function fmtKg(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
}

export function fmtM(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} m`;
}

export function fmtConv(n) {
  return fmtConv2(n, { suffix: 'kg/m' });
}

export function quotationMaterialSpecRows(auditData) {
  const q = auditData?.quotation;
  const sum = auditData?.summary;
  const rows = [];
  const typeName = String(sum?.materialTypeName || q?.materialTypeName || '').trim();
  const typeId = String(sum?.materialTypeId || q?.materialTypeId || '').trim();
  if (typeName || typeId) {
    rows.push({ label: 'Material type', value: typeName || typeId });
  }
  const gauge = String(sum?.materialGauge || q?.materialGauge || '').trim();
  const colour = String(sum?.materialColor || q?.materialColor || '').trim();
  const design = String(sum?.materialDesign || q?.materialDesign || '').trim();
  if (gauge) rows.push({ label: 'Gauge', value: gauge });
  if (colour) rows.push({ label: 'Colour', value: colour });
  if (design) rows.push({ label: 'Design / profile', value: design });
  return rows;
}

/** Unlabeled material detail line: Aluzinc · 0.40 · Graybeige · 120 m */
export function quotationMaterialSpecLine(auditData, { metres } = {}) {
  const q = auditData?.quotation;
  const sum = auditData?.summary;
  const bits = [
    String(sum?.materialTypeName || q?.materialTypeName || sum?.materialTypeId || q?.materialTypeId || '').trim(),
    String(sum?.materialGauge || q?.materialGauge || '').trim(),
    String(sum?.materialColor || q?.materialColor || '').trim(),
    String(sum?.materialDesign || q?.materialDesign || '').trim(),
  ].filter(Boolean);
  const m = metres != null ? Number(metres) : Number(sum?.quotedMeters ?? q?.totalMeters ?? q?.meters);
  if (Number.isFinite(m) && m > 0) bits.push(`${m.toLocaleString(undefined, { maximumFractionDigits: 2 })} m`);
  return bits.length ? bits.join(' · ') : '';
}

/** True when quote-level material already covers line-level gauge/colour repeats. */
export function quotationHasMaterialSpec(auditData) {
  return Boolean(quotationMaterialSpecLine(auditData));
}

/**
 * Merge job coil usage + conversion check + coil lot economics for one production job.
 * @param {string} jobId
 * @param {object[]} jobCoils
 * @param {object[]} conversionChecks
 */
export function coilIntelRowsForJob(jobId, jobCoils, conversionChecks) {
  const jid = String(jobId || '').trim();
  const coils = (jobCoils || []).filter((c) => String(c.job_id || '') === jid);
  const checks = (conversionChecks || []).filter((c) => String(c.job_id || '') === jid);
  const byCoil = new Map();
  for (const co of coils) {
    const key = String(co.coil_no || '').trim();
    if (!key) continue;
    byCoil.set(key, { coilNo: key, coil: co, check: null });
  }
  for (const ch of checks) {
    const key = String(ch.coil_no || '').trim();
    if (!key) continue;
    const prev = byCoil.get(key) || { coilNo: key, coil: null, check: null };
    prev.check = ch;
    if (!prev.coil) prev.coil = coils.find((c) => String(c.coil_no) === key) || null;
    byCoil.set(key, prev);
  }
  return [...byCoil.values()];
}

export function lineMaterialSubtitle(ln) {
  const bits = [
    ln.gauge,
    ln.colour || ln.color,
    ln.design,
    ln.profile,
    ln.materialType,
  ]
    .map((x) => String(x || '').trim())
    .filter(Boolean);
  return bits.length ? bits.join(' · ') : '';
}
