import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Scale,
  Users,
  Building2,
  Landmark,
  Wallet,
  CreditCard,
  ArrowRightLeft,
  LayoutDashboard,
  FileBarChart,
  BookOpen,
  Flag,
  Lock,
  ShieldCheck,
  Factory,
} from 'lucide-react';
import { PageShell, MainPanel, PageHeader, PageTabs } from '../components/layout';
import { useToast } from '../context/ToastContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { DOCUMENT_TITLE_BASE } from '../lib/documentTitle';
import { ReportsFinanceReconciliationPackSection } from '../components/reports/ReportsFinanceReconciliationPackSection.jsx';
import { userMayViewAp1cDryRunClient } from '../lib/financeTrialExceptionsAccess';
import { CreditExceptionPanel } from '../components/finance/CreditExceptionPanel';
import { FinancePayrollPaymentsPanel } from '../components/finance/FinancePayrollPaymentsPanel';
import { AccountingCreditorsPanel } from '../components/finance/AccountingCreditorsPanel';
import { AccountingDebtorsPanel } from '../components/finance/AccountingDebtorsPanel';
import { AccountingAssetsPanel } from '../components/finance/AccountingAssetsPanel';
import { AccountingInterBranchPanel } from '../components/finance/interBranch/AccountingInterBranchPanel';
import { AccountingOverviewPanel } from '../components/finance/AccountingOverviewPanel';
import { AccountingStatementsPanel } from '../components/finance/AccountingStatementsPanel';
import { AccountingGlPanel } from '../components/finance/AccountingGlPanel';
import { AccountingOpeningBalancePanel } from '../components/finance/AccountingOpeningBalancePanel';
import { AccountingClosePanel } from '../components/finance/AccountingClosePanel';
import { AccountingPolicyPanel } from '../components/finance/AccountingPolicyPanel';
import { Ap3CostingReadinessPanel } from '../components/finance/Ap3CostingReadinessPanel';
import { ACCOUNTING_OPENING_DATE_LABEL } from '../shared/accountingCutover';

function defaultPeriodRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const last = new Date(y, now.getMonth() + 1, 0).getDate();
  return { endDate: `${y}-${m}-${String(last).padStart(2, '0')}` };
}

const TAB_LABELS = {
  overview: 'Overview',
  statements: 'Statements',
  gl: 'General ledger',
  opening: 'Opening balance',
  close: 'Month-end close',
  policy: 'Deposit policy',
  costing: 'Production costing',
  creditors: 'Creditors',
  debtors: 'Debtors',
  assets: 'Fixed assets',
  interBranch: 'Inter-branch',
  credit: 'Credit approval',
  reconciliation: 'Reconciliation',
  payroll: 'Payroll',
};

const TAB_HINTS = {
  overview: 'Exceptions, cutover readiness, and quick paths to close.',
  statements: 'Profit & Loss and Statement of Financial Position from GL.',
  gl: 'Trial balance and journal activity for the period.',
  opening: `One-time ${ACCOUNTING_OPENING_DATE_LABEL} opening journal from last closing balances.`,
  close: 'Checklist before locking the period — receipts, payroll, depreciation, statements.',
  policy: 'AP1c dry-run and cutover to deposit-until-produced GL posting.',
  costing: 'Material cost per metre, expense buckets, and data readiness for branch P&L.',
  creditors: 'Amounts owed to the company — receivables, prepayments, and opening balances.',
  debtors: 'Amounts owed by the company — supplier AP, deposits, refunds, and suspense.',
  assets: 'Plant, property, and equipment register.',
  interBranch: 'Cross-branch treasury funding — propose, approve, repay, and track balances.',
  credit: 'Approve delivery before full payment is received.',
  reconciliation: 'Bank and cash tie-out for the selected period.',
  payroll: 'Bulk bank file and treasury posting after HR locks the run.',
};

/** Accountant-facing navigation — Overview first. */
const ACCOUNTING_TABS = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { id: 'statements', label: 'Statements', icon: <FileBarChart size={16} /> },
  { id: 'gl', label: 'GL', icon: <BookOpen size={16} /> },
  { id: 'opening', label: 'Opening', icon: <Flag size={16} /> },
  { id: 'close', label: 'Close', icon: <Lock size={16} /> },
  { id: 'policy', label: 'Deposits', icon: <ShieldCheck size={16} /> },
  { id: 'costing', label: 'Costing', icon: <Factory size={16} /> },
  { id: 'creditors', label: 'Creditors', icon: <Users size={16} /> },
  { id: 'debtors', label: 'Debtors', icon: <Wallet size={16} /> },
  { id: 'assets', label: 'Fixed assets', icon: <Building2 size={16} /> },
  { id: 'interBranch', label: 'Inter-branch', icon: <ArrowRightLeft size={16} /> },
  { id: 'credit', label: 'Credit approval', icon: <CreditCard size={16} /> },
  { id: 'reconciliation', label: 'Reconciliation', icon: <Scale size={16} /> },
  { id: 'payroll', label: 'Payroll', icon: <Landmark size={16} /> },
];

function branchScopeChip(label) {
  const text = label || 'All branches';
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700">
      {text}
    </span>
  );
}

export default function AccountingDesk() {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const location = useLocation();
  const [tab, setTab] = useState('overview');
  const [{ endDate }] = useState(defaultPeriodRange);

  const hasFinanceView = Boolean(ws?.hasPermission?.('finance.view'));
  const branchScopeLabel = ws.viewAllBranches
    ? 'Company-wide'
    : ws.branchLabel || ws.branchScope || ws.session?.currentBranchId || '';

  const roleKey = ws?.session?.user?.roleKey;
  const permissions = ws?.permissions;
  const branchId = ws.viewAllBranches ? null : ws.branchScope || ws.session?.currentBranchId;
  const mayRegisters = userMayViewAp1cDryRunClient(roleKey, permissions);
  const mayInterBranch = hasFinanceView || mayRegisters;

  useEffect(() => {
    const focus = location.state?.focusTab;
    const queryTab = new URLSearchParams(location.search).get('tab');
    if (queryTab && TAB_LABELS[queryTab]) setTab(queryTab);
    else if (focus && TAB_LABELS[focus]) setTab(focus);
    else if (focus === 'supplier-ap') setTab('debtors');
    else if (focus === 'costing' || focus === 'production-cost') setTab('costing');
    else if (focus === 'policy' || focus === 'ap1c') setTab('policy');
    else if (focus === 'inter-branch' || focus === 'interBranch') setTab('interBranch');
    else if (focus) setTab('overview');
  }, [location.state?.focusTab, location.search]);

  useEffect(() => {
    document.title = `${TAB_LABELS[tab] ? `${TAB_LABELS[tab]} · ` : ''}Accounting Desk | ${DOCUMENT_TITLE_BASE}`;
  }, [tab]);

  let accessDenied = null;
  if ((tab === 'creditors' || tab === 'debtors' || tab === 'assets') && !mayRegisters) {
    accessDenied = 'Registers require Head of Accounts or accounting desk access.';
  } else if (
    (tab === 'statements' || tab === 'gl' || tab === 'opening' || tab === 'close' || tab === 'reconciliation') &&
    !hasFinanceView
  ) {
    accessDenied = 'GL and statements require finance view access.';
  } else if ((tab === 'policy' || tab === 'costing') && !mayRegisters) {
    accessDenied = 'Policy and costing reports require Head of Accounts or accounting desk access.';
  } else if (tab === 'interBranch' && !mayInterBranch) {
    accessDenied = 'Inter-branch transfers require finance or accounting desk access.';
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Finance"
        title="Accounting Desk"
        subtitle={TAB_HINTS[tab] || ''}
        tabs={<PageTabs tabs={ACCOUNTING_TABS} value={tab} onChange={setTab} />}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {branchScopeChip(branchScopeLabel)}
            <Link
              to="/accounts?tab=desk"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50"
            >
              Cashier
            </Link>
            <Link
              to="/accounts?tab=audit"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50"
            >
              Audit
            </Link>
            <Link
              to="/procurement"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50"
            >
              Supplier AP
            </Link>
          </div>
        }
      />

      <MainPanel className="mt-4 !rounded-xl !border-slate-200/90 !shadow-sm !bg-white !p-0 overflow-hidden">
        <div className="h-1 bg-[#134e4a]" />
        <div className="p-4 sm:p-5 md:p-6">
          {accessDenied ? (
            <p className="text-[11px] font-medium text-slate-600">{accessDenied}</p>
          ) : null}

          {!accessDenied && tab === 'overview' ? (
            <AccountingOverviewPanel branchScopeLabel={branchScopeLabel} showToast={showToast} deskLayout />
          ) : null}

          {!accessDenied && tab === 'statements' && hasFinanceView ? (
            <AccountingStatementsPanel branchScopeLabel={branchScopeLabel} showToast={showToast} deskLayout />
          ) : null}

          {!accessDenied && tab === 'gl' && hasFinanceView ? (
            <AccountingGlPanel hasFinanceView={hasFinanceView} showToast={showToast} deskLayout />
          ) : null}

          {!accessDenied && tab === 'opening' && hasFinanceView ? (
            <AccountingOpeningBalancePanel showToast={showToast} deskLayout />
          ) : null}

          {!accessDenied && tab === 'close' && hasFinanceView ? (
            <AccountingClosePanel
              branchScopeLabel={branchScopeLabel}
              showToast={showToast}
              onFocusTab={setTab}
              deskLayout
            />
          ) : null}

          {!accessDenied && tab === 'policy' && mayRegisters ? (
            <AccountingPolicyPanel branchId={branchId} enabled deskLayout />
          ) : null}

          {!accessDenied && tab === 'costing' && mayRegisters ? (
            <Ap3CostingReadinessPanel
              initialBranchId={branchId || 'ALL'}
              autoLoad
              enabled
              deskLayout
            />
          ) : null}

          {!accessDenied && tab === 'creditors' && mayRegisters ? (
            <AccountingCreditorsPanel
              branchId={branchId}
              enabled
              canManage={mayRegisters}
              branchScopeLabel={branchScopeLabel}
            />
          ) : null}

          {!accessDenied && tab === 'debtors' && mayRegisters ? (
            <AccountingDebtorsPanel
              branchId={branchId}
              enabled
              canManage={mayRegisters}
              branchScopeLabel={branchScopeLabel}
            />
          ) : null}

          {!accessDenied && tab === 'assets' && mayRegisters ? (
            <AccountingAssetsPanel
              branchId={branchId}
              enabled
              canManage={mayRegisters}
              branchScopeLabel={branchScopeLabel}
            />
          ) : null}

          {!accessDenied && tab === 'interBranch' && mayInterBranch ? (
            <AccountingInterBranchPanel
              branchScopeLabel={branchScopeLabel}
              workspaceBranchId={branchId || ws?.branchScope || ws?.session?.currentBranchId || ''}
            />
          ) : null}

          {!accessDenied && tab === 'credit' ? (
            <CreditExceptionPanel branchId={branchId} roleKey={roleKey} />
          ) : null}

          {!accessDenied && tab === 'reconciliation' && hasFinanceView ? (
            <ReportsFinanceReconciliationPackSection
              endDate={endDate}
              hasFinanceView={hasFinanceView}
              showToast={showToast}
              branchScopeLabel={branchScopeLabel}
              deskLayout
            />
          ) : null}

          {!accessDenied && tab === 'payroll' ? <FinancePayrollPaymentsPanel /> : null}
        </div>
      </MainPanel>
    </PageShell>
  );
}
