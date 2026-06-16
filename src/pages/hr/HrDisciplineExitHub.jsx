import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { canManageHrDiscipline } from '../../lib/hrAccess';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrSeparationsPanel } from '../../components/hr/HrSeparationsPanel';
import { HrExitClearancePanel } from '../../components/hr/HrExitClearancePanel';
import HrDiscipline from './HrDiscipline';
import HrTransfers from './HrTransfers';
import TeamHrIncidents from './TeamHrIncidents';
import HrDisciplineCasesPanel from '../../components/hr/HrDisciplineCasesPanel';
import HrGatePassLogPanel from '../../components/hr/HrGatePassLogPanel';
import HrPerformanceRecognitionPanel from '../../components/hr/HrPerformanceRecognitionPanel';
import HrIncidentRegistryPanel from '../../components/hr/HrIncidentRegistryPanel';
import HrAccountabilityOverview from '../../components/hr/HrAccountabilityOverview';
import HrAccountabilityMemoQueue from '../../components/hr/HrAccountabilityMemoQueue';
import { HrGrievanceForm, HrGrievanceQueue } from '../../components/hr/HrGrievancePanels';

/** Two top-level areas — cases/incidents/grievances vs exit movement. */
const TABS = [
  { id: 'accountability', label: 'Cases & incidents' },
  { id: 'exit', label: 'Exit & transfers' },
];

const CASE_VIEWS = [
  { id: 'cases', label: 'Cases' },
  { id: 'memos', label: 'Memos' },
  { id: 'grievances', label: 'Grievances' },
  { id: 'registry', label: 'Registry' },
  { id: 'performance', label: 'Performance' },
  { id: 'gate-pass', label: 'Gate pass' },
  { id: 'history', label: 'Old log' },
];

const EXIT_VIEWS = [
  { id: 'transfers', label: 'Transfers' },
  { id: 'separations', label: 'Separations' },
  { id: 'clearance', label: 'Exit clearance' },
];

const LEGACY_TAB_ALIASES = {
  cases: 'accountability',
  incidents: 'accountability',
  discipline: 'accountability',
  grievances: 'accountability',
  transfers: 'exit',
  separations: 'exit',
  'exit-clearance': 'exit',
};

const LEGACY_VIEW_FROM_TAB = {
  incidents: 'memos',
  discipline: 'history',
  grievances: 'grievances',
  transfers: 'transfers',
  separations: 'separations',
  'exit-clearance': 'clearance',
};

function SubViewPills({ views, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-2">
      {views.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onChange(v.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
            active === v.id ? 'bg-teal-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

export default function HrDisciplineExitHub() {
  const ws = useWorkspace();
  const canManage = canManageHrDiscipline(ws?.permissions || []);
  const allTabIds = useMemo(() => [...Object.keys(LEGACY_TAB_ALIASES), ...TABS.map((t) => t.id)], []);
  const { tab: rawTab, setTab } = useHrUrlTab('accountability', allTabIds);
  const [searchParams, setSearchParams] = useSearchParams();
  const resolvedTab = LEGACY_TAB_ALIASES[rawTab] || rawTab;
  const [caseView, setCaseView] = useState('cases');
  const [exitView, setExitView] = useState('transfers');
  const memoId = searchParams.get('memoId') || '';
  const registryId = searchParams.get('registryId') || '';
  const viewParam = searchParams.get('view') || '';

  const clearSearchParam = useCallback(
    (key) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete(key);
        return next;
      });
    },
    [setSearchParams]
  );

  useEffect(() => {
    const legacyView = LEGACY_VIEW_FROM_TAB[rawTab];
    if (legacyView && resolvedTab !== rawTab) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', resolvedTab);
        next.set('view', legacyView);
        return next;
      });
      return;
    }
    if (resolvedTab === 'accountability') {
      if (registryId) {
        setCaseView('registry');
        return;
      }
      if (viewParam && CASE_VIEWS.some((v) => v.id === viewParam)) {
        setCaseView(viewParam);
        return;
      }
      if (memoId && canManage) {
        setCaseView('memos');
      }
    }
    if (resolvedTab === 'exit' && viewParam && EXIT_VIEWS.some((v) => v.id === viewParam)) {
      setExitView(viewParam);
    }
  }, [rawTab, resolvedTab, viewParam, registryId, memoId, canManage, setSearchParams]);

  const setCaseViewAndUrl = (viewId) => {
    setCaseView(viewId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'accountability');
      if (viewId === 'cases') next.delete('view');
      else next.set('view', viewId);
      return next;
    });
  };

  const openDisciplineCase = (caseId) => {
    if (!caseId) return;
    setCaseView('cases');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'accountability');
      next.delete('view');
      next.set('caseId', caseId);
      return next;
    });
  };

  const openClearance = (id) => {
    if (id) sessionStorage.setItem('hrExitClearanceOpenId', id);
    setExitView('clearance');
    setTab('exit', { view: 'clearance' });
  };

  return (
    <HrTabbedPage
      title="Staff cases & exit"
      description="Incidents, discipline, grievances, transfers, and leavers — two tabs for a small team."
      tabs={TABS}
      tab={resolvedTab}
      onTabChange={(next) => setTab(next)}
    >
      {resolvedTab === 'accountability' ? (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Team <strong>memos</strong>, formal <strong>cases</strong>, and employee <strong>grievances</strong> live here.
            Escalate memos into cases when needed; use the old log for pre-system history only.
          </p>
          <HrAccountabilityOverview
            canManage={canManage}
            onViewCases={() => setCaseViewAndUrl('cases')}
            onViewRegistry={() => setCaseViewAndUrl('registry')}
            onViewMemos={() => setCaseViewAndUrl('memos')}
          />
          {canManage && caseView === 'cases' && !memoId ? (
            <HrAccountabilityMemoQueue
              canManage={canManage}
              focusMemoId={memoId}
              onFocusHandled={() => clearSearchParam('memoId')}
              onViewAll={() => setCaseViewAndUrl('memos')}
              onEscalated={(data) => {
                clearSearchParam('memoId');
                if (data?.caseId) openDisciplineCase(data.caseId);
              }}
            />
          ) : null}
          <SubViewPills views={CASE_VIEWS} active={caseView} onChange={setCaseViewAndUrl} />
          {caseView === 'cases' ? <HrDisciplineCasesPanel /> : null}
          {caseView === 'memos' ? (
            <TeamHrIncidents focusMemoId={memoId} onFocusHandled={() => clearSearchParam('memoId')} />
          ) : null}
          {caseView === 'registry' ? (
            <HrIncidentRegistryPanel
              onOpenCase={openDisciplineCase}
              focusRegistryId={registryId}
              onFocusHandled={() => clearSearchParam('registryId')}
            />
          ) : null}
          {caseView === 'performance' ? <HrPerformanceRecognitionPanel /> : null}
          {caseView === 'gate-pass' ? <HrGatePassLogPanel canManage={canManage} /> : null}
          {caseView === 'history' ? <HrDiscipline embedded /> : null}
          {caseView === 'grievances' ? (
            <div className="space-y-6">
              <p className="text-sm text-slate-600">
                Complaints and mediation — not the same as a formal discipline case, but handled on this screen.
              </p>
              <HrGrievanceQueue />
              <HrGrievanceForm />
            </div>
          ) : null}
        </div>
      ) : null}

      {resolvedTab === 'exit' ? (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Staff movement and leaving: recommend or approve transfers, record separations, then run exit clearance.
          </p>
          <SubViewPills
            views={EXIT_VIEWS}
            active={exitView}
            onChange={(viewId) => {
              setExitView(viewId);
              setTab('exit', { view: viewId });
            }}
          />
          {exitView === 'transfers' ? <HrTransfers embedded /> : null}
          {exitView === 'separations' ? <HrSeparationsPanel onOpenClearance={openClearance} /> : null}
          {exitView === 'clearance' ? <HrExitClearancePanel /> : null}
        </div>
      ) : null}
    </HrTabbedPage>
  );
}
