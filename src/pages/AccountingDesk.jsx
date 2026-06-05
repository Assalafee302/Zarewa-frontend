import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Scale,
  FileSpreadsheet,
  ClipboardCheck,
  Users,
  Truck,
  Calendar,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader, PageShell, MainPanel } from '../components/layout';
import { useToast } from '../context/ToastContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { ReportsFinanceReconciliationPackSection } from '../components/reports/ReportsFinanceReconciliationPackSection.jsx';
import { ReportsGlPilotSection } from '../components/reports/ReportsGlPilotSection.jsx';
import { userHasLegacyFullFinanceDeskClient } from '../lib/financeDeskAccess';
import { useFinanceTrialExceptions } from '../hooks/useFinanceTrialExceptions';
import { FinanceTrialExceptionPanel } from '../components/finance/FinanceTrialExceptionPanel';
import { Ap1cDryRunPanel } from '../components/finance/Ap1cDryRunPanel';
import {
  userMayViewAp1cDryRunClient,
  userMayViewFinanceTrialExceptionsClient,
} from '../lib/financeTrialExceptionsAccess';
import { useAp1cDryRun } from '../hooks/useAp1cDryRun';

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

function PlaceholderCard({ icon, title, description, linkTo, linkLabel }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5">
      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-2">
        {icon}
        {title}
      </h3>
      <p className="text-sm font-medium text-slate-600 leading-relaxed">{description}</p>
      {linkTo ? (
        <Link to={linkTo} className="text-xs font-bold text-teal-800 mt-3 inline-block hover:underline">
          {linkLabel || 'Open →'}
        </Link>
      ) : null}
    </div>
  );
}

export default function AccountingDesk() {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const [{ startDate, endDate }] = useState(defaultPeriodRange);
  const hasFinanceView = Boolean(ws?.hasPermission?.('finance.view'));
  const branchScopeLabel = ws.viewAllBranches
    ? 'All branches (HQ roll-up)'
    : ws.branchLabel || ws.branchScope || ws.session?.currentBranchId || '';

  const roleKey = ws?.session?.user?.roleKey;
  const readOnlyExec = ['md', 'ceo'].includes(String(roleKey || '').toLowerCase());
  const legacyNote = useMemo(
    () => userHasLegacyFullFinanceDeskClient(roleKey, ws?.session?.user?.permissions),
    [roleKey, ws?.session?.user?.permissions]
  );
  const permissions = ws?.session?.user?.permissions;
  const mayTrialApi = userMayViewFinanceTrialExceptionsClient(roleKey, permissions);
  const trialBranch = ws.viewAllBranches ? null : ws.branchScope || ws.session?.currentBranchId;
  const { data: trialData, loading: trialLoading, error: trialError, reload: reloadTrial } =
    useFinanceTrialExceptions({ branchId: trialBranch, enabled: mayTrialApi });
  const mayAp1cDryRun = userMayViewAp1cDryRunClient(roleKey, permissions);
  const ap1cDiagnosticsOn = Boolean(trialData?.flags?.accountingPolicyV1Diagnostics);
  const { data: ap1cData, loading: ap1cLoading, error: ap1cError, reload: reloadAp1c } = useAp1cDryRun({
    branchId: trialBranch,
    enabled: mayAp1cDryRun && ap1cDiagnosticsOn,
  });

  return (
    <PageShell>
      <PageHeader
        title="Accounting Desk"
        subtitle="Company-wide accounting control — reconciliation review, GL, and month-end. Head of Accounts does not perform routine cashier confirmation here."
      />

      <p className="text-sm font-medium text-slate-600 mb-4 max-w-3xl leading-relaxed">
        <strong>Accounting Policy v1:</strong> AP1a labels/diagnostics; AP1b delivery gate via{' '}
        <code className="text-xs bg-slate-100 px-1 rounded">DELIVERY_PAYMENT_GATE=1</code> (warn) or{' '}
        <code className="text-xs bg-slate-100 px-1 rounded">enforce</code>. GL receipt timing unchanged until AP1c. See{' '}
        <code className="text-xs">docs/ACCOUNTING_POLICY_V1.md</code>.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {['Accounting control', 'Management draft', 'Reconciliation review', 'Company-wide view'].map((label) => (
          <span
            key={label}
            className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-900"
          >
            {label}
          </span>
        ))}
        {readOnlyExec ? (
          <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
            MD / audit read-only
          </span>
        ) : null}
      </div>

      <p className="text-sm font-medium text-slate-600 mb-6 max-w-3xl leading-relaxed">
        Receipt confirmation remains on{' '}
        <Link to="/cashier" className="font-bold text-teal-800 hover:underline">
          Cashier Desk
        </Link>
        . Formal bank statement reconciliation is not the primary control — use the cash confirmation pack below.
      </p>

      <MainPanel className="space-y-8">
        {hasFinanceView ? (
          <ReportsFinanceReconciliationPackSection
            endDate={endDate}
            hasFinanceView={hasFinanceView}
            showToast={showToast}
            branchScopeLabel={branchScopeLabel}
          />
        ) : (
          <p className="text-sm text-amber-800 font-medium">finance.view required for reconciliation pack.</p>
        )}

        {hasFinanceView ? (
          <div id="accounting-gl-pilot">
            <ReportsGlPilotSection
              startDate={startDate}
              endDate={endDate}
              hasFinanceView={hasFinanceView}
              showToast={showToast}
            />
          </div>
        ) : null}

        <section>
          <h2 className="z-section-title mb-4">Month-end &amp; subledger review (planned)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlaceholderCard
              icon={<FileSpreadsheet size={16} className="text-indigo-700" />}
              title="Draft statements pack"
              description="P&L and balance sheet from GL — Phase A2. Management draft only, not statutory."
            />
            <PlaceholderCard
              icon={<Users size={16} className="text-indigo-700" />}
              title="Customer ledger reconciliation"
              description="AR and deposits tie-out vs GL — expand in Phase B3 exception API."
              linkTo="/reports"
              linkLabel="Standard sales / AR reports →"
            />
            <PlaceholderCard
              icon={<Truck size={16} className="text-indigo-700" />}
              title="Supplier / AP reconciliation"
              description="Ordered vs received vs paid bridge — see procurement reports and Phase A5 AP basis."
              linkTo="/reports"
              linkLabel="Purchases reports →"
            />
            <PlaceholderCard
              icon={<Calendar size={16} className="text-indigo-700" />}
              title="Month-end close checklist"
              description="Period lock, stock register, payroll GL export, data quality — Phase A4."
              linkTo="/reports"
              linkLabel="Reports workspace →"
            />
            <PlaceholderCard
              icon={<ClipboardCheck size={16} className="text-indigo-700" />}
              title="Payroll posting status"
              description="Locked runs without GL journal — export CSV from HR payroll, post via Audit tab."
              linkTo="/hr"
              linkLabel="HR payroll →"
            />
            <PlaceholderCard
              icon={<Building2 size={16} className="text-indigo-700" />}
              title="Fixed assets"
              description="Phase 2 register and depreciation — accounting phase-2 ops."
            />
          </div>
        </section>

        {mayAp1cDryRun && ap1cDiagnosticsOn ? (
          <Ap1cDryRunPanel
            data={ap1cData}
            loading={ap1cLoading}
            error={ap1cError}
            onReload={reloadAp1c}
          />
        ) : null}

        {mayTrialApi ? (
          <FinanceTrialExceptionPanel
            variant="accounting"
            data={trialData}
            loading={trialLoading}
            error={trialError}
            onReload={reloadTrial}
          />
        ) : (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
            <p className="text-sm font-medium text-amber-900/90">Sign in with accounting or finance permissions to load exception summary.</p>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2">
            <ShieldCheck size={16} className="text-teal-700" />
            Audit trail
          </h2>
          <p className="text-sm font-medium text-slate-600 mb-3">
            Manual GL journals, period locks, and edit approvals live on the legacy Finance Audit tab during transition.
          </p>
          <Link
            to="/accounts?tab=audit"
            className="inline-flex items-center gap-2 text-sm font-bold text-teal-800 hover:underline"
          >
            <Scale size={16} />
            Open Finance → Audit
          </Link>
        </section>

        <p className="text-xs font-medium text-slate-500 pt-2 border-t border-slate-200">
          <Link to="/accounts" className="text-teal-800 font-bold hover:underline">
            Finance (legacy)
          </Link>{' '}
          remains available for full treasury and payment execution during Phase B compatibility.
          {legacyNote ? ' Your role retains legacy cross-links until Phase B3.' : null}
        </p>
      </MainPanel>
    </PageShell>
  );
}
