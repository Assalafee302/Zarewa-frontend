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
        body: 'Check Audit / edit approvals and the Help assistant (bottom-right). Use Manager dashboard for cross-branch attention items.',
      },
    ],
    quickLinks: [
      { label: 'Settings', path: '/settings' },
      { label: 'Manager dashboard', path: '/manager' },
      { label: 'Reports', path: '/reports' },
    ],
  },
  md: {
    title: 'Managing Director guide',
    subtitle: 'Executive oversight: sales, procurement, finance signals, and branch performance.',
    steps: [
      {
        heading: 'Your command view',
        body: 'Start on the Manager dashboard for attention items, PO audit, and activity timelines. Switch branches or use “all branches” for org-wide rollups.',
      },
      {
        heading: 'Approvals you own',
        body: 'You can approve price exceptions, inter-branch loans, material incidents, and sensitive edits. Open items from the workspace inbox or notifications.',
      },
      {
        heading: 'Procurement & pricing',
        body: 'Procurement and material pricing are centralized at HQ. Review purchase orders and the material pricing workbook before major campaigns.',
      },
      {
        heading: 'Reports & packs',
        body: 'Use Reports for daily and weekly executive packs. Finance and sales KPIs respect the branch filter in your workspace bar.',
      },
    ],
    quickLinks: [
      { label: 'Manager dashboard', path: '/manager' },
      { label: 'Reports', path: '/reports' },
      { label: 'Procurement', path: '/procurement' },
    ],
  },
  finance_manager: {
    title: 'Finance manager guide',
    subtitle: 'Receipts, treasury, payables, and management reporting for your branch.',
    steps: [
      {
        heading: 'Accounts workspace',
        body: 'Accounts is your home: customer receipts, refunds, expenses, and bank-style treasury movements. Always work in the correct branch.',
      },
      {
        heading: 'Posting & approval',
        body: 'Post receipts against quotations, approve refunds and payment requests, and keep treasury in sync with physical cash/bank.',
        tips: ['Outstanding balances under 0.01% of the obligation are treated as fully paid.'],
      },
      {
        heading: 'Period control',
        body: 'Lock accounting periods when month-end is complete. Locked periods block back-dated edits unless Admin unlocks them.',
      },
      {
        heading: 'Management reports',
        body: 'Open Reports for P&L-style views and branch KPIs. You can access management reports when your role includes reports.view.',
      },
    ],
    quickLinks: [
      { label: 'Accounts', path: '/accounts' },
      { label: 'Reports', path: '/reports' },
      { label: 'Office desk', path: '/office' },
    ],
  },
  cashier: {
    title: 'Cashier guide',
    subtitle: 'Fast, accurate customer payments and daily cash discipline.',
    steps: [
      {
        heading: 'Record receipts',
        body: 'Find the customer or quotation in Sales or Accounts, then post a receipt with the correct amount and payment method.',
        tips: ['Double-check branch and customer name before saving.'],
      },
      {
        heading: 'Refunds & expenses',
        body: 'Request refunds when needed; a manager or finance user approves them. Log small expenses with supporting notes.',
      },
      {
        heading: 'Treasury',
        body: 'Use treasury movements to reflect cash in/out of the branch safe or bank account shown in Accounts.',
      },
      {
        heading: 'End of day',
        body: 'Reconcile physical cash to system balances and flag discrepancies to your branch manager immediately.',
      },
    ],
    quickLinks: [
      { label: 'Accounts', path: '/accounts' },
      { label: 'Sales', path: '/sales' },
      { label: 'Customers', path: '/customers' },
    ],
  },
  sales_manager: {
    title: 'Branch manager guide',
    subtitle: 'Lead sales, production release, deliveries, and branch stock for your location.',
    steps: [
      {
        heading: 'Branch workspace',
        body: 'Your workspace branch controls customers, quotations, stock, and POs. Accessories and stone stock are per branch; coils use branch coil lots.',
      },
      {
        heading: 'Sales pipeline',
        body: 'Create quotations, cutting lists, and customer deliveries from Sales. Approve refunds and production release when ready.',
      },
      {
        heading: 'Operations & inventory',
        body: 'Receive GRNs, adjust stock, and manage deliveries from Operations. Stock you see is for your branch only (not another branch’s warehouse).',
      },
      {
        heading: 'Manager dashboard',
        body: 'Use the Manager dashboard for inbox items, low stock, and team activity. Office desk memos route work between departments.',
      },
    ],
    quickLinks: [
      { label: 'Sales', path: '/sales' },
      { label: 'Operations', path: '/operations' },
      { label: 'Manager dashboard', path: '/manager' },
    ],
  },
  sales_staff: {
    title: 'Sales officer guide',
    subtitle: 'Quotations, customers, and hand-offs to production and finance.',
    steps: [
      {
        heading: 'Customers & quotations',
        body: 'Create and update customers in your branch, then build quotations with correct gauges, colours, and payment terms.',
        tips: ['Save drafts often; use the Help assistant if a price or SKU is unclear.'],
      },
      {
        heading: 'Cutting lists & accessories',
        body: 'Attach cutting lists and accessory lines early so operations knows material requirements before production starts.',
      },
      {
        heading: 'Payments',
        body: 'Cashiers or finance post receipts. You can view payment status on the quotation—do not mark paid without a receipt.',
      },
      {
        heading: 'Office desk',
        body: 'Send memos to procurement, operations, or finance when you need stock checks, delivery dates, or price exceptions.',
      },
    ],
    quickLinks: [
      { label: 'Sales', path: '/sales' },
      { label: 'Customers', path: '/customers' },
      { label: 'Office desk', path: '/office' },
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
        tips: ['If Yola or Maiduguri stock looks wrong, confirm you are on the correct branch in the top bar.'],
      },
      {
        heading: 'Production floor',
        body: 'Release cutting lists to production, consume WIP, and post finished goods. Coil consumption follows coil tag weights.',
      },
      {
        heading: 'Deliveries & incidents',
        body: 'Schedule customer deliveries when FG is ready. Log material incidents for manager or MD approval when scrap or damage occurs.',
      },
    ],
    quickLinks: [
      { label: 'Operations', path: '/operations' },
      { label: 'Procurement', path: '/procurement' },
      { label: 'Material exceptions', path: '/material-exceptions' },
    ],
  },
  ceo: {
    title: 'Executive guide',
    subtitle: 'Read-only executive dashboard and reports.',
    steps: [
      {
        heading: 'Executive dashboard',
        body: 'Your home view summarizes org KPIs. Use the branch selector only if your account is allowed cross-branch rollups.',
      },
      {
        heading: 'Reports',
        body: 'Open Reports for packaged views. You do not post transactions—contact Admin or MD for data corrections.',
      },
      {
        heading: 'Office memos',
        body: 'You can read office threads when enabled. Route questions through MD or branch managers for operational changes.',
      },
    ],
    quickLinks: [
      { label: 'Executive dashboard', path: '/exec' },
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
