const DEFAULT_EXPECTED_MS = 20_000;

/** Ease toward `cap` so the bar never falsely completes before the real load finishes. */
export function bootProgressPct(elapsedMs, expectedMs = DEFAULT_EXPECTED_MS, cap = 92) {
  const expected = Math.max(8_000, Number(expectedMs) || DEFAULT_EXPECTED_MS);
  const t = Math.max(0, Number(elapsedMs) || 0) / expected;
  // 1 - e^(-2.2t) reaches ~89% at t=1 and asymptotes under the cap.
  const raw = (1 - Math.exp(-2.2 * t)) * 100;
  return Math.min(cap, Math.round(raw));
}

export { DEFAULT_EXPECTED_MS };
