import React, { useMemo } from 'react';
import { WorkspacePreviewProvider } from '../../context/WorkspaceContext';
import { FinanceDeskWorkQueues } from '../../components/finance/FinanceDeskWorkQueues';
import { FinanceDeskTreasuryAccountGrid } from '../../components/finance/FinanceDeskTreasuryAccountGrid';
import { StaffShareBatchPanel } from '../../components/finance/StaffShareBatchPanel';
import { AddPayoutAccountModal } from '../../components/finance/AddPayoutAccountModal';
import { receiptDuplicate24hPrompt } from '../../lib/financeManagerOverride.js';
import { customerOwedCreditLine, customerOwedCreditSummary } from '../../lib/customerOwedCredit.js';
import { overQuoteRefusal, overQuoteSplit } from '../../shared/lib/overQuotePayout.js';

/**
 * Dev-only preview (/preview/finance-guardrails): Finance Phase A screens on fixture data,
 * for review screenshots without a backend. All names and IDs below are invented.
 */

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const ACCOUNTS = [
  { id: 1, name: 'Main till', type: 'Cash', balance: 420000, openingBalanceNgn: 420000, branchId: 'BR-PV', accNo: 'TILL-1' },
  { id: 2, name: 'Moniepoint', type: 'Bank', bankName: 'Moniepoint MFB', balance: 3150000, openingBalanceNgn: 3150000, branchId: 'BR-PV', accNo: '6011111111' },
  { id: 3, name: 'Taj current', type: 'Bank', bankName: 'TAJBank', balance: 1800000, openingBalanceNgn: 1800000, branchId: 'BR-PV', accNo: '0222222222' },
];

const RECEIPTS = [
  { id: 'RC-PV-0101', customer: 'Musa Roofing', customerID: 'CUS-PV-1', quotationRef: 'QT-PV-201', amountNgn: 350000, dateISO: daysAgo(0), status: 'Pending clearance' },
  { id: 'RC-PV-0102', customer: 'Aisha Builders', customerID: 'CUS-PV-2', quotationRef: 'QT-PV-202', amountNgn: 120000, dateISO: daysAgo(1), status: 'Pending clearance' },
  { id: 'RC-PV-0103', customer: 'Bello & Sons', customerID: 'CUS-PV-3', quotationRef: 'QT-PV-203', amountNgn: 900000, dateISO: daysAgo(3), status: 'Suspended', underInvestigation: true },
];

const REFUNDS = [
  {
    refundID: 'RF-PV-9001', customer: 'Musa Roofing', customerID: 'CUS-PV-1', quotationRef: 'QT-PV-180', status: 'Approved',
    amountNgn: 95000, approvedAmountNgn: 95000, paidAmountNgn: 0, approvalDate: daysAgo(41),
    payeeName: 'Musa Roofing', payeeBankName: 'GTBank', payeeAccountNo: '0123456789',
  },
  {
    refundID: 'RF-PV-9002', customer: 'Aisha Builders', customerID: 'CUS-PV-2', quotationRef: 'QT-PV-181', status: 'Approved',
    amountNgn: 64000, approvedAmountNgn: 64000, paidAmountNgn: 0, approvalDate: daysAgo(12),
    payeeName: 'Aisha Builders', payeeBankName: '', payeeAccountNo: '000',
  },
  {
    refundID: 'RF-PV-9003', customer: 'Kano Steel Ltd', customerID: 'CUS-PV-4', quotationRef: 'QT-PV-182', status: 'Approved',
    amountNgn: 48000, approvedAmountNgn: 48000, paidAmountNgn: 0, approvalDate: daysAgo(2),
    payeeName: 'Kano Steel Ltd', payeeBankName: 'Zenith', payeeAccountNo: '1012345678',
  },
];

const PAYMENT_REQUESTS = [
  { requestID: 'PR-PV-0301', description: 'Generator diesel', expenseCategory: 'Fuel', approvalStatus: 'Approved', amountRequestedNgn: 85000, paidAmountNgn: 0, approvedAtISO: daysAgo(1), payeeName: 'Danjuma Fuel', payeeBankName: 'Access', payeeAccountNo: '0698765432' },
  { requestID: 'PR-PV-0302', description: 'Forklift repair', expenseCategory: 'Maintenance', approvalStatus: 'Approved', amountRequestedNgn: 40000, paidAmountNgn: 0, approvedAtISO: daysAgo(4), payeeName: 'Ibro Mechanic', payeeBankName: '', payeeAccountNo: '' },
];

const HAULAGE = [
  { poID: 'PO-PV-0070', supplierName: 'Coil Supplier A', transportAgentId: 'TA-PV-1', transportAgentName: 'Sani Haulage', outstandingNgn: 180000, transportAmountNgn: 300000, transportPaidNgn: 120000, payeeBankName: '—', payeeAccountNo: '' },
];

const hasPermission = (p) => ['finance.pay', 'finance.view'].includes(p);

function Section({ id, title, children }) {
  const only = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('only') : null;
  if (only ? only !== id : id === 'a1-modal') return null;
  return (
    <section id={id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4" data-testid={`gallery-${id}`}>
      <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function PromptMock({ text }) {
  return (
    <div className="max-w-xl rounded-lg border border-slate-300 bg-slate-50 p-4 shadow-sm">
      <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Browser prompt</p>
      <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-slate-800">{text}</pre>
      <div className="mt-3 h-8 rounded border border-slate-300 bg-white" />
    </div>
  );
}

export default function FinanceGuardrailsGallery() {
  const workspace = useMemo(
    () => ({
      viewAllBranches: false,
      branchScope: 'BR-PV',
      snapshot: {
        receipts: RECEIPTS,
        treasuryAccounts: ACCOUNTS,
        treasuryMovements: [],
        paymentRequests: PAYMENT_REQUESTS,
        refunds: REFUNDS,
        poTransportAwaitingTreasury: HAULAGE,
        purchasePaymentCashierAcksPending: [],
      },
      session: { user: { roleKey: 'finance_manager', displayName: 'Preview Finance', permissions: ['finance.pay', 'finance.view'] } },
      hasPermission,
      canAccessModule: () => true,
      canMutate: true,
    }),
    []
  );

  const statementMap = useMemo(() => {
    const today = new Date();
    const at = new Date(today.getTime() - 2 * 3600 * 1000).toISOString();
    return new Map([
      [2, { treasuryAccountId: 2, statementToISO: at, hasTime: true }],
      [3, { treasuryAccountId: 3, statementToISO: daysAgo(3), hasTime: false }],
    ]);
  }, []);

  const batchData = {
    ok: true,
    weekKey: (() => {
      const d = new Date();
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return d.toISOString().slice(0, 10);
    })(),
    thresholdNgn: 5000,
    batches: [
      {
        key: 'associated_staff::AS-PV-1', partyKind: 'associated_staff', partyId: 'AS-PV-1', partyName: 'Ali (driver)',
        payeeBankName: 'Moniepoint', payeeAccountNo: '6012345678',
        readyLines: [{ refundId: 'RF-PV-8801', owedNgn: 4000 }, { refundId: 'RF-PV-8806', owedNgn: 2500 }],
        waitingLines: [{ refundId: 'RF-PV-9003', owedNgn: 1800 }], readyNgn: 6500, waitingNgn: 1800, paidThisWeek: null,
      },
      {
        key: 'associated_staff::AS-PV-2', partyKind: 'associated_staff', partyId: 'AS-PV-2', partyName: 'Bala (installer)',
        payeeBankName: '', payeeAccountNo: '000',
        readyLines: [{ refundId: 'RF-PV-8810', owedNgn: 3000 }], waitingLines: [], readyNgn: 3000, waitingNgn: 0, paidThisWeek: null,
      },
    ],
  };

  const owed = customerOwedCreditSummary({
    sources: [
      { id: 'refund:RF-PV-9002', kind: 'refund', refundId: 'RF-PV-9002', status: 'Approved', availableNgn: 64000 },
      { id: 'overpay:QT-PV-150', kind: 'overpay', availableNgn: 22500 },
    ],
  });

  return (
    <WorkspacePreviewProvider value={workspace}>
      <div className="min-h-screen space-y-6 bg-slate-100 p-4 sm:p-6">
        <h1 className="text-lg font-black text-slate-900">Finance Phase A — preview (fixture data)</h1>

        <Section id="desk" title="A1 · A3 · A4 — Finance desk (headlines, Pay out, refund queue)">
          <FinanceDeskWorkQueues
            hideAccountGrid
            onConfirmReceipt={() => {}}
            onViewReceipt={() => {}}
            onPayRequest={() => {}}
            onViewPaymentRequest={() => {}}
            onPayRefund={() => {}}
            onViewRefund={() => {}}
            onPayPoTransport={() => {}}
            onViewPoTransport={() => {}}
            onGoToTab={() => {}}
          />
        </Section>

        <Section id="a1-modal" title="A1 — Add payout account">
          <div className="relative min-h-[420px]">
            <AddPayoutAccountModal
              request={{ target: 'refund', refundId: 'RF-PV-9002', label: 'Aisha Builders on RF-PV-9002', payeeName: 'Aisha Builders' }}
              onClose={() => {}}
            />
          </div>
        </Section>

        <Section id="a2" title="A2 — duplicate receipt within 24 h (BM / OM prompt)">
          <PromptMock
            text={receiptDuplicate24hPrompt({
              error:
                'RC-PV-0101 already records ₦350,000 from this customer on QT-PV-201, 3.5 h apart. A Branch Manager or Operations Manager must post a second one, with a reason.',
              duplicates: [{ id: 'RC-PV-0101', quotationRef: 'QT-PV-201', hoursApart: 3.5 }],
            })}
          />
          <p className="text-xs text-rose-700">Cashier sees: “… Ask a Branch Manager or Operations Manager to post it.”</p>
        </Section>

        <Section id="a5" title="A5 — haulage above quoted fee (BM / OM prompt)">
          <PromptMock
            text={`${overQuoteRefusal(overQuoteSplit({ capNgn: 300000, alreadyPaidNgn: 120000, payNgn: 230000 }), { what: 'Haulage', ref: 'PO-PV-0070', capLabel: 'quoted fee' }).error}\n\nApprove the excess — reason (at least 10 characters). The excess posts as its own line with this reason:`}
          />
        </Section>

        <Section id="a6" title="A6 — confirm card: what we owe the customer">
          <div className="max-w-md space-y-3">
            <p className="text-ui-xs font-mono text-slate-600">RC-PV-0102</p>
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-950">
              {customerOwedCreditLine(owed)}
            </p>
            <button type="button" className="w-full rounded-xl border border-sky-200 bg-white py-2.5 text-ui-xs font-bold uppercase tracking-wide text-sky-900">
              Use refund credit instead
            </button>
            <button type="button" className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-ui-xs font-bold uppercase tracking-wide text-rose-900">
              Reverse mistaken receipt
            </button>
            <button type="button" className="z-btn-primary w-full justify-center py-3">
              Confirm payment &amp; clear for delivery
            </button>
          </div>
        </Section>

        <Section id="a7" title="A7 — weekly staff-share batch">
          <StaffShareBatchPanel data={batchData} treasuryAccounts={ACCOUNTS} />
        </Section>

        <Section id="a8" title="A8 — bank cards: statement loaded to">
          <FinanceDeskTreasuryAccountGrid accounts={ACCOUNTS} bookById={new Map()} statementByAccountId={statementMap} />
        </Section>
      </div>
    </WorkspacePreviewProvider>
  );
}
