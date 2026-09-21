import { ZAREWA_COMPANY_ACCOUNT_NAME } from '../Data/companyQuotation.js';
import { formatPersonName } from './formatPersonName.js';
import { escapeHtml, openPrintHtmlDocument } from './officeDeskPrint.js';
import {
  parseMdDiscountMetresLabel,
  parseUnproducedMetresLabel,
} from '../shared/lib/refundLineArithmetic.js';
import { refundCategoryDisplayLabel } from '../shared/refundConstants.js';
import { refundApprovedAmount, refundPublicStatusLabel } from './refundsStore.js';
import { refundCashierMoneyStory } from './refundCashierDetail.js';

/**
 * A5 landscape refund voucher — prints on the top half of A4 (cut A4 in two).
 * Detailed calculation math from previewSnapshot + payee account numbers.
 */

function parseJsonArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw == null || raw === '') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (raw == null || raw === '') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function resolvePreviewSnapshot(record) {
  return (
    parseJsonObject(record?.previewSnapshot) ||
    parseJsonObject(record?.preview_snapshot_json) ||
    parseJsonObject(record?.preview_snapshot) ||
    null
  );
}

function includedCalculationLines(record) {
  const raw = record?.calculationLines ?? record?.calculation_lines_json;
  const lines = parseJsonArray(raw);
  return lines.filter((l) => {
    if (l?.include === false) return false;
    const amt = Math.round(Number(l?.amountNgn ?? l?.amount_ngn ?? 0) || 0);
    const label = String(l?.label ?? '').trim();
    return amt > 0 && label;
  });
}

function reasonCategories(record) {
  const raw = record?.reasonCategory ?? record?.reason_category;
  return parseJsonArray(raw)
    .map((c) => refundCategoryDisplayLabel(String(c || '').trim()))
    .filter(Boolean);
}

function recipientKindLabel(kindRaw) {
  const k = String(kindRaw || '').trim().toLowerCase();
  if (k === 'associated_staff' || k === 'staff') return 'Staff';
  if (k === 'claiming_staff') return 'Claiming staff';
  if (k === 'customer') return 'Customer';
  return '';
}

function payoutAccountFromRow(row) {
  return row?.payoutAccount ?? row?.payout_account ?? null;
}

/**
 * Resolve payee name / bank / account from a split row or header refund fields.
 * Stored splits use payoutAccount.payeeAccountNo (not accountNo).
 */
function resolvePayeeBankFields(row, header = null) {
  const pa = payoutAccountFromRow(row);
  const name = formatPersonName(
    String(
      pa?.payeeName ??
        pa?.payee_name ??
        row?.payeeName ??
        row?.payee_name ??
        row?.recipientName ??
        header?.payeeName ??
        header?.payee_name ??
        ''
    ).trim()
  );
  const bank = String(
    pa?.payeeBankName ??
      pa?.payee_bank_name ??
      pa?.bankName ??
      row?.payeeBankName ??
      row?.payee_bank_name ??
      header?.payeeBankName ??
      header?.payee_bank_name ??
      ''
  ).trim();
  const acct = String(
    pa?.payeeAccountNo ??
      pa?.payee_account_no ??
      pa?.accountNo ??
      pa?.account_no ??
      row?.payeeAccountNo ??
      row?.payee_account_no ??
      header?.payeeAccountNo ??
      header?.payee_account_no ??
      ''
  ).trim();
  return { name, bank, acct };
}

function splitDeductionNgn(row) {
  return Math.round(
    Number(
      row?.companyDeductionNgn ??
        row?.company_deduction_ngn ??
        row?.companyCutNgn ??
        row?.company_cut_ngn ??
        0
    ) || 0
  );
}

function headerCompanyCutNgn(record) {
  return Math.round(
    Number(
      record?.companyCutNgn ??
        record?.company_cut_ngn ??
        record?.settlementSummary?.companyCutNgn ??
        0
    ) || 0
  );
}

function splitPayeeRows(record) {
  const header = {
    payeeName: record?.payeeName ?? record?.payee_name,
    payeeBankName: record?.payeeBankName ?? record?.payee_bank_name,
    payeeAccountNo: record?.payeeAccountNo ?? record?.payee_account_no,
  };
  const fromList = (list) =>
    (Array.isArray(list) ? list : [])
      .map((row) => {
        const { name, bank, acct } = resolvePayeeBankFields(row, header);
        const kind = recipientKindLabel(
          row?.recipientKind ?? row?.recipient_kind ?? payoutAccountFromRow(row)?.partyKind
        );
        const gross = Math.round(Number(row?.amountNgn ?? row?.amount_ngn ?? row?.grossNgn ?? 0) || 0);
        const cut = splitDeductionNgn(row);
        const uncleared = Math.round(
          Number(
            row?.unclearedReceiptHoldNgn ??
              row?.uncleared_receipt_hold_ngn ??
              row?.unclearedReceiptOffsetNgn ??
              0
          ) || 0
        );
        const held = Boolean(row?.payoutHeldForUnclearedReceipts) || uncleared > 0;
        const netStored = Number(row?.netPayoutNgn ?? row?.net_payout_ngn);
        const netRaw = Number.isFinite(netStored) ? Math.round(netStored) : NaN;
        // When hold zeros netPayoutNgn, do NOT fall back to gross−cut (that overstates till due).
        let net;
        if (Number.isFinite(netRaw)) {
          net = Math.max(0, netRaw);
        } else {
          net = Math.max(0, gross - cut);
        }
        const tillDue = held ? Math.max(0, net - Math.min(net, uncleared)) : net;
        const waived = Boolean(
          row?.companyCutWaived === true ||
            row?.company_cut_waived === true ||
            row?.waiveCompanyCut === true
        );
        const waiverNote = String(
          row?.companyCutWaiverNote ?? row?.company_cut_waiver_note ?? ''
        ).trim();
        return {
          name,
          bank,
          acct,
          kind,
          gross,
          net,
          tillDue,
          cut,
          uncleared,
          held,
          waived,
          waiverNote,
        };
      })
      .filter((r) => r.net > 0 || r.gross > 0 || r.tillDue > 0 || r.name || r.acct || r.cut > 0);

  if (Array.isArray(record?.splitDistributions) && record.splitDistributions.length) {
    return fromList(record.splitDistributions);
  }
  if (Array.isArray(record?.refundSplits) && record.refundSplits.length) {
    return fromList(record.refundSplits);
  }
  const fromJson = parseJsonArray(record?.split_distributions_json);
  if (fromJson.length) return fromList(fromJson);
  return [];
}

function defaultFormatNgn(n) {
  const v = Math.round(Number(n) || 0);
  return `₦${v.toLocaleString('en-NG')}`;
}

function formatMetres(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 100) / 100);
}

function formatPpm(n, formatNgn) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '';
  if (Math.abs(v - Math.round(v)) < 0.005) return `${formatNgn(Math.round(v))}/m`;
  return `₦${v.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/m`;
}

function kvRow(label, value) {
  if (value == null || value === '' || value === '—') return '';
  return `<div class="kv"><span class="k">${escapeHtml(label)}</span><span class="v">${escapeHtml(
    String(value)
  )}</span></div>`;
}

/**
 * Build structured calculation detail lines for one refund breakdown row.
 * @param {object} line
 * @param {object|null} snapshot
 * @param {(n: number) => string} formatNgn
 * @returns {string} HTML (inner)
 */
export function buildRefundLineCalculationDetailHtml(line, snapshot, formatNgn = defaultFormatNgn) {
  const cat = String(line?.category || '').trim();
  const label = String(line?.label || '').trim();
  const amt = Math.round(Number(line?.amountNgn ?? line?.amount_ngn ?? 0) || 0);
  const snap = snapshot && typeof snapshot === 'object' ? snapshot : null;
  const parts = [];

  if (cat === 'Overpayment' || /overpay/i.test(cat) || /overpay/i.test(label)) {
    const cash = Math.round(
      Number(snap?.quotationCashInNgn ?? snap?.paidOnQuoteNgn ?? snap?.receiptCashNgn ?? 0) || 0
    );
    const quoteTotal = Math.round(Number(snap?.quoteTotalNgn ?? 0) || 0);
    const excess = Math.round(
      Number(snap?.overpaymentExcessNgn ?? (cash > 0 && quoteTotal > 0 ? cash - quoteTotal : 0)) || 0
    );
    const residual = Math.round(Number(snap?.overpaymentResidualNgn ?? 0) || 0);
    if (cash > 0) parts.push(kvRow('Cash paid on quotation', formatNgn(cash)));
    if (quoteTotal > 0) parts.push(kvRow('Quotation total', formatNgn(quoteTotal)));
    if (cash > 0 && quoteTotal > 0) {
      parts.push(
        kvRow(
          'Balance (paid − quotation)',
          `${formatNgn(cash)} − ${formatNgn(quoteTotal)} = ${formatNgn(Math.max(0, cash - quoteTotal))}`
        )
      );
    } else if (excess > 0) {
      parts.push(kvRow('Overpayment balance', formatNgn(excess)));
    }
    if (residual > 0 && residual !== excess && residual !== amt) {
      parts.push(kvRow('Still refundable overpay', formatNgn(residual)));
    }
    parts.push(kvRow('This line', formatNgn(amt)));
  } else if (cat === 'Unproduced meterage' || /unproduced/i.test(label)) {
    const parsed = parseUnproducedMetresLabel(label);
    const quotedM = Number(snap?.quotedMeters);
    const producedM = Number(
      snap?.producedMetersForUnproduced ?? snap?.coilProducedMeters ?? snap?.actualMeters
    );
    const unproducedM =
      parsed?.metres ??
      (Number.isFinite(quotedM) && Number.isFinite(producedM) ? Math.max(0, quotedM - producedM) : NaN);
    const ppm =
      parsed?.pricePerMeterNgn ??
      Number(snap?.pricePerMeterNgn) ??
      (Number.isFinite(unproducedM) && unproducedM > 0 ? amt / unproducedM : NaN);

    if (Number.isFinite(quotedM) && quotedM > 0) parts.push(kvRow('Quoted metres', `${formatMetres(quotedM)} m`));
    if (Number.isFinite(producedM) && producedM >= 0) {
      parts.push(kvRow('Produced metres', `${formatMetres(producedM)} m`));
    }
    if (Number.isFinite(unproducedM) && unproducedM > 0) {
      parts.push(kvRow('Unproduced metres', `${formatMetres(unproducedM)} m`));
    }
    if (Number.isFinite(ppm) && ppm > 0) {
      parts.push(kvRow('Price charged / m', formatPpm(ppm, formatNgn)));
      if (Number.isFinite(unproducedM) && unproducedM > 0) {
        parts.push(
          kvRow(
            'Calculation',
            `${formatMetres(unproducedM)} m × ${formatPpm(ppm, formatNgn)} = ${formatNgn(amt)}`
          )
        );
      }
    } else {
      parts.push(`<div class="detail-fallback">${escapeHtml(label)}</div>`);
      parts.push(kvRow('This line', formatNgn(amt)));
    }
  } else if (cat === 'Substitution Difference' || /substitution/i.test(label)) {
    const rows = Array.isArray(snap?.substitutionPerMeterBreakdown)
      ? snap.substitutionPerMeterBreakdown
      : [];
    if (rows.length) {
      for (const row of rows.slice(0, 4)) {
        const metres = Number(row?.meters);
        const quotedPpm = Number(
          row?.quotedPricePerMeterNgn ?? row?.quotedListPricePerMeterNgn ?? row?.quotedSellingPpmNgn
        );
        const floorPpm = Number(
          row?.quotedFloorPricePerMeterNgn ??
            row?.producedListPricePerMeterNgn ??
            row?.coilFloorPpmNgn
        );
        const delta = Number(
          row?.deltaPerMeterNgn ??
            (Number.isFinite(quotedPpm) && Number.isFinite(floorPpm) ? quotedPpm - floorPpm : NaN)
        );
        const credit = Math.round(Number(row?.creditNgn ?? 0) || 0);
        const product = String(row?.productName || row?.jobId || 'Product').trim();
        const gaugeBits = [row?.quotedGaugeDesignLabel, row?.quotedGaugeForComparison, row?.coilGaugeFromAllocations]
          .map((x) => String(x || '').trim())
          .filter(Boolean);
        parts.push(`<div class="sub-head">${escapeHtml(product)}</div>`);
        if (gaugeBits.length) parts.push(kvRow('Gauge / design', gaugeBits.join(' → ')));
        if (Number.isFinite(quotedPpm) && quotedPpm > 0) {
          parts.push(kvRow('Paid / quoted ₦ per m', formatPpm(quotedPpm, formatNgn)));
        }
        if (Number.isFinite(floorPpm) && floorPpm > 0) {
          parts.push(kvRow('Floor price ₦ per m', formatPpm(floorPpm, formatNgn)));
        }
        if (Number.isFinite(delta)) {
          parts.push(kvRow('Difference per m', formatPpm(Math.abs(delta), formatNgn)));
        }
        if (Number.isFinite(metres) && metres > 0 && Number.isFinite(delta)) {
          parts.push(
            kvRow(
              'Calculation',
              `${formatMetres(metres)} m × ${formatPpm(Math.abs(delta), formatNgn)} = ${formatNgn(
                credit > 0 ? credit : Math.round(metres * Math.abs(delta))
              )}`
            )
          );
        } else if (credit > 0) {
          parts.push(kvRow('Credit', formatNgn(credit)));
        }
      }
      if (rows.length > 4) {
        parts.push(`<div class="tiny muted">+${rows.length - 4} more substitution row(s)</div>`);
      }
    } else {
      parts.push(`<div class="detail-fallback">${escapeHtml(label)}</div>`);
      parts.push(kvRow('This line', formatNgn(amt)));
    }
  } else if (
    cat === 'MD discount' ||
    /md\s*discount/i.test(cat) ||
    /md\s*discount/i.test(label) ||
    cat === 'Customer commission' ||
    /commission/i.test(cat) ||
    /commission/i.test(label)
  ) {
    const parsed =
      parseMdDiscountMetresLabel(label) ||
      (() => {
        const m = label.match(
          /(?:commission|agent commission)[^(]*\(([\d.]+)\s*m\s*@\s*₦\s*([\d,]+(?:\.\d+)?)\s*(?:\/\s*m)?\)/i
        );
        if (!m) return null;
        const metres = Number(m[1]);
        const pricePerMeterNgn = Number(String(m[2]).replace(/,/g, ''));
        if (!Number.isFinite(metres) || metres <= 0 || !(pricePerMeterNgn > 0)) return null;
        return { metres, pricePerMeterNgn };
      })();
    const metres =
      parsed?.metres ??
      Number(line?.mdDiscountMetres) ??
      Number(snap?.quotedMeters);
    const ppm =
      parsed?.pricePerMeterNgn ??
      Number(line?.mdDiscountNgnPerM) ??
      (Number.isFinite(metres) && metres > 0 ? amt / metres : NaN);
    const kindLabel = /commission/i.test(cat) || /commission/i.test(label) ? 'Commission' : 'MD discount';
    if (Number.isFinite(metres) && metres > 0) parts.push(kvRow('Quoted metres', `${formatMetres(metres)} m`));
    if (Number.isFinite(ppm) && ppm > 0) {
      parts.push(kvRow(`${kindLabel} ₦ per m`, formatPpm(ppm, formatNgn)));
      if (Number.isFinite(metres) && metres > 0) {
        parts.push(
          kvRow(
            'Calculation',
            `${formatMetres(metres)} m × ${formatPpm(ppm, formatNgn)} = ${formatNgn(amt)}`
          )
        );
      }
    } else {
      parts.push(`<div class="detail-fallback">${escapeHtml(label)}</div>`);
      parts.push(kvRow('This line', formatNgn(amt)));
    }
  } else if (cat === 'Order cancellation' || /order cancel/i.test(label)) {
    const cash = Math.round(Number(snap?.quotationCashInNgn ?? snap?.paidOnQuoteNgn ?? 0) || 0);
    const floor = snap?.economicFloor;
    const floorVal = Math.round(Number(floor?.floorDeliveredValueNgn ?? 0) || 0);
    const producedM = Number(floor?.producedOutputMeters ?? snap?.coilProducedMeters);
    if (cash > 0) parts.push(kvRow('Cash paid on quotation', formatNgn(cash)));
    if (Number.isFinite(producedM) && producedM > 0) {
      parts.push(kvRow('Produced (kept)', `${formatMetres(producedM)} m`));
    }
    if (floorVal > 0) parts.push(kvRow('Floor value of produced', formatNgn(floorVal)));
    parts.push(`<div class="detail-fallback">${escapeHtml(label)}</div>`);
    parts.push(kvRow('This line', formatNgn(amt)));
  } else if (/accessory|stone|shortfall/i.test(cat) || /shortfall/i.test(label)) {
    parts.push(`<div class="detail-fallback">${escapeHtml(label)}</div>`);
    const m = label.match(/\((\d+(?:\.\d+)?)\s*[×x]\s*₦([\d,]+(?:\.\d+)?)\)/i);
    if (m) {
      parts.push(
        kvRow(
          'Calculation',
          `${m[1]} × ${formatNgn(Number(String(m[2]).replace(/,/g, '')))} = ${formatNgn(amt)}`
        )
      );
    } else {
      parts.push(kvRow('This line', formatNgn(amt)));
    }
  } else {
    parts.push(`<div class="detail-fallback">${escapeHtml(label)}</div>`);
    parts.push(kvRow('This line', formatNgn(amt)));
  }

  return parts.filter(Boolean).join('');
}

/** Local wall-clock for print. */
export function formatRefundPrintDateTime(isoOrDate) {
  const raw = String(isoOrDate || '').trim();
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return raw.length >= 16 ? raw.slice(0, 16).replace('T', ' ') : raw;
  }
  try {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
}

function formatRefundPrintDate(isoOrDate) {
  const raw = String(isoOrDate || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      try {
        return new Intl.DateTimeFormat('en-GB', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
        }).format(d);
      } catch {
        return raw;
      }
    }
  }
  return formatRefundPrintDateTime(raw);
}

/**
 * Pick tighter CSS density from how much content the voucher must carry.
 * Runtime fitSheet still scales further if needed.
 */
function densityClass({ lineCount = 0, hasSubs = false, splitCount = 0, noteLen = 0 } = {}) {
  const weight =
    Number(lineCount) +
    (hasSubs ? 2 : 0) +
    Math.max(0, Number(splitCount) - 1) +
    (noteLen > 180 ? 2 : noteLen > 80 ? 1 : 0);
  if (weight >= 10) return 'density-ultra';
  if (weight >= 7) return 'density-packed';
  if (weight >= 4) return 'density-tight';
  return 'density-normal';
}

/**
 * Build printable HTML for a refund voucher (A5 landscape on A4 top half).
 * @param {object} record
 * @param {(n: number) => string} [formatNgn]
 * @returns {string}
 */
export function buildRefundRecordPrintHtml(record, formatNgn = defaultFormatNgn) {
  if (!record) return '';

  const refundID = String(record.refundID || record.refund_id || '—');
  const statusLabel = refundPublicStatusLabel(record) || String(record.status || '—');
  const customerName = formatPersonName(
    record.customerName || record.customer || record.customer_name || '—'
  );
  const quotationRef = String(record.quotationRef || record.quotation_ref || '—').trim() || '—';
  const requestedAt = formatRefundPrintDateTime(
    record.requestedAtISO || record.requested_at_iso || ''
  );
  const requestedBy = formatPersonName(String(record.requestedBy || record.requested_by || '').trim());
  const reasonText = String(record.reasonNotes || record.reason || '').trim();
  const calcNotes = String(record.calculationNotes || record.calculation_notes || '').trim();
  const amountReq = Math.round(Number(record.amountNgn ?? record.amount_ngn ?? 0) || 0);
  const approvedAmt = refundApprovedAmount(record);
  const approvalDate = formatRefundPrintDate(record.approvalDate || record.approval_date || '');
  const approvedBy = formatPersonName(String(record.approvedBy || record.approved_by || '').trim());
  const managerComments = String(record.managerComments || record.manager_comments || '').trim();
  const paidAt = formatRefundPrintDateTime(record.paidAtISO || record.paid_at_iso || '');
  const paidAmt = Math.round(Number(record.paidAmountNgn ?? record.paid_amount_ngn ?? 0) || 0);
  const paidBy = formatPersonName(String(record.paidBy || record.paid_by || '').trim());
  const creditApplied = Math.round(
    Number(record.creditAppliedNgn ?? record.credit_applied_ngn ?? 0) || 0
  );
  const creditTo = String(
    record.creditAppliedToQuotationRef || record.credit_applied_to_quotation_ref || ''
  ).trim();

  const headerPayeeName = formatPersonName(String(record.payeeName || record.payee_name || '').trim());
  const headerPayeeAccountNo = String(record.payeeAccountNo || record.payee_account_no || '').trim();
  const headerPayeeBankName = String(record.payeeBankName || record.payee_bank_name || '').trim();

  const snapshot = resolvePreviewSnapshot(record);
  const cats = reasonCategories(record);
  const lines = includedCalculationLines(record);
  const splits = splitPayeeRows(record);
  const hasSubs = lines.some((l) => String(l.category || '').includes('Substitution'));
  const headerCut = headerCompanyCutNgn(record);
  const splitCutsTotal = splits.reduce((s, r) => s + (r.cut || 0), 0);
  const totalDeduction = splitCutsTotal > 0 ? splitCutsTotal : headerCut;
  const heldTotal =
    Math.round(Number(record?.heldNetNgn ?? record?.settlementSummary?.heldUnclearedNgn ?? 0) || 0) ||
    splits.reduce((s, r) => s + (r.uncleared || 0), 0);
  const anyWaived = splits.some((s) => s.waived);
  const waiverNote =
    String(record?.companyCutWaiverNote ?? record?.company_cut_waiver_note ?? '').trim() ||
    splits.map((s) => s.waiverNote).find(Boolean) ||
    '';

  // Match Finance desk: prefer settlementSummary.tillPayableNgn via cashier money story.
  let story = null;
  try {
    story = refundCashierMoneyStory(record);
  } catch {
    story = null;
  }
  const storyTill =
    story?.tillPayableNgn != null ? Math.max(0, Math.round(Number(story.tillPayableNgn) || 0)) : null;
  const storyCashDue =
    story?.cashDueNgn != null ? Math.max(0, Math.round(Number(story.cashDueNgn) || 0)) : null;
  const splitTillTotal = splits.reduce((s, r) => s + (r.tillDue ?? r.net ?? 0), 0);

  const displayPay =
    storyTill != null
      ? storyTill
      : storyCashDue != null
        ? storyCashDue
        : splits.length > 0
          ? splitTillTotal
          : Math.max(0, (approvedAmt > 0 ? approvedAmt : amountReq) - creditApplied - totalDeduction);

  const badgeLabel =
    displayPay <= 0 && (creditApplied > 0 || paidAmt > 0 || heldTotal > 0)
      ? heldTotal > 0 && displayPay <= 0
        ? 'Held / not till-ready'
        : 'Till due now'
      : 'Till due now';
  const companyLegal = ZAREWA_COMPANY_ACCOUNT_NAME;
  const dens = densityClass({
    lineCount: lines.length,
    hasSubs,
    splitCount: splits.length,
    noteLen: reasonText.length + calcNotes.length + managerComments.length,
  });

  const rowsHtml = lines.length
    ? lines
        .map((l) => {
          const cat = refundCategoryDisplayLabel(String(l.category || '').trim()) || '—';
          const amt = Math.round(Number(l.amountNgn ?? l.amount_ngn ?? 0) || 0);
          const detail = buildRefundLineCalculationDetailHtml(l, snapshot, formatNgn);
          return `<tr>
            <td class="cat">${escapeHtml(cat)}</td>
            <td class="how">${detail}</td>
            <td class="right amt-cell">${escapeHtml(formatNgn(amt))}</td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="3" class="muted">No calculation lines stored.</td></tr>`;

  const lineSum = lines.reduce(
    (s, l) => s + Math.round(Number(l.amountNgn ?? l.amount_ngn ?? 0) || 0),
    0
  );
  const showLineSum = lines.length > 0 && Math.abs(lineSum - amountReq) > 1;

  let payeeBlock = '';
  if (splits.length > 0) {
    const splitRows = splits
      .map((s) => {
        const who = [s.kind, s.name].filter(Boolean).join(' · ') || '—';
        const acct = s.acct || (splits.length === 1 ? headerPayeeAccountNo : '');
        const bank = s.bank || (splits.length === 1 ? headerPayeeBankName : '');
        const cutBits = [];
        if (s.gross > 0 && s.cut > 0) {
          cutBits.push(`Gross ${formatNgn(s.gross)}`);
          cutBits.push(`Company deduction ${formatNgn(s.cut)}`);
        } else if (s.cut > 0) {
          cutBits.push(`Company deduction ${formatNgn(s.cut)}`);
        }
        if (s.waived) {
          cutBits.push(s.waiverNote ? `Cut waived — ${s.waiverNote}` : 'Company cut waived');
        }
        if (s.uncleared > 0) {
          cutBits.push(`Uncleared hold ${formatNgn(s.uncleared)}`);
        }
        const cutNote = cutBits.length
          ? `<div class="tiny">${escapeHtml(cutBits.join(' · '))}</div>`
          : '';
        const showAmt = s.tillDue != null ? s.tillDue : s.net;
        return `<tr>
          <td>
            <div class="pay-name">${escapeHtml(who)}</div>
            ${bank ? `<div class="tiny"><strong>Bank:</strong> ${escapeHtml(bank)}</div>` : ''}
            <div class="acct-num">${
              acct
                ? `Account number: <strong>${escapeHtml(acct)}</strong>`
                : '<span class="muted">Account number: not on file</span>'
            }</div>
            ${cutNote}
          </td>
          <td class="right">${escapeHtml(formatNgn(showAmt))}</td>
        </tr>`;
      })
      .join('');
    payeeBlock = `
      <h2>Pay to (requested / paid)</h2>
      <table class="payees">
        <thead><tr><th>Recipient, bank &amp; account</th><th class="right">Till due</th></tr></thead>
        <tbody>${splitRows}</tbody>
      </table>`;
  } else {
    payeeBlock = `
      <h2>Pay to (requested / paid)</h2>
      <div class="pay-single">
        <div class="pay-name">${escapeHtml(headerPayeeName || 'Payee to be confirmed')}</div>
        ${
          headerPayeeBankName
            ? `<div><strong>Bank:</strong> ${escapeHtml(headerPayeeBankName)}</div>`
            : ''
        }
        <div class="acct-num">${
          headerPayeeAccountNo
            ? `Account number: <strong>${escapeHtml(headerPayeeAccountNo)}</strong>`
            : '<span class="muted">Account number: not on file</span>'
        }</div>
        ${
          totalDeduction > 0
            ? `<div class="tiny">Gross ${escapeHtml(formatNgn(approvedAmt > 0 ? approvedAmt : amountReq))} · Company deduction ${escapeHtml(
                formatNgn(totalDeduction)
              )} · Net ${escapeHtml(formatNgn(displayPay))}</div>`
            : ''
        }
        ${
          anyWaived || waiverNote
            ? `<div class="tiny">${escapeHtml(
                waiverNote ? `Company cut waived — ${waiverNote}` : 'Company cut waived'
              )}</div>`
            : ''
        }
      </div>`;
  }

  const catsJoined = cats.join(' · ');
  const notesDuplicateCats =
    reasonText &&
    cats.length > 0 &&
    reasonText.replace(/\s+/g, ' ').toLowerCase() ===
      cats
        .map((c) => c.toLowerCase())
        .join(', ')
        .replace(/\s+/g, ' ');

  const payeeSigName =
    splits.length === 1
      ? splits[0].name
      : splits.length > 1
        ? 'Multiple — see Pay to'
        : headerPayeeName || '';

  const printedAt = formatRefundPrintDateTime(new Date().toISOString());

  const totalsHtml = `
      <div class="totals">
        ${
          showLineSum
            ? `<div>Lines total</div><div class="amt">${escapeHtml(formatNgn(lineSum))}</div>`
            : ''
        }
        <div>Amount requested</div><div class="amt">${escapeHtml(formatNgn(amountReq))}</div>
        ${
          approvedAmt > 0 || approvalDate || approvedBy
            ? `<div>Approved${approvalDate ? ` (${escapeHtml(approvalDate)})` : ''}${
                approvedBy ? ` · ${escapeHtml(approvedBy)}` : ''
              }</div><div class="amt">${escapeHtml(formatNgn(approvedAmt))}</div>`
            : ''
        }
        ${
          totalDeduction > 0
            ? `<div>Company deduction (retained)</div><div class="amt">−${escapeHtml(
                formatNgn(totalDeduction)
              )}</div>`
            : ''
        }
        ${
          anyWaived || waiverNote
            ? `<div>Company cut waived</div><div class="amt">${escapeHtml(
                waiverNote ? waiverNote.slice(0, 40) : 'Yes'
              )}</div>`
            : ''
        }
        ${
          heldTotal > 0
            ? `<div>Held (uncleared receipts)</div><div class="amt">−${escapeHtml(
                formatNgn(heldTotal)
              )}</div>`
            : ''
        }
        ${
          creditApplied > 0
            ? `<div>Applied as credit${creditTo ? ` → ${escapeHtml(creditTo)}` : ''}</div><div class="amt">−${escapeHtml(
                formatNgn(creditApplied)
              )}</div>`
            : ''
        }
        ${
          paidAt
            ? `<div>Paid${paidBy ? ` · ${escapeHtml(paidBy)}` : ''}${
                paidAt ? ` · ${escapeHtml(paidAt)}` : ''
              }</div><div class="amt">${escapeHtml(formatNgn(paidAmt))}</div>`
            : ''
        }
        <div class="pay-row">Till due now</div><div class="amt pay-row">${escapeHtml(
          formatNgn(displayPay)
        )}</div>
      </div>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<title>Refund ${escapeHtml(refundID)}</title>
<style>
  /* A4 tray: voucher is A5 landscape (top half). Cut on the dashed line. */
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    color: #000;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    font-size: 10.5pt;
    font-weight: 700;
    line-height: 1.22;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .a4-host {
    width: 210mm;
    height: 297mm;
    margin: 0 auto;
    overflow: hidden;
    page-break-after: avoid;
  }
  .sheet {
    width: 210mm;
    height: 148.5mm;
    max-height: 148.5mm;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
    position: relative;
  }
  /* Inner fit box grows naturally; JS scales it into the fixed A5 sheet. */
  .sheet-fit {
    width: 100%;
    padding: 3mm 4.5mm 2mm;
    display: flex;
    flex-direction: column;
    transform-origin: top left;
  }
  .sheet.density-tight .sheet-fit { font-size: 9.5pt; line-height: 1.16; padding: 2.4mm 4mm 1.6mm; }
  .sheet.density-packed .sheet-fit { font-size: 8.5pt; line-height: 1.12; padding: 2mm 3.5mm 1.4mm; }
  .sheet.density-ultra .sheet-fit { font-size: 7.5pt; line-height: 1.08; padding: 1.6mm 3mm 1.2mm; }
  .sheet.density-tight .sig,
  .sheet.density-packed .sig,
  .sheet.density-ultra .sig { min-height: 9mm; padding: 0.8mm; }
  .sheet.density-packed h1,
  .sheet.density-ultra h1 { font-size: 12pt; }
  .sheet.density-packed .badge-amt,
  .sheet.density-ultra .badge-amt { font-size: 12pt; }
  .sheet.density-ultra th, .sheet.density-ultra td { padding: 0.35mm 0.8mm; }
  .sheet.density-ultra .meta { font-size: 8pt; gap: 0.2mm 1.5mm; }
  .sheet.density-ultra .sigs { gap: 1.2mm; margin-top: 0.6mm; }
  .sheet.density-ultra .sig-name { font-size: 8pt; }
  .sheet.density-ultra .tiny { font-size: 6.5pt; }
  .sheet.density-packed .main-cols,
  .sheet.density-ultra .main-cols { gap: 2mm; }
  .sheet.density-packed h2,
  .sheet.density-ultra h2 { margin-bottom: 0.3mm; font-size: 8pt; }
  .cut-guide {
    height: 0;
    border-top: 1.5px dashed #334155;
    position: relative;
    margin: 0 8mm;
  }
  .cut-guide::after {
    content: "✂ Cut here — half A4 = A5 landscape";
    position: absolute;
    top: -2.6mm;
    right: 0;
    font-size: 8pt;
    font-weight: 800;
    color: #000;
    background: #fff;
    padding: 0 1.5mm;
  }
  .a4-spare {
    height: 148.5mm;
  }
  header {
    border-bottom: 2.5px solid #000;
    padding-bottom: 1mm;
    margin-bottom: 1mm;
    flex-shrink: 0;
  }
  .brand-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 3mm;
  }
  .brand {
    font-size: 9pt;
    font-weight: 900;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #000;
  }
  .legal {
    margin-top: 0.2mm;
    font-size: 8pt;
    font-weight: 700;
    color: #000;
  }
  .badge {
    flex-shrink: 0;
    text-align: right;
    border: 2.5px solid #000;
    border-radius: 0.8mm;
    padding: 1.4mm 2.4mm;
    background: #f1f5f9;
  }
  .badge .badge-label {
    font-size: 8pt;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #000;
  }
  .badge .badge-amt {
    margin-top: 0.2mm;
    font-size: 16pt;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    color: #000;
  }
  h1 {
    margin: 0.4mm 0 0;
    font-size: 15pt;
    font-weight: 900;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: #000;
  }
  .meta {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.4mm 2.5mm;
    margin-top: 1mm;
    font-size: 9.5pt;
  }
  .meta strong { font-weight: 900; color: #000; }
  .meta .label {
    color: #000;
    font-weight: 900;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  h2 {
    margin: 0 0 0.6mm;
    font-size: 9.5pt;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #000;
    border-bottom: 2px solid #000;
    padding-bottom: 0.3mm;
  }
  .main-cols {
    display: grid;
    grid-template-columns: 1.55fr 1fr;
    gap: 3mm;
    flex: 1 1 auto;
    min-height: 0;
  }
  .col-calc, .col-side {
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: inherit;
  }
  th, td {
    border: 1.5px solid #000;
    padding: 0.8mm 1.3mm;
    vertical-align: top;
    text-align: left;
  }
  th {
    background: #e2e8f0;
    font-weight: 900;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #000;
  }
  .right { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .amt-cell { font-weight: 900; width: 16%; color: #000; font-size: 1.05em; }
  .cat { width: 18%; font-weight: 900; color: #000; }
  .how { width: 66%; word-break: break-word; font-weight: 700; color: #000; }
  .kv {
    display: grid;
    grid-template-columns: 40% 1fr;
    gap: 0.2mm 1.2mm;
    margin: 0.15mm 0;
  }
  .kv .k { color: #000; font-weight: 800; }
  .kv .v { font-variant-numeric: tabular-nums; font-weight: 900; color: #000; }
  .sub-head { font-weight: 900; margin-top: 0.4mm; color: #000; font-size: 1.05em; }
  .detail-fallback { margin-bottom: 0.3mm; font-weight: 800; color: #000; }
  .muted { color: #000; font-weight: 800; }
  .tiny { font-size: 8pt; margin-top: 0.15mm; line-height: 1.12; font-weight: 800; color: #000; }
  .block { margin: 0.5mm 0; font-size: inherit; font-weight: 800; color: #000; }
  .block strong { font-weight: 900; }
  .totals {
    margin: 1mm 0;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.3mm 2.5mm;
    font-size: 1.05em;
    font-weight: 800;
    color: #000;
  }
  .totals .amt { font-variant-numeric: tabular-nums; font-weight: 900; text-align: right; color: #000; }
  .totals .pay-row {
    font-size: 1.25em;
    font-weight: 900;
    border-top: 2.5px solid #000;
    padding-top: 0.5mm;
    margin-top: 0.3mm;
    color: #000;
  }
  .pay-single { font-size: inherit; line-height: 1.22; color: #000; }
  .pay-name { font-weight: 900; font-size: 1.2em; color: #000; }
  .acct-num {
    margin-top: 0.4mm;
    font-size: 1.2em;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    color: #000;
  }
  .acct-num strong { font-size: 1.25em; font-weight: 900; color: #000; }
  .sigs {
    margin-top: 1mm;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 2mm;
    flex-shrink: 0;
  }
  .sig {
    border: 2.5px solid #000;
    border-radius: 0.8mm;
    padding: 1.2mm;
    min-height: 13mm;
    display: flex;
    flex-direction: column;
  }
  .sig-title {
    font-size: 8pt;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #000;
  }
  .sig-name {
    margin-top: 0.3mm;
    font-size: 9.5pt;
    font-weight: 900;
    min-height: 8pt;
    word-break: break-word;
    color: #000;
  }
  .sig-line {
    margin-top: auto;
    border-top: 2px solid #000;
    padding-top: 0.4mm;
    font-size: 7.5pt;
    font-weight: 800;
    color: #000;
  }
  .foot {
    margin-top: 0.6mm;
    font-size: 7.5pt;
    font-weight: 800;
    color: #000;
    text-align: center;
    flex-shrink: 0;
  }
  @media print {
    html, body {
      width: 210mm;
      height: 297mm;
      overflow: hidden;
    }
    .a4-host { overflow: hidden; }
    .sheet { overflow: hidden; }
  }
  @media screen {
    body { background: #e2e8f0; padding: 8mm; }
    .a4-host {
      background: #fff;
      box-shadow: 0 2px 12px rgba(15, 23, 42, 0.12);
      height: auto;
      min-height: 297mm;
    }
    .sheet { background: #fff; }
    .a4-spare {
      background: repeating-linear-gradient(
        -45deg,
        #f8fafc,
        #f8fafc 6px,
        #f1f5f9 6px,
        #f1f5f9 12px
      );
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 8pt;
    }
    .a4-spare::before { content: "Blank half (discard or second slip)"; }
  }
</style></head><body>
  <div class="a4-host">
    <div class="sheet ${dens}" id="refund-a5-sheet">
      <div class="sheet-fit" id="refund-a5-fit">
      <header>
        <div class="brand-row">
          <div>
            <div class="brand">Customer refund voucher · A5 landscape</div>
            <div class="legal">${escapeHtml(companyLegal)}</div>
            <h1>Refund details</h1>
          </div>
          <div class="badge">
            <div class="badge-label">${escapeHtml(badgeLabel)}</div>
            <div class="badge-amt">${escapeHtml(formatNgn(displayPay))}</div>
          </div>
        </div>
        <div class="meta">
          <div><span class="label">Refund ID</span><br/><strong>${escapeHtml(refundID)}</strong></div>
          <div><span class="label">Status</span><br/><strong>${escapeHtml(statusLabel)}</strong></div>
          <div><span class="label">Customer</span><br/><strong>${escapeHtml(customerName)}</strong></div>
          <div><span class="label">Quotation</span><br/><strong>${escapeHtml(quotationRef)}</strong></div>
          <div><span class="label">Requested</span><br/><strong>${escapeHtml(requestedAt || '—')}</strong>${
            requestedBy ? `<br/><span class="tiny">${escapeHtml(requestedBy)}</span>` : ''
          }</div>
          <div><span class="label">Printed</span><br/><strong>${escapeHtml(printedAt)}</strong></div>
        </div>
      </header>

      <div class="main-cols">
        <div class="col-calc">
          ${
            cats.length
              ? `<div class="block"><strong>Refund types</strong> — ${escapeHtml(catsJoined)}</div>`
              : ''
          }
          ${
            reasonText && !notesDuplicateCats
              ? `<div class="block"><strong>Notes</strong> — ${escapeHtml(reasonText)}</div>`
              : ''
          }
          <h2>How it was calculated</h2>
          <table>
            <thead>
              <tr><th>Type</th><th>Calculation detail</th><th class="right">Amount</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          ${
            calcNotes
              ? `<div class="block muted"><strong>Notes</strong> — ${escapeHtml(calcNotes)}</div>`
              : ''
          }
          ${
            managerComments
              ? `<div class="block"><strong>Approver note</strong> — ${escapeHtml(managerComments)}</div>`
              : ''
          }
        </div>
        <div class="col-side">
          <h2>Amounts</h2>
          ${totalsHtml}
          ${payeeBlock}
        </div>
      </div>

      <div class="sigs">
        <div class="sig">
          <div class="sig-title">Applicant</div>
          <div class="sig-name">${escapeHtml(requestedBy || ' ')}</div>
          <div class="sig-line">Signature / date</div>
        </div>
        <div class="sig">
          <div class="sig-title">Approver</div>
          <div class="sig-name">${escapeHtml(approvedBy || ' ')}</div>
          <div class="sig-line">Signature / date</div>
        </div>
        <div class="sig">
          <div class="sig-title">Payee (received)</div>
          <div class="sig-name">${escapeHtml(payeeSigName || ' ')}</div>
          <div class="sig-line">Signature / date</div>
        </div>
      </div>
      <div class="foot">A5 landscape on A4 · Cut on dashed line · File behind cutting list</div>
      </div>
    </div>
    <div class="cut-guide" aria-hidden="true"></div>
    <div class="a4-spare" aria-hidden="true"></div>
  </div>
  <script>
    (function () {
      function fitSheet() {
        var sheet = document.getElementById('refund-a5-sheet');
        var fit = document.getElementById('refund-a5-fit');
        if (!sheet || !fit) return;
        fit.style.transform = '';
        fit.style.width = '100%';
        // Natural height of full voucher content (outer sheet clips; measure the inner fit box).
        var maxH = sheet.clientHeight || 0;
        var need = Math.max(fit.scrollHeight || 0, fit.offsetHeight || 0);
        if (!maxH || need <= maxH + 1) return;
        // Scale down to fit A5; widen first so after scale the content still fills sheet width.
        var scale = Math.max(0.5, Math.min(1, maxH / need));
        fit.style.width = (100 / scale).toFixed(4) + '%';
        fit.style.transform = 'scale(' + scale.toFixed(4) + ')';
      }
      fitSheet();
      window.addEventListener('beforeprint', fitSheet);
      window.addEventListener('resize', fitSheet);
      setTimeout(fitSheet, 50);
      setTimeout(fitSheet, 200);
    })();
  </script>
</body></html>`;
}

/**
 * Print-friendly refund voucher (A5 landscape on A4, single half-page).
 * @param {object} record
 * @param {(n: number) => string} [formatNgn]
 * @returns {boolean}
 */
export function printRefundRecord(record, formatNgn) {
  if (!record) return false;
  try {
    const html = buildRefundRecordPrintHtml(record, formatNgn || defaultFormatNgn);
    if (!html) return false;
    const refundID = String(record.refundID || record.refund_id || 'Refund');
    return openPrintHtmlDocument(html, `Refund ${refundID}`, { page: 'A4' });
  } catch {
    return false;
  }
}
