import React from 'react';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrSeparationsPanel } from '../../components/hr/HrSeparationsPanel';
import { HrExitClearancePanel } from '../../components/hr/HrExitClearancePanel';
import HrDiscipline from './HrDiscipline';
import HrTransfers from './HrTransfers';
import TeamHrIncidents from './TeamHrIncidents';
import HrDisciplineCasesPanel from '../../components/hr/HrDisciplineCasesPanel';

import { HrGrievanceForm, HrGrievanceQueue } from '../../components/hr/HrGrievancePanels';

const TABS = [
  { id: 'cases', label: 'Case management' },
  { id: 'discipline', label: 'Discipline log' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'grievances', label: 'Grievances' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'separations', label: 'Separations' },
  { id: 'exit-clearance', label: 'Exit clearance' },
];

export default function HrDisciplineExitHub() {
  const { tab, setTab } = useHrUrlTab('cases', TABS.map((t) => t.id));

  const openClearance = (id) => {
    if (id) sessionStorage.setItem('hrExitClearanceOpenId', id);
    setTab('exit-clearance');
  };

  return (
    <HrTabbedPage
      title="Discipline & Exit"
      description="Case management, disciplinary events, incidents, transfers, separations, and exit clearance."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
    >
      {tab === 'cases' ? <HrDisciplineCasesPanel /> : null}
      {tab === 'discipline' ? <HrDiscipline embedded /> : null}
      {tab === 'incidents' ? <TeamHrIncidents /> : null}
      {tab === 'grievances' ? (
        <div className="space-y-6">
          <HrGrievanceQueue />
          <HrGrievanceForm />
        </div>
      ) : null}
      {tab === 'transfers' ? <HrTransfers embedded /> : null}
      {tab === 'separations' ? <HrSeparationsPanel onOpenClearance={openClearance} /> : null}
      {tab === 'exit-clearance' ? <HrExitClearancePanel /> : null}
    </HrTabbedPage>
  );
}
