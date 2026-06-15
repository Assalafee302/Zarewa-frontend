import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrLeavePolicySection } from '../../components/hr/HrLeavePolicySection';
import {
  HrLegacyPayBackfillSection,
  HrOrgCatalogSection,
  HrOrgGoLiveChecklistSection,
  HrStaffImportGuideSection,
} from '../../components/hr/HrSettingsSections';
import { HrBranchMappingPanel, HrDepartmentsPanel, HrDesignationsPanel } from '../../components/hr/HrMasterDataPanels';
import { HrLetterReferencePanel } from '../../components/hr/HrLetterReferencePanel';
import { HrStaffNumberingPanel } from '../../components/hr/HrStaffNumberingPanel';
import {
  HrOrgStructureSummary,
  HrReferencesSummary,
  HrSettingsModuleLinks,
  HrSettingsScopePanel,
  HrSettingsTabIntro,
} from '../../components/hr/hrSettingsUi';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  canEditLeavePolicy,
  canManageHrSettings,
  canViewHrOrgStructure,
  canViewHrSettings,
} from '../../lib/hrAccess';
import { HR_LEAVE, HR_PAYROLL, HR_SETTINGS, hrTabPath } from '../../lib/hrRoutes';
import { HR_SETTINGS_PAGE, HR_SETTINGS_TABS } from '../../lib/hrSettingsUi';

/** Retired settings tabs — send users to the module that owns the workflow. */
const EXTERNAL_TAB_REDIRECTS = {
  holidays: hrTabPath(HR_LEAVE, 'holidays'),
  compensation: hrTabPath(HR_PAYROLL, 'salary-matrix'),
  'salary-matrix': hrTabPath(HR_PAYROLL, 'salary-matrix'),
  quality: '/hr/dashboard',
  readiness: '/hr/dashboard',
  'module-health': '/hr/dashboard',
  'leave-policy': hrTabPath(HR_SETTINGS, 'policies'),
};

const TAB_ALIASES = {
  'policy-config': 'policies',
  organization: 'organization',
  departments: 'organization',
  designations: 'organization',
  'job-descriptions': 'organization',
  branches: 'organization',
  'letter-references': 'documents',
  'staff-numbering': 'documents',
  documents: 'documents',
  policies: 'policies',
};

function resolveSettingsTab(raw, validTabIds) {
  if (validTabIds.includes(raw)) return raw;
  if (TAB_ALIASES[raw] && validTabIds.includes(TAB_ALIASES[raw])) return TAB_ALIASES[raw];
  return validTabIds[0] || 'policies';
}

export default function HrSettingsHub() {
  const ws = useWorkspace();
  const permissions = ws?.permissions || [];
  const canManage = canManageHrSettings(permissions);
  const canEditPolicy = canEditLeavePolicy(permissions);
  const canViewOrg = canViewHrOrgStructure(permissions);
  const canView = canViewHrSettings(permissions);
  const [orgRefreshKey, setOrgRefreshKey] = useState(0);

  const tabs = useMemo(() => {
    if (canManage) return HR_SETTINGS_TABS;
    const visible = [];
    if (canEditPolicy) visible.push(HR_SETTINGS_TABS.find((t) => t.id === 'policies'));
    if (canViewOrg) visible.push(HR_SETTINGS_TABS.find((t) => t.id === 'organization'));
    return visible.filter(Boolean);
  }, [canManage, canEditPolicy, canViewOrg]);
  const validTabIds = tabs.map((t) => t.id);
  const defaultTab = canManage || (canViewOrg && !canEditPolicy) ? 'organization' : 'policies';
  const acceptedUrlTabs = [...validTabIds, ...Object.keys(TAB_ALIASES), ...Object.keys(EXTERNAL_TAB_REDIRECTS)];

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || defaultTab;
  const safeRaw = acceptedUrlTabs.includes(rawTab) ? rawTab : defaultTab;

  const externalRedirect = EXTERNAL_TAB_REDIRECTS[safeRaw];
  const tab = resolveSettingsTab(safeRaw, validTabIds);

  useEffect(() => {
    if (externalRedirect || safeRaw === tab) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true }
    );
  }, [externalRedirect, safeRaw, tab, setSearchParams]);

  const setTab = (nextTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', nextTab);
      return next;
    });
  };

  if (externalRedirect) {
    if (externalRedirect.startsWith('?')) {
      return <Navigate to={`/hr/settings${externalRedirect}`} replace />;
    }
    return <Navigate to={externalRedirect} replace />;
  }

  if (!canView) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        You do not have access to HR administration.
      </div>
    );
  }

  const bumpOrgSummary = () => setOrgRefreshKey((k) => k + 1);

  return (
    <HrTabbedPage
      title={HR_SETTINGS_PAGE.title}
      description={canManage ? HR_SETTINGS_PAGE.description : HR_SETTINGS_PAGE.policyOnlyDescription}
      tabs={tabs.length > 1 ? tabs : undefined}
      tab={tab}
      onTabChange={setTab}
    >
      {tab === 'organization' && canViewOrg ? (
        <div className="space-y-6">
          <HrSettingsTabIntro tabId="organization" />
          <HrOrgStructureSummary refreshKey={orgRefreshKey} />
          <HrDepartmentsPanel refreshKey={orgRefreshKey} />
          <HrDesignationsPanel refreshKey={orgRefreshKey} />
          <HrBranchMappingPanel />
          {canManage ? <HrOrgCatalogSection onCatalogUpdated={bumpOrgSummary} /> : null}
          {canManage ? (
            <details className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700 sm:px-5">
                Setup & migration tools
              </summary>
              <div className="space-y-6 border-t border-slate-50 px-4 pb-4 pt-4 sm:px-5">
                <HrOrgGoLiveChecklistSection embedded />
                <HrStaffImportGuideSection embedded />
                <HrLegacyPayBackfillSection embedded />
              </div>
            </details>
          ) : null}
          {canManage ? <HrSettingsModuleLinks /> : null}
        </div>
      ) : null}

      {tab === 'policies' && canEditPolicy ? (
        <div className="space-y-6">
          <HrSettingsTabIntro tabId="policies" />
          <HrLeavePolicySection />
          {canManage ? <HrSettingsScopePanel /> : null}
          {canManage ? <HrSettingsModuleLinks /> : null}
        </div>
      ) : null}

      {tab === 'documents' && canManage ? (
        <div className="space-y-6">
          <HrSettingsTabIntro tabId="documents" />
          <HrReferencesSummary />
          <HrLetterReferencePanel />
          <HrStaffNumberingPanel />
          <HrSettingsModuleLinks />
        </div>
      ) : null}
    </HrTabbedPage>
  );
}
