import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Link, useLocation, useNavigate } from 'react-router-dom';

import { PageShell, MainPanel, PageHeader } from '../components/layout';

import { useToast } from '../context/ToastContext';

import { useWorkspace } from '../context/WorkspaceContext';

import { DOCUMENT_TITLE_BASE } from '../lib/documentTitle';

import { ReportsFinanceReconciliationPackSection } from '../components/reports/ReportsFinanceReconciliationPackSection.jsx';

import { userMayViewAp1cDryRunClient } from '../lib/financeTrialExceptionsAccess';

import { userIsAccountingExecutiveReadOnlyClient } from '../lib/financeDeskAccess';

import { EXECUTIVE_READONLY_HIDDEN_TABS } from '../lib/accountingDeskNav';

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

import { Ap3BranchPlPanel } from '../components/finance/Ap3BranchPlPanel';

import { AccountingSupplierPolicyPanel } from '../components/finance/AccountingSupplierPolicyPanel';

import { AccountingDeskNav } from '../components/finance/accounting/AccountingDeskNav';

import { AccountingDeskContextBar } from '../components/finance/accounting/AccountingDeskContextBar';

import { AccountingDeskProvider } from '../components/finance/accounting/AccountingDeskContext';

import { AccountingDeskExecutiveNotice } from '../components/finance/accounting/AccountingDeskExecutiveNotice';

import { useAccountingDeskOverview } from '../hooks/useAccountingDeskOverview';

import {

  TAB_HINTS,

  TAB_LABELS,

  currentAccountingPeriodKey,

  resolveFocusTab,

} from '../lib/accountingDeskNav';



function defaultPeriodEndDate(periodKey) {

  const m = String(periodKey || '').match(/^(\d{4})-(\d{2})$/);

  if (!m) return new Date().toISOString().slice(0, 10);

  const y = Number(m[1]);

  const mo = Number(m[2]);

  const last = new Date(y, mo, 0).getDate();

  return `${y}-${String(mo).padStart(2, '0')}-${String(last).padStart(2, '0')}`;

}



export default function AccountingDesk() {

  const { show: showToast } = useToast();

  const ws = useWorkspace();

  const location = useLocation();

  const navigate = useNavigate();

  const [tab, setTabState] = useState('overview');

  const [periodKey, setPeriodKey] = useState(currentAccountingPeriodKey);

  const [deskRefresh, setDeskRefresh] = useState(0);

  const [openingPosted, setOpeningPosted] = useState(false);

  const {
    overview,
    loading: overviewLoading,
    error: overviewError,
    reload: reloadOverview,
  } = useAccountingDeskOverview({ periodKey, deskRefresh });



  const endDate = useMemo(() => defaultPeriodEndDate(periodKey), [periodKey]);



  const hasFinanceView = Boolean(ws?.hasPermission?.('finance.view'));

  const branchScopeLabel = ws.viewAllBranches

    ? 'Company-wide'

    : ws.branchLabel || ws.branchScope || ws.session?.currentBranchId || '';



  const roleKey = ws?.session?.user?.roleKey;

  const permissions = ws?.permissions;

  const branchId = ws.viewAllBranches ? null : ws.branchScope || ws.session?.currentBranchId;

  const mayRegisters = userMayViewAp1cDryRunClient(roleKey, permissions);

  const readOnlyExecutive = userIsAccountingExecutiveReadOnlyClient(roleKey, permissions);

  const canManageRegisters = mayRegisters && Boolean(ws?.hasPermission?.('finance.post'));

  const mayInterBranch = hasFinanceView || mayRegisters;

  const cutoverMode = openingPosted ? 'live' : 'pre';



  const setTab = useCallback(

    (nextTab) => {

      setTabState(nextTab);

      navigate({ pathname: location.pathname, search: `?tab=${encodeURIComponent(nextTab)}` }, { replace: true });

    },

    [location.pathname, navigate]

  );



  const loadOpeningStatus = useCallback(async () => {
    reloadOverview();
  }, [reloadOverview]);



  useEffect(() => {

    const queryTab = new URLSearchParams(location.search).get('tab');

    const resolved = resolveFocusTab(location.state?.focusTab, queryTab);

    if (resolved) setTabState(resolved);

  }, [location.state?.focusTab, location.search]);



  useEffect(() => {

    if (readOnlyExecutive && EXECUTIVE_READONLY_HIDDEN_TABS.has(tab)) {

      setTabState('overview');

      navigate({ pathname: location.pathname, search: '?tab=overview' }, { replace: true });

    }

  }, [readOnlyExecutive, tab, location.pathname, navigate]);



  useEffect(() => {
    if (overview?.opening?.posted || overview?.pack?.alreadyPosted) {
      setOpeningPosted(true);
    }
  }, [overview]);



  useEffect(() => {

    document.title = `${TAB_LABELS[tab] ? `${TAB_LABELS[tab]} · ` : ''}Accounting Desk | ${DOCUMENT_TITLE_BASE}`;

  }, [tab]);



  const requestDeskRefresh = useCallback(() => {

    setDeskRefresh((n) => n + 1);

    loadOpeningStatus();

  }, [loadOpeningStatus]);



  const deskContextValue = useMemo(

    () => ({

      periodKey,

      setPeriodKey,

      deskRefresh,

      requestDeskRefresh,

      openingPosted,

      setOpeningPosted,

      branchScopeLabel,

      cutoverMode,

      readOnlyExecutive,

      overview,

      overviewLoading,

      overviewError,

      reloadOverview,

    }),

    [
      periodKey,
      deskRefresh,
      requestDeskRefresh,
      openingPosted,
      branchScopeLabel,
      cutoverMode,
      readOnlyExecutive,
      overview,
      overviewLoading,
      overviewError,
      reloadOverview,
    ]
  );



  let accessDenied = null;

  if ((tab === 'creditors' || tab === 'debtors' || tab === 'assets') && !mayRegisters) {

    accessDenied = 'Registers require Head of Accounts or accounting desk access.';

  } else if (

    (tab === 'statements' ||

      tab === 'gl' ||

      tab === 'opening' ||

      tab === 'close' ||

      tab === 'reconciliation' ||

      tab === 'branchPl') &&

    !hasFinanceView

  ) {

    accessDenied = 'GL and statements require finance view access.';

  } else if ((tab === 'policy' || tab === 'costing' || tab === 'supplierAp') && !mayRegisters) {

    accessDenied = 'Policy and costing reports require Head of Accounts or accounting desk access.';

  } else if (tab === 'interBranch' && !mayInterBranch) {

    accessDenied = 'Inter-branch transfers require finance or accounting desk access.';

  }



  const hidePeriodBar = tab === 'opening' || tab === 'overview';



  return (

    <AccountingDeskProvider value={deskContextValue}>

      <PageShell>

        <PageHeader

          eyebrow="Finance"

          title="Accounting Desk"

          subtitle={TAB_HINTS[tab] || ''}

          tabs={<AccountingDeskNav tab={tab} onTabChange={setTab} readOnlyExecutive={readOnlyExecutive} />}

          toolbar={

            <div className="flex flex-wrap items-center gap-2 justify-end">

              <Link

                to="/accounts?tab=desk"

                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50"

              >

                Cashier desk

              </Link>

              <Link

                to="/accounts?tab=audit"

                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50"

              >

                Audit trail

              </Link>

              <Link

                to="/procurement"

                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50"

              >

                Procurement (POs)

              </Link>

            </div>

          }

        />



        <MainPanel className="mt-4 !rounded-xl !border-slate-200/90 !shadow-sm !bg-white !p-0 overflow-hidden">

          <div className="h-1 bg-[#134e4a]" />

          <div className="p-4 sm:p-5 md:p-6 space-y-4">

            {!accessDenied ? <AccountingDeskContextBar hidePeriod={hidePeriodBar} /> : null}



            {!accessDenied && readOnlyExecutive ? <AccountingDeskExecutiveNotice /> : null}



            {accessDenied ? (

              <p className="text-[11px] font-medium text-slate-600">{accessDenied}</p>

            ) : null}



            {!accessDenied && tab === 'overview' ? (

              <AccountingOverviewPanel

                branchScopeLabel={branchScopeLabel}

                showToast={showToast}

                deskLayout

                onFocusTab={setTab}

              />

            ) : null}



            {!accessDenied && tab === 'statements' && hasFinanceView ? (

              <AccountingStatementsPanel

                branchScopeLabel={branchScopeLabel}

                showToast={showToast}

                deskLayout

                periodKey={periodKey}

                onPeriodKeyChange={setPeriodKey}

                deskRefresh={deskRefresh}

              />

            ) : null}



            {!accessDenied && tab === 'gl' && hasFinanceView ? (

              <AccountingGlPanel

                hasFinanceView={hasFinanceView}

                showToast={showToast}

                deskLayout

                periodKey={periodKey}

                onPeriodKeyChange={setPeriodKey}

                deskRefresh={deskRefresh}

              />

            ) : null}



            {!accessDenied && tab === 'opening' && hasFinanceView ? (

              <AccountingOpeningBalancePanel

                showToast={showToast}

                deskLayout

                branchScopeLabel={branchScopeLabel}

                onFocusTab={setTab}

                deskRefresh={deskRefresh}

                onOpeningPosted={setOpeningPosted}

              />

            ) : null}



            {!accessDenied && tab === 'close' && hasFinanceView ? (

              <AccountingClosePanel

                branchScopeLabel={branchScopeLabel}

                showToast={showToast}

                onFocusTab={setTab}

                deskLayout

                periodKey={periodKey}

                onPeriodKeyChange={setPeriodKey}

                deskRefresh={deskRefresh}

              />

            ) : null}



            {!accessDenied && tab === 'policy' && mayRegisters ? (

              <AccountingPolicyPanel branchId={branchId} enabled deskLayout showToast={showToast} />

            ) : null}



            {!accessDenied && tab === 'supplierAp' && mayRegisters ? (

              <AccountingSupplierPolicyPanel branchId={branchId} enabled deskLayout showToast={showToast} />

            ) : null}



            {!accessDenied && tab === 'costing' && mayRegisters ? (

              <Ap3CostingReadinessPanel

                initialBranchId={branchId || 'ALL'}

                autoLoad

                enabled

                deskLayout

                periodKey={periodKey}

                deskRefresh={deskRefresh}

              />

            ) : null}



            {!accessDenied && tab === 'branchPl' && hasFinanceView ? (

              <Ap3BranchPlPanel

                initialBranchId={branchId || 'ALL'}

                autoLoad

                enabled

                deskLayout

                periodKey={periodKey}

                deskRefresh={deskRefresh}

              />

            ) : null}



            {!accessDenied && tab === 'creditors' && mayRegisters ? (

              <AccountingCreditorsPanel

                branchId={branchId}

                enabled

                canManage={canManageRegisters}

                branchScopeLabel={branchScopeLabel}

                deskRefresh={deskRefresh}

                onFocusTab={setTab}

              />

            ) : null}



            {!accessDenied && tab === 'debtors' && mayRegisters ? (

              <AccountingDebtorsPanel

                branchId={branchId}

                enabled

                canManage={canManageRegisters}

                branchScopeLabel={branchScopeLabel}

                deskRefresh={deskRefresh}

                onFocusTab={setTab}

              />

            ) : null}



            {!accessDenied && tab === 'assets' && mayRegisters ? (

              <AccountingAssetsPanel

                branchId={branchId}

                enabled

                canManage={canManageRegisters}

                branchScopeLabel={branchScopeLabel}

                deskRefresh={deskRefresh}

                onFocusTab={setTab}

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

                deskRefresh={deskRefresh}

              />

            ) : null}



            {!accessDenied && tab === 'payroll' ? <FinancePayrollPaymentsPanel deskRefresh={deskRefresh} /> : null}

          </div>

        </MainPanel>

      </PageShell>

    </AccountingDeskProvider>

  );

}


