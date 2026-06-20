/** Base product name for browser tab titles (keep in sync with index.html branding). */
export const DOCUMENT_TITLE_BASE = 'Zarewa Industrial System';

/** Map current pathname to a concise document title. Used for tabs, bookmarks, and screen readers. */
export function documentTitleForPath(pathname) {
  const raw = String(pathname || '/').replace(/\/+$/, '') || '/';
  const p = raw;

  if (p === '/') return `Operations dashboard | ${DOCUMENT_TITLE_BASE}`;
  if (p === '/sales') return `Sales | ${DOCUMENT_TITLE_BASE}`;
  if (p === '/customers') return `Customers | ${DOCUMENT_TITLE_BASE}`;
  if (p.startsWith('/customers/')) return `Customer | ${DOCUMENT_TITLE_BASE}`;

  if (p === '/procurement') return `Procurement | ${DOCUMENT_TITLE_BASE}`;
  if (p.startsWith('/procurement/suppliers/')) return `Supplier | ${DOCUMENT_TITLE_BASE}`;

  if (p === '/operations') return `Store & production | ${DOCUMENT_TITLE_BASE}`;
  if (p.startsWith('/operations/coils/')) return `Coil profile | ${DOCUMENT_TITLE_BASE}`;

  if (p === '/deliveries') return `Store & production | ${DOCUMENT_TITLE_BASE}`;
  if (p === '/accounts') return `Finance & accounts | ${DOCUMENT_TITLE_BASE}`;
  if (p === '/accounting') return `Accounting Desk | ${DOCUMENT_TITLE_BASE}`;

  if (p === '/reports') return `Reports | ${DOCUMENT_TITLE_BASE}`;
  if (p === '/edit-approvals') return `Edit approvals | ${DOCUMENT_TITLE_BASE}`;
  if (p === '/manager') return `Branch manager workstation | ${DOCUMENT_TITLE_BASE}`;

  if (p === '/me' || p.startsWith('/me/')) {
    const sec = p.split('/')[2] || 'overview';
    const labels = {
      account: 'Account & security',
      security: 'Account & security',
      services: 'All services',
      school: 'My school',
      leave: 'Leave',
      attendance: 'Attendance',
      loans: 'Loans',
      documents: 'Documents',
      payslips: 'Payslips',
      employment: 'Employment',
      policies: 'Policies',
      grievance: 'Feedback',
      'id-card': 'ID card',
    };
    return `Account – ${labels[sec] || 'Overview'} | ${DOCUMENT_TITLE_BASE}`;
  }

  if (p === '/my-profile' || p.startsWith('/my-profile/')) {
    const sec = p.split('/')[2] || 'overview';
    const labels = {
      overview: 'Overview',
      school: 'My school',
      home: 'Overview',
      employment: 'Employment',
      'time-off': 'Time off',
      leave: 'Time off',
      attendance: 'Time off',
      payslips: 'Payslips',
      loans: 'Loans & credit',
      requests: 'My requests',
      documents: 'Documents',
      benefits: 'Benefits',
      policies: 'Policies',
      grievance: 'Feedback',
      'id-card': 'ID card',
      discipline: 'Conduct',
      surveys: 'Surveys',
      payments: 'Payments',
      help: 'HR help',
    };
    return `My HR – ${labels[sec] || 'Overview'} | ${DOCUMENT_TITLE_BASE}`;
  }

  if (p === '/executive-hr' || p.startsWith('/executive-hr/')) {
    return `Executive HR | ${DOCUMENT_TITLE_BASE}`;
  }

  if (p === '/team-hr' || p.startsWith('/team-hr/')) {
    return `Team HR | ${DOCUMENT_TITLE_BASE}`;
  }

  if (p === '/hr/executive' || p.startsWith('/hr/executive/')) {
    return `Executive HR | ${DOCUMENT_TITLE_BASE}`;
  }

  if (p === '/hr' || p.startsWith('/hr/')) {
    const parts = p.split('/').filter(Boolean);
    if (parts[1] === 'staff' && parts[2]) {
      return `Human Resources – Staff profile | ${DOCUMENT_TITLE_BASE}`;
    }
    const sec = parts[1] || 'dashboard';
    const labels = {
      dashboard: 'Dashboard',
      staff: 'Staff',
      'time-absence': 'Time & absence',
      talent: 'Talent & development',
      requests: 'Requests',
      leave: 'Time & absence',
      attendance: 'Time & absence',
      payroll: 'Payroll',
      loans: 'Loans',
      benefits: 'Benefits',
      transfers: 'Transfers',
      discipline: 'Discipline',
      letters: 'Letters',
      reports: 'Reports',
      settings: 'Settings',
    };
    return `Human Resources – ${labels[sec] || sec} | ${DOCUMENT_TITLE_BASE}`;
  }

  if (p.startsWith('/settings')) {
    const sec = p.split('/')[2] || 'profile';
    const labels = {
      profile: 'Profile',
      governance: 'Governance',
      data: 'Master data',
      team: 'Team access',
      guide: 'Workspace guide',
    };
    const label = labels[sec] || 'Settings';
    return `Settings – ${label} | ${DOCUMENT_TITLE_BASE}`;
  }

  const segments = p.split('/').filter(Boolean);
  if (segments.length > 0) {
    return `Page not found | ${DOCUMENT_TITLE_BASE}`;
  }

  return `${DOCUMENT_TITLE_BASE}`;
}
