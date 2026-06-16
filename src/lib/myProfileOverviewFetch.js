/**
 * Which dashboard API calls My Profile overview should make per cohort.
 * @param {string} cohort
 * @returns {{ leaveBalances: boolean; payslips: boolean; requests: boolean }}
 */
export function myProfileOverviewFetchPlan(cohort) {
  if (cohort === 'scholarship') {
    return { leaveBalances: false, payslips: false, requests: false };
  }
  if (cohort === 'domestic') {
    return { leaveBalances: false, payslips: false, requests: false };
  }
  return {
    leaveBalances: cohort === 'employee' || cohort === 'special',
    payslips: true,
    requests: true,
  };
}
