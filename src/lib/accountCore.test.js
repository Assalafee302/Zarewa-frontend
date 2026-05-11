import { describe, it, expect } from 'vitest';
import {
  ACCOUNT_TAB_LABELS,
  buildPaymentRequestAuditTrail,
  createRequestPayLine,
  isTreasuryOutflowPaymentRow,
  nextExpenseId,
  normalizePaymentRequest,
  treasuryMovementStatementLabel,
  treasuryMovementSourceBadge,
  treasuryOutflowLinesForRefund,
} from './accountCore';

describe('accountCore', () => {
  it('provides stable account tab labels', () => {
    expect(ACCOUNT_TAB_LABELS.disbursements).toBe('Payments');
  });

  it('lists refund payout treasury lines for a refund id', () => {
    const lines = treasuryOutflowLinesForRefund('RF-1', [
      {
        id: 'm1',
        type: 'REFUND_PAYOUT',
        sourceKind: 'REFUND',
        sourceId: 'RF-1',
        amountNgn: -100,
        reversesMovementId: '',
      },
      {
        id: 'm2',
        type: 'REFUND_PAYOUT',
        sourceKind: 'REFUND',
        sourceId: 'RF-2',
        amountNgn: -50,
      },
      {
        id: 'm3',
        type: 'REFUND_PAYOUT_REVERSAL_IN',
        sourceKind: 'REFUND',
        sourceId: 'RF-1',
        amountNgn: 100,
        reversesMovementId: 'm1',
      },
    ]);
    expect(lines.map((l) => l.id)).toEqual(['m1']);
  });

  it('flags treasury outflow rows for the payments register', () => {
    expect(
      isTreasuryOutflowPaymentRow({
        type: 'PAYMENT_REQUEST_OUT',
        sourceKind: 'PAYMENT_REQUEST',
        amountNgn: -5000,
        reversesMovementId: '',
      })
    ).toBe(true);
    expect(
      isTreasuryOutflowPaymentRow({
        type: 'PAYMENT_REQUEST_OUT',
        sourceKind: 'PAYMENT_REQUEST',
        amountNgn: -5000,
        reversesMovementId: 'TM-1',
      })
    ).toBe(false);
    expect(
      isTreasuryOutflowPaymentRow({
        type: 'RECEIPT_IN',
        sourceKind: 'LEDGER_RECEIPT',
        amountNgn: 5000,
      })
    ).toBe(false);
  });

  it('increments expense ids', () => {
    expect(nextExpenseId([{ expenseID: 'EXP-2026-009' }])).toBe('EXP-2026-010');
  });

  it('normalizes payment request row shape', () => {
    const n = normalizePaymentRequest({ requestID: 'PR-1', paidAmountNgn: undefined, lineItems: null });
    expect(n.paidAmountNgn).toBe(0);
    expect(n.attachmentPresent).toBe(false);
    expect(Array.isArray(n.lineItems)).toBe(true);
  });

  it('creates payout lines with account id and string amount', () => {
    const line = createRequestPayLine(2, 1500);
    expect(line.treasuryAccountId).toBe('2');
    expect(line.amount).toBe('1500');
  });

  it('builds readable treasury statement labels', () => {
    const text = treasuryMovementStatementLabel({
      sourceKind: 'INTER_BRANCH_LOAN',
      counterpartyName: 'Kano Branch',
      reference: 'IB-001',
      note: 'April cycle',
    });
    expect(text).toContain('Inter-branch lending');
    expect(text).toContain('Ref IB-001');
  });

  it('badges ledger receipt vs advance for Finance statements', () => {
    expect(treasuryMovementSourceBadge({ sourceKind: 'LEDGER_RECEIPT', type: 'RECEIPT_IN' }).label).toBe(
      'Sales receipt'
    );
    expect(treasuryMovementSourceBadge({ sourceKind: 'LEDGER_ADVANCE', type: 'ADVANCE_IN' }).label).toBe('Advance');
  });

  it('builds payment request audit trail rows', () => {
    const trail = buildPaymentRequestAuditTrail({
      requestDate: '2026-04-01',
      requestedBy: 'Amina',
      approvedBy: 'Manager',
      approvedAtISO: '2026-04-02T09:00:00Z',
      paidBy: 'Finance',
      paidAtISO: '2026-04-03T12:00:00Z',
    });
    expect(trail.map((t) => t.key)).toEqual(['requested', 'approved', 'paid']);
  });
});

