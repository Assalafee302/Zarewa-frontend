import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RefundModal from './RefundModal.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import { apiFetch } from '../lib/apiBase';

function renderWithToast(ui) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

vi.mock('../context/CustomersContext', () => ({
  useCustomers: () => ({
    customers: [{ customerID: 'CUS-001', name: 'Acme Roofing' }],
    deleteCustomer: vi.fn(),
  }),
}));

vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    apiOnline: true,
  }),
}));

vi.mock('../lib/apiBase', () => ({
  apiFetch: vi.fn(),
}));

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  quotations: [
    {
      id: 'QT-1',
      customerID: 'CUS-001',
      customer: 'Acme Roofing',
      total: '₦10,000',
      totalNgn: 10_000,
      paidNgn: 0,
      handledBy: 'Sales Manager',
    },
  ],
  receipts: [],
  cuttingLists: [],
  availableStock: [],
  refunds: [],
  productionJobs: [],
};

/** Stable reference so production fingerprint effect is not retriggered every parent re-render. */
const SEED_PRODUCTION_JOBS = [
  {
    jobID: 'PJ-SEED',
    quotationRef: 'QT-SEED',
    status: 'Completed',
    actualMeters: 100,
    effectiveOutputMeters: 100,
    productID: 'PR-1',
    productName: 'Roofing sheet',
    conversionAlertState: 'Ok',
    coilSpecMismatchPending: false,
  },
];

const pendingApproveRecord = {
  refundID: 'RF-1',
  customerID: 'CUS-001',
  customer: 'Acme Roofing',
  quotationRef: 'QT-1',
  amountNgn: 5_000,
  status: 'Pending',
  reasonCategory: 'Overpayment',
  reason: 'Overpayment - test',
  calculationLines: [{ label: 'Overpayment line', amountNgn: 5_000 }],
  calculationNotes: '',
  requestedBy: 'Sales Officer',
  requestedAtISO: '2026-03-29T10:00:00.000Z',
};

function mockApproveModeApis() {
  vi.mocked(apiFetch).mockImplementation(async (url) => {
    const u = String(url);
    if (u.includes('quotation-audit')) {
      return {
        ok: true,
        data: {
          quotation: { id: 'QT-1', quotationLines: { products: [] } },
          summary: { paidNgn: 10_000, totalNgn: 10_000 },
          ledgerEntries: [],
          refunds: [],
          totals: {},
          cuttingLists: [],
          productionLogs: [],
          conversionChecks: [],
          salesReceipts: [],
        },
      };
    }
    if (u.includes('refunds/intelligence')) {
      return {
        ok: true,
        data: {
          ok: true,
          summary: { bookedOnQuotationNgn: 10_000 },
          dataQualityIssues: [],
          productionSuggestedCategories: [],
        },
      };
    }
    if (u.includes('production-alignment-check')) {
      return { ok: true, data: { ok: true, issues: [] } };
    }
    return { ok: false, data: { ok: false } };
  });
}

async function clickApproveWhenReady(user) {
  const approveBtn = await screen.findByRole('button', { name: /^Approve$/i });
  await waitFor(() => expect(approveBtn).not.toBeDisabled(), { timeout: 10_000 });
  await user.click(approveBtn);
}

describe('RefundModal', () => {
  afterEach(() => {
    cleanup();
    vi.mocked(apiFetch).mockReset();
  });

  it(
    'keeps the modal open when async approval persist fails',
    { timeout: 90_000 },
    async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onPersist = vi.fn().mockResolvedValue({ ok: false });
      mockApproveModeApis();

      renderWithToast(
        <RefundModal
          {...baseProps}
          mode="approve"
          onClose={onClose}
          onPersist={onPersist}
          record={pendingApproveRecord}
          requesterLabel="Sales Officer"
          approverLabel="Sales Manager"
        />
      );

      const comments = await screen.findByLabelText(/^Note$/i, {}, { timeout: 10_000 });
      await user.type(comments, 'Approval failed on purpose.');
      await clickApproveWhenReady(user);

      await waitFor(() => expect(onPersist).toHaveBeenCalled());
      expect(onClose).not.toHaveBeenCalled();
    }
  );

  it(
    'closes after successful approval persist',
    { timeout: 40_000 },
    async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onPersist = vi.fn().mockResolvedValue({ ok: true });
      mockApproveModeApis();

      renderWithToast(
        <RefundModal
          {...baseProps}
          mode="approve"
          onClose={onClose}
          onPersist={onPersist}
          record={pendingApproveRecord}
          requesterLabel="Sales Officer"
          approverLabel="Sales Manager"
        />
      );

      const comments = await screen.findByLabelText(/^Note$/i, {}, { timeout: 10_000 });
      await user.type(comments, 'Approved after review.');
      await clickApproveWhenReady(user);

      await waitFor(() => expect(onPersist).toHaveBeenCalled());
      await waitFor(() => expect(onClose).toHaveBeenCalled());
    }
  );

  it('shows manager approval preview in approve mode', async () => {
    mockApproveModeApis();
    renderWithToast(
      <RefundModal
        {...baseProps}
        mode="approve"
        onClose={vi.fn()}
        onPersist={vi.fn()}
        record={pendingApproveRecord}
      />
    );

    expect(await screen.findByRole('button', { name: /^Approve$/i })).toBeInTheDocument();
    expect(screen.getByText('Overpayment - test')).toBeInTheDocument();
    expect(screen.getByLabelText(/Approved/i)).toBeInTheDocument();
  });

  it('shows preview warnings after quotation and category selection', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes('eligible-quotations')) {
        return {
          ok: true,
          data: {
            ok: true,
            quotations: [
              {
                id: 'QT-SEED',
                customer_id: 'C1',
                customer_name: 'Co',
                handled_by: 'Mary Sales',
                paid_ngn: 5000,
                total_ngn: 5000,
                total_refunded_ngn: 0,
                suggested_preview_amount_ngn: 5000,
                eligible_refund_categories: ['Overpayment'],
              },
            ],
          },
        };
      }
      if (u.includes('/api/refunds/preview')) {
        return {
          ok: true,
          data: {
            ok: true,
            preview: {
              customerID: 'C1',
              customerName: 'Co',
              paidOnQuoteNgn: 5000,
              overpayAdvanceNgn: 0,
              quotationCashInNgn: 5000,
              quoteTotalNgn: 5000,
              suggestedLines: [{ label: 'Overpayment hint', amountNgn: 100, category: 'Overpayment' }],
              warnings: ['Test audit flag: verify receipts.'],
              substitutionPerMeterBreakdown: [],
              alreadyRefundedCategories: [],
              blockedRefundCategories: [],
              eligibleRefundCategories: ['Overpayment'],
            },
          },
        };
      }
      if (u.includes('intelligence')) {
        return {
          ok: true,
          data: {
            ok: true,
            receipts: [],
            cuttingLists: [],
            summary: { producedMeters: 0, accessoriesSummary: { lines: [] } },
          },
        };
      }
      return { ok: false, data: { ok: false } };
    });

    renderWithToast(
      <RefundModal {...baseProps} mode="create" productionJobs={SEED_PRODUCTION_JOBS} />
    );

    const quoteInput = await screen.findByLabelText(/search finished quotation/i);
    await waitFor(() => expect(quoteInput).not.toBeDisabled());
    await user.click(quoteInput);
    await user.type(quoteInput, 'QT-SEED');
    await user.click(await screen.findByRole('button', { name: /QT-SEED · Co · Mary Sales/i }));
    await screen.findByDisplayValue(/Overpayment hint/i);

    await user.click(screen.getByTitle('How refunds work'));
    expect(await screen.findByText(/Suggested amounts are not final/i)).toBeInTheDocument();

    expect((await screen.findAllByText(/Test audit flag: verify receipts/i)).length).toBeGreaterThanOrEqual(1);
  });

  it('auto-syncs requested refund amount from included line totals', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes('eligible-quotations')) {
        return {
          ok: true,
          data: {
            ok: true,
            quotations: [
              {
                id: 'QT-SEED',
                customer_id: 'C1',
                customer_name: 'Co',
                handled_by: 'Mary Sales',
                paid_ngn: 5000,
                total_ngn: 5000,
                total_refunded_ngn: 0,
                suggested_preview_amount_ngn: 5000,
                eligible_refund_categories: ['Overpayment'],
              },
            ],
          },
        };
      }
      if (u.includes('/api/refunds/preview')) {
        return {
          ok: true,
          data: {
            ok: true,
            preview: {
              customerID: 'C1',
              customerName: 'Co',
              paidOnQuoteNgn: 5000,
              overpayAdvanceNgn: 0,
              quotationCashInNgn: 5000,
              quoteTotalNgn: 5000,
              suggestedLines: [{ label: 'Line A', amountNgn: 100, category: 'Overpayment' }],
              warnings: [],
              substitutionPerMeterBreakdown: [],
              alreadyRefundedCategories: [],
              blockedRefundCategories: [],
              eligibleRefundCategories: ['Overpayment'],
            },
          },
        };
      }
      if (u.includes('intelligence')) {
        return {
          ok: true,
          data: { ok: true, receipts: [], cuttingLists: [], summary: { producedMeters: 0, accessoriesSummary: { lines: [] } } },
        };
      }
      return { ok: false, data: { ok: false } };
    });

    renderWithToast(
      <RefundModal {...baseProps} mode="create" productionJobs={SEED_PRODUCTION_JOBS} />
    );

    const quoteInput = await screen.findByLabelText(/search finished quotation/i);
    await waitFor(() => expect(quoteInput).not.toBeDisabled());
    await user.click(quoteInput);
    await user.type(quoteInput, 'QT-SEED');
    await user.click(await screen.findByRole('button', { name: /QT-SEED · Co · Mary Sales/i }));

    await screen.findByDisplayValue(/Line A/i);

    await waitFor(() => {
      expect(screen.getByText(/Refund request total/i)).toBeInTheDocument();
      expect(screen.getByText(/₦100/)).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/Line items total does not match the requested refund amount/i)
    ).not.toBeInTheDocument();
  });
});
