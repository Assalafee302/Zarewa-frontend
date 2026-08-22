import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RefundModal, {
  refundCreatePathFromPreview,
  refundQuickOverpayAvailableFromPreview,
  refundRecordSubtitle,
} from './RefundModal.jsx';
import { ToastProvider } from '../../context/ToastContext.jsx';
import { apiFetch } from '../../lib/apiBase';
import { invalidateEligibleRefundQuotationsCache } from '../../lib/refundEligibleQuotationsCache.js';

function renderWithToast(ui) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

vi.mock('../../context/CustomersContext', () => ({
  useCustomers: () => ({
    customers: [{ customerID: 'CUS-001', name: 'Acme Roofing' }],
    deleteCustomer: vi.fn(),
  }),
}));

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    apiOnline: true,
  }),
}));

vi.mock('../../lib/apiBase', () => ({
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

describe('refundCreatePathFromPreview', () => {
  it('uses Quick overpay only when overpayment is the sole positive reason', () => {
    expect(
      refundCreatePathFromPreview({
        overpaymentExcessNgn: 2000,
        suggestedLines: [{ category: 'Overpayment', amountNgn: 2000 }],
      })
    ).toBe('quick');
  });

  it('keeps Full refund when other calculated reasons exist alongside overpayment', () => {
    expect(
      refundCreatePathFromPreview({
        overpaymentExcessNgn: 2000,
        suggestedLines: [
          { category: 'Overpayment', amountNgn: 2000 },
          { category: 'Unproduced meterage', amountNgn: 5000 },
        ],
      })
    ).toBe('full');
    expect(
      refundCreatePathFromPreview({
        overpaymentExcessNgn: 1500,
        suggestedLines: [
          { category: 'Overpayment', amountNgn: 1500 },
          { category: 'Substitution Difference', amountNgn: 800 },
        ],
      })
    ).toBe('full');
  });

  it('keeps Full refund when there is no overpayment', () => {
    expect(
      refundCreatePathFromPreview({
        overpaymentExcessNgn: 0,
        suggestedLines: [{ category: 'Accessory shortfall', amountNgn: 4000 }],
      })
    ).toBe('full');
  });

  it('uses Full refund when Order cancellation is the suggested path (cancelled job)', () => {
    expect(
      refundCreatePathFromPreview({
        overpaymentExcessNgn: 80_000,
        suggestedLines: [{ category: 'Order cancellation', amountNgn: 260_000 }],
      })
    ).toBe('full');
  });
});

describe('refundQuickOverpayAvailableFromPreview', () => {
  it('blocks quick overpay when cancelled production uses Order cancellation', () => {
    expect(
      refundQuickOverpayAvailableFromPreview({
        overpaymentExcessNgn: 80_000,
        suggestedLines: [{ category: 'Order cancellation', amountNgn: 260_000 }],
        hasCancelledProductionJob: true,
      })
    ).toBe(false);
  });

  it('allows quick overpay for overpayment-only preview', () => {
    expect(
      refundQuickOverpayAvailableFromPreview({
        overpaymentExcessNgn: 5_000,
        suggestedLines: [{ category: 'Overpayment', amountNgn: 5_000 }],
        hasCancelledProductionJob: false,
      })
    ).toBe(true);
  });
});

describe('RefundModal cancelled overpay preview UI', () => {
  afterEach(() => {
    cleanup();
    vi.mocked(apiFetch).mockReset();
    invalidateEligibleRefundQuotationsCache();
  });

  it('shows order cancellation total and overpay context in quote summary', async () => {
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
                id: 'QT-LAB',
                customer_id: 'CUS-LAB',
                customer_name: 'Refund Lab Customer',
                handled_by: 'Sales',
                paid_ngn: 260000,
                total_ngn: 180000,
                total_refunded_ngn: 0,
                remaining_ngn: 260000,
                suggested_preview_amount_ngn: 260000,
                eligible_refund_categories: ['Order cancellation'],
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
              customerID: 'CUS-LAB',
              customerName: 'Refund Lab Customer',
              paidOnQuoteNgn: 260000,
              quotationCashInNgn: 260000,
              quoteTotalNgn: 180000,
              overpaymentExcessNgn: 80000,
              refundHardCapNgn: 260000,
              remainingRefundableNgn: 260000,
              hasCancelledProductionJob: true,
              openProductionJob: null,
              suggestedLines: [
                {
                  label: 'Order cancellation (capped after economic floor)',
                  amountNgn: 260000,
                  category: 'Order cancellation',
                },
              ],
              suggestedAmountNgn: 260000,
              warnings: [],
              blockedRefundCategories: [],
              eligibleRefundCategories: ['Order cancellation', 'Overpayment'],
            },
          },
        };
      }
      if (u.includes('intelligence')) {
        return {
          ok: true,
          data: {
            ok: true,
            receipts: [{ amountNgn: 260000, bankReceivedAmountNgn: 260000 }],
            cuttingLists: [],
            summary: { quotationCashInNgn: 260000, producedMeters: 0, accessoriesSummary: { lines: [] } },
          },
        };
      }
      if (u.includes('production-alignment-check')) {
        return { ok: true, data: { ok: true, issues: [] } };
      }
      return { ok: false, data: { ok: false } };
    });

    renderWithToast(
      <RefundModal
        {...baseProps}
        mode="create"
        productionJobs={[
          {
            jobID: 'PRO-LAB',
            quotationRef: 'QT-LAB',
            status: 'Cancelled',
            actualMeters: 0,
            effectiveOutputMeters: 0,
          },
        ]}
        quotations={[
          {
            id: 'QT-LAB',
            customerID: 'CUS-LAB',
            customer: 'Refund Lab Customer',
            totalNgn: 180000,
            paidNgn: 260000,
            handledBy: 'Sales',
          },
        ]}
      />
    );

    const quoteInput = await screen.findByLabelText(/search finished quotation/i);
    await waitFor(() => expect(quoteInput).not.toBeDisabled());
    await user.click(quoteInput);
    await user.type(quoteInput, 'QT-LAB');
    await user.click(await screen.findByRole('button', { name: /QT-LAB · Refund Lab/i }));

    await waitFor(() => {
      expect(screen.getByText(/Refund total/i)).toBeInTheDocument();
      expect(screen.getAllByText(/₦260,000/).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/Overpayment on/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText(/included in the Order cancellation refund line/i)
      ).toBeInTheDocument();
    });
  });
});

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
    await user.click(await screen.findByRole('button', { name: /QT-SEED · Co/i }));
    await screen.findByText(/Overpayment hint/i);

    await user.click(screen.getByTitle('How refunds work'));
    expect(await screen.findByText(/Pick a quotation/i)).toBeInTheDocument();

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
    await user.click(await screen.findByRole('button', { name: /QT-SEED · Co/i }));

    await screen.findByText(/Line A/i);

    await waitFor(() => {
      expect(screen.getByText(/Refund total/i)).toBeInTheDocument();
      expect(screen.getByText(/₦100/)).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/Line items total does not match the requested refund amount/i)
    ).not.toBeInTheDocument();
  });

  it('keeps Full refund when preview has overpayment plus other calculated reasons', async () => {
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
                paid_ngn: 12000,
                total_ngn: 10000,
                total_refunded_ngn: 0,
                suggested_preview_amount_ngn: 7000,
                eligible_refund_categories: ['Overpayment', 'Unproduced meterage'],
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
              paidOnQuoteNgn: 12000,
              overpayAdvanceNgn: 0,
              quotationCashInNgn: 12000,
              quoteTotalNgn: 10000,
              overpaymentExcessNgn: 2000,
              suggestedLines: [
                { label: 'Overpayment on QT-SEED', amountNgn: 2000, category: 'Overpayment' },
                { label: 'Unproduced metres (10.00m @ ₦500)', amountNgn: 5000, category: 'Unproduced meterage' },
              ],
              warnings: [],
              substitutionPerMeterBreakdown: [],
              alreadyRefundedCategories: [],
              blockedRefundCategories: [],
              eligibleRefundCategories: ['Overpayment', 'Unproduced meterage'],
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
    await user.click(await screen.findByRole('button', { name: /QT-SEED · Co/i }));

    await screen.findByText(/Overpayment on QT-SEED/i);
    expect(await screen.findByText(/Unproduced metres \(10\.00m @ ₦500\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Full refund/i })).toHaveClass('bg-zarewa-teal');
    expect(
      screen.queryByText(/Other calculated refund reasons are available/i)
    ).not.toBeInTheDocument();
  });
});

describe('RefundModal view record', () => {
  afterEach(() => {
    cleanup();
    vi.mocked(apiFetch).mockReset();
  });

  it('shows customer name, ledger cash-in, and leftover payout copy', async () => {
    vi.mocked(apiFetch).mockImplementation(async (url) => {
      if (String(url).includes('intelligence')) {
        return {
          ok: true,
          data: {
            ok: true,
            receipts: [],
            cuttingLists: [],
            summary: {
              producedMeters: 0,
              quotationCashInNgn: 1_132_400,
              overpayAdvanceNgn: 151_330,
              accessoriesSummary: { lines: [] },
            },
          },
        };
      }
      return { ok: false, data: { ok: false } };
    });

    renderWithToast(
      <RefundModal
        {...baseProps}
        mode="view"
        quotations={[
          {
            id: 'QT-KD-26-1237',
            customerID: 'CUS-KD-26-0655',
            customer: 'Kaduna Sheets',
            total: '₦981,070',
            totalNgn: 981_070,
            paidNgn: 1_132_400,
          },
        ]}
        refunds={[
          {
            refundID: 'RF-KD-26-9505',
            quotationRef: 'QT-KD-26-1237',
            status: 'Approved',
            amountNgn: 151_330,
            creditAppliedNgn: 23_030,
            creditAppliedToQuotationRef: 'QT-KD-26-1282',
          },
          {
            refundID: 'RF-KD-26-9490',
            quotationRef: 'QT-KD-26-1237',
            status: 'Paid',
            amountNgn: 174_830,
            paidAmountNgn: 174_830,
          },
        ]}
        record={{
          refundID: 'RF-KD-26-9505',
          customerID: 'CUS-KD-26-0655',
          customer: 'Kaduna Sheets',
          quotationRef: 'QT-KD-26-1237',
          status: 'Approved',
          amountNgn: 151_330,
          approvedAmountNgn: 128_300,
          creditAppliedNgn: 23_030,
          creditAppliedToQuotationRef: 'QT-KD-26-1282',
          creditConfirmationStatus: 'applied',
          reasonCategory: 'Overpayment',
          reason: 'Overpayment',
          calculationLines: [
            { label: 'Overpayment — cash received above quote total on this quotation', amountNgn: 151_330, category: 'Overpayment' },
          ],
        }}
      />
    );

    expect(
      screen.getByText(/RF-KD-26-9505 · Approved · ₦23,030 applied to QT-KD-26-1282 · ₦128,300 awaits payout/)
    ).toBeInTheDocument();
    expect(screen.getByText('Kaduna Sheets')).toBeInTheDocument();
    expect(await screen.findByText(/ledger cash-in ₦1,132,400/i)).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /Outstanding for payout/i })).toBeInTheDocument();
    expect(screen.queryByText(/₦1,150,000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/awaits approval/i)).not.toBeInTheDocument();
  });
});

describe('refundRecordSubtitle', () => {
  it('says leftover cash awaits payout after the refund is already approved', () => {
    expect(
      refundRecordSubtitle({
        refundID: 'RF-KD-26-9505',
        status: 'Approved',
        amountNgn: 151_330,
        creditAppliedNgn: 23_030,
        creditAppliedToQuotationRef: 'QT-KD-26-1282',
        creditConfirmationStatus: 'applied',
      })
    ).toBe('RF-KD-26-9505 · Approved · ₦23,030 applied to QT-KD-26-1282 · ₦128,300 awaits payout');
  });

  it('says leftover still awaits approval while the request is pending', () => {
    expect(
      refundRecordSubtitle({
        refundID: 'RF-1',
        status: 'Pending',
        amountNgn: 50_000,
        creditAppliedNgn: 20_000,
        creditAppliedToQuotationRef: 'QT-2',
        creditConfirmationStatus: 'applied',
      })
    ).toBe('RF-1 · Pending · ₦20,000 applied to QT-2 · ₦30,000 awaits approval');
  });
});
