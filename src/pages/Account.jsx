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
  RefreshCw,
  Printer,
  Banknote,
  Pencil,
  Trash2,
  LayoutDashboard,
  Wallet,
} from 'lucide-react';

import {
  FinancePilotHeader,
  FinanceSequencePanel,
  PageShell,
  PageTabs,
  ModalFrame,
} from '../components/layout';
import { AiAskButton } from '../components/AiAskButton';
import { ZareHelpButton } from '../components/ZareHelpButton';
import { ZareApprovalHint } from '../components/ZareApprovalHint';
import { EditSecondApprovalInline } from '../components/EditSecondApprovalInline';
import { editMutationNeedsSecondApprovalRole } from '../lib/editApprovalUi';
import { formatNgn } from '../Data/mockData';
import { useToast } from '../context/ToastContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useWorkspaceDomain } from '../hooks/useWorkspaceDomain';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { apiFetch } from '../lib/apiBase';
import { appConfirm } from '../lib/appConfirm';
import {
  normalizeRefund,
  refundApprovedAmount,
  refundOutstandingAmount,
} from '../lib/refundsStore';
import { liveReceivablesNgn, openAuditQueue } from '../lib/liveAnalytics';
import { effectiveOutstandingNgn, isEffectivelyFullyPaid } from '../lib/paymentOutstandingTolerance.js';
import {
  findSalesReceiptByMatchToken,
  receiptCashReceivedNgn,
  receiptLedgerReceiptTreasurySplits,
} from '../lib/salesReceiptsList';
import { openPrintHtmlDocument } from '../lib/officeDeskPrint';
import { ExpenseRequestFormFields } from '../components/office/ExpenseRequestFormFields.jsx';
import { ExpenseCategorySelect } from '../components/office/ExpenseCategorySelect.jsx';
import { ExpenseCategoryLaneBadge } from '../components/office/ExpenseCategoryLaneBadge.jsx';
import { ExpenseCategoryExceptionBanner } from '../components/office/ExpenseCategoryExceptionBanner.jsx';
import { ExpenseCategoryPayoutReadinessPanel } from '../components/office/ExpenseCategoryPayoutReadinessPanel.jsx';
import { OthersJustificationField } from '../components/office/OthersJustificationField.jsx';
import { buildPaymentRequestBodyFromForm, initialExpenseRequestFormState } from '../lib/expenseRequestFormCore.js';
import {
  isFinanceExceptionExpenseItem,
  resolveExpenseCategoryPolicyLimits,
  validateExpenseCategorySelection,
} from '../shared/expenseCategoryPolicy.js';
import { ExpenseCategoryReclassPreviewPanel } from '../components/office/ExpenseCategoryReclassPreviewPanel.jsx';
import { downloadExpenseCategoryExceptionsCsv } from '../lib/expenseCategoryExceptionExport.js';
import { isExceptionExpenseCategory } from '../shared/expenseCategorySelectUtils.js';
import {
  ACCOUNT_TAB_LABELS as TAB_LABELS,
  createRequestPayLine,
  mapTreasuryPayoutLinesForApi,
  normalizePaymentRequest,
  treasuryMovementStatementLabel,
  treasuryMovementSourceBadge,
  treasuryOutflowLinesForAccountsPayable,
  treasuryOutflowLinesForExpense,
  treasuryOutflowLinesForPaymentRequest,
  treasuryOutflowLinesForPurchaseOrder,
  treasuryOutflowLinesForRefund,
  treasuryOutflowPaymentTableRows,
  payFromCorrectionHeadlineForMovementType,
  TREASURY_STATEMENT_TYPE_LABEL,
} from '../lib/accountCore';
import { findTreasuryPayoutShortAccount } from '../lib/financeDeskTreasury';
import {
  getAllowedLegacyAccountTabs,
  getDefaultLegacyAccountTab,
  legacyAccountTabLabelForRole,
  resolveAccountsNavigationTab,
  FINANCE_DESK_TAB_LABEL,
  isCashierRole as userIsCashierRole,
} from '../lib/legacyAccountsAccess';
import { FinanceDeskWorkQueues } from '../components/finance/FinanceDeskWorkQueues.jsx';
import { FinanceTabContextBanner } from '../components/finance/FinanceTabContextBanner.jsx';
import { FinanceReceiptsWorkflowStrip } from '../components/finance/FinanceReceiptsWorkflowStrip.jsx';
import { FinanceTreasuryManageAccountsPanel } from '../components/finance/FinanceTreasuryManageAccountsPanel.jsx';
import { AccountingRegisterSettlementPayModal } from '../components/finance/AccountingRegisterSettlementPayModal.jsx';
import { StaffRecoveryCashierModal } from '../components/finance/StaffRecoveryCashierModal.jsx';
import { StaffObligationRepaymentModal } from '../components/finance/StaffObligationRepaymentModal.jsx';
import { registerSettlementsAwaitingPayment } from '../lib/registerSettlementPay';
import {
  treasuryAccountDisplayName,
  treasuryAccountIdForApiPayload,
  treasuryAccountsForWorkspace,
  workspaceTreasuryBranchId,
} from '../lib/treasuryAccountsStore';
import { isBranchScopedCreateBlocked, branchScopedCreateBlockedMessage } from '../lib/workspaceBranchCreate';
import { compareSelectLabels } from '../lib/selectOptionSort';
import { AccountBankReconciliationPanel } from '../components/account/AccountBankReconciliationPanel.jsx';
import { RegisterBankDepositPanel } from '../components/finance/RegisterBankDepositPanel.jsx';
import { BankDepositExceptionPanel } from '../components/finance/BankDepositExceptionPanel.jsx';
import { AccountGlManualJournalCard } from '../components/account/AccountGlManualJournalCard.jsx';
import {
  openReconciliationListPrint,
  unreconciledReceiptsPrintPayload,
} from '../lib/reconciliationPrint';
import {
  isReceiptPendingClearance,
  isReceiptReversed,
  RECEIPT_CLEARANCE_RESET_CONFIRM_PHRASE,
} from '../lib/receiptClearance.js';

import { AccountPageContext } from './account/AccountPageContext.jsx';
import { AccountTabPanels } from './account/AccountTabPanels.jsx';

function parseNgnInput(raw) {
  return Math.round(Number(String(raw ?? '').replace(/,/g, '')) || 0);
}

const Account = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const wsRefresh = ws?.refresh;
  const wsCanMutate = ws?.canMutate;
  const wsUsingCachedData = ws?.usingCachedData;
  const othersMinJustificationLen = resolveExpenseCategoryPolicyLimits(
    ws?.snapshot?.orgGovernanceLimits
  ).othersMinJustificationLen;
  useWorkspaceDomain('finance');

  const [activeTab, setActiveTab] = useState('desk');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  /** In-tab filter for Payment register tab (also falls back to header search). */
  const [disbursementsSearch, setDisbursementsSearch] = useState('');
  const [disbursementsPayRequestQueue, setDisbursementsPayRequestQueue] = useState('all');
  const [reclassifyTarget, setReclassifyTarget] = useState(null);
  const [reclassifyForm, setReclassifyForm] = useState({ expenseCategory: '', categoryJustification: '' });
  const [reclassifySaving, setReclassifySaving] = useState(false);
  const [reclassifyGlPreview, setReclassifyGlPreview] = useState(null);
  const [exceptionReportSummary, setExceptionReportSummary] = useState(null);
  /** In-tab filter for Receipts reconciliation list (also falls back to header search). */
  const [receiptsTableSearch, setReceiptsTableSearch] = useState('');
  const [deletingExpenseId, setDeletingExpenseId] = useState('');
  const [deletingPayRequestId, setDeletingPayRequestId] = useState('');
  const [reversingTreasuryPayoutId, setReversingTreasuryPayoutId] = useState('');
  const [reversingRefundTreasuryPayoutId, setReversingRefundTreasuryPayoutId] = useState('');
  const [paymentsTableSortKey, setPaymentsTableSortKey] = useState('date');
  const [paymentsTableSortDir, setPaymentsTableSortDir] = useState('desc');
  const [paymentsTablePage, setPaymentsTablePage] = useState(0);
  const [paymentsMutateApprovalId, setPaymentsMutateApprovalId] = useState('');
  const [paymentsApprovalEntity, setPaymentsApprovalEntity] = useState(null);
  const [showPaymentEntry, setShowPaymentEntry] = useState(false);
  const [staffRecoveryTarget, setStaffRecoveryTarget] = useState(null);
  const [staffObligationTarget, setStaffObligationTarget] = useState(null);
  const [showAddBank, setShowAddBank] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPayRequestModal, setShowPayRequestModal] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingPayRequest, setSavingPayRequest] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingTransferBatchId, setEditingTransferBatchId] = useState('');
  const [deletingTransferBatchId, setDeletingTransferBatchId] = useState('');
  const [showRefundPayModal, setShowRefundPayModal] = useState(false);
  const [showRegisterSettlementPayModal, setShowRegisterSettlementPayModal] = useState(false);
  const [registerSettlementPayTarget, setRegisterSettlementPayTarget] = useState(null);
  const [statementAccount, setStatementAccount] = useState(null);
  const [showStatementPrintModal, setShowStatementPrintModal] = useState(false);
  const [statementPrintFromDate, setStatementPrintFromDate] = useState('');
  const [statementPrintToDate, setStatementPrintToDate] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [refundPayTarget, setRefundPayTarget] = useState(null);
  const [refundPaidBy, setRefundPaidBy] = useState('');
  const [refundPayLines, setRefundPayLines] = useState([]);
  const [refundPaymentNote, setRefundPaymentNote] = useState('');
  const [requestPayLines, setRequestPayLines] = useState([]);
  const [requestPayNote, setRequestPayNote] = useState('');
  const [paymentGlPreview, setPaymentGlPreview] = useState(null);
  const [cancelRefundBusyId, setCancelRefundBusyId] = useState('');
  const [treasuryPayoutSubmitting, setTreasuryPayoutSubmitting] = useState(false);
  const [transportPayEditApprovalId, setTransportPayEditApprovalId] = useState('');
  const [customerRefunds, setCustomerRefunds] = useState([]);

  const [bankAccounts, setBankAccounts] = useState([]);

  const emptyBankForm = () => ({
    id: null,
    name: '',
    bankName: '',
    type: 'Bank',
    accNo: '',
    balance: '',
    openingBalanceNgn: '',
    accountOfficerName: '',
    accountOfficerPhone: '',
    bankBranch: '',
    sortCodeOrSwift: '',
    notes: '',
    branchId: workspaceTreasuryBranchId(ws?.session, { branchScope: ws?.branchScope }) || 'BR-KD',
  });
  const [newBank, setNewBank] = useState(emptyBankForm);

  const [fundMovements, setFundMovements] = useState([]);
  const [transferForm, setTransferForm] = useState({
    fromId: '',
    toId: '',
    amountNgn: '',
    reference: '',
    dateISO: new Date().toISOString().slice(0, 10),
  });
  const [expenses, setExpenses] = useState([]);
  const [payRequests, setPayRequests] = useState([]);
  const [bankReconciliation, setBankReconciliation] = useState([]);

  const [receiptFinanceRow, setReceiptFinanceRow] = useState(null);
  const [receiptReverseBusy, setReceiptReverseBusy] = useState(false);
  const [receiptBankAmtInput, setReceiptBankAmtInput] = useState('');
  /** When true, confirm payment but do not set finance delivery clearance. */
  const [receiptHoldDelivery, setReceiptHoldDelivery] = useState(false);
  const [receiptFinanceBusy, setReceiptFinanceBusy] = useState(false);
  /** Correct bank/cash account for expense or payment-request treasury outflows (same idea as receipt splits). */
  const [expenseOutflowEdit, setExpenseOutflowEdit] = useState(null);
  const [expenseOutflowLineIdx, setExpenseOutflowLineIdx] = useState(0);
  const [expenseOutflowSaving, setExpenseOutflowSaving] = useState(false);
  /** movementId -> drafts for per-payment treasury correction */
  const [paymentCorrectionDrafts, setPaymentCorrectionDrafts] = useState({});
  /** Receipts tab: list paging & sort */
  const RECEIPTS_PAGE_SIZE = 10;
  const PAYMENTS_PAGE_SIZE = 20;
  const [receiptsSortKey, setReceiptsSortKey] = useState('date');
  const [receiptsSortDir, setReceiptsSortDir] = useState('desc');
  const [waitingReceiptsPage, setWaitingReceiptsPage] = useState(0);
  const [confirmedReceiptsPage, setConfirmedReceiptsPage] = useState(0);
  const [adminFinanceReapplyBusy, setAdminFinanceReapplyBusy] = useState(false);

  useEffect(() => {
    if (!expenseOutflowEdit?.rows?.length) {
      setExpenseOutflowLineIdx(0);
      return;
    }
    setExpenseOutflowLineIdx((i) =>
      Math.min(Math.max(0, i), expenseOutflowEdit.rows.length - 1)
    );
  }, [expenseOutflowEdit]);

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
  }, [ws?.refreshEpoch, ws?.hasWorkspaceData, ws?.snapshot]);
   

  const [expenseForm, setExpenseForm] = useState({
    expenseType: 'COGS — materials & stock',
    amountNgn: '',
    date: '',
    category: '',
    categoryJustification: '',
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
  const canApprovePaymentRequests =
    Boolean(ws?.hasPermission?.('finance.approve')) || Boolean(ws?.hasPermission?.('*'));
  const canPostExpenseReclass =
    Boolean(ws?.hasPermission?.('finance.post')) || Boolean(ws?.hasPermission?.('*'));
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
  const workspaceBranchId = useMemo(
    () => workspaceTreasuryBranchId(ws?.session, { branchScope: ws?.branchScope }) || 'BR-KD',
    [ws?.session, ws?.branchScope]
  );
  const workspaceBranchLabel = useMemo(() => {
    if (!workspaceBranchId || ws?.viewAllBranches) return '';
    return branchNameById[workspaceBranchId] || workspaceBranchId;
  }, [workspaceBranchId, ws?.viewAllBranches, branchNameById]);
  const roleKey = String(ws?.session?.user?.roleKey || '').trim().toLowerCase();
  const isAdminRole = roleKey === 'admin';
  const canAssignTreasuryBranch = roleKey === 'admin' || roleKey === 'md' || roleKey === 'ceo';
  const showAllTreasuryInTab = Boolean(ws?.viewAllBranches && canAssignTreasuryBranch);
  const branchOptionsSorted = useMemo(
    () =>
      [...branchOptions].sort((a, b) =>
        compareSelectLabels(a.name || a.code || a.id, b.name || b.code || b.id)
      ),
    [branchOptions]
  );
  const bankAccountsForBranch = useMemo(
    () =>
      treasuryAccountsForWorkspace(
        { treasuryAccounts: bankAccounts, branchScope: ws?.branchScope },
        ws?.session,
        { branchScope: ws?.branchScope, viewAllBranches: ws?.viewAllBranches }
      ),
    [bankAccounts, ws?.session, ws?.branchScope, ws?.viewAllBranches]
  );
  const bankAccountsVisible = useMemo(
    () => (showAllTreasuryInTab ? bankAccounts : bankAccountsForBranch),
    [showAllTreasuryInTab, bankAccounts, bankAccountsForBranch]
  );
  const bankAccountsForPayout = bankAccountsForBranch;
  const bankAccountsSelectOrder = useMemo(
    () =>
      [...bankAccountsForPayout].sort((a, b) =>
        compareSelectLabels(treasuryAccountDisplayName(a), treasuryAccountDisplayName(b))
      ),
    [bankAccountsForPayout]
  );
  const liveQuotations = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.quotations) ? ws.snapshot.quotations : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.quotations]
  );
  const liveProductionJobs = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.productionJobs) ? ws.snapshot.productionJobs : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.productionJobs]
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

  /** Book per account = stored opening + Σ movements (matches edit modal and statements). */
  const treasuryDisplayedBookNgnById = useMemo(() => {
    const map = new Map();
    for (const acc of bankAccounts) {
      const id = Number(acc.id);
      if (!Number.isFinite(id)) continue;
      const movSum = liveTreasuryMovements
        .filter((m) => Number(m.treasuryAccountId) === id)
        .reduce((s, m) => s + (Number(m.amountNgn) || 0), 0);
      const o = Math.round(Number(acc.openingBalanceNgn ?? 0));
      const opening = Number.isNaN(o) ? 0 : o;
      map.set(id, opening + movSum);
    }
    return map;
  }, [bankAccounts, liveTreasuryMovements]);

  const totals = useMemo(() => {
    const cash = bankAccounts.reduce((acc, curr) => {
      const id = Number(curr.id);
      const implied = Number.isFinite(id) ? treasuryDisplayedBookNgnById.get(id) : undefined;
      return acc + (implied !== undefined ? implied : Number(curr.balance) || 0);
    }, 0);
    return { cash };
  }, [bankAccounts, treasuryDisplayedBookNgnById]);

  function treasuryBookDisplayNgn(acc) {
    if (!acc) return 0;
    const id = Number(acc.id);
    if (!Number.isFinite(id)) return Number(acc.balance) || 0;
    const implied = treasuryDisplayedBookNgnById.get(id);
    return implied !== undefined ? implied : Number(acc.balance) || 0;
  }

  /** Edit-account modal: book balance = opening (form) + net posted movements for this account. */
  const treasuryEditImpliedBookStr = useMemo(() => {
    if (newBank.id == null || newBank.id === '') return '';
    const id = Number(newBank.id);
    if (!Number.isFinite(id)) return '';
    const movSum = liveTreasuryMovements
      .filter((m) => Number(m.treasuryAccountId) === id)
      .reduce((s, m) => s + (Number(m.amountNgn) || 0), 0);
    const o = Math.round(Number(newBank.openingBalanceNgn || 0));
    const implied = (Number.isNaN(o) ? 0 : o) + movSum;
    return String(implied);
  }, [newBank.id, newBank.openingBalanceNgn, liveTreasuryMovements]);

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
          sourceKind: m.sourceKind,
          at: String(m.postedAtISO || '').slice(0, 10),
          fromTreasuryAccountId: m.treasuryAccountId,
          toTreasuryAccountId: twin?.treasuryAccountId,
          fromName: m.accountName,
          toName: twin?.accountName || '—',
          amountNgn: Math.abs(m.amountNgn || 0),
          reference: m.reference || twin?.reference || '',
          displayReference: [tag, m.reference || twin?.reference || '—'].filter(Boolean).join(' · '),
          isTreasuryTransfer: m.sourceKind === 'TREASURY_TRANSFER',
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
    () => liveReceivablesNgn(liveQuotations, liveLedgerEntries, liveProductionJobs),
    [liveLedgerEntries, liveProductionJobs, liveQuotations]
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
    receiptFinanceRow != null ||
    reclassifyTarget != null;

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
    if (!showPaymentEntry || selectedPayment?.type !== 'payment_request' || !selectedPayment?.id) {
      setPaymentGlPreview(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch(
        `/api/payment-requests/${encodeURIComponent(selectedPayment.id)}/gl-preview`
      );
      if (!cancelled) setPaymentGlPreview(ok && data?.ok ? data : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [showPaymentEntry, selectedPayment?.id, selectedPayment?.type]);

  useEffect(() => {
    if (activeTab !== 'disbursements' || !ws?.hasWorkspaceData) {
      setExceptionReportSummary(null);
      return undefined;
    }
    let cancelled = false;
    const now = new Date();
    const startISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endISO = now.toISOString().slice(0, 10);
    const branchQ =
      ws?.viewAllBranches && ws?.branchScope === 'ALL' ? '' : `&branchScope=${encodeURIComponent(ws?.branchScope || '')}`;
    (async () => {
      const { ok, data } = await apiFetch(
        `/api/reports/expense-category-monthly-alert?startDate=${startISO}&endDate=${endISO}${branchQ}`
      );
      if (!cancelled && ok && data?.ok) setExceptionReportSummary(data.summary || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, ws?.hasWorkspaceData, ws?.branchScope, ws?.viewAllBranches]);

  useEffect(() => {
    if (!reclassifyTarget || !reclassifyForm.expenseCategory) {
      setReclassifyGlPreview(null);
      return undefined;
    }
    const paid = Number(reclassifyTarget.paidAmountNgn) || 0;
    const isExpense = reclassifyTarget._reclassKind === 'expense';
    if (!isExpense && paid <= 0) {
      setReclassifyGlPreview(null);
      return undefined;
    }
    if (isExpense && !reclassifyTarget.expenseID) {
      setReclassifyGlPreview(null);
      return undefined;
    }
    let cancelled = false;
    const q = encodeURIComponent(reclassifyForm.expenseCategory);
    const url = isExpense
      ? `/api/expenses/${encodeURIComponent(reclassifyTarget.expenseID)}/category-reclass-preview?expenseCategory=${q}`
      : `/api/payment-requests/${encodeURIComponent(reclassifyTarget.requestID)}/category-reclass-preview?expenseCategory=${q}`;
    (async () => {
      const { ok, data } = await apiFetch(url);
      if (!cancelled) setReclassifyGlPreview(ok && data?.ok ? data : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [reclassifyTarget, reclassifyForm.expenseCategory]);

  const statementDateBounds = useMemo(() => {
    if (accountStatementLines.length === 0) return { minDate: '', maxDate: '' };
    const dates = accountStatementLines
      .map((line) => String(line.postedAtISO || '').slice(0, 10))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    if (dates.length === 0) return { minDate: '', maxDate: '' };
    const minDate = dates.reduce((min, current) => (current < min ? current : min), dates[0]);
    const maxDate = dates.reduce((max, current) => (current > max ? current : max), dates[0]);
    return { minDate, maxDate };
  }, [accountStatementLines]);

  const closeStatementModal = useCallback(() => {
    setStatementAccount(null);
    setShowStatementPrintModal(false);
  }, []);

  const escapeHtml = useCallback((value) => {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }, []);

  /** Compact DD/MM/YY for statement tables (from YYYY-MM-DD or ISO). */
  const formatStatementShortDate = useCallback((iso) => {
    const d = String(iso || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return '—';
    const [y, m, day] = d.split('-').map(Number);
    const dt = new Date(y, m - 1, day);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }, []);

  const openStatementForDateRange = useCallback((autoPrint = true) => {
    if (!statementAccount) return;
    const fromDate = String(statementPrintFromDate || '').trim();
    const toDate = String(statementPrintToDate || '').trim();
    if (!fromDate || !toDate) {
      showToast('Select both start and end dates before printing.', { variant: 'warning' });
      return;
    }
    if (fromDate > toDate) {
      showToast('Start date cannot be after end date.', { variant: 'warning' });
      return;
    }
    const lines = accountStatementLines.filter((line) => {
      const date = String(line.postedAtISO || '').slice(0, 10);
      return date >= fromDate && date <= toDate;
    });
    if (lines.length === 0) {
      showToast('No statement lines found for the selected date range.', { variant: 'warning' });
      return;
    }
    const chronologicalAllLines = accountStatementLines
      .slice()
      .sort((a, b) => {
        const ta = String(a.postedAtISO || '');
        const tb = String(b.postedAtISO || '');
        if (ta !== tb) return ta.localeCompare(tb);
        return String(a.id || '').localeCompare(String(b.id || ''));
      });
    const totalMovementsNgn = chronologicalAllLines.reduce((sum, line) => sum + (Number(line.amountNgn) || 0), 0);
    const currentBookBalanceNgn = Number(statementAccount.balance) || 0;
    const impliedOpeningFromPostingsNgn = currentBookBalanceNgn - totalMovementsNgn;
    const regOpeningRaw = statementAccount.openingBalanceNgn;
    const openingBookBalanceNgn = Math.round(
      Number(
        regOpeningRaw !== undefined && regOpeningRaw !== null
          ? regOpeningRaw
          : impliedOpeningFromPostingsNgn
      ) || 0
    );
    const fromBoundaryBalanceNgn = chronologicalAllLines.reduce((sum, line) => {
      const date = String(line.postedAtISO || '').slice(0, 10);
      return date < fromDate ? sum + (Number(line.amountNgn) || 0) : sum;
    }, openingBookBalanceNgn);
    let runningBalanceNgn = fromBoundaryBalanceNgn;
    const rangeLines = lines
      .slice()
      .sort((a, b) => {
        const ta = String(a.postedAtISO || '');
        const tb = String(b.postedAtISO || '');
        if (ta !== tb) return ta.localeCompare(tb);
        return String(a.id || '').localeCompare(String(b.id || ''));
      });
    const totals = rangeLines.reduce(
      (acc, line) => {
        const amount = Number(line.amountNgn) || 0;
        if (amount > 0) acc.in += amount;
        if (amount < 0) acc.out += Math.abs(amount);
        return acc;
      },
      { in: 0, out: 0 }
    );
    const rowsHtml = rangeLines
      .map((line, index) => {
        const amount = Number(line.amountNgn) || 0;
        const inNgn = amount > 0 ? formatNgn(amount) : '—';
        const outNgn = amount < 0 ? formatNgn(Math.abs(amount)) : '—';
        runningBalanceNgn += amount;
        return `<tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(formatStatementShortDate(line.postedAtISO))}</td>
          <td>${escapeHtml(treasuryMovementSourceBadge(line).label)}</td>
          <td>${escapeHtml(treasuryMovementStatementLabel(line))}</td>
          <td class="num">${escapeHtml(inNgn)}</td>
          <td class="num">${escapeHtml(outNgn)}</td>
          <td class="num">${escapeHtml(formatNgn(runningBalanceNgn))}</td>
        </tr>`;
      })
      .join('');
    const accountTitle = `${statementAccount.name || 'Treasury account'}${
      statementAccount.bankName ? ` · ${statementAccount.bankName}` : ''
    }`;
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Statement - ${escapeHtml(accountTitle)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
    h1 { margin: 0 0 8px; font-size: 20px; }
    p.meta { margin: 0 0 4px; color: #334155; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 3px 5px; vertical-align: top; line-height: 1.25; }
    th { background: #f8fafc; text-align: left; }
    td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 10px; }
  </style>
</head>
<body>
  <h1>Account Statement</h1>
  <p class="meta"><strong>Account:</strong> ${escapeHtml(accountTitle)}</p>
  <p class="meta"><strong>Period:</strong> ${escapeHtml(formatStatementShortDate(fromDate))} – ${escapeHtml(
      formatStatementShortDate(toDate)
    )}</p>
  <p class="meta"><strong>Printed:</strong> ${escapeHtml(
      new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
    )}</p>
  <p class="meta"><strong>Opening balance:</strong> ${escapeHtml(formatNgn(fromBoundaryBalanceNgn))}</p>
  <p class="meta"><strong>Total inflow:</strong> ${escapeHtml(formatNgn(totals.in))} &nbsp;|&nbsp; <strong>Total outflow:</strong> ${escapeHtml(
      formatNgn(totals.out)
    )}</p>
  <p class="meta"><strong>Closing balance:</strong> ${escapeHtml(formatNgn(fromBoundaryBalanceNgn + totals.in - totals.out))}</p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Date</th>
        <th>Source</th>
        <th>Description</th>
        <th>In (NGN)</th>
        <th>Out (NGN)</th>
        <th>Balance (NGN)</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;
    if (autoPrint) {
      if (!openPrintHtmlDocument(html, `Statement - ${accountTitle}`)) {
        showToast('Could not open print preview.', { variant: 'warning' });
        return;
      }
    } else {
      const previewWindow = window.open('', '_blank');
      if (!previewWindow) {
        showToast('Pop-up blocked. Allow pop-ups to open the statement preview.', { variant: 'warning' });
        return;
      }
      previewWindow.document.write(html);
      previewWindow.document.close();
      previewWindow.focus();
    }
    setShowStatementPrintModal(false);
  }, [
    statementAccount,
    statementPrintFromDate,
    statementPrintToDate,
    accountStatementLines,
    escapeHtml,
    formatStatementShortDate,
    showToast,
  ]);

   
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get('treasuryRef')?.trim();
    if (!ref) return;
    setActiveTab('desk');
    setSearchParams({ tab: 'desk' }, { replace: true });
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
    setRefundPayLines((prev) => [...prev, createRequestPayLine(bankAccountsForPayout[0]?.id ?? '')]);
  };

  const removeRefundPayLine = (lineId) => {
    setRefundPayLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== lineId)));
  };

  const openRefundPay = useCallback((row) => {
    setRefundPayTarget(row);
    setRefundPaidBy('');
    setRefundPayLines([createRequestPayLine(bankAccountsForPayout[0]?.id ?? '', refundOutstandingAmount(row))]);
    setRefundPaymentNote(row.paymentNote || '');
    setShowRefundPayModal(true);
  }, [bankAccountsForPayout]);

  const cancelRefundBeforePay = useCallback(
    async (row) => {
      const rid = String(row?.refundID || '').trim();
      if (!rid || cancelRefundBusyId) return;
      const note = window.prompt(`Optional cancellation note for ${rid}`) || '';
      if (!(await appConfirm({ message: `Cancel refund ${rid} before payout?`, variant: 'danger' }))) return;
      if (!ws?.canMutate) {
        showToast(
          ws?.usingCachedData
            ? 'Reconnect to cancel refund requests — workspace is read-only.'
            : 'Connect to the API to cancel refund requests.',
          { variant: 'info' }
        );
        return;
      }
      setCancelRefundBusyId(rid);
      try {
        const { ok, data } = await apiFetch(`/api/refunds/${encodeURIComponent(rid)}/cancel-before-pay`, {
          method: 'POST',
          body: JSON.stringify({
            note: note.trim(),
            actedAtISO: new Date().toISOString().slice(0, 10),
          }),
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not cancel refund before payout.', { variant: 'error' });
          return;
        }
        await ws.refresh();
        showToast(`Refund ${rid} cancelled before payout.`);
      } finally {
        setCancelRefundBusyId('');
      }
    },
    [cancelRefundBusyId, showToast, ws]
  );

  const handleDeskCancelRefund = useCallback(
    (row) => {
      void cancelRefundBeforePay(row);
    },
    [cancelRefundBeforePay]
  );

  const confirmRefundPaid = async (e) => {
    e.preventDefault();
    if (!refundPayTarget?.refundID || treasuryPayoutSubmitting) return;
    const paidBy = refundPaidBy.trim() || activeActorLabel;
    const rid = refundPayTarget.refundID;
    const outstanding = refundOutstandingAmount(refundPayTarget);
    const validLines = mapTreasuryPayoutLinesForApi(refundPayLines);
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
    const refundShortAccount = findTreasuryPayoutShortAccount(
      validLines,
      bankAccountsForPayout,
      treasuryDisplayedBookNgnById
    );
    if (refundShortAccount) {
      showToast(`Insufficient balance in ${refundShortAccount.name}.`, { variant: 'error' });
      return;
    }
    if (ws?.canMutate) {
      setTreasuryPayoutSubmitting(true);
      try {
        const { ok, data } = await apiFetch(`/api/refunds/${encodeURIComponent(rid)}/pay`, {
          method: 'POST',
          body: JSON.stringify({
            paidBy,
            note: refundPaymentNote.trim(),
            paymentLines: validLines,
          }),
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not record refund payout.', { variant: 'error' });
          return;
        }
        await ws.refresh();
      } finally {
        setTreasuryPayoutSubmitting(false);
      }
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
    setRequestPayLines((prev) => [...prev, createRequestPayLine(bankAccountsForPayout[0]?.id ?? '')]);
  };

  const removeRequestPayLine = (lineId) => {
    setRequestPayLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== lineId)));
  };

  const openRequestPayment = useCallback((req) => {
    const paidAmountNgn = Number(req.paidAmountNgn) || 0;
    const outstanding = effectiveOutstandingNgn(Number(req.amountRequestedNgn) || 0, paidAmountNgn);
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
    setRequestPayLines([createRequestPayLine(bankAccountsForPayout[0]?.id ?? '', outstanding)]);
    setRequestPayNote(req.paymentNote || '');
    setShowPaymentEntry(true);
  }, [showToast, canPayRequests, ws?.viewAllBranches, ws?.branchScope, bankAccountsForPayout]);

  const openReclassifyPaymentRequest = useCallback((req) => {
    if (!req?.requestID) return;
    setReclassifyGlPreview(null);
    setReclassifyTarget(req);
    setReclassifyForm({
      expenseCategory: req.expenseCategory || '',
      categoryJustification: req.categoryJustification || '',
    });
  }, []);

  const openReclassifyExpense = useCallback((ex) => {
    if (!ex?.expenseID) return;
    setReclassifyGlPreview(null);
    setReclassifyTarget({ ...ex, requestID: '', _reclassKind: 'expense' });
    setReclassifyForm({
      expenseCategory: ex.category || '',
      categoryJustification: '',
    });
  }, []);

  const closeReclassifyModal = useCallback(() => {
    setReclassifyTarget(null);
    setReclassifyForm({ expenseCategory: '', categoryJustification: '' });
    setReclassifyGlPreview(null);
  }, []);

  const saveReclassifyCategory = useCallback(async () => {
    const isExpense = reclassifyTarget?._reclassKind === 'expense';
    const targetId = isExpense ? reclassifyTarget?.expenseID : reclassifyTarget?.requestID;
    if (!targetId || reclassifySaving) return;
    if (!ws?.canMutate) {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to reclassify categories — workspace is read-only.'
          : 'Connect to the API to reclassify expense categories.',
        { variant: 'info' }
      );
      return;
    }
    setReclassifySaving(true);
    try {
      const url = isExpense
        ? `/api/expenses/${encodeURIComponent(targetId)}/reclassify-category`
        : `/api/payment-requests/${encodeURIComponent(targetId)}/reclassify-category`;
      const { ok, data } = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify({
          expenseCategory: reclassifyForm.expenseCategory,
          categoryJustification: reclassifyForm.categoryJustification,
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not reclassify expense category.', { variant: 'error' });
        return;
      }
      await ws.refresh();
      closeReclassifyModal();
      const glNote =
        data.postPay && Number(data.glReclassCount) > 0
          ? ` GL reclass journal${Number(data.glReclassCount) === 1 ? '' : 's'} posted.`
          : data.postPay
            ? ' Register updated (no GL movement was required).'
            : '';
      showToast(`Category updated for ${targetId}.${glNote}`, { variant: 'success' });
    } finally {
      setReclassifySaving(false);
    }
  }, [reclassifyTarget, reclassifyForm, reclassifySaving, ws, showToast, closeReclassifyModal]);

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
    setRequestPayLines([createRequestPayLine(bankAccountsForPayout[0]?.id ?? '', outstanding)]);
    setRequestPayNote(row.transportFinanceAdvice || '');
    setShowPaymentEntry(true);
  };

  const exportExceptionsCsv = async () => {
    try {
      await downloadExpenseCategoryExceptionsCsv({
        viewAllBranches: ws?.viewAllBranches,
        branchScope: ws?.branchScope,
      });
    } catch {
      showToast('Could not export category exceptions.', { variant: 'error' });
    }
  };

  const confirmProcessPaymentModal = async () => {
    if (!selectedPayment?.id || treasuryPayoutSubmitting) return;

    const outstanding = effectiveOutstandingNgn(selectedPayment.total ?? 0, selectedPayment.paid ?? 0);
    const validLines = mapTreasuryPayoutLinesForApi(requestPayLines);

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
    const requestShortAccount = findTreasuryPayoutShortAccount(
      validLines,
      bankAccountsForPayout,
      treasuryDisplayedBookNgnById
    );
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
      const poId = String(selectedPayment.id);
      setTreasuryPayoutSubmitting(true);
      try {
        for (const line of validLines) {
          const { ok, data } = await apiFetch(`/api/purchase-orders/${encodeURIComponent(poId)}/post-transport`, {
            method: 'POST',
            body: JSON.stringify({
              treasuryAccountId: line.treasuryAccountId,
              amountNgn: line.amountNgn,
              reference: line.reference || poId,
              dateISO: line.dateISO,
              note: requestPayNote.trim() || 'PO transport / haulage',
              createdBy: activeActorLabel,
              ...(transportPayEditApprovalId.trim()
                ? { editApprovalId: transportPayEditApprovalId.trim() }
                : {}),
            }),
          });
          if (!ok || !data?.ok) {
            showToast(data?.error || 'Could not record transport treasury payment.', { variant: 'error' });
            await ws.refresh();
            return;
          }
        }
        await ws.refresh();
      } finally {
        setTreasuryPayoutSubmitting(false);
      }
      const fullyPaid = isEffectivelyFullyPaid(
        (selectedPayment.paid ?? 0) + requestPayTotalNgn,
        selectedPayment.total ?? 0
      );
      setShowPaymentEntry(false);
      setSelectedPayment(null);
      setRequestPayLines([]);
      setRequestPayNote('');
      setTransportPayEditApprovalId('');
      showToast(
        fullyPaid
          ? `PO ${poId} transport fee fully paid from treasury.`
          : `PO ${poId} transport part-paid from treasury.`
      );
      return;
    }

    if (selectedPayment.type !== 'payment_request') return;

    if (ws?.canMutate) {
      setTreasuryPayoutSubmitting(true);
      try {
        const { ok, data } = await apiFetch(`/api/payment-requests/${encodeURIComponent(selectedPayment.id)}/pay`, {
          method: 'POST',
          body: JSON.stringify({
            note: requestPayNote.trim(),
            paymentLines: validLines,
          }),
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not record payout for this request.', { variant: 'error' });
          return;
        }
        await ws.refresh();
      } finally {
        setTreasuryPayoutSubmitting(false);
      }
    } else {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to record payouts — workspace is read-only.'
          : 'Connect to the API to record payment request payouts.',
        { variant: 'info' }
      );
      return;
    }

    const fullyPaid = isEffectivelyFullyPaid(
      (selectedPayment.paid ?? 0) + requestPayTotalNgn,
      selectedPayment.total ?? 0
    );
    setShowPaymentEntry(false);
    setSelectedPayment(null);
    setRequestPayLines([]);
    setRequestPayNote('');
    setTransportPayEditApprovalId('');
    showToast(
      fullyPaid
        ? `Payment request ${selectedPayment.id} fully paid from treasury.`
        : `Payment request ${selectedPayment.id} part-paid from treasury.`
    );
  };

  const accountTabs = useMemo(() => {
    const all = [
      { id: 'desk', icon: <LayoutDashboard size={16} />, label: FINANCE_DESK_TAB_LABEL },
      { id: 'receipts', icon: <Banknote size={16} />, label: 'Receipts & recon' },
      { id: 'movements', icon: <ArrowRightLeft size={16} />, label: 'Movements' },
      { id: 'disbursements', icon: <ClipboardList size={16} />, label: TAB_LABELS.disbursements },
      { id: 'audit', icon: <ShieldCheck size={16} />, label: 'Audit' },
    ];
    const rk = ws?.session?.user?.roleKey;
    const permissions = ws?.permissions;
    const allowed = getAllowedLegacyAccountTabs(rk, permissions);
    if (!allowed.length) return all;
    return all
      .filter((t) => allowed.includes(t.id))
      .map((t) => {
        const cashierLabel = legacyAccountTabLabelForRole(t.id, rk);
        return cashierLabel ? { ...t, label: cashierLabel } : t;
      });
  }, [ws?.session?.user?.roleKey, ws?.permissions]);

  const handleAccountTabChange = useCallback(
    (tabId) => {
      setActiveTab(tabId);
      setSearchParams({ tab: tabId }, { replace: true });
    },
    [setSearchParams]
  );

  const handleDeskPayRequest = useCallback(
    (requestId) => {
      const id = String(requestId || '').trim();
      const req = payRequests.find((row) => String(row.requestID || '').trim() === id);
      if (req) {
        openRequestPayment(req);
        return;
      }
      handleAccountTabChange('desk');
      showToast(id ? `Payment request ${id} — check the payout queues on My desk.` : 'Open My desk to record payout.', {
        variant: 'info',
      });
    },
    [payRequests, handleAccountTabChange, showToast, openRequestPayment]
  );

  const handleDeskPayRefund = useCallback(
    (refundId) => {
      const id = String(refundId || '').trim();
      const row = customerRefunds.find((r) => String(r.refundID || '').trim() === id);
      if (row) {
        openRefundPay(row);
        return;
      }
      handleAccountTabChange('desk');
      showToast(id ? `Refund ${id} — check refund payouts on My desk.` : 'Open My desk to record refund payout.', {
        variant: 'info',
      });
    },
    [customerRefunds, handleAccountTabChange, showToast, openRefundPay]
  );

  const registerSettlementsAwaitingPay = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.registerSettlementsAwaitingPayment)
        ? registerSettlementsAwaitingPayment(ws.snapshot.registerSettlementsAwaitingPayment)
        : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.registerSettlementsAwaitingPayment]
  );

  const openRegisterSettlementPay = useCallback((row) => {
    setRegisterSettlementPayTarget(row);
    setShowRegisterSettlementPayModal(true);
  }, []);

  const handleDeskPayRegisterSettlement = useCallback(
    (settlementId) => {
      const id = String(settlementId || '').trim();
      const row = registerSettlementsAwaitingPay.find((s) => String(s.settlementId || '').trim() === id);
      if (row) {
        openRegisterSettlementPay(row);
        return;
      }
      showToast(id ? `Withdrawal ${id} — refresh workspace and try again.` : 'No register withdrawal queued for payout.', {
        variant: 'info',
      });
    },
    [registerSettlementsAwaitingPay, openRegisterSettlementPay, showToast]
  );

  const handleRegisterSettlementPaid = useCallback(async () => {
    setShowRegisterSettlementPayModal(false);
    setRegisterSettlementPayTarget(null);
    showToast('Register withdrawal paid and treasury updated.');
    await ws.refresh();
  }, [showToast, ws]);

  const handleDeskViewPaymentRequest = useCallback(
    (requestId) => {
      const id = String(requestId || '').trim();
      handleAccountTabChange('disbursements');
      if (id) setDisbursementsSearch(id);
    },
    [handleAccountTabChange]
  );

  const handleDeskPayPoTransport = useCallback(
    (row) => {
      if (row) openPoTransportTreasuryPayout(row);
    },
    [openPoTransportTreasuryPayout]
  );

  const handleDeskViewPoTransport = useCallback(
    (row) => {
      const poId = String(row?.poID || '').trim();
      handleAccountTabChange('desk');
      if (poId) setSearchQuery(poId);
    },
    [handleAccountTabChange]
  );

  const handleDeskReceiveStaffRecovery = useCallback(
    (row) => {
      if (!row?.scheduleId) return;
      if (!canPayRequests && !ws?.hasPermission?.('finance.post') && !ws?.hasPermission?.('cashier.desk.view')) {
        showToast('You do not have permission to receive staff recovery payments.', { variant: 'error' });
        return;
      }
      if (!ws?.viewAllBranches && row?.branchId && ws?.branchScope && row.branchId !== ws.branchScope) {
        showToast(`This employee belongs to branch ${row.branchId}. Switch branch before receiving payment.`, {
          variant: 'error',
        });
        return;
      }
      setStaffRecoveryTarget(row);
    },
    [canPayRequests, ws, showToast]
  );

  const handleDeskReceiveStaffObligation = useCallback(
    (row) => {
      if (!row?.id) return;
      if (!canPayRequests && !ws?.hasPermission?.('finance.post') && !ws?.hasPermission?.('cashier.desk.view')) {
        showToast('You do not have permission to record staff loan or purchase credit payments.', { variant: 'error' });
        return;
      }
      if (!ws?.viewAllBranches && row?.branchId && ws?.branchScope && row.branchId !== ws.branchScope) {
        showToast(`This employee belongs to branch ${row.branchId}. Switch branch before receiving payment.`, {
          variant: 'error',
        });
        return;
      }
      setStaffObligationTarget(row);
    },
    [canPayRequests, ws, showToast]
  );

  useEffect(() => {
    const t = searchParams.get('tab');
    const rk = ws?.session?.user?.roleKey;
    const permissions = ws?.permissions;
    const allowed = getAllowedLegacyAccountTabs(rk, permissions);
    const defaultTab = getDefaultLegacyAccountTab(rk, permissions);

    const applyTab = (tabId) => {
      setActiveTab(tabId);
      setSearchParams({ tab: tabId }, { replace: true });
    };

    if (t && TAB_LABELS[t]) {
      const tabId = t === 'treasury' ? 'desk' : t;
      if (!allowed.length || allowed.includes(tabId) || t === 'treasury') {
        applyTab(tabId);
      } else {
        applyTab(defaultTab);
      }
      return;
    }
    if (!t) {
      setActiveTab(defaultTab);
      setSearchParams({ tab: defaultTab }, { replace: true });
      return;
    }
    applyTab(defaultTab);
  }, [searchParams, ws?.session?.user?.roleKey, ws?.permissions, setSearchParams]);

  const canManageTreasury = Boolean(ws?.hasPermission?.('treasury.manage'));
  const canEditTreasuryTransfer =
    Boolean(ws?.canMutate) &&
    canManageTreasury &&
    Boolean(ws?.hasPermission?.('finance.pay'));
  const canExecTreasuryDelete =
    Boolean(ws?.canMutate) &&
    ['admin', 'md', 'ceo'].includes(String(ws?.session?.user?.roleKey || '').toLowerCase());

  const headerAction = () => {
    if (activeTab === 'desk' && canManageTreasury) {
      setNewBank(emptyBankForm());
      setShowAddBank(true);
      return;
    }
    if (activeTab === 'movements') {
      setEditingTransferBatchId('');
      setTransferForm({
        fromId: bankAccountsForBranch[0] ? String(bankAccountsForBranch[0].id) : '',
        toId: bankAccountsForBranch[1]
          ? String(bankAccountsForBranch[1].id)
          : bankAccountsForBranch[0]
            ? String(bankAccountsForBranch[0].id)
            : '',
        amountNgn: '',
        reference: '',
        dateISO: new Date().toISOString().slice(0, 10),
      });
      setShowTransferModal(true);
    }
  };

  const openEditTreasuryTransfer = (movement) => {
    if (!movement?.isTreasuryTransfer || !canEditTreasuryTransfer) return;
    setEditingTransferBatchId(String(movement.id || '').trim());
    setTransferForm({
      fromId: movement.fromTreasuryAccountId ? String(movement.fromTreasuryAccountId) : '',
      toId: movement.toTreasuryAccountId ? String(movement.toTreasuryAccountId) : '',
      amountNgn: movement.amountNgn ? String(movement.amountNgn) : '',
      reference: movement.reference || '',
      dateISO: movement.at || new Date().toISOString().slice(0, 10),
    });
    setShowTransferModal(true);
  };

  const closeTransferModal = () => {
    setShowTransferModal(false);
    setEditingTransferBatchId('');
  };

  const newRecordLabel =
    activeTab === 'desk' && canManageTreasury
      ? 'New account'
      : activeTab === 'movements'
        ? 'New transfer'
        : null;

   
  useEffect(() => {
    const st = location.state;
    if (!st || typeof st !== 'object') return;

    const rk = ws?.session?.user?.roleKey;
    const permissions = ws?.permissions;

    const goToResolvedTab = (tabOrAlias) => {
      const resolved =
        resolveAccountsNavigationTab(tabOrAlias, rk, permissions) ??
        getDefaultLegacyAccountTab(rk, permissions);
      handleAccountTabChange(resolved);
      const search = `?tab=${encodeURIComponent(resolved)}`;
      navigate({ pathname: location.pathname, search }, { replace: true, state: {} });
      return resolved;
    };

    const tab = st.accountsTab;
    if (tab === 'requests' || tab === 'payments' || (tab && TAB_LABELS[tab])) {
      goToResolvedTab(tab);
      return;
    }

    const glJid = st.highlightGlJournalId != null ? String(st.highlightGlJournalId).trim() : '';
    if (glJid) {
      const resolved = goToResolvedTab('audit');
      if (resolved !== 'audit') {
        showToast(`GL journal ${glJid} — audit tools are not available on your desk.`, { variant: 'info' });
      } else {
        showToast(`GL journal ${glJid} — use Audit and GL tools to open details.`, { variant: 'info' });
      }
      return;
    }

    if (st.openPayRequestModal) {
      const resolved = goToResolvedTab('disbursements');
      if (resolved === 'disbursements') {
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
      } else {
        showToast('Open My desk to pay approved payment requests.', { variant: 'info' });
      }
      return;
    }

    if (st.openExpenseModal) {
      const resolved = goToResolvedTab('disbursements');
      if (resolved === 'disbursements') {
        setExpenseForm((f) => ({
          ...f,
          debitAccountId: String(bankAccountsForBranch[0]?.id ?? ''),
        }));
        setShowExpenseModal(true);
      } else {
        showToast('Expense recording is on the payment register — use My desk for payouts.', { variant: 'info' });
      }
      return;
    }

    if (st.openExpenseCorrection) {
      const correction = st.openExpenseCorrection || {};
      const requestId = String(correction.requestId || '').trim();
      const req = requestId ? payRequests.find((row) => String(row.requestID || '').trim() === requestId) : null;
      const amountNgn = Number(req?.amountRequestedNgn ?? correction.amountRequestedNgn ?? 0);
      const chosenCategory = String(req?.expenseCategory || correction.expenseCategory || '').trim();
      const suggestedReference = String(
        req?.requestReference || correction.requestReference || requestId || req?.requestID || ''
      ).trim();
      const resolved = goToResolvedTab('disbursements');
      if (resolved === 'disbursements') {
        setExpenseForm({
          expenseType: 'Operational — correction entry',
          amountNgn: amountNgn > 0 ? String(amountNgn) : '',
          date: String(req?.requestDate || correction.requestDate || todayIso).slice(0, 10),
          category: chosenCategory,
          categoryJustification: String(req?.categoryJustification || correction.categoryJustification || '').trim(),
          paymentMethod: 'Bank Transfer',
          debitAccountId: String(bankAccountsForBranch[0]?.id ?? ''),
          reference: suggestedReference || 'Correction entry',
        });
        setShowExpenseModal(true);
        showToast(
          requestId
            ? `Rejected request ${requestId} moved to archive. Record the corrected expense below.`
            : 'Rejected request moved to archive. Record the corrected expense below.',
          { variant: 'info' }
        );
      } else {
        showToast('Open My desk for payout work — payment register is not on your role.', { variant: 'info' });
      }
    }
  }, [
    location.state,
    location.pathname,
    navigate,
    handleAccountTabChange,
    todayIso,
    bankAccounts,
    bankAccountsForBranch,
    payRequests,
    showToast,
    ws?.session?.user?.roleKey,
    ws?.permissions,
  ]);
   

  const salesReceipts = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.receipts) ? [...ws.snapshot.receipts] : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.receipts]
  );

  const refundPayPaymentConfirmers = useMemo(() => {
    const qref = String(refundPayTarget?.quotationRef || '').trim();
    if (!qref) return [];
    const names = new Set();
    for (const receipt of salesReceipts) {
      if (String(receipt.quotationRef || '').trim() !== qref) continue;
      if (!receipt.financeReconciliationSavedAtISO) continue;
      const name = String(receipt.financeReconciliationSavedBy || '').trim();
      if (name) names.add(name);
    }
    return [...names];
  }, [refundPayTarget?.quotationRef, salesReceipts]);

  const reconciledSubtotalNgn = useMemo(
    () =>
      salesReceipts
        .filter((r) => !isReceiptReversed(r) && Boolean(r.financeReconciliationSavedAtISO))
        .reduce((sum, r) => sum + (Number(r.bankReceivedAmountNgn ?? r.cashReceivedNgn ?? r.amountNgn) || 0), 0),
    [salesReceipts]
  );
  const nonReconciledSubtotalNgn = useMemo(
    () =>
      salesReceipts
        .filter((r) => isReceiptPendingClearance(r))
        .reduce((sum, r) => sum + (Number(r.cashReceivedNgn ?? r.amountNgn) || 0), 0),
    [salesReceipts]
  );

  const receiptsVisibleInReconciliationQueue = useMemo(() => salesReceipts, [salesReceipts]);

  const filteredSalesReceipts = useMemo(() => {
    const qq = (receiptsTableSearch.trim() || debouncedSearchQuery.trim()).toLowerCase();
    if (!qq) return receiptsVisibleInReconciliationQueue;
    return receiptsVisibleInReconciliationQueue.filter((r) => {
      const id = String(r.id || '').toLowerCase();
      const cust = String(r.customer || '').toLowerCase();
      const qref = String(r.quotationRef || '').toLowerCase();
      const amt = String(r.amountNgn ?? '').toLowerCase();
      const date = String(r.dateISO || r.date || '').toLowerCase();
      return (
        id.includes(qq) ||
        cust.includes(qq) ||
        qref.includes(qq) ||
        amt.includes(qq) ||
        date.includes(qq)
      );
    });
  }, [receiptsVisibleInReconciliationQueue, receiptsTableSearch, debouncedSearchQuery]);

  const resolveSalesReceiptFromStatementMovement = useCallback(
    (movement) => {
      const candidates = [
        String(movement?.sourceId || '').trim(),
        String(movement?.reference || '').trim().split(/\s+/)[0] || '',
        String(movement?.note || '').trim().split(/\s+/)[0] || '',
      ].filter(Boolean);
      for (const token of candidates) {
        const found = findSalesReceiptByMatchToken(salesReceipts, token);
        if (found) return found;
      }
      return null;
    },
    [salesReceipts]
  );

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

  const waitingConfirmationReceipts = useMemo(
    () => sortedFilteredSalesReceipts.filter((r) => isReceiptPendingClearance(r)),
    [sortedFilteredSalesReceipts]
  );

  const openUnreconciledReceiptsPrint = useCallback(() => {
    const payload = unreconciledReceiptsPrintPayload(waitingConfirmationReceipts, liveTreasuryMovements, {
      branchLabel: workspaceBranchLabel || ws?.snapshot?.branch?.name || ws?.workspaceBranchId || '',
    });
    if (!payload.rows.length) {
      showToast('No unreconciled receipts to print.', { variant: 'info' });
      return;
    }
    if (!openReconciliationListPrint(payload)) {
      showToast('Could not open print preview.', { variant: 'warning' });
    }
  }, [
    waitingConfirmationReceipts,
    liveTreasuryMovements,
    workspaceBranchLabel,
    ws?.snapshot?.branch?.name,
    ws?.workspaceBranchId,
    showToast,
  ]);

  const runAdminReapplyFinanceReconciledReceipts = useCallback(async () => {
    if (!isAdminRole) return;
    if (!wsCanMutate) {
      showToast('System offline (read-only). Reconnect and refresh, then try again.', { variant: 'error' });
      return;
    }
    const proceed = await appConfirm({
      message:
        'Administrator maintenance: re-apply finance-confirmed bank amounts on every cleared receipt in the current branch scope.\n\n' +
        'This replaces stale sales-posted totals with the reconciled bank figure, fixes RECEIPT / OVERPAY ledger splits, and refreshes quotation paid amounts (including refund eligibility).\n\n' +
        'Use after correcting mistaken till entries that still show phantom overpayments.\n\nContinue?',
    });
    if (!proceed) return;
    setAdminFinanceReapplyBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/admin/reapply-finance-reconciled-receipts', {
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Reapply job failed.', { variant: 'error' });
        return;
      }
      const failN = data.failures?.length ?? 0;
      showToast(
        `Reapplied ${data.receiptCount ?? 0} cleared receipt(s): ${data.changed ?? 0} updated, ${data.unchanged ?? 0} already aligned.${
          failN > 0 ? ` ${failN} receipt(s) reported errors — check server audit log.` : ''
        }`,
        { variant: failN > 0 ? 'warning' : 'success' }
      );
      await wsRefresh?.();
    } finally {
      setAdminFinanceReapplyBusy(false);
    }
  }, [isAdminRole, wsCanMutate, showToast, wsRefresh]);

  const confirmedReceipts = useMemo(
    () =>
      sortedFilteredSalesReceipts.filter(
        (r) => !isReceiptReversed(r) && Boolean(r.financeReconciliationSavedAtISO)
      ),
    [sortedFilteredSalesReceipts]
  );

  const waitingReceiptsListWindow = useMemo(() => {
    const total = waitingConfirmationReceipts.length;
    const pageCount = Math.max(1, Math.ceil(total / RECEIPTS_PAGE_SIZE) || 1);
    const safePage = Math.min(waitingReceiptsPage, pageCount - 1);
    const start = safePage * RECEIPTS_PAGE_SIZE;
    const slice = waitingConfirmationReceipts.slice(start, start + RECEIPTS_PAGE_SIZE);
    const from = total === 0 ? 0 : start + 1;
    const to = Math.min(start + RECEIPTS_PAGE_SIZE, total);
    return { total, pageCount, safePage, slice, from, to };
  }, [waitingConfirmationReceipts, waitingReceiptsPage]);

  const receiptsListWindow = useMemo(() => {
    const total = confirmedReceipts.length;
    const pageCount = Math.max(1, Math.ceil(total / RECEIPTS_PAGE_SIZE) || 1);
    const safePage = Math.min(confirmedReceiptsPage, pageCount - 1);
    const start = safePage * RECEIPTS_PAGE_SIZE;
    const slice = confirmedReceipts.slice(start, start + RECEIPTS_PAGE_SIZE);
    const from = total === 0 ? 0 : start + 1;
    const to = Math.min(start + RECEIPTS_PAGE_SIZE, total);
    return { total, pageCount, safePage, slice, from, to };
  }, [confirmedReceipts, confirmedReceiptsPage]);

  const receiptsPendingClearanceNgn = useMemo(
    () =>
      waitingConfirmationReceipts.reduce((s, r) => s + (Number(receiptCashReceivedNgn(r)) || Number(r.amountNgn) || 0), 0),
    [waitingConfirmationReceipts]
  );

  const openBankDepositsCount = useMemo(() => {
    const rows = Array.isArray(ws?.snapshot?.bankDeposits) ? ws.snapshot.bankDeposits : [];
    return rows.filter((d) => {
      const st = String(d.status || '').toUpperCase();
      return ['OPEN', 'PARTIAL', 'RESERVED'].includes(st) && Math.round(Number(d.remainingNgn) || 0) > 0;
    }).length;
  }, [ws?.snapshot?.bankDeposits]);

  useEffect(() => {
    setWaitingReceiptsPage(0);
    setConfirmedReceiptsPage(0);
  }, [receiptsSortKey, receiptsSortDir, debouncedSearchQuery, receiptsTableSearch]);

  useEffect(() => {
    const total = waitingConfirmationReceipts.length;
    const pageCount = Math.max(1, Math.ceil(total / RECEIPTS_PAGE_SIZE) || 1);
    setWaitingReceiptsPage((p) => Math.min(p, pageCount - 1));
  }, [waitingConfirmationReceipts.length]);

  useEffect(() => {
    const total = confirmedReceipts.length;
    const pageCount = Math.max(1, Math.ceil(total / RECEIPTS_PAGE_SIZE) || 1);
    setConfirmedReceiptsPage((p) => Math.min(p, pageCount - 1));
  }, [confirmedReceipts.length]);

  const canFinanceReceiptSettlement = Boolean(
    ws?.hasPermission?.('finance.pay') || ws?.hasPermission?.('finance.post')
  );

  const openReceiptFinance = useCallback(
    (r) => {
      setReceiptFinanceRow(r);
      const allocated = Number(r.amountNgn) || 0;
      const cash = r.cashReceivedNgn != null ? Number(r.cashReceivedNgn) || allocated : allocated;
      const br =
        r.bankReceivedAmountNgn != null ? Number(r.bankReceivedAmountNgn) : cash;
      setReceiptBankAmtInput(String(br));
      setReceiptHoldDelivery(Boolean(r.financeReconciliationSavedAtISO && !r.financeDeliveryClearedAtISO));
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

  const handleDeskConfirmReceipt = useCallback(
    (receipt) => {
      if (!receipt) return;
      openReceiptFinance(receipt);
    },
    [openReceiptFinance]
  );

  const handleDeskViewReceipt = useCallback(
    (receipt) => {
      const rid = String(receipt?.id || '').trim();
      handleAccountTabChange('receipts');
      if (rid) setReceiptsTableSearch(rid);
    },
    [handleAccountTabChange]
  );

  const reverseReceiptFinanceRow = useCallback(async () => {
    const row = receiptFinanceRow;
    if (!row?.id || receiptReverseBusy) return;
    if (!ws?.hasPermission?.('finance.reverse') && !ws?.hasPermission?.('finance.pay')) {
      showToast('Finance permission is required to reverse a receipt.', { variant: 'error' });
      return;
    }
    if (!ws?.canMutate) {
      showToast('Connect to the API server to reverse receipts.', { variant: 'error' });
      return;
    }
    const note = window.prompt(
      `Reverse receipt ${row.id}? This keeps an audit trail. Enter reason (required):`,
      'Wrong amount recorded — reversing before correct post'
    );
    if (note == null) return;
    if (!String(note).trim()) {
      showToast('A reason is required to reverse a receipt.', { variant: 'error' });
      return;
    }
    setReceiptReverseBusy(true);
    try {
      const entryId = String(row.ledgerEntryId || row.id || '').trim();
      const { ok, data } = await apiFetch('/api/ledger/reverse-receipt', {
        method: 'POST',
        body: JSON.stringify({ entryId, note: String(note).trim() }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not reverse receipt.', { variant: 'error' });
        return;
      }
      showToast('Receipt reversed. Post the correct amount from Sales if needed.');
      setReceiptFinanceRow(null);
      setPaymentCorrectionDrafts({});
      await ws.refresh();
    } finally {
      setReceiptReverseBusy(false);
    }
  }, [receiptFinanceRow, receiptReverseBusy, showToast, ws]);

  const saveReceiptFinance = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (!receiptFinanceRow?.id) return;
      if (!wsCanMutate) {
        showToast(
          wsUsingCachedData
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

      const bankReceivedAmountNgn =
        settleSplits.length > 0
          ? paymentLineCorrections.reduce((sum, line) => sum + line.amountNgn, 0)
          : parseNgnInput(receiptBankAmtInput);
      if (bankReceivedAmountNgn <= 0) {
        showToast('Enter the amount actually received before confirming.', { variant: 'error' });
        return;
      }

      setReceiptFinanceBusy(true);
      try {
        const { ok, status, data } = await apiFetch(
          `/api/sales-receipts/${encodeURIComponent(receiptFinanceRow.id)}/finance-settlement`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bankReceivedAmountNgn,
              clearForDelivery: !receiptHoldDelivery,
              paymentLineCorrections,
            }),
          }
        );
        if (!ok || !data?.ok) {
          const hint = data?.code === 'CSRF_INVALID' ? ' Refresh the page and try again.' : '';
          showToast((data?.error || `Could not save settlement (${status}).`) + hint, { variant: 'error' });
          return;
        }
        showToast(
          receiptHoldDelivery
            ? 'Payment confirmed — books updated (delivery held).'
            : 'Payment confirmed — books updated and cleared for delivery.'
        );
        setReceiptFinanceRow(null);
        setPaymentCorrectionDrafts({});
        await wsRefresh?.();
      } finally {
        setReceiptFinanceBusy(false);
      }
    },
    [
      receiptFinanceRow,
      receiptBankAmtInput,
      receiptHoldDelivery,
      paymentCorrectionDrafts,
      liveTreasuryMovements,
      todayIso,
      wsRefresh,
      wsCanMutate,
      wsUsingCachedData,
      showToast,
    ]
  );

  const saveExpense = async (e) => {
    e.preventDefault();
    if (savingExpense) return;
    const amount = Number(expenseForm.amountNgn);
    const debitId = Number(expenseForm.debitAccountId);
    if (!expenseForm.category.trim() || Number.isNaN(amount) || amount <= 0) return;
    if (!debitId) {
      showToast('Select the account paying this expense.', { variant: 'error' });
      return;
    }
    const debitAcc = bankAccounts.find((a) => a.id === debitId);
    if (!debitAcc || treasuryBookDisplayNgn(debitAcc) < amount) {
      showToast('Selected account has insufficient balance.', { variant: 'error' });
      return;
    }
    const catCheck = validateExpenseCategorySelection({
      actor: { roleKey: ws?.session?.user?.roleKey, permissions: ws?.session?.permissions },
      category: expenseForm.category.trim(),
      amountNgn: amount,
      description: expenseForm.expenseType || expenseForm.reference || '',
      categoryJustification: expenseForm.categoryJustification,
      hasAttachment: false,
      requireAttachment: false,
      hasPermission: (p) => Boolean(ws?.hasPermission?.(p)),
      policyLimits: ws?.snapshot?.orgGovernanceLimits,
    });
    if (!catCheck.ok) {
      showToast(catCheck.error || 'Check expense category and justification.', { variant: 'error' });
      return;
    }
    const row = {
      expenseType: expenseForm.expenseType,
      amountNgn: amount,
      date: expenseForm.date || new Date().toISOString().slice(0, 10),
      category: expenseForm.category.trim(),
      categoryJustification: String(expenseForm.categoryJustification || '').trim() || undefined,
      paymentMethod: expenseForm.paymentMethod,
      debitAccountId: debitId,
      reference: expenseForm.reference.trim() || '—',
    };
    if (ws?.canMutate) {
      setSavingExpense(true);
      let ok = false;
      let data = null;
      try {
        ({ ok, data } = await apiFetch('/api/expenses', {
          method: 'POST',
          body: JSON.stringify({
            ...row,
            treasuryAccountId: debitId,
            createdBy: activeActorLabel,
          }),
        }));
      } finally {
        setSavingExpense(false);
      }
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
      categoryJustification: '',
      paymentMethod: 'Bank Transfer',
      debitAccountId: String(bankAccountsForBranch[0]?.id ?? ''),
      reference: '',
    });
    setShowExpenseModal(false);
    showToast('Expense recorded and synced.');
  };

  const mapTreasuryMovementToPayFromRow = useCallback(
    (m) => ({
      movementId: String(m.id),
      amountNgn: Number(m.amountNgn) || 0,
      treasuryAccountId: String(m.treasuryAccountId ?? ''),
      postedDate: String(m.postedAtISO || '').slice(0, 10) || todayIso,
      note: '',
    }),
    [todayIso]
  );

  const openPayFromCorrection = useCallback(
    ({ headline, subline, lines, focusMovementId }) => {
      if (!lines?.length) {
        showToast('No treasury payout recorded yet.', { variant: 'info' });
        return;
      }
      const rows = lines.map(mapTreasuryMovementToPayFromRow);
      let lineIdx = 0;
      if (focusMovementId) {
        const i = rows.findIndex((r) => r.movementId === String(focusMovementId));
        if (i >= 0) lineIdx = i;
      }
      setExpenseOutflowLineIdx(lineIdx);
      setExpenseOutflowEdit({ headline, subline, rows });
    },
    [mapTreasuryMovementToPayFromRow, showToast]
  );

  const openExpenseOutflowEdit = useCallback(
    (ex) => {
      openPayFromCorrection({
        headline: 'Direct expense — bank/cash paid from',
        subline: `${ex.expenseID} · ${ex.category || ex.expenseType || ''}`,
        lines: treasuryOutflowLinesForExpense(ex.expenseID, liveTreasuryMovements),
      });
    },
    [liveTreasuryMovements, openPayFromCorrection]
  );

  const openPaymentRequestOutflowEdit = useCallback(
    (req) => {
      openPayFromCorrection({
        headline: 'Payment request — bank/cash paid from',
        subline: `${req.requestID} · ${req.description || req.expenseCategory || ''}`,
        lines: treasuryOutflowLinesForPaymentRequest(req.requestID, liveTreasuryMovements),
      });
    },
    [liveTreasuryMovements, openPayFromCorrection]
  );

  const openRefundOutflowEdit = useCallback(
    (rf) => {
      openPayFromCorrection({
        headline: 'Customer refund — bank/cash paid from',
        subline: `${rf.refundID} · ${rf.customer || ''}`,
        lines: treasuryOutflowLinesForRefund(rf.refundID, liveTreasuryMovements),
      });
    },
    [liveTreasuryMovements, openPayFromCorrection]
  );

  const openPurchaseOrderOutflowEdit = useCallback(
    (poId, movementType) => {
      const types =
        movementType === 'TRANSPORT_PAYMENT'
          ? ['TRANSPORT_PAYMENT']
          : movementType === 'SUPPLIER_PAYMENT'
            ? ['SUPPLIER_PAYMENT']
            : undefined;
      openPayFromCorrection({
        headline: payFromCorrectionHeadlineForMovementType(movementType || 'SUPPLIER_PAYMENT'),
        subline: `PO ${poId}`,
        lines: treasuryOutflowLinesForPurchaseOrder(poId, liveTreasuryMovements, types ? { types } : {}),
      });
    },
    [liveTreasuryMovements, openPayFromCorrection]
  );

  const openAccountsPayableOutflowEdit = useCallback(
    (apId) => {
      openPayFromCorrection({
        headline: 'Purchase (AP) payment — bank/cash paid from',
        subline: `AP ${apId}`,
        lines: treasuryOutflowLinesForAccountsPayable(apId, liveTreasuryMovements),
      });
    },
    [liveTreasuryMovements, openPayFromCorrection]
  );

  const updateExpenseOutflowRowField = useCallback((idx, patch) => {
    setExpenseOutflowEdit((prev) => {
      if (!prev?.rows?.[idx]) return prev;
      const rows = prev.rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
      return { ...prev, rows };
    });
  }, []);

  const saveExpenseOutflowEdit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!expenseOutflowEdit?.rows?.length) return;
      const idx = Math.min(Math.max(0, expenseOutflowLineIdx), expenseOutflowEdit.rows.length - 1);
      const row = expenseOutflowEdit.rows[idx];
      if (!row?.movementId) return;
      if (!ws?.canMutate) {
        showToast('Connect to the API to save.', { variant: 'info' });
        return;
      }
      const tid = Number(row.treasuryAccountId);
      if (!tid) {
        showToast('Select the treasury account this payment left from.', { variant: 'error' });
        return;
      }
      setExpenseOutflowSaving(true);
      try {
        const body = {
          treasuryAccountId: tid,
          postedAtISO: row.postedDate ? `${row.postedDate}T12:00:00.000Z` : undefined,
          ...(String(row.note || '').trim() ? { note: String(row.note).trim() } : {}),
        };
        const { ok, data } = await apiFetch(
          `/api/treasury/movements/${encodeURIComponent(row.movementId)}/expense-out-correction`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not update pay-from account.', { variant: 'error' });
          return;
        }
        await ws.refresh();
        showToast(data?.noOp ? 'No changes to apply.' : 'Pay-from account updated.');
        setExpenseOutflowEdit(null);
      } finally {
        setExpenseOutflowSaving(false);
      }
    },
    [expenseOutflowEdit, expenseOutflowLineIdx, ws, showToast]
  );

  const savePayRequest = async (e) => {
    e.preventDefault();
    if (savingPayRequest) return;
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
      setSavingPayRequest(true);
      try {
        const { ok, data } = await apiFetch('/api/payment-requests', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not save request on server.', { variant: 'error' });
          return;
        }
        await ws.refresh();
      } finally {
        setSavingPayRequest(false);
      }
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
    const opening =
      acc.openingBalanceNgn != null && !Number.isNaN(Number(acc.openingBalanceNgn))
        ? String(Math.round(Number(acc.openingBalanceNgn)))
        : acc.balance != null
          ? String(acc.balance)
          : '';
    setNewBank({
      id: acc.id,
      name: acc.name || '',
      bankName: acc.bankName || '',
      type: acc.type === 'Cash' ? 'Cash' : 'Bank',
      accNo: acc.accNo || '',
      balance: acc.balance != null ? String(acc.balance) : '',
      openingBalanceNgn: opening,
      accountOfficerName: acc.accountOfficerName || '',
      accountOfficerPhone: acc.accountOfficerPhone || '',
      bankBranch: acc.bankBranch || '',
      sortCodeOrSwift: acc.sortCodeOrSwift || '',
      notes: acc.notes || '',
      branchId: String(acc.branchId || workspaceBranchId).trim() || workspaceBranchId,
    });
    setShowAddBank(true);
  };

  const removeTreasuryAccount = async (acc) => {
    if (!canExecTreasuryDelete) return;
    const label = String(acc?.name || 'this account').trim() || 'this account';
    if (
      !(await appConfirm({
        message: `Delete treasury account “${label}”? Only Admin, MD, or CEO can do this. The account must have exactly ₦0 book balance, no movement history, no bank reconciliation links, and you cannot remove the last account.`,
        variant: 'danger',
      }))
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

  const deleteStatementLinkedReceipt = useCallback(
    async (receiptId) => {
      const rid = String(receiptId || '').trim();
      if (!rid) return;
      if (!canExecTreasuryDelete) {
        showToast('Only Admin, MD, or CEO can delete receipts from statement.', { variant: 'error' });
        return;
      }
      if (!ws?.canMutate) {
        showToast(
          ws?.usingCachedData
            ? 'Reconnect to delete receipts - workspace is read-only.'
            : 'Connect to the API to delete receipts.',
          { variant: 'info' }
        );
        return;
      }
      if (!(await appConfirm({ message: `Delete receipt ${rid}? This action is permanent and for admin cleanup only.`, variant: 'danger' }))) return;
      const { ok, data } = await apiFetch(`/api/receipts/${encodeURIComponent(rid)}`, {
        method: 'DELETE',
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not delete receipt.', { variant: 'error' });
        return;
      }
      await ws.refresh();
      showToast(`Deleted receipt ${rid}.`);
    },
    [canExecTreasuryDelete, showToast, ws]
  );

  const saveBankAccount = async (e) => {
    e.preventDefault();
    const isEditTreasury = newBank.id != null && newBank.id !== '';
    if (!isEditTreasury && isBranchScopedCreateBlocked(ws)) {
      showToast(branchScopedCreateBlockedMessage(ws), { variant: 'error' });
      return;
    }
    const bal = isEditTreasury
      ? Number(treasuryEditImpliedBookStr || 0)
      : Number(newBank.balance || 0);
    const openingRaw = Number(newBank.openingBalanceNgn || 0);
    const openingNgn = isEditTreasury
      ? Number.isNaN(openingRaw)
        ? 0
        : Math.round(openingRaw)
      : Number.isNaN(bal)
        ? 0
        : Math.round(bal);
    const accName = newBank.name.trim();
    if (!accName) return;
    if (ws?.canMutate) {
      const assignBranchId = String(
        canAssignTreasuryBranch
          ? newBank.branchId || workspaceBranchId
          : workspaceBranchId
      ).trim();
      const body = {
        name: accName,
        bankName: newBank.bankName.trim(),
        type: newBank.type,
        accNo: newBank.accNo.trim() || 'N/A',
        balance: Number.isNaN(bal) ? 0 : bal,
        openingBalanceNgn: openingNgn,
        accountOfficerName: newBank.accountOfficerName.trim(),
        accountOfficerPhone: newBank.accountOfficerPhone.trim(),
        bankBranch: newBank.bankBranch.trim(),
        sortCodeOrSwift: newBank.sortCodeOrSwift.trim(),
        notes: newBank.notes.trim(),
        ...(assignBranchId ? { branchId: assignBranchId } : {}),
      };
      if (newBank.id != null && newBank.id !== '') {
        const nid = treasuryAccountIdForApiPayload(newBank.id);
        if (nid != null) body.id = nid;
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
    const editingBatchId = String(editingTransferBatchId || '').trim();
    if (!editingBatchId && (!fromAcc || treasuryBookDisplayNgn(fromAcc) < amount)) {
      showToast('Insufficient balance in source account.', { variant: 'error' });
      return;
    }
    if (!ws?.canMutate) {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to post transfers — workspace is read-only.'
          : 'Connect to the API to post treasury transfers.',
        { variant: 'info' }
      );
      return;
    }
    const body = {
      fromId,
      toId,
      amountNgn: amount,
      reference: transferForm.reference.trim(),
      dateISO: transferForm.dateISO,
      createdBy: activeActorLabel,
    };
    const { ok, data } = editingBatchId
      ? await apiFetch(`/api/treasury/transfer/${encodeURIComponent(editingBatchId)}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      : await apiFetch('/api/treasury/transfer', {
          method: 'POST',
          body: JSON.stringify(body),
        });
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not sync treasury.', { variant: 'error' });
      return;
    }
    await ws.refresh();
    setTransferForm({
      fromId: '',
      toId: '',
      amountNgn: '',
      reference: '',
      dateISO: new Date().toISOString().slice(0, 10),
    });
    closeTransferModal();
    showToast(
      editingBatchId ? 'Transfer updated — both accounts adjusted.' : 'Fund movement posted — both accounts updated.'
    );
  };

  const deleteTreasuryTransfer = async (batchId) => {
    const id = String(batchId || '').trim();
    if (!id || !canExecTreasuryDelete) return;
    if (!ws?.canMutate) {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to delete transfers — workspace is read-only.'
          : 'Connect to the API to delete treasury transfers.',
        { variant: 'info' }
      );
      return;
    }
    if (
      !(await appConfirm({
        message: `Delete transfer ${id}? This removes both ledger legs and restores account balances. Use this to remove mistaken or duplicate transfers.`,
        variant: 'danger',
      }))
    ) {
      return;
    }
    setDeletingTransferBatchId(id);
    const { ok, data } = await apiFetch(`/api/treasury/transfer/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    setDeletingTransferBatchId('');
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not delete transfer.', { variant: 'error' });
      return;
    }
    await ws.refresh();
    showToast(`Transfer ${id} removed.`);
  };

  const disbursementsFilteredExpenses = useMemo(() => {
    const qq = (disbursementsSearch.trim() || debouncedSearchQuery.trim()).toLowerCase();
    if (!qq) return expenses;
    return expenses.filter((ex) => {
      const blob = [ex.expenseID, ex.category, ex.expenseType, ex.reference, ex.paymentMethod, ex.branchId, ex.date]
        .join(' ')
        .toLowerCase();
      return blob.includes(qq);
    });
  }, [expenses, disbursementsSearch, debouncedSearchQuery]);

  const disbursementsFilteredPayRequests = useMemo(() => {
    const qq = (disbursementsSearch.trim() || debouncedSearchQuery.trim()).toLowerCase();
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
  }, [payRequests, disbursementsSearch, debouncedSearchQuery]);

  const disbursementsActivePayRequests = useMemo(
    () =>
      disbursementsFilteredPayRequests.filter(
        (req) => String(req.approvalStatus || '').trim().toLowerCase() !== 'rejected'
      ),
    [disbursementsFilteredPayRequests]
  );

  const disbursementsExceptionPayRequests = useMemo(
    () =>
      disbursementsActivePayRequests.filter((req) =>
        isFinanceExceptionExpenseItem(req.expenseCategory, req.expenseCategoryLane)
      ),
    [disbursementsActivePayRequests]
  );

  const disbursementsVisiblePayRequests = useMemo(() => {
    if (disbursementsPayRequestQueue === 'exceptions') return disbursementsExceptionPayRequests;
    return disbursementsActivePayRequests;
  }, [disbursementsPayRequestQueue, disbursementsActivePayRequests, disbursementsExceptionPayRequests]);

  const disbursementsArchivedRejectedPayRequests = useMemo(
    () =>
      disbursementsFilteredPayRequests.filter(
        (req) => String(req.approvalStatus || '').trim().toLowerCase() === 'rejected'
      ),
    [disbursementsFilteredPayRequests]
  );

  const paymentOutflowBaseRows = useMemo(
    () => treasuryOutflowPaymentTableRows(liveTreasuryMovements),
    [liveTreasuryMovements]
  );

  const expenseById = useMemo(
    () => Object.fromEntries((expenses || []).map((e) => [e.expenseID, e])),
    [expenses]
  );

  const payRequestById = useMemo(
    () => Object.fromEntries((payRequests || []).map((r) => [r.requestID, normalizePaymentRequest(r)])),
    [payRequests]
  );

  const refundById = useMemo(
    () => Object.fromEntries((customerRefunds || []).map((r) => [r.refundID, r])),
    [customerRefunds]
  );

  const openPayFromEditForTableRow = useCallback(
    (row) => {
      if (!row?.movementId) return;
      const ex = row.sourceKind === 'EXPENSE' ? expenseById[row.sourceId] : null;
      const pr = row.sourceKind === 'PAYMENT_REQUEST' ? payRequestById[row.sourceId] : null;
      const rf = row.sourceKind === 'REFUND' ? refundById[row.sourceId] : null;
      if (ex) {
        openExpenseOutflowEdit(ex);
        return;
      }
      if (pr) {
        openPaymentRequestOutflowEdit(pr);
        return;
      }
      if (rf) {
        openRefundOutflowEdit(rf);
        return;
      }
      if (row.sourceKind === 'PURCHASE_ORDER' && row.sourceId) {
        openPurchaseOrderOutflowEdit(row.sourceId, row.type);
        return;
      }
      if (row.sourceKind === 'ACCOUNTS_PAYABLE' && row.sourceId) {
        openAccountsPayableOutflowEdit(row.sourceId);
        return;
      }
      const m = liveTreasuryMovements.find((x) => String(x.id) === String(row.movementId));
      if (!m) {
        showToast('Treasury line not found.', { variant: 'info' });
        return;
      }
      openPayFromCorrection({
        headline: payFromCorrectionHeadlineForMovementType(row.type),
        subline: row.description || row.sourceId || row.movementId,
        lines: [m],
        focusMovementId: row.movementId,
      });
    },
    [
      expenseById,
      payRequestById,
      refundById,
      liveTreasuryMovements,
      openExpenseOutflowEdit,
      openPaymentRequestOutflowEdit,
      openRefundOutflowEdit,
      openPurchaseOrderOutflowEdit,
      openAccountsPayableOutflowEdit,
      openPayFromCorrection,
      showToast,
    ]
  );

  const prPayoutPrimaryMovementId = useMemo(() => {
    const map = new Map();
    const outs = paymentOutflowBaseRows
      .filter((r) => r.type === 'PAYMENT_REQUEST_OUT' && r.sourceKind === 'PAYMENT_REQUEST' && r.sourceId)
      .sort((a, b) => String(a.postedAtISO || '').localeCompare(String(b.postedAtISO || '')));
    for (const r of outs) {
      if (!map.has(r.sourceId)) map.set(r.sourceId, r.movementId);
    }
    return map;
  }, [paymentOutflowBaseRows]);

  const refundPayoutPrimaryMovementId = useMemo(() => {
    const map = new Map();
    const outs = paymentOutflowBaseRows
      .filter((r) => r.type === 'REFUND_PAYOUT' && r.sourceKind === 'REFUND' && r.sourceId)
      .sort((a, b) => String(a.postedAtISO || '').localeCompare(String(b.postedAtISO || '')));
    for (const r of outs) {
      if (!map.has(r.sourceId)) map.set(r.sourceId, r.movementId);
    }
    return map;
  }, [paymentOutflowBaseRows]);

  const paymentsTableRowsSorted = useMemo(() => {
    const q = (disbursementsSearch.trim() || debouncedSearchQuery.trim()).toLowerCase();
    let rows = paymentOutflowBaseRows.filter((r) =>
      !q
        ? true
        : [
            r.movementId,
            r.type,
            r.sourceKind,
            r.sourceId,
            r.description,
            r.accountName,
            r.reference,
            r.counterpartyName,
            String(r.amountAbs),
            String(r.postedAtISO || '').slice(0, 10),
          ]
            .join(' ')
            .toLowerCase()
            .includes(q)
    );
    const mult = paymentsTableSortDir === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      if (paymentsTableSortKey === 'amount') {
        const d = (a.amountAbs - b.amountAbs) * mult;
        if (d !== 0) return d;
      } else if (paymentsTableSortKey === 'type') {
        const t = mult * String(a.type || '').localeCompare(String(b.type || ''));
        if (t !== 0) return t;
      } else if (paymentsTableSortKey === 'account') {
        const t = mult * String(a.accountName || '').localeCompare(String(b.accountName || ''));
        if (t !== 0) return t;
      } else if (paymentsTableSortKey === 'description') {
        const t = mult * String(a.description || '').localeCompare(String(b.description || ''), undefined, {
          sensitivity: 'base',
        });
        if (t !== 0) return t;
      } else if (paymentsTableSortKey === 'source') {
        const sa = `${String(a.sourceKind || '')}\u0000${String(a.sourceId || '')}`;
        const sb = `${String(b.sourceKind || '')}\u0000${String(b.sourceId || '')}`;
        const t = mult * sa.localeCompare(sb);
        if (t !== 0) return t;
      } else {
        const t = mult * String(a.postedAtISO || '').localeCompare(String(b.postedAtISO || ''));
        if (t !== 0) return t;
      }
      return String(a.movementId || '').localeCompare(String(b.movementId || ''));
    });
    return rows;
  }, [
    paymentOutflowBaseRows,
    disbursementsSearch,
    debouncedSearchQuery,
    paymentsTableSortKey,
    paymentsTableSortDir,
  ]);

  const paymentsListWindow = useMemo(() => {
    const total = paymentsTableRowsSorted.length;
    const pageCount = Math.max(1, Math.ceil(total / PAYMENTS_PAGE_SIZE) || 1);
    const safePage = Math.min(paymentsTablePage, pageCount - 1);
    const start = safePage * PAYMENTS_PAGE_SIZE;
    const slice = paymentsTableRowsSorted.slice(start, start + PAYMENTS_PAGE_SIZE);
    const from = total === 0 ? 0 : start + 1;
    const to = Math.min(start + PAYMENTS_PAGE_SIZE, total);
    return { total, pageCount, safePage, slice, from, to };
  }, [paymentsTableRowsSorted, paymentsTablePage]);

  useEffect(() => {
    setPaymentsTablePage(0);
  }, [disbursementsSearch, debouncedSearchQuery, paymentsTableSortKey, paymentsTableSortDir]);

  useEffect(() => {
    const total = paymentsTableRowsSorted.length;
    const pageCount = Math.max(1, Math.ceil(total / PAYMENTS_PAGE_SIZE) || 1);
    setPaymentsTablePage((p) => Math.min(p, pageCount - 1));
  }, [paymentsTableRowsSorted.length]);

  const canDeleteRolloutExpenseOrRequest = Boolean(ws?.hasPermission?.('finance.approve'));
  const canReversePaymentRequestTreasury = Boolean(ws?.hasPermission?.('finance.reverse'));
  const needsPaymentsMutateSecondApproval = Boolean(
    editMutationNeedsSecondApprovalRole(ws?.session?.user?.roleKey)
  );

  const filteredBankAccounts = useMemo(() => {
    const qq = debouncedSearchQuery.trim().toLowerCase();
    if (!qq) return bankAccountsVisible;
    return bankAccountsVisible.filter((a) => {
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
  }, [bankAccountsVisible, debouncedSearchQuery]);

  const togglePaymentsSort = useCallback((key) => {
    setPaymentsTableSortKey((prevKey) => {
      if (prevKey === key) {
        setPaymentsTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prevKey;
      }
      setPaymentsTableSortDir('desc');
      return key;
    });
  }, []);

  const deleteRolloutExpense = useCallback(
    async (expenseID) => {
      if (!ws?.hasPermission?.('finance.approve')) {
        showToast('Finance approval permission is required to delete expenses.', { variant: 'error' });
        return;
      }
      if (!ws?.canMutate) {
        showToast(
          ws?.usingCachedData
            ? 'Reconnect to delete — workspace is read-only.'
            : 'Connect to the API to delete.',
          { variant: 'info' }
        );
        return;
      }
      const id = String(expenseID || '').trim();
      if (!id) return;
      setPaymentsApprovalEntity({ kind: 'expense', id });
      if (
        needsPaymentsMutateSecondApproval &&
        !String(paymentsMutateApprovalId || '').trim()
      ) {
        showToast('Enter the manager-approved KPI code in the Payments panel, then try again.', {
          variant: 'error',
        });
        return;
      }
      if (
        !(await appConfirm({
          message: `Delete expense ${id} (temporary rollout cleanup)? Removes this row, any linked payment requests that have no treasury payout yet, and direct EXPENSE treasury lines. Blocked if a linked request was already paid from treasury.`,
          variant: 'danger',
        }))
      ) {
        return;
      }
      setDeletingExpenseId(id);
      try {
        const body = {};
        if (String(paymentsMutateApprovalId || '').trim()) {
          body.editApprovalId = String(paymentsMutateApprovalId).trim();
        }
        const { ok, data } = await apiFetch(`/api/expenses/${encodeURIComponent(id)}/rollout-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not delete expense.', { variant: 'error' });
          return;
        }
        await ws.refresh();
        showToast(`Deleted expense ${id}.`);
        setPaymentsMutateApprovalId('');
      } finally {
        setDeletingExpenseId('');
      }
    },
    [needsPaymentsMutateSecondApproval, paymentsMutateApprovalId, showToast, ws]
  );

  const deleteRolloutPaymentRequest = useCallback(
    async (requestID) => {
      if (!ws?.hasPermission?.('finance.approve')) {
        showToast('Finance approval permission is required to delete requests.', { variant: 'error' });
        return;
      }
      if (!ws?.canMutate) {
        showToast(
          ws?.usingCachedData
            ? 'Reconnect to delete — workspace is read-only.'
            : 'Connect to the API to delete.',
          { variant: 'info' }
        );
        return;
      }
      const id = String(requestID || '').trim();
      if (!id) return;
      setPaymentsApprovalEntity({ kind: 'payment_request', id });
      if (
        needsPaymentsMutateSecondApproval &&
        !String(paymentsMutateApprovalId || '').trim()
      ) {
        showToast('Enter the manager-approved KPI code in the Payments panel, then try again.', {
          variant: 'error',
        });
        return;
      }
      if (
        !(await appConfirm({
          message: `Delete payment request ${id} (temporary rollout cleanup)? Only allowed when no treasury payout was recorded; removes the request and the placeholder expense if nothing else references it.`,
          variant: 'danger',
        }))
      ) {
        return;
      }
      setDeletingPayRequestId(id);
      try {
        const body = {};
        if (String(paymentsMutateApprovalId || '').trim()) {
          body.editApprovalId = String(paymentsMutateApprovalId).trim();
        }
        const { ok, data } = await apiFetch(
          `/api/payment-requests/${encodeURIComponent(id)}/rollout-delete`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not delete payment request.', { variant: 'error' });
          return;
        }
        await ws.refresh();
        showToast(`Deleted payment request ${id}.`);
        setPaymentsMutateApprovalId('');
      } finally {
        setDeletingPayRequestId('');
      }
    },
    [needsPaymentsMutateSecondApproval, paymentsMutateApprovalId, showToast, ws]
  );

  const reversePaymentRequestTreasuryPayout = useCallback(
    async (requestID) => {
      if (!ws?.hasPermission?.('finance.reverse')) {
        showToast('finance.reverse permission is required to reverse treasury payouts.', { variant: 'error' });
        return;
      }
      if (!ws?.canMutate) {
        showToast(
          ws?.usingCachedData
            ? 'Reconnect to reverse — workspace is read-only.'
            : 'Connect to the API to reverse.',
          { variant: 'info' }
        );
        return;
      }
      const id = String(requestID || '').trim();
      if (!id) return;
      setPaymentsApprovalEntity({ kind: 'payment_request', id });
      if (
        needsPaymentsMutateSecondApproval &&
        !String(paymentsMutateApprovalId || '').trim()
      ) {
        showToast('Enter the manager-approved KPI code in the Payments panel, then try again.', {
          variant: 'error',
        });
        return;
      }
      if (
        !(await appConfirm({
          message: `Reverse treasury payout for ${id}? This posts compensating credits to the same bank/cash accounts, sets paid balance to zero, and is audited. Use only to fix mistakes before delete or re-pay.`,
          variant: 'danger',
        }))
      ) {
        return;
      }
      setReversingTreasuryPayoutId(id);
      try {
        const body = {};
        if (String(paymentsMutateApprovalId || '').trim()) {
          body.editApprovalId = String(paymentsMutateApprovalId).trim();
        }
        const { ok, data } = await apiFetch(
          `/api/payment-requests/${encodeURIComponent(id)}/reverse-treasury-payout`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not reverse treasury payout.', { variant: 'error' });
          return;
        }
        await ws.refresh();
        showToast(`Treasury payout reversed for ${id}.`);
        setPaymentsMutateApprovalId('');
      } finally {
        setReversingTreasuryPayoutId('');
      }
    },
    [needsPaymentsMutateSecondApproval, paymentsMutateApprovalId, showToast, ws]
  );

  const reverseRefundTreasuryPayout = useCallback(
    async (refundID) => {
      if (!ws?.hasPermission?.('finance.reverse')) {
        showToast('finance.reverse permission is required to reverse refund treasury payouts.', { variant: 'error' });
        return;
      }
      if (!ws?.canMutate) {
        showToast(
          ws?.usingCachedData
            ? 'Reconnect to reverse — workspace is read-only.'
            : 'Connect to the API to reverse.',
          { variant: 'info' }
        );
        return;
      }
      const id = String(refundID || '').trim();
      if (!id) return;
      setPaymentsApprovalEntity({ kind: 'refund', id });
      if (
        needsPaymentsMutateSecondApproval &&
        !String(paymentsMutateApprovalId || '').trim()
      ) {
        showToast('Enter the manager-approved KPI code in the Payments panel, then try again.', {
          variant: 'error',
        });
        return;
      }
      if (
        !(await appConfirm({
          message: `Reverse treasury payout for refund ${id}? This posts compensating credits, clears customer-refund paid balance (and related advance ledger slices), and is audited.`,
          variant: 'danger',
        }))
      ) {
        return;
      }
      setReversingRefundTreasuryPayoutId(id);
      try {
        const body = {};
        if (String(paymentsMutateApprovalId || '').trim()) {
          body.editApprovalId = String(paymentsMutateApprovalId).trim();
        }
        const { ok, data } = await apiFetch(`/api/refunds/${encodeURIComponent(id)}/reverse-treasury-payout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not reverse refund treasury payout.', { variant: 'error' });
          return;
        }
        await ws.refresh();
        showToast(`Treasury payout reversed for refund ${id}.`);
        setPaymentsMutateApprovalId('');
      } finally {
        setReversingRefundTreasuryPayoutId('');
      }
    },
    [needsPaymentsMutateSecondApproval, paymentsMutateApprovalId, showToast, ws]
  );

  const isCashierRole = userIsCashierRole(ws?.session?.user?.roleKey);
  const financePageTitle = (() => {
    if (activeTab === 'desk') return FINANCE_DESK_TAB_LABEL;
    return 'Finance & accounts';
  })();
  const financePageSubtitle = (() => {
    if (activeTab === 'desk') {
      return 'Balances, statements, receipts, and payout queues — your branch finance home.';
    }
    if (!isCashierRole) {
      if (activeTab === 'disbursements') {
        return 'Posted treasury outflows and corrections — pay new items from Finance desk.';
      }
      return 'Treasury, customer receipt settlement, and approvals';
    }
    if (activeTab === 'receipts') {
      return 'Confirm customer payments and reconcile bank/cash received.';
    }
    if (activeTab === 'movements') {
      return 'Record lodgements, withdrawals, and internal transfers between accounts.';
    }
    return 'Branch finance';
  })();

  const pageContextValue = useMemo(
    () => ({
      activeTab,
      adminFinanceReapplyBusy,
      auditQueue,
      bankAccounts,
      bankAccountsForBranch,
      bankAccountsVisible,
      bankReconciliation,
      branchNameById,
      canApprovePaymentRequests,
      canDeleteRolloutExpenseOrRequest,
      canEditTreasuryTransfer,
      canExecTreasuryDelete,
      canFinanceReceiptSettlement,
      canManageTreasury,
      canPayRequests,
      canPostExpenseReclass,
      canReversePaymentRequestTreasury,
      deleteRolloutExpense,
      deleteRolloutPaymentRequest,
      deleteTreasuryTransfer,
      deletingExpenseId,
      deletingPayRequestId,
      deletingTransferBatchId,
      disbursementsActivePayRequests,
      disbursementsArchivedRejectedPayRequests,
      disbursementsExceptionPayRequests,
      disbursementsFilteredExpenses,
      disbursementsPayRequestQueue,
      disbursementsSearch,
      disbursementsVisiblePayRequests,
      exceptionReportSummary,
      expenseById,
      expenses,
      exportExceptionsCsv,
      filteredBankAccounts,
      filteredSalesReceipts,
      handleAccountTabChange,
      handleDeskCancelRefund,
      handleDeskConfirmReceipt,
      handleDeskPayPoTransport,
      handleDeskPayRefund,
      handleDeskPayRegisterSettlement,
      handleDeskPayRequest,
      handleDeskReceiveStaffObligation,
      handleDeskReceiveStaffRecovery,
      handleDeskViewPaymentRequest,
      handleDeskViewPoTransport,
      handleDeskViewReceipt,
      isAdminRole,
      isCashierRole,
      liveReceipts,
      liveTreasuryMovements,
      movementRows,
      needsPaymentsMutateSecondApproval,
      openBankDepositsCount,
      openEditTreasuryAccount,
      openEditTreasuryTransfer,
      openExpenseOutflowEdit,
      openPayFromEditForTableRow,
      openPaymentRequestOutflowEdit,
      openReceiptFinance,
      openReclassifyExpense,
      openReclassifyPaymentRequest,
      openRequestPayment,
      openUnreconciledReceiptsPrint,
      payRequestById,
      PAYMENTS_PAGE_SIZE,
      paymentsApprovalEntity,
      paymentsListWindow,
      paymentsMutateApprovalId,
      paymentsTableSortDir,
      paymentsTableSortKey,
      prPayoutPrimaryMovementId,
      receiptsListWindow,
      receiptsPendingClearanceNgn,
      receiptsSortDir,
      receiptsSortKey,
      receiptsTableSearch,
      reconciliationFlags,
      refundById,
      refundPayoutPrimaryMovementId,
      removeTreasuryAccount,
      reversePaymentRequestTreasuryPayout,
      reverseRefundTreasuryPayout,
      reversingRefundTreasuryPayoutId,
      reversingTreasuryPayoutId,
      runAdminReapplyFinanceReconciledReceipts,
      setConfirmedReceiptsPage,
      setDisbursementsPayRequestQueue,
      setDisbursementsSearch,
      setEditingTransferBatchId,
      setExpenseForm,
      setPaymentsMutateApprovalId,
      setPaymentsTablePage,
      setReceiptsSortDir,
      setReceiptsSortKey,
      setReceiptsTableSearch,
      setShowExpenseModal,
      setShowTransferModal,
      setStatementAccount,
      setTransferForm,
      setWaitingReceiptsPage,
      showAllTreasuryInTab,
      showToast,
      sortedFilteredSalesReceipts,
      togglePaymentsSort,
      todayIso,
      treasuryBookDisplayNgn,
      treasuryInflowsNgn,
      treasuryOutflowsNgn,
      waitingReceiptsListWindow,
      workspaceBranchId,
      workspaceBranchLabel,
      ws,
    }),
    [
      activeTab,
      adminFinanceReapplyBusy,
      auditQueue,
      bankAccounts,
      bankAccountsForBranch,
      bankAccountsVisible,
      bankReconciliation,
      branchNameById,
      canApprovePaymentRequests,
      canDeleteRolloutExpenseOrRequest,
      canEditTreasuryTransfer,
      canExecTreasuryDelete,
      canFinanceReceiptSettlement,
      canManageTreasury,
      canPayRequests,
      canPostExpenseReclass,
      canReversePaymentRequestTreasury,
      deleteRolloutExpense,
      deleteRolloutPaymentRequest,
      deleteTreasuryTransfer,
      deletingExpenseId,
      deletingPayRequestId,
      deletingTransferBatchId,
      disbursementsActivePayRequests,
      disbursementsArchivedRejectedPayRequests,
      disbursementsExceptionPayRequests,
      disbursementsFilteredExpenses,
      disbursementsPayRequestQueue,
      disbursementsSearch,
      disbursementsVisiblePayRequests,
      exceptionReportSummary,
      expenseById,
      expenses,
      exportExceptionsCsv,
      filteredBankAccounts,
      filteredSalesReceipts,
      handleAccountTabChange,
      handleDeskCancelRefund,
      handleDeskConfirmReceipt,
      handleDeskPayPoTransport,
      handleDeskPayRefund,
      handleDeskPayRegisterSettlement,
      handleDeskPayRequest,
      handleDeskReceiveStaffObligation,
      handleDeskReceiveStaffRecovery,
      handleDeskViewPaymentRequest,
      handleDeskViewPoTransport,
      handleDeskViewReceipt,
      isAdminRole,
      isCashierRole,
      liveReceipts,
      liveTreasuryMovements,
      movementRows,
      needsPaymentsMutateSecondApproval,
      openBankDepositsCount,
      openEditTreasuryAccount,
      openEditTreasuryTransfer,
      openExpenseOutflowEdit,
      openPayFromEditForTableRow,
      openPaymentRequestOutflowEdit,
      openReceiptFinance,
      openReclassifyExpense,
      openReclassifyPaymentRequest,
      openRequestPayment,
      openUnreconciledReceiptsPrint,
      payRequestById,
      PAYMENTS_PAGE_SIZE,
      paymentsApprovalEntity,
      paymentsListWindow,
      paymentsMutateApprovalId,
      paymentsTableSortDir,
      paymentsTableSortKey,
      prPayoutPrimaryMovementId,
      receiptsListWindow,
      receiptsPendingClearanceNgn,
      receiptsSortDir,
      receiptsSortKey,
      receiptsTableSearch,
      reconciliationFlags,
      refundById,
      refundPayoutPrimaryMovementId,
      removeTreasuryAccount,
      reversePaymentRequestTreasuryPayout,
      reverseRefundTreasuryPayout,
      reversingRefundTreasuryPayoutId,
      reversingTreasuryPayoutId,
      runAdminReapplyFinanceReconciledReceipts,
      setConfirmedReceiptsPage,
      setDisbursementsPayRequestQueue,
      setDisbursementsSearch,
      setEditingTransferBatchId,
      setExpenseForm,
      setPaymentsMutateApprovalId,
      setPaymentsTablePage,
      setReceiptsSortDir,
      setReceiptsSortKey,
      setReceiptsTableSearch,
      setShowExpenseModal,
      setShowTransferModal,
      setStatementAccount,
      setTransferForm,
      setWaitingReceiptsPage,
      showAllTreasuryInTab,
      showToast,
      sortedFilteredSalesReceipts,
      togglePaymentsSort,
      todayIso,
      treasuryBookDisplayNgn,
      treasuryInflowsNgn,
      treasuryOutflowsNgn,
      waitingReceiptsListWindow,
      workspaceBranchId,
      workspaceBranchLabel,
      ws,
    ]
  );

  return (
    <AccountPageContext.Provider value={pageContextValue}>
      <PageShell blurred={isAnyModalOpen}>
      <FinancePilotHeader
        eyebrow={
          isCashierRole
            ? activeTab === 'desk'
              ? 'Finance · Cashier'
              : 'Finance · Cashier'
            : 'Finance'
        }
        title={financePageTitle}
        subtitle={financePageSubtitle}
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
            {activeTab === 'receipts' || activeTab === 'desk' ? (
              <ZareHelpButton
                transactionContext={{
                  module: 'finance',
                  currentPage: activeTab,
                  pathname: '/accounts',
                  transactionType: activeTab === 'receipts' ? 'receipt_settlement' : 'payment',
                }}
                compact
              />
            ) : null}
            <AiAskButton
              mode="finance"
              prompt={
                activeTab === 'desk'
                  ? 'Summarize Finance desk — liquidity, account balances, pending receipts, and approved payouts.'
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
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-ui-xs font-black uppercase tracking-wide text-zarewa-teal shadow-[0_8px_24px_-18px_rgba(15,23,42,0.12)] transition hover:border-teal-200/60 hover:bg-teal-50/80"
            >
              Ask AI
            </AiAskButton>
          </>
        }
      />

      <div
        className={`grid min-w-0 grid-cols-1 gap-8 lg:gap-10 ${activeTab === 'receipts' || activeTab === 'desk' ? '' : 'lg:grid-cols-4'}`}
      >
        {activeTab !== 'receipts' && activeTab !== 'desk' ? (
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-zarewa border border-slate-200/80 border-l-[3px] border-l-zarewa-teal bg-white p-6 shadow-[var(--shadow-sequence)]">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400 mb-3">
              Total liquidity
            </h3>
            <div className="space-y-1">
              <p className="text-2xl font-black tracking-tight text-slate-900 tabular-nums">
                ₦{totals.cash.toLocaleString()}
              </p>
              <p className="text-ui-xs text-slate-500 font-medium leading-snug">
                Combined bank, cash & POS floats
              </p>
            </div>
            <div className="mt-3 space-y-1 border-t border-slate-200 pt-2.5 text-ui-xs">
              <p className="flex items-center justify-between gap-2 text-slate-600">
                <span>Cleared receipts</span>
                <span className="font-bold tabular-nums text-emerald-700">{formatNgn(reconciledSubtotalNgn)}</span>
              </p>
              <p className="flex items-center justify-between gap-2 text-slate-600">
                <span>Pending clearance</span>
                <span className="font-bold tabular-nums text-amber-700">{formatNgn(nonReconciledSubtotalNgn)}</span>
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
            <p className="text-xl font-black text-zarewa-teal">{formatNgn(receivablesNgn)}</p>
            <p className="text-ui-xs font-bold text-gray-400 mt-2 uppercase tracking-wide">
              Due after production only · unpaid quotes with no output excluded
            </p>
          </button>

          <Link
            to="/procurement"
            state={{ focusTab: 'payables' }}
            className="block w-full text-left rounded-zarewa border border-slate-200/75 bg-white p-5 shadow-[var(--shadow-sequence)] transition-colors hover:border-teal-200/70 cursor-pointer"
          >
            <h3 className="z-section-title flex items-center gap-2">
              <Truck size={14} />
              Supplier payments
            </h3>
            <p className="text-ui-xs text-gray-600 mt-2 leading-relaxed">
              Pay suppliers against purchase orders on Procurement →{' '}
              <span className="font-bold text-zarewa-teal">Payments</span> (not the finance payment register).
            </p>
          </Link>

          {!isCashierRole ? (
          <div className="rounded-zarewa border border-slate-200/70 bg-slate-50/70 p-4 shadow-[0_12px_40px_-32px_rgba(15,23,42,0.1)]">
            <h3 className="z-section-title flex items-center gap-2 text-ui-xs">
              <Activity size={12} className="shrink-0" />
              GL phase note
            </h3>
            <p className="text-ui-xs text-slate-500 leading-relaxed">
              Operational tabs post live treasury movements today. Full double-entry GL is on{' '}
              <strong className="text-slate-700">Accounting Desk</strong>.
            </p>
          </div>
          ) : null}

          {!isCashierRole ? (
          <div className="rounded-zarewa border border-slate-200/70 bg-white p-3 text-ui-xs text-slate-500 leading-relaxed shadow-[0_10px_36px_-30px_rgba(15,23,42,0.08)]">
            <p className="font-black uppercase tracking-wider text-zarewa-teal mb-1 flex items-center gap-1">
              <BookOpen size={11} />
              Principles
            </p>
            Accrual reporting and expense matching follow Accounting Desk once the ledger is live.
          </div>
          ) : null}
        </div>
        ) : null}

        <div className={activeTab === 'receipts' || activeTab === 'desk' ? 'min-w-0' : 'lg:col-span-3 min-w-0'}>
          <FinanceSequencePanel>
            <AccountTabPanels />
          </FinanceSequencePanel>
        </div>
      </div>

      <ModalFrame isOpen={showTransferModal} onClose={closeTransferModal}>
        <div className="z-modal-panel z-modal-scroll-y max-w-md p-4 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-zarewa-teal flex items-center gap-2">
              <ArrowRightLeft size={22} />
              {editingTransferBatchId ? 'Edit transfer' : 'Fund movement'}
            </h3>
            <button
              type="button"
              onClick={closeTransferModal}
              className="p-2 text-gray-400 hover:text-red-500 rounded-xl"
            >
              <X size={22} />
            </button>
          </div>
          {editingTransferBatchId ? (
            <p className="text-xs text-gray-600 mb-4 font-mono">{editingTransferBatchId}</p>
          ) : null}
          <form className="space-y-4" onSubmit={saveTransfer}>
            <div>
              <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                From
              </label>
              <select
                required
                value={transferForm.fromId}
                onChange={(e) =>
                  setTransferForm((f) => ({ ...f, fromId: e.target.value }))
                }
                className="w-full z-finance-field rounded-xl font-bold outline-none"
              >
                <option value="">Select account…</option>
                {bankAccountsSelectOrder.map((a) => (
                  <option key={a.id} value={a.id}>
                    {treasuryAccountDisplayName(a)} ({formatNgn(treasuryBookDisplayNgn(a))})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                To
              </label>
              <select
                required
                value={transferForm.toId}
                onChange={(e) =>
                  setTransferForm((f) => ({ ...f, toId: e.target.value }))
                }
                className="w-full z-finance-field rounded-xl font-bold outline-none"
              >
                <option value="">Select account…</option>
                {bankAccountsSelectOrder.map((a) => (
                  <option key={a.id} value={a.id}>
                    {treasuryAccountDisplayName(a)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
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
                className="w-full z-finance-field rounded-xl font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                Transfer date
              </label>
              <input
                required
                type="date"
                value={transferForm.dateISO}
                onChange={(e) =>
                  setTransferForm((f) => ({ ...f, dateISO: e.target.value }))
                }
                className="w-full z-finance-field rounded-xl font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                Reference / narration
              </label>
              <input
                value={transferForm.reference}
                onChange={(e) =>
                  setTransferForm((f) => ({ ...f, reference: e.target.value }))
                }
                placeholder="e.g. Cash deposit — 28 Mar"
                className="w-full z-finance-field rounded-xl font-bold outline-none"
              />
            </div>
            <button type="submit" className="z-btn-primary w-full justify-center py-3">
              {editingTransferBatchId ? 'Save changes' : 'Post transfer'}
            </button>
          </form>
        </div>
      </ModalFrame>

      <ModalFrame isOpen={statementAccount != null} onClose={closeStatementModal}>
        <div className="z-modal-panel max-w-lg w-full max-h-[min(100dvh,640px)] sm:max-h-[min(85vh,640px)] p-4 sm:p-8 overflow-hidden flex flex-col">
          <div className="flex justify-between items-start gap-3 mb-4 shrink-0">
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-zarewa-teal">Account statement</h3>
              {statementAccount ? (
                <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                  <p className="font-semibold truncate" title={statementAccount.name}>
                    {statementAccount.name}
                    {statementAccount.bankName ? ` · ${statementAccount.bankName}` : ''}
                  </p>
                  {statementAccount.bankBranch ? (
                    <p className="text-xs text-slate-500">Branch: {statementAccount.bankBranch}</p>
                  ) : null}
                  {statementAccount.sortCodeOrSwift ? (
                    <p className="text-xs text-slate-500 tabular-nums">
                      Sort / SWIFT: {statementAccount.sortCodeOrSwift}
                    </p>
                  ) : null}
                  {statementAccount.accountOfficerName || statementAccount.accountOfficerPhone ? (
                    <p className="text-xs text-slate-600">
                      Officer:{' '}
                      {[statementAccount.accountOfficerName, statementAccount.accountOfficerPhone]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}
                  {statementAccount.notes ? (
                    <p className="text-ui-xs text-slate-500 leading-snug border-t border-slate-100/80 pt-1 mt-1">
                      {statementAccount.notes}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={closeStatementModal}
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
              <div className="mb-3 rounded-lg border border-slate-200/80 bg-slate-50/90 px-3 py-2 flex items-center justify-between gap-2">
                <p className="text-ui-xs text-slate-600 leading-snug">Choose a date range and print this statement.</p>
                <button
                  type="button"
                  onClick={() => {
                    setStatementPrintFromDate(statementDateBounds.minDate);
                    setStatementPrintToDate(statementDateBounds.maxDate);
                    setShowStatementPrintModal(true);
                  }}
                  className="z-btn-primary py-1.5 px-3 text-xs shrink-0"
                >
                  <Printer size={14} />
                  Print statement
                </button>
              </div>
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
                      const linkedReceipt = resolveSalesReceiptFromStatementMovement(m);
                      const receiptQuotationRef =
                        String(
                          linkedReceipt?.quotationRef ||
                            linkedReceipt?.quotationID ||
                            linkedReceipt?.quotationId ||
                            linkedReceipt?.quoteId ||
                            ''
                        ).trim();
                      const detailWithQuotation =
                        receiptQuotationRef && !String(detail).toLowerCase().includes(String(receiptQuotationRef).toLowerCase())
                          ? `${detail} · Quote ${receiptQuotationRef}`
                          : detail;
                      const canOpenReceipt =
                        Boolean(linkedReceipt?.id) &&
                        (String(m.sourceKind || '').trim() === 'LEDGER_RECEIPT' ||
                          String(m.type || '').trim() === 'RECEIPT_IN');
                      const canDeleteReceiptFromStatement = canExecTreasuryDelete && canOpenReceipt;
                      return (
                        <li
                          key={m.id}
                          className="rounded-lg border border-slate-200/60 bg-white/50 py-1.5 px-2.5 shadow-sm"
                        >
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              disabled={!canOpenReceipt}
                              onClick={() => {
                                if (!canOpenReceipt || !linkedReceipt?.id) return;
                                setStatementAccount(null);
                                navigate('/sales', {
                                  state: {
                                    focusSalesTab: 'receipts',
                                    openSalesRecord: { type: 'receipt', id: String(linkedReceipt.id) },
                                  },
                                });
                              }}
                              className={`w-full text-left ${
                                canOpenReceipt
                                  ? 'cursor-pointer rounded-md transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/20'
                                  : 'cursor-default'
                              }`}
                              title={canOpenReceipt ? 'Open this receipt in Sales' : undefined}
                            >
                              <div className="flex items-center justify-between gap-2 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                  <span
                                    className={`text-ui-xs font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${badge.className}`}
                                  >
                                    {badge.label}
                                  </span>
                                  <span className="text-xs font-bold tabular-nums text-slate-600">{dateStr}</span>
                                </div>
                                <span
                                  className={`text-xs font-black tabular-nums shrink-0 ${
                                    isIn ? 'text-emerald-600' : isOut ? 'text-red-600' : 'text-slate-500'
                                  }`}
                                >
                                  {amtStr}
                                </span>
                              </div>
                              <p
                                className="text-ui-xs text-slate-500 mt-0.5 leading-snug line-clamp-2 break-words"
                                title={detailWithQuotation}
                              >
                                {detailWithQuotation}
                              </p>
                            </button>
                            {canDeleteReceiptFromStatement ? (
                              <button
                                type="button"
                                onClick={() => void deleteStatementLinkedReceipt(linkedReceipt.id)}
                                className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200/80 text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                                title="Delete this receipt (admin only, temporary cleanup)"
                                aria-label="Delete receipt"
                              >
                                <Trash2 size={13} />
                              </button>
                            ) : null}
                          </div>
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

      <ModalFrame isOpen={showStatementPrintModal} onClose={() => setShowStatementPrintModal(false)}>
        <div className="z-modal-panel z-modal-scroll-y max-w-md w-full p-4 sm:p-8">
          <div className="flex justify-between items-center gap-3 mb-4">
            <h3 className="text-lg font-bold text-zarewa-teal">Print statement</h3>
            <button
              type="button"
              onClick={() => setShowStatementPrintModal(false)}
              className="p-2 text-gray-400 hover:text-red-500 rounded-xl shrink-0"
              aria-label="Close print statement modal"
            >
              <X size={20} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">From date</label>
              <input
                type="date"
                value={statementPrintFromDate}
                min={statementDateBounds.minDate || undefined}
                max={statementDateBounds.maxDate || undefined}
                onChange={(e) => setStatementPrintFromDate(e.target.value)}
                className="w-full z-finance-field rounded-xl font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">End date</label>
              <input
                type="date"
                value={statementPrintToDate}
                min={statementDateBounds.minDate || undefined}
                max={statementDateBounds.maxDate || undefined}
                onChange={(e) => setStatementPrintToDate(e.target.value)}
                className="w-full z-finance-field rounded-xl font-bold outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => openStatementForDateRange(false)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zarewa-teal/20 bg-white px-4 py-3 text-sm font-bold text-zarewa-teal transition-colors hover:bg-zarewa-teal/5"
            >
              Open preview
            </button>
            <button
              type="button"
              onClick={() => openStatementForDateRange(true)}
              className="z-btn-primary w-full justify-center py-3"
            >
              <Printer size={16} />
              Print statement
            </button>
          </div>
        </div>
      </ModalFrame>

      <AccountingRegisterSettlementPayModal
        settlement={registerSettlementPayTarget}
        open={showRegisterSettlementPayModal}
        onClose={() => {
          setShowRegisterSettlementPayModal(false);
          setRegisterSettlementPayTarget(null);
        }}
        onPaid={() => void handleRegisterSettlementPaid()}
      />

      <ModalFrame
        isOpen={showRefundPayModal}
        onClose={() => {
          if (treasuryPayoutSubmitting) return;
          setShowRefundPayModal(false);
          setRefundPayTarget(null);
          setRefundPaidBy('');
          setRefundPayLines([]);
          setRefundPaymentNote('');
        }}
      >
        <div className="z-modal-panel z-modal-scroll-y max-w-lg p-4 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-zarewa-teal flex items-center gap-2">
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
                <p className="font-mono font-bold text-zarewa-teal">{refundPayTarget.refundID}</p>
                <p className="font-bold text-gray-800">{refundPayTarget.customer}</p>
                <p className="text-xs text-gray-600">{refundPayTarget.reason}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-ui-xs">
                  <div>
                    <p className="uppercase text-gray-400 font-bold tracking-wide">Refund requested by</p>
                    <p className="font-semibold text-gray-800">{refundPayTarget.requestedBy || '—'}</p>
                  </div>
                  <div>
                    <p className="uppercase text-gray-400 font-bold tracking-wide">Payment confirmed by</p>
                    <p className="font-semibold text-gray-800">
                      {refundPayPaymentConfirmers.length > 0 ? refundPayPaymentConfirmers.join(' · ') : '—'}
                    </p>
                  </div>
                </div>
                {(refundPayTarget.payeeName || refundPayTarget.payeeAccountNo || refundPayTarget.payeeBankName) ? (
                  <div className="mt-2 rounded-xl border border-sky-200/90 bg-sky-50/95 px-3 py-2.5 text-xs text-sky-950 space-y-1">
                    <p className="text-ui-xs font-bold uppercase tracking-wide text-sky-900/90">Pay to (from request)</p>
                    {refundPayTarget.payeeName ? (
                      <p className="font-bold text-sky-950">{refundPayTarget.payeeName}</p>
                    ) : null}
                    <p className="font-mono text-xs font-semibold tabular-nums leading-snug">
                      {[refundPayTarget.payeeBankName, refundPayTarget.payeeAccountNo].filter(Boolean).join(' · ') ||
                        refundPayTarget.payeeAccountNo ||
                        '—'}
                    </p>
                  </div>
                ) : null}
                <div className="grid grid-cols-3 gap-3 pt-2 text-ui-xs text-gray-600 tabular-nums">
                  <div>
                    <p className="uppercase text-gray-400">Approved</p>
                    <p className="text-sm font-black text-zarewa-teal">{formatNgn(refundApprovedAmount(refundPayTarget))}</p>
                  </div>
                  <div>
                    <p className="uppercase text-gray-400">Paid</p>
                    <p className="text-sm font-black text-zarewa-teal">{formatNgn(Number(refundPayTarget.paidAmountNgn) || 0)}</p>
                  </div>
                  <div>
                    <p className="uppercase text-gray-400">Balance</p>
                    <p className="text-sm font-black text-rose-700">{formatNgn(refundOutstandingAmount(refundPayTarget))}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Paid by (Finance user)
                </label>
                <input
                  value={refundPaidBy}
                  onChange={(e) => setRefundPaidBy(e.target.value)}
                  placeholder="e.g. Hauwa — GTBank transfer"
                  className="w-full z-finance-field rounded-xl font-bold outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1">Payout breakdown</label>
                <button
                  type="button"
                  onClick={addRefundPayLine}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-ui-xs font-black uppercase tracking-wide text-rose-800"
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
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2 text-xs font-semibold"
                    >
                      <option value="">Select account…</option>
                      {bankAccountsSelectOrder.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {treasuryAccountDisplayName(a)} ({formatNgn(treasuryBookDisplayNgn(a))})
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <input
                      type="date"
                      value={line.dateISO}
                      onChange={(e) => updateRefundPayLine(line.id, { dateISO: e.target.value })}
                      className="sm:col-span-3 w-full z-finance-field rounded-lg font-semibold"
                      title="Payment date"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={line.amount}
                      onChange={(e) => updateRefundPayLine(line.id, { amount: e.target.value })}
                      className="sm:col-span-3 z-finance-field rounded-lg font-bold text-zarewa-teal"
                      placeholder="Amount ₦"
                    />
                    <input
                      type="text"
                      value={line.reference}
                      onChange={(e) => updateRefundPayLine(line.id, { reference: e.target.value })}
                      className="sm:col-span-4 z-finance-field rounded-lg"
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
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Payment note
                </label>
                <input
                  value={refundPaymentNote}
                  onChange={(e) => setRefundPaymentNote(e.target.value)}
                  placeholder="Example: Cash 300,000 and GT transfer 200,000"
                  className="w-full z-finance-field rounded-xl outline-none"
                />
              </div>
              <div className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md px-3 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold text-gray-500 uppercase text-ui-xs tracking-wide">This payout</span>
                  <span className="font-black text-zarewa-teal">{formatNgn(refundPayTotalNgn)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold text-gray-500 uppercase text-ui-xs tracking-wide">Remaining after post</span>
                  <span className="font-black text-gray-700">
                    {formatNgn(Math.max(0, refundOutstandingAmount(refundPayTarget) - refundPayTotalNgn))}
                  </span>
                </div>
              </div>
              <p className="text-ui-xs text-gray-500 leading-relaxed">
                Saving this payout writes the treasury movements and keeps the refund open until the approved balance is fully paid.
              </p>
              <button
                type="submit"
                disabled={treasuryPayoutSubmitting}
                className="z-btn-primary w-full justify-center py-3 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {treasuryPayoutSubmitting ? 'Posting payout…' : 'Post refund payout'}
              </button>
            </form>
          ) : null}
        </div>
      </ModalFrame>

      <ModalFrame
        isOpen={showPaymentEntry}
        onClose={() => {
          if (treasuryPayoutSubmitting) return;
          setShowPaymentEntry(false);
          setSelectedPayment(null);
          setRequestPayLines([]);
          setRequestPayNote('');
          setTransportPayEditApprovalId('');
        }}
      >
        <div className="z-modal-panel z-modal-scroll-y max-w-lg p-4 sm:p-10">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-bold text-zarewa-teal">
              {selectedPayment?.type === 'po_transport' ? 'Post transport payment' : 'Process payment'}
            </h3>
            <button
              type="button"
              disabled={treasuryPayoutSubmitting}
              onClick={() => {
                if (treasuryPayoutSubmitting) return;
                setShowPaymentEntry(false);
                setSelectedPayment(null);
                setRequestPayLines([]);
                setRequestPayNote('');
                setTransportPayEditApprovalId('');
              }}
              className="text-gray-300 hover:text-rose-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <X size={24} />
            </button>
          </div>
          <div className="bg-gray-50 p-6 rounded-2xl mb-6 border border-gray-100 flex justify-between items-center gap-4">
            <div>
              <p className="text-ui-xs font-bold text-gray-400 uppercase">Balance due</p>
              <p className="text-2xl font-black text-zarewa-teal">
                ₦
                {(
                  (selectedPayment?.total ?? 0) - (selectedPayment?.paid ?? 0)
                ).toLocaleString()}
              </p>
              <p className="text-ui-xs text-gray-400 mt-1">
                {selectedPayment?.desc} · {selectedPayment?.category}
              </p>
            </div>
            <span className="text-ui-xs font-bold px-3 py-1 bg-white rounded-full border border-gray-100 shrink-0">
              {selectedPayment?.type === 'po_transport' ? `PO ${selectedPayment?.id}` : selectedPayment?.id}
            </span>
          </div>
          {selectedPayment?.type === 'payment_request' ? (
            <ExpenseCategoryPayoutReadinessPanel
              glPreview={paymentGlPreview}
              payoutGate={paymentGlPreview?.payoutGate}
            />
          ) : null}
          {bankAccounts.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Add at least one treasury account before posting payout.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1">
                  Payout breakdown
                </label>
                <button
                  type="button"
                  onClick={addRequestPayLine}
                  className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-ui-xs font-black uppercase tracking-wide text-zarewa-teal"
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
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2 text-xs font-semibold"
                    >
                      <option value="">Select account…</option>
                      {bankAccountsSelectOrder.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {treasuryAccountDisplayName(a)} ({formatNgn(treasuryBookDisplayNgn(a))})
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <input
                      type="date"
                      value={line.dateISO}
                      onChange={(e) => updateRequestPayLine(line.id, { dateISO: e.target.value })}
                      className="sm:col-span-3 w-full z-finance-field rounded-lg font-semibold"
                      title="Payment date"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={line.amount}
                      onChange={(e) => updateRequestPayLine(line.id, { amount: e.target.value })}
                      className="sm:col-span-3 z-finance-field rounded-lg font-bold text-zarewa-teal"
                      placeholder="Amount ₦"
                    />
                    <input
                      type="text"
                      value={line.reference}
                      onChange={(e) => updateRequestPayLine(line.id, { reference: e.target.value })}
                      className="sm:col-span-4 z-finance-field rounded-lg"
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
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1">Payment note</label>
                <input
                  value={requestPayNote}
                  onChange={(e) => setRequestPayNote(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 px-4 text-sm"
                  placeholder="Example: Cash 300,000 and GT transfer 200,000"
                />
              </div>
              <div className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md px-3 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold text-gray-500 uppercase text-ui-xs tracking-wide">This payout</span>
                  <span className="font-black text-zarewa-teal">{formatNgn(requestPayTotalNgn)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold text-gray-500 uppercase text-ui-xs tracking-wide">Remaining after post</span>
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
              {selectedPayment?.type === 'po_transport' ? (
                <EditSecondApprovalInline
                  entityKind="purchase_order"
                  entityId={selectedPayment?.id}
                  value={transportPayEditApprovalId}
                  onChange={setTransportPayEditApprovalId}
                />
              ) : null}
              <button
                type="button"
                onClick={confirmProcessPaymentModal}
                disabled={
                  treasuryPayoutSubmitting ||
                  (selectedPayment?.type === 'payment_request' &&
                    paymentGlPreview?.payoutGate &&
                    paymentGlPreview.payoutGate.ok === false)
                }
                className="w-full bg-zarewa-teal text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {treasuryPayoutSubmitting
                  ? 'Posting payout…'
                  : selectedPayment?.type === 'po_transport'
                    ? 'Confirm transport payout'
                    : 'Confirm transaction'}
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
        <div className="z-modal-panel max-w-lg w-full min-h-0 max-h-[min(100dvh,720px)] sm:max-h-[min(90dvh,720px)] flex flex-col overflow-hidden p-0">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-8 pt-8 pb-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-zarewa-teal">
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
              {canAssignTreasuryBranch ? (
                <div>
                  <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                    Branch that uses this account
                  </label>
                  <select
                    required
                    value={newBank.branchId || workspaceBranchId}
                    onChange={(e) => setNewBank((b) => ({ ...b, branchId: e.target.value }))}
                    className="w-full z-finance-field rounded-xl font-bold outline-none"
                  >
                    {branchOptionsSorted.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name || b.code || b.id}
                      </option>
                    ))}
                  </select>
                  <p className="text-ui-xs text-slate-500 mt-1.5 leading-relaxed">
                    Only this branch will see the account in receipts and payouts. Use this to move Yola banks off
                    Kaduna if they were registered incorrectly.
                  </p>
                </div>
              ) : workspaceBranchLabel ? (
                <p className="text-xs text-slate-600 rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2">
                  This account will be registered for <strong>{workspaceBranchLabel}</strong>.
                </p>
              ) : null}
              <div>
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Account name
                </label>
                <input
                  required
                  value={newBank.name}
                  onChange={(e) => setNewBank((b) => ({ ...b, name: e.target.value }))}
                  className="w-full z-finance-field rounded-xl font-bold outline-none"
                />
              </div>
              {newBank.type === 'Bank' ? (
                <div>
                  <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                    Bank name (for quotations & receipts)
                  </label>
                  <input
                    value={newBank.bankName}
                    onChange={(e) => setNewBank((b) => ({ ...b, bankName: e.target.value }))}
                    placeholder="e.g. Zenith Bank"
                    className="w-full z-finance-field rounded-xl font-bold outline-none"
                  />
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                    Type
                  </label>
                  <select
                    value={newBank.type}
                    onChange={(e) => setNewBank((b) => ({ ...b, type: e.target.value }))}
                    className="w-full z-finance-field rounded-xl font-bold outline-none"
                  >
                    <option value="Bank">Bank</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                    {newBank.id != null && newBank.id !== ''
                      ? 'Opening balance (₦) — when registered'
                      : 'Opening balance (₦)'}
                  </label>
                  {newBank.id != null && newBank.id !== '' ? (
                    <>
                      <input
                        type="number"
                        inputMode="numeric"
                        step="any"
                        value={newBank.openingBalanceNgn}
                        onChange={(e) => setNewBank((b) => ({ ...b, openingBalanceNgn: e.target.value }))}
                        className="w-full z-finance-field rounded-xl font-bold outline-none"
                      />
                      <p className="text-ui-xs text-gray-500 mt-1 leading-snug">
                        Book balance below updates automatically: opening plus all posted movements on this account.
                      </p>
                    </>
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      step="any"
                      value={newBank.balance}
                      onChange={(e) => setNewBank((b) => ({ ...b, balance: e.target.value }))}
                      className="w-full z-finance-field rounded-xl font-bold outline-none"
                    />
                  )}
                </div>
              </div>
              {newBank.id != null && newBank.id !== '' ? (
                <div>
                  <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                    Book balance (₦) — current
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    readOnly
                    aria-readonly="true"
                    value={treasuryEditImpliedBookStr}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-gray-800 outline-none cursor-default"
                  />
                  <p className="text-ui-xs text-gray-500 mt-1 leading-snug">
                    Computed from opening above and posted movements. It is saved with the account when you click Save.
                  </p>
                </div>
              ) : null}
              <div>
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Account / reference no.
                </label>
                <input
                  value={newBank.accNo}
                  onChange={(e) => setNewBank((b) => ({ ...b, accNo: e.target.value }))}
                  className="w-full z-finance-field rounded-xl font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Bank branch / address
                </label>
                <input
                  value={newBank.bankBranch}
                  onChange={(e) => setNewBank((b) => ({ ...b, bankBranch: e.target.value }))}
                  placeholder="e.g. Ahmadu Bello Way, Kaduna"
                  className="w-full z-finance-field rounded-xl font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Sort code / SWIFT (optional)
                </label>
                <input
                  value={newBank.sortCodeOrSwift}
                  onChange={(e) => setNewBank((b) => ({ ...b, sortCodeOrSwift: e.target.value }))}
                  placeholder="e.g. 057 / ZEIBNGLA"
                  className="w-full z-finance-field rounded-xl font-bold outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                    Account officer name
                  </label>
                  <input
                    value={newBank.accountOfficerName}
                    onChange={(e) => setNewBank((b) => ({ ...b, accountOfficerName: e.target.value }))}
                    placeholder="Relationship manager"
                    className="w-full z-finance-field rounded-xl font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                    Account officer phone
                  </label>
                  <input
                    value={newBank.accountOfficerPhone}
                    onChange={(e) => setNewBank((b) => ({ ...b, accountOfficerPhone: e.target.value }))}
                    placeholder="+234…"
                    className="w-full z-finance-field rounded-xl font-bold outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Internal notes
                </label>
                <textarea
                  rows={2}
                  value={newBank.notes}
                  onChange={(e) => setNewBank((b) => ({ ...b, notes: e.target.value }))}
                  placeholder="e.g. Primary payroll account; notify MD for transfers above ₦10m"
                  className="w-full z-finance-field rounded-xl outline-none resize-y min-h-[3rem]"
                />
              </div>
              <button type="submit" className="z-btn-primary w-full justify-center py-3">
                Save account
              </button>
            </form>
          </div>
        </div>
      </ModalFrame>

      <ModalFrame isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)}>
        <div className="z-modal-panel z-modal-scroll-y max-w-lg p-4 sm:p-8">
            <div className="flex justify-between items-center mb-6 gap-3">
              <h3 className="text-xl font-bold text-zarewa-teal">Expense entry</h3>
              <div className="flex items-center gap-2">
                <ZareHelpButton
                  compact
                  transactionContext={{
                    module: 'finance',
                    currentPage: 'expense',
                    pathname: '/accounts',
                    transactionType: 'expense',
                    status: 'draft',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-xl"
                >
                  <X size={22} />
                </button>
              </div>
            </div>
            <form className="space-y-4" onSubmit={saveExpense}>
              <div>
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Expense type
                </label>
                <select
                  value={expenseForm.expenseType}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, expenseType: e.target.value }))
                  }
                  className="w-full z-finance-field rounded-xl font-bold outline-none"
                >
                  <option value="COGS — materials & stock">COGS — materials & stock</option>
                  <option value="Employee — payroll & commissions">Employee — payroll & commissions</option>
                  <option value="Logistics & haulage">Logistics & haulage</option>
                  <option value="Maintenance — plant & equipment">Maintenance — plant & equipment</option>
                  <option value="Operational — rent & utilities">Operational — rent & utilities</option>
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
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
                    className="w-full z-finance-field rounded-xl font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) =>
                      setExpenseForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="w-full z-finance-field rounded-xl font-bold outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Category
                </label>
                <ExpenseCategorySelect
                  required
                  value={expenseForm.category}
                  onChange={(category) => setExpenseForm((f) => ({ ...f, category }))}
                  actor={{ roleKey: ws?.session?.user?.roleKey, permissions: ws?.session?.permissions }}
                  hasPermission={(p) => Boolean(ws?.hasPermission?.(p))}
                  othersMinJustificationLen={othersMinJustificationLen}
                  className="w-full z-finance-field rounded-xl font-bold outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-200/40"
                />
                {isExceptionExpenseCategory(expenseForm.category) ? (
                  <OthersJustificationField
                    value={expenseForm.categoryJustification || ''}
                    onChange={(e) =>
                      setExpenseForm((f) => ({ ...f, categoryJustification: e.target.value }))
                    }
                    minLength={othersMinJustificationLen}
                  />
                ) : null}
              </div>
              <div>
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Payment method
                </label>
                <select
                  value={expenseForm.paymentMethod}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, paymentMethod: e.target.value }))
                  }
                  className="w-full z-finance-field rounded-xl font-bold outline-none"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="POS">POS</option>
                </select>
              </div>
              <div>
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Pay from account
                </label>
                <select
                  required
                  value={expenseForm.debitAccountId}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, debitAccountId: e.target.value }))
                  }
                  className="w-full z-finance-field rounded-xl font-bold outline-none"
                >
                  <option value="">Select account…</option>
                  {bankAccountsSelectOrder.map((a) => (
                    <option key={a.id} value={a.id}>
                      {treasuryAccountDisplayName(a)} ({formatNgn(treasuryBookDisplayNgn(a))})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
                  Receipt / invoice reference
                </label>
                <input
                  value={expenseForm.reference}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, reference: e.target.value }))
                  }
                  className="w-full z-finance-field rounded-xl font-bold outline-none"
                />
              </div>
              <p className="text-ui-xs text-gray-400">
                Expense ID is generated on save (e.g. EXP-26-015).
              </p>
              <button
                type="submit"
                disabled={savingExpense}
                className="z-btn-primary w-full justify-center py-3 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {savingExpense ? 'Saving expense...' : 'Save expense'}
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
        <div className="z-modal-panel z-modal-scroll-y max-w-2xl p-4 sm:p-8">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xl font-bold text-zarewa-teal">Expense request</h3>
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
            submitting={savingPayRequest}
            hintBeforeSubmit="Extra rows can be left blank — only completed lines are sent. Request ID is assigned on save. Use Print on the list row for a filing copy."
            actor={{ roleKey: ws?.session?.user?.roleKey, permissions: ws?.session?.permissions }}
            hasPermission={(p) => Boolean(ws?.hasPermission?.(p))}
          />
        </div>
      </ModalFrame>

      <ModalFrame
        isOpen={expenseOutflowEdit != null}
        onClose={() => {
          setExpenseOutflowEdit(null);
        }}
      >
        <div className="z-modal-panel z-modal-scroll-y max-w-lg w-full p-4 sm:p-8">
          <div className="flex justify-between items-start gap-3 mb-4">
            <h3 className="text-lg font-bold text-zarewa-teal">
              {expenseOutflowEdit?.headline || 'Expense payout — pay-from'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setExpenseOutflowEdit(null);
              }}
              className="p-2 text-gray-400 hover:text-red-500 rounded-xl"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          {expenseOutflowEdit?.rows?.length ? (
            <form className="space-y-4" onSubmit={saveExpenseOutflowEdit}>
              {(() => {
                const rows = expenseOutflowEdit.rows;
                const idx = Math.min(Math.max(0, expenseOutflowLineIdx), rows.length - 1);
                const row = rows[idx];
                const movementId = String(row.movementId || '').trim();
                return (
                  <>
                    <p className="text-ui-xs text-slate-600 leading-snug">{expenseOutflowEdit.subline}</p>
                    <div className="rounded-xl border border-teal-200/90 bg-teal-50/50 px-3 py-2.5 text-ui-xs text-teal-950 leading-snug">
                      <span className="font-bold">Treasury correction</span> — updates which bank or cash account this
                      payout debited (and optional date / note). Same controls as receipt payment-line corrections.
                    </div>
                    {rows.length > 1 ? (
                      <label className="block">
                        <span className="text-ui-xs font-bold text-slate-500 uppercase">Payout line</span>
                        <select
                          value={idx}
                          onChange={(e) => setExpenseOutflowLineIdx(Number(e.target.value))}
                          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-zarewa-teal/15"
                        >
                          {rows.map((r, i) => (
                            <option key={r.movementId} value={i}>
                              {formatNgn(Math.abs(Number(r.amountNgn) || 0))} · {String(r.movementId).slice(0, 10)}…
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <p className="text-ui-xs text-slate-600">
                      Recorded amount{' '}
                      <span className="font-bold tabular-nums">{formatNgn(Math.abs(Number(row.amountNgn) || 0))}</span>
                      <span className="text-slate-400 font-mono text-ui-xs ml-2 break-all">{movementId}</span>
                    </p>
                    {bankAccounts.length === 0 ? (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Add a treasury account first, then reopen this dialog.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2.5">
                        <label className="block">
                          <span className="text-ui-xs font-bold text-slate-500 uppercase">Bank / cash paid from</span>
                          <select
                            value={row.treasuryAccountId}
                            onChange={(e) => updateExpenseOutflowRowField(idx, { treasuryAccountId: e.target.value })}
                            className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-zarewa-teal/15"
                          >
                            <option value="">Select account…</option>
                            {bankAccountsSelectOrder.map((a) => (
                              <option key={a.id} value={String(a.id)}>
                                {treasuryAccountDisplayName(a)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-ui-xs font-bold text-slate-500 uppercase">Posted date</span>
                          <input
                            type="date"
                            value={row.postedDate}
                            onChange={(e) => updateExpenseOutflowRowField(idx, { postedDate: e.target.value })}
                            className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-zarewa-teal/15"
                          />
                        </label>
                        <label className="block">
                          <span className="text-ui-xs font-bold text-slate-500 uppercase">Note (optional)</span>
                          <input
                            type="text"
                            value={row.note}
                            placeholder="e.g. Confirmed with bank statement"
                            onChange={(e) => updateExpenseOutflowRowField(idx, { note: e.target.value })}
                            className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-zarewa-teal/15"
                          />
                        </label>
                      </div>
                    )}
                  </>
                );
              })()}
              <button
                type="submit"
                disabled={expenseOutflowSaving || !ws?.canMutate || bankAccounts.length === 0}
                className="z-btn-primary w-full justify-center py-3 disabled:opacity-50"
              >
                {expenseOutflowSaving ? 'Saving…' : 'Save pay-from correction'}
              </button>
            </form>
          ) : null}
        </div>
      </ModalFrame>

      <ModalFrame
        isOpen={receiptFinanceRow != null}
        onClose={() => {
          setReceiptFinanceRow(null);
          setPaymentCorrectionDrafts({});
        }}
      >
        <div className="z-modal-panel z-modal-scroll-y max-w-2xl w-full p-4 sm:p-8">
          <div className="flex justify-between items-start gap-3 mb-4">
            <h3 className="text-lg font-bold text-zarewa-teal">Confirm payment received</h3>
            <button
              type="button"
              onClick={() => {
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
              <p className="text-ui-xs text-slate-600 font-mono break-all">{receiptFinanceRow.id}</p>
              {(() => {
                const settleSplits = receiptLedgerReceiptTreasurySplits(
                  receiptFinanceRow,
                  liveTreasuryMovements
                );
                const cashTotal =
                  receiptFinanceRow.cashReceivedNgn != null
                    ? Number(receiptFinanceRow.cashReceivedNgn) || 0
                    : Number(receiptFinanceRow.amountNgn) || 0;
                const formDisabled = receiptFinanceBusy;
                const confirmedTotalNgn =
                  settleSplits.length > 0
                    ? settleSplits.reduce((sum, s) => {
                        const d = paymentCorrectionDrafts[s.movementId];
                        const raw = d?.amountNgn ?? String(s.amountNgn);
                        return sum + parseNgnInput(raw);
                      }, 0)
                    : parseNgnInput(receiptBankAmtInput);
                const salesDeltaNgn = confirmedTotalNgn - Math.round(cashTotal);

                return (
                  <>
                    <div className="rounded-xl border border-teal-200/90 bg-teal-50/50 px-3 py-2.5 text-ui-xs text-teal-950 leading-snug">
                      <span className="font-bold">One confirm step</span> — enter what was actually received. Saving
                      updates treasury, receipt, ledger, and quote paid amount, and clears for delivery unless you hold
                      it below. Revisions after the first save may need manager approval.
                    </div>

                {settleSplits.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-ui-xs font-bold text-slate-600 uppercase tracking-wide">
                        Payment breakdown
                      </p>
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
                              <p className="text-ui-xs font-mono text-slate-500 break-all">{s.movementId}</p>
                              <span className="text-ui-xs text-slate-400 truncate max-w-[55%]" title={s.reference}>
                                {s.reference || '—'}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-ui-xs font-bold text-slate-500 uppercase">
                                  Amount received (₦)
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
                                  className="w-full mt-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold tabular-nums outline-none focus:ring-2 focus:ring-zarewa-teal/15 disabled:opacity-60"
                                />
                                <p className="text-ui-xs text-slate-500 mt-0.5">
                                  Sales recorded {formatNgn(rec)}
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
                                <label className="text-ui-xs font-bold text-slate-500 uppercase">
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
                                  className="w-full mt-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-zarewa-teal/15 disabled:opacity-60"
                                >
                                  {bankAccountsSelectOrder.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {treasuryAccountDisplayName(a)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-ui-xs font-bold text-slate-500 uppercase">
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
                                  className="w-full mt-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-zarewa-teal/15 disabled:opacity-60"
                                />
                              </div>
                              <div>
                                <label className="text-ui-xs font-bold text-slate-500 uppercase">
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
                                  className="w-full mt-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-zarewa-teal/15 disabled:opacity-60"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-ui-xs text-amber-900 bg-amber-50/90 border border-amber-200/80 rounded-lg px-3 py-2 leading-snug">
                      No treasury payment lines on file — enter the amount actually received below. Saving still
                      updates receipt, ledger, and quote paid amount.
                    </p>
                    <p className="text-xs text-slate-700">
                      Sales recorded:{' '}
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
                )}

                    <div className="rounded-xl border border-zarewa-teal/20 bg-teal-50/40 px-3 py-3 space-y-1.5">
                      <label className="text-ui-xs font-bold text-zarewa-teal uppercase block">
                        Amount actually received (₦)
                      </label>
                      {settleSplits.length > 0 ? (
                        <>
                          <p className="text-2xl font-black tabular-nums text-zarewa-teal">
                            {formatNgn(confirmedTotalNgn)}
                          </p>
                          <p className="text-ui-xs text-slate-600 leading-snug">
                            Sum of payment lines — saved to receipt, ledger, treasury, and quote paid.
                          </p>
                        </>
                      ) : (
                        <input
                          required
                          type="text"
                          inputMode="numeric"
                          value={receiptBankAmtInput}
                          disabled={receiptFinanceBusy}
                          onChange={(e) => setReceiptBankAmtInput(e.target.value)}
                          className="w-full z-finance-field rounded-xl font-bold outline-none disabled:opacity-60"
                        />
                      )}
                      <p className="text-ui-xs text-slate-600">
                        Sales recorded{' '}
                        <span className="font-bold tabular-nums text-slate-900">{formatNgn(cashTotal)}</span>
                        {salesDeltaNgn !== 0 ? (
                          <span
                            className={
                              salesDeltaNgn > 0 ? 'text-amber-900 font-semibold' : 'text-rose-800 font-semibold'
                            }
                          >
                            {' '}
                            · Δ {salesDeltaNgn > 0 ? '+' : ''}
                            {formatNgn(salesDeltaNgn)} vs Sales
                          </span>
                        ) : (
                          <span className="text-emerald-800 font-semibold"> · Matches Sales recorded</span>
                        )}
                      </p>
                    </div>
                  </>
                );
              })()}
              <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  checked={receiptHoldDelivery}
                  disabled={receiptFinanceBusy}
                  onChange={(e) => setReceiptHoldDelivery(e.target.checked)}
                />
                <span>
                  Hold delivery — confirm payment and update books, but do not release downstream until cleared
                  separately.
                </span>
              </label>
              {!receiptFinanceRow?.financeReconciliationSavedAtISO &&
              (ws?.hasPermission?.('finance.reverse') || ws?.hasPermission?.('finance.pay')) ? (
                <button
                  type="button"
                  disabled={receiptFinanceBusy || receiptReverseBusy || !ws?.canMutate}
                  onClick={() => void reverseReceiptFinanceRow()}
                  className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-ui-xs font-bold uppercase tracking-wide text-rose-900 hover:bg-rose-100 disabled:opacity-50"
                >
                  {receiptReverseBusy ? 'Reversing…' : 'Reverse mistaken receipt'}
                </button>
              ) : null}
              <button
                type="submit"
                disabled={receiptFinanceBusy || !ws?.canMutate}
                className="z-btn-primary w-full justify-center py-3 disabled:opacity-50"
              >
                {receiptFinanceBusy
                  ? 'Saving…'
                  : receiptFinanceRow?.financeReconciliationSavedAtISO
                    ? 'Save revision'
                    : receiptHoldDelivery
                      ? 'Confirm payment (hold delivery)'
                      : 'Confirm payment & clear for delivery'}
              </button>
            </form>
          ) : null}
        </div>
      </ModalFrame>

      <ModalFrame isOpen={Boolean(reclassifyTarget)} onClose={closeReclassifyModal}>
        <div className="space-y-4">
          <div>
            <p className="text-ui-xs font-bold uppercase tracking-widest text-violet-700/80">Reclassify category</p>
            <h2 className="text-lg font-black text-slate-900 mt-1">
              {reclassifyTarget?._reclassKind === 'expense'
                ? reclassifyTarget?.expenseID
                : reclassifyTarget?.requestID}
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-snug">
              {Number(reclassifyTarget?.paidAmountNgn) > 0 || reclassifyTarget?._reclassKind === 'expense'
                ? 'After treasury payout — updates the expense register and posts a GL reclass journal (Dr new / Cr old).'
                : 'Approved, unpaid requests only. Updates GL mapping on the next payout preview.'}
            </p>
          </div>
          <div>
            <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">New category</label>
            <ExpenseCategorySelect
              required
              value={reclassifyForm.expenseCategory}
              onChange={(expenseCategory) => setReclassifyForm((f) => ({ ...f, expenseCategory }))}
              actor={{ roleKey: ws?.session?.user?.roleKey, permissions: ws?.session?.permissions }}
              hasPermission={(p) => Boolean(ws?.hasPermission?.(p))}
              othersMinJustificationLen={othersMinJustificationLen}
              className="w-full z-finance-field rounded-xl font-bold outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200/40"
            />
          </div>
          {isExceptionExpenseCategory(reclassifyForm.expenseCategory) ? (
            <OthersJustificationField
              value={reclassifyForm.categoryJustification}
              onChange={(e) =>
                setReclassifyForm((f) => ({ ...f, categoryJustification: e.target.value }))
              }
              minLength={othersMinJustificationLen}
              placeholder="Explain why this category applies…"
            />
          ) : null}
          {reclassifyGlPreview?.gl ? (
            <ExpenseCategoryReclassPreviewPanel
              preview={reclassifyGlPreview}
              newCategory={reclassifyForm.expenseCategory}
            />
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={reclassifySaving || !reclassifyForm.expenseCategory}
              onClick={() => void saveReclassifyCategory()}
              className="z-btn-primary flex-1 justify-center py-2.5 disabled:opacity-50"
            >
              {reclassifySaving ? 'Saving…' : 'Save category'}
            </button>
            <button type="button" onClick={closeReclassifyModal} className="z-btn-secondary px-4 py-2.5">
              Cancel
            </button>
          </div>
        </div>
      </ModalFrame>

      <StaffRecoveryCashierModal
        recovery={staffRecoveryTarget}
        treasuryAccounts={bankAccounts}
        onClose={() => setStaffRecoveryTarget(null)}
        onSaved={async () => {
          await ws.refresh();
          showToast('Staff recovery payment recorded — treasury, obligation, and case balances updated.', {
            variant: 'success',
          });
        }}
      />

      <StaffObligationRepaymentModal
        obligation={staffObligationTarget}
        treasuryAccounts={bankAccounts}
        onClose={() => setStaffObligationTarget(null)}
        onSaved={async () => {
          await ws.refresh();
          showToast('Staff loan / purchase credit payment recorded — treasury and obligation balance updated.', {
            variant: 'success',
          });
        }}
      />
    </PageShell>
    </AccountPageContext.Provider>
  );
};

export default Account;
