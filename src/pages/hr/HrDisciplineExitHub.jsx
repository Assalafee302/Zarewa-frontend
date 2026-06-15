import React, { useMemo, useState } from 'react';
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

import { HrGrievanceForm, HrGrievanceQueue } from '../../components/hr/HrGrievancePanels';

const TABS = [
  { id: 'accountability', label: 'Accountability' },
  { id: 'discipline', label: 'Discipline log' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'grievances', label: 'Grievances' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'separations', label: 'Separations' },
  { id: 'exit-clearance', label: 'Exit clearance' },
];

const ACCOUNTABILITY_VIEWS = [
  { id: 'cases', label: 'Cases' },
  { id: 'gate-pass', label: 'Gate pass' },
];

export default function HrDisciplineExitHub() {
  const ws = useWorkspace();
  const canManage = canManageHrDiscipline(ws?.permissions || []);
  const legacyTabIds = useMemo(() => ['cases', ...TABS.map((t) => t.id)], []);
  const { tab, setTab } = useHrUrlTab('accountability', legacyTabIds);
  const resolvedTab = tab === 'cases' ? 'accountability' : tab;
  const [accountabilityView, setAccountabilityView] = useState('cases');

  const openClearance = (id) => {
    if (id) sessionStorage.setItem('hrExitClearanceOpenId', id);
    setTab('exit-clearance');
  };

  return (
    <HrTabbedPage
      title="Discipline & Exit"
      description="Accountability cases, disciplinary events, incidents, transfers, separations, and exit clearance."
      tabs={TABS}
      tab={resolvedTab}
      onTabChange={setTab}
    >
      {resolvedTab === 'accountability' ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-2">
            {ACCOUNTABILITY_VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setAccountabilityView(v.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                  accountabilityView === v.id
                    ? 'bg-teal-800 text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {accountabilityView === 'cases' ? <HrDisciplineCasesPanel /> : null}
          {accountabilityView === 'gate-pass' ? <HrGatePassLogPanel canManage={canManage} /> : null}
        </div>
      ) : null}
      {resolvedTab === 'discipline' ? <HrDiscipline embedded /> : null}
      {resolvedTab === 'incidents' ? <TeamHrIncidents /> : null}
      {resolvedTab === 'grievances' ? (
        <div className="space-y-6">
          <HrGrievanceQueue />
          <HrGrievanceForm />
        </div>
      ) : null}
      {resolvedTab === 'transfers' ? <HrTransfers embedded /> : null}
      {resolvedTab === 'separations' ? <HrSeparationsPanel onOpenClearance={openClearance} /> : null}
      {resolvedTab === 'exit-clearance' ? <HrExitClearancePanel /> : null}
    </HrTabbedPage>
  );
}
