import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { BarChart3, GraduationCap, Home, Landmark, Banknote } from 'lucide-react';
import { MainPanel, PageHeader, PageShell, PageTabs } from '../../components/layout';
import { InlineLoader } from '../../components/ui/PageLoader';
import { ChairmanImpactStrip } from '../../components/exec/ChairmanImpactStrip';
import { ChairmanPulseTab } from '../../components/exec/ChairmanPulseTab';
import { ChairmanWithdrawalsPanel } from '../../components/exec/ChairmanWithdrawalsPanel';
import { ChairmanLoansPanel } from '../../components/exec/ChairmanLoansPanel';
import { fetchChairmanOffice } from '../../lib/chairmanOffice';
import {
  CHAIRMAN_HOUSEHOLD_TABS,
  CHAIRMAN_SCHOLARSHIP_TABS,
} from '../../lib/chairmanOfficeHrefs';
import { useWorkspace } from '../../context/WorkspaceContext';
import { userMayAccessChairmanOfficeClient } from '../../lib/chairmanOfficeAccess';
import {
  COMMAND_SECTION_EYEBROW,
  COMMAND_SECTION_SUB,
  COMMAND_SECTION_TITLE,
} from '../../lib/execPageUi';

const TABS = [
  { id: 'pulse', label: 'Company pulse', icon: <BarChart3 size={14} /> },
  { id: 'scholarships', label: 'Scholarships', icon: <GraduationCap size={14} /> },
  { id: 'household', label: 'Household', icon: <Home size={14} /> },
  { id: 'withdrawals', label: 'Equity & withdrawals', icon: <Landmark size={14} /> },
  { id: 'loans', label: 'Loans', icon: <Banknote size={14} /> },
];

const TAB_SUBTITLES = {
  pulse: 'Company health this month — sales, cash, and alerts. MD still owns daily approvals.',
  scholarships: "School fees and monthly allowances for the Chairman's children.",
  household: 'Household staff salaries — separate from branch payroll. ERP login is optional.',
  withdrawals: 'Owner drawings (GL 3200). Not an operating expense, and not partner wallet.',
  loans: 'Company loans to the Chairman or to someone who is not staff (GL 1200 receivable). Not drawings.',
};

const FamilyDashboard = React.lazy(() => import('../hr/ExecutiveHrFamilyDashboard'));
const DomesticDashboard = React.lazy(() => import('../hr/ExecutiveHrDomesticDashboard'));
const BenefitsHub = React.lazy(() => import('../hr/HrChairmanAccounts'));

function DeskSection({ eyebrow, title, subtitle, children }) {
  return (
    <section className="space-y-4">
      <div>
        <p className={COMMAND_SECTION_EYEBROW}>{eyebrow}</p>
        <h2 className={COMMAND_SECTION_TITLE}>{title}</h2>
        {subtitle ? <p className={COMMAND_SECTION_SUB}>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function ChairmanOffice() {
  const ws = useWorkspace();
  const roleKey = String(ws?.session?.user?.roleKey || '').toLowerCase();
  const displayName = String(ws?.session?.user?.displayName || '').trim();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = String(searchParams.get('tab') || 'pulse');
  const activeTab = TABS.some((t) => t.id === rawTab) ? rawTab : 'pulse';
  const [office, setOffice] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');
  const [deskEpoch, setDeskEpoch] = useState(0);

  const allowed = userMayAccessChairmanOfficeClient(roleKey, ws?.permissions);

  const load = useCallback(async (opts = {}) => {
    const quiet = Boolean(opts.quiet);
    if (!quiet) setBusy(true);
    setErr('');
    try {
      setOffice(await fetchChairmanOffice());
    } catch (e) {
      if (!quiet) setOffice(null);
      setErr(e?.message || 'Could not load Chairman Office.');
    } finally {
      if (!quiet) setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    void load();
  }, [allowed, load]);

  const onRecordsChanged = useCallback(() => {
    setDeskEpoch((n) => n + 1);
    void load({ quiet: true });
  }, [load]);

  const setTab = (tabId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams();
      if (tabId !== 'pulse') next.set('tab', tabId);
      if (tabId === 'scholarships') {
        const inner = prev.get('benefitsTab');
        next.set('benefitsTab', CHAIRMAN_SCHOLARSHIP_TABS.includes(inner) ? inner : 'beneficiaries');
      } else if (tabId === 'household') {
        const inner = prev.get('benefitsTab');
        next.set('benefitsTab', CHAIRMAN_HOUSEHOLD_TABS.includes(inner) ? inner : 'domestic');
      }
      return next;
    });
  };

  if (!allowed) {
    return <Navigate to="/exec" replace />;
  }

  return (
    <MainPanel>
      <PageShell>
        <PageHeader
          eyebrow="Executive office"
          title="Chairman Office"
          subtitle={TAB_SUBTITLES[activeTab] || TAB_SUBTITLES.pulse}
          tabs={
            <PageTabs
              tabs={TABS}
              value={activeTab}
              onChange={setTab}
              ariaLabel="Chairman Office sections"
              panelId="chairman-office"
            />
          }
        />

        {err ? (
          <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{err}</p>
        ) : null}

        {busy && !office ? (
          <InlineLoader message="Loading Chairman Office…" />
        ) : (
          <>
            <ChairmanImpactStrip
              impact={office?.impact}
              periodKey={office?.periodKey}
              onSelectTab={setTab}
            />
            <div id="chairman-office" role="tabpanel">
              {activeTab === 'pulse' ? <ChairmanPulseTab /> : null}
              {activeTab === 'scholarships' ? (
                <Suspense fallback={<InlineLoader message="Loading scholarships…" />}>
                  <div className="space-y-10">
                    <DeskSection
                      eyebrow="At a glance"
                      title="Chairman's family"
                      subtitle="Who is registered and whether a fee or allowance needs attention."
                    >
                      <FamilyDashboard
                        defaultExecutiveFilter="Chairman"
                        lockFilter
                        reloadToken={deskEpoch}
                        officeManagePath="/chairman?tab=scholarships"
                      />
                    </DeskSection>
                    <DeskSection
                      eyebrow="Register & pay"
                      title="Scholarships desk"
                      subtitle="Add children, request school fees and allowances, export the bank file, then mark paid. Paid amounts update the strip above."
                    >
                      <BenefitsHub
                        embedded
                        preserveParentTab
                        hideDashboard
                        linkedExecutiveLock="Chairman"
                        defaultTab="beneficiaries"
                        visibleTabIds={CHAIRMAN_SCHOLARSHIP_TABS}
                        paymentFilters={{ excludeSourceKind: 'domestic_staff' }}
                        onRecordsChanged={onRecordsChanged}
                      />
                    </DeskSection>
                  </div>
                </Suspense>
              ) : null}
              {activeTab === 'household' ? (
                <Suspense fallback={<InlineLoader message="Loading household staff…" />}>
                  <div className="space-y-10">
                    <DeskSection
                      eyebrow="At a glance"
                      title="Household staff"
                      subtitle="People employed for the Chairman's household and whether this month's salary is moving."
                    >
                      <DomesticDashboard
                        defaultExecutiveFilter="Chairman"
                        lockFilter
                        reloadToken={deskEpoch}
                        officeManagePath="/chairman?tab=household"
                      />
                    </DeskSection>
                    <DeskSection
                      eyebrow="Register & pay"
                      title="Household desk"
                      subtitle="Register staff, keep salary and bank details current, then approve or mark salary paid. ERP login is optional."
                    >
                      <BenefitsHub
                        embedded
                        preserveParentTab
                        hideDashboard
                        linkedExecutiveLock="Chairman"
                        defaultTab="domestic"
                        visibleTabIds={CHAIRMAN_HOUSEHOLD_TABS}
                        paymentFilters={{ sourceKind: 'domestic_staff' }}
                        onRecordsChanged={onRecordsChanged}
                      />
                    </DeskSection>
                  </div>
                </Suspense>
              ) : null}
              {activeTab === 'withdrawals' ? (
                <ChairmanWithdrawalsPanel
                  office={office}
                  onChanged={setOffice}
                  defaultPayeeName={displayName || 'Chairman'}
                />
              ) : null}
              {activeTab === 'loans' ? (
                <ChairmanLoansPanel
                  office={office}
                  onChanged={setOffice}
                  defaultPayeeName={displayName || 'Chairman'}
                />
              ) : null}
            </div>
          </>
        )}
      </PageShell>
    </MainPanel>
  );
}
