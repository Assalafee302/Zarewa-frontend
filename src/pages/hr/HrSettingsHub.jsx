import React from 'react';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrSalaryMatrixPanel } from '../../components/hr/HrSalaryMatrixPanel';
import {
  HrModuleHealthSection,
  HrPolicyConfigSection,
  HrPublicHolidaysSection,
} from '../../components/hr/HrSettingsSections';
import { HrBranchMappingPanel, HrDepartmentsPanel, HrDesignationsPanel } from '../../components/hr/HrMasterDataPanels';
import { HrOperationalReadinessPanel } from '../../components/hr/HrOperationalReadinessPanel';

import { HrLetterReferencePanel } from '../../components/hr/HrLetterReferencePanel';
import { HrStaffNumberingPanel } from '../../components/hr/HrStaffNumberingPanel';

const TABS = [
  { id: 'policy-config', label: 'Policy Config' },
  { id: 'letter-references', label: 'Letter References' },
  { id: 'staff-numbering', label: 'Staff Numbering' },
  { id: 'salary-matrix', label: 'Salary Matrix' },
  { id: 'holidays', label: 'Public Holidays' },
  { id: 'departments', label: 'Departments' },
  { id: 'designations', label: 'Designations' },
  { id: 'job-descriptions', label: 'Job Descriptions' },
  { id: 'branches', label: 'Branch Mapping' },
  { id: 'readiness', label: 'Data Quality' },
  { id: 'module-health', label: 'Module Health' },
];

export default function HrSettingsHub() {
  const { tab, setTab } = useHrUrlTab('policy-config', TABS.map((t) => t.id));

  return (
    <HrTabbedPage
      title="HR Settings"
      description="Master data, salary matrix, holidays, and module health for production HR operations."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
    >
      {tab === 'policy-config' ? <HrPolicyConfigSection /> : null}
      {tab === 'letter-references' ? <HrLetterReferencePanel /> : null}
      {tab === 'staff-numbering' ? <HrStaffNumberingPanel /> : null}
      {tab === 'salary-matrix' ? <HrSalaryMatrixPanel /> : null}
      {tab === 'holidays' ? <HrPublicHolidaysSection embedded /> : null}
      {tab === 'departments' ? <HrDepartmentsPanel /> : null}
      {tab === 'designations' || tab === 'job-descriptions' ? <HrDesignationsPanel /> : null}
      {tab === 'branches' ? <HrBranchMappingPanel /> : null}
      {tab === 'readiness' ? <HrOperationalReadinessPanel /> : null}
      {tab === 'module-health' ? <HrModuleHealthSection /> : null}
    </HrTabbedPage>
  );
}
