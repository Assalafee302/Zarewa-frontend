/** Preselect an HR report in the reports hub (sessionStorage + optional URL ?report=). */
export function preselectHrReport(reportId) {
  if (reportId) sessionStorage.setItem('hrReportPreselect', reportId);
}

/** Deep-link paths from report types to actionable HR screens. */
export const HR_REPORT_ACTION_LINKS = {
  'document-expiry': { path: '/hr/documents?tab=reports&report=document-expiry', label: 'Document expiry report' },
  'policy-acknowledgement': { path: '/hr/documents?tab=reports&report=policy-acknowledgement', label: 'Policy acknowledgement' },
  'promotion-due': { path: '/hr/documents?tab=reports&report=promotion-due', label: 'Promotion due' },
  'staff-loan': { path: '/hr/documents?tab=reports&report=staff-loan', label: 'Staff loans' },
  'disciplinary-report': { path: '/hr/documents?tab=reports&report=disciplinary-report', label: 'Discipline' },
  'exit-clearance': { path: '/hr/documents?tab=reports&report=exit-clearance', label: 'Exit clearance' },
  'pending-transfers': { path: '/hr/discipline-exit?tab=transfers', label: 'Pending transfers' },
  'grievance-report': { path: '/hr/documents?tab=reports&report=grievance-report', label: 'Grievances' },
};
