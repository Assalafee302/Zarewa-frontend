/**
 * Mirror of Zarewa-backend-main/shared/lib/refundLineArithmetic.js — keep in sync.
 */

const AMOUNT_LINE_TOL = 1;

export function roundRefundLineMoney(value) {
  return Math.round(Number(value) || 0);
}

function parseNgnToken(raw) {
  return roundRefundLineMoney(String(raw || '').replace(/,/g, ''));
}

export function parseUnproducedMetresLabel(label) {
  const text = String(label || '').trim();
  const m = text.match(/Unproduced metres\s*\(([\d.]+)\s*m\s*@\s*₦([\d,]+)\)/i);
  if (!m) return null;
  const metres = Number(m[1]);
  const pricePerMeterNgn = parseNgnToken(m[2]);
  if (!Number.isFinite(metres) || metres <= 0 || pricePerMeterNgn <= 0) return null;
  return { metres, pricePerMeterNgn };
}

export function expectedAmountFromRefundLineLabel(label, category) {
  const cat = String(category || '').trim();
  const text = String(label || '').trim();
  if (cat === 'Unproduced meterage' || /unproduced metres/i.test(text)) {
    const parsed = parseUnproducedMetresLabel(text);
    if (parsed) {
      return roundRefundLineMoney(parsed.metres * parsed.pricePerMeterNgn);
    }
  }
  return null;
}

export function auditRefundCalculationLineArithmetic(lines, toleranceNgn = AMOUNT_LINE_TOL) {
  const tol = Math.max(0, roundRefundLineMoney(toleranceNgn));
  const issues = [];
  for (let i = 0; i < (lines || []).length; i += 1) {
    const line = lines[i];
    if (line?.include === false) continue;
    const amt = roundRefundLineMoney(line?.amountNgn ?? line?.amount_ngn);
    if (amt <= 0) continue;
    const expected = expectedAmountFromRefundLineLabel(line?.label, line?.category);
    if (expected == null) continue;
    if (Math.abs(amt - expected) > tol) {
      const parsed = parseUnproducedMetresLabel(line?.label);
      issues.push({
        lineIndex: i,
        category: line?.category,
        label: String(line?.label || '').trim(),
        amountNgn: amt,
        expectedAmountNgn: expected,
        code: 'line_label_amount_mismatch',
        formulaText:
          parsed != null
            ? `${parsed.metres}m × ₦${parsed.pricePerMeterNgn.toLocaleString('en-NG')}`
            : undefined,
      });
    }
  }
  return issues;
}
