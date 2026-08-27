import React, { useEffect, useMemo } from 'react';
import { Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Database,
  Scale,
  BookOpen,
  Building2,
  LayoutGrid,
  SlidersHorizontal,
} from 'lucide-react';
import { PageHeader, PageShell, MainPanel, PageTabs } from '../../components/layout';
import SettingsOverviewPanel from '../../components/settings/SettingsOverviewPanel';
import OrganizationSettingsPanel from '../../components/settings/OrganizationSettingsPanel';
import CatalogSettingsPanel from '../../components/settings/CatalogSettingsPanel';
import GovernanceSettingsPanel from '../../components/settings/GovernanceSettingsPanel';
import HelpSettingsPanel from '../../components/settings/HelpSettingsPanel';
import SystemSettingsPanel from '../../components/settings/SystemSettingsPanel';
import LoginSecurityPanel from '../../components/settings/LoginSecurityPanel';
import CustomPermissionOverridesPanel from '../../components/settings/CustomPermissionOverridesPanel';
import TeamAccessPanel from '../../components/settings/TeamAccessPanel';
import { useWorkspace } from '../../context/WorkspaceContext';

function useSettingsSection() {
  const { pathname } = useLocation();
  const m = pathname.match(/^\/settings\/([^/]+)\/?$/);
  return m?.[1] ?? 'overview';
}

const Settings = () => {
  const navigate = useNavigate();
  const ws = useWorkspace();
  const activeSection = useSettingsSection();

  const currentUser = ws?.session?.user;
  const permissions = ws?.permissions ?? [];
  const appUsers = ws?.snapshot?.appUsers ?? [];

  const showTeamTab = Boolean(ws?.hasPermission?.('settings.view'));
  const showOrganization = Boolean(ws?.hasPermission?.('settings.view'));
  const showSystemTab = showTeamTab;
  const showIntegrationApi = showTeamTab;
  const showAdminDataReset = String(currentUser?.roleKey || '').toLowerCase() === 'admin';
  const showZareIntelligence =
    permissions.includes('*') ||
    permissions.includes('settings.manage') ||
    permissions.includes('audit.view');

  const settingsTabs = useMemo(() => {
    const tabs = [{ id: 'overview', label: 'Overview', icon: <LayoutGrid size={14} /> }];
    if (showTeamTab) {
      tabs.push({ id: 'team', label: 'Team', icon: <Users size={14} /> });
    }
    if (showOrganization) {
      tabs.push({ id: 'organization', label: 'Organization', icon: <Building2 size={14} /> });
    }
    tabs.push(
      { id: 'catalog', label: 'Catalog', icon: <Database size={14} /> },
      { id: 'governance', label: 'Governance', icon: <Scale size={14} /> },
      { id: 'help', label: 'Help', icon: <BookOpen size={14} /> }
    );
    if (showSystemTab) {
      tabs.push({ id: 'system', label: 'System', icon: <SlidersHorizontal size={14} /> });
    }
    return tabs;
  }, [showTeamTab, showOrganization, showSystemTab]);

  const allowedSections = useMemo(() => new Set(settingsTabs.map((t) => t.id)), [settingsTabs]);

  useEffect(() => {
    if (!allowedSections.has(activeSection)) {
      // Legacy personal / renamed sections are handled by explicit Redirect routes.
      const legacy = new Set([
        'profile',
        'security',
        'preferences',
        'data',
        'admin-reset',
        'guide',
        'zare-intelligence',
        'knowledge-center',
        'design-system',
      ]);
      if (!legacy.has(activeSection)) {
        navigate('/settings/overview', { replace: true });
      }
    }
  }, [activeSection, allowedSections, navigate]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        tabs={
          <PageTabs
            tabs={settingsTabs}
            value={allowedSections.has(activeSection) ? activeSection : 'overview'}
            onChange={(id) => navigate(`/settings/${id}`)}
          />
        }
      />

      <MainPanel className="max-w-5xl min-w-0">
        <div className="relative z-[1] min-w-0">
          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route
              path="overview"
              element={
                <SettingsOverviewPanel
                  showTeamTab={showTeamTab}
                  showOrganization={showOrganization}
                  showHelpIntelligence={showZareIntelligence}
                  showSystemTab={showSystemTab}
                  showAdminDataReset={showAdminDataReset}
                />
              }
            />
            <Route
              path="team"
              element={
                showTeamTab ? (
                  <div className="space-y-8">
                    <LoginSecurityPanel />
                    <CustomPermissionOverridesPanel />
                    <TeamAccessPanel
                      appUsers={appUsers}
                      currentUserId={currentUser?.id}
                      onRefresh={ws?.refresh}
                    />
                  </div>
                ) : (
                  <Navigate to="/settings/overview" replace />
                )
              }
            />
            <Route
              path="organization"
              element={
                showOrganization ? (
                  <OrganizationSettingsPanel />
                ) : (
                  <Navigate to="/settings/overview" replace />
                )
              }
            />
            <Route path="catalog" element={<CatalogSettingsPanel />} />
            <Route path="governance" element={<GovernanceSettingsPanel />} />
            <Route
              path="help"
              element={<HelpSettingsPanel showIntelligence={showZareIntelligence} />}
            />
            <Route
              path="system"
              element={
                showSystemTab ? (
                  <SystemSettingsPanel showIntegrationApi={showIntegrationApi} />
                ) : (
                  <Navigate to="/settings/overview" replace />
                )
              }
            />

            <Route path="profile" element={<Navigate to="/me/account" replace />} />
            <Route
              path="security"
              element={<Navigate to={{ pathname: '/me/account', hash: 'security' }} replace />}
            />
            <Route path="preferences" element={<Navigate to="/settings/organization" replace />} />
            <Route path="data" element={<Navigate to="/settings/catalog" replace />} />
            <Route
              path="admin-reset"
              element={<Navigate to={{ pathname: '/settings/governance', hash: 'admin-reset' }} replace />}
            />
            <Route path="guide" element={<Navigate to="/settings/help?section=guide" replace />} />
            <Route
              path="zare-intelligence"
              element={<Navigate to="/settings/help?section=intelligence" replace />}
            />
            <Route
              path="knowledge-center"
              element={<Navigate to="/settings/help?section=knowledge" replace />}
            />
            <Route
              path="design-system"
              element={<Navigate to="/settings/system?section=design" replace />}
            />

            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </div>
      </MainPanel>
    </PageShell>
  );
};

export default Settings;
