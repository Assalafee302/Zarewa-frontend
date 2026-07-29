/**
 * Generic MoM spike detection (25% + absolute floor + prior-period floor).
 * Spend uses ₦ floors; other metrics pass absFloor in their own units.
 */

export const MOM_SPIKE_PCT_THRESHOLD = 25;
export const MOM_SPIKE_ABS_FLOOR_NGN = 50_000;

/**
 * @param {{
 *   category?: string,
 *   label?: string,
 *   value?: number,
 *   amountNgn?: number,
 *   priorValue?: number,
 *   priorNgn?: number,
 *   delta?: number,
 *   deltaNgn?: number,
 *   deltaPct: number,
 * }[]} deltas
 * @param {{ pctThreshold?: number, absFloor?: number, absFloorNgn?: number, idPrefix?: string }} [opts]
 */
export function momSpikeSignals(deltas, opts = {}) {
  const pctThreshold = opts.pctThreshold ?? MOM_SPIKE_PCT_THRESHOLD;
  const absFloor = opts.absFloor ?? opts.absFloorNgn ?? MOM_SPIKE_ABS_FLOOR_NGN;
  const idPrefix = opts.idPrefix || 'mom';
  const list = Array.isArray(deltas) ? deltas : [];
  return list
    .filter((d) => {
      const prior = Math.round(Number(d.priorValue ?? d.priorNgn) || 0);
      if (prior < absFloor) return false;
      const delta = Math.round(Number(d.delta ?? d.deltaNgn) || 0);
      return d.deltaPct >= pctThreshold && delta >= absFloor;
    })
    .map((d) => {
      const label = String(d.label || d.category || 'Metric').trim() || 'Metric';
      const current = Math.round(Number(d.value ?? d.amountNgn) || 0);
      const delta = Math.round(Number(d.delta ?? d.deltaNgn) || 0);
      return {
        id: `${idPrefix}-${label}`.replace(/\s+/g, '-').toLowerCase(),
        kind: 'mom_spike',
        severity: d.deltaPct >= 50 ? 'high' : 'medium',
        title: `${label} up ${d.deltaPct}% vs prior period`,
        detail: `+${delta.toLocaleString('en-NG')} (now ${current.toLocaleString('en-NG')}).`,
        category: label,
        amountNgn: current,
        value: current,
        deltaPct: d.deltaPct,
      };
    });
}

/**
 * Build a single-metric MoM delta row for momSpikeSignals.
 * @param {string} label
 * @param {number} current
 * @param {number} prior
 */
export function singleMetricMomDelta(label, current, prior) {
  const amount = Math.round(Number(current) || 0);
  const priorN = Math.round(Number(prior) || 0);
  const delta = amount - priorN;
  const deltaPct = priorN > 0 ? Math.round((delta / priorN) * 1000) / 10 : amount > 0 ? 100 : 0;
  return {
    category: label,
    label,
    value: amount,
    amountNgn: amount,
    priorValue: priorN,
    priorNgn: priorN,
    delta,
    deltaNgn: delta,
    deltaPct,
  };
}
