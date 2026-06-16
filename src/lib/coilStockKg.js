/** GRN received kg for a coil lot (book figure, not live on-hand). */
export function coilReceivedKg(lot) {
  if (!lot || typeof lot !== 'object') return 0;
  const w = Number(lot.weightKg);
  if (Number.isFinite(w) && w > 0) return w;
  const q = Number(lot.qtyReceived);
  return Number.isFinite(q) ? Math.max(0, q) : 0;
}

/** Kg consumed off the coil: GRN received minus current on-hand (includes production, scrap, net of returns). */
export function coilKgUsed(lot) {
  return Math.max(0, coilReceivedKg(lot) - coilOnHandKg(lot));
}

/** On-hand kg for a coil lot (live book, not GRN-only). */
export function coilOnHandKg(lot) {
  if (!lot || typeof lot !== 'object') return 0;
  const cw = Number(lot.currentWeightKg);
  if (Number.isFinite(cw) && cw > 0) return cw;
  const qr = Number(lot.qtyRemaining);
  if (Number.isFinite(qr) && qr > 0) return qr;
  const w = Number(lot.weightKg);
  if (Number.isFinite(w) && w > 0) return w;
  const q = Number(lot.qtyReceived);
  return Number.isFinite(q) ? Math.max(0, q) : 0;
}

/** kg available on roll: on-hand minus reservations (same as production register). */
export function coilFreeKg(lot, addBackKg = 0) {
  return Math.max(0, coilOnHandKg(lot) - Number(lot?.qtyReserved || 0) + (Number(addBackKg) || 0));
}
