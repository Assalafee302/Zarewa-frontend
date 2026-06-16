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

export function sumRefundCalculationLines(lines) {
  return (lines || []).reduce((s, l) => {
    if (l?.include === false) return s;
    const n = Number(String(l?.amountNgn ?? l?.amount_ngn ?? '').replace(/,/g, ''));
    return s + (Number.isNaN(n) ? 0 : n);
  }, 0);
}

/**
 * When an approver sets a lower approved amount but lines still sum to the original request,
 * scale included line amounts proportionally so the API line-sum check passes.
 */
export function scaleRefundCalculationLinesToApprovedAmount(lines, targetNgn) {
  const target = roundRefundLineMoney(targetNgn);
  if (!Array.isArray(lines) || target <= 0) return lines;
  const includedIndices = [];
  let sum = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i]?.include === false) continue;
    const n = Number(String(lines[i]?.amountNgn ?? lines[i]?.amount_ngn ?? '').replace(/,/g, ''));
    if (!Number.isNaN(n) && n > 0) {
      includedIndices.push(i);
      sum += roundRefundLineMoney(n);
    }
  }
  if (includedIndices.length === 0 || sum <= 0) return lines;
  if (Math.abs(sum - target) <= AMOUNT_LINE_TOL) return lines;

  const scale = target / sum;
  const next = lines.map((l) => ({ ...l }));
  let allocated = 0;
  for (let j = 0; j < includedIndices.length; j += 1) {
    const i = includedIndices[j];
    const raw = Number(String(lines[i]?.amountNgn ?? lines[i]?.amount_ngn ?? '').replace(/,/g, ''));
    const isLast = j === includedIndices.length - 1;
    const amt = isLast ? target - allocated : roundRefundLineMoney(raw * scale);
    next[i] = { ...next[i], amountNgn: amt };
    allocated += amt;
  }
  return next;
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
