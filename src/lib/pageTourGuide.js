/**
 * Page-scoped Zare coaching prompts — "Tour this page" in HelpChatDock.
 * @param {string} pathname
 * @returns {{ label: string; query: string; articleHint?: string } | null}
 */
export function getPageTourForPath(pathname) {
  const p = String(pathname || '');

  if (p.startsWith('/cashier')) {
    return {
      label: 'Cashier desk',
      query: 'Walk me through the cashier desk step by step — confirm receipts and pay approved refunds',
      articleHint: 'cashier-desk-workflow',
    };
  }
  if (p.startsWith('/accounting')) {
    return {
      label: 'Accounting desk',
      query: 'Walk me through the accounting desk step by step — reconciliation and month-end',
      articleHint: 'accounting-desk-workflow',
    };
  }
  if (p.startsWith('/exec')) {
    return {
      label: 'Executive Command Centre',
      query: 'Walk me through the executive command centre — what should I review first?',
    };
  }
  if (p.startsWith('/manager')) {
    return {
      label: 'Manager dashboard',
      query: 'Walk me through the branch manager dashboard inbox step by step — approvals and clearance',
    };
  }
  if (p.startsWith('/sales')) {
    return {
      label: 'Sales workspace',
      query: 'Walk me through the full quotation to payment workflow step by step',
      articleHint: 'quote-to-cash-workflow',
    };
  }
  if (p.startsWith('/customers/')) {
    return {
      label: 'Customer dashboard',
      query: 'What should I do next on this customer account step by step?',
    };
  }
  if (p.startsWith('/operations')) {
    return {
      label: 'Operations',
      query: 'Walk me through production from cutting list to completion step by step',
      articleHint: 'production-job-workflow',
    };
  }
  if (p.startsWith('/procurement')) {
    return {
      label: 'Procurement',
      query: 'Walk me through purchase order to GRN to supplier payment step by step',
      articleHint: 'procurement-full-workflow',
    };
  }
  if (p.startsWith('/accounts')) {
    return {
      label: 'Finance & accounts',
      query: 'Walk me through customer receipt clearance and treasury step by step',
      articleHint: 'finance-receipt-clearance',
    };
  }
  if (p.startsWith('/team-hr')) {
    return {
      label: 'Team HR',
      query: 'Walk me through endorsing leave and loan requests as branch manager step by step',
    };
  }
  if (p.startsWith('/executive-hr')) {
    return {
      label: 'Executive HR',
      query: 'Walk me through MD payroll sign-off and executive HR approvals step by step',
    };
  }
  if (p.startsWith('/hr')) {
    return {
      label: 'Human Resources',
      query: 'Walk me through HR payroll preparation and staff register step by step',
    };
  }
  if (p.startsWith('/reports')) {
    return {
      label: 'Reports',
      query: 'Which reports should I run for month-end step by step?',
    };
  }
  if (p.startsWith('/edit-approvals')) {
    return {
      label: 'Edit approvals',
      query: 'Walk me through second approval for sensitive edits step by step',
      articleHint: 'edit-approval',
    };
  }
  if (p.startsWith('/settings')) {
    return {
      label: 'Settings',
      query: 'Walk me through registering a new staff user in Settings step by step',
      articleHint: 'register-staff-user',
    };
  }
  if (p === '/' || p.startsWith('/office')) {
    return {
      label: 'Workspace',
      query: 'What should I do first on my workspace inbox step by step?',
    };
  }
  return {
    label: 'This page',
    query: `Walk me through what to do on ${p || 'this page'} step by step`,
  };
}
