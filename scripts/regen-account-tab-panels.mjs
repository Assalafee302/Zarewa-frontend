import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('src/pages');
const CONTEXT_KEYS = [
  'activeTab',
  'adminFinanceReapplyBusy',
  'auditQueue',
  'bankAccounts',
  'bankAccountsForBranch',
  'bankAccountsVisible',
  'bankReconciliation',
  'branchNameById',
  'canApprovePaymentRequests',
  'canDeleteRolloutExpenseOrRequest',
  'canEditTreasuryTransfer',
  'canExecTreasuryDelete',
  'canFinanceReceiptSettlement',
  'canManageTreasury',
  'canPayRequests',
  'canPostExpenseReclass',
  'canReversePaymentRequestTreasury',
  'deleteRolloutExpense',
  'deleteRolloutPaymentRequest',
  'deleteTreasuryTransfer',
  'deletingExpenseId',
  'deletingPayRequestId',
  'deletingTransferBatchId',
  'disbursementsActivePayRequests',
  'disbursementsArchivedRejectedPayRequests',
  'disbursementsExceptionPayRequests',
  'disbursementsFilteredExpenses',
  'disbursementsPayRequestQueue',
  'disbursementsSearch',
  'disbursementsVisiblePayRequests',
  'exceptionReportSummary',
  'expenseById',
  'expenses',
  'exportExceptionsCsv',
  'filteredBankAccounts',
  'filteredSalesReceipts',
  'handleAccountTabChange',
  'handleDeskCancelRefund',
  'handleDeskConfirmReceipt',
  'handleDeskPayPoTransport',
  'handleDeskPayRefund',
  'handleDeskPayRegisterSettlement',
  'handleDeskPayRequest',
  'handleDeskReceiveStaffObligation',
  'handleDeskReceiveStaffRecovery',
  'handleDeskViewPaymentRequest',
  'handleDeskViewPoTransport',
  'handleDeskViewReceipt',
  'isAdminRole',
  'isCashierRole',
  'liveReceipts',
  'liveTreasuryMovements',
  'movementRows',
  'needsPaymentsMutateSecondApproval',
  'openBankDepositsCount',
  'openEditTreasuryAccount',
  'openEditTreasuryTransfer',
  'openExpenseOutflowEdit',
  'openPayFromEditForTableRow',
  'openPaymentRequestOutflowEdit',
  'openReceiptFinance',
  'openReclassifyExpense',
  'openReclassifyPaymentRequest',
  'openRequestPayment',
  'openUnreconciledReceiptsPrint',
  'payRequestById',
  'PAYMENTS_PAGE_SIZE',
  'paymentsApprovalEntity',
  'paymentsListWindow',
  'paymentsMutateApprovalId',
  'paymentsTableSortDir',
  'paymentsTableSortKey',
  'prPayoutPrimaryMovementId',
  'receiptsListWindow',
  'receiptsPendingClearanceNgn',
  'receiptsSortDir',
  'receiptsSortKey',
  'receiptsTableSearch',
  'reconciliationFlags',
  'refundById',
  'refundPayoutPrimaryMovementId',
  'removeTreasuryAccount',
  'reversePaymentRequestTreasuryPayout',
  'reverseRefundTreasuryPayout',
  'reversingRefundTreasuryPayoutId',
  'reversingTreasuryPayoutId',
  'runAdminReapplyFinanceReconciledReceipts',
  'setConfirmedReceiptsPage',
  'setDisbursementsPayRequestQueue',
  'setDisbursementsSearch',
  'setEditingTransferBatchId',
  'setExpenseForm',
  'setPaymentsMutateApprovalId',
  'setPaymentsTablePage',
  'setReceiptsSortDir',
  'setReceiptsSortKey',
  'setReceiptsTableSearch',
  'setShowExpenseModal',
  'setShowTransferModal',
  'setStatementAccount',
  'setTransferForm',
  'setWaitingReceiptsPage',
  'showAllTreasuryInTab',
  'showToast',
  'sortedFilteredSalesReceipts',
  'togglePaymentsSort',
  'todayIso',
  'treasuryBookDisplayNgn',
  'treasuryInflowsNgn',
  'treasuryOutflowsNgn',
  'waitingReceiptsListWindow',
  'workspaceBranchId',
  'workspaceBranchLabel',
  'ws',
];

const origLines = fs.readFileSync('scripts/_orig_account.jsx', 'utf8').split(/\r?\n/);
const tabInner = origLines.slice(3397, 4921).join('\n');

const imports = `import React from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCcw,
  RefreshCw,
  Printer,
  Pencil,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

import { ZareApprovalHint } from '../../components/ZareApprovalHint';
import { EditSecondApprovalInline } from '../../components/EditSecondApprovalInline';
import { formatNgn } from '../../Data/mockData';
import { effectiveOutstandingNgn } from '../../lib/paymentOutstandingTolerance.js';
import { receiptCashReceivedNgn, receiptLedgerReceiptTreasurySplits } from '../../lib/salesReceiptsList';
import { ExpenseCategoryLaneBadge } from '../../components/office/ExpenseCategoryLaneBadge.jsx';
import { ExpenseCategoryExceptionBanner } from '../../components/office/ExpenseCategoryExceptionBanner.jsx';
import {
  treasuryOutflowLinesForExpense,
  treasuryOutflowLinesForPaymentRequest,
  isPayFromCorrectionTreasuryRow,
  TREASURY_STATEMENT_TYPE_LABEL,
} from '../../lib/accountCore';
import { FinanceDeskWorkQueues } from '../../components/finance/FinanceDeskWorkQueues.jsx';
import { FinanceTabContextBanner } from '../../components/finance/FinanceTabContextBanner.jsx';
import { FinanceReceiptsWorkflowStrip } from '../../components/finance/FinanceReceiptsWorkflowStrip.jsx';
import { FinanceTreasuryManageAccountsPanel } from '../../components/finance/FinanceTreasuryManageAccountsPanel.jsx';
import { AccountBankReconciliationPanel } from '../../components/account/AccountBankReconciliationPanel.jsx';
import { RegisterBankDepositPanel } from '../../components/finance/RegisterBankDepositPanel.jsx';
import { BankDepositExceptionPanel } from '../../components/finance/BankDepositExceptionPanel.jsx';
import { AccountGlManualJournalCard } from '../../components/account/AccountGlManualJournalCard.jsx';
import { receiptClearanceBadgeLabel } from '../../lib/receiptClearance.js';
import { useAccountPage } from './AccountPageContext.jsx';
`;

const destructure = CONTEXT_KEYS.map((k) => `    ${k},`).join('\n');

const tabPanels =
  imports +
  `\nexport function AccountTabPanels() {\n  const {\n${destructure}\n  } = useAccountPage();\n\n  return (\n${tabInner}\n  );\n}\n`;

fs.writeFileSync(path.join(ROOT, 'account/AccountTabPanels.jsx'), tabPanels);
console.log('Regenerated AccountTabPanels.jsx:', tabPanels.split('\n').length, 'lines');
