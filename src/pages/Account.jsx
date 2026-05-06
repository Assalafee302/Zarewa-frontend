import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Landmark,
  Plus,
  ShieldCheck,
  CheckCircle2,
  X,
  Edit3,
  Activity,
  ArrowDownLeft,
  Search,
  CreditCard,
  ClipboardList,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Truck,
  BookOpen,
  AlertCircle,
  RotateCcw,
  Printer,
  Banknote,
  Pencil,
  Trash2,
} from 'lucide-react';

import {
  FinancePilotHeader,
  FinanceSequencePanel,
  PageShell,
  PageTabs,
  ModalFrame,
} from '../components/layout';
import { AiAskButton } from '../components/AiAskButton';
import { EditSecondApprovalInline } from '../components/EditSecondApprovalInline';
import { formatNgn } from '../Data/mockData';
import { useToast } from '../context/ToastContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import {
  normalizeRefund,
  approvedRefundsAwaitingPayment,
  refundApprovedAmount,
  refundOutstandingAmount,
} from '../lib/refundsStore';
import { liveReceivablesNgn, openAuditQueue } from '../lib/liveAnalytics';
import { receiptCashReceivedNgn, receiptLedgerReceiptTreasurySplits } from '../lib/salesReceiptsList';
import { printExpenseRequestRecord } from '../lib/expenseRequestPrint';
import { ExpenseRequestFormFields } from '../components/office/ExpenseRequestFormFields.jsx';
import { buildPaymentRequestBodyFromForm, initialExpenseRequestFormState } from '../lib/expenseRequestFormCore.js';
import { EXPENSE_CATEGORY_OPTIONS } from '../shared/expenseCategories.js';
import {
  ACCOUNT_TAB_LABELS as TAB_LABELS,
  createRequestPayLine,
  normalizePaymentRequest,
  treasuryMovementStatementLabel,
  treasuryMovementSourceBadge,
} from '../lib/accountCore';

const Account = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { show: showToast } = useToast();
  const ws = useWorkspace();

  const [activeTab, setActiveTab] = useState('treasury');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaymentEntry, setShowPaymentEntry] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPayRequestModal, setShowPayRequestModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRefundPayModal, setShowRefundPayModal] = useState(false);
  const [statementAccount, setStatementAccount] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [refundPayTarget, setRefundPayTarget] = useState(null);
  const [refundPaidBy, setRefundPaidBy] = useState('');
  const [refundPayLines, setRefundPayLines] = useState([]);
  const [refundPaymentNote, setRefundPaymentNote] = useState('');
  const [requestPayLines, setRequestPayLines] = useState([]);
  const [requestPayNote, setRequestPayNote] = useState('');
  const [customerRefunds, setCustomerRefunds] = useState([]);

  const [bankAccounts, setBankAccounts] = useState([]);

  const emptyBankForm = () => ({
    id: null,
    name: '',
    bankName: '',
    type: 'Bank',
    accNo: '',
    balance: '',
    accountOfficerName: '',
    accountOfficerPhone: '',
    bankBranch: '',
    sortCodeOrSwift: '',
    notes: '',
  });
  const [newBank, setNewBank] = useState(emptyBankForm);

  const [fundMovements, setFundMovements] = useState([]);
  const [transferForm, setTransferForm] = useState({
    fromId: '',
    toId: '',
    amountNgn: '',
    reference: '',
  });
  const [interBranchLoans, setInterBranchLoans] = useState([]);
  const [interBranchBalances, setInterBranchBalances] = useState([]);
  const [interBranchBusy, setInterBranchBusy] = useState(false);
  const [interBranchForm, setInterBranchForm] = useState({
    lenderBranchId: '',
    borrowerBranchId: '',
    fromTreasuryAccountId: '',
    toTreasuryAccountId: '',
    principalNgn: '',
    dateISO: new Date().toISOString().slice(0, 10),
    reference: '',
    proposedNote: '',
    repaymentPlanJson: '[\n  { "dueDateISO": "2026-06-30", "amountNgn": 500000, "note": "First instalment" }\n]',
  });
  const [interBranchRepayForm, setInterBranchRepayForm] = useState({
    loanId: '',
    amountNgn: '',
    dateISO: new Date().toISOString().slice(0, 10),
    fromTreasuryAccountId: '',
    toTreasuryAccountId: '',
    note: '',
  });
  const [expenses, setExpenses] = useState([]);
  const [payRequests, setPayRequests] = useState([]);
  const [bankReconciliation, setBankReconciliation] = useState([]);

  const [receiptFinanceRow, setReceiptFinanceRow] = useState(null);
  const [receiptBankAmtInput, setReceiptBankAmtInput] = useState('');
  const [receiptClearDelivery, setReceiptClearDelivery] = useState(false);
  const [receiptFinanceBusy, setReceiptFinanceBusy] = useState(false);
  const [receiptFinanceEditApprovalId, setReceiptFinanceEditApprovalId] = useState('');
  /** movementId -> drafts for per-payment treasury correction */
  const [paymentCorrectionDrafts, setPaymentCorrectionDrafts] = useState({});
  /** Receipts tab: list paging & sort */
  const RECEIPTS_PAGE_SIZE = 10;
  const [receiptsSortKey, setReceiptsSortKey] = useState('date');
  const [receiptsSortDir, setReceiptsSortDir] = useState('desc');
  const [receiptsPage, setReceiptsPage] = useState(0);

   
  useEffect(() => {
    if (!ws?.hasWorkspaceData || !ws?.snapshot) {
      setBankAccounts([]);
      setCustomerRefunds([]);
      setExpenses([]);
      setPayRequests([]);
      setFundMovements([]);
      setBankReconciliation([]);
      return;
    }
    const s = ws.snapshot;
    if (Array.isArray(s.treasuryAccounts)) {
      setBankAccounts(s.treasuryAccounts.map((a) => ({ ...a })));
    } else {
      setBankAccounts([]);
    }
    if (Array.isArray(s.refunds)) {
      setCustomerRefunds(s.refunds.map((r) => normalizeRefund(r)));
    } else {
      setCustomerRefunds([]);
    }
    if (Array.isArray(s.expenses)) {
      setExpenses(s.expenses.map((x) => ({ ...x })));
    } else {
      setExpenses([]);
    }
    if (Array.isArray(s.paymentRequests)) {
      setPayRequests(s.paymentRequests.map((x) => normalizePaymentRequest(x)));
    } else {
      setPayRequests([]);
    }
    if (Array.isArray(s.treasuryMovements)) {
      setFundMovements(
        s.treasuryMovements
          .filter((m) => m.sourceKind === 'TREASURY_TRANSFER' && m.type === 'INTERNAL_TRANSFER_OUT')
          .map((m) => {
            const twin = s.treasuryMovements.find(
              (row) =>
                row.sourceKind === 'TREASURY_TRANSFER' &&
                row.sourceId === m.sourceId &&
                row.type === 'INTERNAL_TRANSFER_IN'
            );
            return {
              id: m.sourceId || m.id,
              at: String(m.postedAtISO || '').slice(0, 10),
              fromName: m.accountName,
              toName: twin?.accountName || '—',
              amountNgn: Math.abs(m.amountNgn || 0),
              reference: m.reference || twin?.reference || '—',
            };
          })
      );
    } else {
      setFundMovements([]);
    }
    if (Array.isArray(s.bankReconciliation)) {
      setBankReconciliation(s.bankReconciliation.map((x) => ({ ...x })));
    } else {
      setBankReconciliation([]);
    }
  }, [ws?.refreshEpoch, ws?.hasWorkspaceData]);
   

  const [expenseForm, setExpenseForm] = useState({
    expenseType: 'COGS — materials & stock',
    amountNgn: '',
    date: '',
    category: '',
    paymentMethod: 'Bank Transfer',
    debitAccountId: '',
    reference: '',
  });

  const [requestForm, setRequestForm] = useState(() => ({
    ...initialExpenseRequestFormState(),
    requestDate: '',
    requestReference: '',
    expenseCategory: '',
    description: '',
    attachment: null,
  }));
  const payRequestFileRef = useRef(null);
  const activeActorLabel = ws?.session?.user?.displayName ?? 'Finance';
  const canPayRequests = ws?.hasPermission?.('finance.pay');
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const branchOptions = useMemo(
    () => ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [],
    [ws?.snapshot?.workspaceBranches, ws?.session?.branches]
  );
  const branchNameById = useMemo(
    () =>
      Object.fromEntries(
        branchOptions.map((b) => [String(b.id || '').trim(), b.name || b.code || b.id || 'Unknown branch'])
      ),
    [branchOptions]
  );
  const totals = useMemo(() => {
    const cash = bankAccounts.reduce((acc, curr) => acc + curr.balance, 0);
    return { cash };
  }, [bankAccounts]);

  const liveQuotations = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.quotations) ? ws.snapshot.quotations : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.quotations]
  );
  const liveReceipts = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.receipts) ? ws.snapshot.receipts : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.receipts]
  );
  const liveTreasuryMovements = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.treasuryMovements) ? ws.snapshot.treasuryMovements : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.treasuryMovements]
  );
  const liveLedgerEntries = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.ledgerEntries) ? ws.snapshot.ledgerEntries : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.ledgerEntries]
  );

  const treasuryTransferRows = useMemo(() => {
    const transferKinds = new Set(['TREASURY_TRANSFER', 'INTER_BRANCH_LOAN', 'INTER_BRANCH_LOAN_REPAY']);
    return liveTreasuryMovements
      .filter((m) => transferKinds.has(m.sourceKind) && m.type === 'INTERNAL_TRANSFER_OUT')
      .map((m) => {
        const twin = liveTreasuryMovements.find(
          (row) =>
            row.sourceKind === m.sourceKind &&
            row.sourceId === m.sourceId &&
            row.type === 'INTERNAL_TRANSFER_IN'
        );
        const tag =
          m.sourceKind === 'INTER_BRANCH_LOAN'
            ? 'Inter-branch lend'
            : m.sourceKind === 'INTER_BRANCH_LOAN_REPAY'
              ? 'Inter-branch repay'
              : 'Transfer';
        return {
          id: m.sourceId || m.id,
          at: String(m.postedAtISO || '').slice(0, 10),
          fromName: m.accountName,
          toName: twin?.accountName || '—',
          amountNgn: Math.abs(m.amountNgn || 0),
          reference: [tag, m.reference || twin?.reference || '—'].filter(Boolean).join(' · '),
        };
      });
  }, [liveTreasuryMovements]);

  const treasuryInflowsNgn = useMemo(
    () =>
      liveTreasuryMovements
        .filter((m) => ['RECEIPT_IN', 'ADVANCE_IN'].includes(m.type))
        .reduce((sum, m) => sum + Math.max(0, m.amountNgn || 0), 0),
    [liveTreasuryMovements]
  );

  const treasuryOutflowsNgn = useMemo(
    () =>
      liveTreasuryMovements
        .filter((m) =>
          [
            'EXPENSE',
            'AP_PAYMENT',
            'SUPPLIER_PAYMENT',
            'PO_SUPPLIER_PAYMENT',
            'REFUND_PAYOUT',
            'ADVANCE_REFUND_OUT',
            'PAYMENT_REQUEST_OUT',
            'TRANSPORT_PAYMENT',
          ].includes(m.type)
        )
        .reduce((sum, m) => sum + Math.abs(Math.min(0, m.amountNgn || 0)), 0),
    [liveTreasuryMovements]
  );

  const movementRows = useMemo(
    () => (ws?.hasWorkspaceData ? treasuryTransferRows : fundMovements),
    [fundMovements, treasuryTransferRows, ws?.hasWorkspaceData]
  );

  const receivablesNgn = useMemo(
    () => liveReceivablesNgn(liveQuotations, liveLedgerEntries),
    [liveLedgerEntries, liveQuotations]
  );

  const reconciliationFlags = useMemo(
    () =>
      bankReconciliation.filter((l) => l.status === 'Review' || l.status === 'PendingManager').length,
    [bankReconciliation]
  );

  const isAnyModalOpen =
    showPaymentEntry ||
    showAddBank ||
    showExpenseModal ||
    showPayRequestModal ||
    showTransferModal ||
    showRefundPayModal ||
    statementAccount != null ||
    receiptFinanceRow != null;

  const accountStatementLines = useMemo(() => {
    if (!statementAccount) return [];
    const id = Number(statementAccount.id);
    return liveTreasuryMovements
      .filter((m) => Number(m.treasuryAccountId) === id)
      .slice()
      .sort((a, b) => {
        const ta = String(a.postedAtISO || '');
        const tb = String(b.postedAtISO || '');
        if (ta !== tb) return tb.localeCompare(ta);
        return String(b.id || '').localeCompare(String(a.id || ''));
      });
  }, [statementAccount, liveTreasuryMovements]);

   
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get('treasuryRef')?.trim();
    if (!ref) return;
    setActiveTab('treasury');
    setSearchQuery(ref);
  }, [location.search]);

  useEffect(() => {
    const ref = new URLSearchParams(location.search).get('treasuryRef')?.trim();
    if (!ref || !ws?.hasWorkspaceData) return;
    const m = liveTreasuryMovements.find(
      (x) =>
        String(x.id) === ref ||
        String(x.reference || '')
          .trim()
          .toLowerCase() === ref.toLowerCase() ||
        String(x.sourceId || '')
          .trim()
          .toLowerCase() === ref.toLowerCase()
    );
    if (m) {
      const acc = bankAccounts.find((a) => Number(a.id) === Number(m.treasuryAccountId));
      if (acc) setStatementAccount(acc);
    }
  }, [location.search, liveTreasuryMovements, bankAccounts, ws?.hasWorkspaceData]);
   

  const refundsAwaitingPay = useMemo(
    () => approvedRefundsAwaitingPayment(customerRefunds),
    [customerRefunds]
  );
  const auditQueue = useMemo(
    () => openAuditQueue(bankReconciliation, payRequests, customerRefunds),
    [bankReconciliation, customerRefunds, payRequests]
  );
  const refundPayTotalNgn = useMemo(
    () => refundPayLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
    [refundPayLines]
  );

  const updateRefundPayLine = (lineId, patch) => {
    setRefundPayLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };

  const addRefundPayLine = () => {
    setRefundPayLines((prev) => [...prev, createRequestPayLine(bankAccounts[0]?.id ?? '')]);
  };

  const removeRefundPayLine = (lineId) => {
    setRefundPayLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== lineId)));
  };

  const openRefundPay = (row) => {
    setRefundPayTarget(row);
    setRefundPaidBy('');
    setRefundPayLines([createRequestPayLine(bankAccounts[0]?.id ?? '', refundOutstandingAmount(row))]);
    setRefundPaymentNote(row.paymentNote || '');
    setShowRefundPayModal(true);
  };

  const confirmRefundPaid = async (e) => {
    e.preventDefault();
    if (!refundPayTarget?.refundID) return;
    const paidBy = refundPaidBy.trim() || activeActorLabel;
    const rid = refundPayTarget.refundID;
    const outstanding = refundOutstandingAmount(refundPayTarget);
    const validLines = refundPayLines
      .map((line) => ({
        treasuryAccountId: Number(line.treasuryAccountId),
        amountNgn: Number(line.amount) || 0,
        reference: line.reference.trim(),
      }))
      .filter((line) => line.treasuryAccountId && line.amountNgn > 0);
    if (validLines.length === 0) {
      showToast('Add at least one refund payout line.', { variant: 'error' });
      return;
    }
    if (refundPayTotalNgn <= 0) {
      showToast('Refund payout total must be positive.', { variant: 'error' });
      return;
    }
    if (refundPayTotalNgn > outstanding) {
      showToast('Refund payout exceeds the approved outstanding balance.', { variant: 'error' });
      return;
    }
    const refundShortAccount = bankAccounts.find((account) => {
      const applied = validLines
        .filter((line) => line.treasuryAccountId === account.id)
        .reduce((sum, line) => sum + line.amountNgn, 0);
      return applied > account.balance;
    });
    if (refundShortAccount) {
      showToast(`Insufficient balance in ${refundShortAccount.name}.`, { variant: 'error' });
      return;
    }
    if (ws?.canMutate) {
      const { ok, data } = await apiFetch(`/api/refunds/${encodeURIComponent(rid)}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          paidBy,
          paidAtISO: new Date().toISOString().slice(0, 10),
          note: refundPaymentNote.trim(),
          paymentLines: validLines,
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not record refund payout.', { variant: 'error' });
        return;
      }
      await ws.refresh();
    } else {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to record refund payouts — workspace is read-only.'
          : 'Connect to the API to record refund payouts.',
        { variant: 'info' }
      );
      return;
    }
    setShowRefundPayModal(false);
    setRefundPayTarget(null);
    setRefundPaidBy('');
    setRefundPayLines([]);
    setRefundPaymentNote('');
    showToast(
      refundPayTotalNgn >= outstanding
        ? `Refund ${rid} fully paid and treasury updated.`
        : `Refund ${rid} part-paid and treasury updated.`
    );
  };

  const requestPayTotalNgn = useMemo(
    () => requestPayLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
    [requestPayLines]
  );

  const updateRequestPayLine = (lineId, patch) => {
    setRequestPayLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };

  const addRequestPayLine = () => {
    setRequestPayLines((prev) => [...prev, createRequestPayLine(bankAccounts[0]?.id ?? '')]);
  };

  const removeRequestPayLine = (lineId) => {
    setRequestPayLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== lineId)));
  };

  const openRequestPayment = (req) => {
    const paidAmountNgn = Number(req.paidAmountNgn) || 0;
    const outstanding = Math.max(0, (Number(req.amountRequestedNgn) || 0) - paidAmountNgn);
    if (req.approvalStatus !== 'Approved') {
      showToast('Approve this request before recording treasury payout.', { variant: 'info' });
      return;
    }
    if (!canPayRequests) {
      showToast('You do not have permission to post treasury payout for this request.', { variant: 'error' });
      return;
    }
    if (outstanding <= 0) {
      showToast('This payment request is already fully paid.', { variant: 'info' });
      return;
    }
    if (!ws?.viewAllBranches && req?.branchId && ws?.branchScope && req.branchId !== ws.branchScope) {
      showToast(`This request belongs to ${req.branchId}. Switch branch before payout.`, { variant: 'error' });
      return;
    }
    setSelectedPayment({
      type: 'payment_request',
      id: req.requestID,
      category: req.description,
      total: Number(req.amountRequestedNgn) || 0,
      paid: paidAmountNgn,
      date: req.requestDate,
      desc: req.expenseID,
    });
    setRequestPayLines([createRequestPayLine(bankAccounts[0]?.id ?? '', outstanding)]);
    setRequestPayNote(req.paymentNote || '');
    setShowPaymentEntry(true);
  };

  const openPoTransportTreasuryPayout = (row) => {
    const outstanding = Math.max(0, Number(row.outstandingNgn) || 0);
    if (outstanding <= 0) {
      showToast('This PO transport fee is already fully paid from treasury.', { variant: 'info' });
      return;
    }
    if (!canPayRequests) {
      showToast('You do not have permission to post treasury transport payments.', { variant: 'error' });
      return;
    }
    if (!ws?.viewAllBranches && row?.branchId && ws?.branchScope && row.branchId !== ws.branchScope) {
      showToast(`This PO belongs to ${row.branchId}. Switch branch before payout.`, { variant: 'error' });
      return;
    }
    setSelectedPayment({
      type: 'po_transport',
      id: row.poID,
      total: Number(row.transportAmountNgn) || 0,
      paid: Number(row.transportPaidNgn) || 0,
      desc: row.supplierName || 'Supplier',
      category: row.transportAgentName ? `${row.transportAgentName} · Haulage` : 'PO transport / haulage',
      branchId: row.branchId || '',
    });
    setRequestPayLines([createRequestPayLine(bankAccounts[0]?.id ?? '', outstanding)]);
    setRequestPayNote(row.transportFinanceAdvice || '');
    setShowPaymentEntry(true);
  };

  const confirmProcessPaymentModal = async () => {
    if (!selectedPayment?.id) return;

    const outstanding = Math.max(0, (selectedPayment.total ?? 0) - (selectedPayment.paid ?? 0));
    const validLines = requestPayLines
      .map((line) => ({
        treasuryAccountId: Number(line.treasuryAccountId),
        amountNgn: Number(line.amount) || 0,
        reference: line.reference.trim(),
      }))
      .filter((line) => line.treasuryAccountId && line.amountNgn > 0);

    if (validLines.length === 0) {
      showToast('Add at least one payout line.', { variant: 'error' });
      return;
    }
    if (requestPayTotalNgn <= 0) {
      showToast('Payout total must be positive.', { variant: 'error' });
      return;
    }
    if (requestPayTotalNgn > outstanding) {
      showToast('Payout total exceeds the outstanding balance for this item.', { variant: 'error' });
      return;
    }
    const requestShortAccount = bankAccounts.find((account) => {
      const applied = validLines
        .filter((line) => line.treasuryAccountId === account.id)
        .reduce((sum, line) => sum + line.amountNgn, 0);
      return applied > account.balance;
    });
    if (requestShortAccount) {
      showToast(`Insufficient balance in ${requestShortAccount.name}.`, { variant: 'error' });
      return;
    }

    if (selectedPayment.type === 'po_transport') {
      if (!canPayRequests) {
        showToast('You do not have permission to post treasury transport payments.', { variant: 'error' });
        return;
      }
      if (!ws?.viewAllBranches && selectedPayment.branchId && ws?.branchScope && selectedPayment.branchId !== ws.branchScope) {
        showToast(`This PO belongs to ${selectedPayment.branchId}. Switch branch before payout.`, { variant: 'error' });
        return;
      }
      if (!ws?.canMutate) {
        showToast(
          ws?.usingCachedData
            ? 'Reconnect to post transport payments — workspace is read-only.'
            : 'Connect to the API to post transport payments.',
          { variant: 'info' }
        );
        return;
      }
      const dateISO = new Date().toISOString().slice(0, 10);
      const poId = String(selectedPayment.id);
      for (const line of validLines) {
        const { ok, data } = await apiFetch(`/api/purchase-orders/${encodeURIComponent(poId)}/post-transport`, {
          method: 'POST',
          body: JSON.stringify({
            treasuryAccountId: line.treasuryAccountId,
            amountNgn: line.amountNgn,
            reference: line.reference || poId,
            dateISO,
            note: requestPayNote.trim() || 'PO transport / haulage',
            createdBy: activeActorLabel,
          }),
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not record transport treasury payment.', { variant: 'error' });
          await ws.refresh();
          return;
        }
      }
      await ws.refresh();
      const fullyPaid = requestPayTotalNgn >= outstanding;
      setShowPaymentEntry(false);
      setSelectedPayment(null);
      setRequestPayLines([]);
      setRequestPayNote('');
      showToast(
        fullyPaid
          ? `PO ${poId} transport fee fully paid from treasury.`
          : `PO ${poId} transport part-paid from treasury.`
      );
      return;
    }

    if (selectedPayment.type !== 'payment_request') return;

    if (ws?.canMutate) {
      const { ok, data } = await apiFetch(`/api/payment-requests/${encodeURIComponent(selectedPayment.id)}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          paidAtISO: new Date().toISOString().slice(0, 10),
          note: requestPayNote.trim(),
          paymentLines: validLines,
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not record payout for this request.', { variant: 'error' });
        return;
      }
      await ws.refresh();
    } else {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to record payouts — workspace is read-only.'
          : 'Connect to the API to record payment request payouts.',
        { variant: 'info' }
      );
      return;
    }

    const fullyPaid = requestPayTotalNgn >= outstanding;
    setShowPaymentEntry(false);
    setSelectedPayment(null);
    setRequestPayLines([]);
    setRequestPayNote('');
    showToast(
      fullyPaid
        ? `Payment request ${selectedPayment.id} fully paid from treasury.`
        : `Payment request ${selectedPayment.id} part-paid from treasury.`
    );
  };

  const accountTabs = useMemo(
    () => [
      { id: 'treasury', icon: <Landmark size={16} />, label: 'Treasury' },
      { id: 'receipts', icon: <Banknote size={16} />, label: 'Receipts & recon' },
      { id: 'movements', icon: <ArrowRightLeft size={16} />, label: 'Movements' },
      { id: 'disbursements', icon: <ClipboardList size={16} />, label: 'Expenses & requests' },
      { id: 'audit', icon: <ShieldCheck size={16} />, label: 'Audit' },
    ],
    []
  );

  const handleAccountTabChange = useCallback(
    (tabId) => {
      setActiveTab(tabId);
      if (tabId === 'treasury') {
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ tab: tabId }, { replace: true });
      }
    },
    [setSearchParams]
  );

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && TAB_LABELS[t]) setActiveTab(t);
  }, [searchParams]);

  const canManageTreasury = Boolean(ws?.hasPermission?.('treasury.manage'));
  const canExecTreasuryDelete =
    Boolean(ws?.canMutate) &&
    ['admin', 'md', 'ceo'].includes(String(ws?.session?.user?.roleKey || '').toLowerCase());

  const headerAction = () => {
    if (activeTab === 'treasury') {
      setNewBank(emptyBankForm());
      setShowAddBank(true);
    }
    if (activeTab === 'movements') {
      setTransferForm({
        fromId: bankAccounts[0] ? String(bankAccounts[0].id) : '',
        toId: bankAccounts[1]
          ? String(bankAccounts[1].id)
          : bankAccounts[0]
            ? String(bankAccounts[0].id)
            : '',
        amountNgn: '',
        reference: '',
      });
      setShowTransferModal(true);
    }
  };

  const newRecordLabel =
    activeTab === 'treasury' && canManageTreasury
      ? 'New account'
      : activeTab === 'movements'
        ? 'New transfer'
        : null;

   
  useEffect(() => {
    const st = location.state;
    if (!st || typeof st !== 'object') return;

    const tab = st.accountsTab;
    if (tab === 'requests' || tab === 'payments') {
      handleAccountTabChange('disbursements');
      navigate({ pathname: location.pathname, search: '?tab=disbursements' }, { replace: true, state: {} });
      return;
    }

    if (tab && TAB_LABELS[tab]) {
      handleAccountTabChange(tab);
      navigate(
        { pathname: location.pathname, search: tab === 'treasury' ? '' : `?tab=${encodeURIComponent(tab)}` },
        { replace: true, state: {} }
      );
      return;
    }

    if (st.openPayRequestModal) {
      handleAccountTabChange('disbursements');
      setRequestForm({
        ...initialExpenseRequestFormState(),
        requestDate: todayIso,
        requestReference: '',
        expenseCategory: '',
        description: '',
        attachment: null,
      });
      if (payRequestFileRef.current) payRequestFileRef.current.value = '';
      setShowPayRequestModal(true);
      navigate({ pathname: location.pathname, search: '?tab=disbursements' }, { replace: true, state: {} });
      return;
    }

    if (st.openExpenseModal) {
      handleAccountTabChange('disbursements');
      setExpenseForm((f) => ({
        ...f,
        debitAccountId: String(bankAccounts[0]?.id ?? ''),
      }));
      setShowExpenseModal(true);
      navigate({ pathname: location.pathname, search: '?tab=disbursements' }, { replace: true, state: {} });
    }
  }, [
    location.state,
    location.pathname,
    navigate,
    handleAccountTabChange,
    todayIso,
    bankAccounts,
  ]);
   

  const salesReceipts = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.receipts) ? [...ws.snapshot.receipts] : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.receipts]
  );

  /** Saved reconciliation drops off the queue unless the user has finance approval (MD desk). */
  const canReviseFinalizedReceiptSettlement = Boolean(ws?.hasPermission?.('finance.approve'));

  const receiptsVisibleInReconciliationQueue = useMemo(() => {
    return salesReceipts.filter((r) => {
      if (!r.financeReconciliationSavedAtISO) return true;
      return canReviseFinalizedReceiptSettlement;
    });
  }, [salesReceipts, canReviseFinalizedReceiptSettlement]);

  const filteredSalesReceipts = useMemo(() => {
    const qq = searchQuery.trim().toLowerCase();
    if (!qq) return receiptsVisibleInReconciliationQueue;
    return receiptsVisibleInReconciliationQueue.filter((r) => {
      const id = String(r.id || '').toLowerCase();
      const cust = String(r.customer || '').toLowerCase();
      const qref = String(r.quotationRef || '').toLowerCase();
      return id.includes(qq) || cust.includes(qq) || qref.includes(qq);
    });
  }, [receiptsVisibleInReconciliationQueue, searchQuery]);

  const sortedFilteredSalesReceipts = useMemo(() => {
    const rows = [...filteredSalesReceipts];
    const mult = receiptsSortDir === 'asc' ? 1 : -1;
    const cashOrQuote = (r) =>
      r.cashReceivedNgn != null ? Number(r.cashReceivedNgn) || 0 : Number(r.amountNgn) || 0;
    rows.sort((a, b) => {
      if (receiptsSortKey === 'date') {
        const c = String(a.dateISO || a.date || '').localeCompare(String(b.dateISO || b.date || ''));
        if (c !== 0) return mult * c;
      } else if (receiptsSortKey === 'id') {
        const c = String(a.id).localeCompare(String(b.id));
        if (c !== 0) return mult * c;
      } else if (receiptsSortKey === 'customer') {
        const c = String(a.customer || '').localeCompare(String(b.customer || ''), undefined, {
          sensitivity: 'base',
        });
        if (c !== 0) return mult * c;
      } else if (receiptsSortKey === 'amount') {
        const ca = cashOrQuote(a);
        const cb = cashOrQuote(b);
        if (ca !== cb) return mult * (ca < cb ? -1 : 1);
      }
      return mult * String(a.id).localeCompare(String(b.id));
    });
    return rows;
  }, [filteredSalesReceipts, receiptsSortKey, receiptsSortDir]);

  const receiptsListWindow = useMemo(() => {
    const total = sortedFilteredSalesReceipts.length;
    const pageCount = Math.max(1, Math.ceil(total / RECEIPTS_PAGE_SIZE) || 1);
    const safePage = Math.min(receiptsPage, pageCount - 1);
    const start = safePage * RECEIPTS_PAGE_SIZE;
    const slice = sortedFilteredSalesReceipts.slice(start, start + RECEIPTS_PAGE_SIZE);
    const from = total === 0 ? 0 : start + 1;
    const to = Math.min(start + RECEIPTS_PAGE_SIZE, total);
    return { total, pageCount, safePage, slice, from, to };
  }, [sortedFilteredSalesReceipts, receiptsPage]);

  useEffect(() => {
    setReceiptsPage(0);
  }, [receiptsSortKey, receiptsSortDir, searchQuery]);

  useEffect(() => {
    const total = sortedFilteredSalesReceipts.length;
    const pageCount = Math.max(1, Math.ceil(total / RECEIPTS_PAGE_SIZE) || 1);
    setReceiptsPage((p) => Math.min(p, pageCount - 1));
  }, [sortedFilteredSalesReceipts.length]);

  const canFinanceReceiptSettlement = Boolean(
    ws?.hasPermission?.('finance.pay') || ws?.hasPermission?.('finance.post')
  );

  const openReceiptFinance = useCallback(
    (r) => {
      setReceiptFinanceEditApprovalId('');
      setReceiptFinanceRow(r);
      const allocated = Number(r.amountNgn) || 0;
      const cash = r.cashReceivedNgn != null ? Number(r.cashReceivedNgn) || allocated : allocated;
      const br =
        r.bankReceivedAmountNgn != null ? Number(r.bankReceivedAmountNgn) : cash;
      setReceiptBankAmtInput(String(br));
      setReceiptClearDelivery(Boolean(r.financeDeliveryClearedAtISO));
      const splits = receiptLedgerReceiptTreasurySplits(r, liveTreasuryMovements);
      setPaymentCorrectionDrafts(
        Object.fromEntries(
          splits.map((s) => [
            s.movementId,
            {
              amountNgn: String(s.amountNgn),
              treasuryAccountId: String(s.treasuryAccountId ?? ''),
              postedDate: String(s.postedAtISO || '').slice(0, 10) || todayIso,
              note: '',
            },
          ])
        )
      );
    },
    [liveTreasuryMovements, todayIso]
  );

  const receiptSettlementReadOnly = Boolean(
    receiptFinanceRow?.financeReconciliationSavedAtISO && !canReviseFinalizedReceiptSettlement
  );

  const saveReceiptFinance = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (!receiptFinanceRow?.id) return;
      if (receiptFinanceRow.financeReconciliationSavedAtISO && !canReviseFinalizedReceiptSettlement) {
        return;
      }
      if (!ws?.canMutate) {
        showToast(
          ws?.usingCachedData
            ? 'Server is offline or session expired — refresh the page, then sign in and try again.'
            : 'Connect to the API server to save settlement.',
          { variant: 'error' }
        );
        return;
      }
      const settleSplits = receiptLedgerReceiptTreasurySplits(receiptFinanceRow, liveTreasuryMovements);
      const paymentLineCorrections = [];
      for (const s of settleSplits) {
        const d = paymentCorrectionDrafts[s.movementId];
        const draft =
          d ?? {
            amountNgn: String(s.amountNgn),
            treasuryAccountId: String(s.treasuryAccountId ?? ''),
            postedDate: String(s.postedAtISO || '').slice(0, 10) || todayIso,
            note: '',
          };
        const amountNgn = Math.round(Number(String(draft.amountNgn).replace(/,/g, '')) || 0);
        const treasuryAccountId = Number(draft.treasuryAccountId);
        if (!treasuryAccountId) {
          showToast('Select the treasury account (bank or cash) for each payment line.', { variant: 'error' });
          return;
        }
        if (amountNgn <= 0) {
          showToast('Each payment line amount must be greater than zero.', { variant: 'error' });
          return;
        }
        const line = { movementId: s.movementId, amountNgn, treasuryAccountId };
        if (draft.postedDate) {
          line.postedAtISO = `${draft.postedDate}T12:00:00.000Z`;
        }
        if (String(draft.note || '').trim()) {
          line.note = String(draft.note).trim();
        }
        paymentLineCorrections.push(line);
      }

      setReceiptFinanceBusy(true);
      try {
        const { ok, status, data } = await apiFetch(
          `/api/sales-receipts/${encodeURIComponent(receiptFinanceRow.id)}/finance-settlement`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bankReceivedAmountNgn: Math.round(
                Number(String(receiptBankAmtInput).replace(/,/g, '')) || 0
              ),
              clearForDelivery: receiptClearDelivery,
              paymentLineCorrections,
              ...(receiptFinanceEditApprovalId.trim()
                ? { editApprovalId: receiptFinanceEditApprovalId.trim() }
                : {}),
            }),
          }
        );
        if (!ok || !data?.ok) {
          const hint = data?.code === 'CSRF_INVALID' ? ' Refresh the page and try again.' : '';
          showToast((data?.error || `Could not save settlement (${status}).`) + hint, { variant: 'error' });
          return;
        }
        showToast('Saved — treasury balances updated and reconciliation finalized.');
        setReceiptFinanceEditApprovalId('');
        setReceiptFinanceRow(null);
        setPaymentCorrectionDrafts({});
        await ws.refresh();
      } finally {
        setReceiptFinanceBusy(false);
      }
    },
    [
      receiptFinanceRow,
      receiptBankAmtInput,
      receiptClearDelivery,
      receiptFinanceEditApprovalId,
      paymentCorrectionDrafts,
      liveTreasuryMovements,
      todayIso,
      canReviseFinalizedReceiptSettlement,
      ws.refresh,
      showToast,
    ]
  );

  const saveExpense = async (e) => {
    e.preventDefault();
    const amount = Number(expenseForm.amountNgn);
    const debitId = Number(expenseForm.debitAccountId);
    if (!expenseForm.category.trim() || Number.isNaN(amount) || amount <= 0) return;
    if (!debitId) {
      showToast('Select the account paying this expense.', { variant: 'error' });
      return;
    }
    const debitAcc = bankAccounts.find((a) => a.id === debitId);
    if (!debitAcc || debitAcc.balance < amount) {
      showToast('Selected account has insufficient balance.', { variant: 'error' });
      return;
    }
    const row = {
      expenseType: expenseForm.expenseType,
      amountNgn: amount,
      date: expenseForm.date || new Date().toISOString().slice(0, 10),
      category: expenseForm.category.trim(),
      paymentMethod: expenseForm.paymentMethod,
      debitAccountId: debitId,
      reference: expenseForm.reference.trim() || '—',
    };
    if (ws?.canMutate) {
      const { ok, data } = await apiFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          ...row,
          treasuryAccountId: debitId,
          createdBy: activeActorLabel,
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not save expense on server.', { variant: 'error' });
        return;
      }
      await ws.refresh();
    } else {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to save expenses — workspace is read-only.'
          : 'Connect to the API to record expenses.',
        { variant: 'info' }
      );
      return;
    }
    setExpenseForm({
      expenseType: 'COGS — materials & stock',
      amountNgn: '',
      date: '',
      category: '',
      paymentMethod: 'Bank Transfer',
      debitAccountId: String(bankAccounts[0]?.id ?? ''),
      reference: '',
    });
    setShowExpenseModal(false);
    showToast('Expense recorded and synced.');
  };

  const savePayRequest = async (e) => {
    e.preventDefault();
    const body = buildPaymentRequestBodyFromForm(requestForm);
    if (!String(body.expenseCategory || '').trim()) {
      showToast('Select an expense category from the list.', { variant: 'error' });
      return;
    }
    if (!body.lineItems?.length) {
      showToast('Add at least one line with description, quantity, and unit price.', { variant: 'error' });
      return;
    }
    if (ws?.canMutate) {
      const { ok, data } = await apiFetch('/api/payment-requests', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not save request on server.', { variant: 'error' });
        return;
      }
      await ws.refresh();
    } else {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to submit payment requests — workspace is read-only.'
          : 'Connect to the API to submit payment requests.',
        { variant: 'info' }
      );
      return;
    }
    setRequestForm({
      ...initialExpenseRequestFormState(),
      requestDate: '',
      requestReference: '',
      expenseCategory: '',
      description: '',
      attachment: null,
    });
    if (payRequestFileRef.current) payRequestFileRef.current.value = '';
    setShowPayRequestModal(false);
    showToast('Expense request submitted for approval.');
  };

  const openEditTreasuryAccount = (acc) => {
    setNewBank({
      id: acc.id,
      name: acc.name || '',
      bankName: acc.bankName || '',
      type: acc.type === 'Cash' ? 'Cash' : 'Bank',
      accNo: acc.accNo || '',
      balance: acc.balance != null ? String(acc.balance) : '',
      accountOfficerName: acc.accountOfficerName || '',
      accountOfficerPhone: acc.accountOfficerPhone || '',
      bankBranch: acc.bankBranch || '',
      sortCodeOrSwift: acc.sortCodeOrSwift || '',
      notes: acc.notes || '',
    });
    setShowAddBank(true);
  };

  const removeTreasuryAccount = async (acc) => {
    if (!canExecTreasuryDelete) return;
    const label = String(acc?.name || 'this account').trim() || 'this account';
    if (
      !window.confirm(
        `Delete treasury account “${label}”? Only Admin, MD, or CEO can do this. The account must have exactly ₦0 book balance, no movement history, no bank reconciliation links, and you cannot remove the last account.`
      )
    ) {
      return;
    }
    const { ok, data } = await apiFetch(`/api/treasury/accounts/${encodeURIComponent(acc.id)}`, {
      method: 'DELETE',
    });
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not delete account.', { variant: 'error' });
      return;
    }
    if (statementAccount && String(statementAccount.id) === String(acc.id)) {
      setStatementAccount(null);
    }
    await ws.refresh();
    showToast('Treasury account removed.');
  };

  const saveBankAccount = async (e) => {
    e.preventDefault();
    const bal = Number(newBank.balance || 0);
    const accName = newBank.name.trim();
    if (!accName) return;
    if (ws?.canMutate) {
      const body = {
        name: accName,
        bankName: newBank.bankName.trim(),
        type: newBank.type,
        accNo: newBank.accNo.trim() || 'N/A',
        balance: Number.isNaN(bal) ? 0 : bal,
        accountOfficerName: newBank.accountOfficerName.trim(),
        accountOfficerPhone: newBank.accountOfficerPhone.trim(),
        bankBranch: newBank.bankBranch.trim(),
        sortCodeOrSwift: newBank.sortCodeOrSwift.trim(),
        notes: newBank.notes.trim(),
      };
      if (newBank.id != null && newBank.id !== '') {
        const nid = typeof newBank.id === 'number' ? newBank.id : Number(newBank.id);
        if (Number.isFinite(nid)) body.id = nid;
      }
      const { ok, data } = await apiFetch('/api/treasury/accounts', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not save treasury on server.', { variant: 'error' });
        return;
      }
      await ws.refresh();
    } else {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to add treasury accounts — workspace is read-only.'
          : 'Connect to the API to add treasury accounts.',
        { variant: 'info' }
      );
      return;
    }
    const wasEdit = newBank.id != null && newBank.id !== '';
    setNewBank(emptyBankForm());
    setShowAddBank(false);
    showToast(wasEdit ? `Account “${accName}” updated.` : `Account “${accName}” added to treasury.`);
  };

  const saveTransfer = async (e) => {
    e.preventDefault();
    const fromId = Number(transferForm.fromId);
    const toId = Number(transferForm.toId);
    const amount = Number(transferForm.amountNgn);
    if (!fromId || !toId || fromId === toId) {
      showToast('Choose two different accounts.', { variant: 'error' });
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      showToast('Enter a valid amount.', { variant: 'error' });
      return;
    }
    const fromAcc = bankAccounts.find((a) => a.id === fromId);
    if (!fromAcc || fromAcc.balance < amount) {
      showToast('Insufficient balance in source account.', { variant: 'error' });
      return;
    }
    if (ws?.canMutate) {
      const { ok, data } = await apiFetch('/api/treasury/transfer', {
        method: 'POST',
        body: JSON.stringify({
          fromId,
          toId,
          amountNgn: amount,
          reference: transferForm.reference.trim(),
          createdBy: activeActorLabel,
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not sync treasury.', { variant: 'error' });
        return;
      }
      await ws.refresh();
    } else {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to post transfers — workspace is read-only.'
          : 'Connect to the API to post treasury transfers.',
        { variant: 'info' }
      );
      return;
    }
    setTransferForm({ fromId: '', toId: '', amountNgn: '', reference: '' });
    setShowTransferModal(false);
    showToast('Fund movement posted — both accounts updated.');
  };

  useEffect(() => {
    if (activeTab !== 'movements' || !ws?.hasWorkspaceData || !ws.hasPermission('finance.view')) return;
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/inter-branch-loans');
      if (cancelled || !ok || !data?.ok) return;
      setInterBranchLoans(data.loans || []);
      setInterBranchBalances(data.balances || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, ws?.hasWorkspaceData, ws?.refreshEpoch]);

  const canProposeInterBranch =
    ws?.hasPermission?.('treasury.manage') && ws?.hasPermission?.('finance.post');
  const canMdInterBranchLoan = ws?.hasPermission?.('inter_branch_loan.md_approve');
  const canRepayInterBranch =
    ws?.hasPermission?.('treasury.manage') || ws?.hasPermission?.('finance.pay');

  const submitInterBranchLoan = async (e) => {
    e.preventDefault();
    let repaymentPlan;
    try {
      repaymentPlan = JSON.parse(interBranchForm.repaymentPlanJson || '[]');
      if (!Array.isArray(repaymentPlan)) throw new Error('Repayment plan must be a JSON array.');
    } catch (err) {
      showToast(String(err.message || err) || 'Invalid repayment plan JSON.', { variant: 'error' });
      return;
    }
    const principalNgn = Number(interBranchForm.principalNgn);
    if (
      !interBranchForm.lenderBranchId ||
      !interBranchForm.borrowerBranchId ||
      interBranchForm.lenderBranchId === interBranchForm.borrowerBranchId
    ) {
      showToast('Choose two different branches.', { variant: 'error' });
      return;
    }
    const fromTa = Number(interBranchForm.fromTreasuryAccountId);
    const toTa = Number(interBranchForm.toTreasuryAccountId);
    if (!fromTa || !toTa || fromTa === toTa) {
      showToast('Choose two different treasury accounts.', { variant: 'error' });
      return;
    }
    if (Number.isNaN(principalNgn) || principalNgn <= 0) {
      showToast('Enter a valid principal amount.', { variant: 'error' });
      return;
    }
    if (!ws?.canMutate) {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to propose inter-branch loans — workspace is read-only.'
          : 'Connect to the API to propose inter-branch loans.',
        { variant: 'info' }
      );
      return;
    }
    setInterBranchBusy(true);
    const { ok, data } = await apiFetch('/api/inter-branch-loans', {
      method: 'POST',
      body: JSON.stringify({
        lenderBranchId: interBranchForm.lenderBranchId,
        borrowerBranchId: interBranchForm.borrowerBranchId,
        fromTreasuryAccountId: fromTa,
        toTreasuryAccountId: toTa,
        principalNgn,
        dateISO: interBranchForm.dateISO,
        reference: interBranchForm.reference.trim(),
        proposedNote: interBranchForm.proposedNote.trim(),
        repaymentPlan,
      }),
    });
    setInterBranchBusy(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not save inter-branch loan.', { variant: 'error' });
      return;
    }
    await ws.refresh();
    showToast('Inter-branch loan proposed — awaiting MD approval.');
    setInterBranchForm((f) => ({
      ...f,
      principalNgn: '',
      reference: '',
      proposedNote: '',
    }));
  };

  const mdApproveInterBranch = async (loanId) => {
    if (!loanId || !ws?.canMutate) return;
    setInterBranchBusy(true);
    const { ok, data } = await apiFetch(`/api/inter-branch-loans/${encodeURIComponent(loanId)}/md-approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    setInterBranchBusy(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'MD approval failed.', { variant: 'error' });
      return;
    }
    await ws.refresh();
    showToast('MD approved — funds moved per proposal.');
  };

  const mdRejectInterBranch = async (loanId) => {
    if (!loanId || !ws?.canMutate) return;
    const note = window.prompt('Optional rejection note') || '';
    setInterBranchBusy(true);
    const { ok, data } = await apiFetch(`/api/inter-branch-loans/${encodeURIComponent(loanId)}/md-reject`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
    setInterBranchBusy(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not reject loan.', { variant: 'error' });
      return;
    }
    await ws.refresh();
    showToast('Loan proposal rejected.');
  };

  const submitInterBranchRepay = async (e) => {
    e.preventDefault();
    const loanId = String(interBranchRepayForm.loanId || '').trim();
    const amount = Number(interBranchRepayForm.amountNgn);
    const fromTa = Number(interBranchRepayForm.fromTreasuryAccountId);
    const toTa = Number(interBranchRepayForm.toTreasuryAccountId);
    if (!loanId) {
      showToast('Select a loan.', { variant: 'error' });
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      showToast('Enter a valid repayment amount.', { variant: 'error' });
      return;
    }
    if (!fromTa || !toTa || fromTa === toTa) {
      showToast('Choose two different treasury accounts for repayment.', { variant: 'error' });
      return;
    }
    if (!ws?.canMutate) {
      showToast('Connect to the API to post repayments.', { variant: 'info' });
      return;
    }
    setInterBranchBusy(true);
    const { ok, data } = await apiFetch(`/api/inter-branch-loans/${encodeURIComponent(loanId)}/repay`, {
      method: 'POST',
      body: JSON.stringify({
        amountNgn: amount,
        dateISO: interBranchRepayForm.dateISO,
        fromTreasuryAccountId: fromTa,
        toTreasuryAccountId: toTa,
        note: interBranchRepayForm.note.trim(),
      }),
    });
    setInterBranchBusy(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Repayment failed.', { variant: 'error' });
      return;
    }
    await ws.refresh();
    showToast('Repayment posted.');
    setInterBranchRepayForm((f) => ({
      ...f,
      loanId: '',
      amountNgn: '',
      note: '',
    }));
  };

  const filteredExpenses = useMemo(() => {
    const qq = searchQuery.trim().toLowerCase();
    if (!qq) return expenses;
    return expenses.filter((ex) => {
      const blob = [ex.expenseID, ex.category, ex.expenseType, ex.reference, ex.paymentMethod]
        .join(' ')
        .toLowerCase();
      return blob.includes(qq);
    });
  }, [expenses, searchQuery]);

  const filteredPayRequests = useMemo(() => {
    const qq = searchQuery.trim().toLowerCase();
    if (!qq) return payRequests;
    return payRequests.filter((req) => {
      const lineBlob = (req.lineItems || [])
        .map((x) => [x.item, x.lineTotalNgn, x.unitPriceNgn].filter(Boolean).join(' '))
        .join(' ');
      const blob = [
        req.requestID,
        req.expenseID,
        req.description,
        req.requestReference,
        req.expenseCategory,
        lineBlob,
        req.approvalStatus,
        req.approvedBy,
        req.paidBy,
        req.requestDate,
        req.attachmentName,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(qq);
    });
  }, [payRequests, searchQuery]);

  /** Approved with unpaid balance — surfaced on Treasury (same pattern as refunds awaiting payout). */
  const payRequestsAwaitingTreasuryPayout = useMemo(
    () =>
      filteredPayRequests.filter((req) => {
        if (req.approvalStatus !== 'Approved') return false;
        const paidAmountNgn = Number(req.paidAmountNgn) || 0;
        const outstandingNgn = Math.max(0, (Number(req.amountRequestedNgn) || 0) - paidAmountNgn);
        return outstandingNgn > 0;
      }),
    [filteredPayRequests]
  );

  const livePoTransportAwaitingTreasury = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.poTransportAwaitingTreasury)
        ? ws.snapshot.poTransportAwaitingTreasury
        : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.poTransportAwaitingTreasury, ws?.refreshEpoch]
  );

  const filteredPoTransportAwaitingTreasury = useMemo(() => {
    const qq = searchQuery.trim().toLowerCase();
    if (!qq) return livePoTransportAwaitingTreasury;
    return livePoTransportAwaitingTreasury.filter((row) => {
      const blob = [
        row.poID,
        row.supplierName,
        row.transportAgentName,
        row.transportReference,
        row.transportFinanceAdvice,
        row.status,
        row.procurementKind,
        row.branchId,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(qq);
    });
  }, [livePoTransportAwaitingTreasury, searchQuery]);

  const filteredBankAccounts = useMemo(() => {
    const qq = searchQuery.trim().toLowerCase();
    if (!qq) return bankAccounts;
    return bankAccounts.filter((a) => {
      const blob = [
        a.name,
        a.type,
        a.accNo,
        a.bankName,
        a.accountOfficerName,
        a.accountOfficerPhone,
        a.bankBranch,
        a.sortCodeOrSwift,
        a.notes,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(qq);
    });
  }, [bankAccounts, searchQuery]);

  return (
    <PageShell blurred={isAnyModalOpen}>
      <FinancePilotHeader
        eyebrow="Finance"
        title="Finance & accounts"
        subtitle="Treasury, customer receipt settlement, and approvals"
        tabs={<PageTabs tabs={accountTabs} value={activeTab} onChange={handleAccountTabChange} />}
        search={
          <div className="relative w-full min-w-0">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={16}
            />
            <input
              type="search"
              placeholder="Search this tab…"
              className="z-input-search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        }
        trailing={
          <>
            {newRecordLabel ? (
              <button type="button" onClick={headerAction} className="z-btn-primary shrink-0">
                <Plus size={16} /> {newRecordLabel}
              </button>
            ) : null}
            <AiAskButton
              mode="finance"
              prompt={
                activeTab === 'treasury'
                  ? 'Give me a short treasury and payout summary from the live workspace.'
                  : activeTab === 'receipts'
                    ? 'Summarize pending customer receipt settlement and which receipts need review first.'
                    : activeTab === 'audit'
                      ? 'Summarize the audit and reconciliation queue and what needs action first.'
                      : 'Summarize the current finance workload and the next best actions.'
              }
              pageContext={{
                source: 'finance-page',
                activeTab,
                searchQuery,
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[#134e4a] shadow-[0_8px_24px_-18px_rgba(15,23,42,0.12)] transition hover:border-teal-200/60 hover:bg-teal-50/80"
            >
              Ask AI
            </AiAskButton>
          </>
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-8 lg:gap-10 lg:grid-cols-4">
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-zarewa border border-slate-200/80 border-l-[3px] border-l-[#134e4a] bg-white p-6 shadow-[var(--shadow-sequence)]">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-3">
              Total liquidity
            </h3>
            <div className="space-y-1">
              <p className="text-2xl font-black tracking-tight text-slate-900 tabular-nums">
                ₦{totals.cash.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-500 font-medium leading-snug">
                Combined bank, cash & POS floats
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleAccountTabChange('receipts')}
            className="w-full text-left rounded-zarewa border border-slate-200/75 bg-white p-5 shadow-[var(--shadow-sequence)] transition-colors hover:border-teal-200/70 cursor-pointer"
          >
            <h3 className="z-section-title flex items-center gap-2">
              <ArrowDownLeft size={14} />
              Accounts receivable
            </h3>
            <p className="text-xl font-black text-[#134e4a]">{formatNgn(receivablesNgn)}</p>
            <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-wide">
              Open balances · Settle receipts on Receipts &amp; recon tab
            </p>
          </button>

          <Link
            to="/procurement"
            state={{ focusTab: 'payables' }}
            className="block w-full text-left rounded-zarewa border border-slate-200/75 bg-white p-5 shadow-[var(--shadow-sequence)] transition-colors hover:border-teal-200/70 cursor-pointer"
          >
            <h3 className="z-section-title flex items-center gap-2">
              <Truck size={14} />
              Payments
            </h3>
            <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">
              Record supplier payments against purchase orders on Procurement →{' '}
              <span className="font-bold text-[#134e4a]">Payments</span>.
            </p>
          </Link>

          <div className="rounded-zarewa border border-slate-200/70 bg-slate-50/70 p-5 shadow-[0_12px_40px_-32px_rgba(15,23,42,0.1)]">
            <h3 className="z-section-title flex items-center gap-2">
              <Activity size={14} className="shrink-0" />
                Control note
            </h3>
            <p className="text-[9px] text-slate-500 leading-relaxed mb-3">
                Customer receipts, refunds, supplier payments, expenses, and treasury transfers now post
                live cash movements. Full general-ledger journals remain the next accounting phase.
            </p>
              <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-[10px] text-slate-600 leading-relaxed shadow-sm">
                Use the tabs here to post the operational side safely:
                expenses debit treasury, payables reduce supplier balances, and transfers create paired
                movements.
              </div>
          </div>

          <div className="rounded-zarewa border border-slate-200/70 bg-white p-4 text-[9px] text-slate-500 leading-relaxed shadow-[0_10px_36px_-30px_rgba(15,23,42,0.08)]">
            <p className="font-black uppercase tracking-wider text-[#134e4a] mb-1.5 flex items-center gap-1">
              <BookOpen size={12} />
              Principles
            </p>
            Accrual view, revenue recognition on delivery / billing, and expense matching are enforced in
            reporting once the ledger is live.
          </div>
        </div>

        <div className="lg:col-span-3">
          <FinanceSequencePanel>
            <>
            {activeTab === 'receipts' && (
              <div className="space-y-10 animate-in fade-in duration-300">
                <section className="space-y-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#134e4a]">
                        Customer receipts
                      </h3>
                      <p className="text-[11px] text-slate-600 mt-1 max-w-3xl">
                        Enter the amount that actually landed in the bank, then mark{' '}
                        <span className="font-semibold">Cleared for delivery</span> when finance is satisfied.
                        Sales no longer confirms receipts here — this desk owns settlement.
                      </p>
                    </div>
                  </div>
                  {filteredSalesReceipts.length === 0 ? (
                    <p className="text-[10px] text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-lg">
                      No receipts in this branch scope.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/70 bg-slate-50/80 px-2.5 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Sort by</span>
                          <select
                            value={receiptsSortKey}
                            onChange={(e) => setReceiptsSortKey(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-[#134e4a] outline-none focus:ring-2 focus:ring-[#134e4a]/15"
                          >
                            <option value="date">Receipt date</option>
                            <option value="id">Receipt id</option>
                            <option value="customer">Customer</option>
                            <option value="amount">Amount received</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setReceiptsSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-600"
                          >
                            {receiptsSortDir === 'asc' ? 'Ascending' : 'Descending'}
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
                          <span className="tabular-nums">
                            {receiptsListWindow.total === 0
                              ? '0 receipts'
                              : `Showing ${receiptsListWindow.from}–${receiptsListWindow.to} of ${receiptsListWindow.total}`}
                          </span>
                          <button
                            type="button"
                            disabled={receiptsListWindow.safePage <= 0}
                            onClick={() => setReceiptsPage((p) => Math.max(0, p - 1))}
                            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:opacity-40"
                            aria-label="Previous page"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="text-[9px] font-bold tabular-nums text-slate-500">
                            {receiptsListWindow.safePage + 1}/{receiptsListWindow.pageCount}
                          </span>
                          <button
                            type="button"
                            disabled={receiptsListWindow.safePage >= receiptsListWindow.pageCount - 1}
                            onClick={() => setReceiptsPage((p) => p + 1)}
                            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:opacity-40"
                            aria-label="Next page"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                      <ul className="space-y-1.5">
                        {receiptsListWindow.slice.map((r) => {
                        const allocated = Number(r.amountNgn) || 0;
                        const cash =
                          r.cashReceivedNgn != null ? Number(r.cashReceivedNgn) || allocated : allocated;
                        const bank =
                          r.bankReceivedAmountNgn != null ? Number(r.bankReceivedAmountNgn) : null;
                        const cleared = Boolean(r.financeDeliveryClearedAtISO);
                        const paySplits = receiptLedgerReceiptTreasurySplits(r, liveTreasuryMovements);
                        return (
                          <li
                            key={r.id}
                            className="rounded-xl border border-slate-200/75 bg-white py-2.5 px-3 shadow-[0_8px_28px_-22px_rgba(15,23,42,0.07)] flex flex-wrap items-center justify-between gap-2 transition-colors hover:border-slate-300/90"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-[#134e4a] font-mono">{r.id}</p>
                              <p className="text-[9px] text-slate-500 truncate">
                                {r.customer || '—'} · {r.quotationRef || '—'} · {r.dateISO || r.date || '—'}
                              </p>
                              {paySplits.length > 0 ? (
                                <ul className="mt-1.5 space-y-0.5 border-t border-dashed border-slate-200/80 pt-1.5">
                                  {paySplits.map((s) => (
                                    <li
                                      key={s.movementId}
                                      className="flex justify-between gap-2 text-[9px] text-slate-700"
                                    >
                                      <span className="min-w-0 truncate font-medium" title={s.accountLabel}>
                                        {s.accountLabel}
                                      </span>
                                      <span className="shrink-0 font-bold tabular-nums text-[#134e4a]">
                                        {formatNgn(s.amountNgn)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <span className="text-[10px] font-bold text-slate-600 tabular-nums">
                                Total {formatNgn(cash)}
                                {Math.round(allocated) !== Math.round(cash) ? (
                                  <span className="text-slate-500 font-semibold">
                                    {' '}
                                    (quote {formatNgn(allocated)})
                                  </span>
                                ) : null}
                                {bank != null && Math.round(bank) !== Math.round(cash) ? (
                                  <span className="text-amber-800"> · Bank {formatNgn(bank)}</span>
                                ) : null}
                              </span>
                              {r.financeReconciliationSavedAtISO && canReviseFinalizedReceiptSettlement ? (
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                                  Reconciled
                                </span>
                              ) : null}
                              {cleared ? (
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                                  Cleared delivery
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                                  Pending
                                </span>
                              )}
                              {canFinanceReceiptSettlement && ws?.canMutate ? (
                                <button
                                  type="button"
                                  onClick={() => openReceiptFinance(r)}
                                  className="text-[9px] font-bold uppercase px-3 py-1.5 rounded-lg bg-[#134e4a] text-white hover:bg-[#0f3d3a]"
                                >
                                  Review
                                </button>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    </>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'treasury' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200/75 bg-white px-3 py-2.5 shadow-[0_10px_36px_-28px_rgba(15,23,42,0.12)]">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Cash inflows</p>
                    <p className="text-sm font-black text-emerald-700 tabular-nums">
                      {formatNgn(
                        ws?.hasWorkspaceData
                          ? treasuryInflowsNgn
                          : liveReceipts.reduce((s, r) => s + receiptCashReceivedNgn(r), 0)
                      )}
                    </p>
                    <p className="text-[8px] text-slate-500 mt-0.5 leading-snug">Receipts and advance deposits</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/75 bg-white px-3 py-2.5 shadow-[0_10px_36px_-28px_rgba(15,23,42,0.12)]">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Cash outflows</p>
                    <p className="text-sm font-black text-[#134e4a] tabular-nums">
                      {formatNgn(ws?.hasWorkspaceData ? treasuryOutflowsNgn : expenses.reduce((s, e) => s + e.amountNgn, 0))}
                    </p>
                    <p className="text-[8px] text-slate-500 mt-0.5 leading-snug">
                      Expenses, refunds, supplier payouts, and PO haulage
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200/85 bg-amber-50/75 px-3 py-2.5 shadow-[0_10px_36px_-28px_rgba(15,23,42,0.1)]">
                    <p className="text-[9px] font-bold text-amber-800 uppercase">Reconciliation</p>
                    <p className="text-sm font-black text-amber-900">
                      {reconciliationFlags} item{reconciliationFlags !== 1 ? 's' : ''} to review
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAccountTabChange('receipts')}
                      className="text-[9px] font-black uppercase text-amber-900 mt-1 underline-offset-2 hover:underline"
                    >
                      Receipts &amp; recon tab
                    </button>
                  </div>
                </div>

                {refundsAwaitingPay.length > 0 ? (
                  <div
                    className="rounded-2xl border border-rose-200/90 bg-rose-50/50 p-5 space-y-3"
                    data-testid="finance-refunds-awaiting-payout"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-black text-rose-900 uppercase tracking-widest flex items-center gap-2">
                        <RotateCcw size={16} strokeWidth={2} />
                        Customer refunds — approved, awaiting payout
                      </p>
                      <span className="text-[10px] font-bold text-rose-800 tabular-nums">
                        {refundsAwaitingPay.length} open
                      </span>
                    </div>
                    <p className="text-[10px] text-rose-900/80 leading-relaxed">
                      Sales submits refund requests with a breakdown; managers approve. Record bank/cash
                      payment here once funds leave the business.
                    </p>
                    <ul className="space-y-1.5">
                      {refundsAwaitingPay.map((r) => {
                        const meta2 = [
                          r.quotationRef ? `Quote ${r.quotationRef}` : 'No quote ref',
                          r.approvedBy ? `Approved by ${r.approvedBy}` : null,
                          `Aprv ${formatNgn(refundApprovedAmount(r))} · Paid ${formatNgn(Number(r.paidAmountNgn) || 0)}`,
                        ]
                          .filter(Boolean)
                          .join(' · ');
                        return (
                          <li
                            key={r.refundID}
                            data-testid={`finance-refund-awaiting-row-${r.refundID}`}
                            className="rounded-lg border border-rose-200/50 bg-white/40 backdrop-blur-md py-1.5 px-2.5 shadow-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 leading-tight flex-1">
                                <p className="text-[11px] font-bold text-[#134e4a] truncate">
                                  <span className="font-mono">{r.refundID}</span>
                                  <span className="font-medium text-slate-600"> · {r.customer}</span>
                                </p>
                                <p className="text-[8px] text-slate-500 mt-0.5 leading-snug line-clamp-2" title={meta2}>
                                  {meta2}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[11px] font-black text-[#134e4a] tabular-nums">
                                  {formatNgn(refundOutstandingAmount(r))}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openRefundPay(r)}
                                  className="text-[8px] font-semibold uppercase tracking-wide text-sky-800 bg-sky-100 hover:bg-sky-200 px-2 py-1 rounded-md"
                                >
                                  Record pay
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {payRequestsAwaitingTreasuryPayout.length > 0 ? (
                  <div
                    className="rounded-2xl border border-teal-200/90 bg-teal-50/45 p-5 space-y-3"
                    data-testid="finance-payment-requests-awaiting-payout"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-black text-teal-950 uppercase tracking-widest flex items-center gap-2">
                        <Banknote size={16} strokeWidth={2} />
                        Expense payment requests — approved, awaiting payout
                      </p>
                      <span className="text-[10px] font-bold text-teal-900 tabular-nums">
                        {payRequestsAwaitingTreasuryPayout.length} open
                      </span>
                    </div>
                    <p className="text-[10px] text-teal-950/80 leading-relaxed">
                      Same flow as customer refunds: approve elsewhere, then record the bank or cash payout here so
                      balances stay accurate.
                    </p>
                    <ul className="space-y-1.5">
                      {payRequestsAwaitingTreasuryPayout.map((req) => {
                        const paidAmountNgn = Number(req.paidAmountNgn) || 0;
                        const outstandingNgn = Math.max(
                          0,
                          (Number(req.amountRequestedNgn) || 0) - paidAmountNgn
                        );
                        const meta2 = [
                          `Linked ${req.expenseID}`,
                          req.expenseCategory ? req.expenseCategory : null,
                          req.requestReference ? `Ref ${req.requestReference}` : null,
                          req.branchId ? branchNameById[req.branchId] || req.branchId : null,
                          paidAmountNgn > 0 ? `Paid ${formatNgn(paidAmountNgn)}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ');
                        return (
                          <li
                            key={req.requestID}
                            data-testid={`finance-preq-awaiting-row-${req.requestID}`}
                            className="rounded-lg border border-teal-200/55 bg-white/50 backdrop-blur-md py-1.5 px-2.5 shadow-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 leading-tight flex-1">
                                <p className="text-[11px] font-bold text-[#134e4a] truncate">
                                  <span className="font-mono">{req.requestID}</span>
                                  <span className="font-medium text-slate-600">
                                    {' '}
                                    · {req.description || req.expenseCategory || '—'}
                                  </span>
                                </p>
                                <p
                                  className="text-[8px] text-slate-500 mt-0.5 leading-snug line-clamp-2"
                                  title={meta2}
                                >
                                  {meta2}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[11px] font-black text-[#134e4a] tabular-nums">
                                  {formatNgn(outstandingNgn)}
                                </span>
                                <div className="flex flex-wrap items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => printExpenseRequestRecord(req, formatNgn)}
                                    className="text-[8px] font-semibold uppercase tracking-wide text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md inline-flex items-center gap-1"
                                    title="Print filing copy"
                                  >
                                    <Printer size={12} /> Print
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openRequestPayment(req)}
                                    className="text-[8px] font-semibold uppercase tracking-wide text-sky-800 bg-sky-100 hover:bg-sky-200 px-2 py-1 rounded-md"
                                    title="Record treasury payout"
                                  >
                                    Payout
                                  </button>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {filteredPoTransportAwaitingTreasury.length > 0 ? (
                  <div
                    className="rounded-2xl border border-sky-200/90 bg-sky-50/50 p-5 space-y-3"
                    data-testid="finance-po-transport-awaiting-payout"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-black text-sky-950 uppercase tracking-widest flex items-center gap-2">
                        <Truck size={16} strokeWidth={2} />
                        PO transport / haulage — awaiting treasury
                      </p>
                      <span className="text-[10px] font-bold text-sky-900 tabular-nums">
                        {filteredPoTransportAwaitingTreasury.length} open
                      </span>
                    </div>
                    <p className="text-[10px] text-sky-950/85 leading-relaxed">
                      Procurement links the transporter and quoted fee on the PO. Record bank or cash payout here so
                      balances and in-transit status stay aligned (same pattern as refunds and expense requests).
                    </p>
                    <ul className="space-y-1.5">
                      {filteredPoTransportAwaitingTreasury.map((row) => {
                        const meta2 = [
                          row.supplierName ? `Supplier ${row.supplierName}` : null,
                          row.transportReference ? `Ref ${row.transportReference}` : null,
                          row.branchId ? branchNameById[row.branchId] || row.branchId : null,
                          row.transportPaidNgn > 0 ? `Paid ${formatNgn(row.transportPaidNgn)} of ${formatNgn(row.transportAmountNgn)}` : `Quoted ${formatNgn(row.transportAmountNgn)}`,
                          row.status ? row.status : null,
                        ]
                          .filter(Boolean)
                          .join(' · ');
                        return (
                          <li
                            key={row.poID}
                            data-testid={`finance-po-transport-awaiting-row-${row.poID}`}
                            className="rounded-lg border border-sky-200/55 bg-white/50 backdrop-blur-md py-1.5 px-2.5 shadow-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 leading-tight flex-1">
                                <p className="text-[11px] font-bold text-[#134e4a] truncate">
                                  <span className="font-mono">{row.poID}</span>
                                  <span className="font-medium text-slate-600">
                                    {' '}
                                    · {row.transportAgentName || 'Transporter'}
                                  </span>
                                </p>
                                <p
                                  className="text-[8px] text-slate-500 mt-0.5 leading-snug line-clamp-2"
                                  title={meta2}
                                >
                                  {meta2}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[11px] font-black text-[#134e4a] tabular-nums">
                                  {formatNgn(row.outstandingNgn)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openPoTransportTreasuryPayout(row)}
                                  className="text-[8px] font-semibold uppercase tracking-wide text-sky-800 bg-sky-100 hover:bg-sky-200 px-2 py-1 rounded-md"
                                  title="Record treasury payout for haulage"
                                >
                                  Record pay
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBankAccounts.length === 0 ? (
                    <div className="sm:col-span-2 lg:col-span-3 z-empty-state py-12">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        No accounts match your search
                      </p>
                    </div>
                  ) : (
                    filteredBankAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="rounded-zarewa border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-lg hover:border-teal-100 transition-all group flex flex-col"
                      >
                        <button
                          type="button"
                          onClick={() => setStatementAccount(acc)}
                          className="text-left p-4 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#134e4a]/30 rounded-t-zarewa"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-[#134e4a]">
                              {acc.type === 'Bank' ? <Landmark size={18} /> : <CreditCard size={18} />}
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                              {acc.accNo}
                            </span>
                          </div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                            {acc.name}
                          </p>
                          {acc.type === 'Bank' && acc.bankName ? (
                            <p className="text-[9px] text-slate-500 font-semibold mb-1 truncate" title={acc.bankName}>
                              {acc.bankName}
                            </p>
                          ) : null}
                          <h4 className="text-lg font-black text-[#134e4a] italic tracking-tighter">
                            ₦{(Number(acc.balance) || 0).toLocaleString()}
                          </h4>
                          {acc.accountOfficerName || acc.accountOfficerPhone ? (
                            <p className="text-[9px] text-slate-600 mt-2 leading-snug line-clamp-2">
                              {acc.accountOfficerName ? <span className="font-semibold">{acc.accountOfficerName}</span> : null}
                              {acc.accountOfficerName && acc.accountOfficerPhone ? ' · ' : null}
                              {acc.accountOfficerPhone ? <span className="tabular-nums">{acc.accountOfficerPhone}</span> : null}
                            </p>
                          ) : null}
                          <p className="text-[9px] text-teal-700/80 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            View statement
                          </p>
                        </button>
                        {(canManageTreasury && ws?.canMutate) || canExecTreasuryDelete ? (
                          <div className="flex items-center justify-end gap-2 px-3 pb-3 pt-0 border-t border-gray-100/80">
                            {canManageTreasury && ws?.canMutate ? (
                              <button
                                type="button"
                                onClick={() => openEditTreasuryAccount(acc)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-700 hover:border-teal-200 hover:bg-teal-50/50"
                              >
                                <Pencil size={12} /> Edit
                              </button>
                            ) : null}
                            {canExecTreasuryDelete ? (
                              <button
                                type="button"
                                onClick={() => void removeTreasuryAccount(acc)}
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-300 opacity-[0.28] hover:opacity-100 hover:text-rose-600 hover:bg-rose-50/30 transition-all"
                                title="Remove account (Admin, MD, or CEO only; balance must be ₦0 and no history)"
                                aria-label="Delete treasury account"
                              >
                                <Trash2 size={13} strokeWidth={1.65} />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'movements' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <p className="text-xs text-gray-500 max-w-2xl">
                  Move cash to bank, sweep POS settlements, or transfer between bank accounts. Each
                  movement updates both source and destination balances.
                </p>

                {ws?.hasPermission?.('finance.view') ? (
                  <section className="rounded-2xl border border-teal-100/80 bg-teal-50/40 p-4 space-y-4 shadow-sm">
                    <div>
                      <h3 className="text-xs font-bold text-[#134e4a] uppercase tracking-widest">
                        Inter-branch lending
                      </h3>
                      <p className="text-[11px] text-gray-600 mt-1 max-w-2xl">
                        Propose a treasury movement from one branch to another. Disbursement posts only
                        after MD approval. Repayments reduce the outstanding balance; planned instalments
                        are stored for reference.
                      </p>
                    </div>
                    {interBranchBalances.length > 0 ? (
                      <div className="rounded-xl border border-teal-200/60 bg-white/70 p-3 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-teal-900">
                          Outstanding between branches
                        </p>
                        <ul className="space-y-1 text-[11px] text-gray-700">
                          {interBranchBalances.map((b) => (
                            <li key={`${b.lenderBranchId}-${b.borrowerBranchId}`} className="tabular-nums">
                              <span className="font-semibold">
                                {branchNameById[b.borrowerBranchId] || b.borrowerBranchId}
                              </span>{' '}
                              owes{' '}
                              <span className="font-semibold">
                                {branchNameById[b.lenderBranchId] || b.lenderBranchId}
                              </span>
                              : {formatNgn(b.outstandingNgn)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {canProposeInterBranch ? (
                      <form className="space-y-3 rounded-xl border border-white/80 bg-white/60 p-3" onSubmit={submitInterBranchLoan}>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          Propose loan (pending MD)
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase block">
                            Lender branch
                            <select
                              required
                              value={interBranchForm.lenderBranchId}
                              onChange={(e) =>
                                setInterBranchForm((f) => ({ ...f, lenderBranchId: e.target.value }))
                              }
                              className="mt-1 w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-2 text-xs font-semibold"
                            >
                              <option value="">Select…</option>
                              {branchOptions.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name || b.code || b.id}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block">
                            Borrower branch
                            <select
                              required
                              value={interBranchForm.borrowerBranchId}
                              onChange={(e) =>
                                setInterBranchForm((f) => ({ ...f, borrowerBranchId: e.target.value }))
                              }
                              className="mt-1 w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-2 text-xs font-semibold"
                            >
                              <option value="">Select…</option>
                              {branchOptions.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name || b.code || b.id}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase block">
                            From treasury account
                            <select
                              required
                              value={interBranchForm.fromTreasuryAccountId}
                              onChange={(e) =>
                                setInterBranchForm((f) => ({ ...f, fromTreasuryAccountId: e.target.value }))
                              }
                              className="mt-1 w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-2 text-xs font-semibold"
                            >
                              <option value="">Select…</option>
                              {bankAccounts.map((a) => (
                                <option key={a.id} value={String(a.id)}>
                                  {a.name} ({formatNgn(a.balance)})
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block">
                            To treasury account
                            <select
                              required
                              value={interBranchForm.toTreasuryAccountId}
                              onChange={(e) =>
                                setInterBranchForm((f) => ({ ...f, toTreasuryAccountId: e.target.value }))
                              }
                              className="mt-1 w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-2 text-xs font-semibold"
                            >
                              <option value="">Select…</option>
                              {bankAccounts.map((a) => (
                                <option key={a.id} value={String(a.id)}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase block">
                            Principal (₦)
                            <input
                              required
                              type="number"
                              min="1"
                              value={interBranchForm.principalNgn}
                              onChange={(e) =>
                                setInterBranchForm((f) => ({ ...f, principalNgn: e.target.value }))
                              }
                              className="mt-1 w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-2 text-xs font-bold"
                            />
                          </label>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block">
                            Disbursement date
                            <input
                              required
                              type="date"
                              value={interBranchForm.dateISO}
                              onChange={(e) =>
                                setInterBranchForm((f) => ({ ...f, dateISO: e.target.value }))
                              }
                              className="mt-1 w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-2 text-xs font-bold"
                            />
                          </label>
                        </div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block">
                          Reference
                          <input
                            value={interBranchForm.reference}
                            onChange={(e) =>
                              setInterBranchForm((f) => ({ ...f, reference: e.target.value }))
                            }
                            className="mt-1 w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-2 text-xs font-semibold"
                          />
                        </label>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block">
                          Context / rationale
                          <textarea
                            value={interBranchForm.proposedNote}
                            onChange={(e) =>
                              setInterBranchForm((f) => ({ ...f, proposedNote: e.target.value }))
                            }
                            rows={2}
                            className="mt-1 w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-2 text-xs"
                          />
                        </label>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block">
                          Repayment plan (JSON array)
                          <textarea
                            value={interBranchForm.repaymentPlanJson}
                            onChange={(e) =>
                              setInterBranchForm((f) => ({ ...f, repaymentPlanJson: e.target.value }))
                            }
                            rows={4}
                            className="mt-1 w-full font-mono text-[11px] bg-gray-50 border border-gray-100 rounded-lg py-2 px-2"
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={interBranchBusy}
                          className="z-btn-secondary text-xs py-2 disabled:opacity-50"
                        >
                          Submit for MD approval
                        </button>
                      </form>
                    ) : null}
                    {interBranchLoans.length > 0 ? (
                      <ul className="space-y-2">
                        {interBranchLoans.map((loan) => (
                          <li
                            key={loan.loanId}
                            className="rounded-xl border border-gray-200/80 bg-white/80 p-3 text-[11px] space-y-2"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-mono font-bold text-[#134e4a]">{loan.loanId}</p>
                                <p className="text-gray-600 mt-0.5">
                                  {branchNameById[loan.lenderBranchId] || loan.lenderBranchId} →{' '}
                                  {branchNameById[loan.borrowerBranchId] || loan.borrowerBranchId} ·{' '}
                                  {formatNgn(loan.principalNgn)}
                                  {loan.status === 'active' || loan.status === 'closed' ? (
                                    <span className="text-gray-500">
                                      {' '}
                                      (repaid {formatNgn(loan.repaidNgn)}, outstanding{' '}
                                      {formatNgn(loan.outstandingNgn)})
                                    </span>
                                  ) : null}
                                </p>
                                <p className="text-[10px] text-gray-500 mt-1">
                                  Status: <span className="font-bold uppercase">{loan.status}</span>
                                  {loan.reference ? ` · ${loan.reference}` : ''}
                                </p>
                                {loan.proposedNote ? (
                                  <p className="text-[10px] text-gray-600 mt-1">{loan.proposedNote}</p>
                                ) : null}
                                {Array.isArray(loan.repaymentPlan) && loan.repaymentPlan.length > 0 ? (
                                  <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 p-2">
                                    <p className="text-[9px] font-bold uppercase text-slate-500 mb-1">
                                      Repayment plan
                                    </p>
                                    <ul className="text-[10px] space-y-0.5">
                                      {loan.repaymentPlan.map((line, idx) => (
                                        <li key={idx} className="tabular-nums">
                                          {line.dueDateISO || '—'} · {formatNgn(line.amountNgn)}
                                          {line.note ? ` · ${line.note}` : ''}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap gap-1 shrink-0">
                                {loan.status === 'pending_md' && canMdInterBranchLoan ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={interBranchBusy}
                                      onClick={() => void mdApproveInterBranch(loan.loanId)}
                                      className="text-[9px] font-bold uppercase px-2 py-1 rounded-md bg-emerald-600 text-white disabled:opacity-50"
                                    >
                                      MD approve
                                    </button>
                                    <button
                                      type="button"
                                      disabled={interBranchBusy}
                                      onClick={() => void mdRejectInterBranch(loan.loanId)}
                                      className="text-[9px] font-bold uppercase px-2 py-1 rounded-md border border-rose-200 text-rose-800 disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            {loan.status === 'active' && canRepayInterBranch ? (
                              <form
                                className="grid grid-cols-1 gap-2 border-t border-gray-100 pt-2 mt-2 sm:grid-cols-2"
                                onSubmit={submitInterBranchRepay}
                              >
                                <input type="hidden" name="loanId" value={loan.loanId} readOnly />
                                <p className="text-[10px] font-bold uppercase text-gray-500 sm:col-span-2">
                                  Record repayment (treasury transfer)
                                </p>
                                <select
                                  required
                                  value={
                                    interBranchRepayForm.loanId === loan.loanId
                                      ? interBranchRepayForm.fromTreasuryAccountId
                                      : ''
                                  }
                                  onChange={(e) =>
                                    setInterBranchRepayForm((f) => ({
                                      ...f,
                                      loanId: loan.loanId,
                                      fromTreasuryAccountId: e.target.value,
                                    }))
                                  }
                                  className="bg-gray-50 border border-gray-100 rounded-lg py-1.5 px-2 text-xs"
                                >
                                  <option value="">From account…</option>
                                  {bankAccounts.map((a) => (
                                    <option key={a.id} value={String(a.id)}>
                                      {a.name}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  required
                                  value={
                                    interBranchRepayForm.loanId === loan.loanId
                                      ? interBranchRepayForm.toTreasuryAccountId
                                      : ''
                                  }
                                  onChange={(e) =>
                                    setInterBranchRepayForm((f) => ({
                                      ...f,
                                      loanId: loan.loanId,
                                      toTreasuryAccountId: e.target.value,
                                    }))
                                  }
                                  className="bg-gray-50 border border-gray-100 rounded-lg py-1.5 px-2 text-xs"
                                >
                                  <option value="">To account…</option>
                                  {bankAccounts.map((a) => (
                                    <option key={a.id} value={String(a.id)}>
                                      {a.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  required
                                  type="number"
                                  min="1"
                                  placeholder="Amount ₦"
                                  value={
                                    interBranchRepayForm.loanId === loan.loanId
                                      ? interBranchRepayForm.amountNgn
                                      : ''
                                  }
                                  onChange={(e) =>
                                    setInterBranchRepayForm((f) => ({
                                      ...f,
                                      loanId: loan.loanId,
                                      amountNgn: e.target.value,
                                    }))
                                  }
                                  className="bg-gray-50 border border-gray-100 rounded-lg py-1.5 px-2 text-xs font-bold"
                                />
                                <input
                                  type="date"
                                  value={
                                    interBranchRepayForm.loanId === loan.loanId
                                      ? interBranchRepayForm.dateISO
                                      : interBranchRepayForm.dateISO
                                  }
                                  onChange={(e) =>
                                    setInterBranchRepayForm((f) => ({
                                      ...f,
                                      loanId: loan.loanId,
                                      dateISO: e.target.value,
                                    }))
                                  }
                                  className="bg-gray-50 border border-gray-100 rounded-lg py-1.5 px-2 text-xs"
                                />
                                <input
                                  placeholder="Note"
                                  value={
                                    interBranchRepayForm.loanId === loan.loanId
                                      ? interBranchRepayForm.note
                                      : ''
                                  }
                                  onChange={(e) =>
                                    setInterBranchRepayForm((f) => ({
                                      ...f,
                                      loanId: loan.loanId,
                                      note: e.target.value,
                                    }))
                                  }
                                  className="sm:col-span-2 bg-gray-50 border border-gray-100 rounded-lg py-1.5 px-2 text-xs"
                                />
                                <button
                                  type="submit"
                                  disabled={interBranchBusy || interBranchRepayForm.loanId !== loan.loanId}
                                  className="sm:col-span-2 z-btn-secondary text-xs py-2 disabled:opacity-40"
                                >
                                  Post repayment
                                </button>
                              </form>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[10px] text-gray-500">No inter-branch loan records in this scope.</p>
                    )}
                  </section>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setTransferForm({
                      fromId: bankAccounts[0] ? String(bankAccounts[0].id) : '',
                      toId: bankAccounts[1]
                        ? String(bankAccounts[1].id)
                        : bankAccounts[0]
                          ? String(bankAccounts[0].id)
                          : '',
                      amountNgn: '',
                      reference: '',
                    });
                    setShowTransferModal(true);
                  }}
                  className="z-btn-secondary"
                >
                  <ArrowRightLeft size={16} /> New transfer
                </button>
                {movementRows.length === 0 ? (
                  <div className="z-empty-state py-12">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      No internal transfers yet
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {movementRows.map((m) => (
                      <li
                        key={m.id}
                        className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md py-1.5 px-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <p className="text-[11px] font-bold text-[#134e4a] truncate min-w-0">
                            <span className="font-mono">{m.id}</span>
                            <span className="font-medium text-slate-600">
                              {' '}
                              · {m.fromName} → {m.toName}
                            </span>
                          </p>
                          <span className="text-[11px] font-black text-[#134e4a] tabular-nums shrink-0">
                            {formatNgn(m.amountNgn)}
                          </span>
                        </div>
                        <p className="text-[8px] text-slate-500 mt-0.5 tabular-nums">{m.at}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === 'disbursements' && (
              <div className="space-y-8 animate-in slide-in-from-right-5">
                <section className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#134e4a]">
                      1) Expenses (posted records)
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Record completed spending entries. New expense requests and direct expenses open from the
                      workspace; payment request <span className="font-semibold text-slate-700">approval</span> is in
                      Management or workspace Needs action. After approval, treasury payout is on the{' '}
                      <span className="font-semibold text-slate-700">Treasury</span> tab.
                    </p>
                  </div>
                <ul className="space-y-1.5">
                {filteredExpenses.map((ex) => {
                  const meta2 = [
                    ex.expenseType,
                    ex.category,
                    ex.branchId ? branchNameById[ex.branchId] || ex.branchId : null,
                    `${ex.paymentMethod} · Ref ${ex.reference}`,
                    ex.date,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                  <li
                    key={ex.expenseID}
                    className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md py-1.5 px-2.5 shadow-sm hover:bg-white/70 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 leading-tight flex-1">
                        <p className="text-[11px] font-bold text-[#134e4a] truncate uppercase">{ex.expenseID}</p>
                        <p className="text-[8px] text-slate-500 mt-0.5 leading-snug line-clamp-2" title={meta2}>
                          {meta2}
                        </p>
                      </div>
                      <p className="text-[11px] font-black text-[#134e4a] tabular-nums shrink-0">
                        {formatNgn(ex.amountNgn)}
                      </p>
                    </div>
                  </li>
                  );
                })}
                </ul>
                </section>
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-8 animate-in slide-in-from-left-5">
                {reconciliationFlags > 0 ? (
                  <div className="flex items-start gap-3 rounded-lg border border-red-200/80 bg-red-50/80 px-3 py-2.5 text-sm text-red-900">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="font-bold">Bank reconciliation exceptions</p>
                      <p className="text-xs text-red-800/90 mt-0.5">
                        {reconciliationFlags} statement line(s) are not matched to ledger entries. Resolve
                        or post adjusting entries.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div>
                  <h3 className="text-xs font-bold text-[#134e4a] uppercase tracking-widest mb-3">
                    Audit checklist (period close)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        title: 'Customer receipts',
                        detail: 'Receipts issued for each inflow; tie to quotations & AR.',
                      },
                      {
                        title: 'Supplier payments',
                        detail: 'PO → GRN → invoice → payment; AP balances updated.',
                      },
                      {
                        title: 'Inventory vs COGS',
                        detail: 'Stock movements align with sales and purchase postings.',
                      },
                      {
                        title: 'Cash & bank',
                        detail: 'Till, bank, and POS floats agree with counted / statement balances.',
                      },
                    ].map((row) => (
                      <div
                        key={row.title}
                        className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md p-3 flex gap-3 shadow-sm"
                      >
                        <CheckCircle2 className="shrink-0 text-emerald-500" size={18} />
                        <div>
                          <p className="text-xs font-bold text-gray-800">{row.title}</p>
                          <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{row.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-slate-600 rounded-lg border border-slate-200/60 bg-slate-50/80 px-3 py-2">
                  Customer receipt settlement is on the{' '}
                  <button
                    type="button"
                    className="font-bold text-teal-800 underline-offset-2 hover:underline"
                    onClick={() => handleAccountTabChange('receipts')}
                  >
                    Receipts &amp; recon
                  </button>{' '}
                  tab.
                </p>

                <div>
                  <h3 className="text-xs font-bold text-[#134e4a] uppercase tracking-widest mb-3">
                    Exception queue (misc receipts)
                  </h3>
                  <ul className="space-y-1.5">
                    {auditQueue.map((item) => {
                      const meta2 = [`via ${item.bank}`, item.date, item.desc].filter(Boolean).join(' · ');
                      return (
                      <li
                        key={item.id}
                        className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md py-1.5 px-2.5 shadow-sm hover:bg-white/70 transition-colors"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                          <div className="min-w-0 leading-tight flex-1">
                            <p className="text-[11px] font-bold text-[#134e4a] truncate uppercase">{item.customer}</p>
                            <p className="text-[8px] text-slate-500 mt-0.5 leading-snug line-clamp-2" title={meta2}>
                              {meta2}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] font-black text-[#134e4a] tabular-nums">
                              ₦{item.amount.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleAccountTabChange('receipts');
                                showToast('Open Receipts & recon to review and attach supporting evidence.', {
                                  variant: 'info',
                                });
                              }}
                              className="p-1.5 bg-white text-slate-400 hover:text-[#134e4a] rounded-md border border-slate-200 transition-all"
                              title="Review evidence"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                showToast('Marked cleared in the audit review queue.', { variant: 'success' })
                              }
                              className="p-1.5 bg-[#134e4a] text-white rounded-md shadow-sm"
                              title="Clear"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          </div>
                        </div>
                      </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md p-4 text-xs text-gray-600 leading-relaxed shadow-sm">
                  <p className="font-black text-[#134e4a] uppercase tracking-wider text-[10px] mb-2">
                    Accounting basis
                  </p>
                  Double-entry posting, accrual recognition, revenue on delivery or billing, and expense
                  matching to the period are the target once the general ledger service is connected.
                  Customer installments (Net 30 / 60) remain tracked on quotations and receipts until
                  fully paid.
                </div>
              </div>
            )}
            </>
          </FinanceSequencePanel>
        </div>
      </div>

      <ModalFrame isOpen={showTransferModal} onClose={() => setShowTransferModal(false)}>
        <div className="z-modal-panel max-w-md p-8 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-[#134e4a] flex items-center gap-2">
              <ArrowRightLeft size={22} />
              Fund movement
            </h3>
            <button
              type="button"
              onClick={() => setShowTransferModal(false)}
              className="p-2 text-gray-400 hover:text-red-500 rounded-xl"
            >
              <X size={22} />
            </button>
          </div>
          <form className="space-y-4" onSubmit={saveTransfer}>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                From
              </label>
              <select
                required
                value={transferForm.fromId}
                onChange={(e) =>
                  setTransferForm((f) => ({ ...f, fromId: e.target.value }))
                }
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
              >
                <option value="">Select account…</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatNgn(a.balance)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                To
              </label>
              <select
                required
                value={transferForm.toId}
                onChange={(e) =>
                  setTransferForm((f) => ({ ...f, toId: e.target.value }))
                }
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
              >
                <option value="">Select account…</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                Amount (₦)
              </label>
              <input
                required
                type="number"
                min="1"
                value={transferForm.amountNgn}
                onChange={(e) =>
                  setTransferForm((f) => ({ ...f, amountNgn: e.target.value }))
                }
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                Reference / narration
              </label>
              <input
                value={transferForm.reference}
                onChange={(e) =>
                  setTransferForm((f) => ({ ...f, reference: e.target.value }))
                }
                placeholder="e.g. Cash deposit — 28 Mar"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
              />
            </div>
            <button type="submit" className="z-btn-primary w-full justify-center py-3">
              Post transfer
            </button>
          </form>
        </div>
      </ModalFrame>

      <ModalFrame isOpen={statementAccount != null} onClose={() => setStatementAccount(null)}>
        <div className="z-modal-panel max-w-lg w-full max-h-[min(85vh,640px)] p-6 sm:p-8 overflow-hidden flex flex-col">
          <div className="flex justify-between items-start gap-3 mb-4 shrink-0">
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-[#134e4a]">Account statement</h3>
              {statementAccount ? (
                <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                  <p className="font-semibold truncate" title={statementAccount.name}>
                    {statementAccount.name}
                    {statementAccount.bankName ? ` · ${statementAccount.bankName}` : ''}
                  </p>
                  {statementAccount.bankBranch ? (
                    <p className="text-[11px] text-slate-500">Branch: {statementAccount.bankBranch}</p>
                  ) : null}
                  {statementAccount.sortCodeOrSwift ? (
                    <p className="text-[11px] text-slate-500 tabular-nums">
                      Sort / SWIFT: {statementAccount.sortCodeOrSwift}
                    </p>
                  ) : null}
                  {statementAccount.accountOfficerName || statementAccount.accountOfficerPhone ? (
                    <p className="text-[11px] text-slate-600">
                      Officer:{' '}
                      {[statementAccount.accountOfficerName, statementAccount.accountOfficerPhone]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}
                  {statementAccount.notes ? (
                    <p className="text-[10px] text-slate-500 leading-snug border-t border-slate-100/80 pt-1 mt-1">
                      {statementAccount.notes}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setStatementAccount(null)}
              className="p-2 text-gray-400 hover:text-red-500 rounded-xl shrink-0"
              aria-label="Close statement"
            >
              <X size={22} />
            </button>
          </div>
          {!ws?.hasWorkspaceData ? (
            <p className="text-xs text-gray-600 leading-relaxed">
              Connect to the live workspace to load treasury movements. Statements are built from posted receipts,
              expenses, transfers, and payouts on the server.
            </p>
          ) : (
            <>
              <p className="text-[10px] text-slate-600 leading-snug mb-3 rounded-lg border border-slate-200/80 bg-slate-50/90 px-3 py-2">
                <strong>Sales → Receipt payments</strong> lists only <strong>quotation receipts</strong> (jobs). This
                statement lists <strong>every</strong> movement on this account—including{' '}
                <strong>advance deposits</strong>, transfers, expenses, and bank recon—so a line can appear here but not
                under Sales receipts. Use the badge on each row (e.g.{' '}
                <span className="font-semibold text-emerald-800">Sales receipt</span> vs{' '}
                <span className="font-semibold text-amber-900">Advance</span>).{' '}
                <Link to="/sales" className="font-semibold text-[#134e4a] underline underline-offset-2">
                  Open Sales
                </Link>
                .
              </p>
              {accountStatementLines.length === 0 ? (
                <p className="text-xs text-gray-500">No movements recorded for this account yet.</p>
              ) : (
                <div className="overflow-y-auto flex-1 min-h-0 -mx-1 px-1 border border-slate-200/60 rounded-lg bg-white/40 backdrop-blur-md">
                  <ul className="p-2 space-y-1.5">
                    {accountStatementLines.map((m) => {
                      const raw = Number(m.amountNgn) || 0;
                      const isIn = raw > 0;
                      const isOut = raw < 0;
                      const abs = Math.abs(raw);
                      const dateStr = String(m.postedAtISO || '').slice(0, 10) || '—';
                      const detail = treasuryMovementStatementLabel(m);
                      const badge = treasuryMovementSourceBadge(m);
                      const amtStr = `${isIn ? '+' : isOut ? '−' : ''}${formatNgn(abs)}`;
                      return (
                        <li
                          key={m.id}
                          className="rounded-lg border border-slate-200/60 bg-white/50 py-1.5 px-2.5 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              <span
                                className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                              <span className="text-[11px] font-bold tabular-nums text-slate-600">{dateStr}</span>
                            </div>
                            <span
                              className={`text-[11px] font-black tabular-nums shrink-0 ${
                                isIn ? 'text-emerald-600' : isOut ? 'text-red-600' : 'text-slate-500'
                              }`}
                            >
                              {amtStr}
                            </span>
                          </div>
                          <p
                            className="text-[8px] text-slate-500 mt-0.5 leading-snug line-clamp-2 break-words"
                            title={detail}
                          >
                            {detail}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </ModalFrame>

      <ModalFrame
        isOpen={showRefundPayModal}
        onClose={() => {
          setShowRefundPayModal(false);
          setRefundPayTarget(null);
          setRefundPaidBy('');
          setRefundPayLines([]);
          setRefundPaymentNote('');
        }}
      >
        <div className="z-modal-panel max-w-lg p-8 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-[#134e4a] flex items-center gap-2">
              <RotateCcw size={22} className="text-rose-600" />
              Refund payout
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowRefundPayModal(false);
                setRefundPayTarget(null);
                setRefundPaidBy('');
                setRefundPayLines([]);
                setRefundPaymentNote('');
              }}
              className="p-2 text-gray-400 hover:text-red-500 rounded-xl"
            >
              <X size={22} />
            </button>
          </div>
          {refundPayTarget ? (
            <form className="space-y-4" onSubmit={confirmRefundPaid}>
              <div className="bg-rose-50/80 rounded-2xl p-4 border border-rose-100 text-sm space-y-1">
                <p className="font-mono font-bold text-[#134e4a]">{refundPayTarget.refundID}</p>
                <p className="font-bold text-gray-800">{refundPayTarget.customer}</p>
                <p className="text-xs text-gray-600">{refundPayTarget.reason}</p>
                <div className="grid grid-cols-3 gap-3 pt-2 text-[10px] text-gray-600 tabular-nums">
                  <div>
                    <p className="uppercase text-gray-400">Approved</p>
                    <p className="text-sm font-black text-[#134e4a]">{formatNgn(refundApprovedAmount(refundPayTarget))}</p>
                  </div>
                  <div>
                    <p className="uppercase text-gray-400">Paid</p>
                    <p className="text-sm font-black text-[#134e4a]">{formatNgn(Number(refundPayTarget.paidAmountNgn) || 0)}</p>
                  </div>
                  <div>
                    <p className="uppercase text-gray-400">Balance</p>
                    <p className="text-sm font-black text-rose-700">{formatNgn(refundOutstandingAmount(refundPayTarget))}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Paid by (Finance user)
                </label>
                <input
                  value={refundPaidBy}
                  onChange={(e) => setRefundPaidBy(e.target.value)}
                  placeholder="e.g. Hauwa — GTBank transfer"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Payout breakdown</label>
                <button
                  type="button"
                  onClick={addRefundPayLine}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-rose-800"
                >
                  <Plus size={14} /> Add line
                </button>
              </div>
              <div className="space-y-1.5">
                {refundPayLines.map((line) => (
                  <div
                    key={line.id}
                    className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md py-2 px-2.5 shadow-sm flex flex-col gap-2"
                  >
                    <select
                      value={line.treasuryAccountId}
                      onChange={(e) => updateRefundPayLine(line.id, { treasuryAccountId: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2 text-[11px] font-semibold"
                    >
                      <option value="">Select account…</option>
                      {bankAccounts.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {a.name} ({formatNgn(a.balance)})
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={line.amount}
                      onChange={(e) => updateRefundPayLine(line.id, { amount: e.target.value })}
                      className="sm:col-span-5 rounded-lg border border-slate-200 bg-white py-2 px-2 text-[11px] font-bold text-[#134e4a]"
                      placeholder="Amount ₦"
                    />
                    <input
                      type="text"
                      value={line.reference}
                      onChange={(e) => updateRefundPayLine(line.id, { reference: e.target.value })}
                      className="sm:col-span-5 rounded-lg border border-slate-200 bg-white py-2 px-2 text-[11px]"
                      placeholder="Reference"
                    />
                    <button
                      type="button"
                      onClick={() => removeRefundPayLine(line.id)}
                      className="sm:col-span-2 inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-500"
                      title="Remove line"
                    >
                      <X size={16} />
                    </button>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Payment note
                </label>
                <input
                  value={refundPaymentNote}
                  onChange={(e) => setRefundPaymentNote(e.target.value)}
                  placeholder="Example: Cash 300,000 and GT transfer 200,000"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm outline-none"
                />
              </div>
              <div className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md px-3 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wide">This payout</span>
                  <span className="font-black text-[#134e4a]">{formatNgn(refundPayTotalNgn)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wide">Remaining after post</span>
                  <span className="font-black text-gray-700">
                    {formatNgn(Math.max(0, refundOutstandingAmount(refundPayTarget) - refundPayTotalNgn))}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Saving this payout writes the treasury movements and keeps the refund open until the approved balance is fully paid.
              </p>
              <button type="submit" className="z-btn-primary w-full justify-center py-3">
                Post refund payout
              </button>
            </form>
          ) : null}
        </div>
      </ModalFrame>

      <ModalFrame
        isOpen={showPaymentEntry}
        onClose={() => {
          setShowPaymentEntry(false);
          setSelectedPayment(null);
          setRequestPayLines([]);
          setRequestPayNote('');
        }}
      >
        <div className="z-modal-panel max-w-lg p-8 sm:p-10 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-bold text-[#134e4a]">
              {selectedPayment?.type === 'po_transport' ? 'Post transport payment' : 'Process payment'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowPaymentEntry(false);
                setSelectedPayment(null);
                setRequestPayLines([]);
                setRequestPayNote('');
              }}
              className="text-gray-300 hover:text-rose-500"
            >
              <X size={24} />
            </button>
          </div>
          <div className="bg-gray-50 p-6 rounded-2xl mb-6 border border-gray-100 flex justify-between items-center gap-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Balance due</p>
              <p className="text-2xl font-black text-[#134e4a]">
                ₦
                {(
                  (selectedPayment?.total ?? 0) - (selectedPayment?.paid ?? 0)
                ).toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                {selectedPayment?.desc} · {selectedPayment?.category}
              </p>
            </div>
            <span className="text-[10px] font-bold px-3 py-1 bg-white rounded-full border border-gray-100 shrink-0">
              {selectedPayment?.type === 'po_transport' ? `PO ${selectedPayment?.id}` : selectedPayment?.id}
            </span>
          </div>
          {bankAccounts.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Add at least one treasury account before posting payout.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                  Payout breakdown
                </label>
                <button
                  type="button"
                  onClick={addRequestPayLine}
                  className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#134e4a]"
                >
                  <Plus size={14} /> Add line
                </button>
              </div>
              <div className="space-y-1.5">
                {requestPayLines.map((line) => (
                  <div
                    key={line.id}
                    className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md py-2 px-2.5 shadow-sm flex flex-col gap-2"
                  >
                    <select
                      value={line.treasuryAccountId}
                      onChange={(e) => updateRequestPayLine(line.id, { treasuryAccountId: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2 text-[11px] font-semibold"
                    >
                      <option value="">Select account…</option>
                      {bankAccounts.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {a.name} ({formatNgn(a.balance)})
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={line.amount}
                      onChange={(e) => updateRequestPayLine(line.id, { amount: e.target.value })}
                      className="sm:col-span-5 rounded-lg border border-slate-200 bg-white py-2 px-2 text-[11px] font-bold text-[#134e4a]"
                      placeholder="Amount ₦"
                    />
                    <input
                      type="text"
                      value={line.reference}
                      onChange={(e) => updateRequestPayLine(line.id, { reference: e.target.value })}
                      className="sm:col-span-5 rounded-lg border border-slate-200 bg-white py-2 px-2 text-[11px]"
                      placeholder="Reference"
                    />
                    <button
                      type="button"
                      onClick={() => removeRequestPayLine(line.id)}
                      className="sm:col-span-2 inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-500"
                      title="Remove line"
                    >
                      <X size={16} />
                    </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Payment note</label>
                <input
                  value={requestPayNote}
                  onChange={(e) => setRequestPayNote(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 px-4 text-sm"
                  placeholder="Example: Cash 300,000 and GT transfer 200,000"
                />
              </div>
              <div className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md px-3 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wide">This payout</span>
                  <span className="font-black text-[#134e4a]">{formatNgn(requestPayTotalNgn)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wide">Remaining after post</span>
                  <span className="font-black text-gray-700">
                    {formatNgn(
                      Math.max(
                        0,
                        ((selectedPayment?.total ?? 0) - (selectedPayment?.paid ?? 0)) - requestPayTotalNgn
                      )
                    )}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={confirmProcessPaymentModal}
                className="w-full bg-[#134e4a] text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl mt-4"
              >
                {selectedPayment?.type === 'po_transport' ? 'Confirm transport payout' : 'Confirm transaction'}
              </button>
            </div>
          )}
        </div>
      </ModalFrame>

      <ModalFrame
        isOpen={showAddBank}
        onClose={() => {
          setShowAddBank(false);
          setNewBank(emptyBankForm());
        }}
      >
        <div className="z-modal-panel max-w-lg p-8 max-h-[min(90vh,720px)] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#134e4a]">
                {newBank.id != null && newBank.id !== '' ? 'Edit account' : 'New account'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddBank(false);
                  setNewBank(emptyBankForm());
                }}
                className="p-2 text-gray-400 hover:text-red-500 rounded-xl"
              >
                <X size={22} />
              </button>
            </div>
            <form className="space-y-4" onSubmit={saveBankAccount}>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Account name
                </label>
                <input
                  required
                  value={newBank.name}
                  onChange={(e) => setNewBank((b) => ({ ...b, name: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                />
              </div>
              {newBank.type === 'Bank' ? (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                    Bank name (for quotations & receipts)
                  </label>
                  <input
                    value={newBank.bankName}
                    onChange={(e) => setNewBank((b) => ({ ...b, bankName: e.target.value }))}
                    placeholder="e.g. Zenith Bank"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                  />
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                    Type
                  </label>
                  <select
                    value={newBank.type}
                    onChange={(e) => setNewBank((b) => ({ ...b, type: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                  >
                    <option value="Bank">Bank</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                    {newBank.id != null && newBank.id !== '' ? 'Book balance (₦)' : 'Opening balance (₦)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newBank.balance}
                    onChange={(e) => setNewBank((b) => ({ ...b, balance: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                  />
                  {newBank.id != null && newBank.id !== '' ? (
                    <p className="text-[9px] text-gray-500 mt-1 leading-snug">
                      Prefer transfers and posted receipts to move cash; change this only for corrections.
                    </p>
                  ) : null}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Account / reference no.
                </label>
                <input
                  value={newBank.accNo}
                  onChange={(e) => setNewBank((b) => ({ ...b, accNo: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Bank branch / address
                </label>
                <input
                  value={newBank.bankBranch}
                  onChange={(e) => setNewBank((b) => ({ ...b, bankBranch: e.target.value }))}
                  placeholder="e.g. Ahmadu Bello Way, Kaduna"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Sort code / SWIFT (optional)
                </label>
                <input
                  value={newBank.sortCodeOrSwift}
                  onChange={(e) => setNewBank((b) => ({ ...b, sortCodeOrSwift: e.target.value }))}
                  placeholder="e.g. 057 / ZEIBNGLA"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                    Account officer name
                  </label>
                  <input
                    value={newBank.accountOfficerName}
                    onChange={(e) => setNewBank((b) => ({ ...b, accountOfficerName: e.target.value }))}
                    placeholder="Relationship manager"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                    Account officer phone
                  </label>
                  <input
                    value={newBank.accountOfficerPhone}
                    onChange={(e) => setNewBank((b) => ({ ...b, accountOfficerPhone: e.target.value }))}
                    placeholder="+234…"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Internal notes
                </label>
                <textarea
                  rows={2}
                  value={newBank.notes}
                  onChange={(e) => setNewBank((b) => ({ ...b, notes: e.target.value }))}
                  placeholder="e.g. Primary payroll account; notify MD for transfers above ₦10m"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm outline-none resize-y min-h-[3rem]"
                />
              </div>
              <button type="submit" className="z-btn-primary w-full justify-center py-3">
                Save account
              </button>
            </form>
        </div>
      </ModalFrame>

      <ModalFrame isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)}>
        <div className="z-modal-panel max-w-lg p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#134e4a]">Expense entry</h3>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="p-2 text-gray-400 hover:text-red-500 rounded-xl"
              >
                <X size={22} />
              </button>
            </div>
            <form className="space-y-4" onSubmit={saveExpense}>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Expense type
                </label>
                <select
                  value={expenseForm.expenseType}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, expenseType: e.target.value }))
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                >
                  <option value="COGS — materials & stock">COGS — materials & stock</option>
                  <option value="Operational — rent & utilities">Operational — rent & utilities</option>
                  <option value="Employee — payroll & commissions">Employee — payroll & commissions</option>
                  <option value="Maintenance — plant & equipment">Maintenance — plant & equipment</option>
                  <option value="Logistics & haulage">Logistics & haulage</option>
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                    Amount (₦)
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={expenseForm.amountNgn}
                    onChange={(e) =>
                      setExpenseForm((f) => ({ ...f, amountNgn: e.target.value }))
                    }
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) =>
                      setExpenseForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Category
                </label>
                <select
                  required
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                >
                  <option value="">Select category…</option>
                  {EXPENSE_CATEGORY_OPTIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Payment method
                </label>
                <select
                  value={expenseForm.paymentMethod}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, paymentMethod: e.target.value }))
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="POS">POS</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Pay from account
                </label>
                <select
                  required
                  value={expenseForm.debitAccountId}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, debitAccountId: e.target.value }))
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                >
                  <option value="">Select account…</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatNgn(a.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Receipt / invoice reference
                </label>
                <input
                  value={expenseForm.reference}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, reference: e.target.value }))
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                />
              </div>
              <p className="text-[10px] text-gray-400">
                Expense ID is generated on save (e.g. EXP-26-015).
              </p>
              <button type="submit" className="z-btn-primary w-full justify-center py-3">
                Save expense
              </button>
            </form>
        </div>
      </ModalFrame>

      <ModalFrame
        isOpen={showPayRequestModal}
        onClose={() => {
          setShowPayRequestModal(false);
        }}
      >
        <div className="z-modal-panel max-w-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xl font-bold text-[#134e4a]">Expense request</h3>
            <button
              type="button"
              onClick={() => setShowPayRequestModal(false)}
              className="p-2 text-gray-400 hover:text-red-500 rounded-xl"
            >
              <X size={22} />
            </button>
          </div>
          <ExpenseRequestFormFields
            form={requestForm}
            setForm={setRequestForm}
            onSubmit={savePayRequest}
            fileInputRef={payRequestFileRef}
            showToast={showToast}
            formatNgn={formatNgn}
            hintBeforeSubmit="Extra rows can be left blank — only completed lines are sent. Request ID is assigned on save. Use Print on the list row for a filing copy."
          />
        </div>
      </ModalFrame>

      <ModalFrame
        isOpen={receiptFinanceRow != null}
        onClose={() => {
          setReceiptFinanceEditApprovalId('');
          setReceiptFinanceRow(null);
          setPaymentCorrectionDrafts({});
        }}
      >
        <div className="z-modal-panel max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8">
          <div className="flex justify-between items-start gap-3 mb-4">
            <h3 className="text-lg font-bold text-[#134e4a]">Receipt settlement</h3>
            <button
              type="button"
              onClick={() => {
                setReceiptFinanceEditApprovalId('');
                setReceiptFinanceRow(null);
                setPaymentCorrectionDrafts({});
              }}
              className="p-2 text-gray-400 hover:text-red-500 rounded-xl"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          {receiptFinanceRow ? (
            <form className="space-y-4" onSubmit={saveReceiptFinance}>
              <p className="text-[10px] text-slate-600 font-mono break-all">{receiptFinanceRow.id}</p>
              {receiptSettlementReadOnly ? (
                <p className="text-[10px] text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">
                  This reconciliation was finalized. It is not editable here. Users with finance approval (MD) can
                  open it from the list to revise.
                </p>
              ) : null}
              {receiptFinanceRow.financeReconciliationSavedAtISO && canReviseFinalizedReceiptSettlement ? (
                <p className="text-[10px] text-amber-900 bg-amber-50/90 border border-amber-200/80 rounded-lg px-3 py-2">
                  <span className="font-bold">Finance approval view.</span> This receipt was already reconciled; saving
                  again will update treasury books and re-finalize the record.
                </p>
              ) : null}
              {(() => {
                const settleSplits = receiptLedgerReceiptTreasurySplits(
                  receiptFinanceRow,
                  liveTreasuryMovements
                );
                const cashTotal =
                  receiptFinanceRow.cashReceivedNgn != null
                    ? Number(receiptFinanceRow.cashReceivedNgn) || 0
                    : Number(receiptFinanceRow.amountNgn) || 0;
                const formDisabled = receiptSettlementReadOnly || receiptFinanceBusy;

                if (settleSplits.length > 0) {
                  return (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-teal-200/90 bg-teal-50/50 px-3 py-2.5 text-[10px] text-teal-950 leading-snug">
                        <span className="font-bold">Payment breakdown</span> — set amount, bank or cash, and date for
                        each line.{' '}
                        <span className="font-semibold">
                          One save below updates treasury balances, records the bank total, and finalizes this receipt
                          (it leaves the queue until finance approval reopens it).
                        </span>
                      </div>
                      {settleSplits.map((s) => {
                        const d = paymentCorrectionDrafts[s.movementId] || {
                          amountNgn: String(s.amountNgn),
                          treasuryAccountId: String(s.treasuryAccountId ?? ''),
                          postedDate: String(s.postedAtISO || '').slice(0, 10) || todayIso,
                          note: '',
                        };
                        const rec = s.amountNgn;
                        const ver = Math.round(Number(String(d.amountNgn).replace(/,/g, '')) || 0);
                        const varN = ver - rec;
                        return (
                          <div
                            key={s.movementId}
                            className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-[0_8px_28px_-22px_rgba(15,23,42,0.07)]"
                          >
                            <div className="flex flex-wrap justify-between gap-2">
                              <p className="text-[9px] font-mono text-slate-500 break-all">{s.movementId}</p>
                              <span className="text-[9px] text-slate-400 truncate max-w-[55%]" title={s.reference}>
                                {s.reference || '—'}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase">
                                  Amount (₦) — verify vs recorded
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={d.amountNgn}
                                  disabled={formDisabled}
                                  onChange={(e) =>
                                    setPaymentCorrectionDrafts((prev) => {
                                      const cur = prev[s.movementId] ?? d;
                                      return {
                                        ...prev,
                                        [s.movementId]: { ...cur, amountNgn: e.target.value },
                                      };
                                    })
                                  }
                                  className="w-full mt-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold tabular-nums outline-none focus:ring-2 focus:ring-[#134e4a]/15 disabled:opacity-60"
                                />
                                <p className="text-[9px] text-slate-500 mt-0.5">
                                  Recorded {formatNgn(rec)}
                                  {varN !== 0 ? (
                                    <span
                                      className={
                                        varN > 0 ? 'text-amber-900 font-semibold' : 'text-rose-800 font-semibold'
                                      }
                                    >
                                      {' '}
                                      · Δ {varN > 0 ? '+' : ''}
                                      {formatNgn(varN)}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-800 font-semibold"> · Matches recorded</span>
                                  )}
                                </p>
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase">
                                  Bank / cash account
                                </label>
                                <select
                                  value={d.treasuryAccountId}
                                  disabled={formDisabled}
                                  onChange={(e) =>
                                    setPaymentCorrectionDrafts((prev) => {
                                      const cur = prev[s.movementId] ?? d;
                                      return {
                                        ...prev,
                                        [s.movementId]: { ...cur, treasuryAccountId: e.target.value },
                                      };
                                    })
                                  }
                                  className="w-full mt-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold outline-none focus:ring-2 focus:ring-[#134e4a]/15 disabled:opacity-60"
                                >
                                  {bankAccounts.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.name}
                                      {a.type ? ` (${a.type})` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase">
                                  Payment date
                                </label>
                                <input
                                  type="date"
                                  value={d.postedDate}
                                  disabled={formDisabled}
                                  onChange={(e) =>
                                    setPaymentCorrectionDrafts((prev) => {
                                      const cur = prev[s.movementId] ?? d;
                                      return {
                                        ...prev,
                                        [s.movementId]: { ...cur, postedDate: e.target.value },
                                      };
                                    })
                                  }
                                  className="w-full mt-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[#134e4a]/15 disabled:opacity-60"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase">
                                  Note (optional)
                                </label>
                                <input
                                  type="text"
                                  value={d.note}
                                  disabled={formDisabled}
                                  placeholder="e.g. Confirmed with bank SMS"
                                  onChange={(e) =>
                                    setPaymentCorrectionDrafts((prev) => {
                                      const cur = prev[s.movementId] ?? d;
                                      return {
                                        ...prev,
                                        [s.movementId]: { ...cur, note: e.target.value },
                                      };
                                    })
                                  }
                                  className="w-full mt-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[#134e4a]/15 disabled:opacity-60"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-[10px] text-slate-600 pt-1 border-t border-slate-200/90">
                        Receipt total (Sales){' '}
                        <span className="font-bold tabular-nums text-slate-900">{formatNgn(cashTotal)}</span>
                        {receiptFinanceRow.cashReceivedNgn != null &&
                        Math.round(Number(receiptFinanceRow.cashReceivedNgn) || 0) !==
                          Math.round(Number(receiptFinanceRow.amountNgn) || 0) ? (
                          <span className="text-slate-500 font-normal">
                            {' '}
                            · Quote allocation {formatNgn(Number(receiptFinanceRow.amountNgn) || 0)}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <p className="text-[10px] text-amber-900 bg-amber-50/90 border border-amber-200/80 rounded-lg px-3 py-2 leading-snug">
                      No treasury payment lines on file for this receipt — split amounts are not edited here. Use the
                      bank total below; saving still finalizes reconciliation and updates books if amounts changed
                      elsewhere.
                    </p>
                    <p className="text-xs text-slate-700">
                      Customer paid:{' '}
                      <span className="font-bold tabular-nums">{formatNgn(cashTotal)}</span>
                      {receiptFinanceRow.cashReceivedNgn != null &&
                      Math.round(Number(receiptFinanceRow.cashReceivedNgn) || 0) !==
                        Math.round(Number(receiptFinanceRow.amountNgn) || 0) ? (
                        <span className="text-slate-600 font-normal">
                          {' '}
                          (allocated to quote {formatNgn(Number(receiptFinanceRow.amountNgn) || 0)})
                        </span>
                      ) : null}
                    </p>
                  </div>
                );
              })()}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Total for delivery sign-off — bank / aggregate (₦)
                </label>
                <p className="text-[9px] text-slate-500 mb-1.5 leading-snug ml-1">
                  Saved together with payment lines above (when present). Finalizing removes this receipt from the desk
                  queue unless you have finance approval access.
                </p>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  value={receiptBankAmtInput}
                  disabled={receiptSettlementReadOnly || receiptFinanceBusy}
                  onChange={(e) => setReceiptBankAmtInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none disabled:opacity-60"
                />
              </div>
              <label className="flex items-start gap-2 text-[11px] text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  checked={receiptClearDelivery}
                  disabled={receiptSettlementReadOnly || receiptFinanceBusy}
                  onChange={(e) => setReceiptClearDelivery(e.target.checked)}
                />
                <span>
                  Cleared for delivery — finance confirms this receipt is good to release downstream.
                </span>
              </label>
              {receiptFinanceRow?.id && !receiptSettlementReadOnly ? (
                <EditSecondApprovalInline
                  entityKind="sales_receipt"
                  entityId={receiptFinanceRow.id}
                  value={receiptFinanceEditApprovalId}
                  onChange={setReceiptFinanceEditApprovalId}
                />
              ) : null}
              <button
                type="submit"
                disabled={receiptFinanceBusy || receiptSettlementReadOnly || !ws?.canMutate}
                className="z-btn-primary w-full justify-center py-3 disabled:opacity-50"
              >
                {receiptFinanceBusy
                  ? 'Saving…'
                  : receiptSettlementReadOnly
                    ? 'Finalized'
                    : 'Save reconciliation'}
              </button>
            </form>
          ) : null}
        </div>
      </ModalFrame>
    </PageShell>
  );
};

export default Account;
