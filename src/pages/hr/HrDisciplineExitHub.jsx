import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { canManageHrDiscipline, canApproveHrLetters } from '../../lib/hrAccess';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrSeparationsPanel } from '../../components/hr/HrSeparationsPanel';
import { HrExitClearancePanel } from '../../components/hr/HrExitClearancePanel';
import HrDiscipline from './HrDiscipline';
import HrTransfers from './HrTransfers';
import TeamHrIncidents from './TeamHrIncidents';
import HrDisciplineCasesPanel from '../../components/hr/HrDisciplineCasesPanel';
import HrIncidentRegistryPanel from '../../components/hr/HrIncidentRegistryPanel';
import HrAccountabilityOverview from '../../components/hr/HrAccountabilityOverview';
import HrAccountabilityMemoQueue from '../../components/hr/HrAccountabilityMemoQueue';
import HrDisciplinePlaybookPanel from '../../components/hr/HrDisciplinePlaybookPanel';
import HrLetterApprovalBanner from '../../components/hr/HrLetterApprovalBanner';
import { HrGrievanceForm, HrGrievanceQueue } from '../../components/hr/HrGrievancePanels';

const TABS = [
  { id: 'accountability', label: 'Cases & incidents' },
  { id: 'exit', label: 'Exit & transfers' },
];

/** Primary views only — secondary tools linked below. */
const CASE_VIEWS = [
  { id: 'cases', label: 'Cases' },
  { id: 'registry', label: 'Registry' },
  { id: 'memos', label: 'Memos' },
  { id: 'grievances', label: 'Grievances' },
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
  discipline: 'cases',
  grievances: 'grievances',
  transfers: 'transfers',
  separations: 'separations',
  'exit-clearance': 'clearance',
  playbook: 'cases',
  performance: 'cases',
  'gate-pass': 'cases',
  history: 'cases',
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
  const canApproveLetters = canApproveHrLetters(ws?.permissions || []);
  const allTabIds = useMemo(() => [...Object.keys(LEGACY_TAB_ALIASES), ...TABS.map((t) => t.id)], []);
  const { tab: rawTab, setTab } = useHrUrlTab('accountability', allTabIds);
  const [searchParams, setSearchParams] = useSearchParams();
  const resolvedTab = LEGACY_TAB_ALIASES[rawTab] || rawTab;
  const [caseView, setCaseView] = useState('cases');
  const [exitView, setExitView] = useState('transfers');
  const [showPlaybook, setShowPlaybook] = useState(false);
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
      if (viewParam && (CASE_VIEWS.some((v) => v.id === viewParam) || LEGACY_VIEW_FROM_TAB[viewParam])) {
        setCaseView(LEGACY_VIEW_FROM_TAB[viewParam] || viewParam);
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
    setShowPlaybook(false);
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
      description="Formal discipline cases use a simple 4-step flow: Intake → Investigate → Sanction → Close."
      tabs={TABS}
      tab={resolvedTab}
      onTabChange={(next) => setTab(next)}
    >
      {resolvedTab === 'accountability' ? (
        <div className="space-y-5">
          <HrLetterApprovalBanner canApprove={canApproveLetters} />
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
          {caseView === 'grievances' ? (
            <div className="space-y-6">
              <p className="text-sm text-slate-600">Employee complaints — separate from formal discipline cases.</p>
              <HrGrievanceQueue />
              <HrGrievanceForm />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <button
              type="button"
              className="font-semibold text-teal-800 hover:underline"
              onClick={() => setShowPlaybook((v) => !v)}
            >
              {showPlaybook ? 'Hide discipline guide' : 'Discipline guide'}
            </button>
            <Link to="/hr/discipline-exit?tab=accountability&view=history" className="font-semibold text-teal-800 hover:underline">
              Old discipline log
            </Link>
          </div>
          {showPlaybook ? <HrDisciplinePlaybookPanel /> : null}
          {viewParam === 'history' ? <HrDiscipline embedded /> : null}
        </div>
      ) : null}

      {resolvedTab === 'exit' ? (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Staff movement and leaving: transfers, separations, then exit clearance.
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
