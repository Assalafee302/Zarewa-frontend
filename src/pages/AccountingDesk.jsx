import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Scale,
  ShieldCheck,
  LayoutDashboard,
  Users,
  Building2,
  Landmark,
  Wallet,
  FileBarChart,
  Receipt,
  CreditCard,
  Truck,
  Calculator,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { PageShell, MainPanel, PageHeader, PageTabs } from '../components/layout';
import { useToast } from '../context/ToastContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { ReportsFinanceReconciliationPackSection } from '../components/reports/ReportsFinanceReconciliationPackSection.jsx';
import { ReportsGlPilotSection } from '../components/reports/ReportsGlPilotSection.jsx';
import { userHasLegacyFullFinanceDeskClient } from '../lib/financeDeskAccess';
import { useFinanceTrialExceptions } from '../hooks/useFinanceTrialExceptions';
import { FinanceTrialExceptionPanel } from '../components/finance/FinanceTrialExceptionPanel';
import { Ap1cDryRunPanel } from '../components/finance/Ap1cDryRunPanel';
import { CreditExceptionPanel } from '../components/finance/CreditExceptionPanel';
import {
  userMayViewAp1cDryRunClient,
  userMayViewFinanceTrialExceptionsClient,
} from '../lib/financeTrialExceptionsAccess';
import { useAp1cDryRun } from '../hooks/useAp1cDryRun';
import { AccountingDeskKpiCard, AccountingDeskNotice } from '../components/finance/accounting/AccountingDeskUi';
import { formatNgn } from '../Data/mockData';
import { AccountingDeskReports } from '../components/finance/AccountingDeskReports';
import { Ap2SupplierDiagnosticsPanel } from '../components/finance/Ap2SupplierDiagnosticsPanel';
import {
  userMayViewAp2SupplierDiagnosticsClient,
  userMayViewAp2ApRebuildPreviewClient,
  userMayApplyAp2ApRebuildClient,
  userMayViewAp3CostingReadinessClient,
} from '../lib/financeTrialExceptionsAccess';
import { Ap3CostingReadinessPanel } from '../components/finance/Ap3CostingReadinessPanel';
import { FinancePayrollPaymentsPanel } from '../components/finance/FinancePayrollPaymentsPanel';
import { AccountingCreditorsPanel } from '../components/finance/AccountingCreditorsPanel';
import { AccountingDebtorsPanel } from '../components/finance/AccountingDebtorsPanel';
import { AccountingAssetsPanel } from '../components/finance/AccountingAssetsPanel';

function defaultPeriodRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const last = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    startDate: `${y}-${m}-01`,
    endDate: `${y}-${m}-${String(last).padStart(2, '0')}`,
  };
}

const TAB_LABELS = {
  overview: 'Overview',
  creditors: 'Creditors',
  debtors: 'Debtors',
  assets: 'Assets',
  payroll: 'Payroll',
  reconciliation: 'Reconciliation',
  reports: 'Reports',
  ap1c: 'Receipt & production',
  credit: 'Credit',
  'supplier-ap': 'Supplier & AP',
  costing: 'Costing',
  gl: 'GL pilot',
  month: 'Month-end',
};

const ACCOUNTING_TABS = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { id: 'creditors', label: 'Creditors', icon: <Users size={16} /> },
  { id: 'debtors', label: 'Debtors', icon: <Wallet size={16} /> },
  { id: 'assets', label: 'Assets', icon: <Building2 size={16} /> },
  { id: 'payroll', label: 'Payroll', icon: <Landmark size={16} /> },
  { id: 'reconciliation', label: 'Reconciliation', icon: <Scale size={16} /> },
  { id: 'reports', label: 'Reports', icon: <FileBarChart size={16} /> },
  { id: 'ap1c', label: 'Receipt & production', icon: <Receipt size={16} /> },
  { id: 'credit', label: 'Credit', icon: <CreditCard size={16} /> },
  { id: 'supplier-ap', label: 'Supplier & AP', icon: <Truck size={16} /> },
  { id: 'costing', label: 'Costing', icon: <Calculator size={16} /> },
  { id: 'gl', label: 'GL pilot', icon: <BookOpen size={16} /> },
  { id: 'month', label: 'Month-end', icon: <Calendar size={16} /> },
];

export default function AccountingDesk() {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const location = useLocation();
  const [tab, setTab] = useState('overview');
  const [{ startDate, endDate }] = useState(defaultPeriodRange);
  const hasFinanceView = Boolean(ws?.hasPermission?.('finance.view'));
  const branchScopeLabel = ws.viewAllBranches
    ? 'Company-wide'
    : ws.branchLabel || ws.branchScope || ws.session?.currentBranchId || '';

  const roleKey = ws?.session?.user?.roleKey;
  const permissions = ws?.session?.user?.permissions;
  const mayTrialApi = userMayViewFinanceTrialExceptionsClient(roleKey, permissions);
  const trialBranch = ws.viewAllBranches ? null : ws.branchScope || ws.session?.currentBranchId;
  const { data: trialData, loading: trialLoading, error: trialError, reload: reloadTrial } =
    useFinanceTrialExceptions({ branchId: trialBranch, enabled: mayTrialApi });
  const mayAp1cDryRun = userMayViewAp1cDryRunClient(roleKey, permissions);
  const mayAp2 = userMayViewAp2SupplierDiagnosticsClient(roleKey, permissions);
  const mayAp2Preview = userMayViewAp2ApRebuildPreviewClient(roleKey, permissions);
  const mayAp2Apply = userMayApplyAp2ApRebuildClient(roleKey, permissions);
  const mayAp3 = userMayViewAp3CostingReadinessClient(roleKey, permissions);
  const mayAccountingSubledger = userMayViewAp1cDryRunClient(roleKey, permissions);
  const ap2Branch = ws.viewAllBranches ? 'ALL' : ws.branchScope || ws.session?.currentBranchId || 'ALL';

  useEffect(() => {
    const focus = location.state?.focusTab;
    if (focus && TAB_LABELS[focus]) setTab(focus);
  }, [location.state?.focusTab]);

  const ap1cDiagnosticsOn = Boolean(trialData?.flags?.accountingPolicyV1Diagnostics);
  const { data: ap1cData, loading: ap1cLoading, error: ap1cError, reload: reloadAp1c } = useAp1cDryRun({
    branchId: trialBranch,
    enabled: mayAp1cDryRun && ap1cDiagnosticsOn,
  });
  const ex = trialData?.exceptions;
  const ap3Trial = trialData?.ap3Costing;
  const ap3MaterialTrial = trialData?.ap3MaterialCost;
  const ap1c = trialData?.ap1cDryRun?.summary || ap1cData?.summary;
  const creditTrial = trialData?.creditExceptions;
  const ap2Trial = trialData?.ap2Supplier;
  const legacyNote = useMemo(
    () => userHasLegacyFullFinanceDeskClient(roleKey, permissions),
    [roleKey, permissions]
  );

  const isRegisterTab = tab === 'creditors' || tab === 'debtors' || tab === 'assets';

  return (
    <PageShell>
      <PageHeader
        eyebrow="Finance"
        title="Accounting Desk"
        subtitle={`${branchScopeLabel || 'Branch'} · Management draft · Trial mode`}
        tabs={<PageTabs tabs={ACCOUNTING_TABS} value={tab} onChange={setTab} />}
        toolbar={
          tab === 'overview' ? (
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => setTab('reconciliation')}
                className="inline-flex items-center rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider shadow-sm hover:brightness-105"
              >
                Run reconciliation
              </button>
              {mayAccountingSubledger ? (
                <button
                  type="button"
                  onClick={() => setTab('creditors')}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50"
                >
                  Creditors
                </button>
              ) : null}
            </div>
          ) : null
        }
      />

      <AccountingDeskNotice tone="trial">
        Receipt confirmation stays on Finance → Desk (branch cashiers). Policy v1 GL posting flags remain off until
        Head of Accounts signs off dry-run.
      </AccountingDeskNotice>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 min-w-0 mt-4">
        {tab === 'overview' ? (
          <section className="col-span-full space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <AccountingDeskKpiCard
                label="Reconciliation warnings"
                value={ex?.pendingReceiptClearance ?? '—'}
                hint="Receipts not cleared"
                tone="amber"
              />
              <AccountingDeskKpiCard
                label="Treasury drift"
                value={ex?.treasuryMovementWithoutFinanceSettlement ?? '—'}
                tone="amber"
              />
              <AccountingDeskKpiCard
                label="Receipt / deposit risk"
                value={ap1c?.preProductionReceiptsWouldCredit2500Count ?? '—'}
                hint="Should be customer deposits"
              />
              <AccountingDeskKpiCard
                label="Credit exposure"
                value={formatNgn(creditTrial?.approvedCreditExposureNgn ?? 0)}
                hint={`${creditTrial?.pendingCreditExceptionsCount ?? 0} pending`}
                tone="teal"
              />
              {mayAp2 ? (
                <AccountingDeskKpiCard
                  label="AP difference (supplier)"
                  value={formatNgn(ap2Trial?.apDifferenceNgn ?? 0)}
                  hint={`${ap2Trial?.missingCostCount ?? 0} missing cost`}
                  tone={(ap2Trial?.apDifferenceNgn || 0) !== 0 ? 'amber' : 'default'}
                />
              ) : null}
              {mayAp3 && ap3Trial?.available ? (
                <AccountingDeskKpiCard
                  label="Costing readiness"
                  value={`${ap3Trial.readinessScore ?? 0}%`}
                  hint={
                    ap3MaterialTrial?.trustedMaterialCostPerMetreNgn != null
                      ? `Trusted ₦/m ${formatNgn(ap3MaterialTrial.trustedMaterialCostPerMetreNgn)}`
                      : `Draft ₦/m ${formatNgn(ap3Trial.materialCostPerMetreNgn ?? 0)}`
                  }
                  tone={(ap3Trial.readinessScore ?? 100) < 70 ? 'amber' : 'teal'}
                />
              ) : null}
            </div>
            {mayTrialApi ? (
              <MainPanel className="!rounded-xl !border-slate-200/90 !shadow-sm !bg-white !p-0 overflow-hidden">
                <div className="h-1 bg-[#134e4a]" />
                <div className="p-4 sm:p-5">
                  <FinanceTrialExceptionPanel
                    variant="accounting"
                    data={trialData}
                    loading={trialLoading}
                    error={trialError}
                    onReload={reloadTrial}
                  />
                </div>
              </MainPanel>
            ) : null}
          </section>
        ) : null}

        {tab === 'creditors' && mayAccountingSubledger ? (
          <section className="col-span-full">
            <AccountingCreditorsPanel branchId={trialBranch} enabled canManage={mayAccountingSubledger} />
          </section>
        ) : tab === 'creditors' ? (
          <p className="col-span-full text-[11px] font-medium text-slate-600">
            Creditors register requires Head of Accounts or accounting desk access.
          </p>
        ) : null}

        {tab === 'debtors' && mayAccountingSubledger ? (
          <section className="col-span-full">
            <AccountingDebtorsPanel branchId={trialBranch} enabled canManage={mayAccountingSubledger} />
          </section>
        ) : tab === 'debtors' ? (
          <p className="col-span-full text-[11px] font-medium text-slate-600">
            Debtors register requires Head of Accounts or accounting desk access.
          </p>
        ) : null}

        {tab === 'assets' && mayAccountingSubledger ? (
          <section className="col-span-full">
            <AccountingAssetsPanel branchId={trialBranch} enabled canManage={mayAccountingSubledger} />
          </section>
        ) : tab === 'assets' ? (
          <p className="col-span-full text-[11px] font-medium text-slate-600">
            Fixed assets register requires Head of Accounts or accounting desk access.
          </p>
        ) : null}

        {!isRegisterTab && tab !== 'overview' ? (
          <MainPanel className="col-span-full !rounded-xl !border-slate-200/90 !shadow-sm !bg-white !p-0 overflow-hidden">
            <div className="h-1 bg-[#134e4a]" />
            <div className="p-4 sm:p-5 md:p-6 space-y-6">
              {tab === 'payroll' ? <FinancePayrollPaymentsPanel /> : null}

              {tab === 'reports' ? (
                <AccountingDeskReports
                  trialData={trialData}
                  ap1cData={ap1cData}
                  onReloadTrial={reloadTrial}
                  onReloadAp1c={reloadAp1c}
                  branchScopeLabel={branchScopeLabel}
                />
              ) : null}

              {tab === 'reconciliation' && hasFinanceView ? (
                <ReportsFinanceReconciliationPackSection
                  endDate={endDate}
                  hasFinanceView={hasFinanceView}
                  showToast={showToast}
                  branchScopeLabel={branchScopeLabel}
                  deskLayout
                />
              ) : null}

              {tab === 'ap1c' && mayAp1cDryRun && ap1cDiagnosticsOn ? (
                <Ap1cDryRunPanel data={ap1cData} loading={ap1cLoading} error={ap1cError} onReload={reloadAp1c} />
              ) : tab === 'ap1c' ? (
                <p className="text-[11px] font-medium text-slate-600">
                  Enable{' '}
                  <code className="rounded bg-slate-100 px-1 text-[10px]">ACCOUNTING_POLICY_V1_DIAGNOSTICS=1</code> for
                  receipt/production dry-run.
                </p>
              ) : null}

              {tab === 'credit' ? (
                <CreditExceptionPanel branchId={trialBranch} roleKey={roleKey} trialCredit={creditTrial} />
              ) : null}

              {tab === 'supplier-ap' && mayAp2 ? (
                <Ap2SupplierDiagnosticsPanel
                  initialBranchId={ap2Branch}
                  enabled={mayAp2}
                  mayPreviewRebuild={mayAp2Preview}
                  mayApplyRebuild={mayAp2Apply}
                  showAp2c={mayAp2}
                  onRebuildSuccess={() =>
                    showToast('AP rebuild applied. Diagnostics refreshed.', { variant: 'success' })
                  }
                />
              ) : tab === 'supplier-ap' ? (
                <p className="text-[11px] font-medium text-slate-600">
                  Supplier payables diagnostics require accounting or finance reconciliation access.
                </p>
              ) : null}

              {tab === 'costing' && mayAp3 ? (
                <Ap3CostingReadinessPanel initialBranchId={ap2Branch} enabled={mayAp3} />
              ) : tab === 'costing' ? (
                <p className="text-[11px] font-medium text-slate-600">
                  Costing readiness requires Head of Accounts or finance oversight access.
                </p>
              ) : null}

              {tab === 'gl' && hasFinanceView ? (
                <div id="accounting-gl-pilot">
                  <ReportsGlPilotSection
                    startDate={startDate}
                    endDate={endDate}
                    hasFinanceView={hasFinanceView}
                    showToast={showToast}
                  />
                </div>
              ) : null}

              {tab === 'month' ? (
                <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-5 text-[11px] font-medium text-slate-600 leading-relaxed">
                  Month-end close checklist, draft statements, and payroll GL status — planned Phase A2/A4. Use{' '}
                  <Link to="/reports" className="font-bold text-[#134e4a] hover:underline">
                    Reports
                  </Link>{' '}
                  and{' '}
                  <Link to="/accounts?tab=audit" className="font-bold text-[#134e4a] hover:underline">
                    Finance → Audit
                  </Link>{' '}
                  in the meantime.
                </section>
              ) : null}

              <section className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4">
                <h2 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#134e4a]">
                  <ShieldCheck size={14} />
                  Audit trail
                </h2>
                <p className="mb-3 text-[11px] font-medium text-slate-600">
                  Period locks, manual journals, and edit approvals on legacy Finance Audit tab.
                </p>
                <Link
                  to="/accounts?tab=audit"
                  className="inline-flex items-center gap-2 text-[11px] font-bold text-[#134e4a] hover:underline"
                >
                  <Scale size={14} />
                  Open Finance → Audit
                </Link>
              </section>

              <p className="border-t border-slate-200 pt-2 text-[10px] font-medium text-slate-500">
                <Link to="/accounts?tab=desk" className="font-bold text-[#134e4a] hover:underline">
                  Cashier Desk
                </Link>{' '}
                for daily confirmation.{' '}
                <Link to="/accounts" className="font-bold text-[#134e4a] hover:underline">
                  Finance (legacy)
                </Link>{' '}
                for full treasury execution.
                {legacyNote ? ' Compatibility mode active.' : null}
              </p>
            </div>
          </MainPanel>
        ) : null}
      </div>
    </PageShell>
  );
}
