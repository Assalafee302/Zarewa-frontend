/**
 * Which dashboard API calls My Profile overview should make per cohort.
 * @param {string} cohort
 * @returns {{ leaveBalances: boolean; payslips: boolean; requests: boolean; attendance?: boolean; loanSchedule?: boolean }}
 */
export function myProfileOverviewFetchPlan(cohort) {
  if (cohort === 'scholarship') {
    return { leaveBalances: false, payslips: false, requests: false };
  }
  if (cohort === 'domestic') {
    return { leaveBalances: false, payslips: false, requests: false };
  }
  const employee = cohort === 'employee' || cohort === 'special';
  return {
    leaveBalances: employee,
    payslips: true,
    requests: true,
    attendance: employee,
    loanSchedule: employee,
  };
}
