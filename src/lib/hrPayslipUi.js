import { formatPeriodYyyymm } from './hrPayroll';

export const PAYSLIP_PIPELINE_STEPS = [
  { id: 'draft', label: 'Draft' },
  { id: 'locked', label: 'Locked' },
  { id: 'paid', label: 'Paid' },
  { id: 'available', label: 'Available' },
];

/** Map payroll run status to pipeline step index (0–3). */
export function payslipPipelineStepIndex(runStatus) {
  const key = String(runStatus || '').toLowerCase();
  if (key === 'paid') return 2;
  if (key === 'locked') return 1;
  if (key === 'draft') return 0;
  if (key === 'not_started') return -1;
  return -1;
}

/** Whether the employee can open/download the payslip for this run status. */
export function payslipIsAvailable(runStatus) {
  const key = String(runStatus || '').toLowerCase();
  return key === 'locked' || key === 'paid';
}

/**
 * Contextual empty-state copy when no payslips are on file yet.
 * @param {{ periodYyyymm?: string; runStatus?: string } | null | undefined} hint
 */
export function payslipEmptyStateMessage(hint) {
  if (!hint?.periodYyyymm) {
    return 'Payslips appear after HQ locks payroll and finance marks the run paid.';
  }
  const period = formatPeriodYyyymm(hint.periodYyyymm);
  const status = String(hint.runStatus || '').toLowerCase();
  if (status === 'not_started') {
    return `${period} payroll has not started yet. Your payslip will appear after HQ locks the run and finance marks it paid.`;
  }
  if (status === 'draft') {
    return `${period} payroll is being prepared. Your payslip will appear after HQ locks the run and finance marks it paid.`;
  }
  if (status === 'locked') {
    return `${period} payroll is locked — waiting for finance payment. Your payslip will be available once the run is marked paid.`;
  }
  if (status === 'paid') {
    return `${period} payroll is marked paid. Refresh this page if your payslip has not appeared yet.`;
  }
  return 'Payslips appear after HQ locks payroll and finance marks the run paid.';
}
