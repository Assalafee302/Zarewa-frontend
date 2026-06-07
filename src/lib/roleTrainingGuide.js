/**
 * Role-based onboarding copy shown once per user after first password change.
 * @param {string} roleKey
 */
export function trainingGuideForRole(roleKey) {
  const rk = String(roleKey || 'sales_staff').trim().toLowerCase();
  return ROLE_TRAINING[rk] || ROLE_TRAINING.sales_staff;
}

/** @typedef {{ title: string; subtitle: string; steps: { heading: string; body: string; tips?: string[] }[]; quickLinks: { label: string; path: string }[] }} RoleTraining */

/** @type {Record<string, RoleTraining>} */
const ROLE_TRAINING = {
  admin: {
    title: 'Administrator guide',
    subtitle: 'You manage users, branches, and platform settings across Zarewa.',
    steps: [
      {
        heading: 'Pick your workspace branch',
        body: 'Use the branch bar at the top. Admin and MD can view all branches; other roles stay on their assigned branch.',
        tips: ['Confirm the correct branch before approving money or stock moves.'],
      },
      {
        heading: 'Team & access',
        body: 'Open Settings → Team & access to create logins, assign roles, and set workspace branches. New users must change their password on first sign-in.',
        tips: ['Issue a one-time reset code if someone forgets their password.'],
      },
      {
        heading: 'Master data & integrations',
        body: 'Maintain suppliers, coils, price books, and API keys from Settings. Changes here affect every branch.',
      },
      {
        heading: 'When something looks wrong',
        body: 'Check Edit approvals and **Zare** (life-ring, bottom-right) for step-by-step SOPs. Use Manager dashboard or Executive Command Centre for cross-branch attention.',
      },
    ],
    quickLinks: [
      { label: 'Settings', path: '/settings' },
      { label: 'Executive Command Centre', path: '/exec' },
      { label: 'Reports', path: '/reports' },
    ],
  },
  md: {
    title: 'Managing Director guide',
    subtitle: 'Executive oversight: sales, procurement, finance signals, and branch performance.',
    steps: [
      {
        heading: 'Your command view',
        body: 'Start on **Executive Command Centre** (`/exec`) for company KPIs, branch scorecard, and decision alerts. Use Manager dashboard for branch-level approval inboxes when acting as BM.',
      },
      {
        heading: 'Approvals you own',
        body: 'You approve high-value refunds (above governance threshold), price exceptions after production, inter-branch loans, payroll MD sign-off, and sensitive HR items via **Executive HR**.',
      },
      {
        heading: 'Procurement & pricing',
        body: 'Procurement and material pricing are centralized at HQ. Review purchase orders and the price list before major campaigns.',
      },
      {
        heading: 'Reports & Zare',
        body: 'Use Reports for daily and weekly executive packs. Open **Zare** and tap **Tour this page** on any screen for step-by-step coaching.',
      },
    ],
    quickLinks: [
      { label: 'Executive Command Centre', path: '/exec' },
      { label: 'Executive HR', path: '/executive-hr' },
      { label: 'Procurement', path: '/procurement' },
    ],
  },
  finance_manager: {
    title: 'Accountant / Head of Accounts guide',
    subtitle: 'Reconciliation, treasury oversight, month-end, and management reporting.',
    steps: [
      {
        heading: 'Accounting desk',
        body: 'Your primary home is **Accounting desk** (`/accounting`): reconciliation warnings, AP diagnostics, costing readiness, and month-end pack.',
      },
      {
        heading: 'Finance & accounts tabs',
        body: 'Use **Finance & accounts** (`/accounts`) for treasury movements, receipt audit, and payment requests. Cashiers handle day-to-day receipt confirmation on their own desk.',
        tips: ['Outstanding balances under 0.01% of the obligation are treated as fully paid.'],
      },
      {
        heading: 'Approvals & period control',
        body: 'You may approve refunds and payment requests where permitted. Lock accounting periods when month-end is complete.',
      },
      {
        heading: 'Management reports',
        body: 'Open **Reports** for standard finance packs. Ask **Zare** to tour the Accounting desk if you are new to a tab.',
      },
    ],
    quickLinks: [
      { label: 'Accounting desk', path: '/accounting' },
      { label: 'Finance & accounts', path: '/accounts' },
      { label: 'Reports', path: '/reports' },
    ],
  },
  cashier: {
    title: 'Cashier guide',
    subtitle: 'Confirm receipts, pay approved refunds, and execute treasury payouts.',
    steps: [
      {
        heading: 'Cashier desk',
        body: 'Open **Cashier desk** (`/cashier`) each day. This is your execution screen — not the Accounting desk.',
      },
      {
        heading: 'Record & confirm receipts',
        body: 'Sales posts new receipts; you **confirm payment received** when bank/cash evidence matches. You can also post receipts from Sales when needed.',
        tips: ['Amounts ≥ ₦100,000 require typing the amount twice.', 'Double-check branch and customer before saving.'],
      },
      {
        heading: 'Refunds & payments',
        body: 'You **request** refunds in Sales but **cannot approve** them. After manager approval, pay refunds from the Cashier desk payout queue.',
      },
      {
        heading: 'End of day',
        body: 'Reconcile physical cash to treasury balances and escalate discrepancies to your branch manager immediately.',
      },
    ],
    quickLinks: [
      { label: 'Cashier desk', path: '/cashier' },
      { label: 'Sales', path: '/sales' },
      { label: 'Finance receipts', path: '/accounts' },
    ],
  },
  sales_manager: {
    title: 'Branch manager guide',
    subtitle: 'Lead sales, production release, approvals, and branch stock.',
    steps: [
      {
        heading: 'Manager dashboard',
        body: 'Start on **Manager dashboard** (`/manager`) for refunds, clearance, production gate, and payment requests needing your action.',
      },
      {
        heading: 'Sales & operations',
        body: 'Create and oversee quotations, cutting lists, and deliveries from Sales and Operations. Approve refunds and material incidents for your branch.',
      },
      {
        heading: 'Team HR (not main HR admin)',
        body: 'Use **Team HR** (`/team-hr`) to endorse staff leave and loans. You do not use the HQ HR admin shell unless given extra permissions.',
      },
      {
        heading: 'Zare coaching',
        body: 'Open **Zare** on any page and choose **Tour this page** for step-by-step guidance — you still click every Approve/Save yourself.',
      },
    ],
    quickLinks: [
      { label: 'Manager dashboard', path: '/manager' },
      { label: 'Sales', path: '/sales' },
      { label: 'Team HR', path: '/team-hr' },
    ],
  },
  sales_staff: {
    title: 'Sales officer guide',
    subtitle: 'Quotations, customers, and hand-offs to production and finance.',
    steps: [
      {
        heading: 'Customers & quotations',
        body: 'Create and update customers in your branch, then build quotations with correct gauges, colours, and payment terms.',
        tips: ['Open **Zare** → **Tour this page** on Sales if you are new to quotations.'],
      },
      {
        heading: 'Cutting lists & accessories',
        body: 'Attach cutting lists and accessory lines early so operations knows material requirements before production starts.',
      },
      {
        heading: 'Payments',
        body: 'Cashiers or finance post receipts. You can view payment status on the quotation — do not mark paid without a receipt.',
      },
      {
        heading: 'Refunds',
        body: 'You may **request** refunds; a branch manager or MD **approves**; Cashier **pays** after approval.',
      },
    ],
    quickLinks: [
      { label: 'Sales', path: '/sales' },
      { label: 'My profile', path: '/my-profile' },
      { label: 'Workspace', path: '/' },
    ],
  },
  operations_officer: {
    title: 'Operations officer guide',
    subtitle: 'Procurement, GRNs, production, and branch inventory.',
    steps: [
      {
        heading: 'Procurement',
        body: 'Raise purchase orders, manage suppliers, and track transport. PO lines should match what you expect to receive.',
      },
      {
        heading: 'Receiving stock',
        body: 'Post GRNs against POs. Accessories and stone update branch stock; coil receipts update coil lots for your workspace branch.',
        tips: ['If stock looks wrong, confirm you are on the correct branch in the top bar.'],
      },
      {
        heading: 'Production floor',
        body: 'Release cutting lists to production, complete jobs, and run conversion checks. Coil consumption follows coil tag weights.',
      },
      {
        heading: 'Deliveries & incidents',
        body: 'Confirm customer deliveries when FG is ready. Log material exceptions for branch manager approval when scrap or damage occurs.',
      },
    ],
    quickLinks: [
      { label: 'Operations', path: '/operations' },
      { label: 'Procurement', path: '/procurement' },
      { label: 'Material exceptions', path: '/operations/material-exceptions' },
    ],
  },
  hr_admin: {
    title: 'HR Admin guide',
    subtitle: 'Staff records, payroll preparation, leave, and HR operations.',
    steps: [
      {
        heading: 'HR dashboard',
        body: 'Open **HR** → Dashboard for today’s queue: pending requests, payroll drafts, and compliance alerts.',
      },
      {
        heading: 'Employees & payroll',
        body: 'Maintain staff under **Employees**. Prepare payroll runs; MD signs off on **Executive HR** before lock and bank export.',
      },
      {
        heading: 'Requests workflow',
        body: 'Review leave and loan requests, then route to branch endorsement and GM HR final approval as required.',
      },
      {
        heading: 'Zare help',
        body: 'Use **Zare** on HR pages — **Tour this page** walks you through each hub step by step.',
      },
    ],
    quickLinks: [
      { label: 'HR dashboard', path: '/hr/dashboard' },
      { label: 'Employees', path: '/hr/employees' },
      { label: 'Payroll', path: '/hr/payroll' },
    ],
  },
  gmhr: {
    title: 'GM HR guide',
    subtitle: 'Final approvals, payroll GM sign-off, and org-wide HR oversight.',
    steps: [
      {
        heading: 'HQ HR shell',
        body: 'Use **HR** for directory, payroll, and final approval queues. You may view all branches when permitted.',
      },
      {
        heading: 'Payroll chain',
        body: 'HR Admin prepares runs → you **GM approve** → MD sign-off on **Executive HR** → lock and export.',
      },
      {
        heading: 'Sensitive cases',
        body: 'Discipline, transfers, and exceptional loans may need your final decision — use HR hubs, not chat, to approve.',
      },
      {
        heading: 'Reports',
        body: 'HR Analytics and CSV exports live under **HR** → Analytics and Executive HR reports for MD packs.',
      },
    ],
    quickLinks: [
      { label: 'HR dashboard', path: '/hr/dashboard' },
      { label: 'Executive HR', path: '/executive-hr' },
      { label: 'Reports', path: '/hr/analytics' },
    ],
  },
  ceo: {
    title: 'Executive guide',
    subtitle: 'Read-only executive dashboard and reports.',
    steps: [
      {
        heading: 'Executive Command Centre',
        body: 'Your home view is **Executive Command Centre** (`/exec`) — company KPIs and branch rollups. You do not post transactions.',
      },
      {
        heading: 'Reports',
        body: 'Open **Reports** for packaged views. Contact MD or Admin for data corrections.',
      },
      {
        heading: 'Zare',
        body: '**Zare** can explain metrics and workflows in plain language — ask *what should I review first?* on the exec screen.',
      },
    ],
    quickLinks: [
      { label: 'Executive Command Centre', path: '/exec' },
      { label: 'Reports', path: '/reports' },
    ],
  },
  viewer: {
    title: 'Viewer guide',
    subtitle: 'Read-only access to the dashboard.',
    steps: [
      {
        heading: 'What you can do',
        body: 'Browse the dashboard and allowed read-only screens. You cannot create quotations, post money, or change stock.',
      },
      {
        heading: 'Need more access?',
        body: 'Ask your administrator to upgrade your role if you need to enter transactions.',
      },
    ],
    quickLinks: [{ label: 'Dashboard', path: '/' }],
  },
};
