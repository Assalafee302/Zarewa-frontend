import { describe, expect, it } from 'vitest';
import {
  buildRefundLineCalculationDetailHtml,
  buildRefundRecordPrintHtml,
  formatRefundPrintDateTime,
} from './refundRecordPrint.js';

const formatNgn = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`;

describe('buildRefundLineCalculationDetailHtml', () => {
  it('shows overpayment as cash paid, quotation total, and balance', () => {
    const html = buildRefundLineCalculationDetailHtml(
      { category: 'Overpayment', label: 'Overpayment on QT-1', amountNgn: 40_000 },
      {
        quotationCashInNgn: 140_000,
        quoteTotalNgn: 100_000,
        overpaymentExcessNgn: 40_000,
      },
      formatNgn
    );
    expect(html).toContain('Cash paid on quotation');
    expect(html).toContain('₦140,000');
    expect(html).toContain('Quotation total');
    expect(html).toContain('₦100,000');
    expect(html).toContain('Balance (paid − quotation)');
  });

  it('shows unproduced metres × rate calculation', () => {
    const html = buildRefundLineCalculationDetailHtml(
      {
        category: 'Unproduced meterage',
        label: 'Unproduced metres (10m @ ₦5,000)',
        amountNgn: 50_000,
      },
      { quotedMeters: 25, producedMetersForUnproduced: 15, pricePerMeterNgn: 5000 },
      formatNgn
    );
    expect(html).toContain('Quoted metres');
    expect(html).toContain('Produced metres');
    expect(html).toContain('Unproduced metres');
    expect(html).toContain('Price charged / m');
    expect(html).toContain('10 m ×');
  });

  it('shows substitution quoted vs floor per-metre difference', () => {
    const html = buildRefundLineCalculationDetailHtml(
      {
        category: 'Substitution Difference',
        label: 'Substitution credit',
        amountNgn: 28_000,
      },
      {
        substitutionPerMeterBreakdown: [
          {
            productName: 'Longspan',
            meters: 10,
            quotedPricePerMeterNgn: 8500,
            quotedFloorPricePerMeterNgn: 5700,
            deltaPerMeterNgn: 2800,
            creditNgn: 28_000,
            quotedGaugeForComparison: '0.40',
            coilGaugeFromAllocations: '0.30',
          },
        ],
      },
      formatNgn
    );
    expect(html).toContain('Paid / quoted ₦ per m');
    expect(html).toContain('Floor price ₦ per m');
    expect(html).toContain('Difference per m');
    expect(html).toContain('10 m ×');
  });
});

describe('buildRefundRecordPrintHtml', () => {
  it('renders A5 single-page voucher with account number and calc detail', () => {
    const html = buildRefundRecordPrintHtml(
      {
        refundID: 'RF-KD-26-1001',
        status: 'Pending',
        customerName: 'Amina Bello',
        quotationRef: 'QT-26-500',
        requestedAtISO: '2026-09-18T10:00:00.000Z',
        requestedBy: 'Sales Desk',
        reasonCategory: ['Unproduced meterage', 'Overpayment'],
        reasonNotes: 'Short run + excess deposit',
        amountNgn: 85_000,
        calculationNotes: 'Unproduced at list rate',
        calculationLines: [
          {
            label: 'Unproduced metres (10m @ ₦5,000)',
            category: 'Unproduced meterage',
            amountNgn: 50_000,
          },
          {
            label: 'Overpayment on QT-26-500',
            category: 'Overpayment',
            amountNgn: 35_000,
          },
          {
            label: 'Excluded draft',
            category: 'Other',
            amountNgn: 9_999,
            include: false,
          },
        ],
        payeeName: 'Amina Bello',
        payeeBankName: 'Access Bank',
        payeeAccountNo: '0123456789',
        previewSnapshot: {
          quotationCashInNgn: 200_000,
          quoteTotalNgn: 165_000,
          overpaymentExcessNgn: 35_000,
          quotedMeters: 40,
          producedMetersForUnproduced: 30,
          pricePerMeterNgn: 5000,
        },
      },
      formatNgn
    );

    expect(html).toContain('size: A4 portrait');
    expect(html).toContain('height: 148.5mm');
    expect(html).toContain('A5 landscape');
    expect(html).toContain('Cut here');
    expect(html).toContain('main-cols');
    expect(html).toContain('RF-KD-26-1001');
    expect(html).toContain('Account number:');
    expect(html).toContain('0123456789');
    expect(html).toContain('Cash paid on quotation');
    expect(html).toContain('Quotation total');
    expect(html).toContain('Unproduced metres');
    expect(html).not.toContain('Excluded draft');
    expect(html).toContain('fitSheet');
  });

  it('lists split payees with account numbers', () => {
    const html = buildRefundRecordPrintHtml(
      {
        refundID: 'RF-KD-26-1002',
        status: 'Approved',
        amountNgn: 100_000,
        approvedAmountNgn: 100_000,
        calculationLines: [{ label: 'Order cancel', category: 'Order cancellation', amountNgn: 100_000 }],
        splitDistributions: [
          {
            recipientKind: 'customer',
            payeeName: 'Customer One',
            payeeBankName: 'GTB',
            payeeAccountNo: '111222333',
            amountNgn: 80_000,
            netPayoutNgn: 80_000,
          },
          {
            recipientKind: 'associated_staff',
            payeeName: 'Staff Two',
            payeeAccountNo: '444555666',
            amountNgn: 20_000,
            netPayoutNgn: 16_000,
            companyCutNgn: 4_000,
          },
        ],
      },
      formatNgn
    );

    expect(html).toContain('Account number: <strong>111222333</strong>');
    expect(html).toContain('Account number: <strong>444555666</strong>');
    expect(html).toContain('₦16,000');
    expect(html).toContain('Company deduction');
    expect(html).toContain('₦4,000');
  });

  it('reads payoutAccount.payeeAccountNo and companyDeductionNgn from stored splits', () => {
    const html = buildRefundRecordPrintHtml(
      {
        refundID: 'RF-KD-26-1004',
        status: 'Approved',
        amountNgn: 50_000,
        approvedAmountNgn: 50_000,
        calculationLines: [{ label: 'Unproduced', category: 'Unproduced meterage', amountNgn: 50_000 }],
        splitDistributions: [
          {
            recipientKind: 'associated_staff',
            amountNgn: 50_000,
            companyDeductionNgn: 10_000,
            netPayoutNgn: 40_000,
            payoutAccount: {
              payeeName: 'Musa Staff',
              payeeBankName: 'Access Bank',
              payeeAccountNo: '0129988776',
            },
          },
        ],
        settlementSummary: { tillPayableNgn: 40_000, companyCutNgn: 10_000 },
      },
      formatNgn
    );
    expect(html).toContain('0129988776');
    expect(html).toContain('Access Bank');
    expect(html).toContain('Company deduction ₦10,000');
    expect(html).toContain('Company deduction (retained)');
    expect(html).toContain('Till due now');
    expect(html).toContain('₦40,000');
  });

  it('does not inflate till due when uncleared hold zeros netPayoutNgn', () => {
    const html = buildRefundRecordPrintHtml(
      {
        refundID: 'RF-KD-26-1005',
        status: 'Approved',
        amountNgn: 100_000,
        approvedAmountNgn: 100_000,
        calculationLines: [{ label: 'Cancel', category: 'Order cancellation', amountNgn: 100_000 }],
        splitDistributions: [
          {
            recipientKind: 'customer',
            amountNgn: 100_000,
            companyDeductionNgn: 0,
            netPayoutNgn: 0,
            unclearedReceiptHoldNgn: 100_000,
            payoutHeldForUnclearedReceipts: true,
            payoutAccount: {
              payeeName: 'Amina',
              payeeBankName: 'GTB',
              payeeAccountNo: '999888777',
            },
          },
        ],
        settlementSummary: { tillPayableNgn: 0, heldUnclearedNgn: 100_000 },
        heldNetNgn: 100_000,
      },
      formatNgn
    );
    expect(html).toContain('999888777');
    expect(html).toContain('Uncleared hold');
    expect(html).toContain('Held (uncleared receipts)');
    // Badge / till due must stay ₦0, not fall back to gross.
    expect(html).toMatch(/Till due now[\s\S]*₦0/);
  });

  it('shows MD discount metres × ₦/m calculation', () => {
    const detail = buildRefundLineCalculationDetailHtml(
      {
        category: 'MD discount',
        label: 'MD discount (120m @ ₦100/m)',
        amountNgn: 12_000,
      },
      { quotedMeters: 120 },
      formatNgn
    );
    expect(detail).toContain('Quoted metres');
    expect(detail).toContain('120 m ×');
    expect(detail).toContain('₦12,000');
  });

  it('returns empty string for missing record', () => {
    expect(buildRefundRecordPrintHtml(null)).toBe('');
  });
});

describe('formatRefundPrintDateTime', () => {
  it('formats ISO timestamps for the desk', () => {
    const out = formatRefundPrintDateTime('2026-09-18T10:00:00.000Z');
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/Sep/);
  });

  it('returns empty for blank input', () => {
    expect(formatRefundPrintDateTime('')).toBe('');
  });
});
