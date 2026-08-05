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

const accountPath = path.join(ROOT, 'Account.jsx');
const lines = fs.readFileSync(accountPath, 'utf8').split(/\r?\n/);
const tabInner = lines.slice(3312, 4835).join('\n');

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

const accountDir = path.join(ROOT, 'account');
fs.mkdirSync(accountDir, { recursive: true });
fs.writeFileSync(path.join(accountDir, 'AccountTabPanels.jsx'), tabPanels);

const ctx = `import { createContext, useContext } from 'react';

export const AccountPageContext = createContext(null);

export function useAccountPage() {
  const ctx = useContext(AccountPageContext);
  if (!ctx) {
    throw new Error('useAccountPage must be used within AccountPageContext.Provider');
  }
  return ctx;
}
`;
fs.writeFileSync(path.join(accountDir, 'AccountPageContext.jsx'), ctx);

// Patch Account.jsx
let accountSrc = fs.readFileSync(accountPath, 'utf8');
const accountLines = accountSrc.split(/\r?\n/);

// Insert imports after existing imports (before parseNgnInput)
const importInsert = `import { AccountPageContext } from './account/AccountPageContext.jsx';
import { AccountTabPanels } from './account/AccountTabPanels.jsx';`;

if (!accountSrc.includes('AccountPageContext')) {
  const parseIdx = accountLines.findIndex((l) => l.startsWith('function parseNgnInput'));
  accountLines.splice(parseIdx, 0, importInsert, '');
}

// Find isCashierRole line and insert pageContextValue before return
const returnIdx = accountLines.findIndex((l) => l.trim() === 'return (');
const isCashierIdx = accountLines.findIndex((l) => l.includes('const isCashierRole = userIsCashierRole'));

const contextValueLines = [
  '  const pageContextValue = useMemo(',
  '    () => ({',
  ...CONTEXT_KEYS.map((k) => `      ${k},`),
  '    }),',
  '    [',
  ...CONTEXT_KEYS.map((k) => `      ${k},`),
  '    ]',
  '  );',
  '',
];

if (!accountLines.some((l) => l.includes('pageContextValue'))) {
  accountLines.splice(returnIdx, 0, ...contextValueLines);
}

// Replace FinanceSequencePanel inner content with AccountTabPanels
const fspStart = accountLines.findIndex((l) => l.includes('<FinanceSequencePanel>'));
const fspEnd = accountLines.findIndex((l, i) => i > fspStart && l.includes('</FinanceSequencePanel>'));

if (fspStart >= 0 && fspEnd >= 0) {
  const indent = accountLines[fspStart].match(/^(\s*)/)[1];
  const childIndent = indent + '  ';
  accountLines.splice(
    fspStart + 1,
    fspEnd - fspStart - 1,
    `${childIndent}<AccountTabPanels />`
  );
}

// Wrap PageShell content in Provider - find <PageShell and closing before final );
const pageShellStart = accountLines.findIndex((l) => l.includes('<PageShell'));
if (pageShellStart >= 0 && !accountLines[pageShellStart + 1]?.includes('AccountPageContext.Provider')) {
  accountLines[pageShellStart] = accountLines[pageShellStart].replace(
    '<PageShell',
    '<AccountPageContext.Provider value={pageContextValue}>\n      <PageShell'
  );
}

const pageShellClose = accountLines.findIndex(
  (l, i) => i > pageShellStart && l.trim() === '</PageShell>'
);
if (pageShellClose >= 0 && !accountLines[pageShellClose + 1]?.includes('AccountPageContext.Provider')) {
  accountLines.splice(pageShellClose + 1, 0, '    </AccountPageContext.Provider>');
}

fs.writeFileSync(accountPath, accountLines.join('\n'));

console.log('AccountTabPanels lines:', tabPanels.split('\n').length);
console.log('Account.jsx lines:', accountLines.length);
console.log('Context keys:', CONTEXT_KEYS.length);
