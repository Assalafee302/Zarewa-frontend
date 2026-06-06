import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Scale, ShieldCheck } from 'lucide-react';
import { PageShell, MainPanel } from '../components/layout';
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
import { FinancePageHeader } from '../components/finance/FinancePageHeader';
import { FinanceKpiCard } from '../components/finance/FinanceKpiCard';
import { FinanceTrialBanner } from '../components/finance/FinanceTrialBanner';
import { FinanceStatusChip } from '../components/finance/FinanceStatusChip';
import { FinanceTabs } from '../components/finance/FinanceTabs';
import { formatNgn } from '../Data/mockData';
import { FinanceActionButton } from '../components/finance/FinanceActionButton';
import { AccountingDeskReports } from '../components/finance/AccountingDeskReports';
import { Ap2SupplierDiagnosticsPanel } from '../components/finance/Ap2SupplierDiagnosticsPanel';
import {
  userMayViewAp2SupplierDiagnosticsClient,
  userMayViewAp2ApRebuildPreviewClient,
  userMayApplyAp2ApRebuildClient,
  userMayViewAp3CostingReadinessClient,
} from '../lib/financeTrialExceptionsAccess';
import { Ap3CostingReadinessPanel } from '../components/finance/Ap3CostingReadinessPanel';

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

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'reconciliation', label: 'Reconciliation' },
  { id: 'reports', label: 'Reports' },
  { id: 'ap1c', label: 'Receipt & production' },
  { id: 'credit', label: 'Credit exceptions' },
  { id: 'supplier-ap', label: 'Supplier & AP' },
  { id: 'costing', label: 'Costing' },
  { id: 'gl', label: 'GL pilot' },
  { id: 'month', label: 'Month-end' },
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
  const ap2Branch = ws.viewAllBranches ? 'ALL' : ws.branchScope || ws.session?.currentBranchId || 'ALL';

  useEffect(() => {
    if (location.state?.focusTab === 'costing' && mayAp3) setTab('costing');
  }, [location.state?.focusTab, mayAp3]);

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

  return (
    <PageShell>
      <FinancePageHeader
        title="Accounting Desk"
        subtitle="Review exceptions, reconcile cash, monitor GL readiness, and prepare month-end controls."
        badges={
          <>
            <FinanceStatusChip label={branchScopeLabel || 'Branch'} tone="neutral" />
            <FinanceStatusChip label="Management draft" tone="neutral" />
            <FinanceStatusChip label="Trial mode" tone="trial" />
          </>
        }
      />

      <FinanceTrialBanner>
        Receipt confirmation stays on Cashier Desk. Policy v1 GL posting flags remain off until Head of Accounts signs off
        dry-run.
      </FinanceTrialBanner>

      <MainPanel className="space-y-6">
        <FinanceTabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'overview' ? (
          <section className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <FinanceActionButton variant="primary" onClick={() => setTab('reconciliation')}>
                Run reconciliation
              </FinanceActionButton>
              <FinanceActionButton variant="secondary" onClick={() => { setTab('ap1c'); reloadAp1c(); }}>
                Load AP1c dry-run
              </FinanceActionButton>
              <FinanceActionButton variant="secondary" onClick={() => setTab('reports')}>
                View reports
              </FinanceActionButton>
              {mayAp2 ? (
                <FinanceActionButton variant="secondary" onClick={() => setTab('supplier-ap')}>
                  Supplier &amp; AP diagnostics
                </FinanceActionButton>
              ) : null}
              {mayAp3 ? (
                <FinanceActionButton variant="secondary" onClick={() => setTab('costing')}>
                  Costing readiness
                </FinanceActionButton>
              ) : null}
              <FinanceActionButton variant="link" to="/accounts?tab=audit">
                Open GL detail
              </FinanceActionButton>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <FinanceKpiCard
                label="Reconciliation warnings"
                value={ex?.pendingReceiptClearance ?? '—'}
                hint="Receipts not cleared"
                tone="amber"
              />
              <FinanceKpiCard
                label="Treasury drift"
                value={ex?.treasuryMovementWithoutFinanceSettlement ?? '—'}
                tone="amber"
              />
              <FinanceKpiCard
                label="Receipt / deposit risk"
                value={ap1c?.preProductionReceiptsWouldCredit2500Count ?? '—'}
                hint="Should be customer deposits"
              />
              <FinanceKpiCard
                label="Credit exposure"
                value={formatNgn(creditTrial?.approvedCreditExposureNgn ?? 0)}
                hint={`${creditTrial?.pendingCreditExceptionsCount ?? 0} pending`}
                tone="teal"
              />
              {mayAp2 ? (
                <FinanceKpiCard
                  label="AP difference (supplier)"
                  value={formatNgn(ap2Trial?.apDifferenceNgn ?? 0)}
                  hint={`${ap2Trial?.missingCostCount ?? 0} missing cost`}
                  tone={(ap2Trial?.apDifferenceNgn || 0) !== 0 ? 'amber' : 'neutral'}
                />
              ) : null}
              {mayAp3 && ap3Trial?.available ? (
                <FinanceKpiCard
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
              <FinanceTrialExceptionPanel
                variant="accounting"
                data={trialData}
                loading={trialLoading}
                error={trialError}
                onReload={reloadTrial}
              />
            ) : null}
          </section>
        ) : null}

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
          />
        ) : null}

        {tab === 'ap1c' && mayAp1cDryRun && ap1cDiagnosticsOn ? (
          <Ap1cDryRunPanel data={ap1cData} loading={ap1cLoading} error={ap1cError} onReload={reloadAp1c} />
        ) : tab === 'ap1c' ? (
          <p className="text-sm font-medium text-slate-600">
            Enable <code className="rounded bg-slate-100 px-1 text-xs">ACCOUNTING_POLICY_V1_DIAGNOSTICS=1</code> for
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
          <p className="text-sm font-medium text-slate-600">
            Supplier payables diagnostics require accounting or finance reconciliation access.
          </p>
        ) : null}

        {tab === 'costing' && mayAp3 ? (
          <Ap3CostingReadinessPanel initialBranchId={ap2Branch} enabled={mayAp3} />
        ) : tab === 'costing' ? (
          <p className="text-sm font-medium text-slate-600">
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
          <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm font-medium text-slate-600">
            Month-end close checklist, draft statements, and payroll GL status — planned Phase A2/A4. Use{' '}
            <Link to="/reports" className="font-bold text-teal-800 hover:underline">
              Reports
            </Link>{' '}
            and{' '}
            <Link to="/accounts?tab=audit" className="font-bold text-teal-800 hover:underline">
              Finance → Audit
            </Link>{' '}
            in the meantime.
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800">
            <ShieldCheck size={16} className="text-teal-700" />
            Audit trail
          </h2>
          <p className="mb-3 text-sm font-medium text-slate-600">
            Period locks, manual journals, and edit approvals on legacy Finance Audit tab.
          </p>
          <Link to="/accounts?tab=audit" className="inline-flex items-center gap-2 text-sm font-bold text-teal-800 hover:underline">
            <Scale size={16} />
            Open Finance → Audit
          </Link>
        </section>

        <p className="border-t border-slate-200 pt-2 text-xs font-medium text-slate-500">
          <Link to="/cashier" className="font-bold text-teal-800 hover:underline">
            Cashier Desk
          </Link>{' '}
          for daily confirmation.{' '}
          <Link to="/accounts" className="font-bold text-teal-800 hover:underline">
            Finance (legacy)
          </Link>{' '}
          for full treasury execution.
          {legacyNote ? ' Compatibility mode active.' : null}
        </p>
      </MainPanel>
    </PageShell>
  );
}
