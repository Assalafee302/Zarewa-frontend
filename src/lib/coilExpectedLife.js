/**
 * Expected kg for a coil: received − metres run × gauge rate.
 * Latest consumption entry per coil+job wins. A completion correction replaces
 * the earlier entry for that job; it does not add.
 */

export const COIL_GAUGE_RATES = Object.freeze([
  { material: 'aluzinc', gaugeMm: 0.18, kgPerMetre: 1.746 },
  { material: 'aluzinc', gaugeMm: 0.2, kgPerMetre: 1.935 },
  { material: 'aluzinc', gaugeMm: 0.22, kgPerMetre: 2.091 },
  { material: 'aluzinc', gaugeMm: 0.24, kgPerMetre: 2.27 },
  { material: 'aluzinc', gaugeMm: 0.28, kgPerMetre: 2.644 },
  { material: 'aluzinc', gaugeMm: 0.4, kgPerMetre: 3.78 },
  { material: 'aluminium', gaugeMm: 0.45, kgPerMetre: 1.319 },
  { material: 'aluminium', gaugeMm: 0.55, kgPerMetre: 1.593 },
  { material: 'aluminium', gaugeMm: 0.7, kgPerMetre: 2.03 },
]);

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function textOf(row) {
  return `${row?.detail || ''} ${row?.note || ''} ${row?.type || ''} ${row?.reason || ''}`;
}

export function materialKeyFromLot(lot) {
  const blob = `${lot?.materialTypeName || ''} ${lot?.materialType || ''} ${lot?.productID || ''} ${lot?.material || ''}`.toLowerCase();
  if (blob.includes('aluzinc') || blob.includes('alu-zinc') || blob.includes('ppgi') || blob.includes('prd-102')) {
    return 'aluzinc';
  }
  if (blob.includes('alum') || blob.includes('coil-alu')) return 'aluminium';
  return '';
}

export function gaugeMmFromLot(lot) {
  const raw = lot?.gaugeMm ?? lot?.gaugeLabel ?? lot?.gauge ?? '';
  const n = parseFloat(String(raw).replace(/mm/gi, '').trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function rateKgPerMetreForLot(lot) {
  const material = materialKeyFromLot(lot);
  const gauge = gaugeMmFromLot(lot);
  if (!material || gauge == null) return null;
  const hit = COIL_GAUGE_RATES.find((r) => r.material === material && Math.abs(r.gaugeMm - gauge) < 0.001);
  return hit ? hit.kgPerMetre : null;
}

function jobKeyOf(row) {
  return String(row?.jobID || row?.jobId || row?.cuttingListId || row?.cutting_list_id || row?.ref || '').trim();
}

function stampOf(row) {
  const t = Date.parse(String(row?.updatedAtISO || row?.atISO || row?.createdAtISO || row?.dateISO || ''));
  return Number.isFinite(t) ? t : 0;
}

function isCompletionCorrection(row) {
  return /completion correction/i.test(textOf(row));
}

/** Keep the winning consumption row per job. */
export function latestJobRows(rows) {
  const byJob = new Map();
  let anon = 0;
  for (const row of rows || []) {
    const key = jobKeyOf(row) || `anon-${anon++}`;
    const prev = byJob.get(key);
    if (!prev) {
      byJob.set(key, row);
      continue;
    }
    const curCorr = isCompletionCorrection(row);
    const prevCorr = isCompletionCorrection(prev);
    if (curCorr && !prevCorr) {
      byJob.set(key, row);
      continue;
    }
    if (prevCorr && !curCorr) continue;
    if (stampOf(row) >= stampOf(prev)) byJob.set(key, row);
  }
  return [...byJob.values()];
}

export function metresAndBookedKg(rows) {
  let metres = 0;
  let bookedKg = 0;
  for (const row of latestJobRows(rows)) {
    const m = num(row.metersProduced ?? row.meters_produced ?? row.meters);
    const kg = num(row.consumedWeightKg ?? row.consumed_weight_kg ?? row.kgUsed ?? row.kg);
    if (m != null && m > 0) metres += m;
    if (kg != null && kg > 0) bookedKg += kg;
    else if (row.openingWeightKg != null && row.closingWeightKg != null) {
      const open = num(row.openingWeightKg);
      const close = num(row.closingWeightKg);
      if (open != null && close != null && open >= close) bookedKg += open - close;
    }
  }
  return { metres, bookedKg };
}

function kgInText(text) {
  const m = String(text || '').match(/(-?\d+(?:\.\d+)?)\s*kg/i);
  return m ? Math.abs(Number(m[1])) : 0;
}

/** Tail kg removed, net of any later restore. */
export function tailKgNet(movements) {
  const events = [];
  for (const m of movements || []) {
    const d = textOf(m).toLowerCase();
    const restore = d.includes('restore') && d.includes('tail');
    const finish = !restore && (d.includes('roll finished') || d.includes('finish roll') || d.includes('finish-roll'));
    if (!restore && !finish) continue;
    const kg = Math.abs(num(m.kg ?? m.qty ?? m.weightKg) ?? kgInText(d));
    events.push({ at: stampOf(m), restore, kg });
  }
  events.sort((a, b) => a.at - b.at);
  let net = 0;
  for (const ev of events) net += ev.restore ? -ev.kg : ev.kg;
  return Math.max(0, net);
}

export function varianceStatus(varianceKg, metres, rate) {
  if (varianceKg == null || rate == null) return null;
  const mass = Math.max(0, metres) * rate;
  const tolerance = 0.05 * mass + 30;
  if (Math.abs(varianceKg) <= tolerance + 1e-6) return 'OK';
  return varianceKg > 0 ? 'HIGH' : 'LOW';
}

export function coilReceivedKgSafe(lot) {
  const w = num(lot?.weightKg ?? lot?.weight_kg);
  if (w != null && w > 0) return w;
  const q = num(lot?.qtyReceived ?? lot?.qty_received);
  return q != null ? Math.max(0, q) : 0;
}

export function coilErpKgSafe(lot) {
  const cw = lot?.currentWeightKg ?? lot?.current_weight_kg;
  if (cw != null && cw !== '' && num(cw) != null) return Math.max(0, num(cw));
  const qr = lot?.qtyRemaining ?? lot?.qty_remaining;
  if (qr != null && qr !== '' && num(qr) != null) return Math.max(0, num(qr));
  return coilReceivedKgSafe(lot);
}

/**
 * @param {object} lot
 * @param {object[]} [jobRows]
 * @param {object[]} [movements]
 */
export function buildCoilLife(lot, jobRows = [], movements = []) {
  const receivedKg = coilReceivedKgSafe(lot);
  const erpKg = coilErpKgSafe(lot);
  const rate = rateKgPerMetreForLot(lot);
  const { metres, bookedKg } = metresAndBookedKg(jobRows);
  const tailKg = tailKgNet(movements);
  const expectedKg = rate == null ? null : Math.max(receivedKg - metres * rate, 0);
  const varianceKg = expectedKg == null ? null : erpKg - expectedKg;
  const status = varianceStatus(varianceKg, metres, rate);
  return {
    receivedKg,
    metres,
    bookedKg,
    tailKg,
    expectedKg,
    erpKg,
    varianceKg,
    status,
    rateKgPerM: rate,
    onWatchList: status === 'HIGH' || status === 'LOW',
  };
}

/** Live hint while a job kg is typed. Warn only for clear typing errors. */
export function jobKgTypingCheck(typedKg, metres, rate) {
  const m = num(metres);
  const r = num(rate);
  const typed = num(typedKg);
  if (m == null || m <= 0 || r == null || r <= 0) {
    return { expectedKg: null, warn: false };
  }
  const expectedKg = m * r;
  if (typed == null || typed <= 0) return { expectedKg, warn: false };
  const ratio = typed / expectedKg;
  return { expectedKg, warn: ratio < 0.5 || ratio > 2 };
}

/**
 * Roll finish. Expected kg is metres × rate.
 * Difference is received − tail − booked (kg not explained by the tail or the jobs).
 * Review when that difference is outside 5% of expected kg + 30 kg.
 */
export function rollFinishCheck({ receivedKg, bookedKg, tailKg, metres, rate }) {
  const received = num(receivedKg) ?? 0;
  const booked = num(bookedKg) ?? 0;
  const tail = num(tailKg) ?? 0;
  const m = num(metres) ?? 0;
  const r = num(rate);
  const expectedKg = r != null ? m * r : null;
  const difference = received - tail - booked;
  const tolerance = expectedKg == null ? null : 0.05 * expectedKg + 30;
  const review = tolerance == null || Math.abs(difference) > tolerance + 1e-6;
  return {
    receivedKg: received,
    bookedKg: booked,
    tailKg: tail,
    expectedKg,
    difference,
    tolerance,
    verdict: review ? 'review' : 'pass',
  };
}

/** True when roll-finish maths need an operator reason (watch / variance). */
export function rollFinishNeedsReason(props) {
  return rollFinishCheck(props).verdict === 'review';
}

function movementKind(m) {
  const d = textOf(m).toLowerCase();
  if (d.includes('restore') && d.includes('tail')) return 'restore';
  if (d.includes('roll finished') || d.includes('finish roll')) return 'tail';
  if (/completion correction|corrected|replaced/.test(d)) return 'correction';
  if (d.includes('master data') || d.includes('on-hand') || d.includes('manual')) return 'manual';
  if (d.includes('scrap')) return 'scrap';
  if (d.includes('grn') || d.includes('receipt') || d.includes('received')) return 'grn';
  if (d.includes('consum') || d.includes('production') || d.includes('job')) return 'job';
  return 'other';
}

function actorOf(m) {
  return (
    String(m?.createdByName || m?.userName || m?.actorName || m?.createdBy || m?.user || '').trim() || '—'
  );
}

function reasonOf(m) {
  return String(m?.reason || m?.note || '').trim();
}

/**
 * Full movement history. Corrected rows stay visible and are marked superseded.
 */
export function buildCoilTimeline({ coil, jobRows = [], movements = [] }) {
  const events = [];
  const received = coilReceivedKgSafe(coil);
  const hasGrnMove = (movements || []).some((m) => movementKind(m) === 'grn');
  if (!hasGrnMove) {
    events.push({
      id: `grn-${coil?.coilNo || 'coil'}`,
      kind: 'GRN',
      atISO: coil?.receivedAtISO || '',
      title: 'Goods received',
      detail: received > 0 ? `${received.toLocaleString()} kg received` : 'Coil registered',
      user: actorOf(coil),
      reason: String(coil?.note || '').trim(),
      jobKey: '',
      superseded: false,
    });
  }
  for (const m of movements || []) {
    const kind = movementKind(m);
    const label =
      kind === 'grn'
        ? 'GRN'
        : kind === 'job'
          ? 'Production job'
          : kind === 'correction'
            ? 'Correction'
            : kind === 'restore'
              ? 'Restore tail'
              : kind === 'tail'
                ? 'Roll finished — tail'
                : kind === 'manual'
                  ? 'Manual edit'
                  : kind === 'scrap'
                    ? 'Scrap'
                    : 'Movement';
    events.push({
      id: String(m.id || `${kind}-${stampOf(m)}-${events.length}`),
      kind: label,
      atISO: m.atISO || m.createdAtISO || m.dateISO || '',
      title: label,
      detail: String(m.detail || m.type || '—'),
      user: actorOf(m),
      reason: reasonOf(m),
      jobKey: jobKeyOf(m),
      rawKind: kind,
      superseded: false,
    });
  }
  const coveredJobs = new Set(events.map((e) => e.jobKey).filter(Boolean));
  for (const row of latestJobRows(jobRows)) {
    const key = jobKeyOf(row);
    if (key && coveredJobs.has(key)) continue;
    const metres = num(row.metersProduced ?? row.meters_produced ?? row.meters);
    const kg = num(row.kgUsed ?? row.consumedWeightKg ?? row.consumed_weight_kg);
    events.push({
      id: `job-${key || events.length}`,
      kind: 'Production job',
      atISO: row.atISO || row.updatedAtISO || row.createdAtISO || '',
      title: key ? `Job ${key}` : 'Production job',
      detail: `${metres != null && metres > 0 ? `${metres} m` : 'metres not recorded'} · ${
        kg != null ? `${kg} kg` : 'kg not recorded'
      }`,
      user: actorOf(row),
      reason: reasonOf(row),
      jobKey: key,
      rawKind: isCompletionCorrection(row) ? 'correction' : 'job',
      superseded: false,
    });
  }

  const byJob = new Map();
  for (const ev of events) {
    if (!ev.jobKey) continue;
    if (ev.rawKind !== 'job' && ev.rawKind !== 'correction') continue;
    if (!byJob.has(ev.jobKey)) byJob.set(ev.jobKey, []);
    byJob.get(ev.jobKey).push(ev);
  }
  for (const group of byJob.values()) {
    group.sort((a, b) => stampOf(a) - stampOf(b));
    let winner = -1;
    group.forEach((ev, i) => {
      if (ev.rawKind === 'correction') winner = i;
    });
    if (winner >= 0) {
      group.forEach((ev, i) => {
        if (i < winner) ev.superseded = true;
      });
    }
  }

  const tails = events
    .filter((ev) => ev.rawKind === 'tail' || ev.rawKind === 'restore')
    .sort((a, b) => stampOf(a) - stampOf(b));
  for (let i = 0; i < tails.length; i += 1) {
    const later = tails.slice(i + 1);
    if (tails[i].rawKind === 'tail' && later.some((ev) => ev.rawKind === 'restore')) tails[i].superseded = true;
    if (tails[i].rawKind === 'restore' && later.some((ev) => ev.rawKind === 'tail')) tails[i].superseded = true;
  }

  events.sort((a, b) => stampOf(a) - stampOf(b) || String(a.id).localeCompare(String(b.id)));
  return events;
}

export function formatSignedKg(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  const abs = Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (Math.abs(v) < 0.05) return '0 kg';
  return `${v > 0 ? '+' : '−'}${abs} kg`;
}
