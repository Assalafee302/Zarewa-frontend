import { describe, expect, it } from 'vitest';
import {
  buildRefundRecordPrintHtml,
  formatRefundPrintDateTime,
} from './refundRecordPrint.js';

const formatNgn = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`;

describe('buildRefundRecordPrintHtml', () => {
  it('renders A5 refund voucher with types, calculation, payee, and signature blocks', () => {
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
            label: 'Cash overpayment residual',
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
      },
      formatNgn
    );

    expect(html).toContain('size: A5 portrait');
    expect(html).toContain('RF-KD-26-1001');
    expect(html).toContain('QT-26-500');
    expect(html).toContain('Unproduced metres');
    expect(html).toContain('Unproduced metres (10m @ ₦5,000)');
    expect(html).toContain('Cash overpayment residual');
    expect(html).not.toContain('Excluded draft');
    expect(html).toContain('₦85,000');
    expect(html).toContain('Access Bank');
    expect(html).toContain('0123456789');
    expect(html).toContain('Applicant');
    expect(html).toContain('Approver');
    expect(html).toContain('Payee (received)');
    expect(html).toContain('How it was calculated');
    expect(html).toContain('Cash / till to pay');
    expect(html).toContain('ZAREWA ALUMINIUM AND PLASTICS LTD');
    expect(html).toContain('Amount to pay');
  });

  it('lists split payees with net payout when present', () => {
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
            payeeAccountNo: '111',
            amountNgn: 80_000,
            netPayoutNgn: 80_000,
          },
          {
            recipientKind: 'associated_staff',
            payeeName: 'Staff Two',
            amountNgn: 20_000,
            netPayoutNgn: 16_000,
            companyCutNgn: 4_000,
          },
        ],
      },
      formatNgn
    );

    expect(html).toContain('Customer One');
    expect(html).toContain('Staff Two');
    expect(html).toContain('₦80,000');
    expect(html).toContain('₦16,000');
    expect(html).toContain('company cut');
    expect(html).toContain('Multiple — see Pay to');
  });

  it('nets credit applied out of cash to pay', () => {
    const html = buildRefundRecordPrintHtml(
      {
        refundID: 'RF-KD-26-1003',
        status: 'Approved',
        amountNgn: 50_000,
        approvedAmountNgn: 50_000,
        creditAppliedNgn: 20_000,
        creditAppliedToQuotationRef: 'QT-26-999',
        calculationLines: [{ label: 'Overpay', category: 'Overpayment', amountNgn: 50_000 }],
        payeeName: 'Amina',
      },
      formatNgn
    );
    expect(html).toContain('Applied as credit');
    expect(html).toContain('QT-26-999');
    expect(html).toContain('₦30,000');
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
