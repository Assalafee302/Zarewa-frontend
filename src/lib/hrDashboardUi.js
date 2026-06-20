import {
  canGmApproveHrRequests,
  canGmApprovePayroll,
  canManageHrStaff,
  canManageHrTransfers,
  canPreparePayroll,
  canReviewHrRequests,
  canViewHrReports,
} from './hrAccess.js';
import { HR_DISCIPLINE_EXIT, HR_DOCUMENTS, HR_EMPLOYEES, HR_PAYROLL, HR_TIME_ABSENCE, hrTabPath, hrTimeAbsenceQueuePath } from './hrRoutes.js';

/** @param {string} scope */
export function hrRequestQueuePath(scope) {
  return hrTimeAbsenceQueuePath(scope);
}

export function hrPayrollRunsPath() {
  return `${HR_PAYROLL}?tab=payroll-runs`;
}

/**
 * @param {string | undefined} roleKey
 * @param {string[] | undefined} permissions
 */
export function getHrDashboardIntro(roleKey, permissions = []) {
  const rk = String(roleKey || '').toLowerCase();
  const gmOnly = canGmApproveHrRequests(permissions) && !canReviewHrRequests(permissions);

  if (rk === 'gmhr' || gmOnly) {
    return {
      title: 'HR dashboard',
      description:
        'Final approvals for leave, loans, transfers, and payroll. HR Admin prepares cases and payroll runs; you GM-approve before lock and export.',
    };
  }
  if (canReviewHrRequests(permissions) || canPreparePayroll(permissions)) {
    return {
      title: 'HR dashboard',
      description:
        'Maintain staff records, prepare payroll, and move leave and loan requests through branch endorsement to GM HR final approval.',
    };
  }
  return {
    title: 'HR dashboard',
    description:
      'HQ payroll is prepared centrally. Branch salary contributions are tracked for MD review and do not block payroll payment.',
  };
}

/**
 * @param {object | null | undefined} counts
 * @param {object | null | undefined} summary
 * @param {string[] | undefined} permissions
 */
export function getHrDashboardQueueLines(counts, summary, permissions = []) {
  const c = counts || {};
  const s = summary || {};
  /** @type {{ label: string; count: number; href: string }[]} */
  const lines = [];

  if (canReviewHrRequests(permissions)) {
    lines.push({
      label: 'HR queue',
      count: Number(c.pendingHrReview ?? s.pendingHrReview ?? 0),
      href: hrRequestQueuePath('hr_queue'),
    });
    const overdue = Number(c.overdueRequests ?? s.overdueRequests ?? 0);
    if (overdue > 0) {
      lines.push({
        label: 'Overdue requests (SLA)',
        count: overdue,
        href: hrRequestQueuePath('hr_queue'),
      });
    }
  }
  if (canReviewHrRequests(permissions) || canGmApproveHrRequests(permissions)) {
    lines.push({
      label: 'Branch endorsements',
      count: Number(c.pendingBranchEndorse ?? s.pendingBranchEndorse ?? 0),
      href: hrRequestQueuePath('endorse_queue'),
    });
  }
  if (canGmApproveHrRequests(permissions)) {
    lines.push({
      label: 'GM HR final',
      count: Number(c.pendingGmHrReview ?? s.pendingGmHrReview ?? 0),
      href: hrRequestQueuePath('gm_queue'),
    });
  }
  if (canGmApprovePayroll(permissions)) {
    lines.push({
      label: 'Payroll awaiting GM sign-off',
      count: Number(c.draftPayrollAwaitingGm ?? 0),
      href: hrPayrollRunsPath(),
    });
  } else if (canPreparePayroll(permissions)) {
    lines.push({
      label: 'Draft payroll runs',
      count: Number(c.draftPayrollRuns ?? 0),
      href: HR_PAYROLL,
    });
  }
  if (canManageHrTransfers(permissions)) {
    const transferPending =
      Number(s.pendingTransferHrReview ?? 0) +
      Number(s.pendingTransferGmApproval ?? 0) +
      Number(s.pendingTransferComplete ?? 0);
    if (transferPending > 0) {
      lines.push({
        label: 'Transfer requests',
        count: transferPending,
        href: hrTabPath(HR_DISCIPLINE_EXIT, 'transfers'),
      });
    }
  }
  if (canManageHrStaff(permissions)) {
    const incomplete = Number(c.incompleteProfiles ?? 0);
    if (incomplete > 0) {
      lines.push({
        label: 'Incomplete profiles',
        count: incomplete,
        href: HR_EMPLOYEES,
      });
    }
  }
  return lines;
}

/** @param {string[] | undefined} permissions */
export function getHrDashboardQuickActions(permissions = []) {
  /** @type {{ label: string; href: string; primary?: boolean }[]} */
  const actions = [];

  if (canManageHrStaff(permissions)) {
    actions.push({
      label: 'Register employee',
      href: `${HR_EMPLOYEES}?tab=directory&register=1`,
      primary: true,
    });
  }
  if (canReviewHrRequests(permissions)) {
    actions.push({
      label: 'Time & absence',
      href: HR_TIME_ABSENCE,
    });
    actions.push({
      label: 'HR review queue',
      href: hrRequestQueuePath('hr_queue'),
    });
  }
  if (canGmApproveHrRequests(permissions)) {
    actions.push({
      label: 'GM final queue',
      href: hrRequestQueuePath('gm_queue'),
      primary: !canReviewHrRequests(permissions),
    });
  }
  if (canPreparePayroll(permissions)) {
    actions.push({ label: 'Start monthly payroll', href: HR_PAYROLL });
  } else if (canGmApprovePayroll(permissions)) {
    actions.push({ label: 'Review payroll runs', href: hrPayrollRunsPath() });
  }
  if (canViewHrReports(permissions)) {
    actions.push({ label: 'Open reports', href: hrTabPath(HR_DOCUMENTS, 'reports') });
  }
  return actions;
}

/**
 * @param {object | null | undefined} counts
 * @param {object | null | undefined} summary
 * @param {string[] | undefined} permissions
 */
export function getHrDashboardPendingKpi(counts, summary, permissions = []) {
  const c = counts || {};
  const s = summary || {};

  if (canGmApproveHrRequests(permissions) && !canReviewHrRequests(permissions)) {
    const value = Number(c.pendingGmHrReview ?? s.pendingGmHrReview ?? 0);
    return {
      label: 'Awaiting GM final',
      value,
      href: hrRequestQueuePath('gm_queue'),
      tone: value > 0 ? 'amber' : 'default',
    };
  }
  if (canReviewHrRequests(permissions)) {
    const value = Number(c.pendingHrReview ?? s.pendingHrReview ?? 0);
    return {
      label: 'Pending HR review',
      value,
      href: hrRequestQueuePath('hr_queue'),
      tone: value > 0 ? 'amber' : 'default',
    };
  }
  if (canGmApproveHrRequests(permissions)) {
    const value = Number(c.pendingGmHrReview ?? s.pendingGmHrReview ?? 0);
    return {
      label: 'Awaiting GM final',
      value,
      href: hrRequestQueuePath('gm_queue'),
      tone: value > 0 ? 'amber' : 'default',
    };
  }
  return {
    label: 'Pending requests',
    value: 0,
    href: hrTimeAbsenceQueuePath('hr_queue'),
    tone: 'default',
  };
}

/**
 * @param {boolean} canPrepare
 * @param {boolean} canGm
 */
export function getHrPayrollIntro(canPrepare, canGm) {
  if (canGm && !canPrepare) {
    return 'Review draft monthly payroll prepared by HR Admin, GM-approve, then lock for finance export.';
  }
  if (canPrepare) {
    return 'Prepare one monthly payroll run per calendar month, then route to GM HR for approval before lock and bank export.';
  }
  return 'Branch staff monthly payroll. PAYE is a fixed ₦ amount per staff (profile or adjust on draft lines).';
}

const INCIDENTS_PATH = '/hr/discipline-exit?tab=accountability&view=memos';

/** Count total actionable + calendar alert items for the attention banner. */
export function getHrDashboardAttentionCount(alerts = {}, actionKeys = [], calendarKeys = []) {
  if (!alerts || typeof alerts !== 'object') return 0;
  let total = 0;
  for (const key of actionKeys) total += (alerts[key] || []).length;
  for (const key of calendarKeys) total += (alerts[key] || []).length;
  return total;
}

/**
 * Top overview KPI row — four cards, prioritised by role.
 * @param {{
 *   counts?: object;
 *   summary?: object;
 *   staff?: object;
 *   alerts?: object;
 *   permissions?: string[];
 * }} data
 */
export function getHrDashboardOverviewKpis(data = {}) {
  const { counts, summary, staff, alerts, permissions = [] } = data;
  const c = counts || {};
  const s = summary || {};
  const incidents = Number(s.openIncidents ?? staff?.openIncidents ?? 0);
  const activeStaff = staff?.active ?? s.activeStaff ?? '—';
  const probationEnding = Number(staff?.onProbationEnding ?? alerts?.probationEnding?.length ?? 0);
  const documentsExpiring = Number(staff?.documentsExpiring ?? alerts?.documentsExpiring?.length ?? 0);
  const gmPayrollCount = Number(c.draftPayrollAwaitingGm ?? 0);
  const probationKpi = {
    label: 'Probation ending',
    value: probationEnding,
    hint: 'Within 30 days',
    href: HR_EMPLOYEES,
    tone: probationEnding > 0 ? 'amber' : 'default',
  };
  const documentsKpi = {
    label: 'Expiring documents',
    value: documentsExpiring,
    hint: 'Within 60 days',
    href: hrTabPath(HR_DOCUMENTS, 'reports'),
    tone: documentsExpiring > 0 ? 'red' : 'default',
  };
  const incidentsKpi = {
    label: 'Open incidents',
    value: incidents,
    href: INCIDENTS_PATH,
    tone: incidents > 0 ? 'amber' : 'default',
  };

  if (canGmApprovePayroll(permissions) && !canReviewHrRequests(permissions)) {
    const gmRequests = Number(c.pendingGmHrReview ?? s.pendingGmHrReview ?? 0);
    return [
      { label: 'Active staff', value: activeStaff, href: HR_EMPLOYEES, tone: 'teal' },
      {
        label: 'Awaiting GM final',
        value: gmRequests,
        href: hrRequestQueuePath('gm_queue'),
        tone: gmRequests > 0 ? 'amber' : 'default',
      },
      {
        label: 'Payroll awaiting GM',
        value: gmPayrollCount,
        href: hrPayrollRunsPath(),
        tone: gmPayrollCount > 0 ? 'amber' : 'default',
      },
      incidentsKpi,
    ];
  }

  if (canReviewHrRequests(permissions)) {
    const hrPending = Number(c.pendingHrReview ?? s.pendingHrReview ?? 0);
    const kpis = [
      { label: 'Active staff', value: activeStaff, href: HR_EMPLOYEES, tone: 'teal' },
      probationKpi,
      {
        label: 'Pending HR review',
        value: hrPending,
        href: hrRequestQueuePath('hr_queue'),
        tone: hrPending > 0 ? 'amber' : 'default',
      },
      incidentsKpi,
    ];
    if (canGmApprovePayroll(permissions)) {
      const gmPayroll = Number(c.draftPayrollAwaitingGm ?? 0);
      if (gmPayroll > 0) {
        kpis[2] = {
          label: 'Payroll awaiting GM',
          value: gmPayroll,
          href: hrPayrollRunsPath(),
          tone: 'amber',
        };
      }
    } else if (documentsExpiring > 0) {
      kpis[2] = documentsKpi;
    }
    return kpis;
  }

  const pendingKpi = getHrDashboardPendingKpi(c, s, permissions);
  return [
    { label: 'Active staff', value: activeStaff, href: HR_EMPLOYEES, tone: 'teal' },
    probationKpi,
    {
      label: pendingKpi.label,
      value: pendingKpi.value,
      href: pendingKpi.href,
      tone: pendingKpi.tone,
    },
    incidentsKpi,
  ];
}
